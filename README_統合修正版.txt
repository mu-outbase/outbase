OUTBASE カレンダーv3 本体正式ルート統合 修正版

原因
既存シェルが、calendar-route-v3.jsによるiframe表示後に旧カレンダーを再描画していました。

修正
- iframe方式を廃止
- 正式calendarルートから検証済みv3へ同一タブでlocation.replace
- 戻る履歴に旧calendarルートを残さず、端末戻るでHOMEへ復帰
- JSとService Workerのバージョンをintegration-2へ更新

FIELD03、outbase_db、GPS、地図、メディア、天気r34は変更しません。
