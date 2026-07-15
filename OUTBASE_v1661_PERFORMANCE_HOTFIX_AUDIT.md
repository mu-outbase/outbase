# OUTBASE v166.1 ちらつきゼロ・軽量遷移 実装監査

作成日：2026-07-15（Asia/Tokyo）
基準：GitHub main 832420680b707a4ad1b30236cbce455b00ae27eb / v166正式デザイン統合
Android証跡：8029.png〜8034.png

## 実機で確認された問題

1. 更新時に旧FIELD03が一瞬表示された後、NORTHへ切り替わる。
2. ホーム／探す／保管庫など、シェル内のページ切替が重い。

## 原因監査

### 初期表示

- `src/main.js`がシェル表示時も最初に旧UIモジュール14本を直列読込していた。
- 最初の旧モジュール`src/app.js`が`#app`へFIELD03を描画した後、新シェルを生成していた。
- XLSX／PDF.js／Tesseractもシェル利用時に非同期読込され、表示後のCPU・通信負荷になっていた。

### 画面切替

- `shell-model.build()`がルートに関係なく、毎回ホームと保管庫のread modelを同時生成していた。
- 活動詳細・カレンダーでは、ホーム／保管庫に加えて対象ルートのread modelも生成していた。
- `shell-renderer.mount()`がページ切替ごとにヘッダー、本文、下部ナビ、モーダルを含むシェル全体を`innerHTML`で作り直していた。
- 通常遷移でもDocument View Transitionが有効で、画面全体の旧・新スナップショットを作成していた。
- スクロール適用が二重requestAnimationFrameで、最低でも追加2フレーム待っていた。
- 固定ヘッダーと下部ナビにbackdrop blurがあり、再描画時の合成負荷を増やしていた。

## v166.1実装

### ちらつき防止

- `<head>`最初期で`?shell=1`とsession stateを判定。
- idleの新シェルでは最初のpaint前から旧`#app`を不可視化。
- NORTHの静的ブランド起動画面を表示し、新シェル完成後に一度だけ置換。
- シェル起動時は旧UIモジュール14本を読み込まない。
- XLSX／PDF.js／Tesseractは旧FIELD03を開いた時だけ読み込む。
- 旧CSSはシェルでは適用せず、FIELD03では従来どおり適用。

### 軽量遷移

- read modelをルート別に分離。
  - ホーム：homeのみ
  - 探す：DB読込なし
  - 保管庫：vaultのみ
  - 活動詳細：detailのみ
  - カレンダー：calendarのみ
- ルートごとに30秒の短期キャッシュを導入。
- ヘッダー、下部ナビ、モーダルを永続化し、本文だけ差し替え。
- 通常のページ切替ではDocument View Transitionを無効化。必要箇所だけ将来opt-in可能。
- スクロール復元は1回のrequestAnimationFrameへ短縮。
- online／offline変更では画面全体を再生成せず、接続表示だけ更新。
- アイドル時に保管庫と当月カレンダーを先読み。
- 固定UIのbackdrop blurを廃止し、不透明面へ変更。
- 長い一覧へ`content-visibility:auto`を適用。

## 安全境界

- `src/app.js`変更なし。
- GitHub上のFIELD03 app.js SHA：`13a44b35562d5fd325368acd94ca49b0005502a8`を維持。
- GPS、地図、軌跡、欠測、写真、動画、音声、ピン、wake lock変更なし。
- `outbase_db` version 10変更なし。
- `outbase_story_db` schema変更なし。
- migration、activity data、保存データ変更なし。
- cutover未実施。`?shell=1`プレビューを維持。
- MutationObserver追加0。
- 全画面`overflow:hidden`追加0。

## 自動検証

- 全JavaScript構文：合格。
- Phase2A／2B／3／4／5：合格。
- v165.1 Android証跡補正：合格。
- v165.2 スクロール復元：合格。
- v166 正式デザイン：合格。
- v166.1 性能補正：合格。
- シェル起動時の旧UI JS読込：0本。
- 探す画面のhome／vault read model生成：0件。
- 同一vaultルート2回目のread model再生成：0件（短期キャッシュ）。
- シェル全体の再生成：初回1回のみ。

## Androidでの次確認

1. 更新時に旧FIELD03が一瞬も見えず、OUTBASEブランド画面からNORTHへ直接切り替わる。
2. ホーム→探す→保管庫→ホームが体感で即時に切り替わる。
3. 活動詳細・カレンダーの先頭表示とAndroid戻る位置復元。
4. FIELD03開始後のTRAIL LENSとGPS等の回帰。

## 判定

ローカル実装・自動監査は完了。GitHub未反映、Android再確認前のため最終LOCKは未完了。
