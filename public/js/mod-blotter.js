(() => {
  const form = document.getElementById('blotter-editor-form');
  if (!form) return;

  const messageInput = document.getElementById('blotter-message');
  const dateInput = form.querySelector('[name="date"]');
  const status = document.getElementById('blotter-status');
  const submitButton = form.querySelector('button[type="submit"]');

  const setStatus = (text, bad = false) => {
    if (!status) return;
    status.textContent = text || '';
    status.classList.toggle('blotter-bad', bad);
  };

  const api = async (url, body) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: csrfHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (HTTP ${res.status})`);
    return data;
  };

  const save = async () => {
    const blotterId = form.dataset.blotterId;
    const message = String(messageInput?.value || '').trim();
    const rawDate = dateInput?.value || '';
    const parsedDate = rawDate ? new Date(rawDate) : null;
    const date = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : undefined;
    if (!message) return setStatus('A message is required.', true);

    submitButton.disabled = true;
    setStatus('Saving…');
    try {
      if (blotterId) {
        await api('/mod/api/blotter/update', { blotterId: Number(blotterId), message, date });
        location.href = `/mod/blotter?edit=${blotterId}`;
      } else {
        await api('/mod/api/blotter', { message, date });
        location.href = '/mod/blotter';
      }
    } catch (err) {
      setStatus(err.message, true);
      submitButton.disabled = false;
    }
  };

  const deleteBtn = document.getElementById('blotter-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Delete this blotter entry?')) return;
      try {
        await api('/mod/api/blotter/delete', { blotterId: Number(deleteBtn.dataset.id) });
        location.href = '/mod/blotter';
      } catch (err) {
        setStatus(err.message, true);
      }
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    save();
  });
})();
