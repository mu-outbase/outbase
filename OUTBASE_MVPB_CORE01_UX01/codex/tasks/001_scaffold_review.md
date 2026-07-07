# Codex Task 001: Scaffold Review

目的: v140本開発構成がGitHub Pagesで起動できるか確認し、不要な1ファイル化がないか監査する。

確認:
- index.html が module script で src/main.js を読む
- styles/app.css が分離されている
- AGENTS.md と docs が存在する
- service-worker.js のキャッシュ対象が存在する
- MVPα1の凍結アーカイブが存在する

修正禁止:
- 巨大indexへ戻すこと
- 手入力中心の機能完成扱い
