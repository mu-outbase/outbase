# OUTBASE BOOT v7.5 v166.4完成度仕上げLOCK

起動トリガー：「アウトベース」

## 正本

- MASTER_v166_4_完成度仕上げ反映LOCK.xlsx
- 基準GitHub main：`939b6acbff61a4967ebef42647521ddf3e8073f1`
- v166.3をロールバック地点とする

## 現在位置

v166.4の技術選択・設計・ローカル実装・自動検証・監査は完了。
GitHub main反映とAndroid実機確認は未実施。

## v166.4 LOCK

- 「次」カード右側は空白／曖昧な＋ではなく、活動情景・日付・場所を表示する。
- 「すぐ使う」はスマホで2列×2段とする。
- 写真なし活動は活動タイプ別の正式な軽量SVG情景を表示する。
- 「探す」は地図・写真・カレンダーの静的内容プレビューを持つ。
- 「保管庫」は写真と活動を主役にし、既存写真だけを遅延表示する。
- 追加シートは「活動を始める」を主操作、メモ・予定を補助操作とする。

## 上位制約

- v166.1のfast shell、route別read model、30秒cache、persistent shellを維持する。
- v166.2の文字・余白・一覧密度を維持する。
- v166.3のIntersectionObserver遅延写真とObject URL再利用を維持する。
- 通常時NORTH、active／paused時だけTRAIL LENS。
- Activity Story OSとFIELD03で同一activity_idを維持する。
- 家族・ペット・参加者・公開範囲を維持する。

## 絶対保護

- FIELD03 `src/app.js`
- GPS、地図、写真、動画、音声、ピン、欠測、wake lock、offline restore
- `outbase_db` version 10
- `outbase_story_db` schema
- 保存データ、バックアップ、復元

## 禁止

- v166.3より前の構造へ推測で戻さない。
- domain／repository／migrationを表示改善のために変更しない。
- 外部画像・外部フォント・MutationObserverを追加しない。
