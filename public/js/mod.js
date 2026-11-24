async function modPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: csrfHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function selectedKeys() {
  return [...document.querySelectorAll('.mod-select:checked')].map((el) => el.value);
}

document.getElementById('emergency-toggle')?.addEventListener('click', async () => {
  if (!confirm('Toggle emergency mode?')) return;
  try {
    const data = await modPost('/mod/api/emergency', {});
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});


document.getElementById('mod-login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const data = await modPost('/mod/api/login', Object.fromEntries(fd));
    if (data.totpRequired && data.challengeToken) {
      document.getElementById('mod-totp-challenge').value = data.challengeToken;
      e.target.hidden = true;
      const totpForm = document.getElementById('mod-totp-form');
      if (totpForm) {
        totpForm.hidden = false;
        document.getElementById('mod-totp-code')?.focus();
      }
      return;
    }
    location.href = data.redirect || '/mod';
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('mod-totp-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const data = await modPost('/mod/api/login/totp', Object.fromEntries(fd));
    if (data.usedRecoveryCode) {
      await alert(`Signed in using a recovery code. ${data.recoveryCodesRemaining} recovery code(s) remaining.`);
    }
    location.href = data.redirect || '/mod';
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('mod-totp-back')?.addEventListener('click', () => {
  const totpForm = document.getElementById('mod-totp-form');
  const loginForm = document.getElementById('mod-login-form');
  if (totpForm) totpForm.hidden = true;
  if (loginForm) loginForm.hidden = false;
  document.getElementById('mod-totp-code').value = '';
  document.getElementById('mod-totp-challenge').value = '';
});

document.getElementById('forgot-password-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const data = await modPost('/mod/api/forgot-password', Object.fromEntries(fd));
    const status = document.getElementById('forgot-password-status');
    if (status) {
      status.textContent = data.message || 'Check your email for a reset link.';
      status.hidden = false;
    } else {
      await alert(data.message || 'Check your email for a reset link.');
    }
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('reset-password-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const data = await modPost('/mod/api/reset-password', Object.fromEntries(fd));
    location.href = data.redirect || '/mod/login?reset=1';
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('mod-logout')?.addEventListener('click', async () => {
  await modPost('/mod/api/logout', {});
  location.href = '/mod/login';
});

function banPayload(action) {
  const selections = selectedKeys();
  if (!selections.length) throw new Error('Select posts');
  return {
    action,
    selections,
    reason: document.getElementById('mod-ban-reason')?.value,
    duration: document.getElementById('mod-ban-duration')?.value,
    banMessage: document.getElementById('mod-ban-message')?.value,
    banType: document.getElementById('mod-ban-type')?.value
      ? Number(document.getElementById('mod-ban-type').value)
      : undefined,
    globalBan: document.getElementById('mod-ban-global')?.checked,
    nonBypassable: document.getElementById('mod-ban-non-bypass')?.checked
  };
}

document.getElementById('mod-ban')?.addEventListener('click', async () => {
  try {
    await modPost('/mod/api/content', banPayload('ban'));
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('mod-ban-delete')?.addEventListener('click', async () => {
  try {
    await modPost('/mod/api/content', banPayload('ban-delete'));
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

function updateTorSelectionState() {
  const checked = [...document.querySelectorAll('.mod-select:checked')];
  const hasTor = checked.some((el) => el.closest('[data-tor="1"]'));
  for (const id of ['mod-ban', 'mod-ban-delete', 'mod-ip-delete-board', 'mod-ip-delete-thread']) {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = hasTor;
  }
  const warning = document.getElementById('mod-tor-ban-warning');
  if (warning) warning.hidden = !hasTor;
}

document.addEventListener('change', (e) => {
  if (e.target && e.target.classList && e.target.classList.contains('mod-select')) {
    updateTorSelectionState();
  }
});

document.getElementById('mod-delete-selected')?.addEventListener('click', async () => {
  const selections = selectedKeys();
  if (!selections.length) return alert('Select posts');
  if (!confirm(`Delete ${selections.length} selected post(s)?`)) return;
  try {
    await modPost('/mod/api/content', { action: 'delete', selections });
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('mod-trash-selected')?.addEventListener('click', async () => {
  const selections = selectedKeys();
  if (!selections.length) return alert('Select posts');
  try {
    await modPost('/mod/api/content', { action: 'trash', selections });
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('mod-spoil-files')?.addEventListener('click', async () => {
  const selections = selectedKeys();
  if (!selections.length) return alert('Select posts');
  try {
    await modPost('/mod/api/content', { action: 'spoil', selections });
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('mod-ip-delete-board')?.addEventListener('click', async () => {
  const selections = selectedKeys();
  if (!selections.length) return alert('Select posts');
  if (!document.getElementById('mod-ip-delete-confirm')?.checked) return alert('Confirm ip deletion');
  try {
    await modPost('/mod/api/content', { action: 'ip-deletion', selections, confirmation: true, threadOnly: false });
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('mod-ip-delete-thread')?.addEventListener('click', async () => {
  const selections = selectedKeys();
  if (!selections.length) return alert('Select posts');
  if (!document.getElementById('mod-ip-delete-confirm')?.checked) return alert('Confirm ip deletion');
  if (!window.modThreadId) return alert('Open a thread to delete by IP on thread');
  try {
    await modPost('/mod/api/content', { action: 'ip-deletion', selections, confirmation: true, threadOnly: true });
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});


document.getElementById('mod-save-settings')?.addEventListener('click', async () => {
  try {
    await modPost('/mod/api/thread-settings', {
      boardUri: window.modBoardUri,
      threadId: window.modThreadId,
      pinned: document.getElementById('set-pinned').checked,
      locked: document.getElementById('set-locked').checked,
      cyclic: document.getElementById('set-cyclic').checked
    });
    alert('Saved');
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('mod-close-reports')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const ids = [...document.querySelectorAll('.report-select:checked')].flatMap((el) => el.dataset.ids.split(','));
  if (!ids.length) return alert('Select reports');
  const fd = new FormData(e.target);
  try {
    await modPost('/mod/api/reports/close', {
      reportIds: ids,
      banTarget: fd.get('banTarget'),
      duration: fd.get('banDuration'),
      banReason: fd.get('banReason'),
      deleteContent: !!fd.get('deleteContent')
    });
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.querySelectorAll('.lift-ban').forEach((btn) => {
  btn.addEventListener('click', async () => {
    try {
      await modPost('/mod/api/bans/lift', { banId: btn.dataset.id });
      location.reload();
    } catch (err) {
      alert(err.message);
    }
  });
});

document.querySelectorAll('.appeal-action').forEach((btn) => {
  btn.addEventListener('click', async () => {
    try {
      await modPost('/mod/api/bans/appeal', { banId: btn.dataset.id, action: btn.dataset.action });
      location.reload();
    } catch (err) {
      alert(err.message);
    }
  });
});

document.getElementById('mass-ban-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await modPost('/mod/api/bans/mass', Object.fromEntries(fd));
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('range-ban-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await modPost('/mod/api/bans/range', Object.fromEntries(fd));
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('hash-ban-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await modPost('/mod/api/bans/hash', Object.fromEntries(fd));
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.querySelectorAll('.lift-hash-ban').forEach((btn) => {
  btn.addEventListener('click', async () => {
    try {
      await modPost('/mod/api/bans/hash', { action: 'lift', sha256: btn.dataset.sha, boardUri: btn.dataset.board || null });
      location.reload();
    } catch (err) {
      alert(err.message);
    }
  });
});

document.getElementById('asn-ban-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await modPost('/mod/api/bans/asn', Object.fromEntries(fd));
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('restore-selected')?.addEventListener('click', async () => {
  const selections = selectedKeys();
  if (!selections.length) return alert('Select items');
  try {
    await modPost('/mod/api/trash/restore', { selections });
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('media-mass-delete-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const identifiers = [...document.querySelectorAll('.media-select:checked')].map((el) => el.value);
  const text = fd.get('identifiers');
  if (!identifiers.length && !text?.trim()) return alert('Select files or paste identifiers');
  try {
    await modPost('/mod/api/media/delete', {
      identifiers,
      text,
      ban: fd.get('ban') ? '1' : '',
      reason: fd.get('reason')
    });
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('change-password-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await modPost('/mod/api/account/password', Object.fromEntries(fd));
    alert('Password changed');
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('board-create-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const data = await modPost('/mod/api/board/create', Object.fromEntries(fd));
    location.href = '/mod/board/' + data.boardUri + '/settings';
  } catch (err) {
    alert(err.message);
  }
});

let boardDeleteModal = null;
let boardDeleteUri = null;

function buildBoardDeleteModal() {
  if (boardDeleteModal) return boardDeleteModal;

  const modal = document.createElement('div');
  modal.id = 'board-delete-modal';
  modal.innerHTML =
    '<div class="modal-content">' +
    '<div class="box-outer">' +
    '<div class="boxbar"><h2>Delete board</h2></div>' +
    '<div class="boxcontent">' +
    '<p><strong id="board-delete-question"></strong></p>' +
    '<p class="file-info">Every thread, post, quote and uploaded file of this board is deleted. This cannot be undone.</p>' +
    '<button type="button" id="board-delete-confirm">Delete board</button>' +
    '<button type="button" id="board-delete-cancel">Cancel</button>' +
    '<p class="file-info" id="board-delete-status"></p>' +
    '</div></div></div>';

  document.body.appendChild(modal);
  modal.querySelector('#board-delete-cancel').addEventListener('click', () => {
    modal.style.display = 'none';
    boardDeleteUri = null;
  });
  modal.querySelector('#board-delete-confirm').addEventListener('click', async () => {
    if (!boardDeleteUri) return;
    const confirmButton = modal.querySelector('#board-delete-confirm');
    const status = modal.querySelector('#board-delete-status');
    confirmButton.disabled = true;
    status.textContent = 'Deleting…';
    try {
      await modPost('/mod/api/board/delete', { boardUri: boardDeleteUri });
      location.href = '/mod';
    } catch (err) {
      status.textContent = err.message;
      confirmButton.disabled = false;
    }
  });

  boardDeleteModal = modal;
  return modal;
}

document.addEventListener('click', (e) => {
  const target = e.target instanceof Element ? e.target : e.target.parentElement;
  const link = target?.closest?.('.board-delete');
  if (!link) return;
  e.preventDefault();

  const modal = buildBoardDeleteModal();
  boardDeleteUri = link.dataset.board;
  modal.querySelector('#board-delete-question').textContent = `Delete /${link.dataset.board}/ - ${link.dataset.name}?`;
  modal.querySelector('#board-delete-status').textContent = '';
  modal.querySelector('#board-delete-confirm').disabled = false;
  modal.style.display = 'block';
});

document.getElementById('board-settings-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd);
  for (const key of [
    'disableIds',
    'forceAnonymity',
    'textBoard',
    'blockDeletion',
    'requireThreadFile'
  ]) {
    data[key] = fd.get(key) ? '1' : '';
  }
  try {
    const result = await modPost('/mod/api/board/settings', data);
    await alert(result.backfillStarted ? 'Saved. Existing posts are being updated with IP flags in the background.' : 'Saved');
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('flag-upload-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const message = document.getElementById('flag-upload-message');
  if (message) message.textContent = 'Uploading…';
  try {
    const res = await fetch('/mod/api/board/flags', {
      method: 'POST',
      headers: csrfHeaders({ Accept: 'application/json' }),
      body: new FormData(form)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
    location.reload();
  } catch (err) {
    if (message) message.textContent = err.message;
  }
});

document.querySelectorAll('.delete-board-flag').forEach((button) => {
  button.addEventListener('click', async () => {
    if (!confirm(`Delete the flag ${button.dataset.name}?`)) return;
    try {
      await modPost('/mod/api/board/flags/delete', {
        boardUri: document.querySelector('#flag-upload-form input[name="boardUri"]')?.value,
        name: button.dataset.name
      });
      location.reload();
    } catch (err) {
      alert(err.message);
    }
  });
});

document.getElementById('volunteer-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const submitter = e.submitter;
  try {
    await modPost('/mod/api/board/volunteer', {
      boardUri: fd.get('boardUri'),
      login: fd.get('login'),
      add: submitter?.value === '1'
    });
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('filter-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd);
  if (fd.get('caseInsensitive')) data.caseInsensitive = true;
  try {
    await modPost('/mod/api/filters', data);
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('global-filter-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd);
  if (fd.get('caseInsensitive')) data.caseInsensitive = true;
  try {
    await modPost('/mod/api/filters', data);
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.querySelectorAll('.delete-global-filter').forEach((btn) => {
  btn.addEventListener('click', async () => {
    if (!confirm('Delete this filter?')) return;
    try {
      await modPost('/mod/api/filters', { action: 'delete', filterId: btn.dataset.id });
      location.reload();
    } catch (err) {
      alert(err.message);
    }
  });
});

document.querySelectorAll('.toggle-moderation-filter').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const turningOn = btn.dataset.enabled !== '1';
    if (turningOn && !confirm('Turn this filter on? It can ban whoever trips it.')) return;
    try {
      await modPost('/mod/api/moderation-filters', { action: 'toggle', id: btn.dataset.id, enabled: turningOn ? '1' : '0' });
      location.reload();
    } catch (err) {
      alert(err.message);
    }
  });
});

document.querySelectorAll('.delete-moderation-filter').forEach((btn) => {
  btn.addEventListener('click', async () => {
    if (!confirm('Delete this moderation filter?')) return;
    try {
      await modPost('/mod/api/moderation-filters', { action: 'delete', id: btn.dataset.id });
      location.reload();
    } catch (err) {
      alert(err.message);
    }
  });
});

const bannerInput = document.querySelector('#banner-upload-form input[type="file"]');
bannerInput?.addEventListener('change', () => {
  const status = document.getElementById('banner-upload-status');
  if (!status) return;
  const count = bannerInput.files ? bannerInput.files.length : 0;
  status.textContent = count ? `${count} file${count === 1 ? '' : 's'} selected` : '';
});

document.getElementById('banner-upload-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const files = [...((e.target.querySelector('input[type="file"]') || {}).files || [])];
  if (!files.length) return alert('Select at least one banner');
  try {
    const res = await fetch('/mod/api/global/banners', { method: 'POST', headers: csrfHeaders(), body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    if (data.skipped?.length) {
      await alert(`Uploaded ${data.count} banner(s).\nSkipped:\n${data.skipped.join('\n')}`);
    }
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.querySelectorAll('.delete-banner').forEach((btn) => {
  btn.addEventListener('click', async () => {
    if (!confirm('Delete this banner?')) return;
    try {
      await modPost('/mod/api/global/banners/delete', { fileId: btn.dataset.id });
      location.reload();
    } catch (err) {
      alert(err.message);
    }
  });
});

document.querySelectorAll('.delete-filter').forEach((btn) => {
  btn.addEventListener('click', async () => {
    try {
      await modPost('/mod/api/filters', { action: 'delete', filterId: btn.dataset.id });
      location.reload();
    } catch (err) {
      alert(err.message);
    }
  });
});

document.getElementById('add-account-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await modPost('/mod/api/global/account', Object.fromEntries(fd));
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('clear-ip-role-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await modPost('/mod/api/global/clear-ip-role', Object.fromEntries(fd));
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('captcha-global-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const data = await modPost('/mod/api/captcha/settings', { enabled: fd.get('enabled') === 'true' });
    await alert(data.message || 'Saved.');
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('style-panel-global-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await modPost('/mod/api/global/style-panel', {
      disableMascots: fd.get('disableMascots') === 'true',
      disableCustomThemes: fd.get('disableCustomThemes') === 'true'
    });
    await alert('Saved.');
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('site-announcement-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await modPost('/mod/api/global/announcement', Object.fromEntries(fd));
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.querySelectorAll('.apply-role').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const select = document.querySelector(`.set-role[data-login="${btn.dataset.login}"]`);
    try {
      await modPost('/mod/api/global/role', { login: btn.dataset.login, role: select.value });
      location.reload();
    } catch (err) {
      alert(err.message);
    }
  });
});

document.getElementById('thumb-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const res = await fetch('/mod/api/thumbs', { method: 'POST', headers: csrfHeaders(), body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.querySelectorAll('.delete-thumb').forEach((btn) => {
  btn.addEventListener('click', async () => {
    if (!confirm('Delete this thumb?')) return;
    try {
      await modPost('/mod/api/thumbs/delete', { thumbId: btn.dataset.id });
      location.reload();
    } catch (err) {
      alert(err.message);
    }
  });
});

function showRecoveryCodes(codes) {
  const box = document.getElementById('totp-recovery-output');
  const list = document.getElementById('totp-recovery-list');
  if (!box || !list) return;
  list.textContent = '';
  for (const code of codes || []) {
    const li = document.createElement('li');
    const el = document.createElement('code');
    el.textContent = code;
    li.appendChild(el);
    list.appendChild(li);
  }
  box.hidden = false;
}

document.getElementById('account-email-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const data = await modPost('/mod/api/account/email', Object.fromEntries(fd));
    await alert(data.email ? `Email updated to ${data.email}` : 'Email removed.');
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('totp-setup-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const data = await modPost('/mod/api/account/totp/setup', Object.fromEntries(fd));
    const qrImg = document.getElementById('totp-qr-img');
    const secretEl = document.getElementById('totp-secret-text');
    const confirmPanel = document.getElementById('totp-confirm-panel');
    if (qrImg) qrImg.src = data.qrDataUri;
    if (secretEl) secretEl.textContent = data.secret;
    if (confirmPanel) confirmPanel.hidden = false;
    e.target.hidden = true;
    document.getElementById('totp-enable-code')?.focus();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('totp-enable-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const data = await modPost('/mod/api/account/totp/enable', Object.fromEntries(fd));
    const confirmPanel = document.getElementById('totp-confirm-panel');
    if (confirmPanel) confirmPanel.hidden = true;
    showRecoveryCodes(data.recoveryCodes);
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('totp-regen-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const data = await modPost('/mod/api/account/totp/recovery-codes', Object.fromEntries(fd));
    showRecoveryCodes(data.recoveryCodes);
    e.target.reset();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('totp-disable-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!confirm('Disable two-factor authentication on your account?')) return;
  const fd = new FormData(e.target);
  try {
    await modPost('/mod/api/account/totp/disable', Object.fromEntries(fd));
    await alert('Two-factor authentication disabled.');
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('totp-copy-codes')?.addEventListener('click', () => {
  const codes = [...document.querySelectorAll('#totp-recovery-list code')].map((el) => el.textContent).join('\n');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(codes);
  }
});

document.getElementById('totp-recovery-done')?.addEventListener('click', () => {
  location.reload();
});

document.querySelectorAll('.admin-disable-totp').forEach((btn) => {
  btn.addEventListener('click', async () => {
    if (!confirm(`Disable 2FA for ${btn.dataset.login}?`)) return;
    try {
      await modPost('/mod/api/global/totp-disable', { login: btn.dataset.login });
      location.reload();
    } catch (err) {
      alert(err.message);
    }
  });
});

document.getElementById('mail-settings-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = Object.fromEntries(fd);
  payload.secure = fd.get('secure') === 'true';
  payload.clearPass = fd.get('clearPass') === 'true';
  try {
    const data = await modPost('/mod/api/global/mail', payload);
    const badge = document.getElementById('mail-active-transport');
    if (badge && data.activeTransport) badge.textContent = data.activeTransport;
    await alert('Mail settings saved.');
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('mail-test-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const data = await modPost('/mod/api/global/mail/test', Object.fromEntries(fd));
    await alert(data.message || 'Test email sent.');
  } catch (err) {
    alert(err.message);
  }
});

function setTorPill(id, ok, okText, failText, warnWhenFalse = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = ok ? okText : failText;
  el.className = 'tor-pill ' + (ok ? 'tor-status-ok' : warnWhenFalse ? 'tor-status-warn' : 'tor-status-fail');
}

function renderTorStatus(st) {
  if (!st) return;
  setTorPill('st-tor-installed', st.torInstalled, 'Installed (' + (st.torVersion || 'detected') + ')', 'Not installed');
  setTorPill('st-tor-running', st.torRunning, 'Running', 'Not running');
  setTorPill('st-tor-socks', st.socksOpen, 'Listening', 'Closed / Unreachable', true);
  setTorPill('st-tor-torrc', st.torrcConfigured, 'Configured', st.torrcReadable ? 'Missing HiddenServiceDir' : 'Not readable (root owned)', true);
  setTorPill('st-tor-onion', st.onionValid, st.effectiveOnion, 'Not configured / unreadable', true);
  const exits = st.exitList || {};
  const exitText = (exits.totalCount || 0) + ' IPs' + (exits.lastUpdated ? ' (' + new Date(exits.lastUpdated).toLocaleString() + ')' : '');
  setTorPill('st-tor-exits', (exits.totalCount || 0) > 0, exitText, exitText, true);
}

document.getElementById('tor-settings-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = Object.fromEntries(fd);
  for (const key of ['defaultAllowPosting', 'allowFiles', 'requireCaptcha', 'advertiseOnionLocation', 'stripExternalEmbedsOnOnion', 'trustOnionHeader']) {
    payload[key] = fd.get(key) === 'true';
  }
  try {
    await modPost('/mod/api/tor/settings', payload);
    await alert('Tor settings saved.');
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('tor-refresh-status')?.addEventListener('click', async () => {
  try {
    const res = await fetch('/mod/api/tor/status', { headers: { Accept: 'application/json' } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to refresh status');
    renderTorStatus(data.torStatus);
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('tor-test-onion')?.addEventListener('click', async () => {
  const out = document.getElementById('tor-probe-result');
  const hostInput = document.getElementById('tor-onion-host');
  if (out) {
    out.hidden = false;
    out.textContent = 'Testing .onion hidden service over local Tor SOCKS5 proxy (this can take a few seconds)...';
  }
  try {
    const res = await modPost('/mod/api/tor/test-onion', { onionHostname: hostInput?.value || '' });
    if (out) {
      out.textContent = res.reachable
        ? `Reachable: http://${res.hostname}/ responded with "${res.statusLine || res.statusCode}" in ${res.latencyMs}ms.`
        : `Unreachable: ${res.error || 'Probe failed'} (${res.latencyMs || 0}ms).`;
    }
  } catch (err) {
    if (out) out.textContent = `Test failed: ${err.message}`;
  }
});

document.getElementById('tor-detect-onion')?.addEventListener('click', async () => {
  const dir = document.getElementById('tor-hs-dir')?.value || '';
  try {
    const res = await modPost('/mod/api/tor/detect-onion', { hiddenServiceDir: dir });
    const hostInput = document.getElementById('tor-onion-host');
    if (hostInput && res.hostname) hostInput.value = res.hostname;
    await alert(`Detected onion hostname: ${res.hostname}`);
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('tor-refresh-exits')?.addEventListener('click', async () => {
  try {
    const res = await modPost('/mod/api/tor/refresh-exits', {});
    await alert(`Updated Tor exit node list: ${res.count} addresses (${res.ipv4Count} IPv4, ${res.ipv6Count} IPv6).`);
    location.reload();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('tor-web-snippet-select')?.addEventListener('change', (e) => {
  const val = e.target.value;
  document.querySelectorAll('.tor-web-snippet').forEach((el) => {
    el.hidden = el.dataset.server !== val;
  });
});

document.querySelectorAll('.tor-copy-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.copyId);
    if (!target || !navigator.clipboard?.writeText) return;
    navigator.clipboard.writeText(target.textContent || '');
  });
});
