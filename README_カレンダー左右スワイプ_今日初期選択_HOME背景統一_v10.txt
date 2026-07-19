OUTBASE カレンダー操作・背景統一 v10

要望
- カレンダーを左右へスライドして月移動
- デフォルトの選択位置を今日
- HOMEとカレンダーの背景色を統一

実装
- 月表示のカレンダー領域を左へ56px以上スワイプすると次月
- 右へ56px以上スワイプすると前月
- 縦方向のスクロールは維持
- スワイプ後に日付タップが誤発火しないよう450msブロック
- 月移動時は選択中の日付番号を可能な限り維持
- シェルからカレンダーを開いた場合は表示月・選択日を今日へ初期化
- selected指定の明示的ディープリンクは今日より優先
- 埋込body、calendar-shell、親main、iframeをHOMEと同じ#fbfaf7へ統一

背景色について
- 違いは意図した仕様ではない
- カレンダー側に旧paper色と埋込背景指定が残っていたことが原因
- v10でHOME背景を正式基準としてLOCK

維持
- 予定追加・編集・削除・複製
- ダブルタップ追加
- 月・週・日・一覧・ToDo
- 種類追加・色変更・削除
- Copyright
- 共通ヘッダー
- 下バー5項目
- FIELD03、GPS、地図、写真、音声、IndexedDB、天気r34

監査
{
  "left_swipe_next_month": true,
  "horizontal_threshold": true,
  "vertical_scroll_preserved": true,
  "synthetic_click_blocked": true,
  "default_today_query": true,
  "explicit_selected_wins": true,
  "today_sets_visible_month": true,
  "home_background_calendar_child": true,
  "home_background_parent_main": true,
  "calendar_assets_new": true,
  "new_shell_version": true,
  "new_index_version": true,
  "new_sw_cache": true
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
