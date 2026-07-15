# OUTBASE v166.2 全画面密度再設計 実装・監査報告

作成日：2026-07-15（Asia/Tokyo）  
GitHub基準：mu-outbase/outbase main / 8d996795c35fb094a74440af2e43a960d4e37cc6  
Android証跡：8036.png

## 実機評価

v166.1で更新時の旧画面ちらつきとページ遷移の重さは改善した。一方、正式デザインは次の理由で完成品に見えなかった。

- 大見出しと広い空白が多く、表示密度が低い
- 小さな情報に対してカード・セクションが大きい
- 装飾英字が試作ラベルに見える
- 下部ナビと追加ボタンの面積が大きい
- TRAIL LENSの記録詳細シートが画面を占有し、閉じるボタンが主役になっている

## 設計判断

「高級感＝大きな文字＋広い余白」を撤回した。v166.2では、次の要素で上質さを作る。

- 日本語中心の短い情報階層
- 揃った基準線
- 役割の明確な文字サイズ
- 細い罫線
- 必要な場所だけの余白
- 主操作1つと補助操作の差
- 48pxタップ領域を維持した視覚的コンパクト化

## 実装

### NORTH

- グローバルヘッダーを70pxから58px基準へ調整
- 本文paddingを24pxから14px基準へ調整
- ホーム日付を最大48pxから最大36pxへ調整
- セクション見出しを25pxから21pxへ調整
- セクション間隔を34pxから24pxへ調整
- 「今」行、次カード、4クイック操作、最近一覧を圧縮
- 探す／保管庫のページタイトルを最大52pxから最大38pxへ調整
- 活動詳細タイトルを最大58pxから最大38pxへ調整
- 進行レール、事実グリッド、詳細行、下部操作を圧縮
- カレンダーのヘッダー、フィルター、日セルを圧縮
- 下部ナビを74pxから64px基準へ調整
- 中央追加ボタンを他ナビと同じ高さへ揃えた
- QUICK ACTION／DISCOVER／ARCHIVE／ACTIVITY STORY等の装飾英字を削除または日本語化

### TRAIL LENS

- 記録ヘッダー、地図カード、地図操作パネルを圧縮
- 地図高さを最大43dvh／350px基準へ調整
- 背景blurを廃止
- 記録詳細シートを最大74dvhへ制限
- シートタイトルを20〜25pxへ調整
- 情報行・補助ボタン・閉じる操作を48px基準へ統一
- 巨大な閉じるボタンの視覚的主張を削減

## 変更ファイル

- index.html
- manifest.json
- service-worker.js
- style-design-system.css
- src/config/version.js
- src/design/theme-controller.js
- src/shell/bootstrap.js
- src/shell/shell-model.js
- src/shell/shell-renderer.js
- tests/phase2a-loader-main-smoke.js
- tests/phase2a-smoke.js
- tests/v166-formal-design-lock-smoke.js
- tests/v1661-performance-smoke.js
- tests/v1662-density-lock-smoke.js
- docs/V1662_DENSITY_LOCK.md

## 安全境界

- src/app.js変更なし
- FIELD03 app.js SHA：13a44b35562d5fd325368acd94ca49b0005502a8
- GPS・地図・軌跡・欠測・写真・動画・音声・ピン・wake lock変更なし
- outbase_db version 10変更なし
- outbase_story_db schema変更なし
- migration・activity data・保存データ変更なし
- cutover未実施
- MutationObserver追加0
- 全画面overflow:hidden追加0

## 自動検証

- JavaScript全構文：合格
- Phase2A／2B／3／4／5：合格
- v165.1 Android補正：合格
- v165.2 scroll restore：合格
- v166正式デザイン：合格
- v166.1性能補正：合格
- v166.2密度再設計：合格
- CSS PostCSS parser：error 0
- 主要操作48px維持
- 装飾英字削除：合格
- FIELD03エンジン変更：0

## Androidで次に確認すること

1. ホームの日付・セクション・次カード・下部ナビの密度
2. 探す・保管庫のページ見出しと一覧密度
3. 追加シートの高さと操作優先度
4. 活動詳細・カレンダーの密度
5. TRAIL LENS記録画面と記録詳細シート
6. 開始・休止・再開・終了、GPS・写真・音声の回帰

## 判定

ローカル実装・自動監査は完了。GitHub未反映、Android未確認のため最終LOCK前。
