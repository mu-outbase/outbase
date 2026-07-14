# OUTBASE FIELD03 共通シェル再設計 v2

## v1を不採用にした理由
v1は一画面設計ではなく、bodyとpageへoverflow:hiddenと高さ制限を付けて下部を切っていました。
Activityバーも各page内へ挿入していたため、ページ構造ごとに位置と余白が変わっていました。

## v2の修正
- bodyとpageのoverflow:hiddenを完全撤廃
- 全画面を自然スクロールへ戻す
- Activityバーをpage内ではなく、active page直前の共通シェルへ配置
- 全ページで同じ幅・高さ・余白・ボタン寸法
- 「すべて見る」フローティングボタンを廃止
- 地図は最大占有を抑えるが内容は切らない
- 準備・探す・思い出は重複する装飾だけを整理
- ボタンと状態表示の見た目を分離
- Activity名から不要な日付表記を除去

## 共通骨格
1. OUTBASEヘッダー
2. Activity直接切替バー
3. 各ページの主役コンテンツ
4. 下ナビ

## 更新ファイル
- index.html
- service-worker.js
- style-compact-ui.css
- src/outbase-compact-ui.js
