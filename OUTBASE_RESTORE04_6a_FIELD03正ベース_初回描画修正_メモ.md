# OUTBASE RESTORE04.6a FIELD03正ベース 初回描画修正

## ベース
- OUTBASE_RESTORE04_6_FIELD03正ベース_上バー整理_準備ホーム復帰.zip
- FIELD03正ベース維持。REBUILD17/18/18.1/RESTORE01には戻していない。

## 修正理由
RESTORE04.6の上バー整理・準備ホーム復帰コードは存在したが、初回 render() がRESTORE04.6上書き定義より前に実行されていたため、起動直後だけ古い上バー/古い準備ルート表示が出る可能性があった。

## 修正内容
- 初回 render() をRESTORE04.6の最終上書き定義後に移動。
- 上バーは初回表示から OUTBASEロゴ + 現在の主役予定のみ。
- 下バー「準備」は初回後も準備ホームへ戻る。
- 現地セッション/GPS/地図/写真/動画/音声/ピン/欠測/画面ON維持には触れていない。

## 確認
- node --check src/app.js
- node --check service-worker.js
