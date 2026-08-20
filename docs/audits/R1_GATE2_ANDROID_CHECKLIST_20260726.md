# OUTBASE R1第2ゲート Android実機確認票

状態: **未実施**。この票は実行準備のみで、確認済み・完成を意味しない。

## 前提

- 検証専用Android端末または隔離Chrome profileを使用する。
- 実行前にGate1非破壊exportを取得し、manifest件数とBlob包含を確認する。
- production restoreは無効のままにする。
- HOME v36 r34、v44、FIELD03のUIを変更しない。

## 確認項目

- [ ] HOME → 予定詳細 → 準備 → FIELD03相当実行画面 → Backを確認
- [ ] Back 1回で直前画面へ戻る
- [ ] forward遷移は先頭表示、Backでscroll位置が復元される
- [ ] 再起動後CurrentContextが明示復元契約どおりで、旧IDと混同しない
- [ ] FIELD03保存成功・構造化失敗表示（Gate1結果を壊していない）
- [ ] GPS取得、追跡、一時停止、再開、終了
- [ ] 写真BlobとFile metadata
- [ ] 動画Blobとmetadata
- [ ] 音声Blobと文字起こし未接続境界
- [ ] 場所ピン
- [ ] 駐車位置
- [ ] Wake Lock取得・解放・画面復帰
- [ ] 活動なしメモが `activity_id:null` / `unclassified` で、架空活動を作らない
- [ ] offline起動、online復帰、再起動
- [ ] IndexedDB既存row・Blob・localStorageが表示前後で不変
- [ ] v44カレンダーが従来どおり起動し、`outbase_calendar_db` へcutoverしない
- [ ] 隔離archive検証が現行DBを変更せず、一時DBを残さない

## 中止条件

- 既存row、Blob、FIELD03 ID、v44 dataの追加・変更・欠落
- Back二重消費、画面loop、scroll消失
- 表示だけでStory DBまたは業務rowが作成される
- migration / cleanup既定OFF違反
- 保存失敗の成功扱い、無言失敗
- 一時検証DBまたはmockの残留

異常時はproduction DBをrestore/clearせず、該当flagをOFFにして再現情報を採取する。
