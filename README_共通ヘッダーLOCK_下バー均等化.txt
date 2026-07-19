OUTBASE 共通ヘッダーLOCK v3

正式方針
- HOME上部を本体共通ヘッダーとしてLOCK
- HOME、カレンダー、探す、保管庫、活動詳細で同じヘッダーを使用
- 各ページは本文だけを差し替える
- ページごとのOUTBASEヘッダー複製は禁止

共通ヘッダー
- OUTBASE文字ロゴ
- 通知
- 設定
- sticky固定
- セーフエリア対応
- HOMEの白背景、緑、余白、細線アイコンへ統一

下部ナビ
- ホーム / カレンダー / 追加 / 探す / 保管庫
- 5列完全同幅
- 左右10px内側余白
- 各項目のタップ範囲を100%へ統一
- 保管庫だけ狭く見える問題を修正

保護
- FIELD03
- GPS / 地図
- 写真 / 動画 / 音声
- IndexedDB
- 天気r34
は変更なし

監査
{
  "common_header_function": true,
  "header_applied_every_mount": true,
  "home_notification_settings": true,
  "sticky_header_css": true,
  "five_equal_columns": true,
  "vault_equal_tap_zone": true,
  "new_shell_version": true,
  "new_index_version_url": true,
  "new_sw_cache": true,
  "direct_fix_cached_new_version": true
}

構文確認
{
  "version": "OK",
  "manifest": "OK",
  "direct-fix": "OK",
  "calendar": "OK",
  "service-worker": "OK"
}
