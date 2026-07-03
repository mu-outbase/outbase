import { prepBase } from '../../domain/schema.js?v=core05-10-jorte-refined-20260703';

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
  const title = project?.reservation?.campground || project?.title || '次の予定';
  const reservation = project?.reservation || {};
  const prep = project?.prep || {};
  const lines = [
    '【OUTBASE 準備リスト】',
    '■ 次の予定',
    [title, reservation.dateText].filter(Boolean).join(' / '),
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
    '■ 反省・注意',
    ...(prep.reflection || []).map((item) => `・${item}`)
  ];
  return lines.filter((line) => line !== '').join('\n');
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
    suggestions.shopping.unshift('泊数分の朝食・飲み物を分けて確認');
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
    routeMemo: String(context.routeMemo || '').trim(),
    setupMemo: String(context.setupMemo || '').trim(),
    campgroundSearchMemo: String(context.campgroundSearchMemo || '').trim(),
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
  const text = `${context.weatherMemo} ${context.rainRisk} ${context.windMemo} ${context.menuMemo} ${context.routeMemo} ${context.setupMemo} ${context.pastReflection} ${context.gearMemo}`;
  const high = parseOptionalNumber(context.highTemp);
  const low = parseOptionalNumber(context.lowTemp);
  const rainPercent = parseOptionalNumber(context.rainRisk);
  const people = Math.max(1, parseOptionalNumber(context.peopleCount) || Number(inferPeopleCount(reservation)) || 2);
  const nightsNum = parseNights(reservation.nights) || 1;

  prep.shopping.unshift(`飲み物・朝食を ${people}人 × ${nightsNum}泊 で確認`);
  prep.packing.unshift(`着替え・タオルを ${people}人 × ${nightsNum}泊 で確認`);

  if (context.menuMemo) {
    prependItems(prep.shopping, menuShoppingItems(context.menuMemo));
    splitMemo(context.menuMemo).slice(0, 4).forEach((line) => prep.shopping.unshift(`献立：${line}`));
  }
  if (context.routeMemo) {
    prep.reflection.unshift(`行き方：${context.routeMemo}`);
    prep.packing.unshift('出発時間 / 経由地 / 休憩ポイントを確認');
  }
  if (context.setupMemo) {
    prep.reflection.unshift(`設営・撤収：${context.setupMemo}`);
    prep.packing.unshift('設営・撤収タイマーで時間を残す');
  }
  if (context.campgroundSearchMemo) {
    prep.reflection.unshift(`キャンプ場探し条件：${context.campgroundSearchMemo}`);
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
    splitMemo(context.pastReflection).slice(0, 5).forEach((line) => prep.reflection.unshift(`前回反省：${line}`));
  }
  if (context.gearMemo) {
    prependItems(prep.packing, gearPackingItems(context.gearMemo));
    splitMemo(context.gearMemo).slice(0, 5).forEach((line) => prep.packing.unshift(`ギア確認：${line}`));
  }
  return dedupeSuggestionGroups(prep, 18);
}

function contextSummary(context = {}) {
  const lines = [];
  if (context.weatherMemo) lines.push(`天気：${context.weatherMemo}`);
  if (context.highTemp || context.lowTemp) lines.push(`気温：最高${context.highTemp || '-'}℃ / 最低${context.lowTemp || '-'}℃`);
  if (context.rainRisk) lines.push(`降水：${context.rainRisk}`);
  if (context.peopleCount) lines.push(`人数：${context.peopleCount}人`);
  if (context.kotaGoing) lines.push(`コタ：${context.kotaGoing === 'yes' ? '同行' : '同行なし'}`);
  if (context.menuMemo) lines.push(`料理：${shorten(context.menuMemo, 36)}`);
  if (context.routeMemo) lines.push(`行き方：${shorten(context.routeMemo, 36)}`);
  if (context.setupMemo) lines.push(`設営撤収：${shorten(context.setupMemo, 36)}`);
  return lines.length ? ['', '■ 条件', ...lines].join('\n') : '';
}

function menuShoppingItems(value) {
  const text = compactJapaneseSpacing(value);
  const items = [];
  if (/ピザ/.test(text)) items.push('ピザ：チーズ / ピザソース / 具材 / 追いオリーブオイル');
  if (/ガーリックシュリンプ|シュリンプ|エビ|海老|ブラックタイガー/.test(text)) items.push('ガーリックシュリンプ：エビ / にんにく / バター / レモン');
  if (/アヒージョ/.test(text)) items.push('アヒージョ：オリーブオイル / にんにく / 具材 / バケット有無確認');
  if (/ホットドッグ|ホットドック/.test(text)) items.push('ホットドッグ：パン / ソーセージ / ケチャップ / マスタード');
  if (/ローストビーフ/.test(text)) items.push('ローストビーフ：肉 / ソース / レタス系 / パン有無確認');
  if (/朝/.test(text)) items.push('朝食：パン / 卵 / 飲み物を人数分で確認');
  return items;
}

function gearPackingItems(value) {
  const text = compactJapaneseSpacing(value);
  const items = [];
  if (/リビングシェル/.test(text)) items.push('リビングシェル：幕体 / フレーム / ペグ / 張り綱');
  if (/ヘキサ|タープ/.test(text)) items.push('ヘキサ・タープ：幕体 / ポール / 鍛造ペグ / ガイロープ');
  if (/EcoFlow/.test(text)) items.push('EcoFlow：本体 / 充電ケーブル / 残量確認');
  if (/WAVE3|WAVE/.test(text)) items.push('WAVE3：本体 / 排気ダクト / ドレン / 予備電源');
  if (/ドッグカート|AirBuggy/.test(text)) items.push('ドッグカート：本体 / レインカバー / 保冷対策');
  return items;
}

function reflectionActionItems(value) {
  const text = compactJapaneseSpacing(value);
  const items = [];
  if (/雨|撤収|濡/.test(text)) items.push('雨撤収用に濡れ物バッグと収納順を先に決める');
  if (/タオル|不足/.test(text)) items.push('人用・コタ用の予備タオルを追加');
  if (/料理|多すぎ|余り/.test(text)) items.push('食材量を2人×1泊基準に絞る');
  if (/忘れ/.test(text)) items.push('前回の忘れ物を確認');
  return items;
}

function prependItems(target, items = []) {
  [...items].reverse().forEach((item) => { if (item) target.unshift(item); });
}

function splitMemo(value = '') {
  return String(value).split(/[\n、,・/]+/).map((line) => line.trim()).filter(Boolean);
}

function parseOptionalNumber(value) {
  const match = String(value || '').match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function parseNights(value) {
  const match = String(value || '').match(/\d+/);
  return match ? Number(match[0]) : null;
}

function inferPeopleCount(reservation = {}) {
  const text = `${reservation.companions || ''} ${reservation.sourceText || ''}`;
  if (/友人|夫婦|4人|四人/.test(text)) return '4';
  if (/リン|妻|夫婦|2人|二人/.test(text)) return '2';
  return '';
}

function findCampground(lines = [], fileName = '') {
  const hit = lines.find((line) => CAMPGROUND_WORDS.test(line));
  if (hit) return sanitizeCampground(hit);
  if (fileName && CAMPGROUND_WORDS.test(fileName)) return sanitizeCampground(fileName.replace(/\.[a-z0-9]+$/i, ''));
  return '未確定';
}

function sanitizeCampground(value = '') {
  return compactJapaneseSpacing(value).replace(/(予約|確認|詳細|利用|日程|チェック.*)$/g, '').trim().slice(0, 48) || '未確定';
}

function findDateText(text = '') {
  const patterns = [
    /20\d{2}[\/.-]\d{1,2}[\/.-]\d{1,2}\s*[-〜~－]\s*(?:20\d{2}[\/.-])?\d{1,2}[\/.-]\d{1,2}/,
    /20\d{2}年\d{1,2}月\d{1,2}日\s*[-〜~－]\s*(?:20\d{2}年)?\d{1,2}月\d{1,2}日/,
    /20\d{2}[\/.-]\d{1,2}[\/.-]\d{1,2}/
  ];
  const hit = patterns.map((pattern) => text.match(pattern)?.[0]).find(Boolean);
  return hit ? hit.replace(/[.]/g, '/') : '未確定';
}

function findTimeByLabel(text = '', labels = []) {
  for (const label of labels) {
    const regex = new RegExp(`${label}[^0-9]{0,12}(\\d{1,2}:\\d{2})`, 'i');
    const hit = text.match(regex);
    if (hit) return hit[1];
  }
  return '未確定';
}

function findAddress(lines = []) {
  return lines.find((line) => /(県|都|府|道).+(市|町|村|区)/.test(line)) || '未確定';
}

function inferNights(dateText = '') {
  if (!dateText || dateText === '未確定') return '未確定';
  const dates = dateText.match(/20\d{2}[\/.-]\d{1,2}[\/.-]\d{1,2}|\d{1,2}[\/.-]\d{1,2}/g) || [];
  if (dates.length < 2) return '未確定';
  try {
    const start = parseDate(dates[0]);
    const end = parseDate(dates[1], start.getFullYear());
    const diff = Math.round((end - start) / 86400000);
    return diff > 0 ? `${diff}泊` : '未確定';
  } catch {
    return '未確定';
  }
}

function parseDate(value, fallbackYear = new Date().getFullYear()) {
  const parts = String(value).split(/[\/.-]/).map(Number);
  if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2]);
  return new Date(fallbackYear, parts[0] - 1, parts[1]);
}

function findCompanions(text = '') {
  const items = [];
  if (/リン|妻|嫁/.test(text)) items.push('リン');
  if (/コタ|犬|ペット/.test(text)) items.push('コタ');
  if (/友人|友達/.test(text)) items.push('友人');
  return items.join(' / ');
}

function calculateConfidence(values = {}) {
  let score = 25;
  if (values.campground && values.campground !== '未確定') score += 30;
  if (values.dateText && values.dateText !== '未確定') score += 25;
  if (values.checkIn && values.checkIn !== '未確定') score += 10;
  if (values.checkOut && values.checkOut !== '未確定') score += 10;
  return Math.min(95, score);
}

function dedupeSuggestionGroups(groups = {}, limit = 14) {
  return Object.fromEntries(Object.entries(groups).map(([key, items]) => [key, [...new Set((items || []).filter(Boolean))].slice(0, limit)]));
}

function normalizeText(value = '') {
  return String(value).replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').trim();
}

function compactJapaneseSpacing(value = '') {
  return String(value)
    .replace(/([ァ-ヶー一-龠ぁ-ん])\s+([ァ-ヶー一-龠ぁ-ん])/g, '$1$2')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function shorten(value = '', length = 30) {
  const text = String(value).trim();
  return text.length > length ? `${text.slice(0, length)}…` : text;
}
