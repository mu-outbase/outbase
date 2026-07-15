# OUTBASE BOOT v7.3 視覚階層・活動感LOCK

起動トリガー：「アウトベース」

## 正本

- MASTER_v166_3_視覚階層活動感再設計反映LOCK.xlsx
- GitHub main反映前基準：02e529123ca04dc2ad4952abf18407ceaf79d485
- v166.2をロールバック地点とする

## 正式デザイン

- 通常時：NORTH
- active／paused：TRAIL LENS
- v166.2の密度とv166.1の性能を上位制約として維持

## v166.3 LOCK

- 本人の既存写真を1活動1枚だけ遅延プレビュー
- 初期表示・画面外ではBlobを読まない
- 写真がない活動はタイプ別CSS／SVG visual
- 次・最近・探す・保管庫・活動詳細・追加シートへ視覚的な主役を設ける
- 家族・ペットを人物／肉球アバターで表現
- 文字・余白を再拡大しない

## 絶対保護

- FIELD03 app.js
- GPS、地図、写真保存、動画、音声、ピン、欠測、wake lock
- outbase_db version 10
- outbase_story_db schema
- バックアップ／復元
