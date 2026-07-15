# OUTBASE v166 正式デザインLOCK

作成日：2026-07-15（Asia/Tokyo）

## 正式採用

- 通常時：A / NORTH
- 活動実行中・休止中：B / TRAIL LENS
- 同じアプリ・同じactivity_id・同じ情報階層を維持し、状態だけで最適な操作人格へ切り替える。

## NORTH

対象：ホーム、予定、カレンダー、準備、活動詳細、探す、保管庫、家族・ペット、整理・改善、思い出。

原則：
- 生成り、深緑、真鍮を使うが、キャンプ風の装飾にはしない。
- カードを大量に積まず、ページ全体を一つの活動ストーリーとして見せる。
- 主要操作48px以上。
- 情報の順番は「活動名／状態／次の操作」を最優先。
- 4導線はホーム／探す／追加／保管庫。

## TRAIL LENS

対象：active／pausedの現地セッション、GPS、地図、距離、時間、写真、動画、音声、メモ、場所記録、休止・再開・終了、オフライン状態。

原則：
- 背景は深い黒緑。操作はライム。情報パネルはレンズ状のシート。
- 直射日光、片手、手袋、短時間確認を優先。
- 地図原本・GPS・写真・音声の処理は変更しない。
- ブラー、等高線、View Transitionは機能に依存しない装飾層とする。

## 状態切替

- idle → NORTH
- active → TRAIL LENS
- paused → TRAIL LENS
- 活動終了 → NORTHへ戻り、整理・思い出へ接続
- URLのrecordStateを優先し、無い場合はlocalStorageのoutbase_record_session_stateを参照
- MutationObserverは使わない
- click／submit／pageshow／popstate／storage／visibilitychangeで再同期

## 採用技術

- CSS Design Tokens
- color-mix()と固定色フォールバック
- Container Queries
- CSS Grid
- View Transitions API（非対応時は即時遷移）
- prefers-reduced-motion
- prefers-contrast
- SVG／CSSだけの軽量装飾
- Service Workerオフラインキャッシュ

## FIELD03保護

変更しない：
- src/app.js
- outbase_db version 10
- outbase_story_db schema
- GPS・地図・写真・動画・音声・ピン
- wake lock
- バックアップ・復元
- 保存データ

実装方法：FIELD03のDOMと処理はそのまま残し、active／paused時に外側のテーマクラスと追加CSSだけを適用する。

## 禁止

- 5タブへ戻す
- 大型グローバルバー
- 小型チップの乱立
- overflow:hiddenによる全画面固定
- MutationObserver
- FIELD03への機能差分混入
- 重い地図ライブラリをホームの必須依存にする
