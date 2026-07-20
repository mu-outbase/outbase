OUTBASE v166.31 / R3-05
旧画面遮断・正式ルート統合 v22.0

【基準】
GitHub main確認版：v166.31-r3-all-ui-home-master-v21.0
作成日：2026-07-20
GitHub mainへの書込み：なし
Android実機確認：未実施

【今回の目的】
見た目だけをHOMEへ寄せるのではなく、通常操作から旧FIELD03／旧tab画面へ移動する二重構造を止める。
HOME、カレンダー、追加、探す、保管庫、予定詳細、準備、実行を新シェル内の一本線に固定する。

【追加した正式シェルルート】
・plan-editor：予定追加・予定編集
・preparation-detail：詳細な準備
・start：活動開始の予定選択／予定なし開始
・memo：メモ／改善メモ
・places：保存場所・予定で使った場所の検索／登録
・assets：持ち物一覧・登録・編集

【通常導線の付替え】
・追加メニュー「活動を始める」→ start
・追加メニュー「予定を追加」→ plan-editor
・追加メニュー「記録を残す」→ memo
・追加メニュー「持ち物を登録」→ assets
・予定詳細の設定 → plan-editor
・簡易準備「詳細な準備」→ preparation-detail
・探す「キャンプ場・場所を探す」→ places
・探す／保管庫の持ち物 → assets
・予定詳細の準備／記録URL生成 → shellルート

【既存HOMEクイックアクションへの対応】
GitHub mainに残っている旧クイックアクション実装を、windowキャプチャ段階で正式ルートへ変換する。
通常シェル内で発生した旧tabリンクは、ページ移動前に次の新ルートへ切り替える。
・tab=plan + add → plan-editor
・tab=record + start → start
・tab=record + memo → memo
・tab=prep → preparation-detail
・tab=prep + gear → assets
・tab=search → places
・tab=memory → vault

記録セッションがactive／pausedのFIELD03は変換対象から除外し、記録中核を保護する。

【新画面で実装した保存】
・予定の追加／編集／削除
・予定日程のcalendar_entries保存
・詳細準備の完了切替／項目追加
・予定を選んで新実行画面へ移動
・予定なしの活動作成
・メモのrecords保存
・改善メモのimprovement_items保存
・場所のplaces保存
・持ち物のassets保存／編集／削除

【FIELD03保護】
旧FIELD03本体は削除・変更していない。
src/app.js、GPS連続記録、地図、写真、動画、音声、場所ピン、画面ON維持、IndexedDB、オフライン復元、既存記録には触れていない。

【まだ移植していないもの】
新実行画面の次のボタンは、FIELD03の保存中核へまだ接続していない。
・GPS連続軌跡
・写真／動画／音声
・メモ／場所ピン／駐車位置
・画面ON維持
・IndexedDB保存
・再起動復元

この中核移植がCodexを使う工程。
v22.0のAndroid導線確認後に、FIELD03を参照元として新実行画面へまとめて移植する。

【完了判定】
静的確認：実施済み
Android確認：未実施
GitHub反映：未実施

通常導線で旧画面が開かないことはコード上で固定したが、Android実機での全導線一巡はまだ確認されていない。
