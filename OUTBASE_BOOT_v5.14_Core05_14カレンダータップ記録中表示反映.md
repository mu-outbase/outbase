# OUTBASE BOOT v5.14

## Version
MVPB_CORE05_14_CALENDAR_TAP_RECORDING

## Phase
Core05.14 / Calendar Tap UX + Active Recording Indicator

## 反映内容
- NEXT内に表示していたキャンプ予定一覧を削除。
- NEXTは「次にやること」だけを表示するシンプルなカードへ戻す。
- カレンダーの日付1タップ目は、ToDo&メモの表示更新のみ。
- 同じ日付を2タップ目した場合は、選択日の予定追加フォームを開く。
- ToDo&メモ内の予定は表示中心のまま維持。
- 予定の詳細・修正は「修正」ボタンから開く。
- 記録がactiveの時、HOMEではカレンダー下に記録中カードを表示。
- HOME以外の画面では、下部に記録中バーを表示し「記録に戻る」導線を追加。
- 記録がactiveの時、下バーの「＋記録」に赤ドットを表示。

## 維持内容
- HOMEはカレンダー入口。
- 今日ボタンは月表示内の小ボタンに統合。
- カレンダー上部の新規/通知ONボタンは撤去済みを維持。
- 通知：当日 / 前日 / 3日前 / 1週間前 / 2週間前 / 1ヶ月前。
- 種別：キャンプ / 予定 / 誕生日 / 車検・車 / 仕事 / ToDo / ペット / 家族 / 支払い / イベント / その他。
- 繰り返し：なし / 毎週 / 毎月 / 数ヶ月おき / 毎年 / 数年おき。
- 繰り返し予定の修正：この回だけ修正 / 全予定修正。

## 反映ファイル
- index.html
- service-worker.js
- src/config/version.js
- src/main.js
- src/core/router.js
- src/modules/home/home.js
- styles/core05-14.css

## GitHub反映
- zip: OUTBASE_MVPB_Core05_14_CalendarTapRecording.zip
- workflow: .github/workflows/unpack-core05-14.yml

## 反映手順
1. ZIPをGitHubへアップロード。
2. workflowを作成または更新。
3. Actionsで自動解凍を実行。
4. スマホでHOMEの操作を確認。

## 確認ポイント
- 日付1タップでToDo&メモの表示だけ切り替わること。
- 同じ日付2タップで予定追加フォームが開くこと。
- NEXT内のキャンプ予定一覧が消えていること。
- 記録開始中にHOMEへ戻ると記録中カードが出ること。
- 記録開始中に他タブへ移動すると下部記録中バーが出ること。
