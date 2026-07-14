# OUTBASE E-01 全画面導線監査 台帳 v0.1

## 現在位置
- 工程正本: OUTBASE_MVP_ROADMAP_MASTER_v2.0
- 現在到達点: PRODUCTION3
- 対象Phase: E-01 全画面導線監査
- 完了条件: リンク切れ0 / 遷移漏れ0
- GitHub main確認コミット: e8d366c0d0fe4b3145e8fb29337155d5eec03083

## 今回の監査範囲
- 基本5タブ: 予定 / 探す / 準備 / 記録 / 思い出
- Phase11 準備メモ
- Phase14 終了レビュー
- Chappy相談
- Chappy採用後保存先
- Android戻る操作

## 検出した問題

### E01-001 Android戻るで新規オーバーレイを閉じられない
重要度: 高

既存app.jsの戻る処理が認識していた閉じるボタン:
- data-search-close
- data-memory-detail-close
- data-library-editor-close
- data-close-prep-sheet
- data-close-plan-sheet
- data-close-sheet

追加後に未登録だった閉じるボタン:
- data-phase14-close
- data-prep-editor-close
- data-prep-memo-close
- data-destination-close
- data-chappy-close

影響:
- 戻る操作でシートを閉じず、履歴移動またはアプリ外遷移になる可能性
- Android実機の「戻る」完成条件を満たさない

対応:
- src/outbase-navigation-guard.js を追加
- 追加モジュールを index.html / Service Worker に登録
- 既存機能を変更せず、オーバーレイの戻る処理だけ補完

状態: 修正実装済み / Android実機未確認

## 確認済み導線
- 準備メモ → 記録
- 記録して完了 → 元メモ完了
- 思い出 → Phase14レビュー
- Phase14候補 → 準備メモ
- Chappy採用 → 保存先表示
- Phase14.1 主役プラン別分離

## 次の監査対象
1. 予定候補 → 正式予定編集 → 保存 → 全予定カレンダー
2. プラン切替後の全画面同期
3. 記録開始 / 一時停止 / 再開 / 終了 / 復元
4. 思い出一覧 → 詳細 → 戻る
5. 探す → 検索結果 → 各詳細
6. 非直線エントリー（プランなし開始を含む）

## Android確認項目
1. Chappy相談を開き、端末の戻るで閉じる
2. Chappy保存先を開き、端末の戻るで閉じる
3. 準備メモを開き、端末の戻るで閉じる
4. 準備メモ編集を開き、端末の戻るで閉じる
5. 終了レビューを開き、端末の戻るで閉じる
6. いずれも下の画面やブラウザ外へ移動しない
