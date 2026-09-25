window.escapeHtml = function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
};

window.setText = function setText(el, text) {
  if (el) el.textContent = text == null ? '' : String(text);
};
