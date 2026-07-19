OUTBASE 予定詳細 高精細既定画像 v16.3

GitHub正本監査
- main最新コミットからv16.2反映済みを確認
- 詳細の既定画像はHOMEと同じローカルJPGを拡大表示
- 実写真がある予定はIndexedDB内の実写真を表示できる構造を維持

v16.3
- 詳細画面だけ1280pxの高精細風景画像を優先
- 画像はWikimedia CommonsのCC0素材
- 個人名はアプリ画面へ表示しない
- 高精細画像が取得できない場合は既存ローカル画像へ自動復帰
- 実写真が登録された予定は実写真を最優先
- 高精細画像は初回取得後にService Workerへ保存
- 外部画像をCORE_ASSETSへ入れず、通信失敗でアプリ更新全体が止まらない構造
- 「このアプリについて」の外部サービス欄へWikimedia Commons / CC0を集約記載

維持
- v16.2の画像高さ・Copyright下余白LOCK
- 予定概要→今やること→準備→記録・思い出
- FIELD03、GPS、地図、写真、動画、音声、IndexedDB
- カレンダー、探す、追加、保管庫、共通上下バー、Copyright
- 天気r34

監査
{
  "detail_high_resolution_first": true,
  "local_default_fallback_preserved": true,
  "real_plan_photo_has_priority": true,
  "external_image_runtime_cached": true,
  "external_image_not_core_install_blocker": true,
  "about_external_source_added": true,
  "personal_name_not_displayed": true,
  "new_shell_version": true,
  "new_index_version": true,
  "new_sw_cache": true
}

構文
{
  "activity-route": "OK",
  "about": "OK",
  "version": "OK",
  "manifest": "OK",
  "service-worker": "OK"
}
