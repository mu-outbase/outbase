OUTBASE カレンダーv2 r4 正式ルート統合

このZIPを展開せず、いつものGitHub ZIPアップロードで反映してください。

変更対象:
- index.html
- service-worker.js
- style-calendar-v2.css
- src/config/module-manifest.js
- src/calendar-v2/outbase-calendar-v2.js
- src/shell/calendar-route-renderer.js

ホーム「今後の予定」右上のカレンダーは既存の router.navigate('calendar') を使います。
今回はその正式calendarルートの描画本体へ新カレンダーを組み込み、DOM文字判定・MutationObserver・後付けscriptタグ方式を廃止しています。
FIELD03の outbase_db は変更しません。
