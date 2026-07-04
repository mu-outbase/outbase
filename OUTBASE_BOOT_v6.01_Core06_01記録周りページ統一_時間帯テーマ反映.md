# OUTBASE BOOT v6.01

## Version
MVPB_CORE06_01_RECORD_PAGES_THEME

## Phase
Core06.01 / Record pages + Other pages visual alignment + Runtime theme

## 位置づけ
- Core05.16 / v254 をカレンダー周りのイメージOK基準として固定。
- ここからは記録まわり・他ページの見た目と操作感をHOMEカレンダーの世界観に合わせる。

## 反映内容
- 記録ページ（＋記録）の開始画面・記録中カード・タイマー・クイック記録・履歴カードの見た目をHOME寄りに統一。
- 探す / 準備 / 当日 / 思い出 のカード、ヒーロー、ボタン、入力欄の質感を統一。
- 記録中カード・記録中バーを時間帯テーマに馴染む配色へ調整。
- 時間帯テーマが分かりにくかった原因を修正。Core05.16の固定背景をCore06.01側で上書きし、朝/昼/夕/夜で背景・カード・アクセント・ステータス表示が変わるようにした。
- テーマ更新間隔を10分から1分に変更。
- meta theme-color も時間帯に合わせて更新。

## 時間帯テーマ
- 朝：5:00〜9:59 / 朝・準備
- 昼：10:00〜15:59 / 昼
- 夕：16:00〜18:59 / 夕・設営
- 夜：19:00〜4:59 / 夜・焚火

## 反映ファイル
- index.html
- service-worker.js
- src/config/version.js
- src/main.js
- src/core/router.js
- src/modules/home/home.js
- src/ui/components.js
- styles/core06-01.css

## GitHub反映
- zip: OUTBASE_MVPB_Core06_01_RecordPagesTheme.zip
- workflow: .github/workflows/unpack-core06-01.yml
