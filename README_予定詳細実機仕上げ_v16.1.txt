OUTBASE 予定詳細 実機仕上げ v16.1

実機で確認した問題
- 詳細上部の画像枠が空白で、左上にフォールバック記号が出ていた
- HOMEでは「ふもとっぱら（仮）」だが詳細では「場所未設定」だった
- 準備項目に内部カテゴリー名 note が表示された
- Copyrightから下バーまでの空白が大きかった

修正
- 詳細でもHOMEと同じ既定画像を必ず表示
- 実写真がある場合は実写真を優先
- フォールバック記号を非表示
- 「きゃんぷ」の仮場所は表示時だけHOMEと同じ「ふもとっぱら（仮）」へ統一
- 保存データは変更・上書きしない
- note / memo 等の内部名を日本語表示へ変換
- 項目名と種類が同じ場合は「未完了」を表示
- 詳細画面のmin-heightとナビ予約領域を調整し、下の空白を圧縮

維持
- v16の予定概要→今やること→準備→記録・思い出の一本線
- FIELD03、GPS、地図、写真、動画、音声、IndexedDB
- カレンダー、探す、追加、保管庫、共通上下バー、Copyright
- 天気r34

監査
{
  "default_cover_applied": true,
  "fallback_plus_hidden": true,
  "temporary_place_display_only": true,
  "stored_place_not_modified": true,
  "internal_note_removed": true,
  "prep_meta_used": true,
  "bottom_gap_reduced": true,
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
