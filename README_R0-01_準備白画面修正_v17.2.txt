OUTBASE v166.31 / R0-01 準備白画面修正 v17.2

【現象】
予定詳細で「準備」をタップすると、共通シェルの背景だけが残り画面内容が表示されない。

【根本原因】
共通shell-rendererのbody()は preparation ルートを直接扱わず、HOME描画へフォールスルーしていた。
preparationではHOMEモデルが生成されないため、HOME描画が例外停止し、preparation-route-v17.jsの描画処理まで到達できなかった。

【修正】
・shell-renderer-direct-fix.jsで preparation ルートを先に判定
・HOME描画を経由せず、共通ヘッダー／main／下ナビの安全なシェルを確保
・準備読込表示を出した後、既存preparation-route-v17.jsへ描画を引き渡す
・直接URL起動でもシェルを生成できるよう保護
・アプリ版、shell版、Service Workerキャッシュをv17.2へ更新

【変更していない保護領域】
・FIELD03本体
・現地セッション、GPS、地図、写真、動画、音声、ピン、欠測区間
・画面ON維持、IndexedDB、offline restore
・HOME v36 r34天気
・カレンダー日付左上LOCK
・予定詳細v16.3画像／余白

【判定】
静的検証：完了
GitHub main：未変更
Android実機：未確認
R0：一本線再確認待ち
