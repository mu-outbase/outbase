# OUTBASE Plan-01 最終検証メモ

## 静的検証
- `node --check src/app.js`：合格
- `index.html` / `manifest.json` / `service-worker.js` のバージョン統一：合格
- HTML内のローカル参照ファイル存在確認：合格
- CLEAN v6とRecord-02.2のコード維持：確認済み
- 予定タブ以外の既存機能を削除していない：確認済み

## ブラウザ操作検証
432×768相当の実ブラウザで以下を確認。
- 予定メイン画面
- 日付1回タップによる選択日変更
- ＋予定から追加シート表示
- 名前・種類入力による追加
- 追加直後の詳細表示
- この予定で記録による記録先変更
- 予定タブへの復帰
- すべての予定・出来事一覧
- 空き日2回タップによる日付入り追加
- 再読込後の予定保持

結果：すべてPASS

## 同梱画面
- `plan01_screens/main.png`
- `plan01_screens/add.png`
- `plan01_screens/detail.png`
- `plan01_screens/list.png`
- `plan01_screens/overview.jpg`

## Android実機で確認する項目
- 月移動と今日へ戻る操作
- 日付選択と2回タップ追加
- 複数日予定の表示
- 予定追加後の再読込保持
- 主役設定、準備開始、記録先設定
- Record-02.2のGPS・終了復旧・破棄機能が維持されていること
