# OUTBASE Restart-43 記録ファーストUI整理 一括実装LOCK

## 目的
Restart-42のカード説明型UIを破棄。
OUTBASEを「管理アプリ」ではなく「キャンプ体験を一瞬で残す記録道具」に戻す。

## 重要方針
- 機能は削らない
- 表に出す情報量を削る
- ホームの主役は「今これを残す」
- 散歩、犬友達、料理、ギア、天気、ルートは裏カテゴリとして扱う
- 分類はあとで未確認箱

## 変更ファイル
- index.html
- style.css
- src/app.js
- manifest.json
- service-worker.js

## アップロード先
https://github.com/mu-outbase/outbase/upload/main

## 確認URL
https://mu-outbase.github.io/outbase/?v=restart-43-record-first-lock

## 実機確認
1. ホームがカードだらけではない
2. 大きい「今これを残す」が主役
3. 写真/声/メモ/コタ/場所がすぐ押せる
4. 未確認箱に保存される
5. 未確認から確定・改善・分類ができる
6. 準備は入口だけで、表に出す情報が多すぎない
