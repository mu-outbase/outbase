# OUTBASE BOOT v7.2 / Core07.2 準備ダッシュボード化

## 目的
準備タブを長い縦スクロールページから、1画面で判断できる司令塔に変更する。

## 固定方針
- 準備トップに詳細カードを縦に並べない
- 最上段は「詳細天気ありきのキャンセル判断」
- 料理/ルート/ギア/コタは状態ボタンにする
- 押した項目だけ下に1つ表示する
- 条件入力・ギア台帳は必要時だけ開く

## 表示順
1. 準備中の予定
2. 詳細天気・判断
3. 準備状況 4ボタン
4. 選択した項目だけの詳細
5. 条件入力/予約再取込

## 反映ファイル
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
