# OUTBASE BOOT v7.2 UI-FIX / 準備司令塔化

## 目的
Core07.2の大枠フローは維持し、準備タブを「長い一覧」から「1画面で判断する司令塔」に寄せる。

## 採用する流れ
1. 詳細天気を見る
2. 無料キャンセル期限までに行く/保留/キャンセル検討を判断
3. 料理・ルート・ギア・コタの状態を4ボタンで確認
4. 押した1項目だけ詳細表示

## UI変更
- 初期表示から長い詳細カードを削除
- 「条件を足す」「予約を入れ直す」などの補助カードを下に常設しない
- 天気判断カードをコンパクト化
- 次にやること3つを天気判断カード内へ統合
- 料理/ルート/ギア/コタを4分割の状態ボタン化
- 選択した項目だけ詳細パネル表示
- 詳細パネルには閉じるボタンを設置
- ギア台帳は説明ではなく入力パネルで登録

## 更新対象
- index.html
- src/main.js
- src/core/store.js
- src/modules/prep/prep.js
- src/modules/prep/prepEngine.js
- styles/core07.css

## BUILD_ID
core07-2-1-prep-usability-20260705

## 検証
- node --check src/main.js
- node --check src/core/store.js
- node --check src/modules/prep/prep.js
- node --check src/modules/prep/prepEngine.js

すべてOK。
