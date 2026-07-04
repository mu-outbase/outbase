# OUTBASE BOOT v6.03

## Version
MVPB_CORE06_03_RECORD_UX_POLISH

## Phase
Core06.03 / Record UX Polish + Compact History + Active Stack

## 反映目的
Core06.02で機能は入ったが、画面上では文字が大きく、履歴詳細が下に隠れ、複数起動や親子関係が分かりにくかった。記録周りを「実際に使える記録アプリ」寄りへ再整理する。

## 反映内容
- 記録ページ上部の大きい「RECORD / 今残す / 何を記録する？」系ヒーロー表示を撤去。
- 記録開始画面をコンパクトな「記録モード」カードに変更。
- コタ散歩 / キャンプ / メモの開始カードの文字サイズを調整。
- 記録中画面に「親 / 今」のスタック表示を追加。
- キャンプ親記録と、キャンプ内の子記録が並列に見えないよう整理。
- 履歴カードをコンパクト化し、一覧性を改善。
- 履歴詳細を履歴一覧の下ではなく、履歴一覧の上に表示。
- 詳細表示に時間 / 距離 / 記録数の3指標を追加。
- GPS記録がある履歴詳細には移動ログのミニ表示を追加。
- 全体の文字サイズ、カード余白、角丸、影を調整し、テスト感を軽減。
- Core06.03用CSSを追加し、Core06.02の機能を保ったまま見た目を上書き。

## 反映ファイル
- index.html
- service-worker.js
- src/config/version.js
- src/main.js
- src/modules/walk/walk.js
- styles/core06-03.css

## GitHub反映
- zip: OUTBASE_MVPB_Core06_03_RecordUXPolish.zip
- workflow: .github/workflows/unpack-core06-03.yml

## 注意
- 今回のZIPは、前回のように1段フォルダ内へ入らないよう、ルート直下へ展開される構成で作成。
- workflow側も、直下展開・1段フォルダ展開の両方に対応。
