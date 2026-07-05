# OUTBASE BOOT v8.2 / 当日連携GPS LOCK 正本反映

Core08-D3 当日連携記録を正本反映。

## 正式LOCK
当日画面は、工程管理でも単なるメモ箱でもない。
準備・天気・ルート・料理・ギア・コタ・GPS・後日レビューをつなぐ現地連携記録とする。

押し忘れ・後追い・事前メモ・何となく登録を前提にする。
GPS・時刻・文章・準備内容から連想候補を出すが、分類・上書き・統合・削除はユーザー確認なしに行わない。

## GPS連想
GPSは確定分類ではなく、推定材料。
速度・滞在・移動の状態から、移動中、場内散歩、サイト滞在、買い出し、撤収前後などを候補化する。

## 反映対象
- src/modules/day/day.js
- src/core/store.js
- src/core/dataGuard.js
- styles/core08d3.css
- src/main.js
- index.html

## BUILD
core08-d3-day-link-gps-20260705
