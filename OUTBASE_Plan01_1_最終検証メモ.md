# OUTBASE Plan-01.1 最終検証メモ

## 合格
- node --check src/app.js
- Node最小DOMランタイム起動
- index.html / manifest.json / service-worker.js のバージョン統一
- 必須ローカル参照ファイル存在確認
- CLEAN v6、Record-02.2、Plan-01の既存構造を維持

## 実装確認
- 同日2タップ判定
- 異なる日タップの誤追加防止
- 月スワイプ
- 外側タップ／下スワイプ閉じ
- 入力途中の破棄確認
- 開始・終了日時／終日
- 同日複数予定
- 繰り返し生成
- 自動状態判定
- 種類・同行者管理

## 留意
コンテナChromiumはDBus／NETLINK／zygote制限で最終版の新規スクリーンショット撮影に失敗した。
Plan-01.1の画面確認画像は実装途中の同一設計プレビューを同梱する。最終動作はGitHub Pages反映後にAndroid実機で確認する。
