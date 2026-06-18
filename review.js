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
  const siteName = camp.siteName || r.title || "キャンプ場未登録";
  const area = camp.area || "";
  const weather = camp.weather || "";
  const pet = camp.pet || "";
  const photoCount = getPhotoCount(r);
  const gearCount = getGearCount(r);
  const mealCount = getMealCount(r);
  const noteCount = getNoteCount(r);

  let text = `
    今回のキャンプは、${escapeHtml(siteName)}${area ? "（" + escapeHtml(area) + "）" : ""}で実施。<br>
    写真${photoCount}枚、ギア${gearCount}件、料理${mealCount}件、メモ${noteCount}件を記録しました。
  `;

  if(weather){
    text += `<br>天候は${escapeHtml(weather)}。`;
  }

  if(pet){
    text += `<br>${escapeHtml(pet)}と一緒に過ごしたキャンプ記録です。`;
  }

  text += `<br>キャンプの基本情報と振り返り材料が整理されています。`;

  return text;
}

function generatePhotoReview(r){
  const count = getPhotoCount(r);

  if(count === 0){
    return "写真記録はまだありません。次回は設営・景色・料理・ペットの様子を残すと、後から振り返りやすくなります。";
  }

  if(count < 5){
    return "写真記録があります。次回は設営前後、食事、サイト全体、ペットの様子などを追加すると、より思い出として残しやすくなります。";
  }

  return "写真記録は充実しています。キャンプの雰囲気や思い出を振り返る材料として十分です。";
}

function generateGearReview(r){
  const count = getGearCount(r);

  if(count === 0){
    return "使用ギアはまだ記録されていません。持ち出し傾向や使用頻度を分析するため、主要ギアだけでも登録すると便利です。";
  }

  if(count < 5){
    return "使用ギアの記録があります。継続して残すことで、よく使うギア・出番が少ないギアの把握に役立ちます。";
  }

  return "使用ギアの記録は充実しています。キャンプスタイルや持ち物の最適化に活用できます。";
}

function generateMealReview(r){
  const count = getMealCount(r);

  if(count === 0){
    return "料理記録はまだありません。次回はキャンプ飯や飲み物を記録すると、食事の振り返りや定番メニュー化に役立ちます。";
  }

  if(count < 3){
    return "料理記録があります。キャンプ飯の振り返りに活用できます。次回は朝・昼・夜で分けて残すとさらに見やすくなります。";
  }

  return "料理記録は充実しています。キャンプ飯の傾向やお気に入りメニューの整理に活用できます。";
}

function generateNoteReview(r){
  const count = getNoteCount(r);

  if(count === 0){
    return "メモ記録はまだありません。良かったこと、困ったこと、次回改善したいことを短く残すとレビュー精度が上がります。";
  }

  if(count < 5){
    return "メモ記録があります。気付きや感想が残されており、次回の改善や投稿作成に活用できます。";
  }

  return "メモ記録は充実しています。感情・学び・改善点まで振り返れる良い記録です。";
}

function generateNextAction(r){
  const actions = [];

  if(getPhotoCount(r) < 5){
    actions.push("写真を5枚以上残す");
  }

  if(getMealCount(r) === 0){
    actions.push("料理を1件以上記録する");
  }

  if(getGearCount(r) === 0){
    actions.push("主要ギアを登録する");
  }

  if(getNoteCount(r) === 0){
    actions.push("気付きメモを残す");
  }

  if(actions.length === 0){
    return "記録は十分です。この調子で継続し、次回は感情メモや写真の種類を増やすとさらに良くなります。";
  }

  return actions.join(" / ");
}

window.generateCampReview = generateCampReview;
