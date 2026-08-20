# OUTBASE R1第2ゲート 実装・検証記録

- 正本: v166.40 R1残件監査完了・第2ゲート方針確定LOCK
- 基準main: `b4e8f304639026aa116bf9e6427431f3b5867e61`
- branch: `codex/r1-contract-and-rollback-boundary`
- ゲート名: Navigation・Context・Domain Contract・隔離Rollback境界

## 実装境界

### Navigation / History

- browser historyの書込み所有者を `src/router.js` に限定した。
- route、modal、overlay、legacy bridgeはrouterの `history` APIと `subscribePop` を使用する。
- forwardはscroll 0、Backは遷移元entryに保存したscrollを復元する既存shell契約を維持する。
- routeとmodalを別entryとして扱い、二重補充・二重消費を禁止する。

### CurrentContext

- URLを入力、単一in-memory CurrentContextを実行時正本とする。
- localStorageは明示的な再起動復元保存だけに限定する。
- 旧FIELD03 IDはlegacy adapterのreadonly fallbackに限定し、routerは直接参照・書込みしない。
- 表示だけではcontextを永続化しない。明示保存時は構造化例外を返す。

### Story DB

- 表示・起動は `openExisting()` のみを使用し、DB未存在を空状態として扱う。
- 初回の明示保存、明示初期化、明示migrationだけがDBを作成する。
- schema upgradeは不足store/index追加のみ。既存store/index/rowを削除、clear、renameしない。
- Activityに `subtype` と `parent_activity_id` index、子活動queryを追加した。

### Domain / Repository / Validation

- Activityの `type`、`subtype`、`state`、`parent_activity_id` 契約を定義した。
- memoは高機能、ひと言、活動中の種別を共通化し、`activity_id:null` を
  `unclassified` として保存可能にした。架空organizing活動は作らない。
- asset、activity_asset、preparation、shopping_list、shopping_itemのID関係を定義した。
- Repositoryの `save`、`saveMany`、legacy-ref upsertは、DB transaction前に
  normalizer、構造、enum、nullable、参照存在を検証する。
- memoは表示activityと保存activityの不一致をrejectする。
- client request ID照合と保存queueにより、同時二重submitを直列化・dedupeする。

### Legacy / Migration / Cleanup

- legacy adapterは許可したlocalStorage keyと `fieldRecords` だけをreadonlyで読む。
- migration、legacy core migration、cleanup、sample-plan処理は既定OFF、明示操作だけで実行する。
- migrationはsource fingerprintとstatusを保持し、同一fingerprintのready状態を再実行しない。
- 中途失敗はfailedとして記録し、成功扱いしない。

### Restore / Rollback

- 現行DBをclearするin-place restoreを無効化した。
- Gate1非破壊archiveは、`outbase_r1_archive_verify_*` 一時DBだけへ展開する。
- schema、store、index、key、件数、field値、Blob、File、ArrayBufferをroundtrip照合する。
- 成否にかかわらず一時DBを削除し、現行DBとlocalStorageを変更しない。
- production restoreは本ゲートでは無効。Android実機確認とユーザー承認まで有効化しない。

### Dormant / Cache

- repository rootの旧 `app.js` と `outbase_calendar_db` は削除・接続しない。
- index、entry、module manifest、Service Workerから未接続であることをcheckerで検出する。
- Cache StorageとService Workerをユーザーデータ正本やdata rollback元にしない。
- Gate2 cache/build識別子を更新し、旧sourceとの混在を防ぐ。cache削除仕様は変更しない。

## 段階公開

Gate2機能flagは既定OFFとし、明示操作単位でのみ有効化する。R2カレンダー、R3メモUI・
autosave・revision・検索は有効化しない。問題発生時は機能単位disable後、このbranchの
親commitへコードrollbackし、cache build更新・再配布する。既存業務DBは変更・復元しない。

## 検証

- 静的契約check: `tools/check-r1-gate2.ps1`
- 隔離ブラウザ26項目: `tests/r1-gate2-contracts.test.html`
- 実導線fixture/count/cleanup: `tests/r1-gate2-browser-fixture.html`
- Android確認票: `R1_GATE2_ANDROID_CHECKLIST_20260726.md`

Android実機は未確認のため、R1全体の完成・最終合格とは判定しない。
