function generateCampReview(r){
  return `
    <div class="review-block">
      <strong>■思い出レビュー</strong><br>
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

  let lines = [];

  if(weather){
    lines.push(`${weather}に包まれた${site}${area ? area + "サイト" : ""}での時間。`);
  }else{
    lines.push(`${site}${area ? area + "サイト" : ""}で過ごしたキャンプ。`);
  }

  if(gearNames.length || mealNames.length || pet){
    let story = [];
    if(gearNames.length) story.push(`${gearNames[0]}を拠点に`);
    if(mealNames.length) story.push(`${mealNames[0]}を楽しみ`);
    if(pet) story.push(`${pet}とゆっくり過ごしました`);
    lines.push(story.join("、") + "。");
  }

  if(notes.length && isMeaningfulNote(notes[0])){
    lines.push(`メモには「${notes[0]}」と残されており、その時の空気感が今も伝わってきます。`);
  }else{
    lines.push("何気ない時間でも、あとから振り返ると大切な思い出になります。");
  }

  return lines.join("<br>");
}

function generatePhotoReview(r){
  const count = getPhotoCount(r);

  if(count === 0){
    return "写真が残っていません。次回はサイト全景、設営後、料理、ペットの様子を残すと振り返りやすくなります。";
  }

  if(count < 3){
    return `残された${count}枚の写真が、この日の思い出の入口になります。設営後の景色や過ごした時間も残すと、あとから振り返りやすくなります。`;
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
