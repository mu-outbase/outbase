# OUTBASE BOOT v8.2 — v166.9.1 ホーム表示緊急補正LOCK

現在位置: v166.9 Android実機で情景SVGの全画面逸脱を確認。
今回Phase: ホーム表示の緊急封じ込め。
GitHub基準: 04fe35f。

変更範囲は style-v1669-home.css / index.html / service-worker.js / src/config/version.js のみ。
ホームDOM設計は維持し、SVGの containing block と paint containment だけを修正する。
FIELD03、src/app.js、outbase_db version 10、outbase_story_db、activity_id、GPS、地図、写真、動画、音声、ピン、欠測、wake lock、offline restore、保存・バックアップ・復元は変更しない。
