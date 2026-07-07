(() => {
  'use strict';
  const VERSION='outbase-calendar-design-remake-20260707';
  const KEY='outbase_calendar_design_remake_state';
  const app=document.getElementById('app');
  const mediaInput=document.getElementById('mediaInput');
  const importInput=document.getElementById('importInput');
  const pad=n=>String(n).padStart(2,'0');
  const today=()=>new Date().toISOString().slice(0,10);
  const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const dObj=s=>{if(!s)return null;const [y,m,d]=s.split('-').map(Number);return new Date(y,(m||1)-1,d||1)};
  const addDays=(s,n)=>{const d=dObj(s);d.setDate(d.getDate()+n);return iso(d)};
  const mKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}`;
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
  const uid=p=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  const fmt=s=>s?`${Number(s.slice(5,7))}/${Number(s.slice(8,10))}`:'日付なし';
  const labels={camp:'キャンプ',normal:'予定',work:'仕事',hospital:'病院',payment:'支払い',pet:'ペット',walk:'散歩',car:'車',shopping:'買い物',trip:'旅行',event:'行事'};
  const repeats={none:'なし',daily:'毎日',weekly:'毎週',monthly:'毎月',yearly:'毎年'};
  const gearStatus={home:'保管中',loaded:'積込済',use:'使用中',dry:'乾燥中',repair:'修理',replace:'買替',sold:'売却済'};

  const seed=()=>({
    route:'home', selectedDate:today(), currentMonth:today().slice(0,7), currentProjectId:'camp-akagi',
    tab:{prep:'overview',gear:'list',walk:'normal'}, drawer:null, toast:null,
    events:[
      {id:'camp-akagi',title:'スノーピーク赤城山CF',type:'camp',start:'2026-07-18',end:'2026-07-20',repeat:'none',level:4,place:'群馬県 前橋市',memo:'犬連れ。乾燥サービス、雨/風/撤収判断。'},
      {id:'pay-card',title:'カード支払い確認',type:'payment',start:today().slice(0,8)+'27',end:today().slice(0,8)+'27',repeat:'monthly',level:1,place:'',memo:'毎月確認。'},
      {id:'kota-vet',title:'コタ体調確認',type:'pet',start:addDays(today(),5),end:addDays(today(),5),repeat:'none',level:2,place:'',memo:'散歩の非公開体調メモも見る。'},
      {id:'idea-setup',title:'次回試したいレイアウト',type:'camp',start:'',end:'',repeat:'none',level:3,place:'',memo:'日付未設定。カレンダーには混ぜない。'}
    ],
    meals:[
      {id:'m1',name:'ガーリックシュリンプ',slot:'1日目 夜',people:2,ingredients:['ブラックタイガー 200〜300g','にんにく','オリーブオイル','バター','レモン'],gear:['スキレット大','トング'],note:'バケットなし。量を増やしすぎない。'},
      {id:'m2',name:'自家製ピザ',slot:'1日目 夜',people:2,ingredients:['ピザ生地','チーズ','トマトソース'],gear:['ピザ道具'],note:'生地は作る。'}
    ],
    shopping:[
      {id:'s1',name:'ブラックタイガー',group:'食材',qty:'200〜300g',done:false,source:'献立'},
      {id:'s2',name:'ブラータチーズ',group:'食材',qty:'1個',done:false,source:'献立'},
      {id:'s3',name:'コタ水・フード予備',group:'コタ',qty:'1式',done:false,source:'ペット'}
    ],
    weather:[
      {id:'w14',when:'14日前',check:'候補日と雨傾向',done:false},
      {id:'w7',when:'7日前',check:'最低気温・風・雨量',done:false},
      {id:'w3',when:'3日前',check:'設営/撤収時間帯の雨風',done:false},
      {id:'w1',when:'前日',check:'服装・積込・コタ暑寒対策',done:false},
      {id:'w0',when:'当日',check:'出発・設営・撤収判断',done:false}
    ],
    gear:[
      {id:'g1',name:'リビングシェル アイボリー',cat:'幕体',qty:1,box:'b1',car:'左後方',status:'home',set:'基本',note:'乾燥確認',last:'2026-05-17'},
      {id:'g2',name:'アメニティドームM アイボリー',cat:'幕体',qty:1,box:'b1',car:'左後方',status:'home',set:'寝室',note:'寝室用',last:'2026-05-17'},
      {id:'g3',name:'スキレット大',cat:'料理',qty:1,box:'b3',car:'キッチン箱',status:'home',set:'料理',note:'ガーリックシュリンプ用',last:'2026-06-27'},
      {id:'g4',name:'ドッグオフトン',cat:'ペット',qty:1,box:'b4',car:'右後方',status:'home',set:'コタ',note:'抜け毛確認',last:'2026-05-17'},
      {id:'g5',name:'たねほおずき',cat:'照明',qty:7,box:'b2',car:'照明箱',status:'home',set:'照明',note:'充電確認',last:'2026-05-17'}
    ],
    boxes:[
      {id:'b1',name:'シェルコン50 A',kind:'ハード収納',home:'玄関収納',car:'左後方',role:'幕体'},
      {id:'b2',name:'シェルコン50 B',kind:'ハード収納',home:'玄関収納',car:'中央後方',role:'照明/タープ'},
      {id:'b3',name:'キッチンBOX',kind:'コンテナ',home:'棚下',car:'右後方',role:'料理'},
      {id:'b4',name:'コタBOX',kind:'ペット用',home:'リビング横',car:'右後方',role:'犬用品'}
    ],
    walk:{active:false,mode:'normal',track:[],health:[],friends:[],spots:[],projectId:null},
    places:[
      {id:'p1',name:'赤城山 場内散歩ルート',type:'campWalk',publicNote:'朝向き。木陰多め。',privateNote:'体調情報は非公開。',visits:1},
      {id:'p2',name:'柏の葉公園',type:'normalWalk',publicNote:'普段散歩候補。駐車場あり。',privateNote:'犬友達候補あり。',visits:0}
    ],
    records:[{id:'r1',eventId:'camp-akagi',kind:'memo',text:'夜はバケットなし。量を増やしすぎない。',date:today(),private:false}],
    improvements:[{id:'i1',eventId:'camp-akagi',text:'雨予報なら乾燥サービスのある直営キャンプ場を優先。',done:false}]
  });
  let state=load();
  function load(){try{const raw=localStorage.getItem(KEY);if(raw)return {...seed(),...JSON.parse(raw)}}catch(e){} return seed()}
  function save(){localStorage.setItem(KEY,JSON.stringify(state))}
  function toast(msg){state.toast=msg;render();setTimeout(()=>{if(state.toast===msg){state.toast=null;render()}},1600)}
  function project(){return state.events.find(e=>e.id===state.currentProjectId)||state.events.find(e=>e.type==='camp')||state.events[0]}
  function occ(event,month=state.currentMonth){
    if(!event.start)return [];
    const [y,m]=month.split('-').map(Number), first=new Date(y,m-1,1), last=new Date(y,m,0);
    const s=dObj(event.start), e=dObj(event.end||event.start), out=[];
    const push=(a,b,idx=0)=>{
      const x=new Date(Math.max(a,first)), z=new Date(Math.min(b,last));
      while(x<=z){out.push({date:iso(x),event,idx,multi:iso(a)!==iso(b),start:iso(x)===iso(a),end:iso(x)===iso(b)});x.setDate(x.getDate()+1)}
    };
    if(!event.repeat||event.repeat==='none'){if(e>=first&&s<=last)push(s,e);return out}
    let c=new Date(s), idx=0, dur=Math.max(0,Math.round((e-s)/(86400000)));
    while(c<=last&&idx<80){let ce=new Date(c);ce.setDate(ce.getDate()+dur);if(ce>=first&&c<=last)push(new Date(c),ce,idx); if(event.repeat==='daily')c.setDate(c.getDate()+1); else if(event.repeat==='weekly')c.setDate(c.getDate()+7); else if(event.repeat==='monthly')c.setMonth(c.getMonth()+1); else if(event.repeat==='yearly')c.setFullYear(c.getFullYear()+1); else break; idx++}
    return out;
  }
  function dayOcc(date){return state.events.flatMap(e=>occ(e,date.slice(0,7))).filter(o=>o.date===date)}
  function unscheduled(){return state.events.filter(e=>!e.start)}
  function top(){
    const p=project();
    return `<div class="top"><button class="brand" data-go="home"><span class="mark">OB</span><span><b>OUTBASE</b><small>quiet camp tool</small></span></button><button class="now-chip" data-act="plan"><span class="now-dot"></span><b>${esc(p.title)}</b><small>${p.start?`${fmt(p.start)}〜${fmt(p.end||p.start)} / ${labels[p.type]}`:'日付未設定'}</small></button></div>`;
  }
  function nav(){
    return `<nav class="nav">${[['calendar','予定'],['search','探す'],['prep','準備'],['plus','＋'],['memory','思い出']].map(([r,l])=>`<button class="${state.route===r?'active':''}" data-go="${r}">${l}</button>`).join('')}</nav>`;
  }
  function home(){
    const p=project(), next=state.events.filter(e=>e.start&&e.start>=today()).sort((a,b)=>a.start.localeCompare(b.start))[0]||p;
    return `${top()}<main><section class="hero"><h1>今日は何する？</h1><p>予定を見る、準備する、現地で残す。押す場所を迷わせない。</p></section>
      <section class="surface"><div class="surface-inner"><div class="panel-head"><div><h2 class="panel-title">${esc(next.title)}</h2><p class="panel-sub">${fmt(next.start)} / ${labels[next.type]||next.type}</p></div><span class="badge dark">次</span></div>
      <div class="action-grid"><button class="action" data-go="calendar"><b>予定を見る</b><small>単体・連日・繰り返しを見分ける</small></button><button class="action" data-go="prep"><b>準備する</b><small>料理・買い物・ギア・天気</small></button><button class="action" data-go="plus"><b>現地で残す</b><small>散歩・写真・声・メモ</small></button><button class="action" data-go="memory"><b>次回に残す</b><small>思い出・改善・バックアップ</small></button></div></div></section>
      <section class="panel"><div class="metrics"><div class="metric"><small>買い物</small><b>${state.shopping.filter(x=>!x.done).length}件</b></div><div class="metric"><small>日付未設定</small><b>${unscheduled().length}件</b></div><div class="metric"><small>ギア乾燥</small><b>${state.gear.filter(g=>g.status==='dry').length}件</b></div></div></section></main>${nav()}`;
  }
  function calendar(){
    const d=new Date(Number(state.currentMonth.slice(0,4)),Number(state.currentMonth.slice(5,7))-1,1);
    const start=new Date(d);start.setDate(1-d.getDay());
    const cells=[];for(let i=0;i<42;i++){let x=new Date(start);x.setDate(start.getDate()+i);cells.push({date:iso(x),inMonth:x.getMonth()===d.getMonth(),occ:dayOcc(iso(x))})}
    const selected=dayOcc(state.selectedDate);
    let touchX=null;
    setTimeout(()=>{
      const el=document.querySelector('.calendar');
      if(!el)return;
      el.addEventListener('touchstart',e=>touchX=e.touches[0].clientX,{passive:true});
      el.addEventListener('touchend',e=>{if(touchX==null)return;const dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>60)month(dx<0?1:-1);touchX=null},{passive:true});
    },0);
    return `${top()}<main><section class="calendar"><div class="cal-head"><button class="btn" data-act="prev">前</button><div class="cal-month"><b>${d.getFullYear()}年 ${d.getMonth()+1}月</b><small>スライド月移動 / タップ選択 / ダブルタップ追加</small></div><button class="btn" data-act="next">次</button></div>
      <div class="week">${['日','月','火','水','木','金','土'].map(w=>`<span>${w}</span>`).join('')}</div><div class="grid">${cells.map(c=>dayCell(c)).join('')}</div>
      <div class="legend"><span><i class="single-dot"></i>単体予定</span><span><i></i>連日予定</span><span><i class="wood"></i>キャンプ</span><span>↻ 繰り返し</span></div></section>
      <section class="panel"><div class="panel-head"><div><h2 class="panel-title">${fmt(state.selectedDate)} の予定</h2><p class="panel-sub">予定を開くと詳細変更。日付をもう一度素早く押すと追加。</p></div><button class="btn primary" data-act="addEvent" data-date="${state.selectedDate}">追加</button></div><div class="list">${selected.length?selected.map(o=>eventItem(o.event,o)).join(''):`<div class="unscheduled"><p class="panel-sub">この日の予定はまだない。</p></div>`}</div></section>
      <section class="panel"><div class="panel-head"><div><h2 class="panel-title">日付未設定</h2><p class="panel-sub">日付のない予定はカレンダーに混ぜない。</p></div><span class="badge wood">${unscheduled().length}件</span></div><div class="list">${unscheduled().map(e=>eventItem(e)).join('')||'<p class="panel-sub">なし</p>'}</div></section></main>${nav()}`;
  }
  function dayCell(c){
    const lanes=[20,38,56]; let multi=c.occ.filter(o=>o.multi).slice(0,3), singles=c.occ.filter(o=>!o.multi).slice(0,2);
    return `<button class="day ${c.inMonth?'':'out'} ${c.date===today()?'today':''} ${c.date===state.selectedDate?'selected':''}" data-date="${c.date}">
      <span class="num">${Number(c.date.slice(8,10))}</span>
      ${multi.map((o,i)=>`<span class="multi-bar ${o.start?'start':''} ${o.end?'end':''} ${o.event.type==='camp'?'wood':''}" style="top:${lanes[i]}px">${o.start?esc(o.event.title):''}${o.event.repeat&&o.event.repeat!=='none'?' ↻':''}</span>`).join('')}
      ${singles.map(o=>`<span class="single ${o.event.repeat&&o.event.repeat!=='none'?'repeat':''}">${esc(o.event.title)}</span>`).join('')}
      ${c.occ.length>5?`<span class="more">+${c.occ.length-5}</span>`:''}
    </button>`;
  }
  function eventItem(e,o={}){
    const m=o.multi?'連日':'単体', r=e.repeat&&e.repeat!=='none'?` / ${repeats[e.repeat]}`:'';
    return `<button class="item" data-act="editEvent" data-id="${e.id}"><span><b>${esc(e.title)}</b><small>${e.start?`${fmt(e.start)}${e.end&&e.end!==e.start?'〜'+fmt(e.end):''}`:'日付未設定'} / ${m}${r} / ${labels[e.type]||e.type}</small></span><span class="badge ${o.multi?'wood':''}">${o.multi?'連日':'単体'}</span></button>`;
  }
  function search(){
    return `${top()}<main><section class="hero"><h1>探す</h1><p>場所カードを育てる。予定とは混ぜない。</p></section><section class="panel"><div class="panel-head"><h2 class="panel-title">場所カード</h2><button class="btn primary" data-act="addPlace">追加</button></div><div class="list">${state.places.map(p=>`<button class="item" data-act="editPlace" data-id="${p.id}"><span><b>${esc(p.name)}</b><small>${esc(p.publicNote)} / 訪問${p.visits}回</small></span><span class="badge">${p.type==='campWalk'?'場内':'通常'}</span></button>`).join('')}</div></section></main>${nav()}`;
  }
  function prep(){
    const tabs=[['overview','全体'],['meals','料理'],['shopping','買い物'],['gear','ギア'],['weather','天気']];
    return `${top()}<main><section class="panel"><div class="panel-head"><div><h2 class="panel-title">準備</h2><p class="panel-sub">必要なところだけ深く開く。</p></div></div><div class="tabs">${tabs.map(([id,l])=>`<button class="tab ${state.tab.prep===id?'active':''}" data-prep="${id}">${l}</button>`).join('')}</div></section>${prepBody()}</main>${nav()}`;
  }
  function prepBody(){
    if(state.tab.prep==='meals')return `<section class="surface"><div class="surface-inner"><div class="panel-head"><h2 class="panel-title">料理</h2><button class="btn primary" data-act="addMeal">追加</button></div><div class="list">${state.meals.map(m=>`<button class="item" data-act="editMeal" data-id="${m.id}"><span><b>${esc(m.name)}</b><small>${esc(m.slot)} / 材料${m.ingredients.length} / ギア${m.gear.length}<br>${esc(m.note)}</small></span><span class="badge">編集</span></button>`).join('')}</div><div class="actions"><button class="btn" data-act="genShop">買い物統合</button><button class="btn" data-act="copyShop">LINEコピー</button></div></div></section>`;
    if(state.tab.prep==='shopping')return `<section class="surface"><div class="surface-inner"><div class="panel-head"><h2 class="panel-title">買い物</h2><button class="btn primary" data-act="addShop">追加</button></div><div class="list">${state.shopping.map(i=>`<button class="item" data-act="toggleShop" data-id="${i.id}"><span><b>${i.done?'✓ ':''}${esc(i.name)}</b><small>${esc(i.qty)} / ${esc(i.group)} / ${esc(i.source)}</small></span><span class="badge">${i.done?'済':'未'}</span></button>`).join('')}</div></div></section>`;
    if(state.tab.prep==='gear')return gear();
    if(state.tab.prep==='weather')return `<section class="surface"><div class="surface-inner"><div class="panel-head"><h2 class="panel-title">天気判断</h2><span class="badge wood">判断材料</span></div><p class="panel-sub">天気は表示ではなく、設営・撤収・コタ・幕体の判断に使う。</p><div class="list" style="margin-top:10px">${state.weather.map(w=>`<button class="item" data-act="toggleWeather" data-id="${w.id}"><span><b>${w.done?'✓ ':''}${esc(w.when)}</b><small>${esc(w.check)}</small></span><span class="badge">${w.done?'済':'確認'}</span></button>`).join('')}</div><div class="metrics" style="margin-top:12px"><div class="metric"><small>設営</small><b>雨/風</b></div><div class="metric"><small>撤収</small><b>乾燥</b></div><div class="metric"><small>コタ</small><b>暑寒/湿度</b></div></div></div></section>`;
    return `<section class="surface"><div class="surface-inner"><div class="action-grid"><button class="action" data-prep="meals"><b>料理</b><small>献立→材料→買い物→ギア</small></button><button class="action" data-prep="gear"><b>ギア</b><small>登録・ボックス・積込・乾燥</small></button><button class="action" data-prep="weather"><b>天気</b><small>設営/撤収/コタ判断</small></button><button class="action" data-prep="shopping"><b>買い物</b><small>LINEコピーまで</small></button></div></div></section>`;
  }
  function gear(){
    const tabs=[['list','一覧'],['box','ボックス'],['load','積込'],['care','乾燥/修理'],['import','取込']];
    return `<section class="surface"><div class="surface-inner"><div class="panel-head"><div><h2 class="panel-title">ギア</h2><p class="panel-sub">登録・変更・ボックス・車載位置をここで管理。</p></div><button class="btn primary" data-act="addGear">登録</button></div><div class="tabs">${tabs.map(([id,l])=>`<button class="tab ${state.tab.gear===id?'active':''}" data-gear="${id}">${l}</button>`).join('')}</div></div></section>${gearBody()}`;
  }
  function gearBody(){
    if(state.tab.gear==='box')return `<section class="panel"><div class="list">${state.boxes.map(b=>{const gs=state.gear.filter(g=>g.box===b.id);return `<div class="item"><span><b>${esc(b.name)}</b><small>${esc(b.kind)} / 家:${esc(b.home)} / 車:${esc(b.car)}<br>${gs.map(g=>esc(g.name)).join(' / ')||'中身なし'}</small></span><button class="badge" data-act="editBox" data-id="${b.id}">変更</button></div>`}).join('')}</div><div class="actions"><button class="btn primary" data-act="addBox">BOX追加</button></div><div class="box-map" style="margin-top:12px">${['左後方','中央後方','右後方','ルーフ','キッチン箱','照明箱'].map(z=>`<div class="zone"><b>${z}</b>${state.gear.filter(g=>g.car===z).slice(0,3).map(g=>esc(g.name)).join('<br>')||'未設定'}</div>`).join('')}</div></section>`;
    if(state.tab.gear==='load')return `<section class="panel"><div class="list">${state.boxes.map(b=>{const gs=state.gear.filter(g=>g.box===b.id), loaded=gs.filter(g=>g.status==='loaded').length;return `<button class="item" data-act="boxLoaded" data-id="${b.id}"><span><b>${esc(b.name)}</b><small>${esc(b.car)} / ${loaded}/${gs.length} 積込済</small></span><span class="badge">${loaded===gs.length?'完了':'確認'}</span></button>`}).join('')}</div></section>`;
    if(state.tab.gear==='care')return `<section class="panel"><div class="list">${state.gear.filter(g=>['dry','repair','replace'].includes(g.status)||/乾燥|修理|買替|破損/.test(g.note)).map(gearItem).join('')||'<p class="panel-sub">乾燥・修理・買替対象なし。</p>'}</div></section>`;
    if(state.tab.gear==='import')return `<section class="panel"><p class="panel-sub">Excel・購入履歴・写真は取込候補として保存。完全解析は外部処理。</p><div class="actions"><button class="btn primary" data-act="importFile">ファイル選択</button><button class="btn" data-act="addGear">手入力登録</button></div></section>`;
    return `<section class="panel"><div class="list">${state.gear.map(gearItem).join('')}</div></section>`;
  }
  function gearItem(g){const b=state.boxes.find(x=>x.id===g.box);return `<button class="item" data-act="editGear" data-id="${g.id}"><span><b>${esc(g.name)} ×${g.qty}</b><small>${esc(g.cat)} / ${esc(b?.name||'未収納')} / 車:${esc(g.car||'未設定')} / ${gearStatus[g.status]||g.status}<br>${esc(g.note||'')}</small></span><span class="badge">変更</span></button>`}
  function plus(){
    return `${top()}<main><section class="hero"><h1>3秒で残す</h1><p>現地では考えない。散歩・写真・声・メモを残す。</p></section><section class="surface"><div class="surface-inner"><div class="action-grid"><button class="action" data-act="addEvent"><b>予定</b><small>単体・連日・繰り返し</small></button><button class="action" data-act="quickRecord"><b>記録</b><small>写真・動画・声・メモ</small></button><button class="action" data-act="beginWalkPane"><b>散歩</b><small>通常/キャンプ場・地図</small></button><button class="action" data-act="quickMemo"><b>メモ</b><small>日付未設定でも残す</small></button></div></div></section>${walk()}</main>${nav()}`;
  }
  function walk(){
    const w=state.walk;
    return `<section class="panel"><div class="panel-head"><div><h2 class="panel-title">散歩</h2><p class="panel-sub">排泄は表に出さず、体調メモ内だけ。</p></div><span class="badge ${w.active?'dark':''}">${w.active?'記録中':'停止中'}</span></div><div class="segment"><button class="${w.mode==='normal'?'active':''}" data-walk="normal">通常散歩</button><button class="${w.mode==='camp'?'active':''}" data-walk="camp">キャンプ場散歩</button></div><div class="metrics" style="margin-top:12px"><div class="metric"><small>GPS</small><b>${w.track.length}点</b></div><div class="metric"><small>スポット</small><b>${w.spots.length}</b></div><div class="metric"><small>犬友達</small><b>${w.friends.length}</b></div></div><div class="map-panel" style="margin-top:12px"><canvas id="walkMap" width="560" height="230"></canvas>${w.track.length?'':'<div class="map-empty">GPSを記録すると簡易ルート表示。<br>外部地図はGoogleマップで開く。</div>'}</div><div class="actions">${w.active?'<button class="btn danger" data-act="stopWalk">終了</button>':'<button class="btn primary" data-act="startWalk">開始</button>'}<button class="btn" data-act="gps">現在地</button><button class="btn" data-act="spot">スポット</button><button class="btn" data-act="friend">犬友達</button><button class="btn" data-act="mapOpen">Googleマップ</button></div><details class="private"><summary>体調メモ（非公開）</summary><p class="panel-sub">通常散歩でもキャンプ場散歩でも、レビュー表面・場所カード表面には出さない。</p><div class="actions"><button class="btn" data-act="health" data-type="poop">大を記録</button><button class="btn" data-act="health" data-type="pee">小を記録</button></div><div class="list" style="margin-top:10px">${w.health.slice(-3).reverse().map(h=>`<div class="item"><span><b>${h.type==='poop'?'大':'小'} / 非公開</b><small>${h.time} / ${h.mode}</small></span><span class="badge private">非公開</span></div>`).join('')||'<p class="panel-sub">まだ体調メモなし。</p>'}</div></details></section>`;
  }
  function memory(){
    return `${top()}<main><section class="hero"><h1>次回に残す</h1><p>良かったこと、困ったこと、次回忘れないことへ変える。</p></section><section class="panel"><div class="panel-head"><h2 class="panel-title">記録</h2><button class="btn primary" data-act="quickRecord">追加</button></div><div class="list">${state.records.map(r=>`<div class="item"><span><b>${esc(r.text)}</b><small>${fmt(r.date)} / ${r.private?'非公開':'共有可'}</small></span><span class="badge ${r.private?'private':''}">${r.kind}</span></div>`).join('')}</div></section><section class="panel"><div class="panel-head"><h2 class="panel-title">次回改善</h2><button class="btn" data-act="addImprove">追加</button></div><div class="list">${state.improvements.map(i=>`<button class="item" data-act="toggleImprove" data-id="${i.id}"><span><b>${i.done?'✓ ':''}${esc(i.text)}</b><small>${esc(state.events.find(e=>e.id===i.eventId)?.title||'未紐付け')}</small></span><span class="badge">${i.done?'済':'次回'}</span></button>`).join('')}</div><div class="actions"><button class="btn" data-act="backup">バックアップ</button><button class="btn" data-act="restore">復元</button><button class="btn" data-act="ics">ICS</button></div></section></main>${nav()}`;
  }
  function render(){
    app.innerHTML=(state.route==='calendar'?calendar():state.route==='search'?search():state.route==='prep'?prep():state.route==='plus'?plus():state.route==='memory'?memory():home())+drawer()+ (state.toast?`<div class="toast">${esc(state.toast)}</div>`:'');
    bind(); if(state.route==='plus')drawMap();
  }
  function drawer(){
    if(!state.drawer)return '';
    return `<div class="drawer-back" data-act="close"></div><div class="drawer">${form()}</div>`;
  }
  function form(){
    const d=state.drawer;
    if(d.type==='event'){const e=state.events.find(x=>x.id===d.id)||{id:'',title:'',type:'normal',start:d.date||state.selectedDate,end:d.date||state.selectedDate,repeat:'none',level:1,place:'',memo:''};return `<form class="form" data-form="event" data-id="${e.id}"><div class="panel-head"><h2 class="panel-title">${e.id?'予定変更':'予定追加'}</h2><button type="button" class="btn" data-act="close">閉じる</button></div><div class="field"><label>予定名</label><input name="title" value="${esc(e.title)}" required></div><div class="grid2"><div class="field"><label>種別</label><select name="type">${Object.entries(labels).map(([k,v])=>`<option value="${k}" ${e.type===k?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>深さ</label><select name="level">${[1,2,3,4].map(n=>`<option value="${n}" ${+e.level===n?'selected':''}>Lv.${n}</option>`).join('')}</select></div></div><div class="grid2"><div class="field"><label>開始日</label><input type="date" name="start" value="${esc(e.start)}"></div><div class="field"><label>終了日</label><input type="date" name="end" value="${esc(e.end||e.start)}"></div></div><div class="field"><label>繰り返し</label><select name="repeat">${Object.entries(repeats).map(([k,v])=>`<option value="${k}" ${e.repeat===k?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>場所</label><input name="place" value="${esc(e.place)}"></div><div class="field"><label>メモ</label><textarea name="memo">${esc(e.memo)}</textarea></div><button class="btn primary full">保存</button>${e.id?`<button type="button" class="btn danger full" data-act="deleteEvent" data-id="${e.id}">削除</button>`:''}</form>`}
    if(d.type==='gear'){const g=state.gear.find(x=>x.id===d.id)||{id:'',name:'',cat:'',qty:1,box:'',car:'',status:'home',set:'',note:'',last:''};return `<form class="form" data-form="gear" data-id="${g.id}"><div class="panel-head"><h2 class="panel-title">${g.id?'ギア変更':'ギア登録'}</h2><button type="button" class="btn" data-act="close">閉じる</button></div><div class="field"><label>ギア名</label><input name="name" value="${esc(g.name)}" required></div><div class="grid2"><div class="field"><label>カテゴリ</label><input name="cat" value="${esc(g.cat)}"></div><div class="field"><label>数量</label><input type="number" min="1" name="qty" value="${g.qty}"></div></div><div class="field"><label>ボックス</label><select name="box"><option value="">未収納</option>${state.boxes.map(b=>`<option value="${b.id}" ${g.box===b.id?'selected':''}>${esc(b.name)}</option>`).join('')}</select></div><div class="grid2"><div class="field"><label>車載位置</label><input name="car" value="${esc(g.car)}"></div><div class="field"><label>状態</label><select name="status">${Object.entries(gearStatus).map(([k,v])=>`<option value="${k}" ${g.status===k?'selected':''}>${v}</option>`).join('')}</select></div></div><div class="field"><label>メモ</label><textarea name="note">${esc(g.note)}</textarea></div><button class="btn primary full">保存</button></form>`}
    if(d.type==='box'){const b=state.boxes.find(x=>x.id===d.id)||{id:'',name:'',kind:'',home:'',car:'',role:''};return `<form class="form" data-form="box" data-id="${b.id}"><div class="panel-head"><h2 class="panel-title">${b.id?'BOX変更':'BOX追加'}</h2><button type="button" class="btn" data-act="close">閉じる</button></div><div class="field"><label>BOX名</label><input name="name" value="${esc(b.name)}" required></div><div class="field"><label>種類</label><input name="kind" value="${esc(b.kind)}"></div><div class="grid2"><div class="field"><label>家の保管場所</label><input name="home" value="${esc(b.home)}"></div><div class="field"><label>車載位置</label><input name="car" value="${esc(b.car)}"></div></div><div class="field"><label>役割</label><input name="role" value="${esc(b.role)}"></div><button class="btn primary full">保存</button></form>`}
    if(d.type==='record')return `<form class="form" data-form="record"><div class="panel-head"><h2 class="panel-title">記録</h2><button type="button" class="btn" data-act="close">閉じる</button></div><div class="field"><label>記録先</label><select name="eventId">${state.events.map(e=>`<option value="${e.id}" ${e.id===state.currentProjectId?'selected':''}>${esc(e.title)}</option>`).join('')}</select></div><div class="field"><label>内容</label><textarea name="text" required></textarea></div><div class="actions"><button type="button" class="btn" data-act="media">写真/動画</button></div><button class="btn primary full">保存</button></form>`;
    if(d.type==='meal'){const m=state.meals.find(x=>x.id===d.id)||{id:'',name:'',slot:'',people:2,ingredients:[],gear:[],note:''};return `<form class="form" data-form="meal" data-id="${m.id}"><div class="panel-head"><h2 class="panel-title">${m.id?'料理変更':'料理追加'}</h2><button type="button" class="btn" data-act="close">閉じる</button></div><div class="field"><label>料理名</label><input name="name" value="${esc(m.name)}" required></div><div class="grid2"><div class="field"><label>タイミング</label><input name="slot" value="${esc(m.slot)}"></div><div class="field"><label>人数</label><input type="number" name="people" value="${m.people}"></div></div><div class="field"><label>材料（改行）</label><textarea name="ingredients">${esc(m.ingredients.join('\n'))}</textarea></div><div class="field"><label>必要ギア（改行）</label><textarea name="gear">${esc(m.gear.join('\n'))}</textarea></div><div class="field"><label>メモ</label><textarea name="note">${esc(m.note)}</textarea></div><button class="btn primary full">保存</button></form>`}
    return '';
  }
  function bind(){
    document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{state.route=b.dataset.go;save();render()});
    document.querySelectorAll('[data-prep]').forEach(b=>b.onclick=()=>{state.tab.prep=b.dataset.prep;save();render()});
    document.querySelectorAll('[data-gear]').forEach(b=>b.onclick=()=>{state.tab.gear=b.dataset.gear;save();render()});
    document.querySelectorAll('[data-walk]').forEach(b=>b.onclick=()=>{state.walk.mode=b.dataset.walk;save();render()});
    document.querySelectorAll('.day').forEach(el=>{let last=0;el.onclick=()=>{const n=Date.now();if(n-last<330)state.drawer={type:'event',date:el.dataset.date};else{state.selectedDate=el.dataset.date;state.currentMonth=el.dataset.date.slice(0,7)}last=n;save();render()}});
    document.querySelectorAll('[data-act]').forEach(el=>el.onclick=e=>act(el,e));
    document.querySelectorAll('form[data-form]').forEach(f=>f.onsubmit=submit);
  }
  function act(el,e){
    const a=el.dataset.act;
    if(a==='prev')month(-1); if(a==='next')month(1);
    if(a==='addEvent')open({type:'event',date:el.dataset.date||state.selectedDate});
    if(a==='editEvent')open({type:'event',id:el.dataset.id});
    if(a==='deleteEvent'){state.events=state.events.filter(x=>x.id!==el.dataset.id);state.drawer=null;save();render();toast('削除')}
    if(a==='plan')open({type:'event',id:state.currentProjectId});
    if(a==='addGear')open({type:'gear'}); if(a==='editGear')open({type:'gear',id:el.dataset.id});
    if(a==='addBox')open({type:'box'}); if(a==='editBox')open({type:'box',id:el.dataset.id});
    if(a==='boxLoaded')toggleBox(el.dataset.id);
    if(a==='addMeal')open({type:'meal'}); if(a==='editMeal')open({type:'meal',id:el.dataset.id});
    if(a==='addShop')addShop(); if(a==='toggleShop')toggleShop(el.dataset.id); if(a==='genShop')genShop(); if(a==='copyShop')copyShop();
    if(a==='toggleWeather')toggleWeather(el.dataset.id);
    if(a==='beginWalkPane'){state.route='plus';save();render()}
    if(a==='startWalk'){state.walk.active=true;state.walk.projectId=state.walk.mode==='camp'?state.currentProjectId:null;save();render();toast('散歩開始')}
    if(a==='stopWalk'){state.walk.active=false;state.records.push({id:uid('rec'),eventId:state.walk.projectId||'',kind:'walk',text:`${state.walk.mode==='camp'?'キャンプ場散歩':'通常散歩'} GPS${state.walk.track.length}点`,date:today(),private:false});save();render();toast('散歩保存')}
    if(a==='gps')gps(); if(a==='spot')spot(); if(a==='friend')friend(); if(a==='health')health(el.dataset.type); if(a==='mapOpen')mapOpen();
    if(a==='quickRecord')open({type:'record'}); if(a==='quickMemo'){state.events.push({id:uid('evt'),title:'メモ',type:'normal',start:'',end:'',repeat:'none',level:1,memo:''});save();render();toast('日付未設定メモを追加')}
    if(a==='addPlace')toast('場所カード追加は次の画面で編集'); if(a==='editPlace')toast('場所カード詳細を開く');
    if(a==='addImprove')addImprove(); if(a==='toggleImprove')toggleImprove(el.dataset.id);
    if(a==='backup')backup(); if(a==='restore')importInput.click(); if(a==='ics')ics(); if(a==='importFile')importInput.click(); if(a==='media')mediaInput.click();
    if(a==='close'){state.drawer=null;render()}
  }
  function open(d){state.drawer=d;render()}
  function month(delta){const d=new Date(+state.currentMonth.slice(0,4),+state.currentMonth.slice(5,7)-1+delta,1);state.currentMonth=mKey(d);state.selectedDate=iso(d);save();render()}
  function submit(e){
    e.preventDefault();const f=e.target,type=f.dataset.form,id=f.dataset.id,data=Object.fromEntries(new FormData(f).entries());
    if(type==='event'){const obj={id:id||uid('evt'),title:data.title,type:data.type,start:data.start,end:data.end||data.start,repeat:data.repeat,level:+data.level,place:data.place,memo:data.memo};state.events=id?state.events.map(x=>x.id===id?{...x,...obj}:x):[...state.events,obj];if(obj.type==='camp')state.currentProjectId=obj.id;state.drawer=null;save();render();toast('予定保存')}
    if(type==='gear'){const obj={id:id||uid('gear'),name:data.name,cat:data.cat,qty:+data.qty||1,box:data.box,car:data.car,status:data.status,set:'',note:data.note,last:''};state.gear=id?state.gear.map(x=>x.id===id?obj:x):[...state.gear,obj];state.drawer=null;save();render();toast('ギア保存')}
    if(type==='box'){const obj={id:id||uid('box'),name:data.name,kind:data.kind,home:data.home,car:data.car,role:data.role};state.boxes=id?state.boxes.map(x=>x.id===id?obj:x):[...state.boxes,obj];state.drawer=null;save();render();toast('BOX保存')}
    if(type==='meal'){const obj={id:id||uid('meal'),name:data.name,slot:data.slot,people:+data.people||2,ingredients:data.ingredients.split('\n').map(x=>x.trim()).filter(Boolean),gear:data.gear.split('\n').map(x=>x.trim()).filter(Boolean),note:data.note};state.meals=id?state.meals.map(x=>x.id===id?obj:x):[...state.meals,obj];state.drawer=null;save();render();toast('料理保存')}
    if(type==='record'){state.records.push({id:uid('rec'),eventId:data.eventId,kind:'memo',text:data.text,date:today(),private:false});state.drawer=null;save();render();toast('記録保存')}
  }
  function toggleBox(id){const gs=state.gear.filter(g=>g.box===id), all=gs.every(g=>g.status==='loaded');state.gear=state.gear.map(g=>g.box===id?{...g,status:all?'home':'loaded'}:g);save();render()}
  function addShop(){const name=prompt('買い物名');if(!name)return;state.shopping.push({id:uid('shop'),name,group:'手入力',qty:prompt('数量','1')||'1',done:false,source:'手入力'});save();render()}
  function toggleShop(id){state.shopping=state.shopping.map(x=>x.id===id?{...x,done:!x.done}:x);save();render()}
  function genShop(){const set=new Set(state.shopping.map(s=>s.name));state.meals.forEach(m=>m.ingredients.forEach(x=>{if(!set.has(x)){state.shopping.push({id:uid('shop'),name:x,group:'食材',qty:'要確認',done:false,source:m.name});set.add(x)}}));save();render();toast('買い物統合')}
  async function copyShop(){const t=state.shopping.map(x=>`${x.done?'☑':'□'} ${x.name}：${x.qty}`).join('\n');try{await navigator.clipboard.writeText(t);toast('コピー')}catch(e){prompt('コピー',t)}}
  function toggleWeather(id){state.weather=state.weather.map(x=>x.id===id?{...x,done:!x.done}:x);save();render()}
  function gps(){if(!navigator.geolocation){fakeGps();return}navigator.geolocation.getCurrentPosition(p=>{state.walk.track.push({lat:p.coords.latitude,lng:p.coords.longitude,time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}),mode:state.walk.mode});save();render();toast('現在地記録')},fakeGps,{enableHighAccuracy:true,timeout:4500})}
  function fakeGps(){state.walk.track.push({lat:35.867+Math.random()/1000,lng:139.975+Math.random()/1000,time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}),mode:state.walk.mode});save();render();toast('GPS代替点')}
  function spot(){const name=prompt('スポット名');if(!name)return;state.walk.spots.push({id:uid('spot'),name,time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}),mode:state.walk.mode});save();render()}
  function friend(){const name=prompt('犬友達メモ');if(!name)return;state.walk.friends.push({id:uid('friend'),name,time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}),mode:state.walk.mode});save();render()}
  function health(type){state.walk.health.push({id:uid('h'),type,time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}),mode:state.walk.mode==='camp'?'キャンプ場散歩':'通常散歩',private:true});save();render();toast('非公開保存')}
  function mapOpen(){const p=state.walk.track.at(-1);if(!p){toast('先に現在地');return}window.open(`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`,'_blank')}
  function addImprove(){const text=prompt('次回改善');if(!text)return;state.improvements.push({id:uid('imp'),eventId:state.currentProjectId,text,done:false});save();render()}
  function toggleImprove(id){state.improvements=state.improvements.map(x=>x.id===id?{...x,done:!x.done}:x);save();render()}
  function backup(){download(new Blob([JSON.stringify({version:VERSION,state},null,2)],{type:'application/json'}),`outbase_backup_${today()}.json`)}
  function ics(){const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//OUTBASE//JP'];state.events.filter(e=>e.start).forEach(e=>{lines.push('BEGIN:VEVENT',`UID:${e.id}@outbase`,`SUMMARY:${e.title}`,`DTSTART;VALUE=DATE:${e.start.replaceAll('-','')}`,`DTEND;VALUE=DATE:${addDays(e.end||e.start,1).replaceAll('-','')}`);if(e.repeat&&e.repeat!=='none')lines.push(`RRULE:FREQ=${{daily:'DAILY',weekly:'WEEKLY',monthly:'MONTHLY',yearly:'YEARLY'}[e.repeat]}`);lines.push('END:VEVENT')});lines.push('END:VCALENDAR');download(new Blob([lines.join('\r\n')],{type:'text/calendar'}),`outbase_${today()}.ics`)}
  function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  function drawMap(){const c=document.getElementById('walkMap');if(!c)return;const ctx=c.getContext('2d'),w=c.width,h=c.height;ctx.clearRect(0,0,w,h);ctx.strokeStyle='rgba(32,31,27,.10)';for(let x=0;x<w;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}for(let y=0;y<h;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}const pts=state.walk.track;if(!pts.length)return;const lats=pts.map(p=>p.lat),lngs=pts.map(p=>p.lng),minLa=Math.min(...lats),maxLa=Math.max(...lats),minLn=Math.min(...lngs),maxLn=Math.max(...lngs);const mp=p=>({x:30+(w-60)*(maxLn===minLn?.5:(p.lng-minLn)/(maxLn-minLn)),y:h-30-(h-60)*(maxLa===minLa?.5:(p.lat-minLa)/(maxLa-minLa))});ctx.strokeStyle='#365c48';ctx.lineWidth=4;ctx.beginPath();pts.forEach((p,i)=>{const m=mp(p);i?ctx.lineTo(m.x,m.y):ctx.moveTo(m.x,m.y)});ctx.stroke();pts.forEach((p,i)=>{const m=mp(p);ctx.fillStyle=i===pts.length-1?'#a88a55':'#365c48';ctx.beginPath();ctx.arc(m.x,m.y,6,0,Math.PI*2);ctx.fill()})}
  mediaInput.onchange=()=>{const n=mediaInput.files?.length||0;if(n){state.records.push({id:uid('rec'),eventId:state.currentProjectId,kind:'media',text:`写真/動画 ${n}件`,date:today(),private:false});save();render();toast('メディア記録')}mediaInput.value=''};
  importInput.onchange=async()=>{const f=importInput.files?.[0];if(!f)return;try{const t=await f.text();if(f.name.endsWith('.json')){const o=JSON.parse(t);if(o.state)state={...seed(),...o.state}}else state.records.push({id:uid('rec'),eventId:'',kind:'import',text:`取込候補: ${f.name}`,date:today(),private:false});save();render();toast('取込保存')}catch(e){toast('読込失敗')}importInput.value=''};
  render();
})();
