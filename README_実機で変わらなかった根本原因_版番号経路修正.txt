OUTBASE 実機読込経路 根本修正 v2

確定した原因
- GitHub上には新しい module-manifest.js と shell-renderer-direct-fix.js が存在
- index.html は module-manifest.js を旧URLで読み続けていた
- version.js の shell版番号も旧値
- Service WorkerのCORE_ASSETSに shell-renderer-direct-fix.jsが未登録
- 実機は旧マニフェストと旧シェル資産を使い続けていた

修正
- version.jsを同梱し、app/shell/cache版番号を更新
- index.htmlのversion.js / module-manifest.js URLを新規化
- Service Workerのキャッシュ名を更新
- shell-renderer / direct-fix / bootstrapを同一の新shell版へ統一
- direct-fixをService Workerへ正式登録
- 下バーを本体mount後に
  ホーム / カレンダー / 追加 / 探す / 保管庫
  で確定
- カレンダーv4.4を本体mount内で表示
- iframe高さをpostMessageで同期
- MutationObserver不使用

監査
{
  "index_version_url_new": true,
  "index_manifest_url_new": true,
  "shell_version_new": true,
  "manifest_direct_fix_order": true,
  "sw_direct_fix_cached": true,
  "sw_manifest_new_url": true,
  "sw_cache_name_new": true,
  "old_manifest_query_absent": true,
  "nav_five_labels": true,
  "resize_listener": true
}

構文確認
{
  "version": "OK",
  "manifest": "OK",
  "direct-fix": "OK",
  "calendar": "OK",
  "service-worker": "OK"
}
