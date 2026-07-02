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
    card(`<div class="title">OUTBASEは、準備と記録を次に活かす。</div><p class="muted">Core02は、予約から作った候補を、天気・泊数・人数・コタ同行・過去反省・ギアメモで実用準備リストに育てる。</p>`, 'hero'),
    card(`<h2>次のキャンプ</h2><p><strong>${projectTitle}</strong></p><p class="muted">${project ? `準備候補 ${prepCount}件。Core02で天気・過去反省・ギア台帳入口へ接続。` : '手入力カードではなく、予約スクショ/PDF/メール/カレンダー等から候補化して作る。'}</p><button class="btn primary" id="goPrep">準備エンジンを開く</button>`),
    card(`<h2>今の到達点</h2><div class="timeline"><div><strong>Core01</strong><span>予約→候補→次キャンプカードまで確認済み</span></div><div><strong>Core02</strong><span>準備候補を実用化する段階</span></div><div><strong>Core03</strong><span>散歩・当日・日常で使いたくなる導線</span></div></div>`),
    card(`<h2>MVP固定ルール</h2>${mvpFixedRules.map(chip).join('')}`),
    card(`<h2>今日の導線</h2><div class="grid"><button class="btn primary" id="goWalk">コタ散歩</button><button class="btn" id="goReview">次回改善</button></div>`)
  ].join('');
  document.getElementById('goPrep')?.addEventListener('click', () => go('prep'));
  document.getElementById('goWalk')?.addEventListener('click', () => go('walk'));
  document.getElementById('goReview')?.addEventListener('click', () => go('review'));
}
