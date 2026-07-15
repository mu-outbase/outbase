# OUTBASE BOOT v7.1 ちらつきゼロ・軽量遷移LOCK

起動トリガー：「アウトベース」

## 正本

- MASTER_v166_1_ちらつきゼロ軽量遷移反映LOCK.xlsx
- GitHub main反映前基準：832420680b707a4ad1b30236cbce455b00ae27eb
- v166をロールバック地点とする

## 正式デザイン

- 通常時：NORTH
- active／paused：TRAIL LENS

## 性能LOCK

- idle shellでは旧FIELD03をfirst paintしない
- shellでは旧UI14 JSを読み込まない
- read modelは現在ルートだけ生成
- header／bottom nav／modalを永続化
- routine View Transitionは無効
- route短期cacheとidle preloadを使用

## 絶対保護

- FIELD03 app.js
- GPS、地図、写真、動画、音声、ピン、欠測、wake lock
- outbase_db version 10
- outbase_story_db schema
- バックアップ／復元
