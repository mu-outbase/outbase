# OUTBASE v165 統合版

## 目的
v164までに作成したShadow DB、起動境界、domain／screen model、共通シェル、ホーム4領域を土台に、活動詳細・月間カレンダー・家族／ペットフィルタ・PWA基礎を安全な一括単位で統合する。

## 実装範囲
- 活動詳細：基本情報、参加者、予定、準備、記録、整理・改善、思い出
- 月間カレンダー：42日グリッド、複数日活動、前月／翌月
- 家族・ペットフィルタ：複数選択、URL保持、AND条件
- ホームから活動詳細／カレンダーへのHistory API遷移
- PWA：manifest、192／512アイコン、standalone、ショートカット、オフラインキャッシュ

## 安全境界
- `?shell=1`限定起動を維持
- active／paused現地セッション中はFIELD03へfallback
- 準備・記録の編集は旧FIELD03 adapterへ渡す
- `src/app.js`、旧`outbase_db` version 10、Shadow DB schemaは変更しない
- 写真・動画・音声の原本Blobは読まない
- data cutover／screen cutoverは行わない

## アプリ化方針
v165はインストール可能なPWAの基礎を追加した。Android実機で戻る、回転、復帰、オフライン、インストール起動を確認後、FIELD03を新activity_idへ接続する。ネイティブ包装方式はFIELD03統合後に決定する。
