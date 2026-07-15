# OUTBASE v165.2 画面遷移スクロール補正

作成日：2026-07-15（Asia/Tokyo）

## Android実機で確認した問題

ホームの「きゃんぷ」から「活動を見る」を押すと、活動詳細の先頭ではなく「参加者」「予定」「準備」付近の途中位置から表示された。

## 原因

新シェルはHistory APIでURLと画面内容を切り替えていたが、画面遷移前後のスクロール位置を管理していなかった。

- `router.navigate()`は`pushState`／`replaceState`後に再描画するだけ
- `shell-renderer.mount()`はrootのHTMLを置換するだけ
- ブラウザは同一ページ内の現在scrollYを維持

そのため、ホームを下へスクロールした位置が活動詳細へ引き継がれた。

## 補正内容

### 前方向の画面遷移

次の画面は必ず先頭から表示する。

- ホーム → 活動詳細
- ホーム → カレンダー
- ホーム → 探す
- ホーム → 保管庫
- カレンダー → 活動詳細
- 下部4導線による画面切替

### 戻る操作

遷移前のHistory entryへscrollYを保存し、Android／ブラウザの戻るでは元画面で見ていた位置を復元する。

### 同一画面の絞り込み

カレンダーの家族・ペットフィルタは`replaceState`とし、同一画面内の位置を維持する。

### ブラウザ制御

新シェル起動中だけ`history.scrollRestoration='manual'`を使用する。新シェルをfallbackした場合は元の設定へ戻す。

## 変更ファイル

- `src/router.js`
- `src/shell/bootstrap.js`
- `src/config/version.js`
- `index.html`
- `manifest.json`
- `service-worker.js`
- version表示を持つscreen／shell model
- `tests/v1652-scroll-restore-smoke.js`

## 保護範囲

変更なし：

- `src/app.js`
- FIELD03画面と保存処理
- `outbase_db` version 10
- `outbase_story_db` schema
- GPS、地図、写真、動画、音声、ピン
- wake lock
- バックアップ、復元
- 活動・予定・記録データ

## 検証結果

- 初回シェル表示：先頭 0px
- ホーム860px → 活動詳細：0px
- Android戻る：ホーム860pxへ復元
- カレンダーフィルタ：310pxを維持
- 全JavaScript構文：合格
- Phase 2A〜5回帰テスト：合格
- v165.1実機証跡補正回帰：合格
- v165.2 scroll restore test：合格
- 新規MutationObserver：0
- DB変更：0

## 現在位置

v165.2はローカル実装・検証完了。GitHub反映後、Androidで活動詳細が先頭表示され、戻るでホーム位置へ戻ることを再確認する。
