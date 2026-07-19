OUTBASE カレンダー HOME戻るボタン削除 v8

実機症状
- カレンダー左上の最初の〈を押すと、iframe内にHOMEが表示される
- 繰り返すとHOMEが入れ子になり、画面が段々小さくなる

確定原因
- calendar-formal-v44.htmlに「ホームへ戻る」ボタンが残っていた
- click時にlocation.hrefでHOMEをiframe内へ読み込んでいた

修正
- 「ホームへ戻る」ボタンをHTMLから完全削除
- HOMEをiframe内へ読み込むJavaScriptを完全削除
- 不要になったmonth-home-back CSSを削除
- 左端は前月ボタンだけに変更
- ツールバーを5列へ再配置
  前月 / 年月 / 次月 / 今日 / 追加
- HOMEへ戻る操作は共通下部ナビの「ホーム」だけに統一

保護
- カレンダー機能
- 予定追加・編集
- FIELD03
- GPS / 地図
- 写真 / 動画 / 音声
- IndexedDB
- 天気r34
は変更なし

監査
{
  "back_button_removed_from_html": true,
  "home_iframe_navigation_removed": true,
  "obsolete_back_css_removed": true,
  "desktop_toolbar_five_columns": true,
  "mobile_toolbar_five_columns": true,
  "calendar_html_uses_new_assets": true,
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
