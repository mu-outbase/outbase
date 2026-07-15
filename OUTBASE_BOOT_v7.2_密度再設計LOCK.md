# OUTBASE BOOT v7.2 全画面密度再設計LOCK

起動トリガー：「アウトベース」

## 正本

- MASTER_v166_2_全画面密度再設計反映LOCK.xlsx
- GitHub反映前基準：8d996795c35fb094a74440af2e43a960d4e37cc6
- v166.1をロールバック地点とする

## 正式デザイン

- 通常時：NORTH
- active／paused：TRAIL LENS
- 高級感を大文字と広い空白で作らない
- 日本語中心・正確な余白・細い罫線・明確な操作優先度

## 密度LOCK

- ホームタイトル最大36px
- 汎用ページタイトル最大38px
- セクション見出し21px基準
- 一覧62〜70px基準
- 下部ナビ64px基準
- ボトムシート最大74dvh
- 主要タップ領域48px維持

## 絶対保護

- FIELD03 app.js
- GPS、地図、写真、動画、音声、ピン、欠測、wake lock
- outbase_db version 10
- outbase_story_db schema
- 既存データ・バックアップ・復元
