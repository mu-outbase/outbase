PHASE1 IMPLEMENT

目的

PHASE1_DESIGN.mdで定義した構造を実装する。

今後の写真・音声・動画・GPS・AI整理に対応できる保存基盤を作る。

---

実装対象

1. IndexedDB

採用理由

localStorageでは容量不足になる。

写真・音声・動画保存を考慮し、
保存基盤をIndexedDBへ移行する。

---

2. Session

目的

1回の体験を管理する。

例

- 散歩
- キャンプ
- 登山
- 車中泊

構造

session = {

 id:"",

 type:"walk",

 status:"open",

 startTime:"",

 endTime:""

}

---

3. Inbox

目的

体験中のデータを一時保存する。

構造

inbox = {

 sessionId:"",

 photos:[],

 audio:[],

 gps:[],

 notes:[]

}

---

4. Record

目的

体験終了後の確定データ。

構造

record = {

 sessionId:"",

 walk:{

  time:"",

  distanceKm:""

 },

 gps:{

  start:"",

  end:""

 },

 weather:{},

 ai:{}

}

---

保存フロー

散歩開始

↓

Session作成

↓

Inbox生成

↓

写真保存

↓

音声保存

↓

GPS保存

↓

散歩終了

↓

Record生成

↓

IndexedDB保存

---

フェーズ1完了条件

- IndexedDB動作
- Session作成
- Inbox作成
- Record作成
- 散歩開始でSession生成
- 散歩終了でRecord保存
- 既存履歴表示が継続動作

---

フェーズ1では実装しない

- Google Photos連携
- AI整理
- 地図表示
- キャンプモード
- 写真サムネイル
- 音声再生

---

フェーズ1完了後

フェーズ2へ移行

フェーズ2

- 写真サムネイル
- 音声再生
- UI改善

フェーズ3

- Google Photos連携
- AI整理
- 場所カード生成

---

開発方針

見た目の変化よりも、
後戻りしない設計を優先する。

小刻みな機能追加ではなく、
フェーズ単位でまとめて実装する。
