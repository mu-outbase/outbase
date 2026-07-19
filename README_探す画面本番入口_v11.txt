OUTBASE 探す画面 本番入口 v11

監査結果
- 既存の探す画面は静的な3カードのみ
- 「これからの予定」は下部カレンダーと役割が重複
- 検索欄や検索結果がなく、探す画面として未完成
- 旧FIELD03には場所・候補検索機能が残っている

v11実装
- 予定、思い出、持ち物の横断検索欄
- すべて／予定／思い出／持ち物フィルター
- HOMEの今後の予定を検索対象へ統合
- 保管庫の活動ストーリーと持ち物を検索対象へ統合
- キャンプ場・場所検索は既存FIELD03検索へ接続
- 保管庫への明確な入口
- 検索語なしでは「最近とこれから」を最大10件表示
- 0件時の案内表示
- Copyright、共通ヘッダー、下部5項目を維持
- カレンダー重複カードを削除

設計判断
- カレンダー：日付を起点に予定を操作
- 探す：言葉・対象を起点に横断検索
- 両者を下部ナビで分離したまま維持

保護
- v10カレンダー左右スワイプ・今日選択・背景統一
- FIELD03
- GPS、地図、写真、動画、音声
- IndexedDB、天気r34

監査
{
  "search_module_order": true,
  "search_model_loads_home_vault": true,
  "plans_memories_assets": true,
  "legacy_place_search_preserved": true,
  "calendar_card_duplicate_removed": true,
  "copyright_present": true,
  "home_visual_css": true,
  "search_cached": true,
  "new_shell_version": true,
  "new_index_version": true,
  "new_sw_cache": true
}

構文確認
{
  "version": "OK",
  "manifest": "OK",
  "search-route": "OK",
  "direct-fix": "OK",
  "about": "OK",
  "calendar": "OK",
  "service-worker": "OK"
}
