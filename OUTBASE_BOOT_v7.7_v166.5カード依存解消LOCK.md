# OUTBASE BOOT v7.7 v166.5 カード依存解消LOCK

起動トリガー：「アウトベース」

## 基準
- GitHub main: `28acdd4a7933a3b43ec162aeb812c5dda3fa5051`
- v166.4をロールバック地点とする

## v166.5
- カードを極力減らし、タイポグラフィ・罫線・余白で階層を作る
- ホームの次は全幅ヒーロー、最近は横スクロール
- 探すはタブ＋横スクロールコンテンツ
- 保管庫は上部だけBento Grid、全活動はフラット一覧
- 追加シートは開始だけを主操作、メモと予定は線形操作
- 旧データのタイトルとtype不一致は表示専用判定で補正する

## 絶対保護
- FIELD03 `src/app.js`
- GPS、地図、写真、動画、音声、ピン、欠測、wake lock、offline restore
- `outbase_db` version 10 / `outbase_story_db` schema
- 保存データ、バックアップ、復元、activity_id、家族・ペット・公開範囲
