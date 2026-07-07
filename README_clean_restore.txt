# OUTBASE Restart-37-40 Clean Restore LOCK

## 目的
v144/v145が残った混在状態を止め、37〜40系の現物表示へ戻す。

## 重要
前回の戻しZIPは index.html だけで、style.css / src/app.js がv145のまま残った。
今回は index.html が v145 のローカル style.css / src/app.js を読まないようにし、
37〜40時点の固定コミットを参照する。

固定コミット:
52028263e0078b73365e1012ec510bf97892c41e

## 確認URL
https://mu-outbase.github.io/outbase/?v=restart-37-40-clean-restore-lock

## 確認ポイント
画面に「全予定 / 37-40復旧ベース」と出たら失敗。
37〜40系の元のOUTBASE表示に戻っていれば成功。
