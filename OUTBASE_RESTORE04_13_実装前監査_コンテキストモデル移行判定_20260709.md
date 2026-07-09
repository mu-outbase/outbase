# OUTBASE RESTORE04.13 実装前監査
## Context Model移行判定 / 表示対象・記録対象・可変階層・複数リンク

作成日: 2026-07-09  
対象: OUTBASE / RESTORE04.12 / FIELD03正ベース  
結論: **04.13 ZIP作成はまだ禁止。先にContext Modelの最小移行実装へ進む。**

---

## 0. 前提LOCK

参照LOCK:

- OUTBASE_CONTEXT_MODEL_LOCK_v1_表示記録階層並列モデル.md
- OUTBASE_BOOT_v2.3_MVP再設計運用反映.md
- OUTBASE_BOOT_v36.0_Restart-37-40_小型プランチップ統合実装LOCK.md
- RESTORE04.8 ルートAPIなし版

固定前提:

```text
OUTBASEは単一プラン切替アプリではない。
表示対象と記録対象は別概念。
内部データは孫まで固定しない。
UIは最大3階層程度に抑える。
内部は可変階層 + 複数関連リンク。
04.8のルートAPIなし版は壊さない。
```

---

## 1. 04.12コード監査結果

### 1.1 構文検査

```text
node --check src/app.js
OK

node --check service-worker.js
OK
```

### 1.2 状態変数監査

04.12時点の `src/app.js` を静的監査した結果:

```text
currentPlanId 使用数: 68
recordPlanId 使用数: 12
rootPlanId 使用数: 0
sessionId 使用数: 0
activeSession 使用数: 0
```

判定:

```text
表示中/記録中の分離は一部入ったが、内部モデルはまだ currentPlanId 中心。
親予定 / 子セッション / 記録素材 / 関連リンク の構造は未実装。
```

### 1.3 04.12で残してよいもの

```text
・表示中 / 記録中を分ける方向性
・上バーで表示中/記録中を軽く見せる考え方
・下バーを 予定 / 探す / 準備 / 記録 / 思い出 に固定する方向
・クイック記録を 話す / 撮る / 動画 / 場所 / ピン / メモ に集約する方向
・未確認箱を保険として持つ考え方
```

ただし、現コードのまま正ベース化は不可。

### 1.4 04.12から捨てる/作り直すべきもの

```text
・recordPlanId = 記録中セッション、という名前だが実体はPlan参照に近い
・Session/Taskがないため、場内散歩・設営・料理・移動を正しく分けられない
・GPS/ピン/タイマー/レビューなどの旧関数が currentPlanId に保存し続ける
・1つのRecordを複数対象へLinkできない
・未確認箱からの後整理導線がまだ弱い
・表示中/記録中はあるが、activeSessions / referenceTargets がない
```

---

## 2. 04.13でやるべきこと

04.13は「画面を増やす版」ではない。  
**Context Modelの最小導入版**にする。

### 2.1 04.13の目的

```text
単一 currentPlanId 中心の状態から、
viewTarget / recordTarget / session / record / link の土台へ移す。
```

### 2.2 04.13で必須導入する状態

```text
context: {
  viewTargetId,
  viewTargetType,
  recordTargetId,
  recordTargetType,
  primaryRecordingSessionId,
  activeSessionIds,
  referenceTargetIds,
  inboxId
}
```

旧互換:

```text
currentPlanId は viewTargetId への互換エイリアスとして残す。
ただし新規保存処理では currentPlanId を保存先に使わない。
```

### 2.3 04.13で最小導入するデータ配列

```text
sessions: []
links: []
```

Recordは既存 `records` を壊さず、以下を追加する。

```text
rootPlanId
sessionId
parentRecordId
sourceDevice
syncStatus
confidence
links
```

MapPin/GPS/Timerなども、段階的に `recordTarget` へ移す。

---

## 3. 04.13で触ってはいけないこと

```text
・04.8のルートAPIなし計算式を変更しない
・ルート画面の見た目を再設計しない
・カード支払いなど不要サンプルを復活させない
・上バー4段階表示を復活させない
・下バー名をプラン種別で変えない
・毎回保存先確認ポップアップを出さない
・未確認箱を通常保存先にしない
・孫まで固定のツリー構造にしない
```

---

## 4. 04.13の合格条件

### S01 赤城山準備を表示しながらコタ通常散歩を記録

合格:

```text
viewTarget = 赤城山キャンプ準備
recordTarget = コタ通常散歩セッション
写真/音声/GPS/ピン = コタ通常散歩へ保存
```

### S02 コタ散歩中に赤城山ルートを見る

合格:

```text
ルート画面は赤城山を表示
recordTarget はコタ散歩のまま
04.8ルート計算は維持
```

### S03 赤城山キャンプ中にコタ場内散歩開始

合格:

```text
rootPlanId = 赤城山キャンプ
session.type = walk
session.title = コタ場内散歩
GPS/写真/ピン = sessionIdへ保存
```

### S04 キャンプ中に次回キャンプ準備を見る

合格:

```text
viewTarget = 次回キャンプ準備
recordTarget = 現在キャンプ側のactiveSession
保存先は勝手に変わらない
```

### S05 予定未作成でとりあえず記録

合格:

```text
recordTarget = inbox
Recordは保存される
後でPlan/Sessionへ移動できる前提のIDを持つ
```

### S06 1つの写真を複数対象へ紐付け

合格:

```text
Record/AssetからLinkを複数作れる
赤城山キャンプ / コタ場内散歩 / 木陰スポット / 次回改善 に関連付け可能
```

### S07 旧currentPlanId保存残り検査

合格:

```text
新規の写真/動画/音声/メモ/GPS/ピン/タイマー/レビュー保存が
currentPlanId ではなく context.recordTarget を参照する
```

---

## 5. 04.13実装方針

### Phase 04.13-A: Context Model初期化

```text
state.context を追加
既存 state.currentPlanId / recordPlanId から安全に移行
inbox仮Planを内部的に定義
```

### Phase 04.13-B: Target解決関数

```text
getViewTarget()
getRecordTarget()
setViewTarget(id,type)
setRecordTarget(id,type)
ensureContext()
createSession()
startRecordingSession()
stopRecordingSession()
createLink()
```

### Phase 04.13-C: 保存処理の入口統一

```text
quickRecord
captureMedia
voiceMemo
gps point
map pin
```

を `createContextRecord()` に寄せる。

### Phase 04.13-D: UIは最小

表示は大きくしない。

```text
表示中：赤城山準備
記録中：コタ場内散歩
```

だけを軽く表示。

### Phase 04.13-E: 監査

```text
node --check
旧currentPlanId保存残りgrep
S01〜S07静的シナリオ検証
04.8ルート再検証
ZIP整合性
```

---

## 6. 04.13でZIPを作ってよい条件

以下がすべてPASSした場合のみZIP作成可。

```text
[ ] Context Modelがstateに入っている
[ ] currentPlanIdだけで保存する新規処理が残っていない
[ ] recordTargetで写真/音声/メモ/GPS/ピンを保存できる
[ ] Sessionを作れる
[ ] Linkを作れる
[ ] 未確認箱保存ができる
[ ] 04.8ルートが壊れていない
[ ] 上バー4段階が戻っていない
[ ] 下バー固定が維持されている
[ ] node --check OK
```

---

## 7. 判定

```text
04.12は正式承認不可。
04.13はContext Model最小導入に限定して実装へ進む価値あり。
ただし、04.13でも全機能完成扱いは禁止。
```

次に進む場合は、04.13 ZIPを作る前に、上記のContext Model最小実装を入れ、S01〜S07を検査する。
