import { prepBase } from '../../domain/schema.js?v=core07-2-prep-dashboard-20260705';

const CAMPGROUND_WORDS = /(キャンプ場|キャンプフィールド|オートキャンプ|Camp|CAMP|camp|ロッジ|Lodge|LODGE|グランピング|RV|スノーピーク|Snow Peak|ほったらかし|ふもとっぱら|那須|赤城|鹿沼|白河|山中湖)/;
const MEAL_MODE_LABELS = ['絶対やりたい', '過去と違う', '無駄なし', '調理器具から', '映え', '量少なめ', 'もう1品', '付け合わせ', 'おつまみ', '火を使わない', '雨でもOK', '設営ラク'];

export function extractReservationCandidate(rawText = '', sourceType = 'text', fileName = '') {
  const normalized = normalizeText(rawText);
  const compact = compactJapaneseSpacing(normalized);
  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  const campground = findCampground(lines, fileName);
  const dateText = findDateText(compact);
  const checkIn = findTimeByLabel(compact, ['チェックイン', 'IN', '入場', '到着']);
  const checkOut = findTimeByLabel(compact, ['チェックアウト', 'OUT', '退場', '退出']);
  const address = findAddress(lines);
  const nights = inferNights(dateText);
  const companions = findCompanions(compact);
  const confidence = calculateConfidence({ campground, dateText, checkIn, checkOut, address });
  const prep = buildPrepSuggestions({ campground, dateText, nights, checkIn, checkOut, address, sourceText: compact });
  return {
    candidate_id: `candidate_${Date.now()}`,
    source: fileName || sourceType,
    sourceType,
    confidence,
    status: 'needs_review',
    payload: {
      title: campground && dateText ? `${campground} ${dateText}` : campground || '次のキャンプ候補',
      reservation: { campground, dateText, nights, checkIn, checkOut, address, companions, sourceType, sourceText: compact },
      prep
    }
  };
}

export function createProjectFromCandidate(candidate) {
  const reservation = candidate?.payload?.reservation || {};
  const prep = candidate?.payload?.prep || buildPrepSuggestions(reservation);
  return { id: `project_${Date.now()}`, title: candidate?.payload?.title || reservation.campground || '次のキャンプ', status: 'planning', sourceCandidateId: candidate?.candidate_id || null, reservation, prep, createdAt: new Date().toISOString() };
}

export function mealModeLabels() {
  return [...MEAL_MODE_LABELS];
}

export function normalizePrepContext(context = {}, reservation = {}) {
  return {
    weatherMemo: String(context.weatherMemo || '').trim(),
    weatherHourlyMemo: String(context.weatherHourlyMemo || '').trim(),
    highTemp: String(context.highTemp || '').trim(),
    lowTemp: String(context.lowTemp || '').trim(),
    rainRisk: String(context.rainRisk || '').trim(),
    windMemo: String(context.windMemo || '').trim(),
    humidityMemo: String(context.humidityMemo || '').trim(),
    thunderMemo: String(context.thunderMemo || '').trim(),
    siteAltitude: String(context.siteAltitude || '').trim(),
    dryServiceMemo: String(context.dryServiceMemo || '').trim(),
    cancelFreeUntil: String(context.cancelFreeUntil || '').trim(),
    cancelFeeStart: String(context.cancelFeeStart || '').trim(),
    cancelDecisionStatus: String(context.cancelDecisionStatus || '保留').trim(),
    weatherDecisionMemo: String(context.weatherDecisionMemo || '').trim(),
    peopleCount: String(context.peopleCount || inferPeopleCount(reservation) || '2'),
    kotaGoing: context.kotaGoing === 'no' ? 'no' : 'yes',
    menuMemo: String(context.menuMemo || '').trim(),
    routeMemo: String(context.routeMemo || '').trim(),
    setupMemo: String(context.setupMemo || '').trim(),
    campgroundSearchMemo: String(context.campgroundSearchMemo || '').trim(),
    pastReflection: String(context.pastReflection || '').trim(),
    gearMemo: String(context.gearMemo || '').trim(),
    gearLedgerMemo: String(context.gearLedgerMemo || '').trim(),
    fixedDishMemo: String(context.fixedDishMemo || '').trim(),
    extraNeedMemo: String(context.extraNeedMemo || '').trim(),
    availableFoodMemo: String(context.availableFoodMemo || '').trim(),
    missingFoodMemo: String(context.missingFoodMemo || '').trim(),
    localChangeMemo: String(context.localChangeMemo || '').trim(),
    mealModes: Array.isArray(context.mealModes) ? context.mealModes.filter(Boolean) : splitMemo(context.mealModes || '')
  };
}

export function buildPrepModel(project = {}, context = {}) {
  const reservation = project?.reservation || {};
  const normalized = normalizePrepContext(context, reservation);
  const practicalPrep = buildPracticalPrep(project, normalized);
  const meals = buildMealSlots(normalized);
  const shoppingItems = buildShoppingItems(meals, normalized, practicalPrep);
  const commonFoods = shoppingItems.filter((item) => item.uses.length > 1 || item.common).slice(0, 6);
  const suggestions = buildMealSuggestions(meals, normalized, shoppingItems);
  const recovery = buildRecoveryItems(normalized);
  const weatherDecision = buildWeatherDecision(project, normalized);
  const gear = buildGearModel(project, normalized, practicalPrep, meals, weatherDecision);
  const kota = buildKotaModel(normalized, practicalPrep, reservation, weatherDecision);
  const route = buildRouteModel(project, normalized, weatherDecision);
  const alerts = buildAlerts(meals, shoppingItems, gear, kota, route, normalized, recovery, weatherDecision);
  const topActions = buildTopActions(weatherDecision, meals, shoppingItems, gear, kota, route, normalized, recovery);
  return { project, reservation, context: normalized, prep: practicalPrep, meals, shoppingItems, commonFoods, suggestions, recovery, gear, kota, route, weatherDecision, topActions, alerts };
}

export function buildLineList(project, context = {}) {
  const model = buildPrepModel(project, context);
  return [
    buildWeatherDecisionLineList(model),
    '',
    buildShoppingLineList(model),
    '',
    buildMealLineList(model),
    '',
    buildDepartureLineList(model)
  ].filter(Boolean).join('\n');
}

export function buildShoppingLineList(input, context = {}) {
  const model = input?.shoppingItems ? input : buildPrepModel(input, context);
  const lines = ['【買物リスト】'];
  model.shoppingItems.slice(0, 24).forEach((item) => {
    const uses = item.uses.length ? `（${item.uses.join(' / ')}）` : '';
    const amount = item.amount ? ` ${item.amount}` : '';
    const status = item.status && item.status !== '買う' ? `［${item.status}］` : '';
    lines.push(`・${item.name}${amount}${uses}${status}`);
    if (item.alternatives?.length) lines.push(`  代替：${item.alternatives.join(' / ')}`);
  });
  if (model.commonFoods.length) lines.push('', '■ 共通食材', ...model.commonFoods.map((item) => `・${item.name}：${item.uses.join(' / ')}`));
  if (model.recovery.localBuy.length) lines.push('', '■ 現地で買う/確認', ...model.recovery.localBuy.map((item) => `・${item}`));
  return lines.join('\n');
}

export function buildMealLineList(input, context = {}) {
  const model = input?.meals ? input : buildPrepModel(input, context);
  const lines = ['【料理計画】'];
  model.meals.forEach((meal) => lines.push(`・${meal.label}：${meal.menu || meal.fallback}`));
  if (model.suggestions.length) lines.push('', '■ 追加候補', ...model.suggestions.slice(0, 5).map((item) => `・${item.title}：${item.reason}`));
  if (model.context.mealModes.length) lines.push('', `条件：${model.context.mealModes.join(' / ')}`);
  return lines.join('\n');
}

export function buildDepartureLineList(input, context = {}) {
  const model = input?.route ? input : buildPrepModel(input, context);
  const route = model.route;
  const lines = ['【出発予定】', `・出発：${route.departure || '未設定'}`, `・目的地：${route.destination || '未設定'}`, `・チェックイン：${route.checkIn || '未設定'}`];
  if (route.stops.length) lines.push(`・経由地：${route.stops.join(' / ')}`);
  if (route.kotaBreak) lines.push('・コタ休憩：あり');
  if (model.weatherDecision?.routeAdvice?.length) lines.push('', '■ 天気による出発判断', ...model.weatherDecision.routeAdvice.map((item) => `・${item}`));
  return lines.join('\n');
}

export function buildWeatherDecisionLineList(input, context = {}) {
  const model = input?.weatherDecision ? input : buildPrepModel(input, context);
  const w = model.weatherDecision;
  const lines = ['【詳細天気・判断】', `・状態：${w.statusLabel}`, `・無料キャンセル期限：${w.cancelFreeUntil || '未設定'}`, `・判断：${w.recommendation}`];
  if (w.riskItems.length) lines.push('', '■ 天気リスク', ...w.riskItems.map((item) => `・${item}`));
  if (w.decisionItems.length) lines.push('', '■ 判断材料', ...w.decisionItems.map((item) => `・${item}`));
  if (w.crossImpacts.length) lines.push('', '■ 準備への影響', ...w.crossImpacts.map((item) => `・${item}`));
  return lines.join('\n');
}

export function buildPrepSuggestions(reservation = {}) {
  const text = `${reservation.campground || ''} ${reservation.dateText || ''} ${reservation.address || ''} ${reservation.sourceText || ''}`;
  const suggestions = { packing: [...prepBase.packing], shopping: [...prepBase.shopping], kota: [...prepBase.kota], reflection: [...prepBase.reflection] };
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
  if (/ドッグ|犬|ペット|コタ|dog|Dog/i.test(text)) suggestions.kota.unshift('ペット可ルール / サイト内リード条件を確認');
  return dedupeSuggestionGroups(suggestions);
}

export function buildPracticalPrep(project = {}, context = {}) {
  const reservation = project.reservation || {};
  const normalized = normalizePrepContext(context, reservation);
  const base = buildPrepSuggestions({ ...reservation, sourceText: `${reservation.sourceText || ''} ${normalized.weatherMemo || ''} ${normalized.pastReflection || ''}` });
  const prep = { shopping: [...(base.shopping || [])], packing: [...(base.packing || [])], kota: [...(base.kota || [])], reflection: [...(base.reflection || [])] };
  const text = `${normalized.weatherMemo} ${normalized.rainRisk} ${normalized.windMemo} ${normalized.menuMemo} ${normalized.fixedDishMemo} ${normalized.extraNeedMemo} ${normalized.availableFoodMemo} ${normalized.missingFoodMemo} ${normalized.localChangeMemo} ${normalized.routeMemo} ${normalized.setupMemo} ${normalized.pastReflection} ${normalized.gearMemo}`;
  const high = parseOptionalNumber(normalized.highTemp);
  const low = parseOptionalNumber(normalized.lowTemp);
  const rainPercent = parseOptionalNumber(normalized.rainRisk);
  const weatherText = `${normalized.weatherMemo} ${normalized.weatherHourlyMemo} ${normalized.rainRisk} ${normalized.windMemo} ${normalized.thunderMemo} ${normalized.humidityMemo}`;
  const people = Math.max(1, parseOptionalNumber(normalized.peopleCount) || Number(inferPeopleCount(reservation)) || 2);
  const nightsNum = parseNights(reservation.nights) || 1;
  prep.shopping.unshift(`飲み物・朝食を ${people}人 × ${nightsNum}泊 で確認`);
  prep.packing.unshift(`着替え・タオルを ${people}人 × ${nightsNum}泊 で確認`);
  if (normalized.menuMemo || normalized.fixedDishMemo) {
    const menuText = `${normalized.menuMemo}\n${normalized.fixedDishMemo}`;
    prependItems(prep.shopping, menuShoppingItems(menuText));
    splitMemo(menuText).slice(0, 5).forEach((line) => prep.shopping.unshift(`献立：${line}`));
  }
  if (normalized.extraNeedMemo) prep.shopping.unshift(`追加1品：${normalized.extraNeedMemo}`);
  if (normalized.availableFoodMemo) prep.reflection.unshift(`現地で使える食材：${normalized.availableFoodMemo}`);
  if (normalized.missingFoodMemo) prep.reflection.unshift(`忘れ物対応：${normalized.missingFoodMemo}`);
  if (normalized.localChangeMemo) prep.reflection.unshift(`現地変更：${normalized.localChangeMemo}`);
  if (normalized.routeMemo) { prep.reflection.unshift(`行き方：${normalized.routeMemo}`); prep.packing.unshift('出発時間 / 経由地 / 休憩ポイントを確認'); }
  if (normalized.setupMemo) { prep.reflection.unshift(`設営・撤収：${normalized.setupMemo}`); prep.packing.unshift('設営・撤収タイマーで時間を残す'); }
  if (normalized.campgroundSearchMemo) prep.reflection.unshift(`キャンプ場探し条件：${normalized.campgroundSearchMemo}`);
  if (/雨|降水|梅雨|ぬかるみ|濡/.test(text) || (rainPercent !== null && rainPercent >= 40)) { prep.packing.unshift('濡れ物用バッグ / 予備タオル / 雨撤収セット'); prep.reflection.unshift('雨なら乾燥サービス・撤収順を事前確認'); }
  if (high !== null && high >= 28) { prep.shopping.unshift('氷多め / 冷たい飲み物 / 保冷剤予備'); prep.packing.unshift('扇風機 / WAVE系 / EcoFlow残量確認'); prep.kota.unshift('コタ冷却ベスト / 日陰 / 水分補給を優先'); }
  if (low !== null && low <= 8) { prep.packing.unshift('ストーブ燃料 / 電源 / 寝具の防寒強化'); prep.kota.unshift('コタ用ブランケット / 底冷え対策'); }
  if (/風|強風|突風/.test(text)) { prep.packing.unshift('鍛造ペグ / ガイロープ / タープ張り方見直し'); prep.reflection.unshift('風が強い時はタープ・幕の判断を現地で軽くする'); }
  if (normalized.kotaGoing !== 'no') prep.kota.unshift('ドッグカート / フード / 足拭き / 予備リードを玄関側にまとめる');
  else prep.kota = ['コタ同行なし。ペット用品は不要または留守番側で確認'];
  if (normalized.pastReflection) { prependItems(prep.reflection, reflectionActionItems(normalized.pastReflection)); splitMemo(normalized.pastReflection).slice(0, 5).forEach((line) => prep.reflection.unshift(`前回反省：${line}`)); }
  if (normalized.gearMemo) { prependItems(prep.packing, gearPackingItems(normalized.gearMemo)); splitMemo(normalized.gearMemo).slice(0, 5).forEach((line) => prep.packing.unshift(`ギア確認：${line}`)); }
  return dedupeSuggestionGroups(prep, 20);
}

function buildMealSlots(context) {
  const menu = `${context.menuMemo}\n${context.fixedDishMemo}`.trim();
  const slots = [
    ['1日目 朝', '1日目朝', '出発前/車内/コンビニ'],
    ['1日目 昼', '1日目昼', '移動中/現地軽食'],
    ['1日目 夜', '1日目夜', menu || 'キャンプ飯'],
    ['2日目 朝', '2日目朝', 'キャンプ朝食'],
    ['2日目 昼', '2日目昼', '帰り道/なし'],
    ['2日目 夜', '2日目夜', '帰宅後']
  ];
  return slots.map(([label, key, fallback]) => ({ label, key, menu: extractMeal(menu, key), fallback }));
}

function buildShoppingItems(meals, context, prep) {
  const items = [];
  const menuText = meals.map((meal) => `${meal.label}:${meal.menu || meal.fallback}`).join('\n');
  addDishItems(items, 'ガーリックシュリンプ', /ガーリックシュリンプ|シュリンプ|エビ|海老|ブラックタイガー/.test(menuText), ['エビ', 'にんにく', 'バター', 'オリーブオイル', 'レモン', '黒こしょう', 'パセリ'], meals);
  addDishItems(items, 'ピザ', /ピザ/.test(menuText), ['ピザ生地', 'チーズ', 'ピザソース', '具材', 'オリーブオイル'], meals);
  addDishItems(items, 'アヒージョ', /アヒージョ/.test(menuText), ['オリーブオイル', 'にんにく', '具材', 'バケット'], meals);
  addDishItems(items, 'ホットサンド', /ホットサンド/.test(menuText), ['食パン', 'チーズ', 'ハム', 'バター'], meals);
  addDishItems(items, 'カプレーゼ', /カプレーゼ|ブラータ|トマト/.test(menuText), ['トマト', 'ブラータチーズ', 'オリーブオイル', '塩'], meals);
  splitMemo(context.extraNeedMemo).forEach((name) => addItem(items, name, { uses: ['追加1品'], status: '候補' }));
  splitMemo(context.availableFoodMemo).forEach((name) => addItem(items, name, { uses: ['現地食材'], status: '現地あり' }));
  splitMemo(context.missingFoodMemo).forEach((name) => addItem(items, name, { uses: ['忘れ物対応'], status: '忘れた' }));
  (prep.shopping || []).slice(0, 10).forEach((name) => addItem(items, cleanupPrepItem(name), { uses: ['準備メモ'], status: '確認' }));
  return normalizeShoppingItems(items);
}

function addDishItems(items, dish, active, names, meals) {
  if (!active) return;
  const useSlots = meals.filter((meal) => `${meal.menu} ${meal.fallback}`.includes(dish) || names.some((name) => `${meal.menu} ${meal.fallback}`.includes(name))).map((meal) => meal.label);
  names.forEach((name) => addItem(items, name, { uses: useSlots.length ? useSlots.map((slot) => `${slot} ${dish}`) : [dish], amount: amountFor(name), alternatives: alternativesFor(name), common: commonFood(name) }));
}

function addItem(items, name, options = {}) {
  const clean = String(name || '').replace(/^献立：/, '').trim();
  if (!clean) return;
  items.push({ name: clean, amount: options.amount || amountFor(clean), uses: options.uses || [], status: options.status || '買う', alternatives: options.alternatives || alternativesFor(clean), common: Boolean(options.common || commonFood(clean)), note: options.note || '' });
}

function normalizeShoppingItems(items) {
  const map = new Map();
  items.forEach((item) => {
    const key = item.name.replace(/：.*$/, '').trim();
    if (!key) return;
    const current = map.get(key) || { ...item, name: key, uses: [], alternatives: [] };
    current.uses = [...new Set([...(current.uses || []), ...(item.uses || [])].filter(Boolean))];
    current.alternatives = [...new Set([...(current.alternatives || []), ...(item.alternatives || [])].filter(Boolean))];
    current.common = current.common || current.uses.length > 1;
    if (item.status === '忘れた' || item.status === '現地あり') current.status = item.status;
    map.set(key, current);
  });
  return [...map.values()].slice(0, 28);
}

function buildMealSuggestions(meals, context, shoppingItems) {
  const modes = new Set(context.mealModes || []);
  const suggestions = [];
  if (modes.has('映え')) suggestions.push(cardSuggestion('ブラータカプレーゼ', '映え小皿。トマトとチーズで写真に残りやすい', ['トマト', 'ブラータチーズ'], '映え'));
  if (modes.has('おつまみ') || modes.has('もう1品')) suggestions.push(cardSuggestion('焼きカマンベール', 'スキレットで軽く出せるおつまみ', ['カマンベール', 'はちみつ'], 'おつまみ'));
  if (modes.has('付け合わせ') || modes.has('量少なめ')) suggestions.push(cardSuggestion('たたききゅうり', '火を使わず口直しになる', ['きゅうり', '塩', 'ごま油'], '付け合わせ'));
  if (modes.has('無駄なし')) {
    const common = shoppingItems.find((item) => /チーズ|バター|にんにく|トマト/.test(item.name));
    suggestions.push(cardSuggestion(common ? `${common.name}を使う追加1品` : '余り食材の小皿', '共通食材を使って買い足しを抑える', common ? [common.name] : [], '無駄なし'));
  }
  if (modes.has('火を使わない') || /雨|暑/.test(context.weatherMemo)) suggestions.push(cardSuggestion('チーズと生ハムの皿', '火を使わずすぐ出せる', ['チーズ', '生ハム'], '火を使わない'));
  if (!suggestions.length) suggestions.push(cardSuggestion('追加1品を選ぶ', '映え・おつまみ・無駄なしなど条件を複数選択', [], '提案'));
  return suggestions.slice(0, 6);
}

function buildRecoveryItems(context) {
  const missing = splitMemo(context.missingFoodMemo);
  const localChanges = splitMemo(context.localChangeMemo);
  const available = splitMemo(context.availableFoodMemo);
  const localBuy = missing.filter(Boolean);
  const alternatives = missing.map((item) => ({ name: item, choices: alternativesFor(item).length ? alternativesFor(item) : ['なしで作る', '買い足す', '料理を変更する'] }));
  return { missing, localChanges, available, localBuy, alternatives };
}


function buildWeatherDecision(project, context) {
  const reservation = project?.reservation || {};
  const weatherText = `${context.weatherMemo} ${context.weatherHourlyMemo} ${context.rainRisk} ${context.windMemo} ${context.thunderMemo} ${context.humidityMemo} ${context.weatherDecisionMemo}`;
  const riskItems = [];
  const decisionItems = [];
  const crossImpacts = [];
  const routeAdvice = [];
  const gearAdvice = [];
  const mealAdvice = [];
  const kotaAdvice = [];
  const rainPercent = parseOptionalNumber(context.rainRisk);
  const high = parseOptionalNumber(context.highTemp);
  const low = parseOptionalNumber(context.lowTemp);
  const wind = parseOptionalNumber(context.windMemo);
  if (context.weatherHourlyMemo) riskItems.push(`時間別：${shorten(context.weatherHourlyMemo, 54)}`);
  if (/雨|降水|土砂降り|豪雨|荒天|濡|梅雨/.test(weatherText) || (rainPercent && rainPercent >= 40)) {
    riskItems.push(`雨：${context.rainRisk || '雨リスクあり'}`);
    decisionItems.push('無料キャンセル期限前に雨量と撤収日を再確認');
    crossImpacts.push('雨 → 料理は簡単寄り / 雨撤収セット / 乾燥サービス確認');
    mealAdvice.push('雨なら火数を減らして簡単飯寄り');
    gearAdvice.push('雨撤収セット / 予備タオル / 濡れ物袋');
    routeAdvice.push('雨が来る前に設営できる出発時間へ寄せる');
    kotaAdvice.push('足拭きタオルとレイン対策');
  }
  if (/風|強風/.test(weatherText) || (wind && wind >= 5)) {
    riskItems.push(`風：${context.windMemo || `${wind}m前後`}`);
    decisionItems.push('風が強い時間帯はタープ・焚き火・外調理を慎重に判断');
    crossImpacts.push('風 → タープ慎重 / ペグ強化 / 外調理を減らす');
    gearAdvice.push('鍛造ペグ / ガイロープ / タープ張るか判断');
    mealAdvice.push('風が強ければスキレット料理は風裏で短時間');
  }
  if (/雷/.test(weatherText)) {
    riskItems.push('雷：屋外活動停止レベルならキャンセル検討');
    decisionItems.push('雷予報が残るなら無料期限前の判断を優先');
  }
  if (high && high >= 28) {
    riskItems.push(`暑さ：最高${high}℃`);
    decisionItems.push('コタの暑さ負担とWAVE3/EcoFlowを確認');
    crossImpacts.push('暑い → WAVE3 / EcoFlow / コタ冷却 / 火を使いすぎない料理');
    kotaAdvice.push('冷却用品 / 水分 / 日陰 / カート');
    gearAdvice.push('WAVE3 / EcoFlow / 扇風機 / 日陰づくり');
    mealAdvice.push('暑い日は火を使いすぎない料理を混ぜる');
  }
  if (low !== null && low <= 10) {
    riskItems.push(`冷え込み：最低${low}℃`);
    decisionItems.push('夜の防寒・寝具を追加');
    crossImpacts.push('寒い → 寝具 / 暖房 / 温かい夜ごはん');
    gearAdvice.push('防寒着 / 寝具 / 暖房');
  }
  if (/撤収|日曜|翌朝|最終日/.test(weatherText) && /雨|降水|濡/.test(weatherText)) {
    riskItems.push('撤収日：雨リスク');
    decisionItems.push('乾燥サービス・早撤収・濡れ物収納を確認');
    crossImpacts.push('撤収雨 → 乾燥サービス / タオル / 濡れ物袋 / 早撤収判断');
  }
  if (context.dryServiceMemo) decisionItems.push(`乾燥サービス：${context.dryServiceMemo}`);
  if (context.siteAltitude) decisionItems.push(`標高/寒暖差：${context.siteAltitude}`);
  if (context.weatherDecisionMemo) decisionItems.push(`判断メモ：${context.weatherDecisionMemo}`);
  if (!riskItems.length) {
    riskItems.push('詳細天気未入力：1時間ごとの雨・風・気温を確認');
    decisionItems.push('無料キャンセル期限までに最新予報で判断');
  }
  const riskScore = Math.min(100, riskItems.length * 18 + (rainPercent && rainPercent >= 50 ? 16 : 0) + (wind && wind >= 5 ? 14 : 0) + (high && high >= 30 ? 12 : 0));
  const cancelFreeUntil = context.cancelFreeUntil || reservation.cancelFreeUntil || '';
  const status = context.cancelDecisionStatus || '保留';
  const recommendation = buildWeatherRecommendation(riskScore, status, cancelFreeUntil);
  const statusLabel = cancelFreeUntil ? `${status} / 無料期限 ${cancelFreeUntil}` : `${status} / 無料期限未設定`;
  return { cancelFreeUntil, cancelFeeStart: context.cancelFeeStart, status, statusLabel, riskScore, recommendation, riskItems: dedupe(riskItems).slice(0, 6), decisionItems: dedupe(decisionItems).slice(0, 6), crossImpacts: dedupe(crossImpacts).slice(0, 6), routeAdvice: dedupe(routeAdvice).slice(0, 4), gearAdvice: dedupe(gearAdvice).slice(0, 5), mealAdvice: dedupe(mealAdvice).slice(0, 4), kotaAdvice: dedupe(kotaAdvice).slice(0, 5) };
}

function buildWeatherRecommendation(riskScore, status, cancelFreeUntil) {
  if (status === '行く') return '行く前提。天気リスク分のギアとルートを固める';
  if (status === 'キャンセル検討') return 'キャンセル寄り。無料期限前に最新予報で最終判断';
  if (!cancelFreeUntil) return '無料キャンセル期限を登録して、判断日を見える化する';
  if (riskScore >= 70) return 'かなり慎重。無料期限前に行く/キャンセルを決める';
  if (riskScore >= 40) return '保留。雨・風・撤収日の予報を期限前に再確認';
  return '行く寄り。通常準備を進めつつ天気だけ継続確認';
}

function buildTopActions(weatherDecision, meals, shoppingItems, gear, kota, route, context, recovery) {
  const actions = [];
  if (!weatherDecision.cancelFreeUntil) actions.push('無料キャンセル期限を登録');
  if (weatherDecision.riskScore >= 40) actions.push('無料期限前に天気で行く/キャンセル判断');
  if (!context.weatherHourlyMemo && !context.weatherMemo) actions.push('1時間ごとの雨・風・気温を確認');
  if (!meals.find((meal) => meal.label === '2日目 朝')?.menu) actions.push('2日目朝ごはんを決める');
  if (!route.stops.length) actions.push('経由スーパー/コンビニを決める');
  if (gear.status.includes('未確認')) actions.push('天気に合わせて幕・電源・調理ギアを決める');
  if (context.kotaGoing !== 'no' && weatherDecision.kotaAdvice.length) actions.push('コタの暑さ/雨対策を確認');
  if (recovery.missing.length) actions.push('忘れた食材の代替を決める');
  return dedupe(actions).slice(0, 3);
}

function buildGearModel(project, context, prep, meals, weatherDecision) {
  const text = `${context.gearMemo} ${context.menuMemo} ${context.fixedDishMemo}`;
  const items = [...(prep.packing || [])];
  if (/ガーリックシュリンプ|アヒージョ|スキレット|エビ/.test(text)) items.unshift('大スキレット / バーナー / トング / キッチンペーパー');
  if (/ピザ/.test(text)) items.unshift('ピザ生地まわり / 調理台 / 焼き道具 / チーズ保冷');
  if (/リビングシェル|リビシェル/.test(text)) items.unshift('リビングシェル：幕体 / フレーム / ペグ / 張り綱');
  if (context.gearLedgerMemo) splitMemo(context.gearLedgerMemo).forEach((item) => items.push(`台帳：${item}`));
  (weatherDecision?.gearAdvice || []).forEach((item) => items.unshift(item));
  return { status: summarizeGear(items), items: [...new Set(items)].slice(0, 14), mealGear: meals.filter((meal) => meal.menu).map((meal) => `${meal.label}：${meal.menu}`), ledger: splitMemo(context.gearLedgerMemo) };
}

function buildKotaModel(context, prep, reservation, weatherDecision) {
  const items = [...(prep.kota || [])];
  if (context.kotaGoing !== 'no') {
    items.unshift('フード / 水 / 食器 / 予備リード');
    if (parseOptionalNumber(context.highTemp) >= 28 || /暑|夏/.test(context.weatherMemo)) items.unshift('クール用品 / 日陰 / 水分補給');
    if (/雨|濡/.test(context.weatherMemo)) items.unshift('足拭きタオル / レイン対策');
    (weatherDecision?.kotaAdvice || []).forEach((item) => items.unshift(item));
  }
  return { status: context.kotaGoing === 'no' ? 'コタ同行なし' : '水・暑さ・足拭きを確認', items: [...new Set(items)].slice(0, 10) };
}

function buildRouteModel(project, context, weatherDecision) {
  const reservation = project?.reservation || {};
  const routeText = context.routeMemo || '';
  return {
    departure: findTimeByLabel(routeText, ['出発']) || (routeText.match(/\b\d{1,2}:\d{2}\b/)?.[0] || ''),
    destination: reservation.campground || project?.title || '未設定',
    checkIn: reservation.checkIn && reservation.checkIn !== '未確定' ? reservation.checkIn : '',
    stops: splitMemo(routeText).filter((item) => /コンビニ|スーパー|道の駅|SA|PA|休憩|ガソリン|経由/.test(item)).slice(0, 5),
    kotaBreak: context.kotaGoing !== 'no' && /休憩|コタ|犬|SA|PA|道の駅/.test(routeText),
    weatherAdvice: weatherDecision?.routeAdvice || []
  };
}

function buildAlerts(meals, shoppingItems, gear, kota, route, context, recovery, weatherDecision) {
  const alerts = [];
  if (!weatherDecision.cancelFreeUntil) alerts.push('無料キャンセル期限');
  if (!context.weatherHourlyMemo && !context.weatherMemo) alerts.push('詳細天気');
  if (weatherDecision.riskScore >= 40) alerts.push('天気で行く/キャンセル判断');
  if (!meals.find((meal) => meal.label === '2日目 朝')?.menu) alerts.push('2日目朝ごはん');
  if (!route.stops.length) alerts.push('経由スーパー/コンビニ');
  if (context.kotaGoing !== 'no' && !/水|暑|クール/.test(kota.items.join(' '))) alerts.push('コタ暑さ・水対策');
  if (shoppingItems.some((item) => item.status === '忘れた')) alerts.push('忘れた食材の代替');
  if (recovery.localChanges.length) alerts.push('現地変更を実績に残す');
  if (!gear.items.some((item) => /調理|スキレット|バーナー|トング/.test(item))) alerts.push('調理ギア確認');
  return [...new Set(alerts)].slice(0, 5);
}

function cardSuggestion(title, reason, ingredients = [], tag = '') {
  return { title, reason, ingredients, tag, imageLabel: title.replace(/を使う追加1品$/, '') };
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
  const text = compactJapaneseSpacing(value); const items = [];
  if (/ピザ/.test(text)) items.push('ピザ：チーズ / ピザソース / 具材 / 追いオリーブオイル');
  if (/ガーリックシュリンプ|シュリンプ|エビ|海老|ブラックタイガー/.test(text)) items.push('ガーリックシュリンプ：エビ / にんにく / バター / レモン');
  if (/アヒージョ/.test(text)) items.push('アヒージョ：オリーブオイル / にんにく / 具材 / バケット有無確認');
  if (/ホットドッグ|ホットドック/.test(text)) items.push('ホットドッグ：パン / ソーセージ / ケチャップ / マスタード');
  if (/ローストビーフ/.test(text)) items.push('ローストビーフ：肉 / ソース / レタス系 / パン有無確認');
  if (/朝/.test(text)) items.push('朝食：パン / 卵 / 飲み物を人数分で確認');
  return items;
}
function gearPackingItems(value) { const text = compactJapaneseSpacing(value); const items = []; if (/リビングシェル/.test(text)) items.push('リビングシェル：幕体 / フレーム / ペグ / 張り綱'); if (/ヘキサ|タープ/.test(text)) items.push('ヘキサ・タープ：幕体 / ポール / 鍛造ペグ / ガイロープ'); if (/EcoFlow/.test(text)) items.push('EcoFlow：本体 / 充電ケーブル / 残量確認'); if (/WAVE3|WAVE/.test(text)) items.push('WAVE3：本体 / 排気ダクト / ドレン / 予備電源'); if (/ドッグカート|AirBuggy/.test(text)) items.push('ドッグカート：本体 / レインカバー / 保冷対策'); return items; }
function reflectionActionItems(value) { const text = compactJapaneseSpacing(value); const items = []; if (/多い|食べ過ぎ|余/.test(text)) items.push('料理量を減らす / バケット不要候補'); if (/忘/.test(text)) items.push('忘れ物を買物・持ち物へ戻す'); if (/雨|濡/.test(text)) items.push('雨撤収セットを先にまとめる'); if (/暑/.test(text)) items.push('暑さ対策とコタ水分を先頭へ'); return items; }
function extractMeal(value = '', key = '') { const line = String(value).split('\n').find((row) => row.replace(/\s/g, '').includes(key)); return line ? line.replace(/^.*?[：:]/, '').trim() : ''; }
function cleanupPrepItem(value = '') { return String(value).replace(/^献立：/, '').replace(/^飲み物・朝食を.+$/, '飲み物・朝食').trim(); }
function amountFor(name = '') { if (/エビ|海老/.test(name)) return '200〜300g'; if (/ブラータ|カマンベール/.test(name)) return '1個'; if (/氷/.test(name)) return '多め'; if (/チーズ/.test(name)) return '適量'; return ''; }
function alternativesFor(name = '') { if (/エビ|海老|ブラックタイガー/.test(name)) return ['ブラックタイガー', 'むきえび', '冷凍可']; if (/レモン/.test(name)) return ['ポッカレモン', 'なしで作る', '買い足す']; if (/バケット/.test(name)) return ['今回は不要候補', '食パンで代用']; if (/ブラータ/.test(name)) return ['モッツァレラ', 'カマンベール']; return []; }
function commonFood(name = '') { return /にんにく|バター|チーズ|オリーブオイル|トマト|食パン|レモン/.test(name); }
function summarizeGear(items = []) { const text = items.join(' '); if (/スキレット|バーナー|調理/.test(text)) return '調理ギアあり'; return '調理ギア未確認'; }
function dedupe(items = []) { return [...new Set((items || []).filter(Boolean))]; }
function prependItems(target, items) { items.reverse().forEach((item) => target.unshift(item)); }
function splitMemo(value = '') { return String(value).split(/[\n、,・/]+/).map((line) => line.trim()).filter(Boolean); }
function parseOptionalNumber(value) { const match = String(value || '').match(/-?\d+(\.\d+)?/); return match ? Number(match[0]) : null; }
function parseNights(value) { const match = String(value || '').match(/\d+/); return match ? Number(match[0]) : null; }
function inferPeopleCount(reservation = {}) { const text = `${reservation.companions || ''} ${reservation.sourceText || ''}`; if (/友人|夫婦|4人|四人/.test(text)) return '4'; if (/リン|妻|夫婦|2人|二人/.test(text)) return '2'; return ''; }
function findCampground(lines = [], fileName = '') { const hit = lines.find((line) => CAMPGROUND_WORDS.test(line)); if (hit) return sanitizeCampground(hit); if (fileName && CAMPGROUND_WORDS.test(fileName)) return sanitizeCampground(fileName.replace(/\.[a-z0-9]+$/i, '')); return '未確定'; }
function sanitizeCampground(value = '') { return compactJapaneseSpacing(value).replace(/(予約|確認|詳細|利用|日程|チェック.*)$/g, '').trim().slice(0, 48) || '未確定'; }
function findDateText(text = '') { const patterns = [/20\d{2}[\/.-]\d{1,2}[\/.-]\d{1,2}\s*[-〜~－]\s*(?:20\d{2}[\/.-])?\d{1,2}[\/.-]\d{1,2}/, /20\d{2}年\d{1,2}月\d{1,2}日\s*[-〜~－]\s*(?:20\d{2}年)?\d{1,2}月\d{1,2}日/, /20\d{2}[\/.-]\d{1,2}[\/.-]\d{1,2}/]; const hit = patterns.map((pattern) => text.match(pattern)?.[0]).find(Boolean); return hit ? hit.replace(/[.]/g, '/') : '未確定'; }
function findTimeByLabel(text = '', labels = []) { for (const label of labels) { const regex = new RegExp(`${label}[^0-9]{0,12}(\\d{1,2}:\\d{2})`, 'i'); const hit = text.match(regex); if (hit) return hit[1]; } return ''; }
function findAddress(lines = []) { return lines.find((line) => /(県|都|府|道).+(市|町|村|区)/.test(line)) || '未確定'; }
function inferNights(dateText = '') { if (!dateText || dateText === '未確定') return '未確定'; const dates = dateText.match(/20\d{2}[\/.-]\d{1,2}[\/.-]\d{1,2}|\d{1,2}[\/.-]\d{1,2}/g) || []; if (dates.length < 2) return '未確定'; try { const start = parseDate(dates[0]); const end = parseDate(dates[1], start.getFullYear()); const diff = Math.round((end - start) / 86400000); return diff > 0 ? `${diff}泊` : '未確定'; } catch { return '未確定'; } }
function parseDate(value, fallbackYear = new Date().getFullYear()) { const parts = String(value).split(/[\/.-]/).map(Number); if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2]); return new Date(fallbackYear, parts[0] - 1, parts[1]); }
function findCompanions(text = '') { const items = []; if (/リン|妻|嫁/.test(text)) items.push('リン'); if (/コタ|犬|ペット/.test(text)) items.push('コタ'); if (/友人|友達/.test(text)) items.push('友人'); return items.join(' / '); }
function calculateConfidence(values = {}) { let score = 25; if (values.campground && values.campground !== '未確定') score += 30; if (values.dateText && values.dateText !== '未確定') score += 25; if (values.checkIn && values.checkIn !== '未確定') score += 10; if (values.checkOut && values.checkOut !== '未確定') score += 10; return Math.min(95, score); }
function dedupeSuggestionGroups(groups = {}, limit = 14) { return Object.fromEntries(Object.entries(groups).map(([key, items]) => [key, [...new Set((items || []).filter(Boolean))].slice(0, limit)])); }
function normalizeText(value = '') { return String(value).replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').trim(); }
function compactJapaneseSpacing(value = '') { return String(value).replace(/([ァ-ヶー一-龠ぁ-ん])\s+([ァ-ヶー一-龠ぁ-ん])/g, '$1$2').replace(/\s{2,}/g, ' ').trim(); }
function shorten(value = '', length = 30) { const text = String(value).trim(); return text.length > length ? `${text.slice(0, length)}…` : text; }
