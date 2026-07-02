export function setAppStatus(text) {
  const el = document.getElementById('appStatus');
  if (el) el.textContent = text;
}

export function app() {
  return document.getElementById('app');
}

export function card(html, className = '') {
  return `<section class="card ${className}">${html}</section>`;
}

export function chip(text) {
  return `<span class="chip">${escapeHtml(text)}</span>`;
}

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}
