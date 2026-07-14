# OUTBASE v165.1 Android実機証跡補正

作成日：2026-07-15（Asia/Tokyo）

## 実機で確認できたこと

- GitHub mainへv165統合版がルート直下で反映された
- Chrome上で新シェルが起動した
- PWAインストール候補が表示された
- ホーム、中央操作シート、探す、保管庫が表示・遷移した
- FIELD03記録画面は開始前、距離0.00km、経過時間0:00:00で維持された
- GPS地図表示は維持された

## 実機で発見した問題

1. ホーム「今」に同じ「その他 7/14」が重複表示された
2. FIELD03は開始前なのに、Shadow DB由来のカードは休止中と表示された

## 原因

新ホームはShadow DBのactive／paused活動をそのまま表示していた。
旧Coreに残る過去の記録セッション活動や、自動生成された汎用活動が、現在のFIELD03セッション状態と一致しない場合でも「今」に残っていた。

## 補正方針

- 旧データやShadow DBを削除・変更しない
- ホームread modelだけで現在表示を照合する
- FIELD03セッションがidleの場合、旧記録セッションに紐づくactive／paused活動を「今」から除外する
- 同一legacySessionIdは1件へ統合する
- `その他 M/D`／`記録`の汎用孤立活動は、idle時に「今」へ出さない
- 予定や通常のキャンプ・イベント活動は残す
- 実セッション中は一致するsessionIdだけを表示する

## 変更ファイル

- `src/domain/home/home-domain.js`
- `src/config/version.js`
- `index.html`
- `manifest.json`
- `service-worker.js`
- 画面／シェルのversion表示ファイル
- `tests/v1651-android-evidence-hotfix-smoke.js`

## 保護範囲

変更なし：

- `src/app.js`
- `outbase_db` version 10
- `outbase_story_db` schema
- GPS、地図、写真、動画、音声、ピン
- wake lock
- バックアップ、復元
- FIELD03保存処理
- 既存活動データ

## 検証

- 全既存smoke test：合格
- v165.1補正test：合格
- idle時の旧session活動除外：合格
- 同一session重複統合：合格
- live session一致活動の保持：合格
- 通常イベント／キャンプ活動の保持：合格
- 新規MutationObserver：0
- DB更新：0

## 現在位置

v165.1はローカル実装・検証完了。GitHub未反映。Androidで補正後ホームを再確認してから、活動詳細・カレンダー・家族フィルタの実機確認へ進む。
