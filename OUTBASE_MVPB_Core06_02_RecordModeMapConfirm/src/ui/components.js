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

export function listItems(items = [], empty = 'なし') {
  if (!items.length) return `<p class="empty-line">${escapeHtml(empty)}</p>`;
  return `<ul class="outbase-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

export function kv(label, value) {
  return `<div class="kv"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || '未確定')}</strong></div>`;
}

function themeColor(theme) {
  return {
    morning: '#f5ead7',
    day: '#f4efe4',
    evening: '#efe1d2',
    night: '#e6dfd3'
  }[theme] || '#f4efe4';
}

export function applyRuntimeTheme() {
  const hour = new Date().getHours();
  let theme = 'day';
  let label = '昼';
  let message = '昼のキャンプ時間';
  if (hour >= 5 && hour < 10) { theme = 'morning'; label = '朝'; message = '朝の準備時間'; }
  else if (hour >= 10 && hour < 16) { theme = 'day'; label = '昼'; message = '昼のキャンプ時間'; }
  else if (hour >= 16 && hour < 19) { theme = 'evening'; label = '夕'; message = '夕方の設営時間'; }
  else { theme = 'night'; label = '夜'; message = '夜の焚き火時間'; }
  document.body.dataset.theme = theme;
  document.body.dataset.themeLabel = label;
  document.body.dataset.themeMessage = message;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor(theme));
  return { theme, label, message, hour };
}

export function toast(message = '完了') {
  let el = document.getElementById('outbaseToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'outbaseToast';
    el.className = 'outbase-toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  window.clearTimeout(el._timer);
  el._timer = window.setTimeout(() => el.classList.remove('show'), 1500);
}

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}
