# OUTBASE 開発ゲート v140

## Gate 0：MVPα1凍結

- 現在の1ファイル試作を `archive/prototypes/MVP_ALPHA_1_FROZEN/` に保存。
- 以後、1ファイルへの機能追加は禁止。

## Gate 1：本開発構成移行

- `src/core`、`src/domain`、`src/modules`、`styles`、`docs` へ分割。
- GitHub Pagesで静的起動できる構造にする。

## Gate 2：PWAシェル

- `manifest.json` と `service-worker.js` を導入。
- ホーム画面追加、オフライン起動の土台を作る。

## Gate 3：Coreデータ構造

- project / session / record / asset / candidate / review_queue を実装。
- localStorage仮保存からIndexedDB/同期前提へ移行。

## Gate 4：散歩エンジン移行

- MVPα1で動いた散歩導線をSession/Record構造へ移す。
- GPS、経過時間、写真、動画、音声文字起こし、終了/破棄/復元を整理。

## Gate 5：キャンプ準備エンジン

- 予約情報から次のキャンププロジェクトを作る。
- 買い物、持ち物、コタ用品、前回反省、リン送信用リストへ接続。

## Gate 6：一括取込/OCR候補

- 予約スクショ/PDF、購入履歴、ギアExcel、キャンプ履歴を候補化。
- AI候補は確定データにせず承認待ちにする。

## Gate 7：レビュー/次回改善

- 散歩、キャンプ、設営撤収、料理、ギア、天気判断を次回改善へ返す。

## Gate 8：Codex投入

- `AGENTS.md`、README、テストチェックリスト、ファイル構成が揃った後に投入。
- Codexには実装・整理・テストを任せる。思想・優先順位判断は任せない。

## Gate 9：MVPβ実用確認

- 次のキャンプ前に実際に開く。
- 散歩で実際に使う。
- 準備リストをリンへ送れる。
- 帰宅後に次回改善が残る。

## Gate 10：アプリ化判断

PWAで限界が出た場合のみ、Capacitor等でアプリ化を検討する。
