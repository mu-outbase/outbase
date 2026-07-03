# OUTBASE BOOT v5.13

## Version
MVPB_CORE05_13_CALENDAR_ENTRY_REDESIGN

## Phase
Core05.13 / Calendar Entrance UX + Jorte/Google Calendar Behavior Review

## 反映内容
- HOME全体を「カレンダーが入口」の構造に再整理。
- カレンダー上部の「新規」「通知ON」を撤去し、今日ボタンは月表示の中に小さく統合。
- カレンダーの日付1タップでは画面を飛ばさず、選択日のToDo&メモ表示だけを更新。
- 同じ日付タップで予定追加が勝手に開く動作を廃止。
- 予定追加はToDo&メモ内の「＋予定追加」から行う。
- ToDo&メモ内では予定内容を表示し、「修正」ボタンを押した時だけ詳細・修正画面へ移動。
- HOMEのキャンプ予定一覧は独立カードではなくNEXTカード内へ統合。
- 通知許可はカレンダー上部ボタンではなく、通知あり予定の登録・修正時に確認する運用へ変更。
- Core05.12の繰り返し予定修正、通知追加、種別追加、数ヶ月おき対応は維持。

## 反映ファイル
- index.html
- service-worker.js
- src/config/version.js
- src/main.js
- src/core/router.js
- src/modules/home/home.js
- styles/core05-13.css

## GitHub反映
- zip: OUTBASE_MVPB_Core05_13_CalendarEntrance.zip
- workflow: .github/workflows/unpack-core05-13.yml
