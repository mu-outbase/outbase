OUTBASE カレンダー正式統合 v3.2

調査結果
実機には修正版HTMLに存在する「今日」「設定」が表示されていませんでした。
これはJSの再修正不足ではなく、旧 calendar-preview.html と旧JSが
Service Worker / ブラウザキャッシュから再利用されていた証拠です。

根本修正
- calendar-preview.html を廃止
- 正式画面を calendar-formal-v32.html へ変更
- CSSを calendar-formal-v32.css へ変更
- JSを calendar-formal-v32.js へ変更
- 正式ルートURLを release=formal-v32-1 へ変更
- Service Workerキャッシュ名と全参照URLを変更
- 旧キャッシュと同じURLを一つも使わない
- 初期描画停止時の画面内エラー表示を追加

維持
- HOMEからの全カレンダー入口固定
- 戻る操作
- 月／週／日／一覧／ToDo
- 予定、通知、繰り返し、絞り込み、入出力
- FIELD03、outbase_db、GPS、地図、写真、音声、天気r34は非変更
