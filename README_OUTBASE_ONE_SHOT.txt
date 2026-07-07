OUTBASE One Shot Full

目的:
- 予定管理ではなく、キャンプ前・現地・帰宅後・次回準備をラクにするOUTBASE。
- MASTER_v139 / BOOT_v2.3 のMVP再設計方針を元に、全機能を1つのPWAに収める。

実装済み:
- 予定/探す/準備/＋/思い出の5画面
- キャンププロジェクト、全予定、散歩、場所カード、ギア、料理、買い物、Weather Watch、設営撤収ログ
- 現地3秒記録、写真/動画添付、音声文字起こしメモ、GPS、犬友達、スポット、💩/💧
- 予約/購入/天気/Excel/写真/PDFなどの一括取込候補化
- チャッピー提案、レビュー、次回改善、バックアップ/復元、ICS書き出し
- オフライン用 service-worker

制限:
- Google Photos / Google Calendar / 天気API / 家族リアルタイム同期は外部認証が必要なため、ローカル保存・URL/ICS/取込・共有用エクスポートまで。

確認URL:
https://mu-outbase.github.io/outbase/?v=outbase-one-shot-full-20260707
