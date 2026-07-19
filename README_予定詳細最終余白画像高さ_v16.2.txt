OUTBASE 予定詳細 最終余白・画像高さ v16.2

実機確認
- v16.1で画像、仮場所、内部名の修正は成功
- 詳細用には既定画像が大きく、ややぼやけて見えた
- Copyright下にまだ大きな余白が残った

原因
- 詳細画面内のナビ予約領域と、共通シェル側の固定下ナビ予約が二重になっていた
- HOMEの小カード向け既定画像を詳細で174px高に拡大していた

修正
- 詳細画面内の重複ナビ予約領域を削除
- 共通シェルの下ナビ予約だけを使用
- 詳細専用mainクラスでpadding-bottomを固定
- 画像高さを174pxから148pxへ縮小
- 小画面は136px
- 画像位置とコントラストを軽く調整
- Copyrightの上下余白を圧縮

維持
- v16.1の画像フォールバック
- ふもとっぱら（仮）
- note/memo内部名の除去
- 予定概要→今やること→準備→記録・思い出
- FIELD03、GPS、地図、写真、動画、音声、IndexedDB
- カレンダー、探す、追加、保管庫、共通上下バー、Copyright
- 天気r34

監査
{
  "activity_main_class_added": true,
  "activity_main_class_route_safe": true,
  "duplicate_nav_reserve_removed_from_markup": true,
  "duplicate_nav_reserve_hidden_css": true,
  "hero_height_reduced": true,
  "small_screen_height_reduced": true,
  "default_cover_tone_adjusted": true,
  "copyright_spacing_reduced": true,
  "new_shell_version": true,
  "new_index_version": true,
  "new_sw_cache": true
}

構文
{
  "activity-route": "OK",
  "version": "OK",
  "manifest": "OK",
  "service-worker": "OK"
}
