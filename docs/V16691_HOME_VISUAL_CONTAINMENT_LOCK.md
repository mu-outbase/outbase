# OUTBASE v166.9.1 HOME VISUAL CONTAINMENT LOCK

- 基準: GitHub main 04fe35f（v166.9反映済み）
- 症状: ホームの活動情景SVGがサムネイル枠を抜け、画面全体へ拡大表示された。
- 原因: `.ob8-scene-svg` は absolute 配置だが、新規 `.ob10-next-thumb` / `.ob10-recent-thumb` に containing block が無かった。
- 修正: 両サムネイルを `position:relative` + `contain:paint` + `isolation:isolate` で封じ、fallback/SVGを枠内へ強制固定。
- ホームDOM・機能・データ構造は変更しない。
- FIELD03 / src/app.js / DB / GPS / 写真・動画・音声 / 保存・復元は変更しない。
