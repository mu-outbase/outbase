OUTBASE 保管庫正式3面 v13

監査結果
- 既存保管庫で閲覧できたのは活動ストーリーのみ
- 「記録」「持ち物」は件数表示だけだった
- 「旧保管庫」という内部都合の名称が残っていた

v13
- 活動：活動ストーリー、記録数、写真・動画、レビュー、改善を表示
- 記録：活動を横断した最近のメモ・写真・動画・音声を表示
- 持ち物：登録済み持ち物を一覧表示
- 持ち物カードから既存共通台帳の該当編集画面へ接続
- 「共通台帳を開く」からギア一覧へ接続
- 3タブの最後の表示位置を保存
- 「旧保管庫」の表現を撤去

役割LOCK
- 追加：新しく作る・始める
- 探す：言葉や条件で見つける
- 保管庫：残したものを見る・整理する

監査
{
  "module_order": true,
  "three_real_views": true,
  "full_payload": true,
  "old_vault_removed": true,
  "ledger_bridge": true,
  "tab_persisted": true,
  "copyright": true,
  "home_visual": true,
  "vault_cached": true,
  "new_shell_version": true,
  "new_index_version": true,
  "new_sw_cache": true
}

構文確認
{
  "version": "OK",
  "manifest": "OK",
  "vault-route": "OK",
  "service-worker": "OK"
}