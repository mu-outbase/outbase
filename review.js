function generateCampReview(r){
  return `
    <div class="review-block">
      <strong>■キャンプ記録</strong><br>
      ${generateDailyLog(r)}<br><br>

      <strong>■写真</strong><br>
      ${generatePhotoReview(r)}<br><br>

      <strong>■使用ギア</strong><br>
      ${generateGearReview(r)}<br><br>

      <strong>■食事</strong><br>
      ${generateMealReview(r)}<br><br>

      <strong>■メモ</strong><br>
      ${generateNoteReview(r)}<br><br>

      <strong>■次回メモ候補</strong><br>
      ${generateNextAction(r)}
    </div>
  `;
}

function generateDailyLog(r){
  const camp = r.camp || {};
  const site = camp.siteName || r.title || "キャンプ場未登録";
  const area = camp.area || "";
  const weather = camp.weather || "";
  const pet = camp.pet || "";

  const gearNames = getGearNames(r);
  const mealNames = getMealNames(r);
  const notes = getImportantNotes(r);

  const placeText = `${site}${area ? area + "サイト" : ""}`;
  const weatherMood = getWeatherMood(weather);

  const lines = [];

  lines.push(`${weatherMood}${placeText}。`);

  if(gearNames.length){
    lines.push(`${gearNames[0]}を張って、この日の拠点ができました。`);
  }else{
    lines.push("この日の拠点で、キャンプの時間が始まりました。");
  }

  if(mealNames.length && pet){
    lines.push(`${mealNames[0]}を囲みながら、${pet}とゆっくり過ごしました。`);
  }else if(mealNames.length){
    lines.push(`${mealNames[0]}を囲んで、キャンプの食事時間を過ごしました。`);
  }else if(pet){
    lines.push(`${pet}と一緒に、サイトでの時間を過ごしました。`);
  }

  if(notes.length && isMeaningfulNote(notes[0])){
    lines.push(`その時の言葉として「${notes[0]}」が残っています。`);
  }else if(notes.length){
    lines.push("短いメモだけでも、その場で何かを残そうとした跡があります。");
  }else{
    lines.push("言葉は少なくても、この日の出来事は記録の中に残っています。");
  }

  lines.push("派手な出来事がなくても、こういう一日が、あとから見返した時の大切な日誌になります。");

  return lines.join("<br>");
}

function generatePhotoReview(r){
  const count = getPhotoCount(r);

  if(count === 0){
    return "写真はまだありません。次回は、設営後のサイト、食事の時間、ペットの表情を1枚ずつ残したいところです。";
  }

  if(count < 3){
    return `写真は${count}枚。数は少なくても、この日の入口として残っています。次回は設営後や食事中の写真も残すと、その日の流れが見えやすくなります。`;
  }

  if(count < 5){
    return `写真は${count}枚。キャンプの雰囲気が少しずつ残っています。次回は撤収前のサイト全景や、何気ない時間の写真も残したいところです。`;
  }

  return `写真は${count}枚。この日の流れを思い出せる写真が残っています。`;
}

function generateGearReview(r){
  const names = getGearNames(r);

  if(names.length === 0){
    return "ギアの記録はまだありません。次回は、その日の拠点になったギアを1つだけでも残したいところです。";
  }

  if(names.length === 1){
    return `${names[0]}が、この日のキャンプで一緒に過ごしたギアとして残っています。あとから見返した時、サイトの景色まで思い出しやすくなります。`;
  }

  return `${names.join("、")}が、この日のキャンプで一緒に過ごしたギアとして残っています。`;
}

function generateMealReview(r){
  const names = getMealNames(r);

  if(names.length === 0){
    return "料理の記録はまだありません。次回は、その日に食べたものを1つだけでも残したいところです。";
  }

  if(names.length === 1){
    return `${names[0]}を食べた記録が残っています。キャンプ飯は、味だけではなく、その時の空気や会話まで思い出させてくれる記録です。`;
  }

  return `${names.join("、")}を食べた記録が残っています。食事の記録があると、その日の時間がぐっと思い出しやすくなります。`;
}

function generateNoteReview(r){
  const notes = getImportantNotes(r);

  if(notes.length === 0){
    return "その時の言葉はまだ残っていません。次回は『良かったこと』『またやりたいこと』を一言だけでも残したいところです。";
  }

  if(notes.length === 1 && !isMeaningfulNote(notes[0])){
    return `「${notes[0]}」<br>短い言葉ですが、その場で残した記録です。次回はこの一言に、少しだけ気持ちを足すと日誌らしくなります。`;
  }

  return notes.map(n=>`「${n}」`).join("<br>");
}

function generateNextAction(r){
  const actions = [];

  if(getPhotoCount(r) < 5){
    actions.push("設営後のサイト全景");
    actions.push("食事中の写真");
    actions.push("ペットの表情");
  }

  if(getMealNames(r).length === 0){
    actions.push("その日に食べたもの");
  }

  if(getGearNames(r).length === 0){
    actions.push("この日の拠点になったギア");
  }

  const notes = getImportantNotes(r);
  if(notes.length === 0 || (notes.length === 1 && !isMeaningfulNote(notes[0]))){
    actions.push("最後に感じたことを一言");
    actions.push("次回またやりたいこと");
  }

  return actions.length ? actions.map(a=>`・${a}`).join("<br>") : "この日の記録は十分に残っています。次回は帰ってから思い出したことも少し足すと、さらに読み返したくなる日誌になります。";
}

function getWeatherMood(weather){
  if(!weather){
    return "";
  }

  const w = String(weather);

  if(w.includes("雨")){
    return "雨音が続く";
  }

  if(w.includes("晴")){
    return "開放感のある";
  }

  if(w.includes("曇")){
    return "落ち着いた空の下で過ごした";
  }

  if(w.includes("雪")){
    return "雪の気配を感じる";
  }

  if(w.includes("風")){
    return "風を感じながら過ごした";
  }

  return `${weather}の`;
}

function getGearNames(r){
  return (r.camp?.gear || [])
    .map(x=>x.name)
    .filter(Boolean)
    .slice(0,5);
}

function getMealNames(r){
  return (r.camp?.meals || [])
    .map(x=>x.name)
    .filter(Boolean)
    .slice(0,5);
}

function getImportantNotes(r){
  return (r.notes || [])
    .map(x=>x.text)
    .filter(Boolean)
    .slice(0,3);
}

function isMeaningfulNote(text){
  if(!text){
    return false;
  }

  const trimmed = String(text).trim();

  if(trimmed.length < 3){
    return false;
  }

  return true;
}

window.generateCampReview = generateCampReview;
