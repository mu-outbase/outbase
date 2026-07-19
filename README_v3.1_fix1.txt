OUTBASE カレンダー v3.1 fix1

原因
正式ヘッダー化で todayBtn / settingsBtn をHTMLから削除した一方、
JSが .onclick を設定し続けたため、初期 render() 前に停止していました。

修正
- 正式ヘッダーへ「今日」「設定」を表示
- 全主要ボタンの初期バインドを安全な addEventListener + optional chainingへ変更
- 年月、家族／ペット、月間グリッド、選択日一覧の初期描画を復旧
- 再入場固定処理は維持
- Service Workerと統合バージョンをformal-4へ更新

FIELD03、outbase_db、GPS、地図、写真、音声、バックアップ／復元、天気r34は変更しません。
