# OUTBASE Phase 3 v163 共通シェル

## 実装範囲
- 共通mount root
- ホーム／探す／中央操作／保管庫の4導線
- History APIによるシェル内遷移
- 中央操作bottom sheetとAndroid戻る連携
- FIELD03旧画面adapter
- シェル障害時fallback
- 活動中・休止中のシェル起動禁止

## 起動方法
通常URLではFIELD03を継続する。
`?shell=1&view=home`を付けた時だけPhase 3シェルを起動する。

## 安全条件
- データcutoverなし
- 新画面cutoverなし
- 現地セッション中は自動fallback
- MutationObserver追加なし
- overflow:hidden追加なし
- legacy DOM削除なし
- 旧画面はadapter経由で常に開ける

## 次工程
Phase 4でホーム「今・次・すぐ使う・最近」の情報量・活動詳細への接続・家族表示を完成させる。
