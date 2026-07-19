OUTBASE HOME情報階層統合 v15

v14実機確認
- 色、余白、角丸はHOMEへ近づいた
- 探すは初期状態から38件の一覧が続き、全データ一覧に見えた
- 保管庫は件数表とタブが二重操作に見え、管理画面の構造が残った
- 追加はHOME型として維持可能

v15 探す
- 初期状態では検索結果一覧を表示しない
- 「これからの予定」3件をHOME型の横カードで表示
- 「最近の思い出」3件を要約表示
- 「登録した持ち物」4件を要約表示
- 文字入力または種類選択をした時だけ、全検索結果へ切り替える
- 38件の件数は検索結果モードだけで表示
- キャンプ場・場所検索、保管庫接続は維持

v15 保管庫
- 上部の件数表を廃止
- 活動／記録／持ち物の切替と件数を1か所へ統合
- 各タブに主役カードを1枚表示
  活動＝最近の活動
  記録＝最近の記録
  持ち物＝共通台帳
- 初期表示は短い一覧にし、件数が多い場合だけ「あとN件を見る」で展開
- 活動・記録・持ち物の機能と共通台帳接続は維持

維持
- v10カレンダー
- v12.1追加4導線
- 共通上下バー
- Copyright
- FIELD03、GPS、地図、写真、動画、音声、IndexedDB、天気r34

監査
{
  "search_initial_preview_sections": true,
  "search_initial_no_long_result_list": true,
  "search_results_only_after_intent": true,
  "search_home_cover_cards": true,
  "vault_single_switch": true,
  "vault_counts_inside_tabs": true,
  "vault_feature_per_tab": true,
  "vault_short_lists_expandable": true,
  "add_unchanged": true,
  "new_shell_version": true,
  "new_index_version": true,
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
