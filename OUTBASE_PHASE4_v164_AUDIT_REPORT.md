# OUTBASE Phase 4 v164 監査・実装報告

## 結論
Phase 4「ホーム：今・次・すぐ使う・最近」を、v163共通シェルの限定プレビュー内で完成した。
予定、実行、整理、思い出は同一activity_idを維持し、ホーム上のリンクにも同じactivity_idを渡す。
通常URL、FIELD03記録画面、旧DB、原本メディアにはcutoverしていない。

## 実装
- ホーム上部の日付と家族要約
- 「今」：進行中活動、参加者、場所、記録入口、活動詳細入口
- 「次」：次の予定、参加者、場所、準備進捗、準備入口、カレンダー入口
- 「すぐ使う」：活動開始、メモ、予定追加、カレンダー
- 「最近」：最近の思い出、記録件数、写真・動画件数、活動詳細入口
- members／petsをactivity_participantsから解決
- creator／participant重複除去
- activity_id付きURL整合
- 原本Blobを読まず、records／mediaの件数だけを参照

## 安全設計
- `?shell=1&view=home`限定起動を維持
- active／paused現地セッション中はFIELD03へfallback
- `src/app.js`を変更しない
- `outbase_db` version 10を変更しない
- `outbase_story_db` cutoverなし
- 旧記録DOM・GPS・地図・写真・動画・音声・ピン保存を変更しない
- MutationObserver追加なし
- 全画面を切るoverflow:hidden追加なし
- ホームでIndexedDBのfieldRecords／Blobを読まない

## 検証結果
- JavaScript構文：合格
- legacy14→data7→domain10→shell5：合格
- Phase 2A／2B／3回帰：合格
- ホーム4領域：合格
- activity_id表示・リンク一致：合格
- 参加者重複除去：合格
- 家族・ペット解決：合格
- 準備進捗：合格
- 原本Blob読取：0
- 新規MutationObserver：0
- 全画面overflow:hidden：0
- v163 carry-forwardファイル：一致
- GitHub main：未反映
- Android実機：未確認

## GitHub状態
- 接続：正常
- 読取：可能
- 書込：不可
- main HEAD：`70efdf99247ab639e55eb21f1f8644f9e0b47291`
- v164：ローカル完成パッケージのみ

## ユーザー操作
現時点では不要。
完成ZIPをGitHubへ一括反映する時、GitHub Pagesでプレビューを開く時、Android実機回帰を行う時に操作を依頼する。

## 次工程
Phase 5「活動詳細・カレンダー・家族フィルタ」。
ホームから入ったactivity_idをそのまま使い、予定・準備・記録・整理・思い出を一つの活動詳細で段階表示する。
