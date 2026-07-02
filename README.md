# OUTBASE MVP固定版 v140

このリポジトリ構成は、MVPα1の1ファイル試作を凍結し、OUTBASEをPWA・Codex・将来アプリ化に耐える本開発構成へ移すための開発ベースです。

## 現在の判断

- MVPα1は「実機導線確認用プロトタイプ」として凍結する。
- `index.html` へ機能を追加し続けない。
- OUTBASE MVPは「少ない機能」ではなく、むーが実際に使いたくなる最低完成ラインとする。
- 手入力中心は禁止。入力は自動取得・候補表示・一括取込・承認を基本にする。
- 予約スクショ読取は入口にすぎない。次のキャンプ準備、買い物、持ち物、コタ用品、反省、当日記録、次回改善まで接続して初めてMVP候補とする。

## 開発構成

```text
index.html
manifest.json
service-worker.js
styles/app.css
src/main.js
src/config/version.js
src/core/router.js
src/core/storage.js
src/core/store.js
src/domain/schema.js
src/modules/home/home.js
src/modules/walk/walk.js
src/modules/prep/prep.js
src/modules/import/import.js
src/modules/review/review.js
src/modules/pwa/pwa.js
src/ui/components.js
docs/MVP_FIXED_v140.md
docs/ROADMAP_GATES_v140.md
docs/TEST_CHECKLIST_v140.md
docs/MIGRATION_FROM_ALPHA1_v140.md
AGENTS.md
```

## 起動方法

静的ファイルとしてGitHub Pagesで動かす前提です。ローカル確認する場合は、VS Code Live Serverなどの簡易HTTPサーバーで開いてください。`file://` 直開きではService Workerや一部の権限確認が動かない場合があります。

## 重要

このパッケージは「本開発構成への移行ベース」です。MVP完成版ではありません。
