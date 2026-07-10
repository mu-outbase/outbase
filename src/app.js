(function(){
  const tabs=['plan','search','prep','record','memory'];
  let active=new URLSearchParams(location.search).get('tab')||location.hash.replace('#','')||'plan';
  if(!tabs.includes(active)) active='plan';

  const I={
    calendar:'<svg class="icon" viewBox="0 0 24 24"><path d="M5 4v3M9 4v3M15 4v3M19 4v3M4 8h16v12H4zM8 8v12M12 8v12M16 8v12M4 12h16M4 16h16"/></svg>',
    search:'<svg class="icon" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.8"/><path d="m16 16 4.5 4.5"/></svg>',
    prep:'<svg class="icon" viewBox="0 0 24 24"><rect x="4" y="5" width="7" height="14" rx="1.5"/><rect x="13" y="5" width="7" height="14" rx="1.5"/></svg>',
    record:'<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7v10M7 12h10"/></svg>',
    memory:'<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5"/></svg>',
    tent:'<svg class="icon" viewBox="0 0 24 24"><path d="M3 19h18L12 5 3 19Z"/><path d="M12 5v14M8 19l4-7 4 7"/></svg>',
    walk:'<svg class="icon" viewBox="0 0 24 24"><path d="M5 18c3-3 4-7 8-7 2.5 0 3.5 2 6 2"/><path d="M4 20h16M8 7l2-3 2 3M16 6l2-2 2 2"/></svg>',
    paw:'<svg class="icon" viewBox="0 0 24 24"><circle cx="7" cy="8" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="17" cy="8" r="2"/><circle cx="8.5" cy="13" r="2"/><circle cx="15.5" cy="13" r="2"/><path d="M8 18c1.1-2 2.5-3 4-3s2.9 1 4 3c.7 1.2-.2 2-1.5 2h-5C8.2 20 7.3 19.2 8 18Z"/></svg>',
    cup:'<svg class="icon" viewBox="0 0 24 24"><path d="M5 8h11v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8Z"/><path d="M16 9h2a2.5 2.5 0 0 1 0 5h-2M4 20h14"/></svg>',
    note:'<svg class="icon" viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5M9 2v4M15 2v4"/></svg>',
    bookmark:'<svg class="icon" viewBox="0 0 24 24"><path d="M6 4h12v17l-6-4-6 4V4Z"/></svg>',
    folder:'<svg class="icon" viewBox="0 0 24 24"><path d="M3 7h7l2 2h9v10H3z"/><path d="M3 7V5h7l2 2"/></svg>',
    car:'<svg class="icon" viewBox="0 0 24 24"><path d="M5 14l2-5h10l2 5"/><rect x="4" y="13" width="16" height="6" rx="2"/><circle cx="7" cy="19" r="1"/><circle cx="17" cy="19" r="1"/></svg>',
    people:'<svg class="icon" viewBox="0 0 24 24"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2.5 20c.5-4 2.5-6 5.5-6s5 2 5.5 6M10.5 20c.5-4 2.5-6 5.5-6s5 2 5.5 6"/></svg>',
    person:'<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="7" r="3"/><path d="M6 20c.7-5 2.7-7 6-7s5.3 2 6 7"/></svg>',
    bag:'<svg class="icon" viewBox="0 0 24 24"><path d="M7 8V7a5 5 0 0 1 10 0v1"/><rect x="5" y="8" width="14" height="13" rx="3"/><path d="M9 12v5M15 12v5"/></svg>',
    sun:'<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M19.8 4.2l-2.1 2.1M6.3 17.7l-2.1 2.1"/></svg>',
    route:'<svg class="icon" viewBox="0 0 24 24"><path d="M5 18c0-5 4-5 4-9a3 3 0 1 0-6 0c0 4 2 5 2 5s2-1 2-5"/><path d="M10 17c2-3 4-4 7-4h2M16 9l3 4-3 4"/></svg>',
    photo:'<svg class="icon" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m5 18 5-5 4 4 2-2 3 3"/></svg>',
    cart:'<svg class="icon" viewBox="0 0 24 24"><path d="M3 4h2l2 11h10l3-8H7"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/><path d="M10 11l2 2 4-5"/></svg>',
    pin:'<svg class="icon" viewBox="0 0 24 24"><path d="M12 21s7-5 7-11a7 7 0 0 0-14 0c0 6 7 11 7 11Z"/><circle cx="12" cy="10" r="2"/></svg>',
    link:'<svg class="icon" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/></svg>',
    mic:'<svg class="icon" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    camera:'<svg class="icon" viewBox="0 0 24 24"><path d="M8 7l1.5-2h5L16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3Z"/><circle cx="12" cy="13" r="3"/></svg>',
    movie:'<svg class="icon" viewBox="0 0 24 24"><rect x="4" y="6" width="11" height="12" rx="2"/><path d="m15 10 5-3v10l-5-3"/></svg>',
    memo:'<svg class="icon" viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6V3Z"/><path d="M15 3v4h4M9 11h6M9 15h6"/></svg>'
  };

  function header(){
    const showContext=['plan','record','memory'].includes(active);
    return `<header class="header">
      <div class="topLine">
        <div class="brand"><div class="ob">OB</div><div><div class="brandName">OUTBASE</div><div class="brandSub">route design</div></div></div>
        <button class="planChip"><span class="planTitle"><i></i>手賀沼ドライブ散歩</span><span>ドライブ散歩&nbsp; / &nbsp;7/13&nbsp; / &nbsp;同伴 コタ</span></button>
      </div>
      <div class="saveBar"><b>保存先：コタ散歩</b><span>表示とは別</span></div>
    </header>${showContext?`<section class="context"><div><small>表示</small><b>手賀沼ドライブ散歩</b></div><div><small>保存</small><b>コタ散歩</b></div><span class="ctxGold">同伴 コタ</span></section>`:''}`;
  }

  function nav(){
    const data=[['plan','予定',I.calendar],['search','探す',I.search],['prep','準備',I.prep],['record','記録',I.record],['memory','思い出',I.memory]];
    return `<nav class="bottomNav">${data.map(([id,label,icon])=>`<button class="navBtn ${active===id?'active':''}" data-tab="${id}">${icon}<span>${label}</span></button>`).join('')}</nav>`;
  }

  function planPage(){
    const dates=[
      ['28','sun other'],['29','other'],['30','other'],['1',''],['2',''],['3',''],['4','sat'],
      ['5','sun'],['6',''],['7',''],['8',''],['9',''],['10','selected'],['11','sat'],
      ['12','sun'],['13',''],['14',''],['15',''],['16',''],['17',''],['18','sat'],
      ['19','sun'],['20','sun holiday','海の日'],['21',''],['22',''],['23','holiday','スポーツの日'],['24',''],['25','sat'],
      ['26','sun'],['27',''],['28',''],['29',''],['30',''],['31',''],['1','sat other','8月']
    ];
    return `<section class="page ${active==='plan'?'active':''}" id="page-plan">
      <section class="calendarCard">
        <div class="calendarHead"><div class="month">2026.07</div><div class="monthBtns"><button>‹</button><button>›</button></div><span>日付を2回タップで新規予定</span></div>
        <div class="week"><span class="sun">日</span><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span class="sat">土</span></div>
        <div class="monthGrid">${dates.map(d=>`<div class="day ${d[1]}"><span class="num">${d[0]}</span>${d[2]?`<small>${d[2]}</small>`:''}</div>`).join('')}
          <div class="eventBar green e-oz">尾瀬トレッキング</div>
          <div class="eventBar green e-kota1">コタ散歩</div><div class="eventBar gold e-drive1">手賀沼<br>ドライブ散歩</div>
          <div class="eventBar green e-kota2">コタ散歩</div><div class="eventBar gold e-drive2">手賀沼<br>ドライブ散歩</div>
          <div class="eventBar green e-akagi1">スノーピーク赤城山CF</div><div class="eventBar green e-akagi2">スノーピーク赤城山CF</div>
          <div class="eventBar green e-tani">谷川岳山行</div>
        </div>
      </section>
      <section class="scheduleCard">
        <div class="scheduleTitle">選択日の予定</div>
        ${[
          ['7/12','日','green','散歩','コタ散歩'],['7/13','月','gold','ドライブ散歩','手賀沼ドライブ散歩'],['7/18−7/20','土−月・祝','green','イベント','スノーピーク赤城山CF'],['7/31−8/1','金−土','green','登山','谷川岳山行']
        ].map(r=>`<div class="scheduleRow"><div class="dateBlock"><b>${r[0]}</b><span>${r[1]}</span></div><i class="dot ${r[2]}"></i><div class="kind">${r[3]}</div><div class="scheduleName">${r[4]}</div><div class="chev">›</div></div>`).join('')}
        <div class="scheduleMore">すべての予定を見る&nbsp; ›</div>
      </section>
    </section>`;
  }

  function searchCard(icon,title,sub,tags=[]){
    return `<article class="searchCard"><div class="iconCircle">${icon}</div><div class="cardCopy"><h3>${title}</h3>${tags.length?`<div class="tagRow">${tags.map(t=>`<span>${t}</span>`).join('')}</div>`:`<p>${sub}</p>`}</div><b class="chev">›</b></article>`;
  }

  function searchPage(){
    const cards=[
      [I.tent,'キャンプ場','',['犬可','温水','4時間以内']],
      [I.walk,'散歩場所','',['駐車場','日陰','水辺']],
      [I.paw,'ペットイベント','同伴あり/なしは属性で管理',[]],
      [I.cup,'ドッグカフェ','寄り道候補',[]],
      [I.note,'下見メモ','',['駐車場','トイレ','混雑']],
      [I.bookmark,'保存候補','あとで比較',[]]
    ];
    const rows=[
      ['assets/search_teganuma.jpg','散歩場所','手賀沼親水広場',['駐車場','日陰','水辺'],'保存日 7/10'],
      ['assets/search_inbanuma.jpg','キャンプ場','印旛沼サンセットヒルズ',['犬可','温水','4時間以内'],'保存日 7/08'],
      ['assets/search_hygge.jpg','ドッグカフェ','cafe HYGGE',['テラス','大型犬OK','駐車場あり'],'保存日 7/06']
    ];
    return `<section class="page ${active==='search'?'active':''}" id="page-search">
      <section class="searchHero"><img src="assets/search_hero_art.png" alt=""><div><h1>探す</h1><p>候補探し・下見・保存。<br>行く前の検討をここで。</p></div></section>
      <div class="searchGrid">${cards.map(c=>searchCard(...c)).join('')}</div>
      <section class="recentCard"><div class="recentHead"><h2>最近保存した候補</h2><span>すべて見る&nbsp; ›</span></div>${rows.map(r=>`<div class="recentRow"><img src="${r[0]}" alt=""><div class="recentCopy"><small>${r[1]}</small><b>${r[2]}</b><div>${r[3].map(t=>`<span>${t}</span>`).join('')}</div></div><em>${r[4]}</em><div class="bookmarkIcon">${I.bookmark}</div></div>`).join('')}</section>
    </section>`;
  }

  function prepCard(icon,title,sub,tag){
    return `<article class="prepCard"><div class="prepIcon">${icon}</div><div><h3>${title}</h3><p>${sub}</p><span>${tag}</span></div><b>›</b></article>`;
  }

  function prepPage(){
    return `<section class="page ${active==='prep'?'active':''}" id="page-prep">
      <section class="prepHero"><img src="assets/prep_hero_art.png" alt=""><div><h1>準備</h1><p>通常散歩は準備不要。<br>必要な外出だけ準備する。</p></div></section>
      <section class="saveTarget"><div class="folderCircle">${I.folder}</div><div><small>現在の保存先</small><b>コタ散歩&nbsp; / &nbsp;通常散歩&nbsp; / &nbsp;準備不要</b></div><span>›</span></section>
      <div class="sectionLabel"><h2>必要な時だけ準備</h2><p>ドライブ散歩や特別な外出など、必要なときだけ準備します。</p></div>
      <div class="prepGrid">${[
        [I.car,'ドライブ散歩','駐車場・到着目安・ルート','駐車場・到着目安・ルート'],
        [I.people,'同伴イベント','持ち物・暑さ対策','持ち物・暑さ対策'],
        [I.tent,'キャンプ','ギア・天気・出発逆算','ギア・天気・出発逆算'],
        [I.person,'人だけイベント','買物・下見・身軽','買物・下見・身軽']
      ].map(x=>prepCard(...x)).join('')}</div>
      <div class="sectionLabel basicsLabel"><h2>準備の基本（必要に応じて）</h2><p>散歩にも役立つ基本情報をすばやく確認。</p></div>
      <div class="basicsGrid">${[[I.bag,'持ち物','チェックリスト'],[I.sun,'天気','天候・気温・暑さ指数'],[I.route,'ルート','地図・距離・時間']].map(x=>`<article><div>${x[0]}</div><span><b>${x[1]}</b><small>${x[2]}</small></span><em>›</em></article>`).join('')}</div>
    </section>`;
  }

  function recordPage(){
    const quick=[[I.mic,'話す','音声を記録'],[I.camera,'撮る','写真を撮影'],[I.movie,'動画','動画を撮影'],[I.pin,'場所','場所を記録'],[I.record,'ピン','ピンを追加'],[I.memo,'メモ','メモを残す']];
    return `<section class="page ${active==='record'?'active':''}" id="page-record">
      <section class="recordHero"><div><small>RECORD</small><h1>記録</h1></div><p>保存先はコタ散歩。<br>表示を変えても保存先は変わらない。</p><span>同伴 コタ</span></section>
      <section class="recordMapCard"><div class="mapHead"><div><h2>散歩MAP</h2><p>実際の地図で、歩いた軌跡と記録を確認できます。</p></div><button>MAP 切替</button></div>
        <div class="mapStage"><img src="assets/map_teganuma.png" alt="手賀沼周辺の地図"><div class="mapControl"><div class="stats"><div><span>GPS</span><b>612<small>点</small></b></div><div><span>距離</span><b>4.32<small>km</small></b></div><div><span>時間</span><b>1:24:37</b></div><div><span>ピン数</span><b>18</b></div></div><div class="mapButtons"><button class="gold">散歩開始</button><button>現在地</button><button>ピン</button><button>Google<br>Map</button></div></div></div>
        <div class="quickArea"><h3>クイック記録</h3><div>${quick.map(q=>`<button>${q[0]}<b>${q[1]}</b><small>${q[2]}</small></button>`).join('')}</div></div>
      </section>
    </section>`;
  }

  function memoryFeature(icon,title,sub,body){return `<article class="memoryFeature"><div class="memoryTop"><div>${icon}</div><span><h3>${title}</h3><p>${sub}</p></span><b>›</b></div><p class="memoryBody">${body}</p></article>`;}

  function memoryPage(){
    const rows=[
      ['assets/memory_teganuma.jpg','手賀沼ドライブ散歩','2026.07.13','同伴 コタ','記録 36件'],
      ['assets/memory_tanigawa.jpg','谷川岳山行','2026.07.05','単独','記録 28件'],
      ['assets/memory_akagi.jpg','スノーピーク赤城山CF','2026.07.18-20','グループ','記録 52件']
    ];
    return `<section class="page ${active==='memory'?'active':''}" id="page-memory">
      <section class="memoryPanel"><img class="memoryArt" src="assets/memory_hero_art.png" alt=""><div class="memoryIntro"><small>MEMORIES</small><h1>思い出</h1><p>帰宅後の整理・レビュー・次回改善。</p></div><div class="memoryGrid">
        ${memoryFeature(I.photo,'記録一覧','写真・音声・メモ','散歩中に残した記録を<br>まとめて確認できます。')}
        ${memoryFeature(I.cart,'次回改善','買い足し・反省','持ち物の見直しや反省点を<br>整理して次に活かします。')}
        ${memoryFeature(I.pin,'場所メモ','駐車場・トイレ・日陰','役立った場所や注意点を<br>メモしておきます。')}
        ${memoryFeature(I.link,'関連付け','最後の記録をまとめる','最後に残した記録を起点に、<br>思い出をひとつにまとめます。')}
      </div></section>
      <section class="memoryList"><div class="memoryListHead"><h2>既存の思い出詳細</h2><span>すべての思い出を見る&nbsp; ›</span></div>${rows.map(r=>`<div class="memoryRow"><img src="${r[0]}" alt=""><i></i><div><b>${r[1]}</b><p>${r[2]} <span>${r[3]}</span></p></div><em>${r[4]}</em><strong>›</strong></div>`).join('')}</section>
    </section>`;
  }

  function render(){
    document.getElementById('app').innerHTML=`<div class="appShell">${header()}<main>${planPage()}${searchPage()}${prepPage()}${recordPage()}${memoryPage()}</main>${nav()}</div>`;
    document.querySelectorAll('.navBtn').forEach(btn=>btn.addEventListener('click',()=>{active=btn.dataset.tab;history.replaceState(null,'',`?tab=${active}&v=clean-v6-1`);render();window.scrollTo({top:0,behavior:'instant'});}));
  }
  render();
})();
