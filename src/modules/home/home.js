import { app, card, chip } from '../../ui/components.js';
import { getState } from '../../core/store.js';
import { go } from '../../core/router.js';
import { mvpFixedRules } from '../../domain/schema.js';

export function renderHome() {
  const state = getState();
  const project = state.nextProject;
  const projectTitle = project?.title || '次のキャンプ未作成';
  const prepCount = project?.prep ? Object.values(project.prep).reduce((sum, items) => sum + (items?.length || 0), 0) : 0;
  app().innerHTML = [
    card(`<div class="title">OUTBASEは、次のキャンプを楽にする。</div><p class="muted">Core 01は、予約情報→候補抽出→承認→準備候補→リン送信用リストまでを一本化する。</p>`, 'hero'),
    card(`<h2>次のキャンプ</h2><p><strong>${projectTitle}</strong></p><p class="muted">${project ? `準備候補 ${prepCount}件。買い物・持ち物・コタ用品・反省へ接続済み。` : '手入力カードではなく、予約スクショ/PDF/メール/カレンダー等から候補化して作る。'}</p><button class="btn primary" id="goPrep">準備エンジンを開く</button>`),
    card(`<h2>MVP固定ルール</h2>${mvpFixedRules.map(chip).join('')}`),
    card(`<h2>今日の導線</h2><div class="grid"><button class="btn primary" id="goWalk">コタ散歩</button><button class="btn" id="goReview">次回改善</button></div>`)
  ].join('');
  document.getElementById('goPrep')?.addEventListener('click', () => go('prep'));
  document.getElementById('goWalk')?.addEventListener('click', () => go('walk'));
  document.getElementById('goReview')?.addEventListener('click', () => go('review'));
}
