# OUTBASE BOOT v5.12

## Version
MVPB_CORE05_12_CALENDAR_EDIT_RECURRING

## Build
core05-12-calendar-edit-recurring-20260703

## Phase
Core05.12 / Calendar Edit + Recurring Scope + Home Camp Plans

## ベース
- v249 / Core05.11 を安定版として継続。
- Core05.11 のジョルテ型カレンダー、下バー整理、ToDo&メモ詳細、削除確認は維持。

## 今回の反映内容
- ToDo&メモの予定ラベルタップ後、詳細だけでなく修正フォームも表示。
- 詳細表示の表紙・文字サイズを少し小さく調整。
- 繰り返し予定の修正で「この回だけ修正」「全予定修正」を選択可能にする。
- 通知に「3日前」「2週間前」「1ヶ月前」を追加。
- 予定種別に「ペット」「家族」「支払い」「イベント」を追加。
- 繰り返しに「数ヶ月おき」を追加。
- 上部ヘッダーの OUTBASE 下タイトルをタブ別表示に修正。
  - 予定 / 探す / 準備 / 記録 / 当日 / 思い出
- 日付タップ後、ToDo&メモ欄が見えやすいように表示位置と高さを調整。
- キャンプ予定はホーム最下部に一覧表示。

## 反映ファイル
- index.html
- service-worker.js
- src/config/version.js
- src/main.js
- src/core/router.js
- src/modules/home/home.js
- styles/core05-12.css

## 実装メモ
- app.css本体は破壊せず、Core05.12差分CSSを追加読み込み。
- 繰り返し予定の「この回だけ修正」は、元予定に例外日を追加し、修正後の予定を単発予定として保存する方式。
- 既存の calendarEvents / nextProject はそのまま使用。

## GitHub反映想定
- zip: OUTBASE_MVPB_Core05_12_CalendarEditRecurring.zip
- workflowを使う場合は、同梱ファイルをリポジトリルートへ展開。
