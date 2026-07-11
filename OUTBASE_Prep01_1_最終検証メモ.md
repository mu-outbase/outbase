# OUTBASE Prep-01.1 最終検証メモ

## 静的検証
- `node --check src/app.js`：PASS
- index / manifest / service-worker キャッシュ：`outbase-clean-v6-prep011`へ統一
- ローカル参照ファイル：PASS
- Plan-01.2 / Record-02.2主要構造：維持

## 432×768 DOM操作検証
1. 天気／ギア／料理／買物／ルートの固定順：PASS
2. 駐車場カード非表示：PASS
3. 下部ナビまで一画面：PASS（scrollHeight 768 / innerHeight 768）
4. 最終カード下端 609px、下部ナビ上端 694px：PASS
5. 主役予定切替シート表示：PASS
6. 手賀沼ドライブ散歩から赤城山キャンプへ切替：PASS
7. ギア詳細から共通ギア管理へ遷移：PASS
8. 共通ギア追加：PASS
9. 今回の持出しへ追加：PASS
10. 別予定では未選択を維持：PASS
11. 元の予定へ戻すと持出し選択を復元：PASS
12. ギア管理シート下スワイプ終了：PASS
13. 下スワイプ終了後に下部タブへ誤遷移しない：PASS
14. 遮断時間後は通常の下部タブ操作が可能：PASS
15. 予定なしを選択：PASS
16. 主役予定なしで共通ギア管理：PASS
17. JavaScript page error：0件

## Android実機確認対象
- 上部プランチップから主役予定を切替。
- 複数予定間で準備進捗と今回ギアが混ざらない。
- 詳細シートを下へスワイプし、指を下部タブ上で離してもタブが開かない。
- 外側タップで閉じても背後タブが開かない。
