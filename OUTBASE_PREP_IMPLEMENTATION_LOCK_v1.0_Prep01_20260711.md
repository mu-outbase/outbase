# OUTBASE PREP IMPLEMENTATION LOCK v1.0 / Prep-01

## 画面LOCK
- 432×768の一画面構成。
- 準備カードへ主役予定・日付・残り日数・進捗・予定詳細入口を統合。
- 重複する主役予定バーは削除。
- キャンプ順序：天気、ギア、料理、買物、ルート。
- コタ項目なし。

## データLOCK
- 保存キー：`outbase_prep_v1`
- 予定IDごとにmodulesを保持。
- moduleごとにchecked、customItems、noteを保持。
- 進捗を予定のprep状態へ同期。

## 操作LOCK
- 項目カードで詳細シートを開く。
- 項目チェック、追加、削除、メモ、一括完了／解除。
- 外側タップ／上部下スワイプで閉じる。
- 天気、ルート、買物の補助操作を維持。

## 維持LOCK
- Plan-01.2、Record-02.2、CLEAN v6。
- 小型プランチップ。
- FIELD03正ベース、RESTORE04.8ルート系。
