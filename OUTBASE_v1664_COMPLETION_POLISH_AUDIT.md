# OUTBASE v166.4 完成度仕上げ 実装監査

作成日：2026-07-15（Asia/Tokyo）  
基準：GitHub main `939b6acbff61a4967ebef42647521ddf3e8073f1`  
入力正本：MASTER_v166_3_Android実機確認反映LOCK.xlsx  
Android基準証跡：8044.png〜8049.png

## 1. 実機評価から固定した課題

v166.3はv166.2より改善したが、正式完成水準には未達だった。対象は全面作り直しではなく、以下6点の仕上げに限定した。

1. 「次」カード右側の不自然な空白と意味が曖昧な＋。
2. 「すぐ使う」4列の窮屈さ。
3. 写真なし活動の仮アイコン感。
4. 「探す」の内容プレビュー不足。
5. 「保管庫」の写真・活動主役不足。
6. 追加シート3操作の主従不足。

## 2. 採用した技術選択

### 表示層限定

- 主変更は `src/shell/shell-renderer.js` と `style-design-system.css`。
- domain、screen model、repository、migration、FIELD03本体は変更していない。
- 既存read modelの値だけを使用し、新しい保存項目や問い合わせを追加していない。

### 正式情景ビジュアル

- camp／walk／drive／event／shopping／otherの軽量inline SVGを追加。
- 写真がある時は既存の遅延写真を優先し、情景を非表示にする。
- 外部画像、外部フォント、追加ネットワーク要求は0。

### 探すの内容プレビュー

- 地図、写真、カレンダーを静的なCSS／SVGミニプレビューで表現。
- 検索画面ではmedia keyを出力せず、Blob読取0を維持。

### 保管庫

- 最新活動を横長写真／情景ヒーローに変更。
- 上位4活動を2列ギャラリーで表示。
- 写真は既存`IntersectionObserver`の表示直前読込を継続。

## 3. 6対象の実装結果

| 対象 | 実装 |
|---|---|
| 次 | 情景／写真を全面表示し、日付・場所を付加。曖昧な＋を廃止 |
| すぐ使う | 560px以下で2列×2段、72px高の高密度操作 |
| 写真なし | 活動タイプ別の正式情景SVG |
| 探す | 地図・写真・カレンダーの内容プレビュー |
| 保管庫 | 最新活動ヒーロー＋2列活動ギャラリー＋全活動一覧 |
| 追加シート | 開始を全面主役、メモ・予定を2列補助 |

## 4. 性能境界

- fast shellを維持。
- route別read modelと30秒cacheを維持。
- persistent shellを維持。
- 初期Blob読取0を維持。
- 検索画面Blob読取0。
- 写真は表示対象だけ遅延読取。
- 同一写真のObject URL再利用を維持。
- MutationObserver追加0。
- shell全体への`overflow:hidden`追加0。

## 5. データ・FIELD03保護

- `src/app.js`はパッチに含めない。
- GPS、地図、軌跡、欠測、写真保存、動画、音声、ピン、wake lock変更なし。
- `outbase_db` version 10変更なし。
- `outbase_story_db` schema変更なし。
- activity_id生成・紐付け変更なし。
- 家族、ペット、参加者、公開範囲変更なし。
- migration、保存データ、バックアップ、復元変更なし。
- service workerはcache versionと新シェル資産のquery versionだけを更新。

## 6. 自動検証

- JavaScript構文：作業パッチセット14ファイル合格。
- 焦点smoke：5本合格。
  - v166.2密度LOCK
  - v166.3 domain photo reference
  - v166.3 media lazy behavior
  - v166.3 visual hierarchy
  - v166.4 completion polish
- CSS：top-level 572 rules、parse error 0。
- 初期Blob読取：0。
- lazy Blob読取：対象表示後1回の既存挙動を維持。
- 検索HTMLのmedia key：0。
- FIELD03変更：0。
- database schema変更：0。

## 7. 未完了

- GitHub mainへの反映。
- Android実機確認。
- TRAIL LENS、GPS、写真、音声、offline restoreの実機回帰。

## 判定

v166.4の技術選択、設計、ローカル実装、自動検証、監査は完了。GitHub反映とAndroid実機確認が終わるまでは正式完成LOCKにしない。ロールバック地点はv166.3 `939b6ac`。
