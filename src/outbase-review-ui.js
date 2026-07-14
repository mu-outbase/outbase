(() => {
  'use strict';

  const REVIEW_KEY = 'outbase_phase14_reviews_v1';
  const CANDIDATE_KEY = 'outbase_phase14_candidates_v1';
  const RECORD_KEY = 'outbase_record_saved_records';
  const UNASSIGNED = '__unassigned__';

  const core = () => globalThis.OUTBASE_CORE || null;
  const read = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
    } catch (_error) {
      return fallback;
    }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
  const now = () => new Date().toISOString();
  const uid = prefix => `${prefix}_${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`}`;

  const activePlanId = () => {
    const id = localStorage.getItem('outbase_active_plan_id') || '';
    return id && id !== 'none' ? id : '';
  };
  const currentScope = () => activePlanId() || UNASSIGNED;
  const rowScope = row => row?.planId || UNASSIGNED;

  function records() {
    return read(RECORD_KEY, []).filter(row => row && row.text);
  }

  function recordBelongsToScope(record, scope) {
    const directPlanId = record?.planId || '';
    const contextPlanIds = Array.isArray(record?.phase12Context?.planIds)
      ? record.phase12Context.planIds
      : [];

    if (scope === UNASSIGNED) {
      return !directPlanId && contextPlanIds.length === 0;
    }
    return directPlanId === scope || contextPlanIds.includes(scope);
  }

  function scopedRecords() {
    const scope = currentScope();
    return records().filter(record => recordBelongsToScope(record, scope));
  }

  function allReviews() {
    return read(REVIEW_KEY, []);
  }

  function reviews() {
    const scope = currentScope();
    return allReviews().filter(review => rowScope(review) === scope);
  }

  function allCandidates() {
    return read(CANDIDATE_KEY, []);
  }

  function candidates() {
    const scope = currentScope();
    return allCandidates().filter(candidate => rowScope(candidate) === scope);
  }

  function saveCandidatesForScope(scopedRows) {
    const scope = currentScope();
    const untouched = allCandidates().filter(candidate => rowScope(candidate) !== scope);
    write(CANDIDATE_KEY, [...scopedRows, ...untouched]);
  }

  function saveReviewForScope(review) {
    const scope = currentScope();
    const untouched = allReviews().filter(item => rowScope(item) !== scope);
    write(REVIEW_KEY, [review, ...untouched].slice(0, 120));
  }

  function latestRecordText() {
    return scopedRecords().slice(0, 8).map(record => record.text).join('\n');
  }

  function generateCandidates(review) {
    const rows = [];
    const scope = currentScope();
    const push = (type, text, source) => {
      const normalized = String(text || '').trim();
      if (!normalized) return;
      rows.push({
        id: uid('candidate'),
        type,
        text: normalized,
        source,
        planId: scope === UNASSIGNED ? '' : scope,
        status: 'open',
        createdAt: now()
      });
    };

    push('improvement', review.trouble, '困ったこと');
    push('buy', review.forgot, '忘れ物・不足');
    push('improvement', review.improve, '次回改善');
    if (review.revisit === 'yes') {
      push('plan', review.place || 'また行きたい場所', 'また行きたい');
    }
    return rows;
  }

  function addMemo(type, text, planId) {
    const api = core();
    if (!api?.addMemo) throw new Error('Coreメモ基盤を読み込めませんでした');

    api.addMemo({
      memoId: uid('memo'),
      kind: type === 'buy' ? 'buy' : type === 'plan' ? 'plan-candidate' : 'improvement',
      text: text.trim(),
      source: 'phase14-review',
      planIds: planId ? [planId] : [],
      activityIds: [],
      status: 'active',
      completed: false,
      createdAt: now(),
      updatedAt: now()
    });
  }

  function typeLabel(type) {
    return type === 'buy' ? '買う物' : type === 'plan' ? '予定候補' : '改善';
  }

  function icon(type) {
    return type === 'buy' ? '🛒' : type === 'plan' ? '📅' : '💡';
  }

  function candidateMarkup(candidate) {
    return `<article class="phase14Candidate">
      <div class="phase14CandidateMain">
        <span>${icon(candidate.type)}</span>
        <div>
          <b>${typeLabel(candidate.type)}</b>
          <p>${esc(candidate.text)}</p>
          <small>${esc(candidate.source || 'レビュー')}</small>
        </div>
      </div>
      <div class="phase14CandidateActions">
        <button type="button" data-phase14-adopt="${esc(candidate.id)}">${typeLabel(candidate.type)}へ追加</button>
        <button type="button" class="ghost" data-phase14-hold="${esc(candidate.id)}">保留</button>
      </div>
    </article>`;
  }

  function reviewSummary() {
    const scoped = reviews();
    if (!scoped.length) return '';
    const review = scoped[0];
    return `<div class="phase14Summary">
      <div>
        <small>LAST REVIEW</small>
        <b>今回の評価 ${'★'.repeat(Number(review.rating || 0))}${'☆'.repeat(5 - Number(review.rating || 0))}</b>
      </div>
      <button type="button" data-phase14-open>レビューを編集</button>
    </div>`;
  }

  function inject() {
    const page = document.getElementById('page-memory');
    if (!page || page.querySelector('.phase14Panel')) return;

    const openRows = candidates().filter(candidate => candidate.status === 'open');
    const panel = document.createElement('section');
    panel.className = 'phase14Panel';
    panel.dataset.phase14Scope = currentScope();
    panel.innerHTML = `<header>
      <div>
        <small>PHASE14.1 PLAN-SCOPED REVIEW</small>
        <h2>今回を振り返る</h2>
        <p>現在の主役プランだけを対象に、次回に必要な候補を整理します。</p>
      </div>
      <button type="button" data-phase14-open>レビューする</button>
    </header>
    ${reviewSummary()}
    <div class="phase14CandidateList">
      ${openRows.length
        ? openRows.map(candidateMarkup).join('')
        : '<div class="phase14Empty"><b>このプランの整理待ち候補はありません</b><p>レビューを保存すると、買う物・改善・予定候補がここに並びます。</p></div>'}
    </div>
    <p class="phase14Safety">候補は自動保存されません。追加した項目だけが現在のプランの準備メモへ入ります。</p>`;

    const anchor = page.querySelector('.memoryHero,.memorySummary,.sectionHead') || page.firstElementChild;
    anchor ? anchor.after(panel) : page.prepend(panel);
  }

  function refresh() {
    document.querySelector('.phase14Panel')?.remove();
    inject();
  }

  function openReview() {
    document.querySelector('.phase14ReviewBackdrop')?.remove();
    const last = reviews()[0] || {};
    const backdrop = document.createElement('div');
    backdrop.className = 'phase14ReviewBackdrop';
    backdrop.innerHTML = `<section class="phase14ReviewSheet">
      <header>
        <div><small>PLAN REVIEW</small><h2>今回どうだった？</h2></div>
        <button type="button" data-phase14-close>×</button>
      </header>
      <div class="phase14Rating" data-phase14-rating="${Number(last.rating || 0)}">
        ${[1,2,3,4,5].map(n => `<button type="button" data-phase14-star="${n}" class="${n <= Number(last.rating || 0) ? 'active' : ''}">★</button>`).join('')}
      </div>
      <label>良かったこと<textarea data-phase14-good>${esc(last.good || '')}</textarea></label>
      <label>困ったこと<textarea data-phase14-trouble>${esc(last.trouble || '')}</textarea></label>
      <label>忘れ物・不足<textarea data-phase14-forgot>${esc(last.forgot || '')}</textarea></label>
      <label>次回改善したいこと<textarea data-phase14-improve>${esc(last.improve || '')}</textarea></label>
      <div class="phase14Revisit" data-value="${esc(last.revisit || '')}">
        <span>また行きたい？</span>
        <button type="button" data-phase14-revisit="yes" class="${last.revisit === 'yes' ? 'active' : ''}">行きたい</button>
        <button type="button" data-phase14-revisit="no" class="${last.revisit === 'no' ? 'active' : ''}">今回はいい</button>
      </div>
      <label>場所・予定候補<input data-phase14-place value="${esc(last.place || '')}" placeholder="例：また赤城山へ行きたい"></label>
      <details><summary>このプランの保存済み記録を見る</summary><pre>${esc(latestRecordText() || 'このプランの保存済み記録はありません')}</pre></details>
      <button type="button" class="phase14Save" data-phase14-save>レビューを保存して候補を作る</button>
    </section>`;
    document.body.appendChild(backdrop);
  }

  function closeReview() {
    document.querySelector('.phase14ReviewBackdrop')?.remove();
  }

  document.addEventListener('click', event => {
    if (event.target.closest?.('[data-phase14-open]')) {
      openReview();
      return;
    }
    if (event.target === document.querySelector('.phase14ReviewBackdrop') || event.target.closest?.('[data-phase14-close]')) {
      closeReview();
      return;
    }

    const star = event.target.closest?.('[data-phase14-star]');
    if (star) {
      const box = star.closest('.phase14Rating');
      const selected = Number(star.dataset.phase14Star);
      box.dataset.phase14Rating = String(selected);
      box.querySelectorAll('button').forEach(button => {
        button.classList.toggle('active', Number(button.dataset.phase14Star) <= selected);
      });
      return;
    }

    const revisit = event.target.closest?.('[data-phase14-revisit]');
    if (revisit) {
      const wrap = revisit.closest('.phase14Revisit');
      wrap.dataset.value = revisit.dataset.phase14Revisit;
      wrap.querySelectorAll('button').forEach(button => button.classList.toggle('active', button === revisit));
      return;
    }

    if (event.target.closest?.('[data-phase14-save]')) {
      const sheet = document.querySelector('.phase14ReviewSheet');
      const scope = currentScope();
      const review = {
        id: uid('review'),
        planId: scope === UNASSIGNED ? '' : scope,
        rating: Number(sheet.querySelector('.phase14Rating').dataset.phase14Rating || 0),
        good: sheet.querySelector('[data-phase14-good]').value.trim(),
        trouble: sheet.querySelector('[data-phase14-trouble]').value.trim(),
        forgot: sheet.querySelector('[data-phase14-forgot]').value.trim(),
        improve: sheet.querySelector('[data-phase14-improve]').value.trim(),
        revisit: sheet.querySelector('.phase14Revisit').dataset.value || '',
        place: sheet.querySelector('[data-phase14-place]').value.trim(),
        createdAt: now()
      };

      saveReviewForScope(review);
      const existingOpen = candidates().filter(candidate => candidate.status === 'open');
      saveCandidatesForScope([...generateCandidates(review), ...existingOpen]);
      closeReview();
      refresh();
      return;
    }

    const adopt = event.target.closest?.('[data-phase14-adopt]');
    if (adopt) {
      const scoped = candidates();
      const candidate = scoped.find(item => item.id === adopt.dataset.phase14Adopt);
      if (!candidate) return;
      try {
        addMemo(candidate.type, candidate.text, candidate.planId || '');
        candidate.status = 'adopted';
        candidate.updatedAt = now();
        saveCandidatesForScope(scoped);
        refresh();
        globalThis.dispatchEvent(new CustomEvent('outbase:entry-refresh'));
        alert(`${typeLabel(candidate.type)}へ追加しました。`);
      } catch (error) {
        alert(error.message || String(error));
      }
      return;
    }

    const hold = event.target.closest?.('[data-phase14-hold]');
    if (hold) {
      const scoped = candidates();
      const candidate = scoped.find(item => item.id === hold.dataset.phase14Hold);
      if (candidate) {
        candidate.status = 'held';
        candidate.updatedAt = now();
        saveCandidatesForScope(scoped);
        refresh();
      }
    }
  }, true);

  const observer = new MutationObserver(inject);
  observer.observe(document.documentElement, { subtree: true, childList: true });

  let lastScope = currentScope();
  setInterval(() => {
    const nextScope = currentScope();
    if (nextScope !== lastScope) {
      lastScope = nextScope;
      closeReview();
      refresh();
    }
  }, 500);

  globalThis.addEventListener('outbase:entry-refresh', refresh);
  globalThis.OUTBASE_REVIEW_UI = { refresh, open: openReview };
  inject();
})();
