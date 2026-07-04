# OUTBASE BOOT v6.02

## Version
MVPB_CORE06_02_RECORD_MODE_MAP_CONFIRM

## Phase
Core06.02 / Record Mode + Live Map + Parent Child Recording + Delete Confirm

## 基準
- カレンダー周りは Core05.16 / v254 をイメージOK版として固定。
- Core06.01 の記録周りページ統一・時間帯テーマを継承。

## 反映内容
- 記録ページの「RECORD / 今残す」を削除し、自然な導入文に変更。
- キャンプ記録を親セッションとして扱い、キャンプ中のコタ散歩・設営・料理・撤収・メモを子記録として開始できるように整理。
- 記録中の表示を「親 ＞ 今のモード」で見えるように変更。
- コタ散歩にリアルタイムGPS取得と地図カードを追加。
- コタ散歩はキャンプ場名に固定せず、GPSから現在地付近を推定して表示。
- コタ散歩 / キャンプ / 設営 / 料理 / 撤収 / メモで表示項目を切り替え。
- 破棄・子記録破棄など、消す操作には確認ダイアログを追加。
- 記録画面の見た目を、より本番アプリ感のあるカード・ガラス感・ライブ表示へ調整。

## 反映ファイル
- index.html
- service-worker.js
- src/config/version.js
- src/core/router.js
- src/core/storage.js
- src/core/store.js
- src/main.js
- src/modules/walk/walk.js
- styles/core06-02.css

## GitHub反映
- zip: OUTBASE_MVPB_Core06_02_RecordModeMapConfirm.zip
- workflow: .github/workflows/unpack-core06-02.yml

## 注意
- OpenStreetMap / Nominatim はオンライン時の補助表示。GPS拒否・通信不可の場合は、現在地付近表示や地図表示が限定される。
