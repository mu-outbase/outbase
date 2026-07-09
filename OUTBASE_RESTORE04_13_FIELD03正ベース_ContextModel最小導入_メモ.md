# OUTBASE RESTORE04.13 FIELD03正ベース Context Model最小導入 メモ

## 目的
OUTBASE_CONTEXT_MODEL_LOCK_v1に従い、単一currentPlanId中心から、表示対象・記録対象・セッション・リンクを分ける最小土台へ移行する。

## 実装内容
- `context` を追加
  - `viewTargetId`
  - `viewTargetType`
  - `recordTargetId`
  - `recordTargetType`
  - `primaryRecordingSessionId`
  - `activeSessionIds`
  - `referenceTargetIds`
  - `inboxId`
- `sessions: []` を追加
- `links: []` を追加
- `Record` に以下の互換フィールドを追加
  - `rootPlanId`
  - `sessionId`
  - `parentRecordId`
  - `sourceDevice`
  - `syncStatus`
  - `confidence`
  - `links`
- 表示対象変更と記録対象変更を分離
- 記録中セッション開始を追加
  - コタ通常散歩
  - コタ場内散歩
- 写真/動画/音声/メモ/GPS/ピンを `recordTarget` へ保存する土台へ変更
- 1つの記録を複数対象へ関連付ける `links` 土台を追加

## 維持したもの
- RESTORE04.8 ルートAPIなし版
- 上バー4段階非表示方針
- 下バー固定方針
- 未確認箱は通常運用ではなく保険

## 注意
04.13は全機能完成版ではない。Context Modelの最小導入版。04.14以降で、画面ごとの使いやすさ・整理導線・セッション一覧・リンク編集を詰める。
