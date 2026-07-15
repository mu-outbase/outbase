# OUTBASE v166.4 引継ぎ

このZIPはGitHubリポジトリルートへ自動解凍アップロードするための差分一式です。

## 基準

- Repository：mu-outbase/outbase
- Branch：main
- Base HEAD：`939b6acbff61a4967ebef42647521ddf3e8073f1`
- Rollback：v166.3 `939b6ac`

## 反映方法

ZIPの中身をリポジトリルートへ展開し、同名ファイルを置換する。`src/app.js`、DB、保存データは変更しない。

## 反映後

Androidでホーム、探す、追加シート、保管庫を確認し、次にTRAIL LENSとFIELD03の回帰確認を行う。
