OUTBASE カレンダーv2 一括反映ZIP

対象:
- 現行 HOME v36 / FIELD03正ベース
- GitHubリポジトリ mu-outbase/outbase

含まれるもの:
1. HOME v36の見た目に合わせたカレンダー画面
2. 月・週・日・一覧表示
3. 日付選択、同日再タップで予定追加
4. 予定の新規・編集・複製・削除
5. 終日、開始・終了、複数日、場所、メモ、基本繰り返し
6. 複数カレンダー表示切替
7. OUTBASE既存予定の読み取り移行
8. ICS（ジョルテ等）・JSON・CSVのインポート
9. ICS・CSV・OUTBASE完全バックアップのエクスポート
10. 重複候補の除外
11. 将来のAndroidウィジェット用スナップショット生成
12. FIELD03のoutbase_dbを変更しない独立DB方式

アップロード:
このZIPを、いつものGitHub ZIPアップロード方法でリポジトリ直下へ反映してください。
ZIP内の階層を崩さず、既存ファイルは上書きします。

反映対象:
- index.html
- service-worker.js
- style-calendar-v2.css
- src/calendar-v2/outbase-calendar-v2.js

注意:
- FIELD03本体、GPS、地図、メディア保存には変更を加えていません。
- 新カレンダーは独立した outbase_calendar_db を使用します。
- ジョルテ実データは、ジョルテ側からICSを書き出した後に「取込」から読み込みます。
