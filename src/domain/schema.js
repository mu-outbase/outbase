export const schema = {
  project: {
    id: 'project_id',
    purpose: '次のキャンプ準備から帰宅後レビューまでを束ねる親オブジェクト',
    fields: ['title', 'status', 'reservation', 'weatherWatch', 'prepContext', 'prep', 'route', 'records', 'review']
  },
  reservation: {
    purpose: '予約スクショ・PDF・予約メール・カレンダー予定から作った次のキャンプ候補',
    fields: ['campground', 'dateText', 'nights', 'checkIn', 'checkOut', 'address', 'companions', 'sourceType', 'sourceText']
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
  },
  prepContext: {
    purpose: 'Core02で追加した準備候補を実用化するための条件。天気、人数、コタ同行、献立、過去反省、ギアメモを保持する。',
    fields: ['weatherMemo', 'highTemp', 'lowTemp', 'rainRisk', 'windMemo', 'peopleCount', 'kotaGoing', 'menuMemo', 'pastReflection', 'gearMemo']
  }
};

export const mvpFixedRules = [
  'MVPは少ない機能ではなく、むーが実際に使いたくなる最低完成ライン',
  '手入力中心は禁止。自動取得・候補表示・一括取込・承認を基本にする',
  '予約スクショ読取だけではMVPではない。準備・当日・次回改善へつなぐ',
  '現地操作は3秒以内。写真・音声文字起こし・GPS・ワンタップを優先する',
  'PWA土台は維持。PWA実用確認はCore02〜Core04後のMVP候補段階で行う'

];

export const prepBase = {
  packing: [
    'リード / ハーネス / 予備リード',
    'コタ用タオル / ウェットシート / エチケット袋',
    'モバイルバッテリー / 充電ケーブル',
    '寝具・マット・枕・防寒/暑さ対策',
    'ゴミ袋 / キッチンペーパー / 予備電池'
  ],
  shopping: [
    '朝食用パン / 卵 / 飲み物',
    '夕食メイン食材',
    '氷 / 水 / 炭酸水',
    'おやつ / コーヒー',
    '不足しがちな調味料'
  ],
  kota: [
    'コタのごはん小分け',
    '水飲みボウル / フードボウル',
    '冷感・暑さ対策または防寒対策',
    'うんち袋 / 消臭袋',
    'ドッグカート確認'
  ],
  reflection: [
    '前回の忘れ物を確認',
    '撤収時間が押した原因を確認',
    '使わなかったギアを減らす',
    '料理の量を見直す'
  ]
};
