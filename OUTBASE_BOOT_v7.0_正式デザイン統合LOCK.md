# OUTBASE BOOT v7.0 正式デザイン統合LOCK

起動トリガー：「アウトベース」

## 現在の正本

- MASTER_v166_正式デザイン統合実装反映LOCK.xlsx
- GitHub mainは反映前までaee51d0を実装基準とする
- v165.2はロールバック地点

## 正式デザイン

- NORTH：通常時
- TRAIL LENS：active／paused
- 4導線：ホーム／探す／追加／保管庫
- Activity Story OSと同一activity_idを維持

## 絶対保護

- FIELD03
- GPS、地図、写真、動画、音声、ピン、欠測、wake lock
- outbase_db version 10
- 既存データ
- バックアップ／復元

## 開発ルール

- GitHub main最新を毎回確認
- 小出し修正禁止。安全な単位で一括反映
- 正本・BOOT・STATUS・ROADMAPを実装ターンで同期
- irreversible操作、真の矛盾、ファイル・権限不足だけ質問
- Android実機未確認を完成扱いにしない
