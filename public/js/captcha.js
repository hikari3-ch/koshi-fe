(() => {
  const widgets = [...document.querySelectorAll('.captcha[data-captcha]')];
  if (!widgets.length) return;

  const board = String(widgets[0]?.dataset.board || '').toLowerCase();

  const CHALLENGE_MAX_AGE_MS = 15000;

  let token = null;
  let loadedAt = 0;
  let loading = null;
  let expiryTimer = null;
  let verifiedUntil = 0;
  let syncing = null;
  let pendingNotice = null;
  let pendingFocus = false;

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

  const load = async (options = {}) => {
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
    loading = load(options).finally(() => {
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

  const solve = async (answerBox) => {
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
        await load();
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
    const answer = widget.querySelector('.captcha-answer');
    widget.querySelector('.captcha-open')?.addEventListener('click', () => setOpen(true, { focus: true }));
    widget.querySelector('.captcha-hide')?.addEventListener('click', () => setOpen(false));
    widget.querySelector('.captcha-check')?.addEventListener('click', () => solve(answer));
    widget.querySelector('.captcha-refresh')?.addEventListener('click', () => {
      pendingNotice = null;
      load({ focus: true });
    });
    answer?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      solve(answer);
    });
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
