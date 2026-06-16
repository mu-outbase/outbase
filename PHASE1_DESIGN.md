PHASE1 DESIGN

目的

OUTBASEの保存基盤を作り直す。

今後、写真・音声・GPS・メモ・AI整理を追加しても後戻りしない構造にする。

---

フェーズ1でやること

1. セッション化

散歩開始時にセッションを作成する。

セッションは「1回の体験」を表す。

例

- 散歩
- キャンプ
- 登山
- 釣り
- 車中泊

---

2. インボックス化

写真・音声・GPS・メモは、まずインボックスへ保存する。

あとからAI整理やカード化を行う。

---

3. IndexedDB採用

localStorageは容量が小さいため、保存基盤をIndexedDBへ変更する。

写真・音声・動画などの大きなデータに対応するため。

---

基本データ構造

session = {
  id: "",
  type: "walk",
  status: "open",
  startTime: "",
  endTime: ""
}

inbox = {
  sessionId: "",
  photos: [],
  audio: [],
  gps: [],
  notes: []
}

record = {
  sessionId: "",
  walk: {
    time: "",
    distanceKm: ""
  },
  gps: {
    start: "",
    end: ""
  },
  weather: {},
  ai: {}
}

---

フェーズ1ではやらないこと

- 見た目の大幅改善
- AI整理
- Google Photos連携
- 地図表示
- キャンプモード本実装

---

フェーズ1完了条件

- 散歩開始でセッション作成
- 写真・音声・GPSをインボックス形式で保存
- IndexedDBへ保存
- 散歩終了で記録として保存
- 既存の履歴カードに表示できる

---

開発方針

見た目より後戻りしない設計を優先する。

小刻みな機能追加ではなく、フェーズ単位でまとめて実装する。
