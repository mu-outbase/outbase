import { prepBase } from '../../domain/schema.js';

const CAMPGROUND_WORDS = /(キャンプ場|キャンプフィールド|オートキャンプ|Camp|CAMP|camp|ロッジ|Lodge|LODGE|グランピング|RV|スノーピーク|Snow Peak|ほったらかし|ふもとっぱら|那須|赤城|鹿沼|白河|山中湖)/;

export function extractReservationCandidate(rawText = '', sourceType = 'text', fileName = '') {
  const normalized = normalizeText(rawText);
  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  const campground = findCampground(lines, fileName);
  const dateText = findDateText(normalized);
  const checkIn = findTimeByLabel(normalized, ['チェックイン', 'IN', '入場', '到着']);
  const checkOut = findTimeByLabel(normalized, ['チェックアウト', 'OUT', '退場', '退出']);
  const address = findAddress(lines);
  const nights = inferNights(dateText);
  const companions = findCompanions(normalized);
  const confidence = calculateConfidence({ campground, dateText, checkIn, checkOut, address });
  const prep = buildPrepSuggestions({ campground, dateText, nights, checkIn, checkOut, address, sourceText: normalized });
  return {
    candidate_id: `candidate_${Date.now()}`,
    source: fileName || sourceType,
    sourceType,
    confidence,
    status: 'needs_review',
    payload: {
      title: campground && dateText ? `${campground} ${dateText}` : campground || '次のキャンプ候補',
      reservation: { campground, dateText, nights, checkIn, checkOut, address, companions, sourceType, sourceText: normalized },
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

export function buildLineList(project) {
  const title = project?.title || '次のキャンプ';
  const reservation = project?.reservation || {};
  const prep = project?.prep || {};
  const sections = [
    '【OUTBASE 買い物・準備リスト】',
    '■ 次のキャンプ',
    title,
    reservation.dateText ? `日程：${reservation.dateText}` : '',
    reservation.checkIn ? `チェックイン：${reservation.checkIn}` : '',
    reservation.checkOut ? `チェックアウト：${reservation.checkOut}` : '',
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

function normalizeText(value) {
  return String(value || '')
    .replace(/\r/g, '\n')
    .replace(/[‐‑–—−]/g, '-')
    .replace(/[　\t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function findCampground(lines, fileName) {
  const candidateLine = lines.find((line) => CAMPGROUND_WORDS.test(line) && line.length <= 42);
  if (candidateLine) return cleanupLabel(candidateLine);
  const firstMeaningful = lines.find((line) => line.length >= 3 && line.length <= 36 && !/予約|確認|日程|住所|電話|メール|金額/.test(line));
  if (firstMeaningful) return cleanupLabel(firstMeaningful);
  if (fileName) return fileName.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
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
  const label = labels.join('|');
  const pattern = new RegExp(`(?:${label})[^0-9]{0,12}(\\d{1,2}:\\d{2})`, 'i');
  const match = text.match(pattern);
  return match ? match[1] : '';
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

function cleanupLabel(value) {
  return String(value || '')
    .replace(/^(施設名|キャンプ場名|会場|場所|タイトル|件名)[:：\s]*/,'')
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

function dedupeSuggestionGroups(groups) {
  return Object.fromEntries(Object.entries(groups).map(([key, items]) => [key, [...new Set(items)].slice(0, 10)]));
}
