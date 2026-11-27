(() => {
  const widgets = [...document.querySelectorAll('.captcha[data-captcha]')];
  if (!widgets.length) return;

  const board = String(widgets[0]?.dataset.board || '').toLowerCase();
  const provider = String(widgets[0]?.dataset.provider || 'recaptcha').toLowerCase();
  let siteKey = String(widgets[0]?.dataset.sitekey || '').trim();

  const CHALLENGE_MAX_AGE_MS = 15000;

  let token = null;
  let loadedAt = 0;
  let loading = null;
  let scriptPromise = null;
  let expiryTimer = null;
  let verifiedUntil = 0;
  let syncing = null;
  let pendingNotice = null;
  let pendingFocus = false;
  const thirdPartyWidgetIds = new WeakMap();

  const isVerified = () => widgets.some((widget) => widget.classList.contains('captcha-verified'));

  const clearExpiryTimer = () => {
    if (expiryTimer) {
      clearTimeout(expiryTimer);
      expiryTimer = null;
    }
  };

  const scheduleExpiry = (remainingMs) => {
    clearExpiryTimer();
    const ms = Number(remainingMs);
    if (!Number.isFinite(ms) || ms <= 0) {
      verifiedUntil = 0;
      return;
    }
    verifiedUntil = Date.now() + ms;
    expiryTimer = setTimeout(() => {
      expiryTimer = null;
      syncStatus();
    }, Math.min(ms + 500, 2147483647));
  };

  const message = (text, bad = false) => {
    for (const widget of widgets) {
      const el = widget.querySelector('.captcha-message');
      if (!el) continue;
      el.textContent = text || '';
      el.classList.toggle('captcha-bad', bad);
    }
  };

  const focusVisibleAnswer = () => {
    const quickReply = document.getElementById('quickReply');
    let target = quickReply?.classList.contains('show-quickreply') ? quickReply.querySelector('.captcha-answer') : null;
    if (!target) {
      target =
        widgets
          .map((widget) => widget.querySelector('.captcha-answer'))
          .find((el) => el && !el.disabled && el.offsetParent !== null) || widgets[0]?.querySelector('.captcha-answer');
    }
    target?.focus();
  };

  const getProviderApi = () => (provider === 'hcaptcha' ? window.hcaptcha : provider === 'recaptcha' ? window.grecaptcha : null);

  const resetProviderWidgets = () => {
    if (provider === 'waptcha') return;
    const api = getProviderApi();
    if (!api || typeof api.reset !== 'function') return;
    for (const widget of widgets) {
      const box = widget.querySelector('.captcha-provider-widget');
      const wid = box ? thirdPartyWidgetIds.get(box) : undefined;
      if (wid !== undefined) {
        try {
          api.reset(wid);
        } catch {}
      }
    }
  };

  const removeWidgets = () => {
    clearExpiryTimer();
    verifiedUntil = 0;
    for (const widget of widgets) widget.remove();
    window.captchaSolved = true;
  };

  const markVerified = (remainingMs = 0, { bypassed = false } = {}) => {
    token = null;
    loadedAt = 0;
    pendingNotice = null;
    pendingFocus = false;
    resetProviderWidgets();
    for (const widget of widgets) {
      widget.classList.add('captcha-verified', 'captcha-collapsed');
      widget.dataset.verified = '1';
      delete widget.dataset.token;
      const image = widget.querySelector('.captcha-image');
      if (image) image.removeAttribute('src');
      const answer = widget.querySelector('.captcha-answer');
      if (answer) {
        answer.value = '';
        answer.removeAttribute('disabled');
      }
    }
    window.captchaSolved = true;
    if (bypassed) {
      clearExpiryTimer();
      verifiedUntil = 0;
    } else if (remainingMs > 0) {
      scheduleExpiry(remainingMs);
    }
  };

  const waitForProviderApi = () => {
    if (provider === 'recaptcha') {
      const api = window.grecaptcha;
      if (api && typeof api.ready === 'function') {
        return new Promise((resolve) => api.ready(() => resolve(window.grecaptcha)));
      }
      if (api && typeof api.render === 'function') return Promise.resolve(api);
    } else if (provider === 'hcaptcha') {
      if (window.hcaptcha && typeof window.hcaptcha.render === 'function') return Promise.resolve(window.hcaptcha);
    }
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const timer = setInterval(() => {
        const api = getProviderApi();
        if (provider === 'recaptcha' && api && typeof api.ready === 'function') {
          clearInterval(timer);
          api.ready(() => resolve(window.grecaptcha));
          return;
        }
        if (api && typeof api.render === 'function') {
          clearInterval(timer);
          resolve(api);
          return;
        }
        if (Date.now() - started > 10000) {
          clearInterval(timer);
          reject(new Error(`Timed out loading ${provider === 'hcaptcha' ? 'hCaptcha' : 'reCAPTCHA'} widget.`));
        }
      }, 50);
    });
  };

  const ensureProviderScript = () => {
    if (scriptPromise) return scriptPromise;
    const readyNow = getProviderApi();
    if (provider === 'recaptcha' && readyNow && (typeof readyNow.ready === 'function' || typeof readyNow.render === 'function')) {
      scriptPromise = waitForProviderApi();
      return scriptPromise;
    }
    if (provider === 'hcaptcha' && readyNow && typeof readyNow.render === 'function') {
      scriptPromise = Promise.resolve(readyNow);
      return scriptPromise;
    }
    const src =
      provider === 'hcaptcha'
        ? 'https://js.hcaptcha.com/1/api.js?render=explicit'
        : 'https://www.google.com/recaptcha/api.js?render=explicit';
    scriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-captcha-provider="${provider}"]`);
      if (existing) {
        waitForProviderApi().then(resolve, reject);
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.defer = true;
      script.dataset.captchaProvider = provider;
      script.onload = () => waitForProviderApi().then(resolve, reject);
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error(`Could not load ${provider === 'hcaptcha' ? 'hCaptcha' : 'reCAPTCHA'} script.`));
      };
      document.head.appendChild(script);
    });
    return scriptPromise;
  };

  const solveThirdParty = async (responseToken) => {
    if (!responseToken) return;
    message('Verifying…');
    try {
      const res = await fetch('/captcha/solve', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ response: responseToken, board })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        resetProviderWidgets();
        return message(data.error || 'Captcha verification failed.', true);
      }
      if (data.enabled === false) return removeWidgets();
      const remainingMs = Number(data.remainingMs) > 0 ? Number(data.remainingMs) : (Number(data.minutes) || 0) * 60000;
      markVerified(remainingMs, { bypassed: !!data.bypassed });
    } catch (err) {
      resetProviderWidgets();
      message(`Captcha check failed: ${err.message}`, true);
    }
  };

  const loadThirdParty = async (options = {}) => {
    if (options.notice) pendingNotice = options.notice;
    if (!siteKey) {
      pendingNotice = null;
      return message('Captcha site key is not configured.', true);
    }
    message('Loading captcha…');
    try {
      const res = await fetch('/captcha/new', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ board })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        pendingNotice = null;
        return message(data.error || `The captcha could not be loaded (HTTP ${res.status}).`, true);
      }
      if (!data.enabled) return removeWidgets();
      if (data.solved) return markVerified(data.remainingMs, { bypassed: !!data.bypassed });
      if (data.siteKey) siteKey = String(data.siteKey).trim();
      if (!siteKey) {
        pendingNotice = null;
        return message('Captcha site key is not configured.', true);
      }

      const api = await ensureProviderScript();
      for (const widget of widgets) {
        const box = widget.querySelector('.captcha-provider-widget');
        if (!box || thirdPartyWidgetIds.has(box)) continue;
        const wid = api.render(box, {
          sitekey: siteKey,
          callback: (responseToken) => solveThirdParty(responseToken),
          'expired-callback': () => message('Captcha expired - please complete it again.', true),
          'error-callback': () => message('Captcha widget failed to load - please try again.', true)
        });
        thirdPartyWidgetIds.set(box, wid);
      }
      const notice = pendingNotice;
      pendingNotice = null;
      message(notice || '', Boolean(notice));
    } catch (err) {
      pendingNotice = null;
      message(err.message || 'Could not load captcha.', true);
    }
  };

  const loadWaptcha = async (options = {}) => {
    if (options.notice) pendingNotice = options.notice;
    if (options.focus) pendingFocus = true;
    message('Loading a picture…');
    for (const widget of widgets) {
      widget.querySelector('.captcha-answer')?.setAttribute('disabled', 'disabled');
      const image = widget.querySelector('.captcha-image');
      if (image) image.removeAttribute('src');
    }
    try {
      const res = await fetch('/captcha/new', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ board })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        pendingNotice = null;
        pendingFocus = false;
        return message(data.error || `The captcha could not be loaded (HTTP ${res.status}).`, true);
      }
      if (!data.enabled) return removeWidgets();
      if (data.solved) return markVerified(data.remainingMs, { bypassed: !!data.bypassed });

      token = data.token;
      loadedAt = Date.now();
      for (const widget of widgets) {
        widget.dataset.token = data.token;
        const image = widget.querySelector('.captcha-image');
        if (image) image.src = data.image;
        const answer = widget.querySelector('.captcha-answer');
        if (answer) {
          answer.value = '';
          answer.removeAttribute('disabled');
        }
      }
      const notice = pendingNotice;
      const shouldFocus = pendingFocus;
      pendingNotice = null;
      pendingFocus = false;
      if (notice) {
        message(notice, true);
      } else {
        message(data.instructions || 'Name the character in the picture.');
      }
      if (shouldFocus) focusVisibleAnswer();
    } catch (err) {
      pendingNotice = null;
      pendingFocus = false;
      message(`The captcha could not be loaded: ${err.message}`, true);
    }
  };

  const ensurePuzzle = (options = {}) => {
    if (provider !== 'waptcha') {
      if (loading) return loading;
      loading = loadThirdParty(options).finally(() => {
        loading = null;
      });
      return loading;
    }

    if (options.notice) pendingNotice = options.notice;
    if (options.focus) pendingFocus = true;
    if (loading) {
      return loading.then(() => {
        if (pendingNotice) {
          message(pendingNotice, true);
          pendingNotice = null;
        }
        if (pendingFocus) {
          pendingFocus = false;
          focusVisibleAnswer();
        }
      });
    }
    if (!options.force && token && Date.now() - loadedAt < CHALLENGE_MAX_AGE_MS) {
      if (pendingNotice) {
        message(pendingNotice, true);
        pendingNotice = null;
      }
      if (pendingFocus) {
        pendingFocus = false;
        focusVisibleAnswer();
      }
      return Promise.resolve();
    }
    loading = loadWaptcha(options).finally(() => {
      loading = null;
    });
    return loading;
  };

  const setOpen = (open, options = {}) => {
    for (const widget of widgets) widget.classList.toggle('captcha-collapsed', !open);
    if (open) return ensurePuzzle(options);
    return Promise.resolve();
  };

  const expire = ({ open = false, notice = null } = {}) => {
    clearExpiryTimer();
    verifiedUntil = 0;
    token = null;
    loadedAt = 0;
    window.captchaSolved = false;
    resetProviderWidgets();
    for (const widget of widgets) {
      widget.classList.remove('captcha-verified');
      widget.dataset.verified = '0';
      delete widget.dataset.token;
    }
    const result = setOpen(open, { notice, force: open, focus: open });
    if (!open && notice) message(notice, true);
    return result;
  };

  const syncStatus = () => {
    if (syncing) return syncing;
    syncing = (async () => {
      try {
        const res = await fetch(`/captcha/status${board ? `?board=${encodeURIComponent(board)}` : ''}`, {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { Accept: 'application/json' }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || typeof data.enabled !== 'boolean') {
          if (isVerified() && verifiedUntil > 0 && Date.now() >= verifiedUntil) expire({ open: false });
          return;
        }
        if (!data.enabled) return removeWidgets();
        if (data.bypassed) return markVerified(0, { bypassed: true });
        if (data.solved && data.remainingMs > 0) return markVerified(data.remainingMs);
        if (data.required && isVerified()) expire({ open: false });
      } catch {
        if (isVerified() && verifiedUntil > 0 && Date.now() >= verifiedUntil) expire({ open: false });
      } finally {
        syncing = null;
      }
    })();
    return syncing;
  };

  const solveWaptcha = async (answerBox) => {
    const text = String(answerBox?.value || '').trim();
    if (!text) return message('Type the character\'s name first.', true);

    message('Checking…');
    try {
      const res = await fetch('/captcha/solve', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ token, answer: text, board })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        const error = data.error || 'That was not it.';
        pendingNotice = null;
        pendingFocus = false;
        await loadWaptcha();
        message(error, true);
        return;
      }
      if (data.enabled === false) return removeWidgets();
      const remainingMs = Number(data.remainingMs) > 0 ? Number(data.remainingMs) : (Number(data.minutes) || 0) * 60000;
      markVerified(remainingMs, { bypassed: !!data.bypassed });
    } catch (err) {
      message(`The answer could not be checked: ${err.message}`, true);
    }
  };

  for (const widget of widgets) {
    widget.classList.add('captcha-scripted');
    widget.querySelector('.captcha-open')?.addEventListener('click', () => setOpen(true, { focus: true }));
    widget.querySelector('.captcha-hide')?.addEventListener('click', () => setOpen(false));
    if (provider === 'waptcha') {
      const answer = widget.querySelector('.captcha-answer');
      widget.querySelector('.captcha-check')?.addEventListener('click', () => solveWaptcha(answer));
      widget.querySelector('.captcha-refresh')?.addEventListener('click', () => {
        pendingNotice = null;
        loadWaptcha({ focus: true });
      });
      answer?.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        solveWaptcha(answer);
      });
    }
  }

  setOpen(false);

  if (isVerified()) {
    window.captchaSolved = true;
    syncStatus();
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && isVerified() && (!verifiedUntil || Date.now() >= verifiedUntil)) {
      syncStatus();
    }
  });
  window.addEventListener('focus', () => {
    if (isVerified() && verifiedUntil && Date.now() >= verifiedUntil) {
      syncStatus();
    }
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) syncStatus();
  });

  window.captchaWidget = {
    expire,
    syncStatus,
    open: () => setOpen(true, { focus: true })
  };
})();
