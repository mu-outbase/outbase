import { prepBase } from '../../domain/schema.js';

const CAMPGROUND_WORDS = /(キャンプ場|キャンプフィールド|オートキャンプ|Camp|CAMP|camp|ロッジ|Lodge|LODGE|グランピング|RV|スノーピーク|Snow Peak|ほったらかし|ふもとっぱら|那須|赤城|鹿沼|白河|山中湖)/;

export function extractReservationCandidate(rawText = '', sourceType = 'text', fileName = '') {
  const normalized = normalizeText(rawText);
  const compactForSearch = compactJapaneseSpacing(normalized);
  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  const compactLines = compactForSearch.split('\n').map((line) => line.trim()).filter(Boolean);
  const campground = findCampground(compactLines.length ? compactLines : lines, fileName);
  const dateText = findDateText(compactForSearch);
  const checkIn = findTimeByLabel(compactForSearch, ['チェックイン', 'IN', '入場', '到着']);
  const checkOut = findTimeByLabel(compactForSearch, ['チェックアウト', 'OUT', '退場', '退出']);
  const address = findAddress(lines);
  const nights = inferNights(dateText);
  const companions = findCompanions(compactForSearch);
  const confidence = calculateConfidence({ campground, dateText, checkIn, checkOut, address });
  const prep = buildPrepSuggestions({ campground, dateText, nights, checkIn, checkOut, address, sourceText: compactForSearch });
  return {
    candidate_id: `candidate_${Date.now()}`,
    source: fileName || sourceType,
    sourceType,
    confidence,
    status: 'needs_review',
    payload: {
      title: campground && dateText ? `${campground} ${dateText}` : campground || '次のキャンプ候補',
      reservation: { campground, dateText, nights, checkIn, checkOut, address, companions, sourceType, sourceText: compactForSearch },
      prep
    }
  };
}

export function createProjectFromCandidate(candidate) {
  const reservation = candidate?.payload?.reservation || {};
  const prep = candidate?.payload?.prep || buildPrepSuggestions(reservation);
  return {
    id: `project_${Date.now()}`,
    title: candidate?.payload?.title || reservation.campground || '次のキャンプ',
    status: 'planning',
    sourceCandidateId: candidate?.candidate_id || null,
    reservation,
    prep,
    createdAt: new Date().toISOString()
  };
}

export function buildLineList(project, context = {}) {
  const title = project?.title || '次のキャンプ';
  const reservation = project?.reservation || {};
  const prep = project?.prep || {};
  const sections = [
    '【OUTBASE 準備リスト】',
    '■ 次の予定',
    title,
    reservation.dateText ? `日程：${reservation.dateText}` : '',
    reservation.checkIn ? `チェックイン：${reservation.checkIn}` : '',
    reservation.checkOut ? `チェックアウト：${reservation.checkOut}` : '',
    contextSummary(context),
    '',
    '■ 買い物',
    ...(prep.shopping || []).map((item) => `・${item}`),
    '',
    '■ 持ち物',
    ...(prep.packing || []).map((item) => `・${item}`),
    '',
    '■ コタ用品',
    ...(prep.kota || []).map((item) => `・${item}`),
    '',
    '■ 前回反省・注意',
    ...(prep.reflection || []).map((item) => `・${item}`)
  ];
  return sections.filter((line) => line !== '').join('\n');
}

function contextSummary(context = {}) {
  const lines = [];
  if (context.weatherMemo) lines.push(`天気：${context.weatherMemo}`);
  if (context.highTemp || context.lowTemp) lines.push(`気温：最高${context.highTemp || '-'}℃ / 最低${context.lowTemp || '-'}℃`);
  if (context.rainRisk) lines.push(`降水：${context.rainRisk}`);
  if (context.peopleCount) lines.push(`人数：${context.peopleCount}人`);
  if (context.kotaGoing) lines.push(`コタ：${context.kotaGoing === 'yes' ? '同行' : '同行なし'}`);
  if (context.menuMemo) lines.push(`献立：${shorten(context.menuMemo, 30)}`);
  return lines.length ? ['','■ 条件', ...lines].join('\n') : '';
}

export function buildPrepSuggestions(reservation = {}) {
  const text = `${reservation.campground || ''} ${reservation.dateText || ''} ${reservation.address || ''} ${reservation.sourceText || ''}`;
  const suggestions = {
    packing: [...prepBase.packing],
    shopping: [...prepBase.shopping],
    kota: [...prepBase.kota],
    reflection: [...prepBase.reflection]
  };

  if (/雨|梅雨|台風|降水|荒天|ぬかるみ/.test(text)) {
    suggestions.packing.unshift('雨具 / レインウェア / 予備タオル');
    suggestions.kota.unshift('コタ用レイン対策 / 足拭き強化');
    suggestions.reflection.unshift('雨撤収を想定して収納順を決める');
  }
  if (/暑|夏|猛暑|高温|7月|8月/.test(text)) {
    suggestions.packing.unshift('暑さ対策 / 扇風機 / 冷感グッズ');
    suggestions.kota.unshift('コタの暑さ対策 / 冷却ベスト / 日陰確保');
    suggestions.shopping.unshift('氷多め / 冷たい飲み物');
  }
  if (/寒|冬|雪|氷点|12月|1月|2月|11月/.test(text)) {
    suggestions.packing.unshift('防寒着 / ストーブ燃料 / 湯たんぽ');
    suggestions.kota.unshift('コタの防寒 / ブランケット');
  }
  if (/2泊|二泊|3泊|三泊|連泊/.test(text) || Number(reservation.nights) >= 2) {
    suggestions.shopping.unshift('2泊分の朝食・飲み物を分けて確認');
    suggestions.packing.unshift('着替え・タオルを泊数分で確認');
  }
  if (/ドッグ|犬|ペット|コタ|dog|Dog/i.test(text)) {
    suggestions.kota.unshift('ペット可ルール / サイト内リード条件を確認');
  }
  return dedupeSuggestionGroups(suggestions);
}

export function normalizePrepContext(context = {}, reservation = {}) {
  return {
    weatherMemo: String(context.weatherMemo || '').trim(),
    highTemp: String(context.highTemp || '').trim(),
    lowTemp: String(context.lowTemp || '').trim(),
    rainRisk: String(context.rainRisk || '').trim(),
    windMemo: String(context.windMemo || '').trim(),
    peopleCount: String(context.peopleCount || inferPeopleCount(reservation) || '2'),
    kotaGoing: context.kotaGoing === 'no' ? 'no' : 'yes',
    menuMemo: String(context.menuMemo || '').trim(),
    pastReflection: String(context.pastReflection || '').trim(),
    gearMemo: String(context.gearMemo || '').trim()
  };
}

export function buildPracticalPrep(project = {}, context = {}) {
  const reservation = project.reservation || {};
  const base = buildPrepSuggestions({ ...reservation, sourceText: `${reservation.sourceText || ''} ${context.weatherMemo || ''} ${context.pastReflection || ''}` });
  const prep = {
    shopping: [...(base.shopping || [])],
    packing: [...(base.packing || [])],
    kota: [...(base.kota || [])],
    reflection: [...(base.reflection || [])]
  };
  const text = `${context.weatherMemo} ${context.rainRisk} ${context.windMemo} ${context.menuMemo} ${context.pastReflection} ${context.gearMemo}`;
  const high = parseOptionalNumber(context.highTemp);
  const low = parseOptionalNumber(context.lowTemp);
  const rainPercent = parseOptionalNumber(context.rainRisk);
  const people = Math.max(1, parseOptionalNumber(context.peopleCount) || Number(inferPeopleCount(reservation)) || 2);
  const nightsNum = parseNights(reservation.nights) || 1;

  prep.shopping.unshift(`飲み物・朝食を ${people}人 × ${nightsNum}泊 で確認`);
  prep.packing.unshift(`着替え・タオルを ${people}人 × ${nightsNum}泊 で確認`);

  if (context.menuMemo) {
    prependItems(prep.shopping, menuShoppingItems(context.menuMemo));
    splitMemo(context.menuMemo).slice(0, 4).forEach((line) => prep.shopping.unshift(`献立メモ：${line}`));
  }
  if (/雨|降水|梅雨|ぬかるみ|濡/.test(text) || (rainPercent !== null && rainPercent >= 40)) {
    prep.packing.unshift('濡れ物用バッグ / 予備タオル / 雨撤収セット');
    prep.reflection.unshift('雨なら乾燥サービス・撤収順を事前確認');
  }
  if (high !== null && high >= 28) {
    prep.shopping.unshift('氷多め / 冷たい飲み物 / 保冷剤予備');
    prep.packing.unshift('扇風機 / WAVE系 / EcoFlow残量確認');
    prep.kota.unshift('コタ冷却ベスト / 日陰 / 水分補給を優先');
  }
  if (low !== null && low <= 8) {
    prep.packing.unshift('ストーブ燃料 / 電源 / 寝具の防寒強化');
    prep.kota.unshift('コタ用ブランケット / 底冷え対策');
  }
  if (/風|強風|突風/.test(text)) {
    prep.packing.unshift('鍛造ペグ / ガイロープ / タープ張り方見直し');
    prep.reflection.unshift('風が強い時はタープ・幕の判断を現地で軽くする');
  }
  if (context.kotaGoing !== 'no') {
    prep.kota.unshift('ドッグカート / フード / 水 / うんち袋 / 足拭きを玄関側にまとめる');
  } else {
    prep.kota = ['コタ同行なし。ペット用品は不要または留守番側で確認'];
  }
  if (context.pastReflection) {
    prependItems(prep.reflection, reflectionActionItems(context.pastReflection));
    splitMemo(context.pastReflection).slice(0, 5).forEach((line) => prep.reflection.unshift(`前回反省メモ：${line}`));
  }
  if (context.gearMemo) {
    prependItems(prep.packing, gearPackingItems(context.gearMemo));
    splitMemo(context.gearMemo).slice(0, 5).forEach((line) => prep.packing.unshift(`ギア確認メモ：${line}`));
  }
  return dedupeSuggestionGroups(prep, 18);
}

function prependItems(target, items = []) {
  [...items].reverse().forEach((item) => {
    if (item) target.unshift(item);
  });
}

function menuShoppingItems(value) {
  const text = compactJapaneseSpacing(value);
  const items = [];
  if (/ピザ/.test(text)) {
    items.push('ピザ：チーズ / ピザソース / 具材 / 追いオリーブオイル');
  }
  if (/ガーリックシュリンプ|シュリンプ|エビ|海老|ブラックタイガー/.test(text)) {
    items.push('ガーリックシュリンプ：エビ / にんにく / バター / レモン');
  }
  if (/アヒージョ/.test(text)) {
    items.push('アヒージョ：オリーブオイル / にんにく / 具材 / バケット有無確認');
  }
  if (/ホットドッグ|ホットドック/.test(text)) {
    items.push('ホットドッグ：パン / ソーセージ / ケチャップ / マスタード');
  }
  if (/ローストビーフ/.test(text)) {
    items.push('ローストビーフ：肉 / ソース / レタス系 / パン有無確認');
  }
  if (/朝/.test(text)) {
    items.push('朝食：パン / 卵 / 飲み物を人数分で確認');
  }
  return items;
}

function gearPackingItems(value) {
  const text = compactJapaneseSpacing(value);
  const items = [];
  if (/リビングシェル/.test(text)) {
    items.push('リビングシェル：幕体 / フレーム / ペグ / 張り綱');
  }
  if (/ヘキサ|タープ/.test(text)) {
    items.push('ヘキサ・タープ：幕体 / ポール / 鍛造ペグ / ガイロープ');
  }
  if (/EcoFlow|DELTA|電源/.test(text)) {
    items.push('EcoFlow：本体 / 充電ケーブル / 残量確認');
  }
  if (/WAVE\s*3|WAVE3|ウェーブ/.test(text)) {
    items.push('WAVE3：本体 / 排気ダクト / ドレン / 予備電源');
  }
  if (/ドッグカート|カート/.test(text)) {
    items.push('ドッグカート：本体 / レインカバー / 保冷対策');
  }
  if (/IGT/.test(text)) {
    items.push('IGT：天板 / 脚 / 必要ユニット / 収納ケース');
  }
  return items;
}

function reflectionActionItems(value) {
  const text = compactJapaneseSpacing(value);
  const items = [];
  if (/雨撤収|雨.*撤収|濡/.test(text)) {
    items.push('前回反省：雨撤収用に濡れ物バッグと収納順を先に決める');
  }
  if (/タオル不足|タオル.*足り/.test(text)) {
    items.push('前回反省：人用・コタ用の予備タオルを追加');
  }
  if (/料理多すぎ|料理.*多|食材.*多/.test(text)) {
    items.push('前回反省：食材量を2人×1泊基準に絞る');
  }
  if (/忘れ物|忘れ/.test(text)) {
    items.push('前回反省：出発前夜に忘れ物チェックを実施');
  }
  if (/撤収時間|時間.*押/.test(text)) {
    items.push('前回反省：朝の撤収順と先に片付ける物を決める');
  }
  return items;
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\r/g, '\n')
    .replace(/[‐‑–—−]/g, '-')
    .replace(/[　\t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function compactJapaneseSpacing(value) {
  let text = normalizeText(value);
  // OCRで「チェ ック イ ン」「スノー ピー ク」のように分断された日本語を検索用に詰める。
  for (let i = 0; i < 4; i += 1) {
    text = text.replace(/([\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}ー])\s+([\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}ー])/gu, '$1$2');
  }
  return text;
}

function findCampground(lines, fileName) {
  const candidateLine = lines.find((line) => CAMPGROUND_WORDS.test(line) && line.length <= 42);
  if (candidateLine) return cleanupCampground(candidateLine);
  const firstMeaningful = lines.find((line) => line.length >= 3 && line.length <= 36 && !/予約|確認|日程|住所|電話|メール|金額/.test(line));
  if (firstMeaningful) return cleanupCampground(firstMeaningful);
  if (fileName) return cleanupCampground(fileName.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '));
  return '';
}

function findDateText(text) {
  const patterns = [
    /(20\d{2}[\/年.-]\s*\d{1,2}[\/月.-]\s*\d{1,2}日?\s*(?:[~〜-]\s*(?:20\d{2}[\/年.-]\s*)?\d{1,2}[\/月.-]?\s*\d{1,2}日?)?)/,
    /(\d{1,2}[\/月.-]\s*\d{1,2}日?\s*(?:[~〜-]\s*\d{1,2}[\/月.-]?\s*\d{1,2}日?)?)/,
    /(\d{1,2}\s*月\s*\d{1,2}\s*日\s*(?:[~〜-]\s*\d{1,2}\s*月?\s*\d{1,2}\s*日)?)/
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].replace(/\s+/g, ' ');
  }
  return '';
}

function findTimeByLabel(text, labels) {
  const compact = compactJapaneseSpacing(text).replace(/[：]/g, ':');
  for (const label of labels) {
    const compactLabel = compactJapaneseSpacing(label);
    const direct = compact.match(new RegExp(`${escapeRegExp(compactLabel)}[^0-9０-９]{0,20}([0-2]?[0-9][：:]\s*[0-5][0-9])`, 'i'));
    if (direct) return normalizeTime(direct[1]);
  }
  return '';
}

function findAddress(lines) {
  const line = lines.find((item) => /(東京都|北海道|(?:京都|大阪)府|.{2,3}県|市|町|村)/.test(item) && /(丁目|番地|[0-9０-９])/.test(item));
  return line ? cleanupLabel(line) : '';
}

function findCompanions(text) {
  if (/リン|琳|妻|嫁|友人|友達|夫婦/.test(text)) {
    const items = [];
    if (/リン|琳|妻|嫁/.test(text)) items.push('リン');
    if (/友人|友達/.test(text)) items.push('友人');
    if (/夫婦/.test(text)) items.push('夫婦');
    return [...new Set(items)];
  }
  return [];
}

function inferNights(dateText) {
  if (!dateText) return '';
  if (/2泊|二泊/.test(dateText)) return '2泊';
  if (/3泊|三泊/.test(dateText)) return '3泊';
  const nums = dateText.match(/\d{1,2}/g) || [];
  if (nums.length >= 4) {
    const startDay = Number(nums[nums.length - 3]);
    const endDay = Number(nums[nums.length - 1]);
    if (endDay > startDay) return `${endDay - startDay}泊`;
  }
  return '';
}

function parseNights(value) {
  const match = String(value || '').match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function inferPeopleCount(reservation = {}) {
  const companions = reservation.companions || [];
  if (companions.includes('友人')) return '4';
  return '2';
}

function splitMemo(value) {
  return String(value || '')
    .split(/[\n、,]/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function shorten(value, max = 30) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function cleanupLabel(value) {
  return String(value || '')
    .replace(/^(施設名|キャンプ場名|会場|場所|タイトル|件名)[:：\s]*/,'')
    .trim();
}

function cleanupCampground(value) {
  return cleanupLabel(value)
    // OCRの末尾ゴミ「@)」「（J」「(J」などを落とす。キャンプ場名の本体は残す。
    .replace(/[（(]\s*[@＠A-Za-z0-9]{1,5}\s*[）)]?\s*$/u, '')
    .replace(/\s*[@＠][A-Za-z0-9]?\s*[）)]?\s*$/u, '')
    .replace(/\s+[A-Za-z@＠]{1,2}[）)]?\s*$/u, '')
    .replace(/[（(]\s*$/u, '')
    .trim();
}

function calculateConfidence(values) {
  let score = 30;
  if (values.campground) score += 25;
  if (values.dateText) score += 25;
  if (values.checkIn) score += 8;
  if (values.checkOut) score += 7;
  if (values.address) score += 5;
  return Math.min(score, 95);
}

function dedupeSuggestionGroups(groups, limit = 10) {
  return Object.fromEntries(Object.entries(groups).map(([key, items]) => [key, [...new Set(items)].slice(0, limit)]));
}

function parseOptionalNumber(value) {
  const text = String(value || '').replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0));
  const match = text.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function normalizeTime(value) {
  const text = String(value || '')
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
    .replace('：', ':')
    .replace(/\s+/g, '');
  const match = text.match(/([0-2]?[0-9]):([0-5][0-9])/);
  return match ? `${Number(match[1])}:${match[2]}` : '';
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
