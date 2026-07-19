OUTBASE 本体読み込み順へ正式統合

前回までの失敗
- 配布ZIPに src/shell/shell-renderer.js が含まれていなかった
- 後付けスクリプトが本体再描画に負けていた
- そのため実機で変化しなかった

今回
- module-manifest.jsを正式に同梱
- shell-renderer.jsの直後、bootstrap.jsの直前に
  shell-renderer-direct-fix.jsを読み込む
- 本体mount()をラップし、描画のたびに5項目ナビを確定
- calendar routeでは同じmount内でv4.4へ置換
- MutationObserverなし
- 点滅する後付けDOM監視なし
- calendar-route-v4.jsの静的読込なし

下部ナビ
ホーム / カレンダー / 追加 / 探す / 保管庫

監査
{'manifest順序': True, '旧route読込なし': True, '5項目正本': True, 'v44直接表示': True}

構文確認
{'fix': 'OK', 'manifest': 'OK', 'calendar': 'OK', 'sw': 'OK'}
