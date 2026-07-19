OUTBASE HOMEデザイン完全統一 v14

原因
- 追加・探す・保管庫を、HOMEの実コンポーネントではなく別画面として設計していた
- 色と共通上下バーだけを合わせたため、別アプリのように見えていた

v14 visual LOCK
- HOME v36の背景、左右15px、カード角丸17〜20px、薄い境界線、弱い影を共通基準化
- 英字のSEARCH / VAULT / PLAN / START / RECORD / ITEMを撤去
- 探す：白い別キャンバスを廃止、HOME型検索カード・クイックカード・結果カードへ統一
- 探す：結果があるのに0件表示が出るhidden競合も修正
- 保管庫：巨大な濃緑ヒーローを廃止し、HOME型の白い最新活動カードへ変更
- 保管庫：件数・タブ・一覧カードをHOME密度へ統一
- 追加：HOMEの正式ボトムシート寸法へ統一
- 追加：活動を始めるを主操作として強調し、他3項目を補助操作へ整理

機能維持
- v10カレンダー
- v11横断検索
- v12.1追加4導線
- v13保管庫3面
- FIELD03、GPS、地図、写真、動画、音声、IndexedDB、天気r34

監査
{
  "search_no_separate_canvas": true,
  "search_empty_hidden_fix": true,
  "vault_latest_white_home_card": true,
  "add_home_sheet": true,
  "add_primary_activity": true,
  "english_eyebrows_removed": true
}

構文
{
  "search": "OK",
  "add": "OK",
  "vault": "OK",
  "version": "OK",
  "manifest": "OK",
  "service-worker": "OK"
}
