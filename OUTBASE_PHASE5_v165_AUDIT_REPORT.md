# OUTBASE Phase 5 v165 監査・実装報告

## 判定
**ローカル実装・自動検証：合格**

GitHub反映とAndroid実機確認は未実施。通常URLとFIELD03は変更していない。

## 基準
- 正本：MASTER v164
- GitHub main確認HEAD：`70efdf99247ab639e55eb21f1f8644f9e0b47291`
- 実装ベース：v164完成差替え一式

## 実装
1. 活動詳細read model
   - activity_idを主キーに基本情報、参加者、予定、準備、記録、レビュー、改善、メディア件数、ギア、献立、買い物リストを集約
   - 原本Blobは取得しない
2. 月間カレンダー
   - 42日グリッド
   - 複数日活動を各日に表示
   - activity_id付き詳細遷移
3. 家族・ペットフィルタ
   - members／petsから選択肢を構成
   - URLの`people`へ保持
   - 選択対象をすべて含む活動だけを表示
4. 共通シェル
   - `activity`／`calendar`ルート追加
   - ホームカードと最近一覧を新活動詳細へ接続
   - 準備・記録編集はFIELD03 adapterを維持
5. PWA基礎
   - manifest、192／512 PNGアイコン
   - standalone起動、アプリショートカット
   - Service Worker cache更新

## 保護確認
- `src/app.js`：パッケージに含めず変更なし
- `src/data/database.js`：v164とSHA256一致
- `src/data/repositories.js`：v164とSHA256一致
- `src/data/migrations.js`：v164とSHA256一致
- 旧DB version 10：変更なし
- Shadow DB version 1：変更なし
- GPS／地図／写真／動画／音声／ピン／画面ON維持：未接続
- data cutover：なし
- screen cutover：なし
- 新規MutationObserver：0
- 画面一括切断用overflow:hidden：0

## 自動検証
- JavaScript構文：34ファイル合格
- Phase 2A loader／startup回帰：合格
- Phase 2A manifest／router回帰：合格
- Phase 2B domain回帰：合格
- Phase 3 shell／History／modal／session guard回帰：合格
- Phase 4 home／participant／activity_id回帰：合格
- Phase 5 detail／calendar／filter／PWA smoke：合格
- activity_id：詳細・カレンダー・記録入口で一致
- calendar複数日表示：合格
- family filter複数選択：合格
- Blob読取：0
- manifest standalone：合格
- 192／512アイコン：寸法確認済み

## 残作業
1. 完成ZIPをGitHubへ一括反映
2. GitHub Pagesで通常URLがFIELD03のままか確認
3. `?shell=1&view=home`で新シェル確認
4. カレンダー、活動詳細、家族フィルタ確認
5. PWAインストール起動、戻る、回転、復帰、オフライン確認
6. 合格後にFIELD03と新activity_idを本接続
