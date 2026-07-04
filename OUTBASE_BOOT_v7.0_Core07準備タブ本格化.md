# OUTBASE BOOT v7.0 / Core07 準備タブ本格化

## 位置づけ
Core06.12で大枠UIと下端スクロール復旧を維持したまま、Core07では準備タブを「予定別・料理起点の準備連携ハブ」に更新する。

## 正本リポジトリ
- repository: `mu-outbase/outbase`
- default branch: `main`
- 取得確認済みファイル:
  - `index.html`
  - `src/main.js`
  - `src/core/store.js`
  - `src/modules/prep/prep.js`
  - `src/modules/prep/prepEngine.js`
  - `styles/core06-12.css`

## Core07反映内容
- 準備タブを5枚前後の要約カードに圧縮
  1. 準備中の予定
  2. 未確認サマリー
  3. 料理・買物まとめ
  4. ギア・コタまとめ
  5. ルート・LINEコピー
- 詳細は折りたたみで展開
- 買物リストに「どの料理で使うか」を表示
- 共通食材・無駄チェックを表示
- 料理提案条件を複数選択に変更
- 料理提案に「映え」「もう1品」「付け合わせ」「おつまみ」「火を使わない」などを追加
- 料理・食材カードは画像枠付き
- 現地変更・忘れ物・代替案に対応
- ギアは今回持参・車載・調理器具連携
- コタ用品は独立表示
- LINEコピーは3種に限定
  - 買物リスト
  - 料理計画
  - 出発予定
- 探す→予定→準備→当日→記録→思い出→次回改善の導線を表示

## 更新対象
- `index.html`
- `src/main.js`
- `src/core/store.js`
- `src/modules/prep/prep.js`
- `src/modules/prep/prepEngine.js`
- `styles/core07.css` 新規

## 注意
GitHub connectorで正本取得は成功したが、ブランチ作成とファイル作成は 403 `Resource not accessible by integration` で失敗。
そのため、このZIPを手動反映用の完成版として扱う。

## 検証
- `node --check src/main.js`
- `node --check src/core/store.js`
- `node --check src/modules/prep/prep.js`
- `node --check src/modules/prep/prepEngine.js`

すべて構文チェックOK。

## Core06.12維持条件
- `styles/core06-12.css` は削除しない
- `app-shell::after` のスクロールスペーサー方式を維持
- 固定下バーとの重なり回避を維持
- 常時表示を増やしすぎない
