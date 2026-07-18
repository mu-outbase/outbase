OUTBASE HOME v36 r34 全画面導線補強 nav1

【基準】
GitHub main HEAD: 727e3b2ed29e1797b727910f68120890e74fbf33

【アップロードするファイル】
・index.html
・service-worker.js
・src/shell/navigation-audit-fix.js

【変更範囲】
・新シェル内リンクで href に含まれる activityId / planId / month / people / sheet を保持
・活動詳細の左矢印は、シェル内履歴がある時だけ直前画面へ戻る
・FIELD03へ移る直前の新シェルURLとスクロール位置を sessionStorage に安全保存
・既存FIELD03、DB、GPS、地図、写真、動画、音声、保存、バックアップ、復元処理は未変更
・天気画面r34の機能は未変更

【操作】
ZIPを展開せず、GitHubの既存アップロード手順でリポジトリ直下へアップロードしてください。
フォルダ構造を維持してください。

アップロード後はチャットで「アップロードした」と送ってください。
