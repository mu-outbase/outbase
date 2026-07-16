# OUTBASE BOOT v7.9 — v166.7 ネイティブアプリ体験LOCK

## 基準
- GitHub main: `1bdf163829a036a9c1dfbf75563bd2776f157687`
- v166.6の機能構成を維持し、表示層だけを大幅変更する。

## v166.7
- テスト画面／ワイヤーフレーム感を廃止する。
- sticky glass header、floating native bottom navigation、immersive hero、snap carousel、native bottom sheetを採用する。
- ホーム、探す、保管庫、追加シートをモバイルアプリとして一貫した画面にする。
- 通常URLはNORTH。active／pausedのみTRAIL LENS。

## 絶対保護
- FIELD03 `src/app.js`
- GPS、地図、写真、動画、音声、ピン、欠測、wake lock、offline restore
- `outbase_db` version 10
- `outbase_story_db` schema
- activity_id、保存データ、バックアップ、復元
