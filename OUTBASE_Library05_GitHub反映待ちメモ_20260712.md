# OUTBASE Library05 GitHub反映待ちメモ

## 反映対象
OUTBASE_ROUTE08_UI_REBUILD_CLEAN_v6_Library05_資産統合実装LOCK.zip

## 反映方法
ZIPを展開し、リポジトリ直下へ中身を一括アップロードする。
index.html / style.css / src/app.js / manifest.json / service-worker.js / assets / vendor を同時に反映する。

## 注意
- 一部ファイルだけを差し替えない
- Prep01.2以前のZIPと混在させない
- GitHub反映後はAndroidでキャッシュ更新を行う

## 実機確認
- 準備画面から共通台帳が開く
- 資産トップが表示される
- ギア内部6画面へ移動できる
- 車・自転車、ペット、保管場所が開く
- 登録、編集、削除、保存が維持される
- 在庫の使用・補充が反映される
- カスタム現在仕様が1件に保たれる
- 履歴と次回予定が表示される
- 既存の予定、準備、記録、思い出が壊れていない
