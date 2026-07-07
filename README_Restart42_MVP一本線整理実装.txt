# OUTBASE Restart-42 MVP一本線整理版 実装ZIP

## 正本
- MASTER_v140_Restart42_MVP一本線整理LOCK.xlsx
- OUTBASE_LOCK_v140_Restart42_MVP一本線整理LOCK.md

## 方針
小出し修正・応急パッチ連発を停止。
ホーム → 記録 → 未確認箱 → 思い出 → 改善 → 次回準備 の一本線をMVPとして整理。

## 変更ファイル
- index.html
- style.css
- src/app.js
- manifest.json
- service-worker.js

## 反映方法
1. 以下にアクセス
   https://github.com/mu-outbase/outbase/upload/main
2. このZIPをアップロード
3. Commit changes
4. Actions完了後にOUTBASEを開く

## 確認URL
https://mu-outbase.github.io/outbase/?v=restart-42-mvp-line-lock

## 実機確認
1. ホームで「今日は何を残す？」が出る
2. ホームだけ横スライドでプラン確認できる
3. 記録画面で保存先チップが出る
4. 写真/動画/音声/メモを未確認箱へ保存できる
5. 未確認箱から思い出へ確定できる
6. 未確認箱または思い出から改善へ送れる
7. 改善を次回準備へ戻せる
