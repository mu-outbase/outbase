# OUTBASE Restart-37-40 小型プランチップ統合実装

## ムー用：やること
このZIPを、今までと同じGitHubアップロード先へアップロードするだけ。

アップロード先：
https://github.com/mu-outbase/outbase/upload/main

## 重要
このZIP名は既存workflowに合わせて、あえて `OUTBASE_Restart-35` で始めています。
既存workflow `.github/workflows/unpack-restart-35.yml` が `OUTBASE_Restart-35*.zip` だけを拾うためです。

## 変更されるファイル
- index.html のみ

## 反映内容
- 大きい現在プランバーを小型チップ化
- 常時追従ポップアップ禁止
- 必要な時だけ切替候補を表示
- 記録画面では「保存先」として軽く強調
- 既存 app.js / style.css は直接壊さない
