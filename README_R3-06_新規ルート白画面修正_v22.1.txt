OUTBASE v166.31 / R3-06
新規ルート白画面修正 v22.1

【実機報告】
v22.0では次の入口を含む新規シェルルートがAndroidで真っ白になった。
・詳細な準備
・コタ散歩
・メモ
・改善メモ
・＋追加メニュー全項目
・場所／持ち物／予定編集など同じ新規ルート群

【根本原因】
v22.0の新規ルート描画は、先に既存rendererBase.mount()を実行していた。
既存rendererは未知の新規ルートをHOMEとして描こうとするが、新規ルートのmodelにはHOMEデータがない。
そのため既存renderer内で例外が発生し、新規ルート専用HTMLを差し込む処理まで到達できず、画面が真っ白になった。

【v22.1の修正】
・新規6ルートは既存rendererBase.mount()を通さず、専用rendererで直接描画
・直接URL／再読み込み時も共通シェル骨格を先に生成
・データ読込前にローディング表示
・例外時は真っ白にせず「画面を開けませんでした」を表示
・標準ルート（HOME、カレンダー、探す、保管庫、予定詳細、簡易準備、実行）は従来rendererを維持
・予定追加画面に重複していたメモ欄を1つへ修正

【対象ルート】
・plan-editor
・preparation-detail
・start
・memo
・places
・assets

【保護】
HOME v36 r34の構造と天気表示は変更していない。
旧FIELD03本体、src/app.js、GPS、地図、写真、動画、音声、場所ピン、画面ON維持、IndexedDB、オフライン復元、既存記録は変更していない。

【確認済み】
・同梱JavaScript全ファイル node --check
・service-worker.js node --check
・HTMLパース
・CSS波括弧整合
・Nodeモック実行で新規6ルートすべて専用画面HTMLを生成
・新規6ルートでは旧rendererBase.mount()を呼ばないことを確認
・標準HOMEルートでは従来rendererを呼ぶことを確認
・ZIP整合性

【未確認】
Android実機でのv22.1確認は未実施。
GitHub mainへの書込みは行っていない。
