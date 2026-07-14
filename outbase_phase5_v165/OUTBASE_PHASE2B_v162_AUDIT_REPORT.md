# OUTBASE v162 Phase 2B 監査・実装報告

作成日：2026-07-15（Asia/Tokyo）

## 現在位置

- 正本基準：MASTER v161、BOOT v6.1、STATUSLOCK v161
- GitHub：`mu-outbase/outbase` 接続・読取可能、書込不可
- GitHub main確認HEAD：`70efdf99247ab639e55eb21f1f8644f9e0b47291`
- GitHub実行アプリ：FIELD03 compact-2
- Phase 1：Shadow DBデータ基盤 ローカル実装済
- Phase 2A：起動境界分割 ローカル実装済
- Phase 2B：予定・準備・保管庫 domain / screen model ローカル実装済
- GitHub反映：未実施
- Android E2E：未実施
- 新DB cutover：未実施

## Phase 2Bの判断

GitHubへPhase 1／2Aが未反映でAndroid回帰確認も未実施のため、FIELD03画面から既存コードを物理削除する段階ではない。

そのためPhase 2Bは、次の安全な抽出とした。

1. FIELD03のDOM・イベント・保存処理は変更しない
2. 予定・準備・保管庫のデータ参照を独立domainへ抽出
3. 将来画面が受け取るread modelを独立screen modelへ抽出
4. 旧画面へ戻る互換URLを維持
5. 準備項目の保存はShadow DB限定・冪等・活動中延期

## 実装

### 起動境界更新
- app version：`v162-phase2b`
- cache：`outbase-field03-v162-phase2b`
- legacy 14 → data 7 → domain 8の順序を固定
- Phase 2B ready待ちを追加

### 予定domain
- activities、calendar_entries、activity_participantsを結合
- 現在活動、進行中、次の予定を取得
- legacy plan IDから新activity_idを解決
- FIELD03カレンダー・準備・予定画面への互換URL生成

### 準備domain
- キャンプ：天気、行き方、持ち物、料理、買物、ペット
- 散歩：天気、行き方、ペット、持ち物
- ドライブ：行き方、天気、ペット、駐車
- 買物：買物、行き方
- イベント：天気、行き方、予約・チケット
- 保存前はread modelのみ
- `ensureBaseline()`実行時だけShadow DBへ保存
- active／paused中は`deferred_active_session`

### 保管庫domain
- organizing／completed／archived活動を集約
- record数、media数、review数、未完了改善数をactivity_id単位で集計
- 写真・動画原本Blobを一覧読込しない
- 資産検索read modelを追加

## 変更していないもの

- `src/app.js`
- 旧`outbase_db` version 10
- 現地セッション
- GPS／地図／欠測区間
- 写真／動画／音声／ピン
- wake lock
- バックアップ／復元
- compact UI本体
- title guard本体

## 検証結果

- 全JavaScript `node --check`：合格
- legacy読込順14：合格
- data読込順7：合格
- domain読込順8：合格
- legacy → data → domain起動順：合格
- loader重複防止：合格
- 予定activity_id／calendar／participant結合：合格
- legacy plan ID解決：合格
- 準備baseline生成：合格
- 準備baseline再実行：追加0件
- 活動中準備保存：延期
- 保管庫activity／record／media／review／improvement集約：合格
- 新規MutationObserver：0
- 新規`overflow:hidden`：0
- Phase 1 data 7ファイル：v161とbyte-identical
- `src/app.js`：パッケージ未収録、変更なし
- cutover：false

## 未完了

- GitHub一括反映
- GitHub Pages起動確認
- Android回帰確認
- 共通シェル
- ホーム「今・次・すぐ使う・最近」
- 新画面への正式切替
- FIELD03記録と新activity_idの本接続

## 次工程

Phase 3 共通シェル。

- 上部ブランド領域
- 下部4導線「ホーム・探す・中央操作・保管庫」
- 中央操作の状態切替
- history APIによる画面遷移
- 旧画面adapter
- DOM常時再生成を使わないmount方式

GitHub反映後はPhase 3へ入る前にAndroid回帰確認を行う。
