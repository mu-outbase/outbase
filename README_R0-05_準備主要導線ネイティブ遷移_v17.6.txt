OUTBASE v166.31 / R0-05 準備主要導線ネイティブ遷移 v17.6

原因
- preparation-route-v17.js 内の場所取得関数名が location だった。
- そのローカル関数がブラウザの window.location を隠した。
- 活動を始める／詳細な準備を開くのクリック処理は preventDefault() 後に location.assign() を呼んだため、遷移せず停止していた。

修正
1. 場所取得関数を activityPlace へ改名し、window.location との名前衝突を解消。
2. 2つの主要導線はネイティブ a[href] の既定遷移を止めない。
3. クリック時は活動ID・プランIDの同期保存だけを実行し、ページ遷移はブラウザ標準へ任せる。
4. IndexedDBの runtime_context 更新はバックグラウンドのまま維持。
5. FIELD03、GPS、地図、写真、動画、音声、メモ、ピン、Wake Lock、DB構造は変更なし。
6. HOME天気、カレンダー、予定詳細v16.3は変更なし。

GitHub
- このZIP作成時点では main を変更していない。
