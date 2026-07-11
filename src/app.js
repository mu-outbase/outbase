(function(){
  const tabs=['plan','search','prep','record','memory'];
  let active=new URLSearchParams(location.search).get('tab')||location.hash.replace('#','')||'plan';
  if(!tabs.includes(active)) active='plan';

  const params=new URLSearchParams(location.search);
  let recordSessionState=params.get('recordState')||localStorage.getItem('outbase_record_session_state')||'active';
  if(!['idle','active','paused'].includes(recordSessionState)) recordSessionState='active';
  let recordCount=Number(localStorage.getItem('outbase_record_count')||18);
  let recordTarget=localStorage.getItem('outbase_record_target')||'コタ通常散歩';
  let recordSheet=params.get('sheet')||'';
  let mapMode=Number(localStorage.getItem('outbase_record_map_mode')||0)%2;
  let wakeLock=null;
  let geoWatchId=null;
  let timerId=null;
  let gpsStatus='位置情報を確認中';
  let currentPosition=readStored('outbase_record_current_position',null);
  let trackPoints=readStored('outbase_record_track_points',[]);
  let savedPins=readStored('outbase_record_saved_pins',[]);
  let elapsedMs=Number(localStorage.getItem('outbase_record_elapsed_ms')||0);
  let activeStartedAt=recordSessionState==='active'?Number(localStorage.getItem('outbase_record_active_started_at')||Date.now()):0;
  let mapCenter=currentPosition?{lat:currentPosition.lat,lng:currentPosition.lng}:{lat:35.8667,lng:140.0123};
  let mapZoom=Number(localStorage.getItem('outbase_record_map_zoom')||16);
  let mapFollow=true;
  let savedRecords=readStored('outbase_record_saved_records',[]);
  let pendingPinId=null;
  let memoDraft='';
  let editingRecordId=null;
  let speechRecognition=null;
  let speechHoldTimer=null;
  let speechActive=false;
  let speechTranscript='';
  let speechStartLocation=null;
  let speechButton=null;
  let activeParkingId=localStorage.getItem('outbase_active_parking_id')||'';
  let parkingSpeechHoldTimer=null;
  let parkingSpeechRecognition=null;
  let parkingSpeechActive=false;
  const previewMode=params.get('preview')||'';

  function readStored(key,fallback){try{const v=JSON.parse(localStorage.getItem(key));return v??fallback;}catch(_e){return fallback;}}
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function newId(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;}
  function nearestTrackPosition(atTime=Date.now(),maxGapMs=180000){
    let best=null,bestGap=Infinity;
    for(const point of trackPoints){
      const gap=Math.abs(Number(point.time||0)-atTime);
      if(gap<bestGap){best=point;bestGap=gap;}
    }
    if(currentPosition){
      const gap=Math.abs(Number(currentPosition.time||Date.now())-atTime);
      if(gap<bestGap){best=currentPosition;bestGap=gap;}
    }
    return best&&bestGap<=maxGapMs?best:null;
  }
  function locationSnapshot(atTime=Date.now()){
    const p=nearestTrackPosition(atTime);
    return p
      ?{lat:p.lat,lng:p.lng,accuracy:p.accuracy||null,time:p.time||atTime,pending:false,source:'auto'}
      :{lat:null,lng:null,accuracy:null,time:atTime,pending:true,source:'auto'};
  }
  function activeParking(){
    const selected=savedPins.find(x=>x.id===activeParkingId&&x.category==='parking');
    if(selected) return selected;
    const latest=[...savedPins].reverse().find(x=>x.category==='parking'&&!x.clearedAt);
    if(latest){activeParkingId=latest.id;return latest;}
    return null;
  }
  function parkingSummary(pin){
    const p=pin&&pin.parking||{};
    return [p.floor,p.area,p.number].filter(Boolean).join('・')||pin?.note||'位置と時刻を保存済み';
  }
  function parseParkingText(text){
    const t=String(text||'').replace(/\s+/g,'');
    const floor=(t.match(/(?:地下)?[0-9０-９]+階|B[0-9０-９]+|屋上/i)||[])[0]||'';
    const color=(t.match(/(?:青|赤|緑|黄|黄色|オレンジ|橙|紫|白|黒|ピンク)(?:色)?(?:エリア)?/)||[])[0]||'';
    const pillar=(t.match(/[A-Za-zＡ-Ｚａ-ｚ][0-9０-９-]*(?:柱|エリア)?/)||[])[0]||'';
    const number=(t.match(/[0-9０-９]+(?:番|台|区画)/)||[])[0]||'';
    return {floor,area:[color,pillar].filter(Boolean).join('・'),number};
  }

  if(previewMode==='parking'||previewMode==='parking-recall'||previewMode==='parking-main'){
    const pin={id:'preview-parking',lat:35.8667,lng:140.0123,accuracy:6,time:Date.now(),category:'parking',label:'駐車場',note:'入口は東側エレベーター付近',parking:{floor:'3階',area:'青エリア・C柱',number:'28番',speechText:'立体駐車場3階、青エリア、Cの28番に停めた',photoName:'C-28_柱番号.jpg'}};
    const oldPin=savedPins.find(x=>x.id===pin.id);if(oldPin) Object.assign(oldPin,pin);else savedPins.push(pin);
    activeParkingId=pin.id;
    if(previewMode==='parking'){pendingPinId=pin.id;recordSheet='pin';}
    if(previewMode==='parking-recall') recordSheet='parking-recall';
  }

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
    const saveTarget=active==='record'?`<button class="saveBar saveBarButton" data-open-sheet="target"><b>保存先：${recordTarget}</b><span>タップで変更</span></button>`:'';
    return `<header class="header ${active==='record'?'recordHeader':'compactHeader'}">
      <div class="topLine">
        <div class="brand"><div class="ob">OB</div><div><div class="brandName">OUTBASE</div><div class="brandSub">route design</div></div></div>
        <button class="planChip"><span class="planTitle"><i></i>手賀沼ドライブ散歩</span><span>ドライブ散歩&nbsp; / &nbsp;7/13&nbsp; / &nbsp;同伴 コタ</span></button>
      </div>
      ${saveTarget}
    </header>`;
  }

  function parkingRecallButton(){
    const pin=activeParking();if(!pin||active==='record') return '';
    return `<button class="parkingRecallFloat" data-open-parking-recall>${I.car}<span><small>車に戻る</small><b>${escapeHtml(parkingSummary(pin))}</b></span><em>›</em></button>`;
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
    const quick=[
      [I.mic,'話す','長押しで文字起こし','talk'],
      [I.camera,'撮る','位置つき写真','photo'],
      [I.movie,'動画','位置つき動画','video'],
      [I.memo,'メモ','位置つきメモ','memo']
    ];
    const sessionLabel=recordSessionState==='idle'?'散歩開始':recordSessionState==='paused'?'再開':'一時停止';
    const stateText=recordSessionState==='idle'?'開始前':recordSessionState==='paused'?'一時停止中':'記録中';
    const distance=sessionDistanceKm().toFixed(2);
    const elapsed=formatElapsed(elapsedNow());
    const speechPreview=previewMode==='speech';
    return `<section class="page ${active==='record'?'active':''}" id="page-record">
      <section class="recordHero">
        <div class="recordHeroTitle"><small>RECORD</small><h1>記録</h1></div>
        <div class="recordState"><i class="statusDot ${recordSessionState}"></i><span>${stateText}</span></div>
        <div class="recordHeroSide"><span>同伴 コタ</span></div>
      </section>
      <section class="recordMapCard">
        <div class="mapHead">
          <div><h2>散歩MAP</h2><p><i class="statusDot"></i><span id="gpsStatusText">${gpsStatus}</span>&nbsp; / &nbsp;端末保存&nbsp; / &nbsp;画面ON</p></div>
          <div class="mapHeadActions">${recordSessionState!=='idle'?'<button class="endButton" data-open-sheet="end">終了</button>':''}<button data-record-action="map-mode">${mapMode===0?'記録を隠す':'記録を表示'}</button></div>
        </div>
        <div class="mapStage">
          <div id="recordLiveMap" class="recordLiveMap" role="application" aria-label="現在地に追従する散歩地図">
            <div class="mapTilePane"></div>
            <svg class="mapTrackSvg" aria-hidden="true"><polyline></polyline></svg>
            <div class="mapMarkerPane"></div>
            <div class="mapZoom"><button data-map-zoom="in" aria-label="拡大">＋</button><button data-map-zoom="out" aria-label="縮小">−</button></div>
            <div class="mapAttribution">© OpenStreetMap</div>
          </div>
          <div class="mapModeBadge">${mapMode===0?'現在地＋軌跡＋場所記録':'現在地のみ'}</div>
          ${activeParking()?`<button class="mapParkingChip" data-open-parking-recall>${I.car}<span><small>駐車位置</small><b>${escapeHtml(parkingSummary(activeParking()))}</b></span></button>`:''}
          <div id="speechLive" class="speechLive ${speechPreview?'show':''}">
            <div class="speechPulse"><i></i></div><div><small>リアルタイム文字起こし</small><p id="speechLiveText">${speechPreview?'立体駐車場3階、青エリア、Cの28番に停めた':''}</p></div>
          </div>
          <div class="mapControl">
            <div class="stats statsTwo">
              <div><span>距離</span><b id="distanceValue">${distance}<small>km</small></b></div>
              <div><span>経過時間</span><b id="elapsedValue">${elapsed}</b></div>
            </div>
            <div class="mapButtons">
              <button class="gold sessionButton" data-record-action="session">${sessionLabel}</button>
              <button data-record-action="current">現在地</button>
              <button data-record-action="pin">場所を記録</button>
              <button data-record-action="google-map">Google<br>Map</button>
            </div>
          </div>
        </div>
        <div class="quickArea"><h3>クイック記録 <span>すべて日時・位置つきで保存</span></h3><div>${quick.map(q=>`<button data-record-action="${q[3]}" class="quick-${q[3]}">${q[0]}<b>${q[1]}</b><small>${q[2]}</small></button>`).join('')}</div></div>
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

  function sheetMarkup(){
    if(!recordSheet) return '';
    if(recordSheet==='memo') return `<div class="recordSheetBackdrop"><section class="recordSheet memoSheet"><div class="sheetHandle"></div><small>クイック記録</small><h2>${editingRecordId?'文字起こしを修正':'メモを残す'}</h2><p>保存時の日時と現在位置を、${recordTarget}へ一緒に保存します。</p><textarea id="recordMemo" placeholder="今の気づきや、あとで確認したいこと">${escapeHtml(memoDraft)}</textarea><div class="locationSaveNotice">${I.pin}<span>現在位置を自動で添付</span></div><div class="sheetActions"><button data-close-sheet>記録へ戻る</button><button class="sheetPrimary" data-save-memo>${editingRecordId?'更新':'保存'}</button></div></section></div>`;
    if(recordSheet==='pin'){
      const pin=savedPins.find(x=>x.id===pendingPinId)||savedPins[savedPins.length-1]||{};
      const categories=[['water','水飲み場'],['toilet','トイレ'],['parking','駐車場'],['vending','自販機'],['bench','ベンチ'],['shade','日陰・休憩'],['entrance','出入口'],['caution','注意場所'],['other','その他']];
      const category=pin.category||'unclassified';
      const parking=pin.parking||{};
      return `<div class="recordSheetBackdrop"><section class="recordSheet pinSheet"><div class="sheetHandle"></div><small>PLACE RECORD</small><h2>この場所を記録</h2><p>場所は保存済みです。必要なら種類や詳しい目印を追加します。</p><div class="pinCategoryGrid">${categories.map(c=>`<button class="${category===c[0]?'selected':''}" data-pin-category="${c[0]}">${c[1]}</button>`).join('')}</div><div id="parkingFields" class="parkingFields ${category==='parking'?'show':''}"><div class="parkingTitle">入力しなくてOK。音声か写真で残します</div><div class="parkingAssistButtons"><button data-parking-speech>${I.mic}<span><b>長押しで話す</b><small>階・色・柱・番号を自動整理</small></span></button><button data-parking-photo>${I.camera}<span><b>表示を撮る</b><small>案内板・柱・区画を保存</small></span></button></div><div class="parkingAutoCard"><small>自動整理した駐車情報</small><b id="parkingAutoSummary">${escapeHtml([parking.floor,parking.area,parking.number].filter(Boolean).join('・')||'まだ情報はありません')}</b>${parking.speechText?`<p>${escapeHtml(parking.speechText)}</p>`:''}${parking.photoName?`<p>写真：${escapeHtml(parking.photoName)}${parking.ocrState==='reading'?'（文字を読取中）':parking.ocrText?'（自動読取済み）':''}</p>`:''}${parking.ocrText?`<p>読取：${escapeHtml(parking.ocrText)}</p>`:''}</div><details class="parkingManual"><summary>必要なときだけ手入力で補足</summary><div class="parkingGrid"><label>階<input id="parkingFloor" value="${escapeHtml(parking.floor||'')}" placeholder="例：3階"></label><label>エリア・柱<input id="parkingArea" value="${escapeHtml(parking.area||'')}" placeholder="例：青・C柱"></label><label>番号<input id="parkingNumber" value="${escapeHtml(parking.number||'')}" placeholder="例：28番"></label></div></details></div><label class="pinNoteLabel">場所メモ<textarea id="pinNote" placeholder="入口、目印、利用時間、注意点など">${escapeHtml(pin.note||'')}</textarea></label><div class="pinSavedPosition">${I.pin}<span>${pin.lat!=null?`位置を自動保存済み${pin.accuracy?`　±${pin.accuracy}m`:''}`:'位置はOUTBASEが自動で紐付けます'}</span></div><div class="sheetActions"><button data-close-sheet>未分類のまま閉じる</button><button class="sheetPrimary" data-save-pin-detail>詳細を保存</button></div></section></div>`;
    }
    if(recordSheet==='parking-recall'){
      const pin=activeParking();if(!pin){recordSheet='';return '';}
      const p=pin.parking||{};
      return `<div class="recordSheetBackdrop"><section class="recordSheet parkingRecallSheet"><div class="sheetHandle"></div><small>PARKING POSITION</small><h2>駐車位置</h2><div class="parkingRecallHero">${I.car}<div><small>${new Date(pin.time||Date.now()).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})} に保存</small><b>${escapeHtml(parkingSummary(pin))}</b><p>${escapeHtml(pin.note||'位置と時刻を保存しています')}</p></div></div><div class="parkingRecallEvidence"><div>${I.pin}<span><small>位置</small><b>${pin.lat!=null?`${Number(pin.lat).toFixed(5)}, ${Number(pin.lng).toFixed(5)}`:'自動補完中'}</b></span></div><div>${I.mic}<span><small>音声</small><b>${p.speechText?'保存済み':'なし'}</b></span></div><div>${I.camera}<span><small>写真</small><b>${p.photoName?'保存済み':'なし'}</b></span></div></div><div class="parkingRecallActions"><button data-parking-action="map">${I.pin}<span>地図で確認</span></button><button class="primary" data-parking-action="route">${I.route}<span>ここへ戻る</span></button><button data-parking-action="photo">${I.camera}<span>写真を見る</span></button><button data-parking-action="note">${I.memo}<span>音声・メモ</span></button></div><button class="parkingArrived" data-parking-action="arrived">車に戻ったので表示を終了</button><div class="sheetActions single"><button data-close-sheet>閉じる</button></div></section></div>`;
    }
    if(recordSheet==='end') return `<div class="recordSheetBackdrop"><section class="recordSheet endSheet"><div class="sheetHandle"></div><small>SESSION SUMMARY</small><h2>散歩記録を終了しますか？</h2><div class="summaryName"><b>${recordTarget}</b><span>${currentPosition?'現在地を保存済み':'位置情報を確認中'}</span></div><div class="summaryGrid summaryGridTwo"><div><small>経過時間</small><b>${formatElapsed(elapsedNow())}</b></div><div><small>距離</small><b>${sessionDistanceKm().toFixed(2)} km</b></div></div><div class="syncSummary"><i></i>端末保存済み・同期待ち 0件</div><div class="sheetActions"><button data-close-sheet>記録へ戻る</button><button class="sheetPrimary" data-finish-session>終了して保存</button></div></section></div>`;
    if(recordSheet==='target') return `<div class="recordSheetBackdrop"><section class="recordSheet targetSheet"><div class="sheetHandle"></div><small>RECORD TARGET</small><h2>記録先を変更</h2><p>表示中プランとは別に、保存先だけを変更します。</p><button class="targetOption selected" data-record-target="コタ通常散歩"><span><b>コタ通常散歩</b><small>散歩セッション</small></span><em>選択中</em></button><button class="targetOption" data-record-target="手賀沼ドライブ散歩 ＞ コタ場内散歩"><span><b>手賀沼ドライブ散歩</b><small>コタ場内散歩へ保存</small></span><em>選ぶ</em></button><button class="targetOption" data-record-target="未確認箱へ仮保存"><span><b>未確認箱へ仮保存</b><small>あとで関連付け</small></span><em>選ぶ</em></button><div class="sheetActions single"><button data-close-sheet>閉じる</button></div></section></div>`;
    return `<div class="recordSheetBackdrop"><section class="recordSheet detailSheet"><div class="sheetHandle"></div><small>RECORD DETAIL</small><h2>直近の記録</h2><div class="detailPreview">${I.camera}<span><b>写真</b><small>日時・位置つきで端末保存</small></span></div><dl><div><dt>記録先</dt><dd>${recordTarget}</dd></div><div><dt>GPS精度</dt><dd>${currentPosition?`± ${currentPosition.accuracy||'-'} m`:'位置は自動保存'}</dd></div><div><dt>同期状態</dt><dd>端末保存済み</dd></div><div><dt>公開範囲</dt><dd>非公開</dd></div></dl><div class="detailLinks"><button data-open-sheet="target">記録先を変更</button><button>テキスト修正</button><button>削除候補へ</button></div><div class="sheetActions single"><button data-close-sheet>閉じる</button></div></section></div>`;
  }

  function showRecordToast(message){
    let toast=document.getElementById('recordToast');
    if(!toast){toast=document.createElement('div');toast.id='recordToast';toast.className='recordToast';document.body.appendChild(toast);}
    toast.textContent=message;toast.classList.add('show');
    clearTimeout(showRecordToast.timer);showRecordToast.timer=setTimeout(()=>toast.classList.remove('show'),2100);
  }

  function persistRecordState(){
    localStorage.setItem('outbase_record_session_state',recordSessionState);
    localStorage.setItem('outbase_record_count',String(recordCount));
    localStorage.setItem('outbase_record_target',recordTarget);
    localStorage.setItem('outbase_record_map_mode',String(mapMode));
    localStorage.setItem('outbase_record_elapsed_ms',String(elapsedMs));
    localStorage.setItem('outbase_record_active_started_at',String(activeStartedAt||0));
    localStorage.setItem('outbase_record_track_points',JSON.stringify(trackPoints));
    localStorage.setItem('outbase_record_saved_pins',JSON.stringify(savedPins));
    localStorage.setItem('outbase_record_current_position',JSON.stringify(currentPosition));
    localStorage.setItem('outbase_record_map_zoom',String(mapZoom));
    localStorage.setItem('outbase_record_saved_records',JSON.stringify(savedRecords.slice(-500)));
    if(activeParkingId) localStorage.setItem('outbase_active_parking_id',activeParkingId);else localStorage.removeItem('outbase_active_parking_id');
  }

  function elapsedNow(){return elapsedMs+(recordSessionState==='active'&&activeStartedAt?Date.now()-activeStartedAt:0);}
  function formatElapsed(ms){
    const total=Math.max(0,Math.floor(ms/1000));
    const h=Math.floor(total/3600);
    const m=Math.floor((total%3600)/60);
    const s=total%60;
    return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  function haversineKm(a,b){
    const R=6371,toRad=v=>v*Math.PI/180;
    const dLat=toRad(b.lat-a.lat),dLng=toRad(b.lng-a.lng);
    const q=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
    return 2*R*Math.asin(Math.sqrt(q));
  }
  function sessionDistanceKm(){let d=0;for(let i=1;i<trackPoints.length;i++) d+=haversineKm(trackPoints[i-1],trackPoints[i]);return d;}
  function updateMetrics(){
    const distance=document.getElementById('distanceValue');if(distance) distance.innerHTML=`${sessionDistanceKm().toFixed(2)}<small>km</small>`;
    const elapsed=document.getElementById('elapsedValue');if(elapsed) elapsed.textContent=formatElapsed(elapsedNow());
    const status=document.getElementById('gpsStatusText');if(status) status.textContent=gpsStatus;
  }
  function startMetricTimer(){clearInterval(timerId);timerId=setInterval(updateMetrics,1000);updateMetrics();}

  async function keepScreenAwake(){
    try{if('wakeLock' in navigator&&recordSessionState==='active') wakeLock=await navigator.wakeLock.request('screen');}catch(_e){}
  }

  function openRecordDB(){
    return new Promise((resolve,reject)=>{
      if(!('indexedDB' in window)){reject(new Error('IndexedDB unavailable'));return;}
      const req=indexedDB.open('outbase_db',10);
      req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('fieldRecords')) db.createObjectStore('fieldRecords',{keyPath:'id'});};
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
  }
  async function putRecordDB(record,blob){
    try{const db=await openRecordDB();await new Promise((resolve,reject)=>{const tx=db.transaction('fieldRecords','readwrite');tx.objectStore('fieldRecords').put({...record,blob:blob||null});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}catch(_e){}
  }
  async function deleteRecordDB(id){
    try{const db=await openRecordDB();await new Promise((resolve,reject)=>{const tx=db.transaction('fieldRecords','readwrite');tx.objectStore('fieldRecords').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}catch(_e){}
  }
  async function updateRecordLocationDB(id,location){
    try{
      const db=await openRecordDB();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction('fieldRecords','readwrite'),store=tx.objectStore('fieldRecords'),req=store.get(id);
        req.onsuccess=()=>{const row=req.result;if(row) store.put({...row,location});};
        req.onerror=()=>reject(req.error);
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
      });
      db.close();
    }catch(_e){}
  }
  function saveRecord(kind,data={},location=locationSnapshot(),blob=null){
    const createdAt=Number(data.createdAt||Date.now());
    const resolvedLocation=location&&location.lat!=null?location:locationSnapshot(createdAt);
    const record={id:data.id||newId(kind),kind,createdAt,target:recordTarget,sessionState:recordSessionState,location:resolvedLocation,...data};
    const i=savedRecords.findIndex(x=>x.id===record.id);if(i>=0) savedRecords[i]=record;else savedRecords.push(record);
    recordCount+=i>=0?0:1;persistRecordState();putRecordDB(record,blob);return record;
  }
  function showSpeechReview(record){
    let box=document.getElementById('speechReview');if(box) box.remove();
    box=document.createElement('div');box.id='speechReview';box.className='speechReview';
    box.innerHTML=`<div><small>文字起こしを保存しました</small><p></p></div><button data-speech-edit>修正</button><button data-speech-cancel>取消</button>`;
    box.querySelector('p').textContent=record.text;document.body.appendChild(box);requestAnimationFrame(()=>box.classList.add('show'));
    box.querySelector('[data-speech-edit]').addEventListener('click',()=>{editingRecordId=record.id;memoDraft=record.text;recordSheet='memo';box.remove();render();});
    box.querySelector('[data-speech-cancel]').addEventListener('click',()=>{savedRecords=savedRecords.filter(x=>x.id!==record.id);recordCount=Math.max(0,recordCount-1);persistRecordState();deleteRecordDB(record.id);box.remove();showRecordToast('文字起こしを取り消しました');});
    clearTimeout(showSpeechReview.timer);showSpeechReview.timer=setTimeout(()=>box.remove(),7000);
  }
  function openCapture(kind){
    const captureLocation=locationSnapshot();
    const input=document.createElement('input');input.type='file';input.accept=kind==='photo'?'image/*':'video/*';input.capture='environment';
    input.addEventListener('change',()=>{if(input.files&&input.files.length){const file=input.files[0];saveRecord(kind,{name:file.name,type:file.type,size:file.size},captureLocation,file);showRecordToast(`${kind==='photo'?'写真':'動画'}を位置つきで保存しました`);}},{once:true});input.click();
  }
  function speechOverlay(show,text='',status='長押し中はリアルタイム表示'){
    const box=document.getElementById('speechLive'),copy=document.getElementById('speechLiveText');if(!box||!copy) return;
    box.classList.toggle('show',show);box.querySelector('small').textContent=status;copy.textContent=text||'話してください…';
  }
  function beginSpeechHold(el){
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Recognition){showRecordToast('このブラウザは音声文字起こしに対応していません');return;}
    speechActive=true;speechTranscript='';speechStartLocation=locationSnapshot();speechButton=el;el.classList.add('holding');el.querySelector('small').textContent='話している間だけ記録';speechOverlay(true,'話してください…');
    const rec=new Recognition();speechRecognition=rec;rec.lang='ja-JP';rec.continuous=true;rec.interimResults=true;rec.maxAlternatives=1;
    rec.onresult=e=>{let finalText='',interim='';for(let i=0;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal) finalText+=t;else interim+=t;}speechTranscript=(finalText+interim).trim();speechOverlay(true,speechTranscript||'話してください…');};
    rec.onerror=e=>{if(e.error!=='aborted') showRecordToast(e.error==='not-allowed'?'マイクの使用を許可してください':'音声を確認できませんでした');};
    rec.onend=()=>{const text=speechTranscript.trim();speechActive=false;if(speechButton){speechButton.classList.remove('holding');const small=speechButton.querySelector('small');if(small) small.textContent='長押しで文字起こし';}speechButton=null;speechRecognition=null;speechOverlay(false);if(text){const record=saveRecord('speech',{text},speechStartLocation);showSpeechReview(record);}else showRecordToast('音声は保存されませんでした');};
    try{rec.start();}catch(_e){speechActive=false;el.classList.remove('holding');speechOverlay(false);}
  }
  function stopSpeechHold(){clearTimeout(speechHoldTimer);speechHoldTimer=null;if(speechActive&&speechRecognition){try{speechRecognition.stop();}catch(_e){}}}

  function currentPendingPin(){return savedPins.find(x=>x.id===pendingPinId)||savedPins[savedPins.length-1]||null;}
  function refreshParkingAssist(pin,text=''){
    if(!pin) return;pin.category='parking';pin.label='駐車場';pin.parking=pin.parking||{};
    if(text){const parsed=parseParkingText(text);pin.parking={...pin.parking,...Object.fromEntries(Object.entries(parsed).filter(([,v])=>v)),speechText:text};pin.note=pin.note||text;}
    activeParkingId=pin.id;persistRecordState();
  }
  function beginParkingSpeechHold(el){
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Recognition){showRecordToast('このブラウザは音声文字起こしに対応していません');return;}
    const pin=currentPendingPin();if(!pin) return;
    parkingSpeechActive=true;el.classList.add('holding');const rec=new Recognition();parkingSpeechRecognition=rec;rec.lang='ja-JP';rec.continuous=true;rec.interimResults=true;let text='';
    const small=el.querySelector('small');if(small) small.textContent='話している内容を整理中';
    rec.onresult=e=>{let finalText='',interim='';for(let i=0;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal) finalText+=t;else interim+=t;}text=(finalText+interim).trim();const summary=document.getElementById('parkingAutoSummary');if(summary) summary.textContent=text||'話してください…';};
    rec.onerror=e=>{if(e.error!=='aborted') showRecordToast(e.error==='not-allowed'?'マイクの使用を許可してください':'音声を確認できませんでした');};
    rec.onend=()=>{parkingSpeechActive=false;parkingSpeechRecognition=null;el.classList.remove('holding');if(text){refreshParkingAssist(pin,text);saveRecord('speech',{text,linkedPinId:pin.id,parkingAssist:true},locationSnapshot());render();setTimeout(()=>showRecordToast(`駐車情報を「${parkingSummary(pin)}」として整理しました`),0);}else{if(small) small.textContent='階・色・柱・番号を自動整理';showRecordToast('音声は保存されませんでした');}};
    try{rec.start();}catch(_e){parkingSpeechActive=false;el.classList.remove('holding');}
  }
  function stopParkingSpeechHold(){clearTimeout(parkingSpeechHoldTimer);parkingSpeechHoldTimer=null;if(parkingSpeechActive&&parkingSpeechRecognition){try{parkingSpeechRecognition.stop();}catch(_e){}}}
  async function extractParkingPhotoText(file){
    try{
      if('TextDetector' in window&&'createImageBitmap' in window){const bitmap=await createImageBitmap(file),rows=await new TextDetector().detect(bitmap);bitmap.close?.();const text=rows.map(x=>x.rawValue||'').join(' ').trim();if(text) return text;}
    }catch(_e){}
    try{
      if(window.Tesseract&&window.Tesseract.createWorker){const worker=await window.Tesseract.createWorker('jpn+eng');const result=await worker.recognize(file);await worker.terminate();return String(result?.data?.text||'').replace(/\s+/g,' ').trim();}
    }catch(_e){}
    return '';
  }
  function captureParkingPhoto(){
    const pin=currentPendingPin();if(!pin) return;const input=document.createElement('input');input.type='file';input.accept='image/*';input.capture='environment';
    input.addEventListener('change',async()=>{if(!(input.files&&input.files.length)) return;const file=input.files[0],loc=locationSnapshot();const rec=saveRecord('photo',{name:file.name,type:file.type,size:file.size,linkedPinId:pin.id,parkingAssist:true},loc,file);pin.parking=pin.parking||{};pin.parking.photoRecordId=rec.id;pin.parking.photoName=file.name;pin.parking.photoSavedAt=Date.now();pin.parking.ocrState='reading';refreshParkingAssist(pin);persistRecordState();render();setTimeout(()=>showRecordToast('写真を保存しました。表示の文字を自動で読んでいます'),0);const text=await extractParkingPhotoText(file);pin.parking.ocrState=text?'done':'unreadable';if(text){pin.parking.ocrText=text;const parsed=parseParkingText(text);pin.parking={...pin.parking,...Object.fromEntries(Object.entries(parsed).filter(([,v])=>v))};pin.note=pin.note||text;}refreshParkingAssist(pin);persistRecordState();render();setTimeout(()=>showRecordToast(text?`写真から「${parkingSummary(pin)}」を自動補完しました`:'文字を読めませんでしたが、写真は保存済みです'),0);},{once:true});input.click();
  }
  async function showParkingPhoto(pin){
    const id=pin?.parking?.photoRecordId;if(!id){showRecordToast('駐車場の写真はまだありません');return;}
    try{const db=await openRecordDB();const row=await new Promise((resolve,reject)=>{const tx=db.transaction('fieldRecords','readonly'),r=tx.objectStore('fieldRecords').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});db.close();if(!row?.blob){showRecordToast('写真データを確認できません');return;}const url=URL.createObjectURL(row.blob),overlay=document.createElement('div');overlay.className='parkingPhotoOverlay';overlay.innerHTML=`<button aria-label="閉じる">×</button><img alt="駐車位置の写真">`;overlay.querySelector('img').src=url;overlay.querySelector('button').onclick=()=>{URL.revokeObjectURL(url);overlay.remove();};overlay.onclick=e=>{if(e.target===overlay){URL.revokeObjectURL(url);overlay.remove();}};document.body.appendChild(overlay);}catch(_e){showRecordToast('写真を開けませんでした');}
  }

  function projectPoint(lat,lng,zoom){
    const size=256*Math.pow(2,zoom),sin=Math.sin(lat*Math.PI/180);
    return {x:(lng+180)/360*size,y:(0.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*size};
  }
  function unprojectPoint(x,y,zoom){
    const size=256*Math.pow(2,zoom),lng=x/size*360-180,n=Math.PI-2*Math.PI*y/size;
    return {lat:180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))),lng};
  }
  function pointOnMap(pos,box){
    const c=projectPoint(mapCenter.lat,mapCenter.lng,mapZoom),p=projectPoint(pos.lat,pos.lng,mapZoom);
    return {x:box.width/2+(p.x-c.x),y:box.height/2+(p.y-c.y)};
  }
  function renderLiveMap(){
    const map=document.getElementById('recordLiveMap');if(!map) return;
    const tilePane=map.querySelector('.mapTilePane'),markerPane=map.querySelector('.mapMarkerPane'),svg=map.querySelector('.mapTrackSvg'),line=svg.querySelector('polyline');
    const box={width:map.clientWidth||380,height:map.clientHeight||292},center=projectPoint(mapCenter.lat,mapCenter.lng,mapZoom),n=Math.pow(2,mapZoom);
    const left=center.x-box.width/2,top=center.y-box.height/2;
    const minX=Math.floor(left/256),maxX=Math.floor((left+box.width)/256),minY=Math.floor(top/256),maxY=Math.floor((top+box.height)/256);
    let tiles='';
    for(let ty=minY;ty<=maxY;ty++) for(let tx=minX;tx<=maxX;tx++){
      if(ty<0||ty>=n) continue;const wrapped=((tx%n)+n)%n;
      tiles+=`<img class="mapTile" src="https://tile.openstreetmap.org/${mapZoom}/${wrapped}/${ty}.png" alt="" style="left:${Math.round(tx*256-left)}px;top:${Math.round(ty*256-top)}px" onerror="this.style.opacity=0">`;
    }
    tilePane.innerHTML=tiles;
    svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
    if(mapMode===0&&trackPoints.length>1) line.setAttribute('points',trackPoints.map(p=>{const q=pointOnMap(p,box);return `${q.x.toFixed(1)},${q.y.toFixed(1)}`;}).join(' ')); else line.setAttribute('points','');
    let marks='';
    if(mapMode===0) savedPins.forEach((p,i)=>{if(p.lat==null||p.lng==null) return;const q=pointOnMap(p,box);marks+=`<button class="livePin" data-live-pin="${i}" style="left:${q.x}px;top:${q.y}px" aria-label="保存したピン">${I.pin}</button>`;});
    if(currentPosition){const q=pointOnMap(currentPosition,box);marks+=`<div class="liveCurrent" style="left:${q.x}px;top:${q.y}px"><i></i></div>`;}
    markerPane.innerHTML=marks;
    markerPane.querySelectorAll('[data-live-pin]').forEach(el=>el.addEventListener('click',()=>{recordSheet='detail';render();}));
  }
  function bindMapGestures(){
    const map=document.getElementById('recordLiveMap');if(!map||map.dataset.bound) return;map.dataset.bound='1';
    let drag=null;
    map.addEventListener('pointerdown',e=>{if(e.target.closest('button')) return;map.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,c:projectPoint(mapCenter.lat,mapCenter.lng,mapZoom)};mapFollow=false;});
    map.addEventListener('pointermove',e=>{if(!drag) return;const p=unprojectPoint(drag.c.x-(e.clientX-drag.x),drag.c.y-(e.clientY-drag.y),mapZoom);mapCenter=p;renderLiveMap();});
    map.addEventListener('pointerup',()=>{drag=null;});map.addEventListener('pointercancel',()=>{drag=null;});
    map.querySelectorAll('[data-map-zoom]').forEach(btn=>btn.addEventListener('click',()=>{mapZoom=Math.max(13,Math.min(19,mapZoom+(btn.dataset.mapZoom==='in'?1:-1)));persistRecordState();renderLiveMap();}));
  }
  function centerMapOnCurrent(){
    mapFollow=true;
    if(currentPosition){mapCenter={lat:currentPosition.lat,lng:currentPosition.lng};renderLiveMap();showRecordToast('現在地を中央に表示しました');return;}
    requestOnePosition(true);
  }
  function autoAttachMissingLocations(){
    let changed=false;
    for(const pin of savedPins){
      if(pin.lat!=null&&pin.lng!=null) continue;
      const resolved=nearestTrackPosition(Number(pin.time||Date.now()));
      if(!resolved) continue;
      pin.lat=resolved.lat;pin.lng=resolved.lng;pin.accuracy=resolved.accuracy||null;pin.locationSource='auto';changed=true;
    }
    for(const record of savedRecords){
      if(record.location&&record.location.lat!=null) continue;
      const resolved=nearestTrackPosition(Number(record.createdAt||Date.now()));
      if(!resolved) continue;
      record.location={lat:resolved.lat,lng:resolved.lng,accuracy:resolved.accuracy||null,time:resolved.time||record.createdAt,pending:false,source:'auto'};
      updateRecordLocationDB(record.id,record.location);changed=true;
    }
    if(changed) persistRecordState();
  }
  function onPosition(position){
    const next={lat:position.coords.latitude,lng:position.coords.longitude,accuracy:Math.round(position.coords.accuracy||0),time:position.timestamp||Date.now()};
    currentPosition=next;gpsStatus=`GPS取得中 ±${next.accuracy}m`;
    if(recordSessionState==='active'){
      const last=trackPoints[trackPoints.length-1],jump=last?haversineKm(last,next):0;
      if(!last||(jump>=0.002&&jump<=1)) trackPoints.push(next);
      if(trackPoints.length>5000) trackPoints=trackPoints.slice(-5000);
    }
    autoAttachMissingLocations();
    if(mapFollow) mapCenter={lat:next.lat,lng:next.lng};
    persistRecordState();updateMetrics();renderLiveMap();
  }
  function onPositionError(error){
    gpsStatus=error&&error.code===1?'位置情報の許可が必要です':'GPSを再取得しています';updateMetrics();
  }
  function startGeoWatch(){
    if(geoWatchId!==null||recordSessionState!=='active'||!navigator.geolocation) return;
    gpsStatus='GPSを取得しています';updateMetrics();
    geoWatchId=navigator.geolocation.watchPosition(onPosition,onPositionError,{enableHighAccuracy:true,maximumAge:2000,timeout:15000});
  }
  function stopGeoWatch(){if(geoWatchId!==null&&navigator.geolocation){navigator.geolocation.clearWatch(geoWatchId);geoWatchId=null;}}
  function requestOnePosition(centerAfter=false){
    if(!navigator.geolocation){showRecordToast('この端末では現在地を取得できません');return;}
    gpsStatus='現在地を確認しています';updateMetrics();
    navigator.geolocation.getCurrentPosition(p=>{onPosition(p);if(centerAfter){mapFollow=true;mapCenter={lat:currentPosition.lat,lng:currentPosition.lng};renderLiveMap();showRecordToast('現在地を中央に表示しました');}},e=>{onPositionError(e);showRecordToast('位置情報を許可してください');},{enableHighAccuracy:true,maximumAge:0,timeout:12000});
  }
  function addCurrentPin(){
    const createdAt=Date.now(),loc=locationSnapshot(createdAt);
    const pin={id:newId('pin'),lat:loc.lat,lng:loc.lng,accuracy:loc.accuracy,time:createdAt,category:'unclassified',label:'未分類の場所',note:'',parking:{},locationSource:loc.lat!=null?'auto':'pending-auto'};
    savedPins.push(pin);pendingPinId=pin.id;
    saveRecord('pin',{id:pin.id,category:pin.category,label:pin.label,note:'',parking:{},createdAt},loc);
    persistRecordState();recordSheet='pin';render();
    setTimeout(()=>showRecordToast('場所を保存しました'),0);
    if(loc.lat==null&&navigator.geolocation){
      navigator.geolocation.getCurrentPosition(onPosition,()=>{}, {enableHighAccuracy:true,maximumAge:0,timeout:12000});
    }
  }

  function initializeRecordRuntime(){
    startMetricTimer();
    if(recordSessionState==='active') startGeoWatch();else stopGeoWatch();
    if(active==='record'){renderLiveMap();bindMapGestures();if(!currentPosition) requestOnePosition(false);}
  }

  function bindRecordActions(){
    document.querySelectorAll('[data-open-sheet]').forEach(el=>el.addEventListener('click',()=>{recordSheet=el.dataset.openSheet;render();}));
    document.querySelectorAll('[data-open-parking-recall]').forEach(el=>el.addEventListener('click',()=>{recordSheet='parking-recall';render();}));
    document.querySelectorAll('[data-parking-speech]').forEach(el=>{el.addEventListener('pointerdown',e=>{e.preventDefault();try{el.setPointerCapture(e.pointerId);}catch(_e){}clearTimeout(parkingSpeechHoldTimer);parkingSpeechHoldTimer=setTimeout(()=>beginParkingSpeechHold(el),280);});el.addEventListener('pointerup',e=>{e.preventDefault();stopParkingSpeechHold();if(!parkingSpeechActive&&!parkingSpeechRecognition) showRecordToast('駐車情報は長押しで話してください');});el.addEventListener('pointercancel',stopParkingSpeechHold);});
    document.querySelectorAll('[data-parking-photo]').forEach(el=>el.addEventListener('click',captureParkingPhoto));
    document.querySelectorAll('[data-parking-action]').forEach(el=>el.addEventListener('click',()=>{const pin=activeParking();if(!pin) return;const action=el.dataset.parkingAction;if(action==='map'){active='record';recordSheet='';mapFollow=false;mapCenter={lat:pin.lat??mapCenter.lat,lng:pin.lng??mapCenter.lng};render();setTimeout(()=>showRecordToast('駐車位置を地図中央に表示しました'),0);}else if(action==='route'){if(pin.lat==null){showRecordToast('駐車位置を自動補完中です');return;}window.open(`https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}&travelmode=walking`,'_blank','noopener');}else if(action==='photo') showParkingPhoto(pin);else if(action==='note'){showRecordToast(pin.parking?.speechText||pin.note||'音声・メモはありません');}else if(action==='arrived'){pin.clearedAt=Date.now();activeParkingId='';persistRecordState();recordSheet='';render();setTimeout(()=>showRecordToast('駐車位置の常時表示を終了しました'),0);}}));
    document.querySelectorAll('[data-close-sheet]').forEach(el=>el.addEventListener('click',()=>{recordSheet='';memoDraft='';editingRecordId=null;render();}));
    document.querySelectorAll('[data-record-target]').forEach(el=>el.addEventListener('click',()=>{recordTarget=el.dataset.recordTarget;recordSheet='';persistRecordState();render();setTimeout(()=>showRecordToast(`記録先を「${recordTarget}」に変更しました`),0);}));
    document.querySelectorAll('[data-record-detail]').forEach(el=>el.addEventListener('click',()=>{recordSheet='detail';render();}));
    document.querySelectorAll('[data-pin-category]').forEach(el=>el.addEventListener('click',()=>{document.querySelectorAll('[data-pin-category]').forEach(x=>x.classList.remove('selected'));el.classList.add('selected');const parking=document.getElementById('parkingFields');if(parking) parking.classList.toggle('show',el.dataset.pinCategory==='parking');}));
    document.querySelectorAll('[data-record-action]').forEach(el=>{
      const action=el.dataset.recordAction;
      if(action==='talk'){
        el.addEventListener('pointerdown',e=>{e.preventDefault();try{el.setPointerCapture(e.pointerId);}catch(_e){}clearTimeout(speechHoldTimer);speechHoldTimer=setTimeout(()=>beginSpeechHold(el),280);});
        el.addEventListener('pointerup',e=>{e.preventDefault();stopSpeechHold();if(!speechActive&&!speechRecognition) showRecordToast('「話す」は長押ししてください');});
        el.addEventListener('pointercancel',stopSpeechHold);return;
      }
      el.addEventListener('click',()=>{
        if(action==='session'){
          if(recordSessionState==='idle'){trackPoints=[];savedPins=[];elapsedMs=0;activeStartedAt=Date.now();recordSessionState='active';mapFollow=true;}
          else if(recordSessionState==='active'){elapsedMs=elapsedNow();activeStartedAt=0;recordSessionState='paused';stopGeoWatch();}
          else{activeStartedAt=Date.now();recordSessionState='active';}
          persistRecordState();render();if(recordSessionState==='active') keepScreenAwake();setTimeout(()=>showRecordToast(recordSessionState==='active'?'GPS記録を開始しました':'一時停止しました'),0);
        }else if(action==='map-mode'){mapMode=(mapMode+1)%2;persistRecordState();render();}
        else if(action==='current') centerMapOnCurrent();
        else if(action==='pin') addCurrentPin();
        else if(action==='photo'||action==='video') openCapture(action);
        else if(action==='memo'){memoDraft='';editingRecordId=null;recordSheet='memo';render();}
        else if(action==='google-map'){const p=currentPosition||mapCenter;window.open(`https://www.google.com/maps?q=${p.lat},${p.lng}`,'_blank','noopener');}
      });
    });
    const saveMemo=document.querySelector('[data-save-memo]');if(saveMemo) saveMemo.addEventListener('click',()=>{const text=document.getElementById('recordMemo').value.trim();if(!text){showRecordToast('メモを入力してください');return;}const loc=locationSnapshot();if(editingRecordId){const old=savedRecords.find(x=>x.id===editingRecordId);const record=saveRecord(old?.kind||'speech',{...(old||{}),id:editingRecordId,text},old?.location||loc);editingRecordId=null;memoDraft='';recordSheet='';render();setTimeout(()=>showRecordToast('文字起こしを更新しました'),0);}else{saveRecord('memo',{text},loc);memoDraft='';recordSheet='';render();setTimeout(()=>showRecordToast('メモを位置つきで保存しました'),0);}});
    const savePin=document.querySelector('[data-save-pin-detail]');if(savePin) savePin.addEventListener('click',()=>{const pin=savedPins.find(x=>x.id===pendingPinId)||savedPins[savedPins.length-1];if(!pin) return;const selected=document.querySelector('[data-pin-category].selected');pin.category=selected?selected.dataset.pinCategory:(pin.category||'unclassified');const names={water:'水飲み場',toilet:'トイレ',parking:'駐車場',vending:'自販機',bench:'ベンチ',shade:'日陰・休憩',entrance:'出入口',caution:'注意場所',other:'その他',unclassified:'未分類の場所'};pin.label=names[pin.category]||'未分類の場所';pin.note=(document.getElementById('pinNote')?.value||'').trim();pin.parking=pin.category==='parking'?{...(pin.parking||{}),floor:(document.getElementById('parkingFloor')?.value||pin.parking?.floor||'').trim(),area:(document.getElementById('parkingArea')?.value||pin.parking?.area||'').trim(),number:(document.getElementById('parkingNumber')?.value||pin.parking?.number||'').trim()}:{};if(pin.category==='parking') activeParkingId=pin.id;const loc={lat:pin.lat,lng:pin.lng,accuracy:pin.accuracy,time:pin.time,pending:pin.lat==null};saveRecord('pin',{id:pin.id,category:pin.category,label:pin.label,note:pin.note,parking:pin.parking},loc);persistRecordState();recordSheet='';render();setTimeout(()=>showRecordToast(`${pin.label}として保存しました`),0);});
    const finish=document.querySelector('[data-finish-session]');if(finish) finish.addEventListener('click',()=>{elapsedMs=elapsedNow();activeStartedAt=0;recordSessionState='idle';recordSheet='';stopGeoWatch();autoAttachMissingLocations();const hasAnyLocation=trackPoints.some(p=>p.lat!=null)||savedPins.some(p=>p.lat!=null)||savedRecords.some(r=>r.location&&r.location.lat!=null);persistRecordState();render();setTimeout(()=>showRecordToast(hasAnyLocation?'散歩記録を保存しました':'散歩記録を保存しました。今回は位置情報を取得できませんでした'),0);});
  }

  function render(){
    document.getElementById('app').innerHTML=`<div class="appShell">${header()}<main>${planPage()}${searchPage()}${prepPage()}${recordPage()}${memoryPage()}</main>${parkingRecallButton()}${nav()}${sheetMarkup()}</div>`;
    document.querySelectorAll('.navBtn').forEach(btn=>btn.addEventListener('click',()=>{active=btn.dataset.tab;recordSheet='';history.replaceState(null,'',`?tab=${active}&v=clean-v6-record02-v4`);render();window.scrollTo({top:0,behavior:'instant'});}));
    bindRecordActions();
    initializeRecordRuntime();
  }

  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&recordSessionState==='active'){keepScreenAwake();startGeoWatch();}});
  render();
})();
