OUTBASE HOMEデザイン統一 v5

修正内容
- 共通上部バーを約64pxへコンパクト化
- ロゴ文字、通知、設定アイコンも一段小さく調整
- Copyrightの上下余白を大幅に縮小
- 「このアプリについて」をHOMEと同じカード言語へ再設計
- HOMEと同じ白カード、20px角丸、薄い境界線、弱い影を使用
- 見出しは黒、緑はブランドと操作アクセントだけに限定
- 大きすぎる緑見出しと別アプリ風のアコーディオンを廃止
- 「個人名は表示しません」の内部向け文言を削除

原因
- 「このアプリについて」だけ独立CSSと独立文字階層で作っていた
- HOMEの共通部品を使わず、毎回似せる実装を追加していた
- 今回からHOMEのカード階層を設計基準として固定

保護
- FIELD03
- GPS / 地図
- 写真 / 動画 / 音声
- IndexedDB
- 天気r34
は変更なし

監査
{
  "header_compact_height": true,
  "copyright_compact_spacing": true,
  "about_home_card_language": true,
  "about_title_black_not_green": true,
  "personal_name_sentence_removed": true,
  "new_shell_version": true,
  "new_index_version_url": true,
  "new_sw_cache": true,
  "about_asset_cached": true
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
