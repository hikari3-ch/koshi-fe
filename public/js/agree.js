document.addEventListener('click', async function (event) {
  const button = event.target && event.target.closest ? event.target.closest('.agree-toggle') : null;
  if (!button || button.dataset.busy) return;
  event.preventDefault();

  const boardUri = button.dataset.board;
  const postId = Number(button.dataset.postId);
  const isThread = button.dataset.isThread === '1';
  if (!boardUri || !Number.isInteger(postId) || postId <= 0) return;

  button.dataset.busy = '1';
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (typeof window.csrfHeaders === 'function') Object.assign(headers, window.csrfHeaders(headers));

    const response = await fetch('/api/agree', {
      method: 'POST',
      headers,
      body: JSON.stringify({ boardUri, postId, isThread })
    });

    const data = await response.json().catch(() => ({}));
    if (response.ok && data.success) {
      const count = Number(data.agreeCount) || 0;
      const word = button.dataset.word || 'Yeah!';
      button.dataset.count = String(count);
      button.textContent = count > 0 ? `${word} x${count}` : '+';
    } else {
      alert(data.error || 'Could not record that');
    }
  } catch (error) {
    console.error('Agree error:', error);
    alert('Could not record that');
  } finally {
    delete button.dataset.busy;
  }
});
