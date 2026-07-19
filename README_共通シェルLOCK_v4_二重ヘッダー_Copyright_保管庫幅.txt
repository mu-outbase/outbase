OUTBASE 共通シェルLOCK v4

今回の対象
1. HOME上部バーが二重
2. Copyrightが画面再描画で消える
3. 下バーの保管庫だけ右端で狭い
4. カレンダー下部に不要な空白が残る

根本修正
- 本体mount後にHOME内の旧 ob36-topbar を削除
- 本体共通ヘッダーを常に1個だけ描画
- Copyrightをabout-outbaseの後付け監視から外す
- 本体mountのたびにCopyrightを1個だけ本文末へ配置
- HOMEではナビ用reserveの直前にCopyrightを配置
- カレンダーでも本文直後にCopyrightを配置
- 下バーをrepeat(5,1fr)で完全5等分
- 左右14pxの内側余白を確保
- 保管庫を含む全項目の幅とタップ範囲を100%に統一
- カレンダーiframeを実内容に合わせて縮小可能に変更
- MutationObserver不使用

保護
- FIELD03
- GPS / 地図
- 写真 / 動画 / 音声
- IndexedDB
- 天気r34
は変更なし

監査
{
  "duplicate_home_topbar_removed_each_mount": true,
  "single_common_header_each_mount": true,
  "copyright_created_by_shell": true,
  "copyright_before_home_reserve": true,
  "about_no_footer_observer": true,
  "five_equal_columns": true,
  "vault_has_equal_width": true,
  "calendar_can_shrink": true,
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
  "about": "OK",
  "calendar": "OK",
  "service-worker": "OK"
}
