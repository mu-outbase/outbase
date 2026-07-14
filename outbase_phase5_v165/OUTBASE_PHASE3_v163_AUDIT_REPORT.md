# OUTBASE Phase 3 v163 監査・実装報告

## 結論
Phase 3「共通シェル・4導線」をFIELD03正ベースの外側に追加した。
通常URLでは従来FIELD03を継続し、`?shell=1&view=home`の場合だけ新シェルをmountする。
新DB・新画面の本番cutover、旧画面削除、旧DB変更は行っていない。

## 実装
- 共通mount root
- 下部4導線：ホーム／探す／中央操作／保管庫
- History APIによるシェル内遷移
- 中央操作bottom sheet
- Android戻るによるmodal close
- FIELD03旧画面adapter
- active／paused現地セッション時の自動fallback
- シェル障害時の旧画面fallback
- SVGアイコン、48px以上の操作領域、focus-visible、reduced-motion

## 安全設計
- 現地セッション中は新シェルを起動しない
- 通常URLはFIELD03のまま
- 旧記録DOMと保存処理を変更しない
- `src/app.js`を差替えない
- `outbase_db` version 10を変更しない
- Shadow DB cutoverなし
- 新規MutationObserverなし
- 画面一括切断を目的とするoverflow:hiddenなし
- service workerは旧資産＋Phase1＋Phase2B＋Phase3を明示キャッシュ

## 検証結果
- JavaScript構文：合格
- legacy14→data7→domain8→shell5：合格
- Phase2A回帰：合格
- Phase2B回帰：合格
- History pushState：合格
- modal戻る：合格
- active session guard：合格
- 新規MutationObserver：0
- 全画面overflow:hidden：0
- Phase1／Phase2B carry-forwardファイル：一致
- GitHub main：未反映
- Android実機：未確認

## プレビュー起動
反映後、通常URLに次を追加する。

`?shell=1&view=home`

実行中または休止中の活動がある場合は新シェルを起動せず、FIELD03を表示する。

## 未完了
- GitHub一括反映
- GitHub Pages起動確認
- Android実機確認
- Phase 4ホーム情報設計の完成
- 活動詳細・家族フィルタ
- FIELD03記録保存先と新activity_idの本接続

## 次工程
Phase 4「ホーム：今・次・すぐ使う・最近」を完成し、家族・参加者表示と活動詳細入口を接続する。
