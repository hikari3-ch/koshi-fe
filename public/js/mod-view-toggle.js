document.addEventListener('click', async (e) => {
  const toggle = e.target.closest('.mod-view-toggle');
  if (!toggle) return;
  e.preventDefault();

  const targetMode = toggle.dataset.targetMode || '';
  const regularUrl = toggle.dataset.regularUrl || '';
  const modUrl = toggle.dataset.modUrl || '';

  try {
    const res = await fetch('/mod/api/view-mode', {
      method: 'POST',
      credentials: 'same-origin',
      headers: csrfHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ mode: targetMode })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not switch view mode');

    if (data.modViewEnabled === false && regularUrl) {
      location.href = regularUrl;
    } else if (data.modViewEnabled === true && modUrl) {
      location.href = modUrl;
    } else {
      location.reload();
    }
  } catch (err) {
    alert(err.message);
  }
});
