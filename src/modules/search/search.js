import { app, card, escapeHtml, toast } from '../../ui/components.js?v=core05-6-calendar-nav-20260703';
import { getState, patchState } from '../../core/store.js?v=core05-6-calendar-nav-20260703';
import { go } from '../../core/router.js?v=core05-6-calendar-nav-20260703';

const DEFAULTS = {
  area: '自宅から4時間以内',
  dog: '犬可・できればドッグフリー',
  season: '温水 / 暑期はエアコン優先',
  budget: '1泊2万円以内目安',
  view: '景色・静けさ重視'
};

function criteria(state) {
  return { ...DEFAULTS, ...(state.searchCriteria || {}) };
}

function field(id, label, value) {
  return `<label class="search-field"><span>${escapeHtml(label)}</span><textarea id="${id}" class="field textarea compact">${escapeHtml(value)}</textarea></label>`;
}

export function renderSearch() {
  const state = getState();
  const c = criteria(state);
  app().innerHTML = [
    `<section class="page-hero find"><p class="eyebrow">探す</p><h2>次の場所を探す。</h2><p>犬可、温水、距離、景色。条件はここに集約。</p></section>`,
    card(`<div class="search-grid">
      ${field('searchArea', '距離', c.area)}
      ${field('searchDog', 'コタ', c.dog)}
      ${field('searchSeason', '季節', c.season)}
      ${field('searchBudget', '料金', c.budget)}
      ${field('searchView', '好み', c.view)}
    </div>
    <button class="primary-cta compact" id="saveSearchCriteria">条件を保存</button>`, 'focus'),
    card(`<h2>候補の見方</h2><div class="bento-list"><button data-next="犬可・温水・距離で候補化"><strong>犬可</strong><span>最優先</span></button><button data-next="雨でも楽なキャンプ場を候補化"><strong>雨</strong><span>乾燥・撤収</span></button><button data-next="暑期のエアコン付き候補化"><strong>暑さ</strong><span>エアコン</span></button></div><p class="muted">検索連携は後続。本Coreでは“探す”を独立画面として置き、条件を迷子にしない。</p>`, 'soft')
  ].join('');

  document.getElementById('saveSearchCriteria')?.addEventListener('click', () => {
    patchState({ searchCriteria: {
      area: document.getElementById('searchArea')?.value || '',
      dog: document.getElementById('searchDog')?.value || '',
      season: document.getElementById('searchSeason')?.value || '',
      budget: document.getElementById('searchBudget')?.value || '',
      view: document.getElementById('searchView')?.value || ''
    }});
    toast('探す条件を保存');
  });
  document.querySelectorAll('[data-next]').forEach((button) => button.addEventListener('click', () => {
    toast(button.dataset.next || '条件を候補化');
    go('prep');
  }));
}
