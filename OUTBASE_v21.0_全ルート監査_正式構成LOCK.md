# OUTBASE v21.0 全ルート監査・正式構成LOCK

対象：GitHub `mu-outbase/outbase` main  
基準版：`v166.31-r3-all-ui-home-master-v21.0`

## 結論

v21.0は「全画面HOME統一版」ではない。

原因はCSS不足ではなく、通常操作の中に次の2つのアプリ構造が混在しているため。

### 新シェル
- `?shell=1&view=home`
- `calendar`
- `search`
- `vault`
- `activity`
- `preparation`
- `record`

### 旧FIELD03／旧アプリ
- `?tab=plan`
- `?tab=search`
- `?tab=prep`
- `?tab=record`
- `?tab=memory`

URLに `tab=` が付くと、通常の新シェル起動ではなく旧ランタイムが起動する。
そのためヘッダー、下バー、カード、アイコン、戻る履歴が別物になる。

## 根本問題

1. ルーターが新シェルURLと旧URLの両方を生成する。
2. シェル用アダプターが予定追加、活動開始、メモ、検索、保管庫、ギア編集を旧URLへ送る。
3. 予定詳細の設定リンクが旧詳細画面へ向く。
4. 簡易準備の「詳細な準備」が旧 `tab=prep` へ向く。
5. 保管庫の持ち物が旧準備内のギア管理へ向く。
6. 新実行画面はFIELD03の記録エンジンではなく、確認用UI状態だけを持つ。
7. v21の共通CSS・アイコン置換では旧DOMと旧ナビ構成を新画面へ変換できない。
8. 旧画面から戻す専用return bridgeが必要で、二重構造が常態化している。

## 正式ルート構成LOCK

下バーは変更しない。

| 下バー | 正式ルート |
|---|---|
| ホーム | `home` |
| カレンダー | `calendar` |
| 追加 | 共通シェル内モーダル |
| 探す | `search` |
| 保管庫 | `vault` |

予定内部の一本線：

```text
HOME / カレンダー / 探す / 保管庫
        ↓
予定詳細 activity
        ↓
簡易準備 preparation
        ├─ 詳細な準備 preparation-detail
        └─ 実行 record
                ├─ 写真
                ├─ 動画
                ├─ 音声
                ├─ メモ
                ├─ 場所ピン
                └─ 駐車位置
```

## 新シェルに新設する画面・シート

- `preparation-detail`
- 予定追加・編集シート
- 活動開始シート
- 共通メモシート
- 場所検索
- 持ち物一覧・詳細・編集
- 記録詳細シート
- 場所ピン／駐車位置シート
- 写真／動画／音声の記録シート

## 通常導線から撤去する旧遷移

- `tab=plan&planSheet=add`
- `tab=record&sheet=start`
- `tab=record&sheet=memo`
- `tab=prep&outbaseAdd=gear`
- `tab=prep&outbaseVault=gear`
- `legacyDetailUrl`
- 簡易準備からの旧 `tab=prep`
- 新シェル検索からの `openSearch()`
- 新シェル保管庫からの旧ギア管理

旧FIELD03は削除しない。
通常操作からは開かず、機能移植の参照・緊急退避用として凍結する。

## 次の一括実装範囲

1. 旧URLを生成するシェル側コードを停止
2. 新シェル内に不足画面・シートの正式ルートを追加
3. 全入口を新ルートへ付け替え
4. 共通予定コンテキストを全画面で維持
5. 戻る操作をシェルhistoryへ一本化
6. 旧画面へ飛ぶリンクが0件であることを静的監査
7. Androidで全導線を一巡確認

この段階ではFIELD03のGPS・保存中核を削除・改変しない。
正式ルート固定後、Codexで中核を新実行画面へ移植する。

## 判定

- v21.0：不採用
- GitHub main：データ保護のため現状維持
- 次版の目的：デザイン変更ではなく旧画面へ飛ばない正式ルート統合
- 完了条件：通常操作で `tab=` URLへ一度も遷移しない
