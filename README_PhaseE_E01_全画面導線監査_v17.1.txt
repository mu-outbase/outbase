OUTBASE Phase E / E-01 全画面導線監査 v17.1

現在位置
- Phase E MVP仕上げ
- E-01 全画面導線監査
- GitHub mainのv17反映を確認して作成

監査で残っていた問題
1. 共通シェルからFIELD03へ渡す returnShell / returnActivityId は存在した
2. FIELD03側には、その情報を利用して共通シェルへ戻る橋がなかった
3. 検索などの平文シェルURLは画面全体を再読込していた
4. カレンダーiframeの親画面遷移メッセージを受ける共通処理がなかった

v17.1
- FIELD03に「予定詳細へ戻る／準備へ戻る」導線を追加
- 活動中・一時停止中は誤離脱防止のため戻るボタンを無効化
- 活動終了後は同じ画面で戻るボタンが自動的に有効化
- activityId / planIdを保持して共通シェルへ戻す
- 平文の共通シェルURLを内部ルーター遷移へ統一
- カレンダーiframeの遷移メッセージを親画面で受信
- FIELD03のGPS・地図・写真・動画・音声・保存処理は変更なし
- HOME、予定詳細、準備、カレンダー、探す、追加、保管庫の既存画面は変更なし

E-01完了判定
- 実装: 完了候補
- 静的検証: 完了
- GitHub同期: 未反映
- Android通し確認: 未確認
- 現在の工程表上: E-01進行中（0/8完了のまま）
- 実機で一本線を1回完走後にE-01完了へ更新

監査
{
  "github_v17_base_used": true,
  "field03_return_bridge_added": true,
  "active_session_protected": true,
  "preparation_return_supported": true,
  "activity_return_supported": true,
  "plain_shell_links_use_router": true,
  "calendar_parent_message_supported": true,
  "legacy_bridge_loaded_in_legacy_mode": true,
  "navigation_audit_loaded_before_bootstrap": true,
  "legacy_bridge_cached": true,
  "navigation_audit_cached": true,
  "new_app_version": true,
  "new_cache_version": true,
  "index_cache_busted": true
}

構文
{
  "legacy-return-bridge": "OK",
  "navigation-audit": "OK",
  "version": "OK",
  "manifest": "OK",
  "service-worker": "OK"
}
