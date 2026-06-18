function generateCampReview(r){
  return `
    <div class="review-block">
      <strong>■思い出日記</strong><br>
      ${generateSummaryReview(r)}<br><br>

      <strong>■写真の記録</strong><br>
      ${generatePhotoReview(r)}<br><br>

      <strong>■ギアの記録</strong><br>
      ${generateGearReview(r)}<br><br>

      <strong>■料理の記録</strong><br>
      ${generateMealReview(r)}<br><br>

      <strong>■メモの記録</strong><br>
      ${generateNoteReview(r)}<br><br>

      <strong>■次回残したいこと</strong><br>
      ${generateNextAction(r)}
    </div>
  `;
}

function generateSummaryReview(r){
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

  if(gearNames.length || mealNames.length || pet){
    const sceneParts = [];

    if(gearNames.length){
      sceneParts.push(`${gearNames[0]}を拠点に`);
    }

    if(mealNames.length){
      sceneParts.push(`${mealNames[0]}を囲みながら`);
    }

    if(pet){
      sceneParts.push(`${pet}とゆっくり過ごした`);
    }

    lines.push(`${sceneParts.join("、")}時間が残されています。`);
  }else{
    lines.push("この日のキャンプの時間が、静かに記録として残されています。");
  }

  if(notes.length && isMeaningfulNote(notes[0])){
    lines.push(`メモには「${notes[0]}」と残されています。短い言葉でも、その時の空気を思い出すきっかけになります。`);
  }else{
    lines.push("記録はまだ少なめですが、こうした何気ない時間こそ、あとから振り返ると大切な思い出になります。");
  }

  return lines.join("<br>");
}

function generatePhotoReview(r){
  const count = getPhotoCount(r);

  if(count === 0){
    return "写真はまだ残っていません。次回は設営後のサイト全景、食事の時間、ペットの表情を1枚ずつ残すと、この日の空気を思い出しやすくなります。";
  }

  if(count < 3){
    return `写真は${count}枚。数は少なくても、この日の思い出へ戻る入口になります。次回は設営後の景色や、過ごしている最中の一枚も残すと、記録に温度が出てきます。`;
  }

  if(count < 5){
    return `写真は${count}枚。キャンプの雰囲気は残り始めています。次回は料理、ペット、撤収前のサイト全景も加えると、あとから見返した時の記憶がより鮮明になります。`;
  }

  return `写真は${count}枚。見返した時にその日の流れを思い出せる、しっかりした記録になっています。`;
}

function generateGearReview(r){
  const names = getGearNames(r);

  if(names.length === 0){
    return "ギアの記録はまだありません。次回はメインで使ったギアを1つだけでも残すと、その日のキャンプの景色を思い出しやすくなります。";
  }

  if(names.length === 1){
    return `${names[0]}が、この日のキャンプの拠点として記録されています。どのギアと過ごしたかが残ると、あとから見返した時にその時のサイトの雰囲気まで思い出しやすくなります。`;
  }

  return `${names.join("、")}が記録されています。ギアの名前が残ることで、その日のキャンプスタイルや過ごし方まで思い出しやすくなります。`;
}

function generateMealReview(r){
  const names = getMealNames(r);

  if(names.length === 0){
    return "料理の記録はまだありません。次回は食べたものを1つだけでも残すと、その時の時間や会話まで思い出すきっかけになります。";
  }

  if(names.length === 1){
    return `${names[0]}の記録が残っています。キャンプ飯は、味だけではなく、その時の空気や会話まで思い出させてくれる大切な記録です。`;
  }

  return `${names.join("、")}の記録が残っています。食事の記録があると、その日の過ごし方や季節感まで振り返りやすくなります。`;
}

function generateNoteReview(r){
  const notes = getImportantNotes(r);

  if(notes.length === 0){
    return "メモはまだ残っていません。次回は『良かったこと』『困ったこと』『またやりたいこと』を一言だけでも残すと、自分の言葉で振り返れる記録になります。";
  }

  if(notes.length === 1 && !isMeaningfulNote(notes[0])){
    return "短いメモが残っています。たった一文字でも、その場で何かを残そうとした記録です。次回は一言だけ感想を足すと、もっと自分らしい日記になります。";
  }

  return notes.map(n=>`・${n}`).join("<br>");
}

function generateNextAction(r){
  const actions = [];

  if(getPhotoCount(r) < 5){
    actions.push("設営後のサイト全景を1枚残す");
    actions.push("料理中か食事中の写真を残す");
    actions.push("ペットの表情を残す");
  }

  if(getMealNames(r).length === 0){
    actions.push("食べた料理を1つ記録する");
  }

  if(getGearNames(r).length === 0){
    actions.push("メインで使ったギアを1つ記録する");
  }

  const notes = getImportantNotes(r);
  if(notes.length === 0 || (notes.length === 1 && !isMeaningfulNote(notes[0]))){
    actions.push("最後に『良かったこと』を一言残す");
    actions.push("次回変えたいことを一言残す");
  }

  return actions.length ? actions.map(a=>`・${a}`).join("<br>") : "記録はかなり充実しています。次回はその時の気持ちや、帰ってから思い出したことも残すと、さらに読み返したくなる日記になります。";
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
