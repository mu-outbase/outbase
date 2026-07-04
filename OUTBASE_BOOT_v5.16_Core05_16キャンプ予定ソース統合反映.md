# OUTBASE BOOT v5.16

## Version
MVPB_CORE05_16_CAMP_PLAN_UNIFIED

## Phase
Core05.16 / Camp plan source unified

## 背景
Core05.15では、赤城山は予約取込の `nextProject`、鹿沼はカレンダー登録の `calendarEvents` として保持されていた。
表示上はどちらもキャンプ予定だが、登録元の違いがNEXTやToDo&メモに出てしまい、赤城山だけ特別扱いに見える問題があった。

## 修正方針
ユーザーから見えるキャンプ予定は、登録元に関係なく同じ「キャンプ予定」として扱う。

## 反映内容
- NEXTはキャンプ予定一覧のみを表示。
- 先頭キャンプ予定だけを大きく表示する特別枠を撤去。
- 赤城山など `nextProject` 由来の予定にも、修正・完了・削除導線を表示。
- `nextProject` 由来の予定を修正した場合は、予約情報側へ反映。
- `nextProject` 由来の予定を削除した場合は、次回キャンプ予定を解除。
- NEXTリストから「次」ラベルと「次回予定」表記を撤去。
- 鹿沼と赤城山を同じキャンプ予定カードとして表示。

## 反映ファイル
- index.html
- service-worker.js
- src/config/version.js
- src/main.js
- src/core/router.js
- src/modules/home/home.js
- styles/core05-16.css

## GitHub反映
- zip: OUTBASE_MVPB_Core05_16_CampPlanUnified.zip
- workflow: .github/workflows/unpack-core05-16.yml
