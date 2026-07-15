# OUTBASE v166.1 性能LOCK

## 目的

NORTH／TRAIL LENSの正式デザインを維持したまま、旧画面のちらつきとページ遷移の重さを解消する。

## LOCK

- idleの`?shell=1`は旧UIを描画しない。
- シェル起動時に`src/app.js`および旧UI14モジュールを読み込まない。
- FIELD03 URLでは旧UI一式を従来どおり読み込む。
- シェルのread modelは現在ルートだけ生成する。
- ヘッダー、下部ナビ、モーダルは画面遷移で再生成しない。
- routine navigationでDocument View Transitionを使用しない。
- 戻る位置復元は維持する。
- GPS・写真・音声・DB・migrationは変更しない。
