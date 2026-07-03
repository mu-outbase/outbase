import { app, card, chip, escapeHtml } from '../../ui/components.js';
import { getState } from '../../core/store.js';
import { go } from '../../core/router.js';
import { mvpFixedRules } from '../../domain/schema.js';

function sessionTypeLabel(type) {
  return { walk: 'コタ散歩', camp: 'キャンプ当日', life: '日常メモ' }[type] || '記録';
}

function formatDateTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return value;
  }
}

export function renderHome() {
  const state = getState();
  const project = state.nextProject;
  const projectTitle = project?.title || '次のキャンプ未作成';
  const prepCount = project?.prep ? Object.values(project.prep).reduce((sum, items) => sum + (items?.length || 0), 0) : 0;
  const active = state.walkSession?.status === 'active' ? state.walkSession : null;
  const recent = (state.recordHistory || []).slice(0, 3);
  app().innerHTML = [
    card(`<div class="title">OUTBASEは、準備と記録を次に活かす。</div><p class="muted">Core03は、キャンプ当日・コタ散歩・日常メモを3秒で残し、履歴カードと次回改善へつなぐ。</p>`, 'hero'),
    active ? card(`<h2>記録中</h2><p><strong>${escapeHtml(sessionTypeLabel(active.type))}</strong></p><p class="muted">${escapeHtml(formatDateTime(active.startedAt))} 開始 / 記録 ${(active.records || []).length}件</p><button class="btn primary" id="goWalkActive">記録画面へ戻る</button>`) : '',
    card(`<h2>次のキャンプ</h2><p><strong>${escapeHtml(projectTitle)}</strong></p><p class="muted">${project ? `準備候補 ${prepCount}件。Core03で当日記録・散歩・日常メモへ接続。` : '予約スクショ/PDF/メール/カレンダー等から候補化して作る。'}</p><div class="grid"><button class="btn primary" id="goPrep">準備エンジン</button><button class="btn" id="goRecord">記録を開く</button></div>`),
    card(`<h2>最近の記録</h2>${recent.length ? `<ul class="outbase-list">${recent.map((item) => `<li><strong>${escapeHtml(sessionTypeLabel(item.type))}</strong> ${escapeHtml(formatDateTime(item.startedAt))} / 記録 ${(item.records || []).length}件</li>`).join('')}</ul>` : '<p class="muted">まだ記録はありません。Core03で散歩・キャンプ当日・日常メモを残します。</p>'}`),
    card(`<h2>今の到達点</h2><div class="timeline"><div><strong>Core01</strong><span>予約→候補→次キャンプカードまで確認済み</span></div><div><strong>Core02</strong><span>準備候補の実用化を通過</span></div><div><strong>Core03</strong><span>散歩・当日・日常で開く理由を作る</span></div></div>`),
    card(`<h2>MVP固定ルール</h2>${mvpFixedRules.map(chip).join('')}`)
  ].filter(Boolean).join('');
  document.getElementById('goPrep')?.addEventListener('click', () => go('prep'));
  document.getElementById('goRecord')?.addEventListener('click', () => go('walk'));
  document.getElementById('goWalkActive')?.addEventListener('click', () => go('walk'));
}
