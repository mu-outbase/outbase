import { app, card } from '../../ui/components.js';
import { renderImportPanel } from '../import/import.js';

export function renderPrep() {
  app().innerHTML = [
    card(`<div class="title">次のキャンプ準備エンジン</div><p class="muted">予約スクショ読取は入口。読取後に、持ち物・買い物・コタ用品・前回反省・リン送信用リストへつなぐ。</p>`, 'hero'),
    renderImportPanel(),
    card(`<h2>準備候補</h2><p class="muted">次ゲートで、予約情報・天気・過去反省・ギア台帳から候補を出す。ここは手入力メモ置き場ではなく、候補承認の画面にする。</p><div class="stack"><button class="btn">持ち物候補を生成</button><button class="btn">買い物候補を生成</button><button class="btn">コタ用品候補を生成</button><button class="btn">リンに送るリストを作る</button></div>`)
  ].join('');
  window.OUTBASE_IMPORT?.bind?.();
}
