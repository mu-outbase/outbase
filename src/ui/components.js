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

export function listItems(items = [], empty = '候補なし') {
  if (!items.length) return `<p class="muted">${escapeHtml(empty)}</p>`;
  return `<ul class="outbase-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

export function kv(label, value) {
  return `<div class="kv"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || '未確定')}</strong></div>`;
}

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}
