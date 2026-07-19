OUTBASE カレンダー表示高LOCK v6

対象
- 選択日欄の下からCopyrightまでに残る大きな空白
- HOMEをスクロールした位置のままカレンダーを開くと、先頭から表示されない問題

確定原因
- iframe内がdocument.scrollHeightを報告していた
- document.scrollHeightはiframe自身の表示高より小さくならない
- 親iframeが720pxのまま縮まず、実内容の下に空白が残った

修正
- calendar-shell本体のscrollHeightを測定
- ResizeObserverで月・週・日・一覧・ToDo・選択日開閉の高さ変化を追従
- 埋込時のviewport依存min-heightを解除
- 親iframeは360pxまで縮小可能
- 2px以内の同値更新を無視してループ防止
- 画面ルートが変わった時だけ先頭へ戻す
- 通常スクロール中は固定ヘッダーを維持し、スクロール位置を邪魔しない
- デザイン、カレンダー機能、HOME、Copyright、下バーは変更しない

保護
- FIELD03
- GPS / 地図
- 写真 / 動画 / 音声
- IndexedDB
- 天気r34
は変更なし

監査
{
  "child_measures_calendar_shell": true,
  "child_no_document_scrollheight": true,
  "child_resize_observer": true,
  "embedded_no_viewport_minheight": true,
  "parent_accepts_shrink": true,
  "parent_height_difference_guard": true,
  "route_change_scroll_reset": true,
  "small_initial_iframe": true,
  "new_shell_version": true,
  "new_index_version_url": true,
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
