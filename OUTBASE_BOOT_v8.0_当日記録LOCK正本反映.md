# OUTBASE BOOT v8.0 当日記録LOCK正本反映

## 更新日
2026-07-05

## 正本
MASTER_v147_当日記録LOCK正本反映.xlsx

## 追加シート
- 141_Core08D当日記録LOCK_v8.0
- 142_Core08D実装仕様_v8.0
- 143_正本更新_v8.0

## LOCK内容
- Core08-Dは当日タブを現地コックピット化する。
- 工程は出発/到着/設営/料理/場内確認/コタ/撤収。
- 写真/動画/音声メモ/手入力メモ/天気変化/コタ/次回注意を当日記録として追記保存する。
- 保存先は `dayRecords[projectKey]` とし、別予定へ混入させない。
- 工程状態は `dayPhaseState[projectKey]` とする。
- 当日記録は追記保存を原則とし、勝手な修正・統合・上書き・削除は禁止。
- 次回へ戻す候補は表示のみ。準備/料理/ギア/コタへ自動反映しない。

## 実装ZIP
OUTBASE_Core08_D_DAY_RECORD_完成版.zip

## 確認URL
https://mu-outbase.github.io/outbase/?v=core08d
