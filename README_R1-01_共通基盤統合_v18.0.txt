OUTBASE v166.31 / R1-01 共通基盤統合 v18.0
作成日: 2026-07-20
基準: GitHub main v17.6 / FIELD03正ベース維持

■目的
HOME、カレンダー、予定詳細、準備、既存FIELD03の間で、
活動ID・予定ID・主役プラン・戻り先が画面ごとに分裂しない共通基盤を確定する。

■実装
1. 共通活動コンテキスト
- src/context/activity-context-v18.js を追加。
- activityId / planId / activityType / activityTitle / returnShell / returnActivityId を一元管理。
- URL、localStorage、IndexedDB runtime_contextを同じ値へ同期。
- legacy/FIELD03読込前に予定名を outbase_record_target へ反映。

2. 主役プラン切替
- 共通上バーへ小型の現在プランチップを追加。
- HOME、カレンダー、予定詳細、準備、探す、保管庫から同じ操作で切替可能。
- 予定詳細・準備で切替時は同じ画面の対象予定を差し替える。
- 予定0件では空状態を表示。

3. 遷移と戻り
- 予定詳細→準備、予定詳細→FIELD03、準備→予定詳細、準備→FIELD03を同じコンテキストで接続。
- FIELD03側では新共通コンテキストを先に読込み、既存FIELD03本体は変更しない。
- return-bridge-v18で活動終了後の予定詳細・準備復帰を同じIDで維持。

4. 再起動
- outbase_activity_context_v1 に主役予定を保存。
- URLのactivityIdが保存値と異なる場合、古い予定名・種類を混在させない。

■保護対象
- FIELD03 legacy版 outbase-field03-flow-v171 は変更なし。
- GPS、地図、写真、動画、音声、ピン、欠測、画面ON、IndexedDB、offline restoreは変更なし。
- HOME v36 r34、カレンダーv44、予定詳細v16.3の本体デザインは変更なし。
- カレンダー日付数字の左上固定を維持。

■判定
静的統合候補。R1完了宣言ではない。
Androidで共通上バー、プラン切替、戻る、空状態、再起動、HOME・カレンダー回帰をまとめて確認後にR1判定する。
GitHub mainはこのZIP作成時点では変更していない。
