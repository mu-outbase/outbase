function generateCampReview(r){
  return `
    <div class="review-block">
      <strong>■キャンプ記録帳</strong><br>
      ${generateRecordBook(r)}<br><br>

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

function generateRecordBook(r){
  const camp = r.camp || {};
  const site = camp.siteName || r.title || "キャンプ場未登録";
  const area = camp.area || "";
  const weather = camp.weather || "";
  const pet = camp.pet || "";

  const gearNames = getGearNames(r);
  const mealNames = getMealNames(r);
  const notes = getImportantNotes(r);

  const lines = [];

  lines.push(`${site}${area ? " " + area : ""}`);

  if(weather){
    lines.push(weather);
  }

  if(pet){
    lines.push(pet);
  }

  if(gearNames.length){
    lines.push(gearNames.join("、"));
  }

  if(mealNames.length){
    lines.push(mealNames.join("、"));
  }

  if(notes.length){
    lines.push(`メモ：${notes.join(" / ")}`);
  }

  lines.push("");
  lines.push(`写真 ${getPhotoCount(r)}枚`);
  lines.push(`ギア ${getGearNames(r).length}件`);
  lines.push(`料理 ${getMealNames(r).length}件`);
  lines.push(`メモ ${getImportantNotes(r).length}件`);

  return lines.join("<br>");
}

function generatePhotoReview(r){
  const count = getPhotoCount(r);

  if(count === 0){
    return "写真なし";
  }

  if(count === 1){
    return "写真 1枚<br>この日の入口";
  }

  return `写真 ${count}枚`;
}

function generateGearReview(r){
  const names = getGearNames(r);

  if(names.length === 0){
    return "ギアなし";
  }

  return names.join("<br>");
}

function generateMealReview(r){
  const names = getMealNames(r);

  if(names.length === 0){
    return "食事なし";
  }

  return names.join("<br>");
}

function generateNoteReview(r){
  const notes = getImportantNotes(r);

  if(notes.length === 0){
    return "メモなし";
  }

  return notes.join("<br>");
}

function generateNextAction(r){
  const actions = [];

  if(getPhotoCount(r) === 0){
    actions.push("サイト全景");
  }

  if(getPhotoCount(r) < 5){
    actions.push("設営後");
    actions.push("食事中");
    actions.push("ペットの様子");
  }

  if(getMealNames(r).length === 0){
    actions.push("食べたもの");
  }

  if(getGearNames(r).length === 0){
    actions.push("使ったギア");
  }

  if(getImportantNotes(r).length === 0){
    actions.push("良かったこと");
    actions.push("またやりたいこと");
  }

  return actions.length ? actions.join("<br>") : "なし";
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

window.generateCampReview = generateCampReview;
