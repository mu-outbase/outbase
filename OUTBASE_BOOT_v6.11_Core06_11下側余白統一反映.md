# OUTBASE BOOT v6.11 / Core06.11 下側余白統一反映

## 位置づけ
Core06.10で大枠UI整理を反映した後、ユーザー確認で指摘された「ページごとに下側の余白が多い/狭い/直っていない」問題を最終調整する版。

## 反映内容
- body側の下余白をゼロ化し、app-shell側に単一の下余白を集約。
- 下バー高さ、safe-area、記録中インジケーター有無をJSで計測し、`--ob-bottom-reserve` を動的更新。
- 予定/探す/準備/記録/当日/思い出の全ルートで同一ロジックを適用。
- 記録ページでは記録中インジケーターを非表示にし、他ページでは被り防止ぶんの余白を追加。
- Android Chromeのアドレスバー変動、画面回転、View Transition後の再計算に対応。

## 変更ファイル
- `index.html`
- `service-worker.js`
- `styles/core06-11.css`
- `src/main.js`
- `src/core/router.js`
- `src/config/version.js`

## バージョン
- VERSION: `MVPB_CORE06_11_BOTTOM_SPACING_FINAL`
- BUILD_ID: `core06-11-bottom-spacing-final-20260704`
- CORE_LABEL: `MVPβ Core 06.11 / Bottom spacing final + MVP route map`

## 次工程
大枠確認後、Core07へ進む。

Core07対象：
- 複数予定対応
- 詳細買物リスト
- 1日目/2日目 朝昼晩の料理計画
- ギア管理
- コタ用品
- ルート/経由地

## LOCK
MVP監査結果LOCK v1.0の23項目照合は継続。
