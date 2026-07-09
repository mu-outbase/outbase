# OUTBASE RESTORE04.7
FIELD03正ベース / 下バー中央＋整理 / API移行LOCK反映

## ベース
- RESTORE04.6a FIELD03正ベースを維持。
- REBUILD17 / REBUILD18 / REBUILD18.1 / RESTORE01 へ戻していない。

## 修正内容
- 下バー中央の `＋ / ＋` 表示を `＋ / 記録` に整理。
- ルート画面下部が下バーに近すぎる問題に対して、安全余白を追加。
- APIあり移行方針を `OUTBASE_API移行LOCK_v1.md` として同梱。
- APIは裏側補助、候補扱い、保存値を勝手に上書きしない方針をコード内非表示LOCKとして保持。

## 維持
- FIELD03正ベース。
- 上バー整理。
- 下バー準備で準備ホームへ戻る構造。
- 現地セッション/GPS/地図/写真/動画/音声/ピン/欠測/画面ON維持。
- ルートはAPIなしでも成立するMVP。

## 検証
- node --check src/app.js
- node --check service-worker.js
