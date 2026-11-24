(function () {
  const adminData = window.mascotAdminData || { mascots: [], defaults: { sitewide: '', boards: {} }, allBoards: [], positions: ['bottom-right', 'bottom-left', 'top-right', 'top-left'] };

  function csrfHeaders(extra) {
    const token = window.csrfToken ? window.csrfToken() : '';
    return Object.assign({ 'X-CSRF-Token': token }, extra || {});
  }

  const imageInput = document.getElementById('mascot-image');
  const previewWrap = document.getElementById('mascot-upload-preview-wrap');
  const previewImg = document.getElementById('mascot-upload-preview');
  const nameInput = document.getElementById('mascot-name');

  if (imageInput && previewImg && previewWrap) {
    imageInput.addEventListener('change', () => {
      const file = imageInput.files && imageInput.files[0];
      if (!file) {
        previewWrap.style.display = 'none';
        return;
      }
      if (nameInput && !nameInput.value.trim()) {
        nameInput.value = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
        previewWrap.style.display = '';
      };
      reader.readAsDataURL(file);
    });
  }

  function refreshDefaultDropdowns(mascots, defaults) {
    if (mascots) adminData.mascots = mascots;
    if (defaults) adminData.defaults = defaults;

    const countEl = document.getElementById('mascot-count');
    if (countEl) countEl.textContent = String(adminData.mascots.length);

    const siteSel = document.getElementById('mascot-sitewide-default');
    if (siteSel) {
      const cur = defaults ? defaults.sitewide : siteSel.value;
      siteSel.innerHTML = '';
      const noneOpt = document.createElement('option');
      noneOpt.value = '';
      noneOpt.textContent = 'None (no default mascot)';
      const randOpt = document.createElement('option');
      randOpt.value = 'random';
      randOpt.textContent = 'Random enabled mascot';
      siteSel.append(noneOpt, randOpt);
      adminData.mascots.forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.name} (${m.position}${m.enabled === false ? ', disabled' : ''})`;
        siteSel.appendChild(opt);
      });
      siteSel.value = cur || '';
    }

    document.querySelectorAll('.mascot-board-value').forEach((sel) => {
      const cur = sel.value;
      sel.innerHTML = '';
      const noneOpt = document.createElement('option');
      noneOpt.value = 'none';
      noneOpt.textContent = 'Disable mascot on this board';
      const randOpt = document.createElement('option');
      randOpt.value = 'random';
      randOpt.textContent = 'Random enabled mascot';
      sel.append(noneOpt, randOpt);
      adminData.mascots.forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name;
        sel.appendChild(opt);
      });
      sel.value = cur || 'none';
    });
  }

  function createMascotCard(m) {
    const card = document.createElement('div');
    card.className = 'mascot-admin-card';
    card.dataset.mascotId = m.id;

    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'mascot-admin-thumb-wrap';
    const img = document.createElement('img');
    img.src = m.url;
    img.alt = m.name;
    img.className = 'mascot-admin-thumb';
    thumbWrap.appendChild(img);

    const form = document.createElement('form');
    form.className = 'mascot-edit-form';
    form.dataset.mascotId = m.id;

    const makeInputLabel = (labelText, name, type, value, extraAttrs) => {
      const label = document.createElement('label');
      label.textContent = labelText + ' ';
      const input = document.createElement('input');
      input.type = type;
      input.name = name;
      input.value = String(value ?? '');
      if (extraAttrs) Object.entries(extraAttrs).forEach(([k, v]) => (input[k] = v));
      label.appendChild(input);
      return label;
    };

    const posLabel = document.createElement('label');
    posLabel.textContent = 'Position ';
    const posSel = document.createElement('select');
    posSel.name = 'position';
    (adminData.positions || []).forEach((pos) => {
      const opt = document.createElement('option');
      opt.value = pos;
      opt.textContent = pos;
      if (m.position === pos) opt.selected = true;
      posSel.appendChild(opt);
    });
    posLabel.appendChild(posSel);

    const row1 = document.createElement('div');
    row1.className = 'mascot-edit-row';
    row1.append(
      makeInputLabel('Width', 'width', 'number', m.width, { min: 40, max: 800 }),
      makeInputLabel('Opacity', 'opacity', 'number', m.opacity, { min: 0.05, max: 1, step: 0.05 })
    );

    const row2 = document.createElement('div');
    row2.className = 'mascot-edit-row';
    row2.append(
      makeInputLabel('Offset X', 'offsetX', 'number', m.offsetX, { min: -200, max: 400 }),
      makeInputLabel('Offset Y', 'offsetY', 'number', m.offsetY, { min: -200, max: 400 })
    );

    const checks = document.createElement('div');
    checks.className = 'mascot-edit-checks';
    const flipLabel = document.createElement('label');
    const flipCb = document.createElement('input');
    flipCb.type = 'checkbox';
    flipCb.name = 'flip';
    flipCb.checked = Boolean(m.flip);
    flipLabel.append(flipCb, ' Flip');

    const enabledLabel = document.createElement('label');
    const enabledCb = document.createElement('input');
    enabledCb.type = 'checkbox';
    enabledCb.name = 'enabled';
    enabledCb.checked = m.enabled !== false;
    enabledLabel.append(enabledCb, ' Enabled');
    checks.append(flipLabel, enabledLabel);

    const actions = document.createElement('div');
    actions.className = 'mascot-card-actions';
    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.textContent = 'Save';
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'mascot-delete-btn';
    delBtn.dataset.mascotId = m.id;
    delBtn.textContent = 'Delete';
    const status = document.createElement('span');
    status.className = 'mascot-card-status mod-hint';
    actions.append(saveBtn, delBtn, status);

    form.append(
      makeInputLabel('Name', 'name', 'text', m.name, { maxLength: 64, required: true }),
      posLabel,
      row1,
      row2,
      makeInputLabel('Boards', 'boards', 'text', (m.boards || []).join(', '), { placeholder: 'All boards' }),
      checks,
      actions
    );
    bindCardEvents(card, form, delBtn);
    card.append(thumbWrap, form);
    return card;
  }

  function bindCardEvents(card, form, delBtn) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = form.dataset.mascotId;
      const status = form.querySelector('.mascot-card-status');
      const payload = {
        name: form.querySelector('[name="name"]').value.trim(),
        position: form.querySelector('[name="position"]').value,
        width: Number(form.querySelector('[name="width"]').value),
        opacity: Number(form.querySelector('[name="opacity"]').value),
        offsetX: Number(form.querySelector('[name="offsetX"]').value),
        offsetY: Number(form.querySelector('[name="offsetY"]').value),
        boards: form.querySelector('[name="boards"]').value,
        flip: Boolean(form.querySelector('[name="flip"]').checked),
        enabled: Boolean(form.querySelector('[name="enabled"]').checked)
      };
      try {
        const res = await fetch('/mod/api/mascots/' + encodeURIComponent(id), {
          method: 'POST',
          credentials: 'same-origin',
          headers: csrfHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save mascot');
        const idx = adminData.mascots.findIndex((x) => x.id === id);
        if (idx !== -1) adminData.mascots[idx] = data.mascot;
        refreshDefaultDropdowns(adminData.mascots, adminData.defaults);
        if (status) status.textContent = 'Saved.';
      } catch (err) {
        if (status) status.textContent = err.message;
      }
    });

    delBtn.addEventListener('click', async () => {
      const id = delBtn.dataset.mascotId;
      if (!confirm('Delete this mascot?')) return;
      try {
        const res = await fetch('/mod/api/mascots/' + encodeURIComponent(id) + '/delete', {
          method: 'POST',
          credentials: 'same-origin',
          headers: csrfHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({})
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete mascot');
        card.remove();
        refreshDefaultDropdowns(data.mascots, data.defaults);
      } catch (err) {
        alert(err.message);
      }
    });
  }

  document.querySelectorAll('.mascot-admin-card').forEach((card) => {
    const form = card.querySelector('.mascot-edit-form');
    const delBtn = card.querySelector('.mascot-delete-btn');
    if (form && delBtn) bindCardEvents(card, form, delBtn);
  });

  const uploadForm = document.getElementById('mascot-upload-form');
  if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = document.getElementById('mascot-upload-status');
      const fd = new FormData(uploadForm);
      if (!uploadForm.querySelector('#mascot-flip')?.checked) fd.set('flip', 'false');
      if (!uploadForm.querySelector('#mascot-enabled')?.checked) fd.set('enabled', 'false');
      try {
        if (status) status.textContent = 'Uploading...';
        const res = await fetch('/mod/api/mascots/upload', {
          method: 'POST',
          credentials: 'same-origin',
          headers: csrfHeaders(),
          body: fd
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        const list = document.getElementById('mascot-admin-list');
        const emptyHint = document.getElementById('mascot-empty-hint');
        if (emptyHint) emptyHint.remove();
        if (list) list.appendChild(createMascotCard(data.mascot));
        refreshDefaultDropdowns(data.mascots, data.defaults);
        uploadForm.reset();
        if (previewWrap) previewWrap.style.display = 'none';
        if (status) status.textContent = `Uploaded "${data.mascot.name}".`;
      } catch (err) {
        if (status) status.textContent = err.message;
      }
    });
  }

  const overridesContainer = document.getElementById('mascot-board-overrides');
  const addOverrideBtn = document.getElementById('mascot-add-board-override');

  function bindRemoveRow(btn) {
    btn.addEventListener('click', () => {
      btn.closest('.mascot-board-row')?.remove();
    });
  }
  document.querySelectorAll('.mascot-remove-board-row').forEach(bindRemoveRow);

  if (addOverrideBtn && overridesContainer) {
    addOverrideBtn.addEventListener('click', () => {
      if (!adminData.allBoards.length) return;
      const row = document.createElement('div');
      row.className = 'mascot-board-row';

      const bSel = document.createElement('select');
      bSel.className = 'mascot-board-select';
      adminData.allBoards.forEach((b) => {
        const opt = document.createElement('option');
        opt.value = b.boardUri;
        opt.textContent = `/${b.boardUri}/ - ${b.boardName || b.boardUri}`;
        bSel.appendChild(opt);
      });

      const vSel = document.createElement('select');
      vSel.className = 'mascot-board-value';
      const noneOpt = document.createElement('option');
      noneOpt.value = 'none';
      noneOpt.textContent = 'Disable mascot on this board';
      const randOpt = document.createElement('option');
      randOpt.value = 'random';
      randOpt.textContent = 'Random enabled mascot';
      vSel.append(noneOpt, randOpt);
      adminData.mascots.forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name;
        vSel.appendChild(opt);
      });

      const remBtn = document.createElement('button');
      remBtn.type = 'button';
      remBtn.className = 'mascot-remove-board-row';
      remBtn.textContent = 'Remove';
      bindRemoveRow(remBtn);

      row.append(bSel, vSel, remBtn);
      overridesContainer.appendChild(row);
    });
  }

  const defaultsForm = document.getElementById('mascot-defaults-form');
  if (defaultsForm) {
    defaultsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = document.getElementById('mascot-defaults-status');
      const sitewide = document.getElementById('mascot-sitewide-default')?.value || '';
      const boards = {};
      document.querySelectorAll('.mascot-board-row').forEach((row) => {
        const b = row.querySelector('.mascot-board-select')?.value;
        const v = row.querySelector('.mascot-board-value')?.value;
        if (b && v) boards[b] = v;
      });
      try {
        const res = await fetch('/mod/api/mascots/defaults', {
          method: 'POST',
          credentials: 'same-origin',
          headers: csrfHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ sitewide, boards })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save defaults');
        adminData.defaults = data.defaults;
        if (status) status.textContent = 'Default assignments saved.';
      } catch (err) {
        if (status) status.textContent = err.message;
      }
    });
  }
})();
