OUTBASE 本体描画元特定修正

確認できた根本原因
- 実機カレンダーはservice worker旧キャッシュではなかった
- src/shell/shell-renderer.js の calendar() が本体カレンダーを直接描画していた
- ルート変更時にshell rendererが再描画し、v4.4 iframeを旧カレンダーで上書きしていた

今回の対処
- shell rendererの再描画をMutationObserverで監視
- calendar routeで旧描画が出た直後にv4.4本文へ確実に置換
- 初回、ルート通知直後、80ms後の3段階で統合を確認
- 無限再描画を防ぐreplacingガードを追加

下部ナビ
- ホーム
- カレンダー
- 追加
- 探す
- 保管庫
の5項目へ変更

設計判断
- カレンダーと探すは別機能
- カレンダー：予定確認・日程操作
- 探す：記録・場所・ギア・料理など横断検索
- 将来拡張でも混在させない

保護
FIELD03、GPS、地図、写真、音声、IndexedDB、天気r34は変更なし

構文確認
{'route': 'OK', 'calendar': 'OK', 'sw': 'OK'}
