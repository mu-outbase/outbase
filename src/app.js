(function(){
  const tabs = ['plan','search','prep','record','memory'];
  let active = new URLSearchParams(location.search).get('tab') || location.hash.replace('#','') || 'plan';
  if(!tabs.includes(active)) active='plan';

  const icons = {
    cal:'<svg class="icon" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3"></rect><path d="M8 3v4M16 3v4M4 10h16"></path></svg>',
    search:'<svg class="icon" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m16 16 4 4"></path></svg>',
    prep:'<svg class="icon" viewBox="0 0 24 24"><path d="M6 8h12M6 12h12M6 16h8"></path><rect x="4" y="5" width="16" height="15" rx="3"></rect></svg>',
    record:'<svg class="icon" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path><circle cx="12" cy="12" r="8"></circle></svg>',
    memory:'<svg class="icon" viewBox="0 0 24 24"><path d="M12 20s7-4.4 7-10a7 7 0 0 0-14 0c0 5.6 7 10 7 10Z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>',
    tent:'<svg class="icon" viewBox="0 0 24 24"><path d="M3 19h18L12 5 3 19Z"></path><path d="M12 5v14M8 19l4-7 4 7"></path></svg>',
    walk:'<svg class="icon" viewBox="0 0 24 24"><path d="M12 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"></path><path d="M10 7l-2 5 4 2 2 6M13 8l4 3M9 20l-4 1"></path></svg>',
    paw:'<svg class="icon" viewBox="0 0 24 24"><circle cx="7" cy="8" r="2"></circle><circle cx="12" cy="6" r="2"></circle><circle cx="17" cy="8" r="2"></circle><circle cx="9" cy="13" r="2"></circle><circle cx="15" cy="13" r="2"></circle><path d="M8 18c1.2-2 2.5-3 4-3s2.8 1 4 3c.7 1.1-.2 2-1.5 2h-5C8.2 20 7.3 19.1 8 18Z"></path></svg>',
    cup:'<svg class="icon" viewBox="0 0 24 24"><path d="M6 8h10v5a5 5 0 0 1-10 0V8Z"></path><path d="M16 9h2a2 2 0 0 1 0 4h-2M7 20h8"></path></svg>',
    note:'<svg class="icon" viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6V3Z"></path><path d="M15 3v4h4M9 11h6M9 15h6"></path></svg>',
    bookmark:'<svg class="icon" viewBox="0 0 24 24"><path d="M6 4h12v17l-6-4-6 4V4Z"></path></svg>',
    car:'<svg class="icon" viewBox="0 0 24 24"><path d="M5 14l2-5h10l2 5"></path><rect x="4" y="13" width="16" height="6" rx="2"></rect><circle cx="7" cy="19" r="1"></circle><circle cx="17" cy="19" r="1"></circle></svg>',
    sun:'<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M19.8 4.2l-2.1 2.1M6.3 17.7l-2.1 2.1"></path></svg>',
    bag:'<svg class="icon" viewBox="0 0 24 24"><path d="M7 8V7a5 5 0 0 1 10 0v1"></path><rect x="5" y="8" width="14" height="13" rx="3"></rect></svg>',
    mic:'<svg class="icon" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0M12 18v3"></path></svg>',
    camera:'<svg class="icon" viewBox="0 0 24 24"><path d="M8 7l1.5-2h5L16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3Z"></path><circle cx="12" cy="13" r="3"></circle></svg>',
    movie:'<svg class="icon" viewBox="0 0 24 24"><rect x="4" y="6" width="11" height="12" rx="2"></rect><path d="m15 10 5-3v10l-5-3"></path></svg>',
    pin:'<svg class="icon" viewBox="0 0 24 24"><path d="M12 21s7-5 7-11a7 7 0 0 0-14 0c0 6 7 11 7 11Z"></path><circle cx="12" cy="10" r="2"></circle></svg>',
    link:'<svg class="icon" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"></path><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"></path></svg>',
    photo:'<svg class="icon" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"></rect><circle cx="9" cy="10" r="1.5"></circle><path d="m5 18 5-5 4 4 2-2 3 3"></path></svg>'
  };

  function header(){
    const showContext = ['plan','record','memory'].includes(active);
    return `
    <div class="header">
      <div class="topLine">
        <div class="brand"><div class="ob">OB</div><div><div class="brandName">OUTBASE</div><div class="brandSub">route design</div></div></div>
        <div class="planChip"><b><span class="dot"></span>手賀沼ドライブ散歩</b><small>ドライブ散歩 / 7/13 / 同伴 コタ</small></div>
      </div>
      <div class="saveBar"><span>保存先：コタ散歩</span><span>表示とは別</span></div>
    </div>
    ${showContext ? `<div class="context">
      <div><div class="ctxLabel">表示</div><div class="ctxText">手賀沼ドライブ散歩</div></div>
      <div><div class="ctxLabel">保存</div><div class="ctxText">コタ散歩</div></div>
      <div class="ctxGold">同伴 コタ</div>
    </div>` : ''}`;}
  function nav(){return `<nav class="bottomNav">${[
    ['plan','予定',icons.cal],['search','探す',icons.search],['prep','準備',icons.prep],['record','記録',icons.record],['memory','思い出',icons.memory]
  ].map(([id,label,ico])=>`<button class="navBtn ${active===id?'active':''}" data-tab="${id}">${ico}<span>${label}</span></button>`).join('')}</nav>`;}
  function hero(kicker,title,text,ico){return `<section class="hero"><div class="heroKicker">${kicker}</div><div class="heroTitle">${title}</div><div class="heroText">${text}</div><div class="heroIcon">${ico}</div></section>`;}
  function mini(ico,title,sub,tags=[]){return `<article class="miniCard"><div class="circle">${ico}</div><h3>${title}</h3><p>${sub}</p>${tags.length?`<div class="tags">${tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>`:''}</article>`;}
  function list(title,rows){return `<section class="card compact"><div class="sectionHead" style="margin:0 0 5px"><div><h2 style="color:var(--goldSoft)">${title}</h2></div><span class="more">すべて見る ›</span></div>${rows.map(r=>`<div class="listRow"><div class="thumb"></div><div><div class="rowTitle">${r[0]}</div><div class="rowSub">${r[1]}</div></div><div class="chev">›</div></div>`).join('')}</section>`;}
  function calendar(){
    const cells = [
      ['28','other sun'],['29','other'],['30','other'],['1',''],['2',''],['3',''],['4','sat'],
      ['5','sun'],['6',''],['7',''],['8',''],['9',''],['10','selected'],['11','sat'],
      ['12','sun'],['13',''],['14',''],['15',''],['16',''],['17',''],['18','sat'],
      ['19','sun'],['20','sun holiday','海の日'],['21',''],['22',''],['23','holiday','スポーツの日'],['24',''],['25','sat'],
      ['26','sun'],['27',''],['28',''],['29',''],['30',''],['31',''],['1','other sat','8月']
    ];
    return `<section class="calendarCard">
      <div class="calTop"><div class="calMonth">‹ 2026.07 ›</div><div class="calHelp">日付を2回タップで新規予定</div></div>
      <div class="week"><span class="sun">日</span><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span class="sat">土</span></div>
      <div class="calGrid">
        ${cells.map((c,i)=>{
          let ev='';
          if(i===2) ev='<span class="event connectR top1">尾瀬</span>';
          if(i===3) ev='<span class="event connectL connectR top1">尾瀬トレッキング</span>';
          if(i===4) ev='<span class="event connectL top1">尾瀬</span>';
          if(i===14) ev='<span class="event top1">コタ散歩</span>';
          if(i===15) ev='<span class="event gold top1">手賀沼ドライブ散歩</span>';
          if(i===20) ev='<span class="event connectR top1">スノーピーク赤城山CF</span>';
          if(i===21) ev='<span class="event connectL connectR top1">スノーピーク赤城山CF</span>';
          if(i===22) ev='<span class="event connectL top1">赤城山CF</span>';
          if(i===33) ev='<span class="event connectR top1">谷川岳</span>';
          if(i===34) ev='<span class="event connectL top1">谷川岳山行</span>';
          return `<div class="day ${c[1]}"><span class="num">${c[0]}</span>${c[2]?`<span class="holidayName">${c[2]}</span>`:''}${ev}</div>`;
        }).join('')}
      </div>
    </section>
    <section class="card scheduleCard"><h3>選択日の予定</h3>
      ${[['7/12','日','散歩','コタ散歩'],['7/13','月','ドライブ散歩','手賀沼ドライブ散歩'],['7/18-20','土〜月・祝','イベント','スノーピーク赤城山CF'],['7/31-8/1','金〜土','登山','谷川岳山行']].map(r=>`<div class="scheduleRow"><div class="dateBox">${r[0]}<span>${r[1]}</span></div><div><div class="rowCat">${r[2]}</div><div class="rowMain">${r[3]}</div></div><div class="chev">›</div></div>`).join('')}
    </section>`;
  }
  function planPage(){return `<section class="page ${active==='plan'?'active':''}" id="page-plan">${calendar()}</section>`;}
  function searchPage(){return `<section class="page ${active==='search'?'active':''}" id="page-search">
    ${hero('SEARCH','探す','候補探し・下見・保存。行く前の検討をここで。',icons.search)}
    <div class="sectionHead"><div><h2>探す対象</h2><small>条件に合う候補をすばやく保存</small></div></div>
    <div class="grid2">${[
      [icons.tent,'キャンプ場','犬可・温水・4時間以内',['犬可','温水','4h以内']],
      [icons.walk,'散歩場所','駐車場・日陰・水辺',['駐車場','日陰','水辺']],
      [icons.paw,'ペットイベント','同伴あり/なしは属性で管理',['同伴','人だけ']],
      [icons.cup,'ドッグカフェ','寄り道候補',['テラス','駐車場']],
      [icons.note,'下見メモ','駐車場・トイレ・混雑',['下見','メモ']],
      [icons.bookmark,'保存候補','あとで比較',['保存','比較']]
    ].map(x=>mini(...x)).join('')}</div>
    ${list('最近保存した候補',[['手賀沼親水広場','散歩場所 / 駐車場・水辺'],['印旛沼サンセットヒルズ','キャンプ場 / 犬可・温水'],['cafe HYGGE','ドッグカフェ / テラス']])}
  </section>`;}
  function prepPage(){return `<section class="page ${active==='prep'?'active':''}" id="page-prep">
    ${hero('PREP','準備','通常散歩は準備不要。必要な外出だけ準備する。',icons.prep)}
    <div class="statusCard compact"><div class="circle">${icons.walk}</div><div><b>現在の保存先</b><small>コタ散歩 / 通常散歩 / 準備不要</small></div><div class="chev" style="margin-left:auto">›</div></div>
    <div class="sectionHead"><div><h2>必要な時だけ準備</h2><small>ドライブ散歩や特別な外出だけ確認</small></div></div>
    <div class="grid2">${[
      [icons.car,'ドライブ散歩','駐車場・到着目安・ルート',['駐車場','到着']],
      [icons.paw,'同伴イベント','持ち物・暑さ対策',['水','暑さ']],
      [icons.tent,'キャンプ','ギア・天気・出発逆算',['ギア','天気']],
      [icons.note,'人だけイベント','買物・下見・身軽',['買物','下見']]
    ].map(x=>mini(...x)).join('')}</div>
    <div class="sectionHead"><div><h2>準備の基本</h2><small>必要に応じて見るだけ</small></div></div>
    <div class="prepBasics"><div class="basic">${icons.bag}<b>持ち物</b><small>チェック</small></div><div class="basic">${icons.sun}<b>天気</b><small>気温・風</small></div><div class="basic">${icons.pin}<b>場所</b><small>駐車場</small></div></div>
  </section>`;}
  function map(){return `<section class="mapCard"><div class="mapHead"><div><b>散歩MAP</b><br><small>実地図で歩いた軌跡と記録を見る</small></div><span class="tag">MAP切替</span></div><div class="mapView"><div class="mapWater"></div><div class="mapPark"></div><div class="mapRoad r1"></div><div class="mapRoad r2"></div><div class="mapRoad r3"></div><div class="routeLine"></div><div class="pin p1">□</div><div class="pin p2">□</div><div class="pin p3">✎</div><div class="pin p4">✎</div><div class="pin current">●</div><div class="mapLabel">手賀沼 / 現在地</div></div><div class="mapStats"><div class="stat"><b>612</b><small>GPS点</small></div><div class="stat"><b>4.32</b><small>km</small></div><div class="stat"><b>1:24</b><small>時間</small></div><div class="stat"><b>18</b><small>ピン</small></div></div><div class="actionGrid"><button class="action goldAction">開始</button><button class="action">現在地</button><button class="action">ピン</button><button class="action">写真</button><button class="action">音声</button><button class="action">メモ</button></div></section>`;}
  function recordPage(){return `<section class="page ${active==='record'?'active':''}" id="page-record">
    ${hero('RECORD','記録','保存先はコタ散歩。表示を変えても保存先は変わらない。',icons.record)}
    ${map()}
    <div class="sectionHead"><div><h2>クイック記録</h2><small>その場で残す</small></div></div>
    <div class="grid2">${[
      [icons.mic,'話す','音声を記録',['音声']],
      [icons.camera,'撮る','写真を撮影',['写真']],
      [icons.movie,'動画','動画を撮影',['動画']],
      [icons.note,'メモ','気づきを残す',['メモ']]
    ].map(x=>mini(...x)).join('')}</div>
  </section>`;}
  function memoryPage(){return `<section class="page ${active==='memory'?'active':''}" id="page-memory">
    ${hero('MEMORIES','思い出','帰宅後の整理・レビュー・次回改善。',icons.memory)}
    <div class="grid2 compact">${[
      [icons.photo,'記録一覧','写真・音声・メモ',['整理']],
      [icons.bag,'次回改善','買い足し・反省',['改善']],
      [icons.pin,'場所メモ','駐車場・トイレ・日陰',['場所']],
      [icons.link,'関連付け','最後の記録をまとめる',['紐付け']]
    ].map(x=>mini(...x)).join('')}</div>
    ${list('既存の思い出詳細',[['手賀沼ドライブ散歩','2026.07.13 / 同伴 コタ / 記録36件'],['谷川岳山行','2026.07.31-08.01 / 記録28件'],['スノーピーク赤城山CF','2026.07.18-20 / 記録52件']])}
  </section>`;}
  function render(){
    document.getElementById('app').innerHTML = `<div class="appShell">${header()}<main>${planPage()}${searchPage()}${prepPage()}${recordPage()}${memoryPage()}</main>${nav()}</div>`;
    document.querySelectorAll('.navBtn').forEach(btn=>btn.addEventListener('click',()=>{active=btn.dataset.tab; history.replaceState(null,'',`?tab=${active}&v=outbase-clean-reference-v1`); render(); window.scrollTo(0,0);}));
  }
  render();
})();
