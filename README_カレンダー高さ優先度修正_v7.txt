OUTBASE カレンダー高さ優先度修正 v7

実機で確認した症状
- カレンダーが途中で切れる
- iframe内部だけがスクロールする
- Copyrightがカレンダー途中に見える
- Copyrightから下部ナビまで大きな空白が残る

確定原因
- v6で追加した height:420px!important が、
  JavaScriptで設定した実測heightより強かった
- 親iframeが420pxに固定され、内部スクロールが発生した

修正
- height:420px!important を完全削除
- 親の実測heightを style.setProperty(..., 'important') で適用
- iframeへ scrolling=no を追加
- 埋込カレンダーの内部スクロールを禁止
- iframeは初期760px、読込後すぐ実内容高へ伸縮
- Copyrightはカレンダー全体の後ろに配置されたまま
- HOME、共通ヘッダー、下バー、このアプリについては変更なし

保護
- FIELD03
- GPS / 地図
- 写真 / 動画 / 音声
- IndexedDB
- 天気r34
は変更なし

監査
{
  "scrolling_disabled_on_iframe": true,
  "measured_height_uses_important": true,
  "conflicting_420_important_removed": true,
  "iframe_internal_overflow_hidden": true,
  "initial_height_not_important": true,
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
