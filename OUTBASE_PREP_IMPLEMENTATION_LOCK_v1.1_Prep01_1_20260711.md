# OUTBASE PREP IMPLEMENTATION LOCK v1.1 / Prep-01.1

作成日：2026-07-11

## 準備ホーム
- 432×768の一画面構成。
- 固定順：天気、ギア、料理、買物、ルート。
- 各カードに進捗と次の未完了項目を表示。
- 主役切替と共通ギア管理を小型クイックバーで表示。
- 駐車場はルート内へ統合。
- 持ち物カードは廃止。

## 主役予定
- 上部プランチップまたは同時進行バーから切替シートを開く。
- 複数予定を同時保持し、選択した1件を準備・記録の主役にする。
- 「予定なし」を選択可能。
- 保存キー：`outbase_active_plan_id`。

## 準備データ
- 保存キー：`outbase_prep_v1`。
- 予定IDごとにmodulesを保持。
- moduleごとにchecked、customItems、note、gearIdsを保持。
- 別予定へ切り替えても準備進捗と今回のギアを混在させない。

## 共通ギア管理
- 保存キー：`outbase_gear_library_v1`。
- 名称、分類、数量、保管場所、状態を追加・編集・削除。
- 主役予定がなくても所有ギア台帳を利用可能。
- 主役予定がある場合は「今回に追加／今回から外す」で予定別gearIdsを管理。

## 誤操作防止
- シート表示中は`.bottomNav`を`pointer-events:none`にする。
- シート終了時に短時間のナビ遮断を設定する。
- 外側タップと下スワイプではpreventDefault／stopPropagationを実行する。
- Androidの合成クリックで背後タブへ遷移させない。

## 維持LOCK
- Plan-01.2、Record-02.2、Prep-01、CLEAN v6。
- FIELD03正ベース、RESTORE04.8ルート系。
