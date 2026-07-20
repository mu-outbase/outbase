OUTBASE v166.31 R1-03 HOME実予定復旧 v18.2

目的
- HOME「今後の予定」にサンプル予定を混在させない。
- 実予定だけを表示する。
- 実予定が0件なら、サンプルではなく正直な空状態を表示する。

原因
- home-screen-model.js の displayPlans() が、実予定の件数が4件未満のときサンプルを自動補充していた。
- demoPreview=true が常時返されていた。

変更
- home-real-data-only-v18.js を追加し、HOMEモデルを実予定限定で上書き。
- sample=true の予定をHOME表示から除外。
- demoPreview=falseへ固定。
- 天気対象予定も実予定のみから選択。

非変更
- 保存済み予定データ
- カレンダー
- 予定詳細
- 準備
- FIELD03
- GPS・地図・写真・動画・音声・メモ
- IndexedDB・オフライン復元

GitHub mainは未変更。
