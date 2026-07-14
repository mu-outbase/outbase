# OUTBASE v161 Phase 2A 監査・実装報告

作成日：2026-07-15（Asia/Tokyo）

## 現在位置

- 正本：`MASTER_v161_Phase2A起動境界分割実装反映LOCK.xlsx`
- GitHub：`mu-outbase/outbase` 接続・読取可能、書込不可
- GitHub main監査時HEAD：`70efdf99247ab639e55eb21f1f8644f9e0b47291`
- 実行アプリ：FIELD03 compact-2
- Phase 1：Shadow DBデータ基盤をローカル実装済み
- Phase 2A：起動境界分割をローカル実装済み
- GitHub反映：未実施
- Android E2E：未実施

## Phase 2Aの目的

巨大な`src/app.js`へ責務を追加し続ける構造を止めるため、FIELD03の画面・記録動作を変えずに起動境界を分離した。

この段階では`src/app.js`を無理に切断しない。既存ファイルを互換カーネルとしてそのまま読み込み、以後の新しい責務を別モジュールへ置く。

## 実装内容

### 起動

- `src/main.js`
- `src/config/version.js`
- `src/config/module-manifest.js`
- `src/runtime/script-loader.js`
- `src/runtime/lifecycle.js`

### 状態・遷移境界

- `src/state/app-state.js`
- `src/router.js`

### Phase 1基盤を同梱

- `src/data/ids.js`
- `src/data/validation.js`
- `src/data/database.js`
- `src/data/repositories.js`
- `src/data/legacy-adapter.js`
- `src/data/migrations.js`
- `src/data/bootstrap.js`

## 読込順の固定

旧index.htmlと同じ順序で既存14モジュールを逐次読込し、その後にPhase 1データ7モジュールを読込する。

1. `src/app.js`
2. `src/outbase-core.js`
3. Chappy、import、memo、review、flow、entry
4. activity、navigation guard、scenarios、title guard、compact UI
5. Phase 1 data modules

動的ローダーは同じURLの重複読込を防ぎ、1ファイルずつ完了を待ってから次へ進む。

## FIELD03保護

変更していないもの：

- `src/app.js`
- 現地セッション
- GPS
- 地図
- 写真・動画・音声
- ピン・駐車位置
- 欠測区間
- 画面ON維持
- 現行バックアップ・復元
- 旧`outbase_db` version 10
- compact UIとtitle guard

Phase 2Aの新規コードにはMutationObserverを追加していない。

## 検証

### 静的検証

- 全新規JavaScript：`node --check`合格
- Phase 1データ7ファイル：前版とbyte-identical
- index.html：`src/app.js`の直接読込を廃止し、`src/main.js`へ集約
- service-worker：新規7モジュール、既存14モジュール、Phase 1データ7モジュールをキャッシュ対象化
- 新規コードのMutationObserver：0

### スモーク試験

- 既存14モジュールの順序：合格
- Phase 1データ7モジュールの順序：合格
- loader逐次実行：合格
- loader重複防止：合格
- legacy→dataの起動順：合格
- Shadow migration完了待ち：合格
- route変換：合格
- data cutover：false

## 正本更新

`MASTER_v161_Phase2A起動境界分割実装反映LOCK.xlsx`へ次を反映した。

- Phase 1実装状態
- Phase 2A実装状態
- GitHub読取可・書込不可
- Android未確認
- 次Phase 2B
- 既存の文字列誤認による`#NAME?` 6件を修正
- 最終数式エラー検索：0件

## 完了判定

Phase 2全体は未完了。

Phase 2A「起動・設定・ローダー・状態・ルーター境界分割」は実装・静的検証完了。GitHub反映とAndroid実機確認が終わるまで本番LOCKにはしない。

## 次工程

1. 完成ZIPをGitHubへ一括反映
2. GitHub Pagesで起動・キャッシュ更新確認
3. Androidで現地セッション、GPS、写真、動画、音声、復帰、オフラインを回帰確認
4. Phase 2Bとして、予定・準備・保管庫を順にdomain/screensへ抽出
5. 記録機能は最後までFIELD03 adapter経由で保護
