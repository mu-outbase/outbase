OUTBASE 旧カレンダーキャッシュ完全停止＋著作権表示空白修正

根本原因
- service-worker.js が calendar-formal-v32 をキャッシュ対象として残していた
- calendar-route-v3.js もキャッシュ一覧に残っていた
- 新v4.4反映後もService Workerが旧画面を返していた

修正
- calendar-formal-v32 HTML/CSS/JSをキャッシュ一覧から完全削除
- calendar-route-v3.jsをキャッシュ一覧から完全削除
- calendar-formal-v44 HTML/CSS/JSへ統一
- calendar-route-v4.jsへ統一
- キャッシュ名と登録バージョンを更新
- © 2026 OUTBASEをシェル末尾ではなく、現在画面の本文直後へ移動
- 短い一覧画面で発生していた大きな空白を解消

保護
- FIELD03
- GPS／地図
- 写真／音声
- IndexedDB
- 天気r34
は変更なし

構文確認
{'about': 'OK', 'calendar': 'OK', 'route': 'OK', 'sw': 'OK'}

旧参照残存
なし
