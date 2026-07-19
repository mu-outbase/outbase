OUTBASE カレンダー機能仕上げLOCK v9

コード監査で確認した実不具合
- eventCardはdata-edit-event、bind側はdata-idを参照していた
- todoCardも同じ不一致があった
- addTodoBtnにイベントが結び付いていなかった
- ダブルタップ追加がdblclickだけに依存していた
- 保存済みfiltersをカレンダー読込後に全件で上書きしていた
- repeat設定を保存しても、表示側は元予定1件しか見ていなかった
- 一覧表示が表示月と無関係に全予定を並べていた

修正
- 予定カードのタップ編集を復旧
- ToDoカードのタップ編集を復旧
- ToDo追加ボタンを接続
- 360ms以内の同一日2回タップで予定追加
- 1回タップは選択日の変更
- 週表示の日付タップを接続
- 保存した種類・参加者絞り込みを復元
- 毎日・毎週・毎月・毎年の繰り返しを月／週／日／一覧へ展開
- 一覧を表示月単位へ変更
- 終了日時が開始より前の場合は保存停止
- ToDo表示へ種類フィルターを適用
- ToDo中は前後移動ボタンを無効化
- フィルター・選択日欄開閉時の埋込高さ再計測

維持
- 共通ヘッダー
- 下バー5項目
- Copyright
- このアプリについて
- 種類追加・色変更・カスタム種類削除
- 下スワイプ終了
- HOME戻る不要ボタン削除
- FIELD03、GPS、地図、写真、音声、IndexedDB、天気r34

監査
{
  "event_cards_editable": true,
  "todo_cards_editable": true,
  "todo_add_bound": true,
  "mobile_double_tap_detection": true,
  "saved_filters_preserved": true,
  "repeat_occurrences_expanded": true,
  "monthly_list": true,
  "invalid_end_rejected": true,
  "week_date_buttons_bound": true,
  "calendar_assets_new": true,
  "new_shell_version": true,
  "new_index_version": true,
  "new_sw_cache": true
}

構文確認
{
  "version": "OK",
  "manifest": "OK",
  "direct-fix": "OK",
  "about": "OK",
  "calendar": "OK",
  "service-worker": "OK"
}
