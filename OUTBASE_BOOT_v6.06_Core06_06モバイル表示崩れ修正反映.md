# OUTBASE BOOT v6.06 / Core06.06 モバイル表示崩れ修正反映

## 状態
- Core06.05の全ページ見た目統一後、スマホ実機で下ナビが横ズレし、カレンダー下部と重なる問題を確認。
- Core06.06では機能追加ではなく、見た目統一後のモバイルシェル崩れを修正する。

## 反映内容
- 下ナビの `width:100% + left/right + transform` 競合を解消。
- 6項目ナビをスマホ幅内に必ず収める。
- 下ナビが予定カード・選択日カードを隠さないよう余白を再設定。
- カレンダー月表示・日付セル・イベントラベルをスマホ向けに再調整。
- Service Workerキャッシュを Core06.06 に更新。

## 成果物
- OUTBASE_MVPB_Core06_06_MobileShellPolish.zip
- MASTER_v260_Core06_06モバイル表示崩れ修正反映.xlsx
- OUTBASE_BOOT_v6.06_Core06_06モバイル表示崩れ修正反映.md
- unpack-core06-06.yml
