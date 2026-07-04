# OUTBASE BOOT v6.04 / Core06.04 記録UX全面再設計反映

## 状態
- Core05.16：カレンダー周りの基準版として継続
- Core06.03：記録周りNG版。以後の正本にはしない
- Core06.04：記録周りを現場利用前提で再設計

## Core06.04で固定した方針
- 自宅散歩とキャンプ場散歩は別モード
- 自宅散歩は「日常の散歩ログ」：時間、距離、近所ルート、写真、メモ、現在地
- キャンプ場散歩は「キャンプ場レビュー素材」：場内ルート、設備、景色、注意箇所、写真、メモ、現在地
- キャンプ滞在は親記録
- キャンプ中の場内散歩、設営、料理、撤収、メモは子記録
- うんちボタン、水ボタンは標準ボタンから削除
- 地図は散歩系だけ主役にする
- 地図iframeの再読み込みを廃止し、チカチカしない安定ルート表示に変更
- 自宅散歩・キャンプ場散歩とも近距離ズーム感のルート表示にする
- 今のモード、親、今動いている子記録を常時表示
- モード切替を画面上に常時表示
- よく使うボタンは各モードごとに最初から見える位置に出す
- 履歴詳細は専用表示として先頭に出す
- 履歴削除、記録破棄、子記録破棄は確認必須

## 実装対象
- `src/modules/walk/walk.js`
- `src/main.js`
- `src/config/version.js`
- `service-worker.js`
- `index.html`
- `styles/core06-04.css`

## バージョン
- VERSION: `MVPB_CORE06_04_RECORD_FIELD_UX`
- BUILD_ID: `core06-04-record-field-ux-20260704`
- ZIP: `OUTBASE_MVPB_Core06_04_RecordFieldUX.zip`
- MASTER: `MASTER_v258_Core06_04記録UX全面再設計反映.xlsx`

## GitHub反映
- ZIPをmain直下にアップロード
- `.github/workflows/unpack-core06-04.yml` を作成
- Actions成功後、`src/config/version.js` が `MVPB_CORE06_04_RECORD_FIELD_UX` であることを確認

## 注意
Core06.04は記録周りの再設計版。Core06.03の「地図チカチカ」「履歴詳細が見つからない」「テスト画面っぽい」「モードが分からない」問題を前提から直す。
