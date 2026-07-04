import { app, escapeHtml, toast } from '../../ui/components.js?v=core06-10-global-ui-reset-20260704';
import { getState, patchState } from '../../core/store.js?v=core06-10-global-ui-reset-20260704';
import { go } from '../../core/router.js?v=core06-10-global-ui-reset-20260704';

const DEFAULTS = { area: '自宅から4時間以内', dog: '犬可・ドッグフリー優先', season: '温水 / 暑期エアコン', budget: '1泊2万円以内', view: '景色・静けさ' };
function criteria(state) { return { ...DEFAULTS, ...(state.searchCriteria || {}) }; }
function field(id, label, value) { return `<label class="line-field"><span>${escapeHtml(label)}</span><input id="${id}" class="field slim-field" value="${escapeHtml(value)}" /></label>`; }
function quick(title, sub, next) { return `<button class="smart-chip" data-next="${escapeHtml(next)}"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(sub)}</span></button>`; }
export function renderSearch() {
  const c = criteria(getState());
  app().innerHTML = `<section class="route-page search-lean">
    <section class="route-summary-card">
      <div><span>探す</span><h2>条件だけ決める</h2><p>犬可・温水・距離・景色。大きすぎる表示をやめて、次の候補化に集中。</p></div>
      <button class="mini-ghost" data-route="prep">準備へ</button>
    </section>
    <section class="panel-card tight-card">
      <div class="section-title-row"><strong>外せない条件</strong><small>5項目</small></div>
      <div class="line-form search-line-form">
        ${field('searchArea', '距離', c.area)}${field('searchDog', 'コタ', c.dog)}${field('searchSeason', '季節', c.season)}${field('searchBudget', '料金', c.budget)}${field('searchView', '好み', c.view)}
      </div>
      <button class="primary-compact" id="saveSearchCriteria">保存</button>
    </section>
    <section class="panel-card tight-card">
      <div class="section-title-row"><strong>候補化</strong><small>準備へ送る</small></div>
      <div class="smart-chip-grid three">${quick('犬可', '最優先', '犬可・温水・距離で候補化')}${quick('雨', '撤収楽', '雨でも楽なキャンプ場を候補化')}${quick('暑さ', 'エアコン', '暑期のエアコン付き候補化')}</div>
    </section>
  </section>`;
  document.getElementById('saveSearchCriteria')?.addEventListener('click', () => {
    patchState({ searchCriteria: { area: document.getElementById('searchArea')?.value || '', dog: document.getElementById('searchDog')?.value || '', season: document.getElementById('searchSeason')?.value || '', budget: document.getElementById('searchBudget')?.value || '', view: document.getElementById('searchView')?.value || '' }});
    toast('探す条件を保存');
  });
  document.querySelectorAll('[data-next]').forEach((button) => button.addEventListener('click', () => { toast(button.dataset.next || '条件を候補化'); go('prep'); }));
}
