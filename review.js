
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

  let text = `${site}`;

  if(area){
    text += `（${area}）`;
  }

  text += `でのキャンプ記録です。`;

  if(weather){
    text += `<br>天候：${weather}`;
  }

  if(pet){
    text += `<br>ペット：${pet}`;
  }

  if(gearNames.length){
    text += `<br>使用ギア：${gearNames.join("、")}`;
  }

  if(mealNames.length){
    text += `<br>料理：${mealNames.join("、")}`;
  }

  if(notes.length){
    text += `<br>メモ抜粋：${notes[0]}`;
  }

  return text;
}

function generatePhotoReview(r){
  const count = getPhotoCount(r);
  if(count === 0) return "写真記録なし。";
  if(count < 5) return `写真${count}枚。サイト全景や設営風景を追加すると振り返りやすくなります。`;
  return `写真${count}枚。十分な記録です。`;
}

function generateGearReview(r){
  const names = getGearNames(r);
  return names.length ? `使用ギア：${names.join("、")}` : "ギア記録なし。";
}

function generateMealReview(r){
  const names = getMealNames(r);
  return names.length ? `料理記録：${names.join("、")}` : "料理記録なし。";
}

function generateNoteReview(r){
  const notes = getImportantNotes(r);
  return notes.length ? notes.join("<br>") : "メモ記録なし。";
}

function generateNextAction(r){
  const actions = [];
  if(getPhotoCount(r) < 5) actions.push("写真を増やす");
  if(getMealNames(r).length === 0) actions.push("料理記録を残す");
  if(getGearNames(r).length === 0) actions.push("ギア記録を残す");
  if(getImportantNotes(r).length === 0) actions.push("気付きメモを残す");
  return actions.length ? actions.join(" / ") : "記録は充実しています。";
}

function getGearNames(r){
  return (r.camp?.gear || []).map(x=>x.name).filter(Boolean).slice(0,5);
}

function getMealNames(r){
  return (r.camp?.meals || []).map(x=>x.name).filter(Boolean).slice(0,5);
}

function getImportantNotes(r){
  return (r.notes || []).map(x=>x.text).filter(Boolean).slice(0,3);
}

window.generateCampReview = generateCampReview;
