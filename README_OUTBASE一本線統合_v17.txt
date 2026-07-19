OUTBASE 一本線統合 v17

対象
HOME → 予定詳細 → 準備 → 当日開始 → 記録 → 思い出・改善

正本監査で確認した問題
- 予定詳細の「準備」が旧画面へ直接移動していた
- 活動ID・プランIDの引継ぎがURL任せだった
- 予定詳細に「活動を始める」がなかった
- 準備の完了操作を共通シェル内で行えなかった
- 予定詳細とFIELD03の境界が曖昧だった

v17
- 共通シェル内に正式な「準備」ルートを追加
- 予定詳細の主操作「準備を進める」は新準備画面へ接続
- 準備項目をタップして完了・未完了を切替
- 進捗、未完了数、カテゴリー別項目を即時更新
- 予定詳細へ戻る導線
- 予定詳細と準備画面の両方に「活動を始める」を用意
- 活動開始時にactivityId / planId / runtime context / localStorageを同期
- 現地GPS・地図・写真・動画・音声・メモはFIELD03へ接続
- 詳細な持ち物台帳・料理・買い物も既存FIELD03へ接続
- 旧機能へ渡すURLに戻り先情報を付与
- 共通上バー、下バー、Copyright、HOME背景を維持

境界LOCK
- 普段の確認と完了操作：共通シェル
- 高機能な詳細準備：FIELD03
- 当日の現地記録：FIELD03
- GPS、地図、メディア、IndexedDBは変更しない
- 天気r34は変更しない
- 予定詳細v16.3の画像・余白は変更しない

監査
{
  "shell_preparation_route_registered": true,
  "preparation_module_loaded_before_bootstrap": true,
  "activity_context_is_explicit": true,
  "activity_start_is_available": true,
  "preparation_stays_in_common_shell": true,
  "preparation_items_can_be_completed": true,
  "field03_is_only_used_for_advanced_and_recording": true,
  "return_parameters_are_preserved": true,
  "common_header_footer_preserved": true,
  "router_cache_busted": true,
  "new_module_cached": true,
  "new_shell_version": true,
  "new_sw_cache": true
}

構文
{
  "router": "OK",
  "activity-route": "OK",
  "preparation-route": "OK",
  "version": "OK",
  "manifest": "OK",
  "service-worker": "OK"
}
