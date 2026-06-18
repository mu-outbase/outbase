function generateCampReview(r){
  return `
    <div class="review-block">
      <strong>■総合レビュー</strong><br>
      ${generateSummaryReview(r)}<br><br>

      <strong>■写真評価</strong><br>
      ${generatePhotoReview(r)}<br><br>

      <strong>■ギア評価</strong><br>
      ${generateGearReview(r)}<br><br>

      <strong>■料理評価</strong><br>
      ${generateMealReview(r)}<br><br>

      <strong>■メモ評価</strong><br>
      ${generateNoteReview(r)}<br><br>

      <strong>■次回改善提案</strong><br>
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

  let text = "";

  if(weather){
    text += `${weather}の`;
  }

  text += `${site}`;

  if(area){
    text += `${area}サイト`;
  }

  text += "でのキャンプ。";

  if(gearNames.length && mealNames.length && pet){
    text += `<br>${gearNames[0]}を使い、${mealNames[0]}を楽しみながら、${pet}と過ごした記録です。`;
  }else if(gearNames.length && mealNames.length){
    text += `<br>${gearNames[0]}を使い、${mealNames[0]}を楽しんだキャンプ記録です。`;
  }else if(gearNames.length){
    text += `<br>${gearNames[0]}の使用記録が残っています。`;
  }else if(mealNames.length){
    text += `<br>${mealNames[0]}を楽しんだキャンプ記録です。`;
  }else if(pet){
    text += `<br>${pet}と一緒に過ごした記録です。`;
  }

  if(notes.length && isMeaningfulNote(notes[0])){
    text += `<br>メモには「${notes[0]}」と残されており、当日の気付きも記録されています。`;
  }else if(notes.length){
    text += `<br>簡易メモが残されています。次回は感想や改善点も残すとレビューの精度が上がります。`;
  }

  return text;
}

function generatePhotoReview(r){
  const count = getPhotoCount(r);

  if(count === 0){
    return "写真が残っていません。次回はサイト全景、設営後、料理、ペットの様子を残すと振り返りやすくなります。";
  }

  if(count < 3){
    return `写真は${count}枚。最低限の記録はありますが、設営前後やキャンプ中の雰囲気をもう少し残すと、思い出としての価値が高まります。`;
  }

  if(count < 5){
    return `写真は${count}枚。雰囲気は残せています。次回は料理やペット、サイト全景を追加するとさらに良くなります。`;
  }

  return `写真は${count}枚。振り返りに十分な量が残されています。`;
}

function generateGearReview(r){
  const names = getGearNames(r);

  if(names.length === 0){
    return "使用ギアの記録がありません。主要ギアだけでも残すと、持ち出し頻度や満足度の分析に役立ちます。";
  }

  if(names.length === 1){
    return `${names[0]}の使用記録があります。今後も継続して残すことで、出番の多いギアとして整理できます。`;
  }

  return `${names.join("、")}の使用記録があります。ギアごとの使用頻度や組み合わせを振り返る材料になります。`;
}

function generateMealReview(r){
  const names = getMealNames(r);

  if(names.length === 0){
    return "料理記録がありません。次回はキャンプ飯を1つでも残すと、定番メニューや改善点を整理しやすくなります。";
  }

  if(names.length === 1){
    return `${names[0]}を記録。キャンプ飯の振り返りとして残せています。次回は味・手間・満足度もメモするとさらに使いやすくなります。`;
  }

  return `${names.join("、")}を記録。食事内容が残っているので、次回の献立検討にも活用できます。`;
}

function generateNoteReview(r){
  const notes = getImportantNotes(r);

  if(notes.length === 0){
    return "メモが残っていません。良かったこと、困ったこと、次回変えたいことを短く残すとレビュー品質が上がります。";
  }

  if(notes.length === 1 && !isMeaningfulNote(notes[0])){
    return "簡易メモが残っています。次回は『良かった点』『困った点』『次回改善』を一言でも残すと、より意味のあるレビューになります。";
  }

  return notes.map(n=>`・${n}`).join("<br>");
}

function generateNextAction(r){
  const actions = [];

  if(getPhotoCount(r) < 5){
    actions.push("写真を5枚以上残す");
    actions.push("サイト全景・設営後・料理・ペット写真を追加");
  }

  if(getMealNames(r).length === 0){
    actions.push("料理記録を1件以上残す");
  }

  if(getGearNames(r).length === 0){
    actions.push("主要ギアを記録する");
  }

  const notes = getImportantNotes(r);
  if(notes.length === 0 || (notes.length === 1 && !isMeaningfulNote(notes[0]))){
    actions.push("感想・改善点メモを残す");
  }

  return actions.length ? actions.map(a=>`・${a}`).join("<br>") : "記録は充実しています。次回は満足度や改善点を少し詳しく残すと、さらに価値ある記録になります。";
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
