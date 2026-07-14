# OUTBASE Phase 4 v164 ホーム完成

## 実装
- ホームを「今・次・すぐ使う・最近」の4領域で完成
- activity_idを維持した活動詳細・記録・準備入口
- 参加者をmembers／petsから解決し、家族とペットを区別して表示
- 次の活動に準備進捗を表示
- 最近の活動に記録数・メディア数を表示
- カレンダー入口をホーム上部と「次」に配置
- 原本Blobをホームで読み込まず、メタデータと件数だけを利用

## 安全境界
- `?shell=1&view=home`限定起動を維持
- active／paused現地セッション中はFIELD03へfallback
- `src/app.js`、旧DB version 10、記録保存系は変更しない
- MutationObserver追加なし
- 全画面を切るoverflow:hidden追加なし
- data／screen cutoverなし
