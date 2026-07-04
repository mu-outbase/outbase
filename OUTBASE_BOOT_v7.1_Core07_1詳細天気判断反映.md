# OUTBASE BOOT v7.1 / Core07.1 詳細天気ありきの準備判断

## 位置づけ
Core07.1では、準備タブを「料理中心」から「詳細天気ありきのキャンセル判断・準備判断」に変更する。

## 最終LOCK
準備タブの優先順位は以下。

1. 詳細天気・判断
2. 次にやること
3. 料理・買物
4. ルート・出発
5. ギア
6. コタ用品
7. 全部見る

## 主要変更
- 最上段に「詳細天気・判断」カードを追加
- 無料キャンセル期限を天気判断カード内に表示
- 行く / 保留 / キャンセル検討 をワンタップで切替
- 天気リスクスコアを表示
- 1時間ごとの雨・風・気温・撤収日雨・雷・湿度・標高/寒暖差・乾燥サービスを入力可能
- 天気から以下へ判断を流す
  - 料理：雨なら簡単飯、暑ければ火を使いすぎない
  - ルート：雨前設営、経由スーパー、コタ休憩
  - ギア：タープ判断、WAVE3/EcoFlow、雨撤収セット
  - コタ：暑さ、雨、足拭き、水分
- 「次にやること」は天気・キャンセル期限・料理・ルート・ギア・コタから上位3つを自動表示
- ギア登録は「ギアカード → ギア台帳」から入力
- 準備タブでは「今回持つか」を判断し、ギア台帳には保管場所・用途・季節などを残す

## 更新対象
- index.html
- src/main.js
- src/core/store.js
- src/modules/prep/prep.js
- src/modules/prep/prepEngine.js
- styles/core07.css

## 検証
- node --check src/main.js
- node --check src/core/store.js
- node --check src/modules/prep/prep.js
- node --check src/modules/prep/prepEngine.js

すべてOK。
