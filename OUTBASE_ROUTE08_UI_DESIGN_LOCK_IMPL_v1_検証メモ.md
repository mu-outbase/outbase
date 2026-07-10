# OUTBASE_ROUTE08_UI_DESIGN_LOCK_IMPL_v1 検証メモ

## ベース
- 採用ベース：RESTORE04.8 ルートOK版
- 破棄：04.18 / 04.19 / DONE版のUI構成
- 反映：OUTBASE_UI_DESIGN_LOCK_v1 / OUTBASE_UI_IMPLEMENTATION_SPEC_v1

## 実装内容
- クリーム背景＋濃緑カード＋金アクセントへ統一
- 予定タブ：カレンダー主役、+新規予定ボタン削除、日付2回タップ前提
- 予定タブ：連続予定バー、週またぎ/月またぎ表示
- 探すタブ：候補探し、下見、保存候補
- 準備タブ：通常散歩は準備不要、ルート準備を主役にしない
- 記録タブ：実地図風の散歩MAP主役、GPS/ピン/写真/メモ導線
- 思い出タブ：記録整理、次回改善、場所メモ、関連付け
- 上バー：重複チップ抑制
- 04.8ルート画面：routePrepView は保持

## 検査
- node --check src/app.js：PASS
- node --check service-worker.js：PASS
- zip -T：PASS

## 注意
- Playwrightブラウザ実体が環境に未インストールのため、実ブラウザ自動スクリーンショット検査は未実施。
- ただし構文検査、ZIP整合性、実装対象の静的反映は確認済み。
