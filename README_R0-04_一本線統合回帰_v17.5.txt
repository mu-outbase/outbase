OUTBASE v166.31 / R0-04 一本線統合回帰 v17.5

目的
- 準備画面の「活動を始める」が反応しない問題を修正する。
- 予定詳細・準備からFIELD03へ入る導線で、IndexedDB完了待ちをしない。
- JavaScriptのイベント登録が失われても、ネイティブリンクでFIELD03へ進めるようにする。
- 活動ID・プランIDをFIELD03側でも再確定し、終了後の戻り先を維持する。
- 小出し確認ではなく、一本線をAndroidで一括確認できる候補にする。

今回の修正
1. 準備画面の主要導線をbuttonからhref付きa要素へ変更
   - 活動を始める
   - 詳細な準備を開く
   JSが未登録でもリンク自体で遷移可能。

2. 遷移前のIndexedDB待機を廃止
   - localStorageへ活動ID・プランIDを同期保存
   - FIELD03へ即時遷移
   - shadow DB更新はバックグラウンド実行

3. FIELD03側の文脈復旧を強化
   - URLのactivityId / planIdをlocalStorageへ再保存
   - OUTBASE_REPOSITORIES_V160準備後にruntime_contextへ再同期
   - 活動中・一時停止中は戻る導線を無効化
   - idle後に予定詳細／準備への戻り導線を有効化

4. Androidタップ領域の保護
   - touch-action: manipulation
   - pointer-eventsを明示
   - action領域のz-indexを確保
   - 余白疑似要素がタップを遮らないように固定

変更していない領域
- FIELD03のGPS取得・軌跡・欠測区間
- 地図
- 写真・動画・音声・メモ・ピン
- 画面ON維持
- outbase_db / IndexedDB構造
- offline restore / Backup Restore
- HOME v36 r34天気
- カレンダー日付左上LOCK
- 予定詳細v16.3画像・余白

判定
- 構文検査: PASS
- 静的導線監査: PASS
- キャッシュ切替監査: PASS
- ZIP整合性: PASS
- Android一本線: 未確認（同梱の一括確認表で1回だけ確認）

GitHub
- mainはこのZIP作成時点で変更していない。
- ユーザーの明示許可後にZIP一式を反映する。
