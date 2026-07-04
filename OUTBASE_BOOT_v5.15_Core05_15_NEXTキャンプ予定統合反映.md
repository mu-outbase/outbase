# OUTBASE BOOT v5.15

## Version
MVPB_CORE05_15_NEXT_CAMP_PLANS

## Phase
Core05.15 / NEXT camp plans unified

## 目的
HOMEのNEXTで、由来が違うキャンプ予定を同じ「キャンプ予定」として扱う。
赤城山のような nextProject 由来の予定と、鹿沼のようなカレンダー登録由来の camp 予定を、NEXT内でまとめて一覧表示する。

## 反映内容
- NEXTのキャンプ予定を1件だけではなく全件表示。
- NEXTの先頭は最も近いキャンプ予定にする。
- NEXT下部に「キャンプ予定」一覧を追加。
- nextProject由来のキャンプ予定と、calendarEvents由来のcamp予定を同じ一覧へ集約。
- Core05.14の以下の挙動は維持。
  - 日付1タップ：ToDo&メモ表示のみ切替。
  - 同じ日付2タップ：予定追加フォームを開く。
  - 記録中はHOMEカード/他画面下部バー/下部記録タブ赤ドットで表示。

## 原因メモ
- 赤城山は予約取込から作られる nextProject 由来のキャンプ予定。
- 鹿沼はカレンダーに登録された calendarEvents 由来の camp 予定。
- v252ではNEXTが最初の1件だけを表示していたため、キャンプ予定なのにNEXT上の扱いが分かれて見えていた。
- v253ではNEXT表示用にキャンプ予定を集約し、全件表示する。

## 反映ファイル
- index.html
- service-worker.js
- src/config/version.js
- src/main.js
- src/core/router.js
- src/modules/home/home.js
- styles/core05-15.css
- MASTER_v253_Core05_15_NEXTキャンプ予定統合反映.xlsx

## GitHub反映
- zip: OUTBASE_MVPB_Core05_15_NextCampPlans.zip
- workflow: .github/workflows/unpack-core05-15.yml

## 確認ポイント
- HOMEのNEXTに赤城山と鹿沼の両方が表示されること。
- NEXTの先頭が最も近いキャンプ予定になっていること。
- NEXT内のキャンプ予定一覧から予定をタップできること。
- 日付2タップで予定追加が開くこと。
- 記録中表示が維持されていること。
