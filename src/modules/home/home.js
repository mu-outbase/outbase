import { app, card, escapeHtml } from '../../ui/components.js?v=core05-2-intuitive-ux-20260703';
import { getState, patchState } from '../../core/store.js?v=core05-2-intuitive-ux-20260703';
import { go } from '../../core/router.js?v=core05-2-intuitive-ux-20260703';

const CHECK_STEPS = [
  { key: 'prep', label: '準備まで迷わず進める' },
  { key: 'line', label: 'リンに送るリストが使える' },
  { key: 'record', label: '現地で3秒記録したくなる' },
  { key: 'review', label: '記録が次回改善へ戻る' },
  { key: 'want', label: '次のキャンプでも開きたい' }
];

function formatDateTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return value;
  }
}

function sessionTypeLabel(type) {
  return { walk: 'コタ散歩', camp: 'キャンプ当日', life: '日常メモ' }[type] || '記録';
}

function countPrep(project) {
  return project?.prep ? Object.values(project.prep).reduce((sum, items) => sum + (items?.length || 0), 0) : 0;
}

function projectLine(project) {
  if (!project) return 'まだ次のキャンプは作られていません。';
  const reservation = project.reservation || {};
  return [reservation.campground || project.title, reservation.dateText].filter(Boolean).join(' / ');
}

function nextAction(state) {
  const project = state.nextProject;
  const active = state.walkSession?.status === 'active' ? state.walkSession : null;
  const queue = state.reviewQueue || [];

  if (active) {
    return {
      title: '記録中に戻る',
      body: `${sessionTypeLabel(active.type)}を記録中。続きはここから。`,
      button: '記録に戻る',
      route: 'walk'
    };
  }
  if (!project) {
    return {
      title: '次のキャンプを作る',
      body: '予約スクショ、メール、PDF、カレンダー文から次のキャンプを作ります。',
      button: '準備を始める',
      route: 'prep'
    };
  }
  if (queue.length) {
    return {
      title: '改善を次回へ戻す',
      body: `記録から来た改善が${queue.length}件あります。準備に戻します。`,
      button: '改善を確認する',
      route: 'review'
    };
  }
  return {
    title: '準備リストを見る',
    body: `準備候補${countPrep(project)}件。買い物、持ち物、コタ用品を確認します。`,
    button: '準備を開く',
    route: 'prep'
  };
}

function statusCount(check) {
  const steps = check?.steps || {};
  const ok = Object.values(steps).filter((value) => value === 'ok').length;
  const concern = Object.values(steps).filter((value) => value === 'concern').length;
  return { ok, concern };
}

function renderUseMemo(state) {
  const check = state.mvpBetaCheck || {};
  const count = statusCount(check);
  const current = {
    prep: 'unchecked', line: 'unchecked', record: 'unchecked', review: 'unchecked', want: 'unchecked',
    ...(check.steps || {})
  };
  return card(`<details class="quiet-details">
    <summary>使いやすさメモ</summary>
    <p class="muted">完成判定ではなく、使いにくい所だけ残します。OK ${count.ok}/5、気になる ${count.concern}件。</p>
    <div class="mini-checks">
      ${CHECK_STEPS.map((step) => `<label><span>${escapeHtml(step.label)}</span><select class="field mini mvpStepSelect" data-step="${escapeHtml(step.key)}"><option value="unchecked" ${current[step.key] === 'unchecked' ? 'selected' : ''}>未確認</option><option value="ok" ${current[step.key] === 'ok' ? 'selected' : ''}>OK</option><option value="concern" ${current[step.key] === 'concern' ? 'selected' : ''}>気になる</option></select></label>`).join('')}
    </div>
    <label class="label" for="mvpMemo">気になること</label>
    <textarea id="mvpMemo" class="field textarea compact" placeholder="使いにくいところだけ書く">${escapeHtml(check.memo || '')}</textarea>
    <button class="btn primary" id="saveMvpFlowCheck">保存</button>
  </details>`, 'quiet-card');
}

export function renderHome() {
  const state = getState();
  const project = state.nextProject;
  const action = nextAction(state);
  const recent = (state.recordHistory || []).slice(0, 1)[0];

  app().innerHTML = [
    card(`<div class="title">次にやることだけ、出す。</div><p class="muted light">準備、記録、改善を一周させて、次のキャンプを楽にします。</p>`, 'hero'),
    card(`<p class="eyebrow">次のキャンプ</p><h2>${escapeHtml(project ? (project.reservation?.campground || project.title) : '未作成')}</h2><p class="muted">${escapeHtml(projectLine(project))}</p><div class="next-action"><strong>${escapeHtml(action.title)}</strong><span>${escapeHtml(action.body)}</span></div><button class="btn primary" id="goNextAction">${escapeHtml(action.button)}</button>`, 'action-card'),
    card(`<h2>迷ったらこの順番</h2><div class="flow-rail"><button data-jump="prep"><strong>準備</strong><span>買い物・料理・行き方</span></button><button data-jump="walk"><strong>記録</strong><span>写真・メモ・タイマー</span></button><button data-jump="review"><strong>改善</strong><span>次回へ戻す</span></button></div>`, 'quiet-card'),
    recent ? card(`<h2>最近の記録</h2><p><strong>${escapeHtml(sessionTypeLabel(recent.type))}</strong></p><p class="muted">${escapeHtml(formatDateTime(recent.startedAt))} / 記録 ${(recent.records || []).length}件</p><button class="btn" id="goRecordHistory">記録を見る</button>`, 'quiet-card') : '',
    renderUseMemo(state)
  ].filter(Boolean).join('');

  bindHome(action.route);
}

function bindHome(route) {
  document.getElementById('goNextAction')?.addEventListener('click', () => go(route));
  document.getElementById('goRecordHistory')?.addEventListener('click', () => go('walk'));
  document.querySelectorAll('[data-jump]').forEach((button) => {
    button.addEventListener('click', () => go(button.dataset.jump));
  });
  document.querySelectorAll('.mvpStepSelect').forEach((select) => {
    select.addEventListener('change', () => saveUseMemo(false));
  });
  document.getElementById('saveMvpFlowCheck')?.addEventListener('click', () => saveUseMemo(true));
}

function saveUseMemo(scroll = false) {
  const current = getState().mvpBetaCheck || {};
  const steps = { prep: 'unchecked', line: 'unchecked', record: 'unchecked', review: 'unchecked', want: 'unchecked', ...(current.steps || {}) };
  document.querySelectorAll('.mvpStepSelect').forEach((select) => {
    steps[select.dataset.step] = select.value;
  });
  patchState({
    mvpBetaCheck: {
      steps,
      memo: document.getElementById('mvpMemo')?.value || '',
      updatedAt: new Date().toISOString()
    }
  });
  renderHome();
  if (scroll) window.setTimeout(() => document.querySelector('.quiet-details')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
}
