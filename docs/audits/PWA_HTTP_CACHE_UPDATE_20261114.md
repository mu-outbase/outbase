# 旧HTTPキャッシュを残したPWA更新

利用者のスクリーンショットは地図導入前の順序と点灯ボタン構造を示した。従来の更新テストは変更対象にCache-Control: no-storeを返しており、古いHTTPキャッシュがある条件を検証していなかった。

修正: SWのインストール時にRequestのcache: reloadでアプリ資材を取得し、新キャッシュに古いHTTP応答を格納することを防ぐ。SW登録はupdateViaCache: noneを指定する。IndexedDB・localStorageは削除しない。

追加テストは旧コードにmax-age=86400を付けてHTTPキャッシュを作り、同じURLで新版へ切り替える。修正後は新機能ロード、活動・メモ・Blob・localStorage・DBバージョンの保持、同タブの次回更新、オフライン実行が成功。

## 実際の読み込みURLとの差の修正
前の対策後にも利用者の画面は初期の地図版のままだった。SWの実行画面URL（r3-route-cutover）とmanifestが実際に読むURL（r1-gate2-shell）が一致していなかった。HTTPの再取得を指定しても、別URLの資材を取得していて実行画面に届かない経路が残った。

起動ローダー、version・manifest、shell群のURLを地図リリース用に更新し、manifest.allの実際の全URLをSWへ追加した。重複とmanifest資材欠落を検出する単体チェックを追加。

75de3ed（地図導入前・点灯対応版）を配信し、HTTP max-age=86400のキャッシュと活動・メモ・Blobを作った後に今回のコードへ切り替えるテストを追加。更新・データ保持・連続更新・オフライン実行に加え、GPS取得前の地図がDOMに存在することまで確認し成功。地図操作のモバイルテストも成功。利用者の端末そのものは未操作。
