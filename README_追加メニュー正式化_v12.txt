OUTBASE 追加メニュー正式化 v12

役割
- 追加：新しく作る、今から始めるための共通入口
- 探す：言葉や条件から横断検索する
- 保管庫：残した記録を活動ごとに整理・振り返る

追加メニュー
1. 予定を追加
   これからの予定をカレンダーへ
2. 活動を始める
   散歩・キャンプ・ドライブを記録開始
3. 記録を残す
   気づきやメモをすぐに残す
4. 持ち物を登録
   ギア・消耗品を共通台帳へ

接続
- 予定：既存openPlanAdd
- 活動：既存openStart
- 記録：既存openMemo
- 持ち物：FIELD03準備→共通台帳→ギア→アイテム→新規追加を自動接続

維持
- 下スワイプで閉じる
- v10カレンダー
- v11探す
- 保管庫
- 共通ヘッダー、下バー5項目、Copyright
- FIELD03、GPS、地図、写真、動画、音声、IndexedDB、天気r34

監査
{
  "module_order": true,
  "four_roles": true,
  "existing_plan_start_memo_routes": true,
  "gear_direct_bridge": true,
  "field03_route": true,
  "down_swipe_compatible": true,
  "home_visual": true,
  "add_cached": true,
  "new_shell_version": true,
  "new_index_version": true,
  "new_sw_cache": true
}

構文確認
{
  "version": "OK",
  "manifest": "OK",
  "add-menu": "OK",
  "search-route": "OK",
  "direct-fix": "OK",
  "about": "OK",
  "calendar": "OK",
  "service-worker": "OK"
}
