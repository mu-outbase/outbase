OUTBASE カレンダー v4.4 本体共通シェル統合

目的
- カレンダー側でHOME風ヘッダー／下部ナビを複製する方式を終了
- HOME本体の共通シェル内にカレンダー本文だけを表示
- HOME→カレンダー→HOMEで上下バーが変化しない構造へ変更

実装
- ?shell=1&view=calendar を独立HTMLへリダイレクトしない
- 本体 .ob3-main 内へ calendar-formal-v44.html を埋め込み
- 埋め込み時はカレンダー専用上部・下部バーを非表示
- 本体共通ヘッダー・本体共通下部ナビを維持
- iframe高さをpostMessageで自動調整
- 月、選択日、表示形式、種類絞り込み、参加者絞り込み、選択日欄開閉を保存
- month / people を本体ルーターへ同期
- 日付左上、タップ選択、ダブルタップ追加、種類色・削除、下スワイプ閉じるを維持

保護
- FIELD03
- IndexedDB outbase_db
- GPS／地図
- 写真／動画／音声
- 保存／バックアップ／復元
- 天気r34
には変更なし

構文確認
- calendar-formal-v44.js: OK
- calendar-route-v4.js: OK
