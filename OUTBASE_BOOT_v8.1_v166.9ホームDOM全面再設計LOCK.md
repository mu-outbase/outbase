# OUTBASE BOOT v8.1 — v166.9 ホームDOM全面再設計 LOCK

現在位置: v166.8 Android実機確認後。CSS変更だけでは画面骨格が変わらず不合格。
今回Phase: v166.9 ホーム画面DOM全面再設計。
GitHub基準: 388aafb。

ホームのみ `ob10-*` 新DOMへ再構築。巨大日付、巨大写真、横長カード群、仮イラスト中心の構成を廃止。
探す・保管庫・追加シートはv166.8を維持し、ホーム合格後に展開する。
FIELD03、src/app.js、outbase_db version 10、outbase_story_db、activity_id、GPS、地図、写真、動画、音声、ピン、欠測、wake lock、offline restore、保存・バックアップ・復元は変更しない。
