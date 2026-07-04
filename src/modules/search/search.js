import { app, escapeHtml, toast } from '../../ui/components.js?v=core06-09-premium-interaction-ux-20260704';
import { getState, patchState } from '../../core/store.js?v=core06-09-premium-interaction-ux-20260704';
import { go } from '../../core/router.js?v=core06-09-premium-interaction-ux-20260704';

const DEFAULTS = {
  area: '自宅から4時間以内',
  dog: '犬可・できればドッグフリー',
  season: '温水 / 暑期はエアコン優先',
  budget: '1泊2万円以内目安',
  view: '景色・静けさ重視'
};
function criteria(state) { return { ...DEFAULTS, ...(state.searchCriteria || {}) }; }
function field(id, label, value) { return `<label class="premium-field compact-condition"><span>${escapeHtml(label)}</span><input id="${id}" class="field slim-field" value="${escapeHtml(value)}" /></label>`; }
function chipButton(title, sub, next) { return `<button class="premium-action compact-action" data-next="${escapeHtml(next)}"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(sub)}</span></button>`; }

export function renderSearch() {
  const state = getState();
  const c = criteria(state);
  app().innerHTML = `<section class="premium-page search-premium search-compact">
    <div class="premium-hero compact-hero">
      <span>SEARCH</span><h2>キャンプ場を探す</h2><p>外せない条件だけ見えるようにしました。</p>
    </div>
    <section class="premium-card compact-card">
      <div class="premium-card-head"><span>条件</span><strong>ここだけ決める</strong></div>
      <div class="premium-form search-conditions-grid">
        ${field('searchArea', '距離', c.area)}${field('searchDog', 'コタ', c.dog)}${field('searchSeason', '季節', c.season)}${field('searchBudget', '料金', c.budget)}${field('searchView', '好み', c.view)}
      </div>
      <button class="premium-primary compact-primary" id="saveSearchCriteria">条件を保存</button>
    </section>
    <section class="premium-card soft-card compact-card">
      <div class="premium-card-head"><span>NEXT</span><strong>探し方</strong></div>
      <div class="premium-action-grid compact-actions-grid">
        ${chipButton('犬可', '最優先', '犬可・温水・距離で候補化')}
        ${chipButton('雨', '撤収しやすい', '雨でも楽なキャンプ場を候補化')}
        ${chipButton('暑さ', 'エアコン', '暑期のエアコン付き候補化')}
      </div>
    </section>
  </section>`;
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
