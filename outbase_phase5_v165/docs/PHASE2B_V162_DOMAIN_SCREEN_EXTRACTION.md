# OUTBASE v162 Phase 2B
## 予定・準備・保管庫 domain / screen model 抽出

## 目的

FIELD03の表示・記録処理を変更せず、巨大な`src/app.js`が保持している予定・準備・保管庫の責務を、将来の共通シェルから利用できる独立APIへ切り出す。

Phase 2BではDOMを差し替えない。新UIを上から被せず、先にデータ参照・状態解決・段階表示用read modelを完成させる。

## 追加モジュール

### 共通
- `src/domain/shared/read-utils.js`

### 予定
- `src/domain/plans/plan-domain.js`
- `src/screens/plan/plan-screen-model.js`

活動、カレンダー、参加者を同じ`activity_id`で結合し、現在・進行中・次の予定を取得する。
旧予定IDは`legacy_ref=plan:<id>`として解決し、FIELD03画面へ戻るURLも生成する。

### 準備
- `src/domain/preparation/preparation-domain.js`
- `src/screens/preparation/preparation-screen-model.js`

キャンプ、散歩、ドライブ、買物、イベントの活動種別から、必要な準備カテゴリを段階表示用に構成する。
保存済み準備項目がない場合は表示時に仮モデルを返し、明示的な`ensureBaseline()`実行時だけShadow DBへ冪等保存する。
現地セッションがactive／pausedの間は保存処理を延期する。

### 保管庫
- `src/domain/vault/vault-domain.js`
- `src/screens/vault/vault-screen-model.js`

完了・整理中・アーカイブ活動、記録、メディア、レビュー、改善項目、資産を参照し、原本Blobを一覧取得せずに集約する。

### 起動
- `src/domain/bootstrap.js`

Phase 2B APIの存在を検証し、`outbase:phase2b-ready`を発火する。

## 起動順

1. FIELD03既存14モジュール
2. Phase 1 Shadow DB 7モジュール
3. Shadow migration完了待ち
4. Phase 2B domain / screen model 8モジュール
5. app-state snapshot

## FIELD03保護

- `src/app.js`はパッケージに含めず変更しない
- 旧`outbase_db` version 10を変更しない
- 写真・動画原本のBlobを移動しない
- GPS、地図、ピン、欠測、画面ON、復元へ接続しない
- 新しいMutationObserverを追加しない
- compact UIへ機能を追加しない
- DOM置換を行わない

## cutover

- Shadow DB：継続
- 新画面への切替：未実施
- FIELD03保存先の切替：未実施
- 旧データ削除：なし

## 次Phase

Phase 3で共通シェルを実装する。
共通シェルはPhase 2Bのread modelを利用し、旧予定・準備・保管庫画面はadapter経由で開ける状態を維持する。
