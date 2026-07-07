OUTBASE v147 既存UI維持・全予定MVP 一括実装LOCK

これはアプリ実装ZIPです。
GitHubの main へアップロードしてください。

確認URL:
https://mu-outbase.github.io/outbase/?v=v147-ui-keep-all-event-mvp-lock

実装方針:
- RESTART-35 / 37〜40系の見た目を維持
- 下ナビは 予定 / 探す / 準備 / ＋ / 思い出 のまま
- 新ホーム、新カレンダーUI、v144/v145構造は不採用
- index.html / style.css / src/app.js / manifest.json / service-worker.js を一括整合

入れた機能:
- 全予定カレンダー
- 普通の予定
- キャンプ/散歩/外出/病院/支払い/仕事などの予定種別
- 予定の深さ Lv.1〜Lv.4
- 準備から開始
- 現地記録から開始
- 過去実績から開始
- メモから開始
- 文脈仮紐付け
- 要確認
- 散歩3秒記録
- 写真/動画ファイル記録
- 音声文字起こしメモ対応
- GPS記録
- 💩/💧/犬友達/スポット記録
- 犬友達エンジン
- 場所カード
- Weather Watch
- ギア管理
- 料理・献立・買い物統合
- 設営・撤収ログ
- 思い出/レビュー/次回改善
- チャッピー提案
- 一括取込候補
- バックアップ/復元
- オフライン用service-worker

注意:
Google Photos本接続、天気API本接続、家族リアルタイム同期は外部認証/APIが必要なため、今回は設計方針を壊さない形のMVP入口まで。
