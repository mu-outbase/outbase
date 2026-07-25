# OUTBASE R1 第1実装ゲート 保存領域インベントリ

- 作成日: 2026-07-25
- コード基準: `4d652f200ec5aa02821d43a60617384cca7d4ecd`
- 対象: 現行 `index.html` から到達する新シェル、FIELD03、旧import、v44カレンダー、およびリポジトリ内に残る未接続データ実装
- 原則: この資料はコード監査結果であり、本番ブラウザのDBをopen、変更、削除、移行して作成したものではない

## 1. IndexedDB

### 1.1 `outbase_db`

| 項目 | 内容 |
|---|---|
| 共通所有者 | `src/storage/outbase-db-accessor.js` |
| 正式アクセサバージョン | 12 |
| 現行open元 | 共通アクセサのみ。FIELD03、旧import、legacy adapter、旧backup読取りが共通アクセサを利用 |
| upgrade方針 | v10/v11/newをv12へ前進。不足store/indexの追加だけを許可。既存store/indexのdelete、clear、rename、再生成は禁止 |
| 自動書込み | 起動・表示ではrowを書かない。FIELD03保存、import blob保存など明示操作時のみ |
| 読取り元 | FIELD03記録表示・位置補完、legacy adapter、非破壊export、旧backup/restoreコード |
| 書込み元 | FIELD03記録、旧import。既存restoreコードは残存するが、第1ゲートのexportからは呼ばない |
| 主な危険 | 旧構成ではFIELD03がv10、importがv11で直接openし、v11作成後にFIELD03 v10 openがVersionErrorとなった。旧root `app.js` のv6実装は現行entryから未接続だが履歴コードとして残る |

正式管理store:

| store | keyPath | index | 内容 |
|---|---|---|---|
| `fieldRecords` | `id` | なし | FIELD03の記録metadataとBlob（写真・動画・駐車写真等） |
| `coreImportBlobs` | `blobId` | なし | 旧import原本Blob |

既存環境に上記以外のstoreがある場合も共通アクセサは保持し、削除・clear・renameしない。旧root `app.js` が定義していた `records`、`activeSessions`、`campgrounds`、`gear_master`、`campRecords`、`experiences`、`sessions`、`assets`、`inbox_items`、`review_items`、`weather_snapshots`、`friend_dogs`、`friend_encounters`、`spots`、`spot_visits`、`route_points`、`trip_projects`、`camp_project_items`、`setup_logs`、`gear_usage`、`meal_plans`、`shopping_items`、`import_queue`、`sync_queue` も、存在すればそのまま残る。

### 1.2 `outbase_story_db`

| 項目 | 内容 |
|---|---|
| バージョン | 1 |
| open元 | `src/data/database.js` |
| keyPath | 全store `id` |
| 読取り元 | Repository、HOME、予定一覧・詳細、準備、保管庫、新シェル各domain |
| 書込み元 | Repository経由のユーザー操作、明示migration |
| 自動書込み | shadow migrationは既定OFF。新規環境では新シェルがDBスキーマを初期作成する場合があるが、旧データ複製とentity row作成は行わない |
| 主な危険 | 旧構成では起動時migration、表示時baseline、context永続化により暗黙のrow作成・複製が発生した。第1ゲートで停止 |

共通indexは、特記がないstoreに `household_id`、`updated_at`、`created_by`、`deleted_at`。

| store | 追加index |
|---|---|
| `app_meta` | `updated_at` |
| `households` | 共通のみ |
| `accounts` | 共通のみ |
| `members` | `account_id`, `legacy_ref` |
| `pets` | `legacy_ref` |
| `activities` | `state`, `type`, `start_at`, `visibility`, `primary_place_id`, `legacy_ref` |
| `activity_participants` | `activity_id`, `participant_id`, `participant_type`, `legacy_ref` |
| `activity_transitions` | `activity_id`, `at`, `to_state`, `actor_id`, `legacy_ref` |
| `calendar_entries` | `activity_id`, `start_at`, `legacy_ref` |
| `preparation_items` | `activity_id`, `category`, `status`, `due_at`, `legacy_ref` |
| `records` | `activity_id`, `type`, `occurred_at`, `actor_id`, `visibility`, `place_id`, `legacy_ref` |
| `media` | `record_id`, `activity_id`, `media_type`, `legacy_ref` |
| `gps_chunks` | `activity_id`, `chunk_no`, `started_at`, `legacy_ref` |
| `places` | `type`, `name`, `legacy_ref` |
| `routes` | `activity_id`, `legacy_ref` |
| `route_points` | `route_id`, `seq`, `place_id`, `legacy_ref` |
| `assets` | `asset_type`, `status`, `legacy_ref` |
| `activity_assets` | `activity_id`, `asset_id`, `legacy_ref` |
| `meals` | `activity_id`, `legacy_ref` |
| `meal_items` | `meal_id`, `legacy_ref` |
| `shopping_lists` | `activity_id`, `legacy_ref` |
| `shopping_items` | `activity_id`, `shopping_list_id`, `status`, `legacy_ref` |
| `reviews` | `activity_id`, `legacy_ref` |
| `improvement_items` | `activity_id`, `status`, `legacy_ref` |
| `visibility_rules` | `entity_type`, `entity_id`, `visibility`, `legacy_ref` |
| `sync_operations` | `status`, `created_at`, `entity_type`, `operation_id` |
| `change_history` | `entity_id`, `at`, `actor_id` |
| `migration_snapshots` | `migration_id`, `status`, `created_at`, `source_fingerprint`（共通indexなし） |

### 1.3 `outbase_calendar_db`

| 項目 | 内容 |
|---|---|
| バージョン | 1 |
| open元 | `src/calendar-v2/outbase-calendar-v2.js` |
| 現行接続 | module manifestから未接続。表示中のv44カレンダーとは別実装 |
| 自動書込み | init時のdefaults作成とStory DB複製は第1ゲートで既定停止 |
| 主な危険 | 接続した場合に第4の予定保存正本となり、v44 localStorage・Story DB・FIELD03予定と分散する |

| store | keyPath | index |
|---|---|---|
| `calendars` | `id` | `name`, `visible` |
| `entries` | `id` | `start_at`, `calendar_id`, `external_uid`, `activity_id` |
| `todos` | `id` | `due_at`, `completed`, `calendar_id` |
| `imports` | `id` | `created_at`, `source` |
| `widget_snapshots` | `id` | `generated_at` |

## 2. localStorage

非破壊exportはprefixで限定せず、実行originの全キーとraw文字列値を保存する。したがってコードに未記載の将来キーや旧版キーも欠落させない。

主要な保存責務:

| 区分 | 主なキー／prefix |
|---|---|
| v44高機能カレンダー | `outbase_calendar_complete_v3_events`, `outbase_calendar_complete_v3_todos`, `outbase_calendar_custom_types_v1`, `outbase_calendar_ui_state_v1` |
| FIELD03進行状態 | `outbase_record_*`, `outbase_active_parking_id`, `outbase_last_session_summary` |
| FIELD03予定・準備 | `outbase_plans_v1`, `outbase_plan_*`, `outbase_prep_v1`, `outbase_prep_common_v1`, `outbase_selected_plan_date`, `outbase_active_plan_id*` |
| FIELD03所有物・コタ用品 | `outbase_gear_*`, `outbase_asset_events_v1`, `outbase_mobility_library_v1`, `outbase_pet_library_v1`, `outbase_storage_library_v1`, `outbase_library_*` |
| 新シェルcontext | `outbase_activity_context_v1`, `outbase_pending_activity_context_v1`, `outbase_return_context_v1`, `outbase_activity_context_source_v1` |
| 旧FIELD03 ID領域 | `outbase_core_activity_id`, `outbase_primary_activity_id_v2`, `outbase_record_activity_id_v1`, `outbase_record_plan_id_v1`, `outbase_record_activity_type_v1`。Story IDの自動書込みは既定OFF |
| HOME | `outbase_home_*`, `outbase_quick_facts_v1`, `outbase_quick_memos_v1`, `outbase_quick_parking_events_v1` |
| 天気 | `outbase_weather_*`, `outbase_rain_horizon_v1` |
| 旧core／候補／レビュー | `outbase_core_*`, `outbase_activity_*`, `outbase_phase14_*`, `outbase_memory_reviews_v1`, `outbase_ai_*`, `outbase_chappy_*` |
| 保護・旧migration marker | `outbase_data_guard_backups_v1`, `outbase_data_integrity_last`, `outbase_production_cleanup_*`, `outbase_sample_plan_migration_*`, `outbase_active_plan_compatibility_*` |

FIELD03は状態変更、GPS更新、記録操作、予定・準備・所有物編集時にlocalStorageへ書く。単なる新シェル起動による旧→Story複製、予定詳細表示によるStory IDの旧IDキー書込みは第1ゲートで停止した。

## 3. sessionStorage

非破壊exportでは復元対象と混同せず `sessionStorageReference` 区分へ全キーを保存する。

主なキー:

- `outbase_calendar_ui_state_v1`
- `outbase_execution_ui_state_v19`
- `outbase_home_line_session_v36`
- `outbase_preparation_origin_v1`
- `outbase_shell_return_context_v1`
- `outbase_flow_return_v2`
- `outbase_library_hotfix_editor_type`
- `outbase_library_hotfix_editor_id`
- `outbase_library_scroll_fix3:*`
- `outbase-sw-outbase-r3-route-cutover-fix-v222`

## 4. Cache Storage / Service Worker

| 項目 | 内容 |
|---|---|
| Service Worker | `service-worker.js` |
| cache名 | `outbase-field03-v16631-r3-route-cutover-fix-v222` |
| 内容 | app shell、HOME、FIELD03、v44カレンダー、data/domain/shell JavaScript、画像・CSS |
| 書込み | install時 `cache.addAll`、fetch時 `cache.put` |
| 削除 | activate時、現行cache名以外を削除。第1ゲートでは仕様変更しない |
| export | cache名、request/response metadata、読取り可能なresponse bodyをbase64で保存。opaque等でbodyを読めない場合は `bodyError` を記録し、無言で欠落させない |

Cache Storageは再生成可能な配布物であり、ユーザー記録DBの正式restore元にはしない。

## 5. 非破壊export形式

- format: `OUTBASE_NON_DESTRUCTIVE_STORAGE_EXPORT`
- formatVersion: 1
- JSON単一ファイル
- IndexedDBはDB version、store構造、keyPath、index、row count、key、primaryKey、valueを保持
- Blob/File/ArrayBuffer/TypedArrayは型情報とbase64本文を保持
- `undefined`、BigInt、NaN、Infinity、Date、RegExp、Map、Setにも型markerを付ける
- 未対応値・循環参照は対象pathを含む失敗としてexport全体を中止し、成功扱いしない
- localStorageは全raw key/value
- sessionStorageは参考区分
- export前後のDB/store件数とlocalStorage raw値を比較し、変化時はarchiveを確定しない
- restore処理は含めない

起動後は既存の共通台帳exportボタンがこの非破壊exportへ委譲する。開発確認では
`OUTBASE_STORAGE_EXPORT_V1.download()` を明示実行できる。いずれもarchive構築と
不変性検査が完了するまで成功を返さない。

## 6. 第1ゲート後も残る判断事項

1. Story DBスキーマ初期作成を「画面表示時に許容する空スキーマ初期化」とするか、明示初期化へ移すか。
2. 既存restore UIを後続ゲートで隔離検証方式へ置換するか、正式廃止して別導線にするか。
3. dormantな旧root `app.js` と `outbase_calendar_db` 実装を、正本確認後に保管領域へ隔離するか。
4. Cache Storage bodyを正式rollback対象に含めるか、配布成果物の再配置だけで復旧するか。
