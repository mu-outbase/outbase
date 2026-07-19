OUTBASE v15.1 画像なし予定・保管庫下余白仕上げ

実機確認で残った2点のみ修正。

1. 探す／これからの予定
- coverVariantが未定義・未知の値でも灰色の空欄にしない
- タイトル、場所、種類から既定画像を判定
  海・ドライブ＝sea
  湖・湖畔＝lake
  公園・散歩＝autumn
  イベント・発売＝festival
  その他＝group
- CSS側にもgroup画像を最終フォールバックとして固定

2. 保管庫
- 内容が少ない画面ではCopyrightを下バー直上へ配置
- Copyright以下の大きな空白を解消
- 内容が多い場合の通常スクロールは維持

維持
- v10カレンダー
- v12.1追加
- v15探す・保管庫情報階層
- 共通上下バー、Copyright
- FIELD03、GPS、地図、写真、動画、音声、IndexedDB、天気r34

監査
{
  "unknown_cover_never_blank": true,
  "semantic_cover_mapping": true,
  "css_default_cover": true,
  "vault_footer_bottom_aligned": true,
  "vault_reserve_compact": true,
  "new_shell_version": true,
  "new_sw_cache": true
}

構文
{
  "search": "OK",
  "vault": "OK",
  "add": "OK",
  "version": "OK",
  "manifest": "OK",
  "direct-fix": "OK",
  "about": "OK",
  "calendar": "OK",
  "service-worker": "OK"
}
