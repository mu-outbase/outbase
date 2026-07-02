export const schema = {
  project: {
    id: 'project_id',
    purpose: '次のキャンプ準備から帰宅後レビューまでを束ねる親オブジェクト',
    fields: ['title', 'status', 'reservation', 'weatherWatch', 'prep', 'route', 'records', 'review']
  },
  session: {
    purpose: '散歩・設営・撤収など、開始と終了を持つ行動単位',
    fields: ['session_id', 'type', 'started_at', 'ended_at', 'gps_track', 'records', 'recovery_status']
  },
  record: {
    purpose: '写真・動画・音声文字起こし・メモ・GPSなどの記録単位',
    fields: ['record_id', 'type', 'created_at', 'location', 'asset', 'transcript', 'tags', 'links']
  },
  candidate: {
    purpose: 'OCR・AI・一括取込で作られた未確定候補。むーが承認して確定する。',
    fields: ['candidate_id', 'source', 'confidence', 'payload', 'status']
  }
};

export const mvpFixedRules = [
  'MVPは少ない機能ではなく、むーが実際に使いたくなる最低完成ライン',
  '手入力中心は禁止。自動取得・候補表示・一括取込・承認を基本にする',
  '予約スクショ読取だけではMVPではない。準備・当日・次回改善へつなぐ',
  '現地操作は3秒以内。写真・音声文字起こし・GPS・ワンタップを優先する',
  'PWA先行。ネイティブアプリ化はPWA限界が見えた後に判断する'
];
