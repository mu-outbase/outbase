# OUTBASE FIELD03 複数Activity統合 v2

## 目的
複数Activityの作成・表示・切替を一つの画面で完結させ、Activity名へのメモ混入と主役プラン不一致をまとめて修正します。

## 実装内容
- 「切替」画面から、予定／予定なし／途中開始で新しいActivityを追加
- 端末で操作する主役Activityは1件に固定
- 切替前ActivityのSession状態・経過・GPS・ピンを退避
- 切替先ActivityのSessionを復元
- 切替元は休止、切替先は実行中へ統一
- Activity表示名は、紐付く主役プラン名を最優先
- メモ・持ち物候補などがActivity名へ混入した既存データを自動補正
- プランなしActivityへ切り替えた場合、前の主役プランを残さない
- 緑Activityバーも補正後のActivity名を表示

## 更新ファイル
- index.html
- service-worker.js
- style-scenarios.css
- src/outbase-scenarios.js
- src/outbase-activity-title-guard.js（新規）

## 操作
1. 記録 → 活動を始める・切り替える → 切替
2. 「切替先を作る」から、予定／予定なし／途中開始を選ぶ
3. 新しいActivity開始後、再度「切替」を開く
4. 保持中のActivityにある「この活動へ切替」を押す

## 完了確認
- 2件以上のActivityが一覧に残る
- 表示中Activityだけが実行中、その他は休止中
- 切替後に主役プラン・Activity名・記録先が一致
- メモ文がActivity名として表示されない
