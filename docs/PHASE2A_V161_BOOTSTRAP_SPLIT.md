# OUTBASE v161 Phase 2A 起動境界分割

## 目的

FIELD03の動作を変えず、`src/app.js`へ新しい責務を追加しないための起動境界を作る。

## 実装

- `src/main.js`：起動オーケストレーションのみ
- `src/config/version.js`：バージョン定義
- `src/config/module-manifest.js`：既存モジュールと新データ層の読込順
- `src/runtime/script-loader.js`：重複防止・タイムアウト付き逐次ローダー
- `src/runtime/lifecycle.js`：起動状態とエラー境界
- `src/state/app-state.js`：旧状態と新Story DB状態の読取専用集約
- `src/router.js`：新しい4導線名と旧5タブの互換変換

## FIELD03保護

`src/app.js`および既存機能ファイルは変更しない。既存と同じ順序で読み込む。
現地セッション、GPS、地図、写真、動画、音声、ピン、欠測、画面ON、バックアップ、復元へ変更を加えない。

## 現時点で残すもの

- compact UI
- activity title guard
- 旧5タブの内部実装

これらはPhase 3〜4で新共通シェルとホームへ置き換えるまで、移行元として残す。
新規機能はcompact層や旧`app.js`へ追加しない。

## 次の分割

Phase 2Bでは、FIELD03と結合の弱い順に予定・保管庫・準備を独立screen/domainへ抽出する。
記録機能は最後にadapter経由で接続する。
