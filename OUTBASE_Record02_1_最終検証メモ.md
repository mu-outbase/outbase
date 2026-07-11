# OUTBASE Record-02.1 最終検証メモ

## 静的検証
- `node --check src/app.js`：合格
- HTML参照ファイル存在確認：合格
- キャッシュバージョン統一：`outbase-clean-v6-record02-1-state-sync`
- ZIP整合性検査：合格

## 実ブラウザ状態遷移検証
Chromium上で現在地とGPS更新を模擬し、同一ソースを操作した。

### 開始前
- 状態：開始前
- 主ボタン：散歩開始
- 距離：0.00 km
- 経過時間：0:00:00
- GPS：現在地取得済み ±8m

### 記録中
- 状態：記録中
- 主ボタン：一時停止
- 1秒後の経過時間：0:00:01
- GPS：GPS記録中 ±8m
- 模擬移動後の距離：0.03 km

### 一時停止中
- 状態：一時停止中
- 主ボタン：再開
- 距離：0.03 kmで固定
- 経過時間：1.2秒待機後も0:00:01で固定
- GPS：一時停止中・現在地取得済み ±7m

## 追加確認
- 開始前の現在地取得は軌跡へ加算しない：確認
- 15秒を超えた古い現在地を開始点へ採用しない：コード確認
- 記録中の再読込でGPS追跡・画面ONを復元：コード確認
- 駐車位置を開始・終了で保持：確認

## 同梱画像
- `record02_1_screens/idle.png`
- `record02_1_screens/active.png`
- `record02_1_screens/paused.png`
- `record02_1_screens/state_sync_overview.png`
