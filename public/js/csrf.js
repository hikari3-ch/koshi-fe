window.getCsrfToken = function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
};

window.csrfHeaders = function csrfHeaders(extra) {
  const headers = Object.assign({}, extra || {});
  const token = window.getCsrfToken();
  if (token) headers['X-CSRF-Token'] = token;
  return headers;
};
