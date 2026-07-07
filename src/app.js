
(() => {
  'use strict';
  const VERSION = 'outbase-field-rebuild05-20260707';
  const KEY = 'outbase_genius_ui_state';
  const SNAP_KEY = 'outbase_genius_ui_snapshot';
  const ERR_KEY = 'outbase_genius_ui_last_error';
  const app = document.getElementById('app');
  const fileInput = document.getElementById('fileInput');
  if('serviceWorker' in navigator){
    window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js?v=outbase-field-rebuild05-20260707').catch(()=>{}));
  }

  const pad=n=>String(n).padStart(2,'0');
  const today=()=>new Date().toISOString().slice(0,10);
  const dObj=s=>{if(!s)return null;const [y,m,d]=s.split('-').map(Number);return new Date(y,(m||1)-1,d||1)};
  const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const addDays=(s,n)=>{const d=dObj(s);d.setDate(d.getDate()+n);return iso(d)};
  const uid=p=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
  const fmt=s=>s?`${Number(s.slice(5,7))}/${Number(s.slice(8,10))}`:'日付なし';
  const typeName={camp:'キャンプ',normal:'予定',walk:'散歩',payment:'支払い',pet:'ペット',search:'探す',memo:'メモ',shopping:'買い物',hospital:'病院',car:'車'};
  const repeatName={none:'なし',daily:'毎日',weekly:'毎週',monthly:'毎月',yearly:'毎年'};
  const gearStatus={home:'保管中',loaded:'積込済',dry:'乾燥中',repair:'修理',replace:'買替候補',use:'使用中'};

  function seed(){
    return {
      route:'home', stage:'before', currentMonth:'2026-07', selectedDate:'2026-07-07', currentPlanId:'akagi', settings:{home:'柏市',drive:'4時間以内',mode:'sample',starterDone:false,allergy:'貝アレルギー / 魚卵苦手',servings:'大人2人+コタ'}, prepTab:'overview', gearTab:'list', gearFilter:'', walkMode:'normal', fieldMode:'kotaWalk', fieldActionMode:'kota', memoryTab:'review', memoryFilter:'all', discoverTab:'camp', candidateFilter:'all', centerQuery:'', familyTab:'pets', connectTab:'export', mealTab:'plan', timerTab:'active', siteMapTab:'map', insightTab:'all', drawer:null, toast:null, importMode:null, lastError:null,
      pets:[
        {id:'kota',name:'コタ',kind:'フレブル',role:'犬',age:'4歳',note:'暑さ寒さと地面温度を優先。体調メモは非公開。',active:true},
        {id:'ao',name:'アオ',kind:'茶虎',role:'猫',age:'4歳',note:'甘えん坊・泣き虫。留守番確認。',active:true},
        {id:'ela',name:'エラ',kind:'メインクーン',role:'猫',age:'4歳',note:'一人好き。留守番確認。',active:true},
        {id:'yuki',name:'ユキ',kind:'アメショ',role:'猫',age:'4歳',note:'最小。留守番確認。',active:true}
      ],
      family:[
        {id:'mu',name:'ムー',role:'夫',share:true},
        {id:'rin',name:'リン',role:'妻',share:true}
      ],
      petPrep:[
        {id:'pp1',petId:'kota',name:'フード',qty:'日数+予備',group:'コタ',done:false},
        {id:'pp2',petId:'kota',name:'水・ボウル',qty:'1式',group:'コタ',done:false},
        {id:'pp3',petId:'kota',name:'ドッグオフトン',qty:'1',group:'コタ',done:false},
        {id:'pp4',petId:'kota',name:'リード/首輪/カート',qty:'1式',group:'コタ',done:false},
        {id:'pp5',petId:'cats',name:'猫留守番チェック',qty:'フード/水/トイレ/室温',group:'猫',done:false}
      ],
      shares:[],
      dismissedInsights:[],
      mapPins:[
        {id:'pin1',eventId:'akagi',name:'サイト候補',kind:'サイト',x:28,y:58,public:true,note:'車と動線確認。コタの日陰も見る。',score:4},
        {id:'pin2',eventId:'akagi',name:'木陰',kind:'木陰',x:58,y:34,public:true,note:'夏のコタ休憩に良い。',score:5},
        {id:'pin3',eventId:'akagi',name:'水場',kind:'水場',x:72,y:70,public:true,note:'洗い物の距離確認。',score:3},
        {id:'pin4',eventId:'akagi',name:'注意ポイント',kind:'危険',x:40,y:78,public:false,note:'公開前に確認。',score:2}
      ],
      timers:[
        {id:'tm1',eventId:'akagi',name:'設営ひと区切り',kind:'setup',duration:1800,remaining:1800,status:'idle',startedAt:0,note:'30分で一度休憩'},
        {id:'tm2',eventId:'akagi',name:'ガーリックシュリンプ',kind:'meal',duration:600,remaining:600,status:'idle',startedAt:0,note:'火を入れすぎない'},
        {id:'tm3',eventId:'akagi',name:'コタ休憩',kind:'pet',duration:900,remaining:900,status:'idle',startedAt:0,note:'暑い日は短め'},
        {id:'tm4',eventId:'akagi',name:'撤収ラスト確認',kind:'withdraw',duration:1200,remaining:1200,status:'idle',startedAt:0,note:'忘れ物確認'}
      ],
      events:[
        {id:'akagi',title:'スノーピーク赤城山CF',type:'camp',start:'2026-07-18',end:'2026-07-20',repeat:'none',place:'群馬県 前橋市',memo:'リン友達夫婦と。雨なら乾燥サービス活用。',level:4},
        {id:'walk1',title:'コタ散歩',type:'walk',start:'2026-07-12',end:'2026-07-12',repeat:'weekly',place:'自宅周辺',memo:'通常散歩。体調ログは非公開。',level:2},
        {id:'pay1',title:'カード支払い確認',type:'payment',start:'2026-07-27',end:'2026-07-27',repeat:'monthly',place:'',memo:'月次確認。',level:1},
        {id:'idea1',title:'次のキャンプ場候補探し',type:'search',start:'',end:'',repeat:'none',place:'',memo:'犬可 / 温水 / 4時間以内。',level:1}
      ],
      meals:[
        {id:'m1',name:'ガーリックシュリンプ',slot:'1日目 夜',ingredients:['ブラックタイガー 250g','にんにく','オリーブオイル','バター','レモン'],gear:['スキレット大','トング'],note:'バケットなし。量を増やしすぎない。'},
        {id:'m2',name:'自家製ピザ',slot:'1日目 夜',ingredients:['ピザ生地','チーズ','トマトソース'],gear:['ピザ道具'],note:'生地は作る。'}
      ],
      shopping:[
        {id:'s1',name:'ブラックタイガー',qty:'250g',group:'食材',source:'ガーリックシュリンプ',done:false},
        {id:'s2',name:'ブラータチーズ',qty:'1個',group:'食材',source:'前菜',done:false},
        {id:'s3',name:'コタ用水・フード予備',qty:'1式',group:'コタ',source:'ペット',done:false}
      ],
      weather:[
        {id:'w1',when:'7日前',check:'最低気温 / 風 / 雨傾向',done:false},
        {id:'w2',when:'3日前',check:'設営・撤収時間帯の雨風',done:false},
        {id:'w3',when:'前日',check:'服装 / コタ暑寒 / 幕体判断',done:false},
        {id:'w4',when:'当日',check:'出発 / 設営 / 撤収最終判断',done:false}
      ],
      boxes:[
        {id:'b1',name:'シェルコン50 A',home:'玄関収納',car:'左後方',role:'幕体'},
        {id:'b2',name:'キッチンBOX',home:'棚下',car:'右後方',role:'料理'},
        {id:'b3',name:'コタBOX',home:'リビング横',car:'右後方',role:'犬用品'}
      ],
      gear:[
        {id:'g1',name:'リビングシェル アイボリー',cat:'幕体',qty:1,boxId:'b1',car:'左後方',status:'home',note:'乾燥確認'},
        {id:'g2',name:'アメニティドームM アイボリー',cat:'幕体',qty:1,boxId:'b1',car:'左後方',status:'home',note:'寝室'},
        {id:'g3',name:'スキレット大',cat:'料理',qty:1,boxId:'b2',car:'右後方',status:'home',note:'ガーリックシュリンプ用'},
        {id:'g4',name:'ドッグオフトン',cat:'ペット',qty:1,boxId:'b3',car:'右後方',status:'home',note:'コタ用品'},
        {id:'g5',name:'たねほおずき',cat:'照明',qty:7,boxId:'b2',car:'中央後方',status:'dry',note:'充電確認'}
      ],
      places:[
        {id:'p1',name:'柏の葉公園',kind:'通常散歩',note:'普段散歩候補。駐車場あり。',visits:3},
        {id:'p2',name:'赤城山 場内散歩ルート',kind:'キャンプ場散歩',note:'木陰あり。朝向き。',visits:1}
      ],
      notes:[
        {id:'n1',title:'次回改善',text:'雨予報なら直営・乾燥サービス優先。',private:false},
        {id:'n2',title:'体調メモ',text:'排泄記録は表に出さず、非公開だけ。',private:true}
      ],
      candidates:[
        {id:'c1',name:'スノーピーク赤城山CF',kind:'camp',area:'群馬県 前橋市',drive:'約2.5h',price:'やや高め',flags:['犬可','直営','乾燥','景色','標高'],memo:'雨や梅雨時期でも乾燥サービスが安心。夏は涼しめ。',wish:true},
        {id:'c2',name:'スノーピーク鹿沼CF',kind:'camp',area:'栃木県 鹿沼市',drive:'約2h',price:'やや高め',flags:['犬可','直営','講習','買物便利'],memo:'設営講習やランドロックMFS確認に向く。',wish:false},
        {id:'c3',name:'にこにこキャンプ場',kind:'camp',area:'茨城県 笠間市',drive:'約1.5h',price:'普通',flags:['犬可','ドッグフリー','景色'],memo:'下段ペットフリー候補。雨撤収経験あり。',wish:false},
        {id:'c4',name:'月館オートキャンプベース',kind:'camp',area:'福島県 伊達市',drive:'約3.5h',price:'普通',flags:['犬可','温水','景色'],memo:'実績あり。下り方面候補。',wish:false},
        {id:'c5',name:'柏の葉公園',kind:'walk',area:'千葉県 柏市',drive:'約20m',price:'駐車場',flags:['散歩','駐車場','近い'],memo:'コタ通常散歩候補。',wish:true}
      ],
      walk:{active:false,track:[],spots:[],friends:[],health:[]},
      records:[],
      reviews:[{id:'rv1',eventId:'akagi',title:'次回改善',text:'雨予報なら直営・乾燥サービス優先。買い物とギアは前日までに終わらせる。'}]
    }
  }

  let state=load();
  state=migrateState(state); save();
  let voiceRecorder=null, voiceChunks=[], voiceStartedAt=0, speechRecognizer=null, voiceLiveText='', wakeLockObj=null, driveAutoOffTimer=null;
  let gpsWatchId=null, gpsAutoTimer=null;
  const GPS_INTERVAL_MS=10000, GPS_JUMP_LIMIT_KM=1;
  function migrateState(s){
    const base=seed();
    s={...base,...(s||{})};
    s.settings={...base.settings,...(s.settings||{})};
    s.settings.driveAutoOffSec=Math.min(10,Math.max(1,Number(s.settings.driveAutoOffSec||3)));
    s.walk={...base.walk,...(s.walk||{})};
    s.fieldActionMode=s.fieldActionMode||base.fieldActionMode||'kota';
    s.walk.track=s.walk.track||[];s.walk.spots=s.walk.spots||[];s.walk.friends=s.walk.friends||[];s.walk.health=s.walk.health||[];s.walk.sessions=s.walk.sessions||[];
    s.drive={active:false,startedAt:0,endedAt:0,lastMoveAt:0,lastPointAt:0,lastSpeedKmh:0,hasMoved:false,startTrackIndex:0,autoEndMinutes:10,...(s.drive||{})};
    s.drivePanelOpen=typeof s.drivePanelOpen==='boolean'?s.drivePanelOpen:false;
    s.campRun={active:false,startedAt:0,endedAt:0,startLabel:'',endLabel:'',...(s.campRun||{})};
    s.fieldSessions=s.fieldSessions||[];
    s.visibilityLog={hiddenAt:0,gaps:[],...(s.visibilityLog||{})};
    s.siteMap={image:'',name:'',loadedAt:0,...(s.siteMap||{})};
    s.wake={enabled:false,active:false,...(s.wake||{})};
    s.fieldFixedMode=s.fieldFixedMode||'kota';
    s.weatherPlan=s.weatherPlan||{source:'手入力',updated:'',decisions:{setup:'未判断',withdraw:'未判断',kota:'未判断',tent:'未判断'},forecast:[]};
    s.weatherPlan.decisions={setup:'未判断',withdraw:'未判断',kota:'未判断',tent:'未判断',...(s.weatherPlan.decisions||{})};
    s.weatherPlan.forecast=s.weatherPlan.forecast||[];
    ['events','meals','shopping','weather','boxes','gear','places','notes','candidates','records','reviews','pets','family','petPrep','shares','timers','mapPins','dismissedInsights'].forEach(k=>{if(!Array.isArray(s[k]))s[k]=base[k]||[]});
    if(!s.events.some(e=>e.id===s.currentPlanId) && s.events.length)s.currentPlanId=s.events[0].id;
    if(!s.boxes.length)s.boxes=base.boxes;
    const fallbackBox=s.boxes[0]?.id||'';
    s.gear=s.gear.map(g=>({...g,id:g.id||uid('gear'),qty:g.qty||1,boxId:g.boxId||fallbackBox,status:g.status||'home'}));
    s.events=s.events.map(e=>({...e,id:e.id||uid('evt'),end:e.end||e.start||'',repeat:e.repeat||'none'}));
    s.records=s.records.map(r=>/うんち|おしっこ|排泄|体調/.test(`${r.title||''} ${r.text||''}`)?{...r,private:true}:r);
    return s;
  }
  function load(){try{const raw=localStorage.getItem(KEY); if(raw)return migrateState(JSON.parse(raw))}catch(e){} return migrateState(seed())}
  function clonePlain(obj){return JSON.parse(JSON.stringify(obj))}
  function compactStateForStorage(src){
    const s=clonePlain(src);
    let removed=0;
    (s.records||[]).forEach(r=>{
      if(r.dataUrl){
        r.dataUrl='';
        r.mediaPreviewRemoved=true;
        removed++;
      }
    });
    return {state:s,removed};
  }
  function save(){
    try{
      localStorage.setItem(KEY,JSON.stringify(state));
      return true;
    }catch(e){
      try{
        const packed=compactStateForStorage(state);
        state=packed.state;
        state.lastError={message:`保存容量を軽量化して保存: ${e.message||e}`,time:new Date().toISOString(),route:state.route,compacted:packed.removed};
        localStorage.setItem(KEY,JSON.stringify(state));
        return false;
      }catch(err){
        try{
          localStorage.setItem(ERR_KEY,JSON.stringify({version:VERSION,time:new Date().toISOString(),message:err.message||String(err),route:state?.route||''}));
        }catch(_){}
        return false;
      }
    }
  }
  function toast(msg){state.toast=msg;render();setTimeout(()=>{if(state.toast===msg){state.toast=null;render()}},1600)}
  function current(){return state.events.find(e=>e.id===state.currentPlanId)||state.events.find(e=>e.type==='camp')||state.events[0]}

  function occ(event,month=state.currentMonth){
    if(!event.start)return [];
    const [y,m]=month.split('-').map(Number), first=new Date(y,m-1,1), last=new Date(y,m,0);
    const s=dObj(event.start), e=dObj(event.end||event.start), duration=Math.max(0,Math.round((e-s)/86400000)), out=[];
    const push=a=>{
      const b=new Date(a); b.setDate(b.getDate()+duration);
      const x=new Date(Math.max(a,first)), z=new Date(Math.min(b,last));
      for(let d=new Date(x); d<=z; d.setDate(d.getDate()+1)){
        out.push({event,date:iso(d),multi:duration>0,start:iso(d)===iso(a),end:iso(d)===iso(b)});
      }
    };
    if(!event.repeat||event.repeat==='none'){ if(e>=first&&s<=last)push(new Date(s)); return out; }
    let c=new Date(s), guard=0;
    while(c<=last&&guard<120){
      const ce=new Date(c); ce.setDate(ce.getDate()+duration);
      if(ce>=first&&c<=last)push(new Date(c));
      if(event.repeat==='daily')c.setDate(c.getDate()+1);
      else if(event.repeat==='weekly')c.setDate(c.getDate()+7);
      else if(event.repeat==='monthly')c.setMonth(c.getMonth()+1);
      else if(event.repeat==='yearly')c.setFullYear(c.getFullYear()+1);
      else break;
      guard++;
    }
    return out;
  }
  function dayOcc(date){return state.events.flatMap(e=>occ(e,date.slice(0,7))).filter(o=>o.date===date)}
  function unscheduled(){return state.events.filter(e=>!e.start)}


  function planRecords(id=state.currentPlanId){
    return publicRecords().filter(r=>r.eventId===id);
  }
  function planReviews(id=state.currentPlanId){
    return (state.reviews||[]).filter(r=>!r.eventId || r.eventId===id);
  }
  function planSpan(e){
    if(!e)return '日付なし';
    if(!e.start)return '日付未設定';
    return `${fmt(e.start)}${e.end&&e.end!==e.start?'〜'+fmt(e.end):''}`;
  }
  function planProgress(e=current()){
    const id=e?.id||state.currentPlanId;
    const st=prepStats(), ps=petPrepStats();
    const rec=planRecords(id).length;
    const score=Math.round((st.score + (rec?100:25) + ps.score)/3);
    return {score,records:rec,reviews:planReviews(id).length,prep:st.score,pet:ps.score};
  }
  function sortedPlans(){
    const cur=state.currentPlanId;
    const rank=e=>{
      if(e.id===cur)return -100000;
      if(!e.start)return 1000000;
      return Math.abs((dObj(e.start)-dObj(state.selectedDate||today()))/86400000);
    };
    return state.events.slice().sort((a,b)=>rank(a)-rank(b));
  }
  function planSwitchCard(e){
    const p=planProgress(e), cur=e.id===state.currentPlanId;
    return `<div class="planSwitchCard ${cur?'current':''}">
      <div class="planSwitchTop"><span><b>${esc(e.title)}</b><small>${esc(typeName[e.type]||e.type)} / ${esc(planSpan(e))} / ${esc(e.place||'場所未設定')}</small></span><span class="pill ${cur?'dark':'wood'}">${cur?'主役':p.score}</span></div>
      <div class="planMiniStats"><span>準備<br>${p.prep}%</span><span>ペット<br>${p.pet}%</span><span>記録<br>${p.records}</span><span>整理<br>${p.reviews}</span></div>
      <div class="planDrawerOps">
        <button data-act="selectPlan" data-id="${e.id}">${cur?'表示中':'主役にする'}</button>
        <button data-act="openEvent" data-id="${e.id}">予定変更</button>
      </div>
    </div>`;
  }
  function planSwitchHtml(){
    return `<div class="form"><div class="head"><div><h2>主役プラン切替</h2><p>全画面の上部から同じ操作。邪魔にしないため、一覧はここに閉じる。</p></div><button class="btn" type="button" data-act="close">閉じる</button></div>
      <div class="planSwitchList">${sortedPlans().map(planSwitchCard).join('')}</div>
      <div class="actions"><button class="btn primary" type="button" data-act="addEvent">予定追加</button><button class="btn" type="button" data-act="copyPlanContext">現在の主役コピー</button></div>
    </div>`;
  }
  function buildPlanContext(){
    const p=current(), pr=planProgress(p);
    return `【OUTBASE 主役プラン】\\n${p.title}\\n${planSpan(p)} / ${typeName[p.type]||p.type}\\n場所:${p.place||'未設定'}\\n進捗:${pr.score}% / 準備:${pr.prep}% / ペット:${pr.pet}% / 記録:${pr.records}\\n\\n${p.memo||''}`;
  }
  function planBoardHtml(){
    const p=current(), pr=planProgress(p);
    return `<section class="section"><div class="planBoard"><div class="planBoardHead"><span><b>${esc(p.title)}</b><small>${esc(planSpan(p))} / ${esc(typeName[p.type]||p.type)} / ${esc(p.place||'場所未設定')}</small></span><span class="pill ${pr.score>=70?'dark':'wood'}">${pr.score}%</span></div><div class="planBoardOps"><button class="primary" data-act="planSwitch">プラン切替</button><button data-act="editPlan">予定変更</button><button data-act="copyPlanContext">コピー</button></div></div></section>`;
  }

  function top(){
    const p=current();
    return `<div class="top">
      <div class="top-row">
        <button class="brand" data-route="home"><span class="logo">OB</span><span><b>OUTBASE</b><small>field system</small></span></button>
        <button class="plan" data-act="planSwitch"><i></i><b>${esc(p.title)}</b><small>${p.start?`${fmt(p.start)}〜${fmt(p.end||p.start)} / ${typeName[p.type]}`:'日付未設定'}</small></button>
      </div>
      <div class="stage">
        ${[['before','準備前'],['prep','準備中'],['field','現地'],['after','帰宅後']].map(([id,label])=>`<button class="${state.stage===id?'active':''}" data-stage="${id}">${label}</button>`).join('')}
      </div>
    </div>`;
  }
  function nav(){
    return `<nav class="bottomNav">${[['calendar','▦','予定'],['discover','⌕','探す'],['prep','◫','準備'],['field','＋','現地'],['memory','○','整理']].map(([r,i,l])=>`<button class="${state.route===r?'active':''}" data-route="${r}"><b>${i}</b><span>${l}</span></button>`).join('')}</nav>`;
  }
  function shell(html){return `<div class="shell">${top()}<main class="main">${html}</main></div>${drawer()}${state.toast?`<div class="toast">${esc(state.toast)}</div>`:''}${activeRibbon03()}${nav()}`}

  function prepStats(){
    const undoneShop=state.shopping.filter(s=>!s.done).length;
    const loaded=state.gear.filter(g=>g.status==='loaded').length;
    const care=state.gear.filter(g=>['dry','repair','replace'].includes(g.status)).length;
    const wdone=state.weather.filter(w=>w.done).length;
    const score=Math.round(((state.shopping.length-undoneShop)+(loaded)+(wdone))/(Math.max(1,state.shopping.length+state.gear.length+state.weather.length))*100);
    return {undoneShop,loaded,care,wdone,score};
  }
  function planFlowHtml(){
    const st=prepStats();
    const steps=[
      ['予定', state.events.filter(e=>e.start).length, 'カレンダー確認', true],
      ['料理', state.meals.length, '献立あり', state.meals.length>0],
      ['買物', state.shopping.length-st.undoneShop, `${st.undoneShop}件未完`, st.undoneShop===0],
      ['ギア', st.loaded, `${state.gear.length-st.loaded}件未積込`, st.loaded===state.gear.length]
    ];
    return `<div class="linkPanel"><div class="linkPanelHead"><span><b>つながり</b><small>予定→準備→現地→整理を分断しない</small></span><span class="pill ${st.score>=80?'dark':'wood'}">${st.score}%</span></div><div class="linkFlow">${steps.map(s=>`<button class="linkStep ${s[3]?'done':''}" data-prep="${s[0]==='料理'?'meals':s[0]==='買物'?'shopping':s[0]==='ギア'?'gear':'overview'}"><strong>${s[0]}</strong><small>${s[2]}</small></button>`).join('')}</div></div>`;
  }
  function smartPrepRows(){
    const st=prepStats();
    return `<div class="smartList">
      <button class="smartRow" data-prep="shopping"><span class="smartMain"><b>買い物を終わらせる</b><small>献立から不足食材を足して、LINEコピーまで。</small></span><span class="roundMark ${st.undoneShop===0?'done':'warn'}">${st.undoneShop===0?'✓':st.undoneShop}</span></button>
      <button class="smartRow" data-prep="gear"><span class="smartMain"><b>ギアを積む</b><small>ボックス単位で積込。乾燥・修理もここで見る。</small></span><span class="roundMark ${st.loaded===state.gear.length?'done':''}">${st.loaded}/${state.gear.length}</span></button>
      <button class="smartRow" data-prep="weather"><span class="smartMain"><b>天気で判断する</b><small>設営・撤収・コタ・幕体をまとめて確認。</small></span><span class="roundMark ${st.wdone===state.weather.length?'done':''}">${st.wdone}/${state.weather.length}</span></button>
    </div>`;
  }
  function buildPlanSummary(){
    const p=current();
    const shop=state.shopping.filter(s=>!s.done).map(s=>`□ ${s.name}：${s.qty}`).join('\\n') || '買い物未完なし';
    const gear=state.gear.filter(g=>g.status!=='loaded').map(g=>`□ ${g.name}（${state.boxes.find(b=>b.id===g.boxId)?.name||'未収納'}）`).join('\\n') || 'ギア未積込なし';
    return `【OUTBASE 準備まとめ】\\n${p.title}\\n${p.start?`${fmt(p.start)}〜${fmt(p.end||p.start)}`:'日付未設定'}\\n\\n■買い物\\n${shop}\\n\\n■ギア\\n${gear}\\n\\n■天気判断\\n${buildWeatherReport()}`;
  }


  function candidateScore(c){
    let s=0;
    const f=c.flags||[];
    if(f.includes('犬可'))s+=25;
    if(f.includes('温水'))s+=15;
    if(f.includes('ドッグフリー'))s+=15;
    if(f.includes('景色'))s+=12;
    if(f.includes('直営'))s+=10;
    if(f.includes('乾燥'))s+=10;
    if(String(c.drive||'').includes('20m')||String(c.drive||'').includes('1.5')||String(c.drive||'').includes('2h'))s+=8;
    if(c.wish)s+=5;
    return Math.min(100,s);
  }
  function filteredCandidates(){
    const tab=state.discoverTab||'camp';
    let list=(state.candidates||[]);
    if(tab==='camp')list=list.filter(c=>c.kind==='camp');
    if(tab==='walk')list=list.filter(c=>c.kind==='walk');
    if(tab==='wish')list=list.filter(c=>c.wish);
    return list.slice().sort((a,b)=>candidateScore(b)-candidateScore(a));
  }
  function bestCandidate(){
    return filteredCandidates()[0] || (state.candidates||[])[0];
  }
  function candidateReason(c){
    if(!c)return '候補なし';
    const f=c.flags||[];
    const rs=[];
    if(f.includes('犬可'))rs.push('犬可');
    if(f.includes('温水'))rs.push('温水');
    if(f.includes('ドッグフリー'))rs.push('ドッグフリー');
    if(f.includes('直営'))rs.push('直営');
    if(f.includes('乾燥'))rs.push('乾燥安心');
    if(f.includes('景色'))rs.push('景色');
    return rs.join(' / ') || '条件メモあり';
  }
  function candidateCard(c){
    const score=candidateScore(c);
    return `<div class="candidateCard">
      <div class="candidateTop"><span><b>${esc(c.name)}</b><small>${esc(c.area)} / ${esc(c.drive)} / ${esc(c.price)}<br>${esc(c.memo)}</small></span><span class="candidateScore">${score}</span></div>
      <div class="candidateTags">${(c.flags||[]).map(f=>`<span>${esc(f)}</span>`).join('')}</div>
      <div class="candidateOps"><button data-act="candidateToPlan" data-id="${c.id}">予定化</button><button data-act="toggleCandidateWish" data-id="${c.id}">${c.wish?'候補解除':'候補保存'}</button><button data-act="copyCandidate" data-id="${c.id}">コピー</button></div>
    </div>`;
  }
  function buildCandidateText(c){
    if(!c)return '';
    return `【候補】\\n${c.name}\\n${c.area}\\n移動:${c.drive}\\n価格:${c.price}\\n条件:${(c.flags||[]).join(' / ')}\\nメモ:${c.memo}\\n点数:${candidateScore(c)}`;
  }
  function buildCompareText(){
    const list=filteredCandidates().slice(0,3);
    if(!list.length)return '候補なし';
    return list.map((c,i)=>`${i+1}. ${c.name}（${candidateScore(c)}）\\n${c.area} / ${c.drive}\\n${candidateReason(c)}\\n${c.memo}`).join('\\n\\n');
  }



  function starterProgress(){
    const st=prepStats(), gs=gearStats(), ps=petPrepStats(), ms=memoryStats();
    const items=[
      ['予定',state.events.some(e=>e.start)],
      ['準備',st.score>=40],
      ['ギア',gs.total>0 && state.boxes.length>0],
      ['ペット',ps.all.length>0],
      ['記録',publicRecords().length>0],
      ['保全',ms.reviews>0 || state.notes.length>0]
    ];
    const done=items.filter(x=>x[1]).length;
    return {items,done,score:Math.round(done/items.length*100)};
  }
  function starterPanelHtml(){
    const sp=starterProgress();
    return `<section class="section"><div class="startPanel"><div class="startHead"><span><b>はじめる</b><small>迷ったらテンプレートから作る。細かい入力は後でいい。</small></span><span class="pill ${sp.score>=70?'dark':'wood'}">${sp.score}%</span></div><div class="startSteps">${sp.items.slice(0,4).map(x=>`<div class="startStep"><b>${x[1]?'✓':'□'} ${x[0]}</b><span>${x[1]?'準備済み':'あとでOK'}</span></div>`).join('')}</div><div class="startOps"><button class="primary" data-act="createCampTemplate">次のキャンプ作成</button><button data-act="createWalkTemplate">散歩だけ開始</button><button data-act="freshStart">本番データへ切替</button><button data-act="starterBackup">作業前バックアップ</button></div></div></section>`;
  }
  function buildStarterPack(){
    return `【OUTBASE スターター】\\n主役:${current().title}\\nホーム:${state.settings?.home||'未設定'} / 移動:${state.settings?.drive||'未設定'}\\n次にやる:${prepNextTarget()[1]}\\n監査:${appAudit().score}\\n連携:${connectScore()}\\n\\nテンプレート：キャンプ / 散歩 / 本番データ切替 / バックアップ`;
  }

  function centerItems(){
    const items=[];
    state.events.forEach(e=>items.push({type:'event',id:e.id,icon:'予',title:e.title,sub:`${typeName[e.type]||e.type} / ${e.start?`${fmt(e.start)}${e.end&&e.end!==e.start?'〜'+fmt(e.end):''}`:'日付未設定'} / ${e.place||'場所未設定'}`,text:`${e.memo||''} ${e.place||''}`}));
    state.gear.forEach(g=>{const b=state.boxes.find(x=>x.id===g.boxId);items.push({type:'gear',id:g.id,icon:gearIcon(g.cat),title:g.name,sub:`${g.cat||'未分類'} / ${b?.name||'BOX未設定'} / ${gearStatus[g.status]}`,text:`${g.note||''} ${g.car||''} ${b?.home||''} ${b?.car||''}`})});
    state.boxes.forEach(b=>items.push({type:'box',id:b.id,icon:'箱',title:b.name,sub:`家:${b.home||'未設定'} / 車:${b.car||'未設定'}`,text:b.role||''}));
    state.shopping.forEach(s=>items.push({type:'shopping',id:s.id,icon:'買',title:s.name,sub:`${s.done?'購入済':'未購入'} / ${s.qty} / ${s.group}`,text:s.source||''}));
    state.meals.forEach(m=>items.push({type:'meal',id:m.id,icon:'食',title:m.name,sub:`${m.slot} / 材料${m.ingredients.length} / ギア${m.gear.length}`,text:`${m.note||''} ${m.ingredients.join(' ')} ${m.gear.join(' ')}`}));
    (state.places||[]).forEach(p=>items.push({type:'place',id:p.id,icon:'地',title:p.name,sub:`${p.kind} / 訪問${p.visits||1}回`,text:p.note||''}));
    (state.candidates||[]).forEach(c=>items.push({type:'candidate',id:c.id,icon:'探',title:c.name,sub:`${c.area} / ${c.drive} / ${candidateScore(c)}点`,text:`${c.memo||''} ${(c.flags||[]).join(' ')}`}));
    state.notes.forEach(n=>items.push({type:'note',id:n.id,icon:n.private?'非':'メ',title:n.title,sub:n.private?'非公開メモ':'共有メモ',text:n.text||''}));
    publicRecords().forEach(r=>items.push({type:'record',id:r.id,icon:'記',title:r.title||recordKindLabel(r.kind),sub:`${r.date||''} ${r.time||''} / ${r.mode||''}`,text:r.text||''}));
    state.weather.forEach(w=>items.push({type:'weather',id:w.id,icon:'天',title:w.when,sub:`${w.done?'確認済':'未確認'} / 天気判断`,text:w.check||''}));
    (state.pets||[]).forEach(p=>items.push({type:'pet',id:p.id,icon:petAvatar(p),title:p.name,sub:`${p.kind} / ${p.age}`,text:p.note||''}));
    (state.petPrep||[]).forEach(x=>items.push({type:'petPrep',id:x.id,icon:'犬',title:x.name,sub:`${x.done?'完了':'未完'} / ${x.group}`,text:x.qty||''}));
    (state.timers||[]).forEach(t=>items.push({type:'timer',id:t.id,icon:'時',title:t.name,sub:`${timerLabel(t.kind)} / ${formatTimer(timerLeft(t))} / ${t.status}`,text:t.note||''}));
    if(state.walk.track.length)items.push({type:'route',id:'current',icon:'歩',title:'現在のルート',sub:`${walkDistance().toFixed(2)}km / ${fmtDuration(walkDurationSec())}`,text:buildRouteSummary()});
    (state.mapPins||[]).forEach(p=>items.push({type:'pin',id:p.id,icon:'ピ',title:p.name,sub:`${p.kind} / ${p.public?'公開':'非公開'}`,text:p.note||''}));
    rawInsights().forEach(x=>items.push({type:'insight',id:x.id,icon:'提',title:x.title,sub:`${x.level} / ${x.cat}`,text:x.body}));
    return items;
  }
  function filteredCenterItems(){
    const q=(state.centerQuery||'').trim().toLowerCase();
    const list=centerItems();
    if(!q)return list.slice(0,8);
    return list.filter(i=>[i.title,i.sub,i.text,i.type].join(' ').toLowerCase().includes(q)).slice(0,20);
  }
  function centerIconName(type){
    return {event:'予定',gear:'ギア',box:'BOX',shopping:'買物',meal:'料理',place:'場所',candidate:'候補',note:'メモ',record:'記録',weather:'天気'}[type]||type;
  }
  function centerResult(i){
    return `<button class="centerResult" data-act="openCenterItem" data-type="${i.type}" data-id="${i.id}">
      <span class="centerIcon">${esc(i.icon)}</span>
      <span class="centerMain"><b>${esc(i.title)}</b><small>${esc(centerIconName(i.type))} / ${esc(i.sub)}</small></span>
      <span class="pill">開く</span>
    </button>`;
  }
  function unresolvedItems(){
    const items=[];
    state.events.filter(e=>!e.start).forEach(e=>items.push({type:'event',id:e.id,title:e.title,sub:'日付未設定',action:'選択日に入れる'}));
    state.shopping.filter(s=>!s.done).slice(0,4).forEach(s=>items.push({type:'shopping',id:s.id,title:s.name,sub:`買い物未完 / ${s.qty}`,action:'購入済み'}));
    state.gear.filter(g=>g.status!=='loaded').slice(0,4).forEach(g=>items.push({type:'gear',id:g.id,title:g.name,sub:`${gearStatus[g.status]} / 未積込`,action:'積込済み'}));
    state.weather.filter(w=>!w.done).slice(0,3).forEach(w=>items.push({type:'weather',id:w.id,title:w.when,sub:w.check,action:'確認済み'}));
    (state.candidates||[]).filter(c=>c.wish).slice(0,3).forEach(c=>items.push({type:'candidate',id:c.id,title:c.name,sub:`保存候補 / ${candidateScore(c)}点`,action:'予定化'}));
    return items.slice(0,10);
  }
  function inboxItem(i){
    return `<div class="inboxItem"><div class="inboxTop"><span><b>${esc(i.title)}</b><small>${esc(i.sub)}</small></span><span class="pill wood">${esc(i.action)}</span></div><div class="inboxOps"><button data-act="resolveCenterItem" data-type="${i.type}" data-id="${i.id}">処理する</button><button data-act="openCenterItem" data-type="${i.type}" data-id="${i.id}">開く</button></div></div>`;
  }
  function buildDashboardText(){
    const st=prepStats(), gs=gearStats(), ms=memoryStats(), fs=fieldStats();
    return `【OUTBASE 現在地】\\n主役:${current().title}\\n準備:${st.score}% / 買い物残:${st.undoneShop} / ギア積込:${gs.loaded}/${gs.total} / 天気:${st.wdone}/${state.weather.length}\\n現地記録:${fs.records} / 場所:${ms.places} / 改善:${ms.imp}\\n未整理:${unresolvedItems().length}\\n\\n次:${prepNextTarget()[1]}`;
  }



  function makeInsight(id,cat,title,body,action='準備へ',level='提案'){
    return {id,cat,title,body,action,level};
  }
  function rawInsights(){
    const list=[];
    const st=prepStats(), gs=gearStats(), ms=mealStats(), ps=petPrepStats(), pins=siteMapStats(), ts=timerStats();
    const weatherRisk=weatherRiskScore();
    if(st.undoneShop>0)list.push(makeInsight('shop-left','prep','買い物を先に潰す',`買い物が${st.undoneShop}件残り。現地前にLINEコピーしてまとめる。`,'買い物へ','未完'));
    if(gs.loaded<state.gear.length)list.push(makeInsight('gear-left','gear','ギア積込をBOX単位で終わらせる',`未積込が${state.gear.length-gs.loaded}件。個別ではなくBOX単位で処理する。`,'ギアへ','未完'));
    if(gs.care>0)list.push(makeInsight('gear-care','gear','乾燥/修理/買替を後回しにしない',`ケア対象が${gs.care}件。次回の準備前に状態を戻す。`,'ケアへ','注意'));
    if(weatherRisk>=50)list.push(makeInsight('weather-risk','weather','天気で構成を変える',`天気リスク${weatherRisk}。設営・撤収・コタ・幕体判断を確定する。`,'天気へ','注意'));
    if(Object.values(weatherPlan().decisions||{}).some(v=>v==='未判断'))list.push(makeInsight('weather-decision','weather','天気判断を4つだけ決める','設営 / 撤収 / コタ / 幕体のうち未判断がある。','天気へ','未完'));
    if(ms.risks>0)list.push(makeInsight('meal-risk','meal','献立の注意食材を確認',`貝アレルギー/魚卵苦手に触れる可能性が${ms.risks}件。`,'料理へ','注意'));
    if(ms.meals>0 && ms.inShop<ms.ingredients)list.push(makeInsight('meal-shop','meal','献立から買い物へ反映',`材料${ms.ingredients}件のうち買い物反映が${ms.inShop}件。`,'料理へ','未完'));
    if(ps.done<ps.all.length)list.push(makeInsight('pet-prep','pet','ペット準備を先に終わらせる',`ペット準備が${ps.all.length-ps.done}件残り。コタ用品と猫留守番を確認。`,'ペットへ','未完'));
    if(state.walk.active)list.push(makeInsight('walk-active','field','散歩記録を終了する',`現在${walkDistance().toFixed(2)}km記録中。終了しないと監査に残る。`,'現地へ','注意'));
    if(planRecords().length===0 && current().type==='camp')list.push(makeInsight('record-zero','field','現地記録を1つ残す','主役キャンプの記録がまだない。写真・メモ・場所のどれか1つで十分。','現地へ','提案'));
    if(pins.private>0)list.push(makeInsight('pin-private','field','非公開ピンを公開前確認',`非公開ピンが${pins.private}件。レビュー前に公開可否を決める。`,'MAPへ','注意'));
    if(ts.running>0)list.push(makeInsight('timer-running','timer','タイマーを確認',`実行中タイマーが${ts.running}件。終わったら完了にする。`,'タイマーへ','注意'));
    if((state.candidates||[]).filter(c=>c.wish).length>0)list.push(makeInsight('wish-plan','discover','保存候補を予定化する',`保存候補が${(state.candidates||[]).filter(c=>c.wish).length}件。行くなら予定へ入れる。`,'探すへ','提案'));
    if(improveNotes().length>0)list.push(makeInsight('improve-prep','improve','改善メモを次回準備へ戻す',`改善メモが${improveNotes().length}件。買い物・ギア・予定に戻す。`,'改善へ','提案'));
    if(connectScore()<60)list.push(makeInsight('connect','connect','バックアップ/書き出しを確認','ICS・CSV・JSONバックアップを一度出しておく。','連携へ','保全'));
    if(!list.length)list.push(makeInsight('ok','all','今は大きな未処理なし','記録を増やすほど、次回提案が強くなる。','記録へ','OK'));
    return list;
  }
  function insights(){
    const dis=new Set(state.dismissedInsights||[]);
    let list=rawInsights().filter(x=>!dis.has(x.id));
    if(state.insightTab&&state.insightTab!=='all')list=list.filter(x=>x.cat===state.insightTab || x.level===state.insightTab);
    return list;
  }
  function insightStats(){
    const all=rawInsights().filter(x=>x.id!=='ok');
    return {
      total:all.length,
      warn:all.filter(x=>x.level==='注意').length,
      undone:all.filter(x=>x.level==='未完').length,
      dismissed:(state.dismissedInsights||[]).length,
      score:Math.max(0,100-all.filter(x=>x.level==='注意').length*14-all.filter(x=>x.level==='未完').length*9-all.length*3)
    };
  }
  function insightNext(){
    const list=insights();
    const first=list[0];
    if(!first)return ['all','提案なし','いま大きな未処理はない',''];
    return [first.cat,first.title,first.body,first.id];
  }
  function insightCard(x){
    return `<div class="insightCard"><div class="insightTop"><span><b>${esc(x.title)}</b><small>${esc(x.level)} / ${esc(x.cat)}</small></span><span class="pill ${x.level==='注意'?'wood':x.level==='未完'?'wood':'dark'}">${esc(x.level)}</span></div><div class="insightBody">${esc(x.body)}</div><div class="insightOps"><button data-act="applyInsight" data-id="${x.id}">${esc(x.action)}</button><button data-act="saveInsight" data-id="${x.id}">メモ化</button><button data-act="dismissInsight" data-id="${x.id}">隠す</button></div></div>`;
  }
  function buildInsightReport(){
    const all=rawInsights();
    return `【OUTBASE 提案】\\n${current().title}\\n監査:${appAudit().score} / 提案:${all.length}\\n\\n${all.map((x,i)=>`${i+1}. ${x.title}（${x.level}）\\n${x.body}`).join('\\n\\n')}`;
  }
  function insightPanelHtml(){
    const st=insightStats(), next=insightNext();
    return `<section class="section"><div class="insightHero"><div class="insightHeroTop"><span><b>${esc(next[1])}</b><small>${esc(next[2])}。集めた記録から、次にやることだけ出す。</small></span><span class="insightScore" style="--score:${st.score}">${st.score}</span></div><div class="insightCommand"><button class="mainCmd" data-act="applyInsight" data-id="${next[3]}">${next[3]?'これをやる':'記録へ'}</button><button class="subCmd" data-act="copyInsightReport">提案コピー</button></div></div><div class="insightRail"><button class="${st.undone?'warn':'good'}" data-insight="未完"><b>${st.undone}</b><span>未完</span></button><button class="${st.warn?'warn':'good'}" data-insight="注意"><b>${st.warn}</b><span>注意</span></button><button data-insight="all"><b>${st.total}</b><span>提案</span></button><button data-insight="dismissed"><b>${st.dismissed}</b><span>非表示</span></button></div></section>`;
  }
  function insightBodyHtml(){
    if(state.insightTab==='dismissed')return `<section class="section"><div class="insightReport"><b>非表示提案</b><p>${(state.dismissedInsights||[]).join('\\n')||'なし'}</p><div class="insightReportOps"><button class="primary" data-act="resetInsights">戻す</button><button data-act="copyInsightReport">コピー</button></div></div></section>`;
    return `<section class="section"><div class="head"><div><h2>提案</h2><p>外部AIではなく、OUTBASE内の記録から作るルールベース提案。</p></div><button class="btn primary" data-act="copyInsightReport">コピー</button></div><div class="insightList">${insights().map(insightCard).join('')||`<div class="insightReport"><b>提案なし</b><p>非表示を戻すか、現地記録を増やす。</p></div>`}</div></section>`;
  }


  function findInsight(id){
    return rawInsights().find(x=>x.id===id) || insights()[0];
  }
  function applyInsight(id){
    const x=findInsight(id);
    if(!x){state.route='field';save();render();return}
    const c=x.cat;
    if(c==='prep'){state.route='prep';state.prepTab='shopping'}
    else if(c==='gear'){state.route='prep';state.prepTab='gear';state.gearTab=x.id==='gear-care'?'care':'load'}
    else if(c==='weather'){state.route='prep';state.prepTab='weather'}
    else if(c==='meal'){state.route='prep';state.prepTab='meals';state.mealTab=x.id==='meal-risk'?'safe':'plan'}
    else if(c==='pet'){state.route='prep';state.prepTab='pets';state.familyTab='pets'}
    else if(c==='field'){state.route='field'}
    else if(c==='timer'){state.route='prep';state.prepTab='timer'}
    else if(c==='discover'){state.route='discover';state.discoverTab='wish'}
    else if(c==='improve'){state.route='memory';state.memoryTab='improve'}
    else if(c==='connect'){state.route='memory';state.memoryTab='connect'}
    else {state.route='field'}
    save();render();
  }
  function saveInsight(id){
    const x=findInsight(id); if(!x)return;
    state.notes.push({id:uid('note'),title:`提案：${x.title}`,text:x.body,private:false});
    save();render();toast('提案をメモ化');
  }
  function dismissInsight(id){
    if(!id)return;
    state.dismissedInsights=state.dismissedInsights||[];
    if(!state.dismissedInsights.includes(id))state.dismissedInsights.push(id);
    save();render();toast('提案を隠した');
  }
  function resetInsights(){
    state.dismissedInsights=[];
    save();render();toast('提案を戻した');
  }
  async function copyInsightReport(){
    const text=buildInsightReport();
    try{await navigator.clipboard.writeText(text);toast('提案コピー')}catch(e){prompt('コピー',text)}
  }


  function stateSize(){
    return JSON.stringify(state).length;
  }
  function mediaSize(){
    return (state.records||[]).reduce((n,r)=>n+(r.dataUrl?String(r.dataUrl).length:0),0);
  }
  function hasRequiredArrays(){
    return ['events','meals','shopping','weather','boxes','gear','places','notes','candidates','records','reviews','pets','family','petPrep','shares','timers','mapPins','dismissedInsights'].every(k=>Array.isArray(state[k]));
  }

  function backupPayload(compact=false){
    const payloadState=compact?compactStateForStorage(state).state:migrateState(clonePlain(state));
    return {version:VERSION,createdAt:new Date().toISOString(),state:payloadState};
  }
  function backup(){
    const compact=stateSize()>3500000 || mediaSize()>1800000;
    downloadText(`outbase_backup_${today()}.json`,JSON.stringify(backupPayload(compact),null,2),'application/json');
    toast(compact?'軽量バックアップDL':'バックアップDL');
  }
  function saveSnapshot(){
    try{
      const compact=compactStateForStorage(state).state;
      localStorage.setItem(SNAP_KEY,JSON.stringify({version:VERSION,createdAt:new Date().toISOString(),state:compact}));
      toast('端末控え保存');
    }catch(e){
      state.lastError={message:`端末控え失敗: ${e.message||e}`,time:new Date().toISOString(),route:state.route};
      save();toast('端末控え失敗');
    }
  }
  function restoreSnapshot(){
    try{
      const raw=localStorage.getItem(SNAP_KEY);
      if(!raw)return toast('端末控えなし');
      const obj=JSON.parse(raw);
      if(!confirm('端末控えから復元する？ 現在データは上書きされる。'))return;
      state=migrateState(obj.state||obj);
      save();render();toast('端末控えから復元');
    }catch(e){
      toast('復元失敗');
    }
  }
  function safeSaveScore(){
    let s=100;
    const size=stateSize(), media=mediaSize();
    if(size>3500000)s-=25;
    if(media>1800000)s-=25;
    if(!localStorage.getItem(SNAP_KEY))s-=15;
    if(state.lastError?.message)s-=10;
    return Math.max(0,s);
  }
  function safeSaveGuideText(){
    return `【OUTBASE 保存/復元】\n1. 大きい写真/動画はプレビューを軽量化して保存する。\n2. JSONバックアップはスマホのファイルに残す。\n3. 端末控えはlocalStorage内の軽量スナップショット。\n4. 復元はJSONまたは端末控えから戻す。\n\n保存:${Math.round(stateSize()/1024)}KB\nメディア:${Math.round(mediaSize()/1024)}KB\n端末控え:${localStorage.getItem(SNAP_KEY)?'あり':'なし'}\nlastError:${state.lastError?.message||'なし'}`;
  }
  function safeSavePanelHtml(){
    const score=safeSaveScore();
    const hasSnap=!!localStorage.getItem(SNAP_KEY);
    return `<section class="section"><div class="safeSavePanel"><div class="safeSaveHead"><span><b>保存と復元</b><small>バックアップ未定義・容量超過・復元ズレを避けるための保全パネル。</small></span><span class="safeSaveScore" style="--score:${score}">${score}</span></div><div class="safeSaveGrid"><div class="safeSaveMetric"><b>${Math.round(stateSize()/1024)}</b><span>保存KB</span></div><div class="safeSaveMetric"><b>${Math.round(mediaSize()/1024)}</b><span>メディアKB</span></div><div class="safeSaveMetric"><b>${hasSnap?'有':'無'}</b><span>端末控え</span></div><div class="safeSaveMetric"><b>${state.lastError?.message?'有':'無'}</b><span>エラー</span></div></div><div class="safeSaveOps"><button class="primary" data-act="backup">JSON保存</button><button data-act="saveSnapshot">端末控え</button><button data-act="restoreSnapshot">控え復元</button><button data-act="clearMediaPreviews">軽量化</button><button data-act="copySafeSaveGuide">手順コピー</button><button data-act="exportDebugBundle">診断DL</button></div></div></section>`;
  }
  async function copySafeSaveGuide(){
    const text=safeSaveGuideText();
    try{await navigator.clipboard.writeText(text);toast('保存手順コピー')}catch(e){prompt('コピー',text)}
  }

  function diagnostics(){
    const size=stateSize(), media=mediaSize();
    const leak=(state.records||[]).filter(r=>!r.private && /うんち|おしっこ|排泄|体調/.test(`${r.title||''} ${r.text||''}`)).length;
    const checks=[
      ['データ構造',hasRequiredArrays(),'必要配列が揃っている'],
      ['主役プラン',!!current(),'現在の主役がある'],
      ['非公開保護',leak===0,leak?`${leak}件確認`:'公開混入なし'],
      ['容量',size<4200000,`${Math.round(size/1024)}KB`],
      ['メディア容量',media<2200000,`${Math.round(media/1024)}KB`],
      ['GPS状態',!state.walk.active || !!current(),'記録中でも主役あり'],
      ['タイマー状態',timerStats().running<4,`${timerStats().running}件実行中`],
      ['連携保全',connectScore()>=60,'書き出し/共有/バックアップ'],
      ['端末控え',!!localStorage.getItem(SNAP_KEY),localStorage.getItem(SNAP_KEY)?'あり':'未作成']
    ];
    const score=Math.round(checks.filter(x=>x[1]).length/checks.length*100);
    return {checks,score,size,media,leak};
  }
  function buildDiagnosticsReport(){
    const d=diagnostics();
    return `【OUTBASE 実機監査】\\nversion:${VERSION}\\nscore:${d.score}\\n保存:${Math.round(d.size/1024)}KB\\nメディア:${Math.round(d.media/1024)}KB\\n\\n${d.checks.map(x=>`${x[1]?'✓':'⚠'} ${x[0]}：${x[2]}`).join('\\n')}\\n\\nlastError:${state.lastError?.message||'なし'}`;
  }
  function qaPanelHtml(){
    const d=diagnostics();
    const pct=Math.min(100,Math.round(d.size/4200000*100));
    return `<section class="section"><div class="qaPanel"><div class="qaHead"><span><b>実機安定チェック</b><small>表示崩れより先に、保存・復旧・容量・非公開保護を確認。</small></span><span class="qaScore" style="--score:${d.score}">${d.score}</span></div><div class="qaGrid">${d.checks.map(x=>`<div class="qaItem ${x[1]?'':'bad'}"><b>${x[1]?'✓':'⚠'} ${esc(x[0])}</b><small>${esc(x[2])}</small></div>`).join('')}</div><div class="connectBody">保存サイズ ${Math.round(d.size/1024)}KB / メディア ${Math.round(d.media/1024)}KB<div class="storageBar"><div class="storageFill" style="--w:${pct}%"></div></div></div><div class="qaOps"><button class="primary" data-act="safeRepair">安全補修</button><button data-act="copyDiagnostics">監査コピー</button><button data-act="exportDebugBundle">診断DL</button><button data-act="clearMediaPreviews">軽量化</button></div></div></section>`;
  }
  function recoveryHtml(err){
    const msg=err?.message||state.lastError?.message||'表示エラー';
    return `<div class="recoveryPanel"><div class="recoveryCard"><b>OUTBASEを復旧する</b><p>画面生成中に止まったため、復旧メニューを表示している。これは通常の起動画面ではない。データは消さずに、構造補修・ホーム復帰・メディア軽量化を実行できる。\\n\\n${esc(msg)}</p><div class="recoveryOps"><button class="primary" id="recoverRepair">安全補修してホームへ</button><button id="recoverMedia">メディアプレビューだけ削除</button><button id="recoverBackup">診断バックアップ</button></div></div></div>`;
  }


  function safeRepair(){
    state=migrateState(state);
    state.route=state.route||'home';
    if(!['home','calendar','discover','prep','field','memory'].includes(state.route))state.route='home';
    if(!current() && state.events.length)state.currentPlanId=state.events[0].id;
    if(!state.boxes.length)state.boxes=seed().boxes;
    const fallbackBox=state.boxes[0]?.id||'';
    state.gear=state.gear.map(g=>({...g,boxId:g.boxId||fallbackBox,status:g.status||'home',qty:g.qty||1}));
    state.records=state.records.map(r=>/うんち|おしっこ|排泄|体調/.test(`${r.title||''} ${r.text||''}`)?{...r,private:true}:r);
    state.dismissedInsights=[...new Set(state.dismissedInsights||[])];
    state.lastError=null;
    save();render();toast('安全補修完了');
  }
  async function copyDiagnostics(){
    const text=buildDiagnosticsReport();
    try{await navigator.clipboard.writeText(text);toast('実機監査コピー')}catch(e){prompt('コピー',text)}
  }
  function exportDebugBundle(){
    const bundle={version:VERSION,createdAt:new Date().toISOString(),diagnostics:diagnostics(),audit:appAudit(),state};
    downloadText(`outbase_debug_${today()}.json`,JSON.stringify(bundle,null,2),'application/json');
    toast('診断DL');
  }
  function clearMediaPreviews(){
    let n=0;
    state.records=state.records.map(r=>{
      if(r.dataUrl){n++;return {...r,dataUrl:'',mediaPreviewRemoved:true}}
      return r;
    });
    state.lastError=null;
    save();render();toast(`メディア軽量化 ${n}件`);
  }

  function appAudit(){
    const issues=[];
    const warn=[];
    const p=current();
    if(!p)issues.push(['主役プランなし','予定を1つ主役にする']);
    if(p && p.type==='camp' && planRecords(p.id).length===0)warn.push(['主役記録なし','現地記録がまだない']);
    const ts=timerStats(); if(ts.running)warn.push(['タイマー実行中',`${ts.running}件`]);
    if(state.walk.active)warn.push(['散歩記録中',`${walkDistance().toFixed(2)}km`]);
    if(state.events.some(e=>!e.start))warn.push(['日付未設定予定',`${state.events.filter(e=>!e.start).length}件`]);
    const gs=gearStats();
    if(gs.noBox)warn.push(['BOX未設定ギア',`${gs.noBox}件`]);
    if(gs.care)warn.push(['乾燥/修理/買替',`${gs.care}件`]);
    const st=prepStats();
    if(st.undoneShop)warn.push(['買い物未完',`${st.undoneShop}件`]);
    if(st.loaded<state.gear.length)warn.push(['ギア未積込',`${state.gear.length-st.loaded}件`]);
    if(st.wdone<state.weather.length)warn.push(['天気未確認',`${state.weather.length-st.wdone}件`]);
    if(Object.values(weatherPlan().decisions||{}).some(v=>v==='未判断'))warn.push(['天気判断未決定','設営/撤収/コタ/幕体']);
    const ps=petPrepStats(); if(ps.done<ps.all.length)warn.push(['ペット準備未完',`${ps.all.length-ps.done}件`]);
    const leak=(state.records||[]).filter(r=>!r.private && /うんち|おしっこ|排泄|体調/.test(`${r.title||''} ${r.text||''}`));
    if(leak.length)issues.push(['非公開メモ混入',`${leak.length}件`]);
    if(!state.boxes.length)issues.push(['BOXなし','ギア収納先がない']);
    if(!state.candidates||!state.candidates.length)warn.push(['候補なし','探す候補を追加']);
    const ms=mealStats(); if(ms.risks)warn.push(['料理注意',`${ms.risks}件 アレルギー/苦手確認`]);
    if(connectScore()<60)warn.push(['連携未確認','ICS/CSV/共有/バックアップ']);
    if(!state.settings?.starterDone && state.settings?.mode==='sample')warn.push(['スターター未完','本番データ切替/テンプレート作成']);
    const dataSize=JSON.stringify(state).length;
    if(dataSize>850000)warn.push(['データ肥大','バックアップ推奨']);
    const score=Math.max(0,100-issues.length*18-warn.length*5);
    return {issues,warn,score,dataSize};
  }
  function buildAuditText(){
    const a=appAudit();
    const lines=[
      `【OUTBASE 監査】`,
      `version:${VERSION}`,
      `score:${a.score}`,
      `data:${Math.round(a.dataSize/1024)}KB`,
      ``,
      `■重大`,
      a.issues.length?a.issues.map(x=>`・${x[0]}：${x[1]}`).join('\n'):'なし',
      ``,
      `■注意`,
      a.warn.length?a.warn.map(x=>`・${x[0]}：${x[1]}`).join('\n'):'なし',
      ``,
      `■現在地`,
      buildDashboardText()
    ];
    return lines.join('\n');
  }
  function auditPanelHtml(){
    const a=appAudit();
    const rows=[...a.issues.map(x=>['重大',...x]),...a.warn.map(x=>['注意',...x])];
    return `<div class="auditPanel"><div class="auditHead"><span><b>総合監査</b><small>抜け・未完了・非公開混入をまとめて確認。</small></span><span class="auditScore" style="--score:${a.score}">${a.score}</span></div><div class="auditList">${rows.length?rows.map(r=>`<div class="auditItem"><span><b>${esc(r[1])}</b><small>${esc(r[0])} / ${esc(r[2])}</small></span><span class="pill ${r[0]==='重大'?'wood':''}">${esc(r[0])}</span></div>`).join(''):`<div class="auditItem"><span><b>問題なし</b><small>大きな抜けは見つからない。</small></span><span class="pill dark">OK</span></div>`}</div><div class="auditOps"><button class="primary" data-act="repairData">自動補修</button><button data-act="copyAudit">監査コピー</button><button data-act="backup">バックアップ</button></div></div>`;
  }

  function home(){
    const p=current();
    const undoneShop=state.shopping.filter(s=>!s.done).length;
    const loaded=state.gear.filter(g=>g.status==='loaded').length;
    const care=state.gear.filter(g=>['dry','repair','replace'].includes(g.status)).length;
    const wdone=state.weather.filter(w=>w.done).length;
    const stageText={
      before:['まず予定を見る','日付・連日・繰り返しを確認','calendar','予定を見る'],
      prep:['持ち物を終わらせる','買い物・ギア・天気をチェック','prep','準備する'],
      field:['現地で残す','散歩・現在地・スポットを3秒で記録','field','記録する'],
      after:['次回に残す','メモ・場所カード・改善を整理','memory','整理する']
    }[state.stage]||['まず予定を見る','次に押す場所だけ表示','calendar','予定を見る'];
    return shell(`
      <section class="nextAction">
        <div class="nextActionIn">
          <div class="nextLabel"><span>NEXT ACTION</span><span>${esc(p.title)}</span></div>
          <h1>${stageText[0]}</h1>
          <p>${stageText[1]}</p>
          <div class="nextButtons">
            <button class="bigGo" data-route="${stageText[2]}">${stageText[3]}<small>迷ったらここだけ押す</small></button>
            <button class="subGo" data-act="editPlan">今の主役を開く</button>
          </div>
        </div>
      </section>

      <div class="flowRail">
        ${[['before','予定'],['prep','準備'],['field','現地'],['after','整理']].map(([id,label])=>`<button class="flowStep ${state.stage===id?'active':''}" data-stage="${id}">${label}</button>`).join('')}
      </div>
${starterPanelHtml()}
      ${planBoardHtml()}
      ${timerPanelHtml()}

      <section class="section">
        <div class="head"><div><h2>テンプレート</h2><p>考えずに型から作る。あとで変更できる。</p></div></div>
        <div class="templateGrid">
          <button class="templateCard primary" data-act="createCampTemplate"><b>キャンプ</b><small>予定・準備・天気・ペットをまとめて開始</small></button>
          <button class="templateCard" data-act="createWalkTemplate"><b>散歩</b><small>通常散歩/キャンプ場散歩をすぐ開始</small></button>
          <button class="templateCard" data-act="createPaymentTemplate"><b>支払い</b><small>繰り返し予定を作成</small></button>
          <button class="templateCard" data-act="starterBackup"><b>保全</b><small>バックアップと監査をまとめる</small></button>
        </div>
      </section>

            ${planFlowHtml()}
      ${insightPanelHtml()}
      <div class="commandDock">
        <button class="btn primary" data-act="copyPlanSummary">準備まとめコピー</button>
        <button class="btn" data-act="autoNext">次に進める</button>
      </div>

      <section class="section">
        <div class="head"><div><h2>今やること</h2><p>細かい管理画面へ行かず、この場で確認できるものを先に出す。</p></div></div>
        <div class="easyCard">
          <div class="easyTitle"><b>準備チェック</b><small>${undoneShop}件買い物 / ${state.gear.length-loaded}件未積込</small></div>
          <button class="checkRow" data-prep="shopping">
            <span class="checkMain"><strong>買い物</strong><small>未完了 ${undoneShop}件。LINEコピーもここ。</small></span>
            <span class="checkMark ${undoneShop===0?'done':''}">${undoneShop===0?'✓':'›'}</span>
          </button>
          <button class="checkRow" data-prep="gear">
            <span class="checkMain"><strong>ギア</strong><small>積込 ${loaded}/${state.gear.length}。ボックス単位で確認。</small></span>
            <span class="checkMark ${loaded===state.gear.length?'done':''}">${loaded===state.gear.length?'✓':'›'}</span>
          </button>
          <button class="checkRow" data-prep="weather">
            <span class="checkMain"><strong>天気判断</strong><small>${wdone}/${state.weather.length}確認。設営・撤収・コタ判断。</small></span>
            <span class="checkMark ${wdone===state.weather.length?'done':''}">${wdone===state.weather.length?'✓':'›'}</span>
          </button>
        </div>

        <div class="easyCard">
          <div class="easyTitle"><b>すぐ使う</b><small>説明を読まずに押す</small></div>
          <div class="fieldGrid">
            <button class="fieldBig primary" data-route="field"><b>散歩開始</b><small>通常/キャンプ場を選んで記録</small></button>
            <button class="fieldBig" data-act="gps"><b>現在地</b><small>地図へ1点追加</small></button>
            <button class="fieldBig" data-act="addEvent"><b>予定追加</b><small>単体/連日/繰り返し</small></button>
            <button class="fieldBig" data-act="addNote"><b>メモ</b><small>後で整理へ送る</small></button>
          </div>
        </div>
      </section>


      <section class="section">
        <div class="centerPanel">
          <div class="centerHead"><span><b>全部から探す</b><small>予定・ギア・買い物・料理・場所・候補・記録をまとめて探す。</small></span><span class="pill">${centerItems().length}件</span></div>
          <div class="centerSearch"><input id="centerSearchInput" placeholder="例：赤城、スキレット、乾燥、コタ" value="${esc(state.centerQuery||'')}"><button class="btn primary" data-act="clearCenterSearch">クリア</button></div>
          <div class="centerResults" id="centerResults">${filteredCenterItems().map(centerResult).join('')||`<div class="centerResult"><span class="centerIcon">無</span><span class="centerMain"><b>該当なし</b><small>別の言葉で探す。</small></span><span class="pill">0</span></div>`}</div>
        </div>
      </section>

      <section class="section">
        <div class="head"><div><h2>未整理・未完了</h2><p>放置すると面倒になるものだけ集める。</p></div><span class="pill ${unresolvedItems().length?'wood':'dark'}">${unresolvedItems().length}件</span></div>
        <div class="inboxGrid">${unresolvedItems().map(inboxItem).join('')||`<div class="dashboardCopy"><b>未処理なし</b><p>いま急いで処理するものはない。</p></div>`}</div>
      </section>

      <section class="section">
        <div class="dashboardCopy"><b>現在地コピー</b><p>${esc(buildDashboardText())}</p><div class="dashboardOps"><button class="primary" data-act="copyDashboard">コピー</button><button data-act="autoNext">次に進める</button></div></div>
      </section>


      <section class="section">
        ${auditPanelHtml()}
      ${qaPanelHtml()}
      ${safeSavePanelHtml()}
      ${insightPanelHtml()}
      </section>

      <section class="section">
        <div class="metricGrid">
          <div class="metricBox"><small>買い物未完</small><b>${undoneShop}</b></div>
          <div class="metricBox"><small>未積込</small><b>${state.gear.length-loaded}</b></div>
          <div class="metricBox"><small>乾燥/修理</small><b>${care}</b></div>
        </div>
      </section>
    `)
  }


  function eventIcon(type){
    return {camp:'幕',walk:'犬',payment:'¥',pet:'猫',search:'探',shopping:'買',hospital:'医',car:'車',memo:'メ',normal:'予'}[type]||'予';
  }
  function eventTypeClass(type){
    return ['camp','walk','payment'].includes(type)?type:'';
  }
  function monthAllEvents(){
    return state.events.filter(e=>e.start && occ(e,state.currentMonth).length).sort((a,b)=>(a.start||'').localeCompare(b.start||''));
  }
  function dayRisk(date){
    const os=dayOcc(date);
    const multi=os.filter(o=>o.multi).length;
    const camp=os.some(o=>o.event.type==='camp');
    const pay=os.some(o=>o.event.type==='payment');
    const walk=os.some(o=>o.event.type==='walk');
    const tips=[];
    if(os.length>=3)tips.push('予定が重なっている');
    if(camp && state.weather.some(w=>!w.done))tips.push('キャンプ前の天気判断が未完了');
    if(camp && state.gear.some(g=>g.status!=='loaded'))tips.push('ギア未積込あり');
    if(pay)tips.push('支払い確認日');
    if(walk)tips.push('散歩予定あり');
    return tips;
  }
  function eventMini(o){
    const e=o.event||o;
    const range=e.start?`${fmt(e.start)}${e.end&&e.end!==e.start?'〜'+fmt(e.end):''}`:'日付未設定';
    const rep=e.repeat&&e.repeat!=='none'?` / ${repeatName[e.repeat]}`:'';
    return `<button class="eventMini" data-act="openEvent" data-id="${e.id}">
      <span class="typeIcon ${eventTypeClass(e.type)}">${eventIcon(e.type)}</span>
      <span style="min-width:0;flex:1"><strong>${esc(e.title)}</strong><small>${typeName[e.type]||e.type} / ${range}${rep}<br>${esc(e.place||'場所未設定')}</small></span>
      <span class="pill ${state.currentPlanId===e.id?'dark':''}">${state.currentPlanId===e.id?'主役':'編集'}</span>
    </button>`;
  }


  function discover(){
    const best=bestCandidate();
    const list=filteredCandidates();
    const campCount=(state.candidates||[]).filter(c=>c.kind==='camp').length;
    const walkCount=(state.candidates||[]).filter(c=>c.kind==='walk').length;
    const wishCount=(state.candidates||[]).filter(c=>c.wish).length;
    return shell(`
      <section class="discoverHero">
        <div class="discoverHeroTop">
          <span><b>${best?esc(best.name):'候補を探す'}</b><small>${best?esc(candidateReason(best)):'犬可・温水・ドッグフリー・景色・距離で絞る'}。探すだけで終わらせず、予定化まで進める。</small></span>
          <span class="discoverScore" style="--score:${best?candidateScore(best):0}">${best?candidateScore(best):0}</span>
        </div>
        <div class="discoverCommand">
          <button class="mainCmd" data-act="candidateToPlan" data-id="${best?best.id:''}">この候補で予定化</button>
          <button class="subCmd" data-act="compareCandidates">上位比較</button>
        </div>
      </section>

      <div class="conditionRail">
        <button data-discover="camp"><b>${campCount}</b><span>キャンプ</span></button>
        <button data-discover="walk"><b>${walkCount}</b><span>散歩</span></button>
        <button data-discover="wish"><b>${wishCount}</b><span>保存</span></button>
        <button data-discover="conditions"><b>条件</b><span>基準</span></button>
      </div>

      <section class="section"><div class="tabs">${['camp:キャンプ','walk:散歩','wish:保存','conditions:条件','compare:比較'].map(x=>{const [id,l]=x.split(':');return `<button class="tab ${state.discoverTab===id?'active':''}" data-discover="${id}">${l}</button>`}).join('')}</div></section>
      ${discoverBody()}
    `)
  }
  function discoverBody(){
    const list=filteredCandidates();
    if(state.discoverTab==='conditions')return `<section class="section"><div class="conditionPanel"><div class="conditionHead"><b>探す基準</b><small>ムーの条件を点数化。外部検索APIではなく、候補メモを判断しやすくする画面。</small></div><div class="conditionList">
      ${[['犬可','最優先。犬不可は候補にしない'],['温水','冬キャンプ優先条件'],['ドッグフリー','次点で強い条件'],['景色','満足度に効く'],['4時間以内','下り方面希望。遠すぎる候補を避ける'],['暑期','エアコン付き・1泊2万円以下なら候補']].map(r=>`<div class="conditionRow"><span><b>${r[0]}</b><small>${r[1]}</small></span><span class="pill dark">基準</span></div>`).join('')}
      </div></div><div class="commandDock"><button class="btn primary" data-act="addCandidate">候補追加</button><button class="btn" data-act="compareCandidates">比較コピー</button></div></section>`;
    if(state.discoverTab==='compare')return `<section class="section"><div class="compareBox"><b>上位比較</b><p>${esc(buildCompareText())}</p><div class="compareGrid"><button class="primary" data-act="compareCandidates">コピー</button><button data-act="addCandidate">候補追加</button></div></div></section>`;
    return `<section class="section"><div class="head"><div><h2>${state.discoverTab==='walk'?'散歩候補':state.discoverTab==='wish'?'保存候補':'キャンプ候補'}</h2><p>候補を見て、良ければそのまま予定へ入れる。</p></div><button class="btn primary" data-act="addCandidate">追加</button></div><div class="candidateList">${list.map(candidateCard).join('')||`<div class="compareBox"><b>候補なし</b><p>候補を追加するとここに出る。</p></div>`}</div></section>`;
  }

  function calendar(){
    const [y,m]=state.currentMonth.split('-').map(Number), first=new Date(y,m-1,1), start=new Date(first); start.setDate(1-start.getDay());
    const cells=[]; for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i); const s=iso(d); cells.push({date:s,inMonth:d.getMonth()===m-1,occ:dayOcc(s)})}
    const selected=dayOcc(state.selectedDate);
    const risks=dayRisk(state.selectedDate);
    const monthEvents=monthAllEvents();
    return shell(`
      <section class="calendarBoard compactCalendar">
        <div class="calHeader"><button class="calBtn" data-act="prevMonth">‹</button><div class="monthTitle"><b>${y}.${pad(m)}</b><small>タップで日付 / ダブルタップで追加 / 左右スワイプで月移動</small></div><button class="calBtn" data-act="nextMonth">›</button></div>
        <div class="monthTools"><button data-act="goToday">今日</button><button class="primary" data-act="addEvent" data-date="${state.selectedDate}">予定追加</button><button data-act="autoNext">次へ</button></div>
        <div class="week">${['日','月','火','水','木','金','土'].map(w=>`<span>${w}</span>`).join('')}</div>
        <div class="days" id="days">${cells.map(dayCell).join('')}</div>
        <div class="legend"><span><i class="dot"></i>単体</span><span><i class="bar"></i>連日</span><span><i class="camp"></i>キャンプ</span><span>↻ 繰り返し</span></div>
      </section>

      <section class="section">
        <div class="dayFocus">
          <div class="dayFocusTop">
            <span><b>${fmt(state.selectedDate)}</b><small>${selected.length?`${selected.length}件の予定`:'空いている日'} / 押すだけで追加</small></span>
            <span class="pill ${risks.length?'wood':''}">${risks.length?`${risks.length}注意`:'OK'}</span>
          </div>
          <div class="quickAdd">
            <button data-act="quickAdd" data-type="camp"><b>幕</b><span>キャンプ</span></button>
            <button data-act="quickAdd" data-type="normal"><b>予</b><span>予定</span></button>
            <button data-act="quickAdd" data-type="walk"><b>犬</b><span>散歩</span></button>
            <button data-act="quickAdd" data-type="payment"><b>¥</b><span>支払い</span></button>
          </div>
          <div class="eventStack">
            ${selected.length?selected.map(eventMini).join(''):`<div class="eventMini"><span class="typeIcon">空</span><span style="min-width:0;flex:1"><strong>予定なし</strong><small>上のボタンでこの日にすぐ追加。</small></span><span class="pill">空き</span></div>`}
            ${risks.length?`<div class="warnLine">${risks.map(esc).join(' / ')}</div>`:''}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="head"><div><h2>今月の流れ</h2><p>月全体の予定を下でまとめて見る。</p></div><span class="pill">${monthEvents.length}件</span></div>
        <div class="timeline">${monthEvents.slice(0,8).map(e=>`<button class="timeItem" data-act="openEvent" data-id="${e.id}"><b>${esc(e.title)}</b><small>${fmt(e.start)}${e.end&&e.end!==e.start?'〜'+fmt(e.end):''} / ${typeName[e.type]||e.type}</small></button>`).join('')||`<div class="timeItem"><b>予定なし</b><small>この月にはまだ予定がない。</small></div>`}</div>
      </section>

      <section class="section">
        <div class="head"><div><h2>日付未設定</h2><p>候補はカレンダーに混ぜず、選択中の日付へすぐ入れる。</p></div><span class="pill">${unscheduled().length}件</span></div>
        <div class="unscheduledDock">${unscheduled().map(e=>`<button class="unscheduledRow" data-act="dateUnscheduled" data-id="${e.id}"><span><b>${esc(e.title)}</b><small>${esc(e.memo||'選択中の日付へ入れる')}</small></span><span class="pill">日付付け</span></button>`).join('')||`<div class="unscheduledRow"><span><b>なし</b><small>未設定の予定はない。</small></span><span class="pill">OK</span></div>`}</div>
      </section>
    `)
  }

  function dayCell(c){
    const multis=c.occ.filter(o=>o.multi).slice(0,2), singles=c.occ.filter(o=>!o.multi).slice(0,2), tops=[22,38];
    return `<button class="day ${c.inMonth?'':'out'} ${c.date===today()?'today':''} ${c.date===state.selectedDate?'selected':''}" data-day="${c.date}">
      <span class="num">${Number(c.date.slice(8,10))}</span>
      ${multis.map((o,i)=>`<span class="multi ${o.event.type==='camp'?'camp':''} ${o.start?'start':''} ${o.end?'end':''}" style="top:${tops[i]}px">${o.start?esc(o.event.title):''}${o.event.repeat!=='none'?' ↻':''}</span>`).join('')}
      ${singles.map(o=>`<span class="single ${o.event.repeat!=='none'?'repeat':''}">${esc(o.event.title)}</span>`).join('')}
    </button>`
  }
  function eventRow(e,o=null){
    const kind=o?(o.multi?'連日':'単体'):(e.start&&e.end&&e.start!==e.end?'連日':'単体'), rep=e.repeat&&e.repeat!=='none'?` / ${repeatName[e.repeat]}`:'';
    return `<button class="row" data-act="openEvent" data-id="${e.id}"><span><strong>${esc(e.title)}</strong><small>${typeName[e.type]||e.type} / ${e.start?`${fmt(e.start)}${e.end&&e.end!==e.start?'〜'+fmt(e.end):''}`:'日付未設定'} / ${kind}${rep}<br>${esc(e.place||'場所未設定')}</small></span><span class="pill ${kind==='連日'?'wood':''}">${kind}</span></button>`
  }



  function weatherPlan(){
    state.weatherPlan=state.weatherPlan||{source:'手入力',updated:'',decisions:{setup:'未判断',withdraw:'未判断',kota:'未判断',tent:'未判断'},forecast:[]};
    state.weatherPlan.decisions=state.weatherPlan.decisions||{setup:'未判断',withdraw:'未判断',kota:'未判断',tent:'未判断'};
    state.weatherPlan.forecast=state.weatherPlan.forecast||[];
    return state.weatherPlan;
  }
  function weatherRiskScore(){
    const wp=weatherPlan();
    const rows=wp.forecast||[];
    if(!rows.length)return 0;
    const maxRain=Math.max(...rows.map(r=>+r.rain||0));
    const maxWind=Math.max(...rows.map(r=>+r.wind||0));
    const maxTemp=Math.max(...rows.map(r=>+r.temp||0));
    const minTemp=Math.min(...rows.map(r=>+r.temp||0));
    let risk=Math.round(maxRain*.45 + Math.min(40,maxWind*5) + (maxTemp>=30?12:0) + (minTemp<=8?10:0));
    return Math.min(100,Math.max(0,risk));
  }
  function weatherLevel(){
    const r=weatherRiskScore();
    if(r>=75)return ['高','雨風を避ける判断が必要'];
    if(r>=50)return ['中','設営/撤収の時間を調整'];
    if(r>=25)return ['低','通常運用で確認'];
    return ['軽','大きな問題なし'];
  }
  function weatherNextDecision(){
    const wp=weatherPlan(), d=wp.decisions||{};
    if(d.setup==='未判断')return ['setup','設営判断を決める','雨・風で設営順とタープを決める'];
    if(d.withdraw==='未判断')return ['withdraw','撤収判断を決める','雨撤収か乾燥サービスか決める'];
    if(d.kota==='未判断')return ['kota','コタ判断を決める','暑さ・寒さ・散歩時間を決める'];
    if(d.tent==='未判断')return ['tent','幕体判断を決める','リビシェル/タープ/寝室を決める'];
    return ['copy','天気まとめをコピー','判断は一通り完了'];
  }
  function weatherSuggestion(type){
    const risk=weatherRiskScore();
    const rows=weatherPlan().forecast||[];
    const maxRain=Math.max(0,...rows.map(r=>+r.rain||0));
    const maxWind=Math.max(0,...rows.map(r=>+r.wind||0));
    const maxTemp=Math.max(0,...rows.map(r=>+r.temp||0));
    const minTemp=Math.min(99,...rows.map(r=>+r.temp||99));
    if(type==='setup'){
      if(maxWind>=7)return '風強め。タープは無理せず、幕体を先に安定させる。';
      if(maxRain>=60)return '雨設営想定。荷物を濡らさない順番で、設営を短縮。';
      return '通常設営。風だけ直前確認。';
    }
    if(type==='withdraw'){
      if(maxRain>=50)return '雨撤収候補。直営なら乾燥サービスや帰宅後乾燥を前提。';
      return '通常撤収。朝露と乾燥だけ確認。';
    }
    if(type==='kota'){
      if(maxTemp>=30)return 'コタ暑さ注意。散歩は朝夕、日中は冷却・日陰優先。';
      if(minTemp<=8)return 'コタ寒さ注意。寝床と服を確認。';
      return 'コタは通常運用。地面温度だけ確認。';
    }
    if(type==='tent'){
      if(maxWind>=7)return '風対策優先。タープを小さくする/張らない判断。';
      if(maxRain>=60)return '雨対策優先。リビシェル中心、導線を短くする。';
      return '通常構成でOK。気温で寝具だけ調整。';
    }
    return risk>=50?'慎重判断':'通常判断';
  }
  function buildWeatherReport(){
    const wp=weatherPlan(), lv=weatherLevel();
    const forecast=(wp.forecast||[]).map(r=>`・${r.label} ${r.time}：雨${r.rain}% / 風${r.wind}m / ${r.temp}℃ / 湿度${r.humidity}% ${r.note?`/ ${r.note}`:''}`).join('\\n') || '予報メモなし';
    const checks=state.weather.map(w=>`${w.done?'✓':'□'} ${w.when}：${w.check}`).join('\\n');
    const d=wp.decisions||{};
    return `【OUTBASE 天気判断】\\n${current().title}\\nリスク:${weatherRiskScore()}（${lv[0]}） ${lv[1]}\\n更新:${wp.updated||'未更新'} / ${wp.source||'手入力'}\\n\\n■判断\\n設営:${d.setup||'未判断'}\\n撤収:${d.withdraw||'未判断'}\\nコタ:${d.kota||'未判断'}\\n幕体:${d.tent||'未判断'}\\n\\n■予報メモ\\n${forecast}\\n\\n■確認タイミング\\n${checks}`;
  }


  function petPrepStats(){
    const all=state.petPrep||[];
    const done=all.filter(x=>x.done).length;
    const score=Math.round(done/Math.max(1,all.length)*100);
    const kota=all.filter(x=>x.petId==='kota');
    const cats=all.filter(x=>x.petId==='cats'||x.petId!=='kota');
    return {all,done,score,kota,cats};
  }
  function familyNextTarget(){
    const ps=petPrepStats();
    if(ps.done<ps.all.length)return ['pets','ペット準備を終わらせる',`${ps.all.length-ps.done}件残り`];
    if(Object.values(weatherPlan().decisions||{}).some(v=>v==='未判断'))return ['weather','コタ天気判断を決める','暑さ寒さと散歩時間を決める'];
    return ['share','リンに共有する','非公開を除いて共有できる'];
  }
  function petAvatar(p){
    if(p.id==='kota')return '犬';
    if(p.id==='ao')return '青';
    if(p.id==='ela')return 'エ';
    if(p.id==='yuki')return '雪';
    return '家';
  }
  function buildFamilyShare(){
    const p=current();
    const ps=petPrepStats();
    const petLines=(state.petPrep||[]).map(x=>`${x.done?'✓':'□'} ${x.group}：${x.name} ${x.qty}`).join('\\n');
    const weather=`コタ判断：${weatherPlan().decisions?.kota||'未判断'} / ${weatherSuggestion('kota')}`;
    const shop=state.shopping.filter(s=>!s.done).slice(0,8).map(s=>`□ ${s.name}：${s.qty}`).join('\\n') || '買い物残なし';
    const gear=state.gear.filter(g=>g.status!=='loaded').slice(0,8).map(g=>`□ ${g.name}`).join('\\n') || 'ギア未積込なし';
    return `【OUTBASE 共有】\\n${p.title}\\n${p.start?`${fmt(p.start)}〜${fmt(p.end||p.start)}`:'日付未設定'}\\n\\n■ペット準備 ${ps.done}/${ps.all.length}\\n${petLines}\\n\\n■コタ天気\\n${weather}\\n\\n■買い物\\n${shop}\\n\\n■ギア\\n${gear}\\n\\n※体調/うんち/おしっこ等の非公開メモは含めない`;
  }
  function familyPanelHtml(){
    const ps=petPrepStats(), next=familyNextTarget();
    return `<section class="section"><div class="familyHero"><div class="familyHeroTop"><span><b>${next[1]}</b><small>${next[2]}。家族とペットは、準備・現地・共有に分けて軽く扱う。</small></span><span class="familyScore" style="--score:${ps.score}">${ps.score}</span></div><div class="familyCommand"><button class="mainCmd" data-family="${next[0]}">次をやる</button><button class="subCmd" data-act="copyFamilyShare">リンに共有</button></div></div><div class="familyRail"><button class="${ps.done===ps.all.length?'good':'warn'}" data-family="pets"><b>${ps.done}/${ps.all.length}</b><span>ペット準備</span></button><button data-family="health"><b>${state.walk.health.length}</b><span>非公開</span></button><button data-family="share"><b>${state.family?.length||0}</b><span>共有先</span></button><button data-prep="weather"><b>天</b><span>コタ判断</span></button></div></section>`;
  }
  function familyBody(){
    const tab=state.familyTab||'pets', ps=petPrepStats();
    if(tab==='health')return `<section class="section"><details class="privateHealth" open><summary>非公開の体調メモ</summary><div class="healthOps"><button data-act="health" data-type="体調">体調</button><button data-act="health" data-type="うんち">うんち</button><button data-act="health" data-type="おしっこ">おしっこ</button></div><div class="eventStack">${state.walk.health.slice().reverse().slice(0,10).map(h=>`<div class="eventMini"><span class="typeIcon">非</span><span style="min-width:0;flex:1"><strong>${esc(h.type)}</strong><small>${esc(h.time)} / ${esc(h.mode)} / 共有しない</small></span><span class="pill private">非公開</span></div>`).join('')||`<div class="eventMini"><span class="typeIcon">非</span><span style="min-width:0;flex:1"><strong>まだなし</strong><small>ここだけに保存。</small></span><span class="pill private">非公開</span></div>`}</div></details></section>`;
    if(tab==='share')return `<section class="section"><div class="sharePanel"><b>共有プレビュー</b><p>${esc(buildFamilyShare())}</p><div class="shareOps"><button class="primary" data-act="copyFamilyShare">LINE用コピー</button><button data-act="saveFamilyShare">共有履歴保存</button></div></div></section>`;
    return `<section class="section"><div class="head"><div><h2>家族・ペット</h2><p>ペットの準備は、買い物・ギア・天気へつなげる。</p></div><span class="pill ${ps.done===ps.all.length?'dark':'wood'}">${ps.done}/${ps.all.length}</span></div><div class="petGrid">${(state.pets||[]).map(p=>`<div class="petCard"><div class="petTop"><span><b>${esc(p.name)}</b><small>${esc(p.kind)} / ${esc(p.age)}<br>${esc(p.note)}</small></span><span class="petAvatar">${petAvatar(p)}</span></div><div class="petOps"><button data-act="petToPrep" data-id="${p.id}">準備へ</button><button data-family="health">体調</button></div></div>`).join('')}</div><div class="petChecklist" style="margin-top:12px"><div class="petCheckHead"><span><b>ペット準備チェック</b><small>押すだけで完了。コタ用品は買い物/ギアにも連動。</small></span><span class="pill">${ps.done}/${ps.all.length}</span></div><div class="petCheckBody">${(state.petPrep||[]).map(x=>`<button class="petCheckRow" data-act="togglePetPrep" data-id="${x.id}"><span><b>${x.done?'✓ ':''}${esc(x.name)}</b><small>${esc(x.group)} / ${esc(x.qty)}</small></span><span class="roundMark ${x.done?'done':''}">${x.done?'✓':'□'}</span></button>`).join('')}</div></div></section>`;
  }

  function prepNextTarget(){
    const st=prepStats();
    if(state.meals.length===0)return ['meals','献立を決める','料理を1つ入れる'];
    if(st.undoneShop>0)return ['shopping','買い物を終わらせる',`${st.undoneShop}件残り`];
    if(st.loaded<state.gear.length)return ['gear','ギアを積む',`${state.gear.length-st.loaded}件残り`];
    if(st.wdone<state.weather.length)return ['weather','天気で判断する',`${state.weather.length-st.wdone}件残り`];
    return ['overview','現地へ行ける','準備はほぼ完了'];
  }

  function mealStats(){
    const meals=state.meals||[];
    const ingredients=meals.reduce((n,m)=>n+(m.ingredients?.length||0),0);
    const gear=meals.reduce((n,m)=>n+(m.gear?.length||0),0);
    const risks=meals.filter(mealRisk).length;
    const inShop=meals.reduce((n,m)=>n+(m.ingredients||[]).filter(i=>state.shopping.some(s=>s.name===i)).length,0);
    const score=Math.round((meals.length*20 + Math.min(30,inShop*4) + Math.min(20,gear*3) + (risks?0:20))/Math.max(1,meals.length?1:2));
    return {meals:meals.length,ingredients,gear,risks,inShop,score:Math.min(100,score)};
  }
  function mealRisk(m){
    const t=`${m.name||''} ${(m.ingredients||[]).join(' ')} ${m.note||''}`;
    const ng=['貝','あさり','アサリ','牡蠣','カキ','ホタテ','帆立','しじみ','シジミ','いくら','イクラ','たらこ','明太子','魚卵'];
    return ng.find(x=>t.includes(x))||'';
  }
  function mealNextTarget(){
    const ms=mealStats();
    if(!ms.meals)return ['template','献立を1つ入れる','テンプレートから始める'];
    if(ms.risks)return ['safe','アレルギー確認','貝・魚卵の可能性を確認'];
    if(ms.inShop<ms.ingredients)return ['shop','材料を買い物へ','不足食材を買い物に送る'];
    return ['timeline','調理順を確認','現地で迷わない順番にする'];
  }
  function mealTimeOrder(slot){
    const s=String(slot||'').toLowerCase();
    if(s.includes('朝'))return 10;
    if(s.includes('昼'))return 20;
    if(s.includes('夜'))return 30;
    if(s.includes('つまみ')||s.includes('前菜'))return 25;
    return 50;
  }
  function sortedMeals(){
    return (state.meals||[]).slice().sort((a,b)=>mealTimeOrder(a.slot)-mealTimeOrder(b.slot));
  }
  function mealLine(m){
    const risk=mealRisk(m);
    return `・${m.slot||'未定'} ${m.name}${risk?` ⚠${risk}`:''}\\n  材料:${(m.ingredients||[]).join(' / ')||'未設定'}\\n  ギア:${(m.gear||[]).join(' / ')||'未設定'}\\n  メモ:${m.note||''}`;
  }
  function buildMealShare(){
    const ms=mealStats();
    return `【OUTBASE 献立】\\n${current().title}\\n人数:${state.settings?.servings||'未設定'}\\n注意:${state.settings?.allergy||'未設定'}\\n\\n■メニュー ${ms.meals}品\\n${sortedMeals().map(mealLine).join('\\n\\n')||'未設定'}\\n\\n■買い物未反映\\n${sortedMeals().flatMap(m=>(m.ingredients||[]).filter(i=>!state.shopping.some(s=>s.name===i)).map(i=>`□ ${i}（${m.name}）`)).join('\\n')||'なし'}\\n\\n■現地調理順\\n${buildCookTimelineText()}`;
  }
  function buildCookTimelineText(){
    const list=sortedMeals();
    if(!list.length)return '未設定';
    return list.map((m,i)=>`${i+1}. ${m.slot||'未定'}：${m.name} / 先に出すもの:${(m.ingredients||[]).slice(0,3).join('・')||'確認'} / 使う:${(m.gear||[]).slice(0,3).join('・')||'確認'}`).join('\\n');
  }
  function mealTemplates(){
    return {
      shrimp:{name:'ガーリックシュリンプ',slot:'夜',ingredients:['ブラックタイガー','にんにく','オリーブオイル','バター','塩','黒こしょう','レモン'],gear:['大スキレット','包丁','まな板','トング'],note:'殻付きなら背わた処理。バケットなしでも量を抑える。'},
      pizza:{name:'手作りピザ',slot:'夜',ingredients:['強力粉','薄力粉','ドライイースト','塩','砂糖','オリーブオイル','ピザソース','チーズ'],gear:['フライパン','クッカー','まな板','包丁'],note:'ピザ生地は作る。具材は買いすぎ注意。'},
      hotdog:{name:'ローストビーフホットドッグ',slot:'昼',ingredients:['ホットドッグパン','ローストビーフ','レタス','チーズ','マスタード'],gear:['ホットサンドメーカー','トング'],note:'昼に軽く食べる用。'},
      cucumber:{name:'たたききゅうり',slot:'つまみ',ingredients:['きゅうり','塩','ごま油','にんにく','白ごま'],gear:['包丁','袋'],note:'設営後すぐ出せる。'},
      soup:{name:'豚しゃぶ',slot:'夜',ingredients:['豚肉','レタス','長ねぎ','ポン酢','ごまだれ'],gear:['鍋','バーナー','箸'],note:'寒い日や雨の日向き。'}
    }
  }
  function mealHeroHtml(){
    const ms=mealStats(), next=mealNextTarget();
    return `<div class="mealHero2"><div class="mealHeroTop2"><span><b>${next[1]}</b><small>${next[2]}。料理は、買い物・ギア・調理順までつなげる。</small></span><span class="mealScore2" style="--score:${ms.score}">${ms.score}</span></div><div class="mealCommand2"><button class="mainCmd" data-act="${next[0]==='template'?'addMealTemplate':'mealToShopAll'}" data-kind="shrimp">${next[0]==='template'?'おすすめ追加':'材料を買い物へ'}</button><button class="subCmd" data-act="copyMealShare">献立コピー</button></div></div><div class="mealRail2"><button class="${ms.meals?'good':'warn'}" data-meal-tab="plan"><b>${ms.meals}</b><span>料理</span></button><button class="${ms.risks?'warn':'good'}" data-meal-tab="safe"><b>${ms.risks}</b><span>注意</span></button><button data-meal-tab="timeline"><b>${ms.ingredients}</b><span>材料</span></button><button data-meal-tab="templates"><b>型</b><span>追加</span></button></div>`;
  }

  function mealMissing(m){
    const shopNames=new Set(state.shopping.map(s=>s.name));
    const gearNames=new Set(state.gear.map(g=>g.name));
    return {
      ingredients:m.ingredients.filter(i=>!shopNames.has(i)),
      gear:m.gear.filter(g=>!gearNames.has(g))
    }
  }
  function groupedShopping(){
    const groups={};
    state.shopping.forEach(s=>{
      const k=s.group||'その他';
      groups[k]=groups[k]||[];
      groups[k].push(s);
    });
    return groups;
  }
  function weatherDecisionText(){
    const next=weatherNextDecision();
    const lv=weatherLevel();
    return `${next[1]}。${next[2]}。現在リスク ${weatherRiskScore()}（${lv[0]}）：${lv[1]}。`;
  }

  function weatherView(){
    const wp=weatherPlan(), risk=weatherRiskScore(), lv=weatherLevel(), next=weatherNextDecision(), d=wp.decisions||{};
    const checksDone=state.weather.filter(w=>w.done).length;
    return `<section class="section">
      <div class="weatherHero">
        <div class="weatherHeroTop">
          <span><b>${next[1]}</b><small>${next[2]}。天気は見るだけで終わらせず、設営・撤収・コタ・幕体へ変換する。</small></span>
          <span class="weatherRisk" style="--risk:${risk}">${risk}</span>
        </div>
        <div class="weatherCommand">
          <button class="mainCmd" data-act="${next[0]==='copy'?'copyWeatherReport':'decideWeather'}" data-type="${next[0]}">${next[0]==='copy'?'まとめコピー':'判断する'}</button>
          <button class="subCmd" data-act="weatherSource">予報を入力</button>
        </div>
      </div>

      <div class="weatherRail">
        <button class="${checksDone===state.weather.length?'good':'warn'}" data-act="openWeatherChecks"><b>${checksDone}/${state.weather.length}</b><span>確認</span></button>
        <button class="${risk>=50?'warn':'good'}" data-act="copyWeatherReport"><b>${lv[0]}</b><span>リスク</span></button>
        <button class="${d.kota==='未判断'?'warn':'good'}" data-act="decideWeather" data-type="kota"><b>コタ</b><span>${esc(d.kota||'未判断')}</span></button>
        <button class="${d.tent==='未判断'?'warn':'good'}" data-act="decideWeather" data-type="tent"><b>幕体</b><span>${esc(d.tent||'未判断')}</span></button>
      </div>

      <section class="section">
        <div class="weatherCopy"><b>今の判断</b><p>${esc(weatherDecisionText())}</p><div class="weatherOps"><button class="primary" data-act="copyWeatherReport">天気まとめコピー</button><button data-act="addForecast">予報行追加</button></div></div>
      </section>

      <section class="section">
        <div class="head"><div><h2>予報メモ</h2><p>外部天気を見た結果だけ、判断に必要な形で残す。</p></div><span class="pill">${esc(wp.source||'手入力')}</span></div>
        <div class="forecastStack">${(wp.forecast||[]).map(r=>`<div class="forecastCard"><div class="forecastTop"><span><b>${esc(r.label)}</b><small>${esc(r.time)}<br>${esc(r.note||'')}</small></span><button class="btn" data-act="editForecast" data-id="${r.id}">変更</button></div><div class="forecastGrid"><div class="forecastMetric"><b>${r.rain}%</b><span>雨</span></div><div class="forecastMetric"><b>${r.wind}m</b><span>風</span></div><div class="forecastMetric"><b>${r.temp}℃</b><span>気温</span></div><div class="forecastMetric"><b>${r.humidity}%</b><span>湿度</span></div></div></div>`).join('')||`<div class="forecastCard"><div class="forecastTop"><span><b>予報なし</b><small>予報行を追加する。</small></span><button class="btn" data-act="addForecast">追加</button></div></div>`}</div>
      </section>

      <section class="section">
        <div class="head"><div><h2>判断マトリクス</h2><p>4つだけ決める。細かい気象情報はここへ集約。</p></div></div>
        <div class="decisionMatrix">
          ${[['setup','設営',weatherSuggestion('setup')],['withdraw','撤収',weatherSuggestion('withdraw')],['kota','コタ',weatherSuggestion('kota')],['tent','幕体',weatherSuggestion('tent')]].map(([id,label,sug])=>`<div class="decisionUnit"><div class="decisionUnitTop"><span><b>${label}</b><small>${esc(sug)}</small></span><span class="pill ${d[id]==='未判断'?'wood':'dark'}">${esc(d[id]||'未判断')}</span></div><div class="decisionButtons"><button data-act="setWeatherDecision" data-type="${id}" data-value="通常">通常</button><button data-act="setWeatherDecision" data-type="${id}" data-value="注意">注意</button><button data-act="setWeatherDecision" data-type="${id}" data-value="変更">変更</button></div></div>`).join('')}
        </div>
      </section>

      <section class="section">
        <div class="head"><div><h2>確認タイミング</h2><p>14日前 / 7日前 / 3日前 / 前日 / 当日。</p></div></div>
        <div class="list">${state.weather.map(w=>`<button class="row" data-act="toggleWeather" data-id="${w.id}"><span><strong>${w.done?'✓ ':''}${esc(w.when)}</strong><small>${esc(w.check)}</small></span><span class="pill ${w.done?'dark':''}">${w.done?'済':'確認'}</span></button>`).join('')}</div>
      </section>
    </section>`;
  }

  function prep(){
    const st=prepStats();
    const next=prepNextTarget();
    return shell(`
      <section class="prepHero">
        <div class="prepHeroTop">
          <span><b>${next[1]}</b><small>${next[2]}。考えずに、まず下の大きいボタンを押す。</small></span>
          <span class="prepScore" style="--score:${st.score}">${st.score}</span>
        </div>
        <div class="prepCommand">
          <button class="mainCmd" data-prep="${next[0]}">次をやる</button>
          <button class="subCmd" data-act="copyPlanSummary">まとめコピー</button>
        </div>
      </section>

      <div class="prepLane">
        <button class="${state.meals.length?'done':'warn'}" data-prep="meals"><b>${state.meals.length}</b><span>料理</span></button>
        <button class="${st.undoneShop===0?'done':'warn'}" data-prep="shopping"><b>${st.undoneShop}</b><span>買い物残</span></button>
        <button class="${st.loaded===state.gear.length?'done':'warn'}" data-prep="gear"><b>${st.loaded}/${state.gear.length}</b><span>積込</span></button>
        <button class="${st.wdone===state.weather.length?'done':'warn'}" data-prep="weather"><b>${st.wdone}/${state.weather.length}</b><span>天気</span></button>
      </div>

      <section class="section"><div class="tabs">${['overview:全体','meals:料理','shopping:買い物','gear:ギア','weather:天気','pets:ペット','timer:タイマー'].map(x=>{const [id,l]=x.split(':');return `<button class="tab ${state.prepTab===id?'active':''}" data-prep="${id}">${l}</button>`}).join('')}</div></section>
      ${prepBody()}
    `)
  }

  function prepBody(){
    const st=prepStats();
    if(state.prepTab==='meals')return `${mealHeroHtml()}<section class="section"><div class="tabs">${['plan:献立','timeline:調理順','templates:テンプレ','safe:注意','share:共有'].map(x=>{const [id,l]=x.split(':');return `<button class="tab ${state.mealTab===id?'active':''}" data-meal-tab="${id}">${l}</button>`}).join('')}</div></section>${mealBody()}`;

    if(state.prepTab==='shopping'){const groups=groupedShopping();return `<section class="section">
      <div class="head"><div><h2>買い物</h2><p>店で迷わない。グループごとに消す。</p></div><button class="btn primary" data-act="addShop">追加</button></div>
      <div class="finishPanel"><div class="finishHead"><span><b>買い物残り ${st.undoneShop}件</b><small>買ったら行ごとに押す。</small></span><span class="pill ${st.undoneShop===0?'dark':'wood'}">${st.undoneShop===0?'完了':'未完'}</span></div>
      <div class="finishBody">${Object.entries(groups).map(([g,items])=>`<div class="groupHead"><span>${esc(g)}</span><span>${items.filter(i=>!i.done).length}/${items.length}</span></div>${items.map(s=>`<button class="finishRow" data-act="toggleShop" data-id="${s.id}"><span><b>${s.done?'✓ ':''}${esc(s.name)}</b><small>${esc(s.qty)} / ${esc(s.source)}</small></span><span class="roundMark ${s.done?'done':''}">${s.done?'✓':'□'}</span></button>`).join('')}`).join('')}</div></div>
      <div class="commandDock"><button class="btn primary" data-act="copyShop">LINE用コピー</button><button class="btn" data-act="clearDoneShop">購入済みを隠す</button></div>
    </section>`;}

    if(state.prepTab==='gear')return gearView();

    if(state.prepTab==='pets')return `${familyPanelHtml()}${familyBody()}`;
    if(state.prepTab==='timer')return `${timerPanelHtml()}${timerBodyHtml()}`;

    if(state.prepTab==='weather')return weatherView();

    return `<section class="section">
      ${planFlowHtml()}
      <div class="finishPanel" style="margin-top:12px"><div class="finishHead"><span><b>準備を終わらせる</b><small>次にやることだけを上から潰す。</small></span><span class="pill ${st.score>=80?'dark':'wood'}">${st.score}%</span></div><div class="finishBody">${smartPrepRows()}</div></div>
      <div class="commandDock"><button class="btn primary" data-act="autoNext">次に進める</button><button class="btn" data-act="copyPlanSummary">準備まとめコピー</button></div>
    </section>`;
  }



  function mealBody(){
    const ms=mealStats();
    if(state.mealTab==='templates')return `<section class="section"><div class="head"><div><h2>料理テンプレート</h2><p>考えずに追加。材料とギアも一緒に入る。</p></div><button class="btn primary" data-act="addMeal">手入力</button></div><div class="mealTemplateGrid">
      <button class="mealTemplate primary" data-act="addMealTemplate" data-kind="shrimp"><b>ガーリックシュリンプ</b><small>大スキレット用。夜メニュー候補。</small></button>
      <button class="mealTemplate" data-act="addMealTemplate" data-kind="pizza"><b>手作りピザ</b><small>ピザ生地作成。具材買いすぎ注意。</small></button>
      <button class="mealTemplate" data-act="addMealTemplate" data-kind="hotdog"><b>ホットドッグ</b><small>昼に軽く食べる。</small></button>
      <button class="mealTemplate" data-act="addMealTemplate" data-kind="cucumber"><b>たたききゅうり</b><small>設営後すぐ出せる。</small></button>
      <button class="mealTemplate" data-act="addMealTemplate" data-kind="soup"><b>豚しゃぶ</b><small>雨・寒い日向き。</small></button>
    </div></section>`;

    if(state.mealTab==='timeline')return `<section class="section"><div class="head"><div><h2>現地調理順</h2><p>現地で迷わない順番。完璧に作らず、出す順だけ見る。</p></div><button class="btn primary" data-act="copyMealShare">コピー</button></div><div class="cookTimeline">${sortedMeals().map((m,i)=>`<div class="cookStep"><div class="cookStepTop"><span><b>${i+1}. ${esc(m.slot||'未定')} / ${esc(m.name)}</b><small>材料:${(m.ingredients||[]).slice(0,4).map(esc).join(' / ')||'未設定'}<br>ギア:${(m.gear||[]).slice(0,4).map(esc).join(' / ')||'未設定'}</small></span><span class="pill ${mealRisk(m)?'wood':''}">${mealRisk(m)?'注意':'OK'}</span></div><div class="cookOps"><button data-act="mealToShop" data-id="${m.id}">買い物へ</button><button data-act="mealGearCheck" data-id="${m.id}">ギアへ</button><button data-act="quickRecordMeal" data-id="${m.id}">現地記録</button></div></div>`).join('')||`<div class="allergyBox"><b>料理なし</b><p>テンプレートから1つ追加する。</p></div>`}</div></section>`;

    if(state.mealTab==='safe')return `<section class="section"><div class="allergyBox"><b>アレルギー・苦手確認</b><p>設定：${esc(state.settings?.allergy||'未設定')}\\n\\n${sortedMeals().map(m=>`${mealRisk(m)?'⚠':'✓'} ${m.name}：${mealRisk(m)||'OK'}`).join('\\n')||'料理なし'}</p><div class="mealShareOps"><button class="primary" data-act="editAllergy">設定変更</button><button data-act="copyMealShare">献立コピー</button></div></div></section>`;

    if(state.mealTab==='share')return `<section class="section"><div class="allergyBox"><b>リンに送る献立</b><p>${esc(buildMealShare())}</p><div class="mealShareOps"><button class="primary" data-act="copyMealShare">LINE用コピー</button><button data-act="mealToShopAll">材料を買い物へ</button></div></div></section>`;

    return `<section class="section">
      <div class="head"><div><h2>料理</h2><p>献立から買い物・ギア・調理順へ自動でつなげる。</p></div><button class="btn primary" data-act="addMeal">追加</button></div>
      ${state.meals.map(m=>{const miss=mealMissing(m), risk=mealRisk(m);return `<div class="mealBundle">
        <div class="mealBundleTop"><span><h3>${esc(m.name)}</h3><p>${esc(m.slot)} / ${esc(m.note)}</p></span><span class="pill ${risk?'wood':''}">${risk?`注意:${esc(risk)}`:'OK'}</span></div>
        <div class="miniTags">${m.ingredients.slice(0,8).map(i=>`<span>${esc(i)}</span>`).join('')}${m.ingredients.length>8?`<span>+${m.ingredients.length-8}</span>`:''}</div>
        <div class="commandDock"><button class="btn primary" data-act="mealToShop" data-id="${m.id}">材料を買い物へ</button><button class="btn" data-act="mealGearCheck" data-id="${m.id}">必要ギア確認</button><button class="btn" data-act="editMeal" data-id="${m.id}">編集</button></div>
        ${(miss.ingredients.length||miss.gear.length)?`<div class="warnLine">不足候補：${[...miss.ingredients,...miss.gear].map(esc).join(' / ')}</div>`:''}
      </div>`}).join('') || `<div class="row"><span><strong>料理なし</strong><small>テンプレートから1つ入れる。</small></span><button class="btn primary" data-meal-tab="templates">テンプレート</button></div>`}
      <div class="commandDock"><button class="btn primary" data-act="mealToShopAll">全材料を買い物へ</button><button class="btn" data-act="copyMealShare">献立コピー</button></div>
    </section>`;
  }


  function gearStats(){
    const total=state.gear.length;
    const loaded=state.gear.filter(g=>g.status==='loaded').length;
    const home=state.gear.filter(g=>g.status==='home').length;
    const care=state.gear.filter(g=>['dry','repair','replace'].includes(g.status)).length;
    const noBox=state.gear.filter(g=>!g.boxId).length;
    const score=Math.round((loaded+Math.max(0,total-care-noBox))/(Math.max(1,total*2))*100);
    return {total,loaded,home,care,noBox,score};
  }
  function gearNextTarget(){
    const gs=gearStats();
    if(gs.noBox>0)return ['list','収納未設定を直す',`${gs.noBox}件のギアにBOXがない`];
    if(gs.care>0)return ['care','乾燥・修理を見る',`${gs.care}件のケア対象`];
    if(gs.loaded<gs.total)return ['load','積込を終わらせる',`${gs.total-gs.loaded}件残り`];
    return ['boxes','帰宅後に戻せる',`積込は完了。BOX単位で戻せる`];
  }
  function gearBoxStats(boxId){
    const items=state.gear.filter(g=>g.boxId===boxId);
    const loaded=items.filter(g=>g.status==='loaded').length;
    const care=items.filter(g=>['dry','repair','replace'].includes(g.status)).length;
    return {items,loaded,care};
  }
  function filteredGear(){
    const q=(state.gearFilter||'').trim().toLowerCase();
    if(!q)return state.gear;
    return state.gear.filter(g=>{
      const b=state.boxes.find(x=>x.id===g.boxId);
      return [g.name,g.cat,g.note,g.car,gearStatus[g.status],b?.name,b?.home,b?.car].join(' ').toLowerCase().includes(q);
    });
  }
  function gearIcon(cat){
    const c=String(cat||'').toLowerCase();
    if(c.includes('幕'))return '幕';
    if(c.includes('料理'))return '食';
    if(c.includes('照明'))return '灯';
    if(c.includes('ペット'))return '犬';
    if(c.includes('寝'))return '寝';
    return '道';
  }
  function gearCard(g){
    const b=state.boxes.find(x=>x.id===g.boxId);
    return `<button class="gearCard" data-act="editGear" data-id="${g.id}">
      <span class="gearIcon">${gearIcon(g.cat)}</span>
      <span class="gearCardMain"><b>${esc(g.name)} ×${g.qty}</b><small>${esc(g.cat||'未分類')} / ${esc(b?.name||'BOX未設定')} / 家:${esc(b?.home||'未設定')} / 車:${esc(g.car||b?.car||'未設定')}<br>${esc(g.note||'')}</small></span>
      <span class="gearState ${g.status}">${gearStatus[g.status]||g.status}</span>
    </button>`;
  }
  function buildGearSummary(){
    const gs=gearStats();
    const boxes=state.boxes.map(b=>{
      const x=gearBoxStats(b.id);
      return `■${b.name}\\n家:${b.home||'未設定'} / 車:${b.car||'未設定'} / ${x.loaded}/${x.items.length}積込\\n${x.items.map(g=>`${g.status==='loaded'?'✓':'□'} ${g.name}`).join('\\n')}`;
    }).join('\\n\\n');
    const care=state.gear.filter(g=>['dry','repair','replace'].includes(g.status)).map(g=>`□ ${g.name}：${gearStatus[g.status]} / ${g.note||''}`).join('\\n') || 'ケア対象なし';
    return `【OUTBASE ギアまとめ】\\n総数:${gs.total} / 積込:${gs.loaded} / ケア:${gs.care}\\n\\n${boxes}\\n\\n■乾燥・修理・買替\\n${care}`;
  }

  function gearView(){
    const gs=gearStats();
    const next=gearNextTarget();
    return `<section class="section">
      <div class="gearHero">
        <div class="gearHeroTop">
          <span><b>${next[1]}</b><small>${next[2]}。ギアは探すより、積める・戻せる・直せる状態にする。</small></span>
          <span class="gearScore" style="--score:${gs.score}">${gs.score}</span>
        </div>
        <div class="gearCommand">
          <button class="mainCmd" data-gear="${next[0]}">次をやる</button>
          <button class="subCmd" data-act="copyGearSummary">ギアまとめコピー</button>
        </div>
      </div>
      <div class="gearStats">
        <button class="${gs.loaded===gs.total?'good':'warn'}" data-gear="load"><b>${gs.loaded}/${gs.total}</b><span>積込</span></button>
        <button class="${gs.care?'warn':'good'}" data-gear="care"><b>${gs.care}</b><span>ケア</span></button>
        <button class="${gs.noBox?'warn':'good'}" data-gear="list"><b>${gs.noBox}</b><span>BOX未設定</span></button>
        <button class="good" data-gear="boxes"><b>${state.boxes.length}</b><span>BOX</span></button>
      </div>
      <div class="gearSearch"><input id="gearSearchInput" placeholder="ギア / BOX / 車載位置で検索" value="${esc(state.gearFilter||'')}"><button class="btn primary" data-act="addGear">登録</button></div>
      <div class="tabs" style="margin-top:10px">${['list:一覧','boxes:ボックス','load:積込','care:乾燥/修理','import:取込'].map(x=>{const [id,l]=x.split(':');return `<button class="tab ${state.gearTab===id?'active':''}" data-gear="${id}">${l}</button>`}).join('')}</div>
    </section>${gearBody()}`
  }

  function gearBody(){
    if(state.gearTab==='boxes')return `<section class="section"><div class="boxMatrix">${state.boxes.map(b=>{const x=gearBoxStats(b.id);return `<div class="boxCard"><div class="boxTop"><span><b>${esc(b.name)}</b><small>家:${esc(b.home||'未設定')} / 車:${esc(b.car||'未設定')}<br>${x.loaded}/${x.items.length}積込 / ケア${x.care}</small></span><button class="btn" data-act="editBox" data-id="${b.id}">変更</button></div><div class="boxOps"><button data-act="toggleBox" data-id="${b.id}">${x.loaded===x.items.length&&x.items.length?'家へ戻す':'積込済み'}</button><button data-act="boxCare" data-id="${b.id}">乾燥へ</button><button data-act="boxReport" data-id="${b.id}">中身コピー</button></div></div>`}).join('')}</div><div class="commandDock"><button class="btn primary" data-act="addBox">BOX追加</button><button class="btn" data-act="copyGearSummary">全体コピー</button></div></section>`;

    if(state.gearTab==='load')return `<section class="section"><div class="gearReport"><b>積込順</b><p>奥に置くBOXから積む。BOXを押すと中身をまとめて積込済みにする。帰宅後は同じ画面で家へ戻す。</p></div><div class="boxMatrix" style="margin-top:10px">${state.boxes.map(b=>{const x=gearBoxStats(b.id);return `<div class="boxCard"><div class="boxTop"><span><b>${esc(b.name)}</b><small>車:${esc(b.car||'未設定')} / 家:${esc(b.home||'未設定')}<br>${x.loaded}/${x.items.length} 積込済</small></span><span class="pill ${x.loaded===x.items.length&&x.items.length?'dark':'wood'}">${x.loaded===x.items.length&&x.items.length?'完了':'未完'}</span></div><div class="boxOps"><button data-act="toggleBox" data-id="${b.id}">BOX切替</button><button data-act="openBoxItems" data-id="${b.id}">中身</button><button data-act="editBox" data-id="${b.id}">位置変更</button></div></div>`}).join('')}</div><div class="commandDock"><button class="btn primary" data-act="markAllLoaded">全部積込済み</button><button class="btn" data-act="resetLoaded">積込リセット</button></div></section>`;

    if(state.gearTab==='care'){const targets=state.gear.filter(g=>['dry','repair','replace'].includes(g.status));return `<section class="section"><div class="careQueue">${targets.length?targets.map(g=>`<div class="careCard"><div class="careCardTop"><span><b>${esc(g.name)}</b><small>${gearStatus[g.status]} / ${esc(g.note||'メモなし')}</small></span><span class="pill wood">${gearStatus[g.status]}</span></div><div class="careOps"><button data-act="setGearStatus" data-id="${g.id}" data-status="home">完了</button><button data-act="setGearStatus" data-id="${g.id}" data-status="repair">修理</button><button data-act="setGearStatus" data-id="${g.id}" data-status="replace">買替</button></div></div>`).join(''):`<div class="gearReport"><b>ケア対象なし</b><p>乾燥・修理・買替候補はない。</p></div>`}</div></section>`}

    if(state.gearTab==='import')return `<section class="section"><div class="gearReport"><b>取込候補</b><p>Excel・購入履歴・写真・メモを候補として保存。正式登録はあとで選ぶ。</p><div class="commandDock"><button class="btn wood" data-act="import">ファイル選択</button><button class="btn" data-act="backup">バックアップ</button></div></div></section>`;

    const list=filteredGear();
    return `<section class="section"><div class="list" id="gearList">${list.map(gearCard).join('')||`<div class="gearReport"><b>該当なし</b><p>検索条件に合うギアがない。</p></div>`}</div></section>`;
  }

  function gearRow(g){return gearCard(g)}



  function fileSizeLabel(bytes){
    if(!bytes && bytes!==0)return '';
    return bytes>1024*1024?`${(bytes/1024/1024).toFixed(1)}MB`:`${Math.round(bytes/1024)}KB`;
  }
  function readFileAsDataURL(file){
    return new Promise((resolve,reject)=>{
      const r=new FileReader();
      r.onload=()=>resolve(r.result);
      r.onerror=reject;
      r.readAsDataURL(file);
    });
  }
  function mediaPreviewHtml(r){
    if(!r.mediaType)return '';
    const meta=`${r.mediaName||''} ${r.mediaSize?'/ '+fileSizeLabel(r.mediaSize):''}`;
    if(r.mediaType.startsWith('image/') && r.dataUrl)return `<div class="mediaStrip"><div class="mediaBox"><img src="${esc(r.dataUrl)}" alt=""><div class="mediaMeta">${esc(meta)}</div></div></div>`;
    if(r.mediaType.startsWith('video/') && r.dataUrl)return `<div class="mediaStrip"><div class="mediaBox"><video controls src="${esc(r.dataUrl)}"></video><div class="mediaMeta">${esc(meta)}</div></div></div>`;
    if(r.mediaType.startsWith('audio/') && r.dataUrl)return `<div class="mediaStrip"><div class="mediaBox"><audio controls src="${esc(r.dataUrl)}"></audio><div class="mediaMeta">${esc(meta)}</div></div></div>`;
    return r.mediaName?`<div class="mediaStrip"><div class="mediaNotice">${esc(meta)}<br>大きいファイルは名前だけ保存。</div></div>`:'';
  }
  function addMediaRecord(kind,file,dataUrl){
    const p=state.walk.track[state.walk.track.length-1];
    state.records=state.records||[];
    state.records.push({
      id:uid('rec'),
      eventId:state.currentPlanId,
      kind,
      title:recordKindLabel(kind),
      text:file?.name?`${file.name} を記録`:((kind==='voice'&&voiceLiveText)?voiceLiveText:''),
      mode:fieldModeName(),
      time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}),
      date:today(),
      lat:p?.lat||null,
      lng:p?.lng||null,
      private:false,
      fieldModeId:state.fieldMode||'',
      target:kind==='photo'?'現地写真':kind==='video'?'現地動画':'音声メモ',
      flow:(state.fieldMode?currentFieldMode().saveTo:[])||[],
      tags:[fw03CurrentMode?fw03CurrentMode().label:currentFieldMode().title, recordKindLabel(kind)].filter(Boolean),
      mediaName:file?.name||'',
      mediaType:file?.type||'',
      mediaSize:file?.size||0,
      dataUrl:dataUrl||''
    });
    if(kind==='photo'||kind==='voice')autoPin(kind==='photo'?'写真':'音声', recordKindLabel(kind), file?.name||voiceLiveText||'');
    if(mediaSize()>1800000){
      const packed=compactStateForStorage(state);
      state=packed.state;
      state.lastError={message:`メディア容量を自動軽量化: ${packed.removed}件`,time:new Date().toISOString(),route:state.route};
    }
  }

  function timerIcon(kind){
    return {setup:'設',meal:'食',pet:'犬',withdraw:'撤',dry:'乾',walk:'歩',free:'時'}[kind]||'時';
  }
  function timerLabel(kind){
    return {setup:'設営',meal:'料理',pet:'コタ',withdraw:'撤収',dry:'乾燥',walk:'散歩',free:'自由'}[kind]||kind;
  }
  function planTimers(){
    return (state.timers||[]).filter(t=>!t.eventId || t.eventId===state.currentPlanId);
  }
  function timerLeft(t){
    if(t.status==='running'){
      const elapsed=Math.floor((Date.now()-(t.startedAt||Date.now()))/1000);
      return Math.max(0,(t.remaining||t.duration||0)-elapsed);
    }
    if(t.status==='done')return 0;
    return Math.max(0,t.remaining??t.duration??0);
  }
  function timerPct(t){
    const d=Math.max(1,t.duration||1);
    return Math.round((1-timerLeft(t)/d)*100);
  }
  function formatTimer(sec){
    sec=Math.max(0,Math.floor(sec||0));
    const h=Math.floor(sec/3600), m=Math.floor((sec%3600)/60), s=sec%60;
    return h?`${h}:${pad(m)}:${pad(s)}`:`${m}:${pad(s)}`;
  }
  function timerStats(){
    const list=planTimers();
    return {
      total:list.length,
      running:list.filter(t=>t.status==='running').length,
      done:list.filter(t=>t.status==='done').length,
      left:list.filter(t=>t.status!=='done').length
    };
  }
  function timerNext(){
    const list=planTimers();
    const running=list.find(t=>t.status==='running');
    if(running)return ['active',`${running.name} 実行中`,formatTimer(timerLeft(running)),running.id];
    const ready=list.find(t=>t.status!=='done');
    if(ready)return ['active',`${ready.name} を始める`,`${timerLabel(ready.kind)} / ${formatTimer(timerLeft(ready))}`,ready.id];
    return ['templates','タイマーを追加','料理・設営・撤収をすぐ作る',''];
  }
  function timerCard(t){
    const left=timerLeft(t);
    return `<div class="timerCard ${t.status==='running'?'running':''}">
      <div class="timerTop"><span><b>${timerIcon(t.kind)} ${esc(t.name)}</b><small>${esc(timerLabel(t.kind))} / ${esc(t.note||'')} / ${t.status==='done'?'完了':t.status==='running'?'進行中':t.status==='paused'?'一時停止':'待機'}</small></span><span class="timerTime" data-timer-left="${t.id}">${formatTimer(left)}</span></div>
      <div class="timerOps"><button data-act="startTimer" data-id="${t.id}">${t.status==='running'?'再開中':'開始'}</button><button data-act="pauseTimer" data-id="${t.id}">一時停止</button><button data-act="resetTimer" data-id="${t.id}">戻す</button><button data-act="completeTimer" data-id="${t.id}">完了</button></div>
    </div>`;
  }
  function timerPanelHtml(){
    const st=timerStats(), next=timerNext();
    const mainId=next[3]||'';
    return `<section class="section"><div class="timerHero"><div class="timerHeroTop"><span><b>${esc(next[1])}</b><small>${esc(next[2])}。料理・設営・撤収・散歩を考えずに進める。</small></span><span class="timerFace" style="--pct:${st.running?timerPct(planTimers().find(t=>t.status==='running')):st.done/Math.max(1,st.total)*100}">${st.running?'LIVE':st.done+'/'+st.total}</span></div><div class="timerCommand"><button class="mainCmd" data-act="${mainId?'startTimer':'addTimerTemplate'}" data-id="${mainId}" data-kind="meal">${mainId?'次を開始':'料理タイマー追加'}</button><button class="subCmd" data-act="copyTimers">タイマーコピー</button></div></div><div class="timerRail"><button class="${st.running?'warn':'good'}" data-timer-tab="active"><b>${st.running}</b><span>実行中</span></button><button data-timer-tab="active"><b>${st.left}</b><span>残り</span></button><button class="${st.done?'good':''}" data-timer-tab="active"><b>${st.done}</b><span>完了</span></button><button data-timer-tab="templates"><b>型</b><span>追加</span></button></div></section>`;
  }
  function timerBodyHtml(){
    if(state.timerTab==='templates')return `<section class="section"><div class="head"><div><h2>タイマーテンプレート</h2><p>現地で使うものだけ追加。</p></div><button class="btn primary" data-act="timerPrompt">自由作成</button></div><div class="timerTemplateGrid">
      <button class="timerTemplate primary" data-act="addTimerTemplate" data-kind="meal"><b>料理 10分</b><small>焼きすぎ防止。ガーリックシュリンプ向け。</small></button>
      <button class="timerTemplate" data-act="addTimerTemplate" data-kind="setup"><b>設営 30分</b><small>一度止まって休憩。</small></button>
      <button class="timerTemplate" data-act="addTimerTemplate" data-kind="pet"><b>コタ 15分</b><small>暑さ寒さの確認。</small></button>
      <button class="timerTemplate" data-act="addTimerTemplate" data-kind="withdraw"><b>撤収 20分</b><small>ラスト確認用。</small></button>
      <button class="timerTemplate" data-act="addTimerTemplate" data-kind="dry"><b>乾燥 60分</b><small>帰宅後の乾燥確認。</small></button>
      <button class="timerTemplate" data-act="addTimerTemplate" data-kind="walk"><b>散歩 20分</b><small>通常散歩/キャンプ場散歩。</small></button>
    </div></section>`;
    const list=planTimers();
    return `<section class="section"><div class="head"><div><h2>タイマー</h2><p>主役プランのタイマーだけ表示。</p></div><button class="btn primary" data-timer-tab="templates">追加</button></div><div class="timerList">${list.map(timerCard).join('')||`<div class="planNotice"><b>タイマーなし</b><p>テンプレートから追加する。</p></div>`}</div></section>`;
  }
  function buildTimerText(){
    const list=planTimers();
    return `【OUTBASE タイマー】\\n${current().title}\\n${list.map(t=>`${t.status==='done'?'✓':'□'} ${t.name}：${formatTimer(timerLeft(t))} / ${timerLabel(t.kind)} / ${t.status}`).join('\\n')||'なし'}`;
  }
  function updateTimers(){
    let changed=false, doneNames=[];
    (state.timers||[]).forEach(t=>{
      if(t.status==='running' && timerLeft(t)<=0){
        t.status='done'; t.remaining=0; t.startedAt=0; changed=true; doneNames.push(t.name);
      }
    });
    document.querySelectorAll('[data-timer-left]').forEach(el=>{
      const t=(state.timers||[]).find(x=>x.id===el.dataset.timerLeft);
      if(t)el.textContent=formatTimer(timerLeft(t));
    });
    if(changed){
      doneNames.forEach(name=>addPublicRecord('memo',`タイマー完了：${name}`,'タイマー'));
      save();render();toast('タイマー完了');
    }
  }



  function planPins(){
    return (state.mapPins||[]).filter(p=>!p.eventId || p.eventId===state.currentPlanId);
  }
  function pinKindClass(k){
    return /危険|注意|雨|ぬかるみ/.test(k||'')?'warn':(/非公開|体調/.test(k||'')?'private':'');
  }
  function pinShort(k){
    if((k||'').includes('サイト'))return 'S';
    if((k||'').includes('木陰'))return '木';
    if((k||'').includes('水'))return '水';
    if((k||'').includes('危険'))return '!';
    if((k||'').includes('景色'))return '景';
    if((k||'').includes('トイレ'))return 'WC';
    return 'P';
  }
  function siteMapStats(){
    const pins=planPins();
    return {
      total:pins.length,
      public:pins.filter(p=>p.public).length,
      private:pins.filter(p=>!p.public).length,
      score:Math.round(pins.reduce((a,p)=>a+(+p.score||0),0)/Math.max(1,pins.length)*20)
    };
  }
  function buildSiteMapReport(){
    const p=current(), pins=planPins(), st=siteMapStats();
    const lines=pins.map(x=>`${x.public?'○':'非'} ${x.kind}：${x.name} / ${x.note||''} / 評価${x.score||'-'}`).join('\\n') || 'ピンなし';
    return `【OUTBASE サイトMAP】\\n${p.title}\\n場所:${p.place||'未設定'}\\nピン:${st.total} / 公開:${st.public} / 非公開:${st.private} / 評価:${st.score}\\n\\n${lines}\\n\\n※非公開ピンは公開前に確認`;
  }
  function siteMapPanelHtml(){
    const st=siteMapStats();
    return `<section class="section"><div class="siteMapPanel"><div class="siteMapHead"><span><b>サイトMAP</b><small>キャンプ場散歩の場所メモを、再訪・レビューに使えるピンへ。</small></span><span class="pill ${st.score>=70?'dark':'wood'}">${st.score}</span></div><div class="siteMapCanvasWrap" id="siteMapCanvas">${planPins().map(p=>`<button class="sitePin ${pinKindClass(p.kind)}" style="left:${p.x}%;top:${p.y}%" data-act="openPin" data-id="${p.id}">${esc(pinShort(p.kind))}</button>`).join('')}</div><div class="siteScoreGrid"><div class="siteScore"><b>${st.total}</b><span>ピン</span></div><div class="siteScore"><b>${st.public}</b><span>公開</span></div><div class="siteScore"><b>${st.private}</b><span>非公開</span></div><div class="siteScore"><b>${state.walk.spots.length}</b><span>スポット</span></div></div><div class="siteMapOps"><button data-act="addPinQuick" data-kind="サイト">サイト</button><button data-act="addPinQuick" data-kind="木陰">木陰</button><button data-act="copySiteMapReport">MAPコピー</button></div></div></section>`;
  }
  function pinListHtml(){
    const pins=planPins();
    return `<section class="section"><div class="head"><div><h2>MAPピン</h2><p>公開前に非公開・注意ピンを確認。</p></div><button class="btn primary" data-act="addPinQuick" data-kind="スポット">追加</button></div><div class="pinList">${pins.map(p=>`<div class="pinCard"><div class="pinTop"><span><b>${esc(p.name)}</b><small>${esc(p.kind)} / 評価${esc(p.score||'-')} / ${p.public?'公開候補':'非公開'}<br>${esc(p.note||'')}</small></span><span class="pill ${p.public?'dark':'private'}">${p.public?'公開':'非公開'}</span></div><div class="pinOps"><button data-act="togglePinPublic" data-id="${p.id}">${p.public?'非公開へ':'公開へ'}</button><button data-act="pinToPlace" data-id="${p.id}">場所カード</button><button data-act="deletePin" data-id="${p.id}">削除</button></div></div>`).join('')||`<div class="siteReport"><b>ピンなし</b><p>サイト・木陰・水場・危険を押すだけで残せる。</p></div>`}</div></section>`;
  }

  function haversine(a,b){
    if(!a||!b||a.lat==null||b.lat==null)return 0;
    const R=6371, toRad=x=>x*Math.PI/180;
    const dLat=toRad(b.lat-a.lat), dLng=toRad(b.lng-a.lng);
    const la1=toRad(a.lat), la2=toRad(b.lat);
    const h=Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
    return 2*R*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
  }
  function walkDistance(track=state.walk.track){
    let km=0;
    for(let i=1;i<track.length;i++)km+=haversine(track[i-1],track[i]);
    return km;
  }
  function currentWalkSession(){
    state.walk.sessions=state.walk.sessions||[];
    return state.walk.sessions.find(s=>s.active) || state.walk.sessions[state.walk.sessions.length-1] || null;
  }
  function walkDurationSec(){
    const s=currentWalkSession();
    if(!s)return 0;
    const end=s.active?Date.now():(s.endedAt||Date.now());
    return Math.max(0,Math.floor((end-(s.startedAt||end))/1000));
  }
  function walkAvgSpeed(){
    const h=walkDurationSec()/3600;
    return h?walkDistance()/h:0;
  }
  function fmtDuration(sec){
    sec=Math.max(0,Math.floor(sec||0));
    const h=Math.floor(sec/3600), m=Math.floor((sec%3600)/60), s=sec%60;
    return h?`${h}:${pad(m)}:${pad(s)}`:`${m}:${pad(s)}`;
  }
  function pushGpsPoint(lat,lng,source='gps'){
    const p={lat,lng,source,mode:fieldModeName(),time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}),ts:Date.now(),eventId:state.currentPlanId};
    const last=state.walk.track[state.walk.track.length-1];
    const dist=last?haversine(last,p):0;
    if(last && dist>GPS_JUMP_LIMIT_KM){
      state.notes.push({id:uid('note'),title:'GPSジャンプ除外',text:`${dist.toFixed(2)}km / ${p.time}`,private:false});
      return false;
    }
    state.walk.track.push(p);
    maybeAutoEndDrive(p,last,dist);
    return true;
  }
  function ensureWalkSession(){
    state.walk.sessions=state.walk.sessions||[];
    let s=state.walk.sessions.find(x=>x.active);
    if(!s){
      s={id:uid('walk'),eventId:state.currentPlanId,mode:fieldModeName(),startedAt:Date.now(),endedAt:0,active:true,startCount:state.walk.track.length};
      state.walk.sessions.push(s);
    }
    return s;
  }
  function startGpsAuto(){
    stopGpsAuto(false);
    if(navigator.geolocation && navigator.geolocation.watchPosition){
      gpsWatchId=navigator.geolocation.watchPosition(pos=>{
        if(pushGpsPoint(pos.coords.latitude,pos.coords.longitude,'watch'))save();
      },()=>{}, {enableHighAccuracy:true,timeout:8000,maximumAge:5000});
    }
    gpsAutoTimer=setInterval(()=>{ if(state.walk.active||state.drive?.active) gps(true); }, GPS_INTERVAL_MS);
  }
  function stopGpsAuto(saveState=true){
    if(gpsWatchId!==null && navigator.geolocation){try{navigator.geolocation.clearWatch(gpsWatchId)}catch(e){}}
    gpsWatchId=null;
    if(gpsAutoTimer){clearInterval(gpsAutoTimer);gpsAutoTimer=null}
    if(saveState)save();
  }
  function buildRouteSummary(){
    const km=walkDistance(), sec=walkDurationSec(), sp=walkAvgSpeed(), pts=state.walk.track.length;
    const s=currentWalkSession();
    return `【OUTBASE ルート】\\n${current().title}\\n${fieldModeName()}\\n距離:${km.toFixed(2)}km\\n時間:${fmtDuration(sec)}\\n平均:${sp.toFixed(1)}km/h\\nGPS:${pts}点\\n開始:${s?.startedAt?new Date(s.startedAt).toLocaleString('ja-JP'):''}\\n終了:${s?.endedAt?new Date(s.endedAt).toLocaleString('ja-JP'):''}`;
  }
  function buildGpx(){
    const pts=state.walk.track||[];
    const name=esc(current().title);
    return `<?xml version="1.0" encoding="UTF-8"?>\\n<gpx version="1.1" creator="OUTBASE">\\n<trk><name>${name}</name><trkseg>\\n${pts.map(p=>`<trkpt lat="${p.lat}" lon="${p.lng}"><time>${new Date(p.ts||Date.now()).toISOString()}</time></trkpt>`).join('\\n')}\\n</trkseg></trk>\\n</gpx>`;
  }
  function gpsPanelHtml(){
    const km=walkDistance(), sec=walkDurationSec(), sp=walkAvgSpeed();
    return `<section class="section"><div class="gpsPanel"><div class="gpsHead"><span><b>${state.walk.active?'ルート記録中':'ルート記録'}</b><small>10秒ごとに現在地を拾う。1km以上の急ジャンプは除外。</small></span><span class="gpsLive ${state.walk.active?'on':''}">${state.walk.active?'AUTO':'STOP'}</span></div><div class="gpsGrid"><div class="gpsMetric"><b>${km.toFixed(2)}</b><span>km</span></div><div class="gpsMetric"><b>${fmtDuration(sec)}</b><span>時間</span></div><div class="gpsMetric"><b>${sp.toFixed(1)}</b><span>km/h</span></div><div class="gpsMetric"><b>${state.walk.track.length}</b><span>GPS</span></div></div><div class="gpsOps"><button class="primary" data-act="toggleWalk">${state.walk.active?'終了':'開始'}</button><button data-act="gps">手動追加</button><button data-act="copyRouteSummary">コピー</button><button data-act="exportGpx">GPX</button></div></div></section>`;
  }

  function fieldStats(){
    const publicRecords=planRecords();
    return {
      gps:state.walk.track.length,
      spots:state.walk.spots.length,
      friends:state.walk.friends.length,
      records:publicRecords.length,
      health:state.walk.health.length,
      km:walkDistance(),
      duration:walkDurationSec(),
      speed:walkAvgSpeed()
    };
  }
  function fieldModeName(){
    return state.walkMode==='camp'?'キャンプ場散歩':'通常散歩';
  }
  function buildFieldSummary(){
    const fs=fieldStats();
    const recent=planRecords().slice(-6).map(r=>`・${r.time} ${r.title||r.kind}：${r.text||''} → ${r.target||'現地メモ'}`).join('\\n') || '公開記録なし';
    const spots=state.walk.spots.map(s=>`・${s.time||''} ${s.type||'スポット'}：${s.name}`).join('\\n') || 'スポットなし';
    const friends=state.walk.friends.map(f=>`・${f.time||''} ${f.name}`).join('\\n') || '犬友達なし';
    return `【OUTBASE 現地まとめ】\\n${current().title}\\n${fieldModeName()} / GPS:${fs.gps} / スポット:${fs.spots} / 犬友達:${fs.friends}\\n\\n■記録\\n${recent}\\n\\n■スポット\\n${spots}\\n\\n■犬友達\\n${friends}\\n\\n※体調メモは非公開`;
  }

  function fieldRecordCard(r){
    const title=esc(r.title||recordKindLabel(r.kind));
    const meta=`${esc(r.time||'')} / ${esc(r.mode||'')}`;
    const text=esc(r.text||'');
    const badge=esc(recordKindLabel(r.kind));
    const media=r.dataUrl&&r.kind==='photo'?`<div class="mediaPreview"><img src="${r.dataUrl}" alt=""></div>`:
      r.dataUrl&&(r.kind==='voice'||r.kind==='audio')?`<div class="mediaPreview"><audio controls src="${r.dataUrl}"></audio></div>`:
      r.dataUrl&&r.kind==='video'?`<div class="mediaPreview"><video controls src="${r.dataUrl}"></video></div>`:'';
    return `<div class="fieldRecentCard"><b>${title}</b><small>${meta}<br>${text}</small>${media}<span class="pill">${badge}</span></div>`;
  }

  function recordKindLabel(kind){
    const fixed={memo:'メモ',photo:'写真',video:'動画',voice:'音声',audio:'音声',site:'場所',place:'場所',health:'体調',meal:'料理',weather:'天気',setup:'設営',withdraw:'撤収'};
    return fixed[kind]||kind||'記録';
  }  function addPublicRecord(kind,text,title){
    const p=state.walk.track[state.walk.track.length-1];
    state.records=state.records||[];
    state.records.push({
      id:uid('rec'),
      eventId:state.currentPlanId,
      kind,
      title:title||recordKindLabel(kind),
      text:text||'',
      mode:fieldModeName(),
      time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}),
      date:today(),
      lat:p?.lat||null,
      lng:p?.lng||null,
      private:false,
      fieldModeId:state.fieldMode||'',
      target:'現地メモ',
      flow:(state.fieldMode?currentFieldMode().saveTo:[])||[],
      tags:[currentFieldMode().title, recordKindLabel(kind)].filter(Boolean)
    });
  }



  function quickMapHtml(){
    return `<section class="mapOpenPanel">
      <div class="mapOpenHead">
        <span><b>地図はGoogle Mapで見る</b><small>OUTBASE内に線だけの地図は出さない。場所を確認したい時はGoogle Mapを開く。</small></span>
        <span class="pill">${state.walk.track.length} GPS</span>
      </div>
      <div class="mapOpenNotice"><b>ここでやること：</b>現在地を記録する / Google Mapで正確な場所を見る。<br>歩いた線・GPS履歴は下の「詳細機能」に移動。</div>
      <div class="mapOpenOps">
        <button class="primary" data-act="openMap">Google Mapを開く</button>
        <button data-act="gps">現在地を記録</button>
      </div>
    </section>`;
  }


  function fieldModeKey(){return state.fieldActionMode||'kota'}
  function fieldModeDef(key=fieldModeKey()){
    return {
      kota:{title:'コタ散歩',sub:'コタの散歩・体調・危険を残す',use:'コタ散歩では、歩いた場所・暑さ寒さ・うんち/おしっこ・危険ポイント・犬友達を残す。体調系は非公開。',walk:'normal'},
      campwalk:{title:'キャンプ場散歩',sub:'サイト候補・木陰・水場・危険を残す',use:'キャンプ場散歩では、次回使える場所を残す。サイト候補、木陰、水場、景色、トイレ、炊事場、危険ポイントを場所カード化する。',walk:'camp'},
      setup:{title:'設営',sub:'配置・不足・困ったことを残す',use:'設営では、配置写真、足りなかったギア、困ったこと、次回改善を残す。タイマーだけではなく設営の記録として残す。'},
      withdraw:{title:'撤収',sub:'乾燥・忘れ物・汚れ/故障を残す',use:'撤収では、乾燥、忘れ物、ゴミ、積込、壊れた/汚れたギア、次回改善を残す。帰宅後の整理につなげる。'},
      drive:{title:'ドライブ',sub:'出発・休憩・寄り道・到着を残す',use:'ドライブでは、出発、休憩、給油、買い物寄り道、渋滞、到着、コンビニ/道の駅を残す。次回の出発時間や寄り道計画に使う。'},
      free:{title:'自由記録',sub:'迷った時のなんでも記録',use:'自由記録では、分類に迷うことを音声・カメラ・現在地・文字メモで残す。あとで整理する。'}
    }[key]||{title:'自由記録',sub:'なんでも記録',use:'迷ったら音声で残す。'};
  }
  function fieldModeSelectorHtml(){
    const modes=['kota','campwalk','setup','withdraw','drive','free'];
    return `<section class="modeSelectPanel"><div class="modeSelectHead"><span><b>今なにしてる？</b><small>最初に行動を選ぶ。選んだ行動に必要なボタンだけ出す。</small></span><span class="modeBadge">MODE</span></div><div class="modeGrid">${modes.map(k=>{const d=fieldModeDef(k);return `<button class="modeBtn ${fieldModeKey()===k?'active':''}" data-act="setFieldMode" data-mode="${k}"><b>${esc(d.title)}</b><small>${esc(d.sub)}</small></button>`}).join('')}</div></section>`;
  }
  function modeActionButton(label,sub,code,primary=false){return `<button class="${primary?'primary':''}" data-act="fieldModeAction" data-code="${code}"><b>${esc(label)}</b><small>${esc(sub||'')}</small></button>`}
  function fieldModeActionsHtml(){
    const k=fieldModeKey(), d=fieldModeDef(k);
    const walkText=state.walk.active?'散歩終了':'散歩開始';
    const nt=timerNext(), tid=nt[3]||'';
    let buttons=[];
    if(k==='kota') buttons=[
      modeActionButton(walkText,'コタ散歩の開始/終了','walk',true),
      modeActionButton('音声メモ','気づいたことを喋る','voice'),
      modeActionButton('カメラ','コタ/道/危険を撮る','camera'),
      modeActionButton('現在地','場所を1点保存','gps'),
      modeActionButton('Google Map','正確な地図を見る','map'),
      modeActionButton('うんち','非公開で体調記録','health:うんち'),
      modeActionButton('おしっこ','非公開で体調記録','health:おしっこ'),
      modeActionButton('体調','非公開でメモ','health:体調'),
      modeActionButton('犬友達','名前を残す','friend'),
      modeActionButton('危険ポイント','危ない場所を残す','spot:危険')
    ];
    else if(k==='campwalk') buttons=[
      modeActionButton(walkText,'キャンプ場散歩の開始/終了','walk',true),
      modeActionButton('音声メモ','サイト感想を喋る','voice'),
      modeActionButton('カメラ','サイト/景色を撮る','camera'),
      modeActionButton('現在地','場所を1点保存','gps'),
      modeActionButton('Google Map','正確な地図を見る','map'),
      modeActionButton('サイト候補','泊まりたい場所','spot:サイト候補'),
      modeActionButton('景色','景色が良い場所','spot:景色'),
      modeActionButton('木陰','コタ休憩候補','spot:木陰'),
      modeActionButton('水場','水場/炊事場','spot:水場'),
      modeActionButton('トイレ','トイレの場所','spot:トイレ'),
      modeActionButton('炊事場','炊事場の場所','spot:炊事場'),
      modeActionButton('危険','段差/ぬかるみ','spot:危険')
    ];
    else if(k==='setup') buttons=[
      modeActionButton('設営開始','設営を始めた時刻','record:setup:設営開始',true),
      modeActionButton('設営完了','終わった時刻','record:setup:設営完了'),
      modeActionButton('配置写真','テント/タープ/IGTを撮る','camera'),
      modeActionButton('音声メモ','困ったことを喋る','voice'),
      modeActionButton('タイマー','設営タイマー','timer'),
      modeActionButton('足りないギア','準備へ戻すメモ','note:足りないギア'),
      modeActionButton('困ったこと','改善メモにする','note:設営で困った'),
      modeActionButton('次回改善','次回に活かす','note:次回改善')
    ];
    else if(k==='withdraw') buttons=[
      modeActionButton('撤収開始','撤収を始めた時刻','record:withdraw:撤収開始',true),
      modeActionButton('撤収完了','終わった時刻','record:withdraw:撤収完了'),
      modeActionButton('乾燥メモ','幕/ギア乾燥','note:乾燥メモ'),
      modeActionButton('忘れ物確認','忘れた/注意点','note:忘れ物確認'),
      modeActionButton('ゴミ','ゴミ処理メモ','note:ゴミ'),
      modeActionButton('積込','積込の反省','note:積込'),
      modeActionButton('壊れた/汚れた','ギアケアへ','note:ギアケア'),
      modeActionButton('タイマー','撤収タイマー','timer')
    ];
    else if(k==='drive') buttons=[
      modeActionButton('出発','出発時刻を残す','record:memo:出発',true),
      modeActionButton('休憩','SA/PA/休憩','record:memo:休憩'),
      modeActionButton('給油','給油メモ','note:給油'),
      modeActionButton('買い物寄り道','買い忘れ/店','note:買い物寄り道'),
      modeActionButton('渋滞','渋滞/道路メモ','note:渋滞'),
      modeActionButton('到着','到着時刻を残す','record:memo:到着'),
      modeActionButton('道の駅/コンビニ','次回用メモ','spot:道の駅/コンビニ'),
      modeActionButton('Google Map','現在地を開く','map')
    ];
    else buttons=[
      modeActionButton('音声メモ','まず喋る','voice',true),
      modeActionButton('カメラ','見たものを撮る','camera'),
      modeActionButton('現在地','場所を残す','gps'),
      modeActionButton('Google Map','正確な地図を見る','map'),
      modeActionButton('文字メモ','一言入力','memo'),
      modeActionButton('タイマー','必要なら開始','timer')
    ];
    return `<section class="modeWorkPanel"><div class="modeWorkHead"><span><b>${esc(d.title)}</b><small>${esc(d.sub)}</small></span><span class="pill dark">${esc(k==='kota'?'コタ':k==='campwalk'?'場内':k==='setup'?'設営':k==='withdraw'?'撤収':k==='drive'?'車':'自由')}</span></div><div class="modeUseText"><b>このモードでやること：</b>${esc(d.use)}</div><div class="modeActionGrid">${buttons.join('')}</div><div class="modeQuickStats"><div><b>${state.walk.track.length}</b><span>GPS</span></div><div><b>${planRecords().length}</b><span>記録</span></div><div><b>${state.walk.spots.length}</b><span>場所</span></div><div><b>${timerStats().running}</b><span>タイマー</span></div></div></section>`;
  }
  function setFieldMode(mode){
    state.fieldActionMode=mode||'free';
    if(mode==='campwalk')state.walkMode='camp';
    if(mode==='kota')state.walkMode='normal';
    save();render();toast(`${fieldModeDef(mode).title}へ`);
  }
  function addFieldNote(title){
    const text=prompt(`${title}を一言`, '')||'';
    if(!text)return;
    state.notes.push({id:uid('note'),title,text,private:false});
    addPublicRecord('memo',`${title}：${text}`,title);
    save();render();toast('メモ保存');
  }
  function fieldModeAction(code){
    const k=fieldModeKey();
    if(k==='campwalk')state.walkMode='camp';
    if(k==='kota')state.walkMode='normal';
    if(code==='walk')return toggleWalk();
    if(code==='voice')return toggleVoice();
    if(code==='camera')return captureCamera();
    if(code==='gps')return gps();
    if(code==='map')return openMap();
    if(code==='friend')return friend();
    if(code==='timer')return startTimer(timerNext()[3]||'');
    if(code==='memo')return quickRecord('memo');
    if(code.startsWith('health:'))return health(code.split(':')[1]);
    if(code.startsWith('spot:'))return spotQuick(code.slice(5));
    if(code.startsWith('note:'))return addFieldNote(code.slice(5));
    if(code.startsWith('record:')){
      const [,kind,title]=code.split(':');
      addPublicRecord(kind||'memo',title,title);
      save();render();toast(`${title}を記録`);return;
    }
  }

  function fieldFirstPanelHtml(){
    const nt=timerNext(), tid=nt[3]||'';
    return `<section class="fieldUsePanel">
      <div class="fieldUseHead">
        <span><b>現地で忘れないために残す</b><small>ここは読む画面ではなく、押して残す画面。あとで整理できるように、今だけ記録する。</small></span>
        <span class="fieldUseBadge">FIELD</span>
      </div>
      <div class="fieldUseSteps">
        <div class="fieldUseStep"><i>1</i><span><b>気づいたら音声</b><span>「このサイト日陰が良い」みたいに喋って残す。</span></span></div>
        <div class="fieldUseStep"><i>2</i><span><b>見た目はカメラ</b><span>サイト・設営・料理・ギア配置を写真で残す。</span></span></div>
        <div class="fieldUseStep"><i>3</i><span><b>場所は現在地</b><span>後で「どこだった？」にならないようにGPSを残す。</span></span></div>
      </div>
      <div class="fieldUseGrid">
        <button class="fieldUseBtn primary" data-act="toggleVoice"><b>${voiceRecorder?'音声停止':'音声メモ'}</b><small>${voiceRecorder?'録音中。もう一度押す':'押して録音、もう一度で保存'}</small></button>
        <button class="fieldUseBtn" data-act="captureCamera"><b>カメラ</b><small>撮影して記録</small></button>
        <button class="fieldUseBtn" data-act="gps"><b>現在地</b><small>GPSを1点保存</small></button>
        <button class="fieldUseBtn" data-act="openMap"><b>地図</b><small>Google Mapを開く</small></button>
      </div>
      <div class="fieldUseMini">
        <button data-act="toggleWalk">${state.walk.active?'散歩終了':'散歩開始'}</button>
        <button data-act="${tid?'startTimer':'addTimerTemplate'}" data-id="${tid}" data-kind="meal">タイマー</button>
        <button data-act="quickRecord" data-kind="memo">文字メモ</button>
        <button data-act="copyFieldSummary">まとめコピー</button>
      </div>
    </section>`;
  }


  function fieldRecentHtml(){
    const rec=planRecords().slice().reverse().slice(0,3);
    return `<section class="section">
      <div class="head"><div><h2>今残したもの</h2><p>直近3件。どこへ戻す記録かも表示。</p></div><button class="btn" data-act="copyFieldSummary">コピー</button></div>
      <div class="fieldRecentList">${rec.map(r=>`<div class="savedFlowCard"><b>${esc(r.title||recordKindLabel(r.kind))}</b><small>${esc(r.time||'')} / ${esc(r.mode||'')}<br>${esc(r.text||'')}<br>戻し先：${esc(r.target||'現地メモ')}</small><div class="savedFlowTags">${(r.tags||[]).slice(0,4).map(t=>`<span>${esc(t)}</span>`).join('')}${r.private?'<span>非公開</span>':''}</div></div>`).join('')||`<div class="savedFlowCard"><b>まだなし</b><small>先にモードを選んで、音声・カメラ・現在地・専用ボタンで残す。</small></div>`}</div>
    </section>`;
  }
  function fieldDetailsHtml(){
    return `<section class="section">
      <details class="fieldMore">
        <summary>詳細機能・履歴を見る</summary>
        <div class="fieldMoreBody">
          ${timerPanelHtml()}
          ${timerBodyHtml()}
          ${siteMapPanelHtml()}
          ${pinListHtml()}

          <section class="section">
            <div class="head"><div><h2>追加記録</h2><p>必要な時だけ使う。</p></div></div>
            <div class="fieldMiniOps">
              <button data-act="captureMedia" data-kind="video">動画</button>
              <button data-act="quickRecord" data-kind="meal">料理</button>
              <button data-act="import">ファイル</button>
            </div>
          </section>

          <section class="section">
            <div class="head"><div><h2>場所を残す</h2><p>再訪に使える場所だけ。</p></div></div>
            <div class="spotRail">
              <button data-act="spotQuick" data-type="景色">景色</button>
              <button data-act="spotQuick" data-type="木陰">木陰</button>
              <button data-act="spotQuick" data-type="水場">水場</button>
              <button data-act="spotQuick" data-type="危険">危険</button>
            </div>
          </section>

          <section class="section">
            <div class="head"><div><h2>GPS履歴</h2><p>最新の位置だけ確認。</p></div><button class="btn" data-act="clearTrack">クリア</button></div>
            <div class="trackList">${state.walk.track.slice().reverse().slice(0,6).map((p,i)=>`<div class="trackPoint"><span><b>${esc(p.time||'')}</b><small>${p.lat.toFixed(5)}, ${p.lng.toFixed(5)} / ${esc(p.source||'gps')}</small></span><span class="pill">${i===0?'最新':'GPS'}</span></div>`).join('')||`<div class="routeBox"><b>GPSなし</b><p>現在地を押すと記録。</p></div>`}</div>
          </section>

          <section class="section">
            <details class="privateHealth"><summary>非公開の体調メモ</summary><div class="healthGrid"><button data-act="health" data-type="体調">体調</button><button data-act="health" data-type="うんち">うんち</button><button data-act="health" data-type="おしっこ">おしっこ</button></div></details>
          </section>

          <section class="section">
            <div class="head"><div><h2>現地タイムライン</h2><p>公開できる記録だけ。非公開体調メモは混ぜない。</p></div><button class="btn" data-act="copyFieldSummary">コピー</button></div>
            ${planRecords().slice().reverse().slice(0,10).map(r=>fieldRecordCard(r)).join('')||'<div class="row"><span><strong>記録なし</strong><small>現地で押す場所から記録する。</small></span></div>'}
          </section>
        </div>
      </details>
    </section>`;
  }



  function fieldModes(){
    return [
      {
        id:'kotaWalk', title:'コタ散歩', short:'体調・排泄・犬友達', badge:'KOTA',
        purpose:'コタの安全と次回の散歩判断のために、体調・排泄・危険・良かった道を残す。',
        saveTo:['非公開コタ健康メモ','散歩コース候補','危険ポイント','犬友達メモ'],
        later:['暑い日は短めにする','危険ポイントを避ける','良かった道を候補にする','犬友達がいた場所を再訪候補にする'],
        actions:[
          {label:'散歩開始/終了',help:'距離と時間を残す',do:'walk',primary:true,target:'散歩ログ'},
          {label:'音声メモ',help:'気づいたことを喋る',do:'voice',target:'現地メモ'},
          {label:'カメラ',help:'道・表情・場所を撮る',do:'camera',target:'現地写真'},
          {label:'現在地',help:'GPSを1点保存',do:'gps',target:'場所'},
          {label:'うんち',help:'非公開で保存',do:'private',type:'うんち',target:'非公開健康メモ'},
          {label:'おしっこ',help:'非公開で保存',do:'private',type:'おしっこ',target:'非公開健康メモ'},
          {label:'体調',help:'暑い/寒い/疲れなど',do:'private',type:'体調',target:'非公開健康メモ'},
          {label:'犬友達',help:'会った犬・飼い主メモ',do:'friend',target:'犬友達'},
          {label:'危険ポイント',help:'段差・車・拾い食い注意',do:'place',type:'危険ポイント',target:'危険ポイント'},
          {label:'Google Map',help:'正確な場所を見る',do:'map',target:'地図'}
        ]
      },
      {
        id:'campWalk', title:'キャンプ場散歩', short:'サイト・景色・水場', badge:'SITE',
        purpose:'キャンプ場内を歩きながら、次回泊まりたいサイト・水場・木陰・危険を場所カードにする。',
        saveTo:['場所カード','キャンプ場レビュー','次回サイト候補','コタ向け動線'],
        later:['次回予約するサイト候補にする','夏は木陰を優先する','水場までの距離を判断する','危険な段差やぬかるみを避ける'],
        actions:[
          {label:'散歩開始/終了',help:'キャンプ場散歩を記録',do:'walk',primary:true,target:'散歩ログ'},
          {label:'音声メモ',help:'下見メモを喋る',do:'voice',target:'現地メモ'},
          {label:'カメラ',help:'サイトや施設を撮る',do:'camera',target:'場所カード'},
          {label:'現在地',help:'場所をGPS保存',do:'gps',target:'場所'},
          {label:'サイト候補',help:'次に泊まりたい場所',do:'place',type:'サイト候補',target:'場所カード'},
          {label:'景色',help:'眺めが良い場所',do:'place',type:'景色',target:'場所カード'},
          {label:'木陰',help:'コタの休憩場所',do:'place',type:'木陰',target:'場所カード'},
          {label:'水場',help:'洗い物や給水の距離',do:'place',type:'水場',target:'場所カード'},
          {label:'トイレ',help:'位置と距離を残す',do:'place',type:'トイレ',target:'場所カード'},
          {label:'炊事場',help:'使いやすさ確認',do:'place',type:'炊事場',target:'場所カード'},
          {label:'危険',help:'段差・ぬかるみ・車',do:'place',type:'危険',target:'危険ポイント'},
          {label:'Google Map',help:'正確な場所を見る',do:'map',target:'地図'}
        ]
      },
      {
        id:'setup', title:'設営', short:'配置・不足・改善', badge:'SET',
        purpose:'設営中の配置写真・不足ギア・困ったことを残し、次回の設営を楽にする。',
        saveTo:['設営ログ','ギア改善','買い物候補','次回レイアウト'],
        later:['前回良かった配置を再現する','足りないギアを準備に戻す','設営時間から出発時間を調整する','困ったことを改善に送る'],
        actions:[
          {label:'設営開始',help:'開始時刻を残す',do:'modeRecord',kind:'設営開始',primary:true,target:'設営ログ'},
          {label:'設営完了',help:'完了時刻を残す',do:'modeRecord',kind:'設営完了',target:'設営ログ'},
          {label:'配置写真',help:'次回のレイアウト参考',do:'camera',target:'次回レイアウト'},
          {label:'音声メモ',help:'設営中の気づきを喋る',do:'voice',target:'現地メモ'},
          {label:'足りないギア',help:'準備/買い物へ戻す',do:'gearReturn',kind:'足りないギア',target:'ギア/買い物'},
          {label:'使わなかったギア',help:'次回積むか判断',do:'gearReturn',kind:'使わなかったギア',target:'ギア見直し'},
          {label:'困ったこと',help:'改善へ戻す',do:'improve',kind:'設営で困ったこと',target:'改善'},
          {label:'次回改善',help:'次回設営に使う',do:'improve',kind:'設営改善',target:'改善'},
          {label:'タイマー',help:'設営区切り',do:'timer',kind:'setup',target:'タイマー'}
        ]
      },
      {
        id:'withdraw', title:'撤収', short:'乾燥・忘れ物・積込', badge:'OUT',
        purpose:'撤収中の乾燥・忘れ物・ゴミ・積込・壊れたギアを残し、帰宅後の整理と次回準備につなげる。',
        saveTo:['撤収ログ','乾燥/修理ケア','忘れ物チェック','車載改善'],
        later:['撤収を早めに始める','乾燥が必要なものを帰宅後に出す','壊れたギアを修理へ送る','忘れ物チェックに追加する'],
        actions:[
          {label:'撤収開始',help:'開始時刻を残す',do:'modeRecord',kind:'撤収開始',primary:true,target:'撤収ログ'},
          {label:'撤収完了',help:'完了時刻を残す',do:'modeRecord',kind:'撤収完了',target:'撤収ログ'},
          {label:'乾燥メモ',help:'幕・ロープ・マット',do:'care',kind:'乾燥',target:'乾燥ケア'},
          {label:'忘れ物確認',help:'次回の忘れ防止',do:'care',kind:'忘れ物確認',target:'チェックリスト'},
          {label:'ゴミ',help:'持ち帰り/処分メモ',do:'modeRecord',kind:'ゴミ',target:'撤収ログ'},
          {label:'積込',help:'車載・BOX位置',do:'care',kind:'積込',target:'車載改善'},
          {label:'壊れた/汚れた',help:'ケア対象にする',do:'care',kind:'ギアケア',target:'ギアケア'},
          {label:'カメラ',help:'積込や汚れを撮る',do:'camera',target:'撤収写真'},
          {label:'タイマー',help:'撤収区切り',do:'timer',kind:'withdraw',target:'タイマー'}
        ]
      },
      {
        id:'drive', title:'ドライブ', short:'出発・休憩・寄り道', badge:'CAR',
        purpose:'キャンプ前後の移動中に、出発・休憩・買い物・渋滞・到着を残し、次回の出発時間や通り道判断に使う。',
        saveTo:['移動ログ','通り道候補','買い物寄り道','渋滞メモ'],
        later:['次回は早く出る/遅く出るを判断する','使えるコンビニや道の駅を残す','買い物を前日に済ませる判断に使う','帰り道の混雑を避ける'],
        actions:[
          {label:'出発',help:'出発時刻を残す',do:'drive',kind:'出発',primary:true,target:'移動ログ'},
          {label:'休憩',help:'SA/PA/道の駅',do:'drive',kind:'休憩',target:'休憩候補'},
          {label:'給油',help:'給油場所とタイミング',do:'drive',kind:'給油',target:'移動ログ'},
          {label:'買い物寄り道',help:'通り道の店を残す',do:'drive',kind:'買い物寄り道',target:'買い物'},
          {label:'渋滞',help:'次回回避に使う',do:'drive',kind:'渋滞',target:'渋滞メモ'},
          {label:'到着',help:'到着時刻を残す',do:'drive',kind:'到着',target:'移動ログ'},
          {label:'道の駅/コンビニ',help:'使える寄り道を場所化',do:'place',type:'道の駅/コンビニ',target:'場所カード'},
          {label:'Google Map',help:'現在地を見る',do:'map',target:'地図'}
        ]
      },
      {
        id:'free', title:'自由記録', short:'その場メモ', badge:'MEMO',
        purpose:'どのモードにも当てはまらないことを残す。迷ったら音声かカメラで残す。',
        saveTo:['現地メモ','整理待ち','レビュー候補'],
        later:['整理画面で分類する','不要なら削除する','改善やレビューへ振り分ける'],
        actions:[
          {label:'音声メモ',help:'迷ったら喋る',do:'voice',primary:true,target:'現地メモ'},
          {label:'カメラ',help:'状態を撮る',do:'camera',target:'現地写真'},
          {label:'現在地',help:'GPSを保存',do:'gps',target:'場所'},
          {label:'文字メモ',help:'一言だけ残す',do:'modeRecord',kind:'自由メモ',target:'現地メモ'},
          {label:'料理',help:'食べた/作った記録',do:'modeRecord',kind:'料理',target:'料理メモ'},
          {label:'動画',help:'必要なら動画',do:'video',target:'現地動画'}
        ]
      }
    ];
  }
  function currentFieldMode(){
    const list=fieldModes();
    return list.find(m=>m.id===(state.fieldMode||'kotaWalk')) || list[0];
  }
  function modeButtonHtml(m){
    return `<button class="${currentFieldMode().id===m.id?'active':''}" data-field-mode="${m.id}"><b>${esc(m.title)}</b><small>${esc(m.short)}</small></button>`;
  }
  function modeActionClass(a){
    if(a.do==='private')return ' privateAct';
    if(a.do==='place')return ' placeAct';
    if(a.do==='gearReturn'||a.do==='care'||a.do==='improve')return ' gearAct';
    if(a.do==='drive')return ' driveAct';
    return '';
  }
  function modeActionButton(a,i){
    const primary=a.primary?' primary':'';
    return `<button class="${primary}${modeActionClass(a)}" data-field-action="${i}"><b>${esc(a.label)}</b><small>${esc(a.help)} → ${esc(a.target||'記録')}</small></button>`;
  }
  function fieldSpecNoticeHtml(){
    const mode=currentFieldMode();
    return `<section class="fieldSpecNotice">
      <b>現地タブは「今の行動」を記録して、あとで戻す場所を決める</b>
      <p>ボタンを押すだけで、記録にモード・保存先・次に使う場所を付ける。体調や排泄は非公開、サイト候補や水場は場所カード、ギア問題は準備/ギアへ戻す。</p>
      <div class="fieldSpecLinks">${mode.saveTo.map(x=>`<span>${esc(x)}</span>`).join('')}</div>
    </section>`;
  }
  function fieldModeDeepHtml(){
    const mode=currentFieldMode();
    const actions=mode.actions||[];
    return `<section class="modeDeepPanel">
      <div class="modeDeepHead">
        <span><b>今なにしてる？</b><small>先にモードを選ぶ。選んだ行動だけに必要な操作を出す。</small></span>
        <span class="modeDeepBadge">${esc(mode.badge)}</span>
      </div>
      <div class="modeSelectGrid">${fieldModes().map(modeButtonHtml).join('')}</div>
      <div class="modePurpose"><b>${esc(mode.title)}の目的</b><p>${esc(mode.purpose)}</p></div>
      <div class="modeSaveFlow">
        <div><b>保存先</b><span>${mode.saveTo.map(x=>`・${esc(x)}`).join('<br>')}</span></div>
        <div><b>後で使う</b><span>${mode.later.map(x=>`・${esc(x)}`).join('<br>')}</span></div>
      </div>
      <div class="modeActionGrid">${actions.map(modeActionButton).join('')}</div>
    </section>`;
  }
  function fieldModeExplanationHtml(){
    const mode=currentFieldMode();
    return `<section class="section">
      <details class="modeDetailBlock">
        <summary>${esc(mode.title)}の記録ルール</summary>
        <div class="modeDetailInner">
          <div class="modeInfoList">
            <div><b>目的</b><span>${esc(mode.purpose)}</span></div>
            <div><b>保存先</b><span>${mode.saveTo.map(x=>`・${esc(x)}`).join('<br>')}</span></div>
            <div><b>後で使うところ</b><span>${mode.later.map(x=>`・${esc(x)}`).join('<br>')}</span></div>
          </div>
        </div>
      </details>
    </section>`;
  }
  function addFieldRecord(kind,text,title,opts={}){
    const p=state.walk.track[state.walk.track.length-1];
    const mode=currentFieldMode();
    state.records=state.records||[];
    state.records.push({
      id:uid('rec'),
      eventId:state.currentPlanId,
      kind:kind||'memo',
      title:title||recordKindLabel(kind)||kind||'記録',
      text:text||'',
      mode:mode.title,
      fieldModeId:mode.id,
      target:opts.target||'現地メモ',
      tags:opts.tags||[],
      flow:opts.flow||mode.saveTo||[],
      time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}),
      date:today(),
      lat:p?.lat||null,
      lng:p?.lng||null,
      private:!!opts.private
    });
  }
  function promptRecord(label,def=''){
    return prompt(`${label}を記録`, def||label) || '';
  }
  function addPrivateField(type){
    const note=prompt(`${type}メモ（非公開）`, type) || type;
    const mode=currentFieldMode();
    state.walk.health=state.walk.health||[];
    state.walk.health.push({type,note,mode:mode.title,time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}),private:true});
    addFieldRecord('health',note,type,{private:true,target:'非公開健康メモ',tags:['非公開','コタ','健康']});
    save();render();toast('非公開保存');
  }
  function addPlaceField(type,target){
    const name=prompt(`${type}を記録`, type) || '';
    if(!name)return;
    const p=state.walk.track[state.walk.track.length-1];
    const mode=currentFieldMode();
    state.walk.spots=state.walk.spots||[];
    const item={name,type,time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}),lat:p?.lat||null,lng:p?.lng||null,mode:mode.title,target:target||'場所カード'};
    state.walk.spots.push(item);
    state.places=state.places||[];
    state.places.push({id:uid('place'),name,kind:type,note:`${mode.title}：${target||'場所カード'}に保存`,visits:1,lat:p?.lat||null,lng:p?.lng||null});
    state.mapPins=state.mapPins||[];
    state.mapPins.push({id:uid('pin'),eventId:state.currentPlanId,name,kind:type,x:Math.round(20+Math.random()*60),y:Math.round(20+Math.random()*60),public:!/(危険|注意|体調|うんち|おしっこ)/.test(type||''),note:`${mode.title}で記録`,score:type==='木陰'?5:3});
    addFieldRecord('place',`${type}：${name}`,name,{target:target||'場所カード',tags:[type,mode.title]});
    save();render();toast('場所カード保存');
  }
  function addWorkflowRecord(kind,target){
    const text=promptRecord(kind,kind);
    if(!text)return;
    addFieldRecord(kind,text,kind,{target:target||'改善',tags:[kind,currentFieldMode().title]});
    state.notes=state.notes||[];
    state.notes.push({id:uid('note'),title:`${kind}：${currentFieldMode().title}`,text:`${text}\n戻し先：${target||'改善'}`,private:false});
    save();render();toast(`${target||'改善'}へ記録`);
  }
  function handleFieldAction(index){
    const mode=currentFieldMode();
    const action=(mode.actions||[])[Number(index)];
    if(!action)return;
    if(action.do==='walk')return toggleWalk();
    if(action.do==='voice')return toggleVoice();
    if(action.do==='camera')return captureCamera();
    if(action.do==='video')return captureMedia('video');
    if(action.do==='gps')return gps();
    if(action.do==='map')return openMap();
    if(action.do==='timer')return addTimerTemplate(action.kind||'free');
    if(action.do==='friend')return friend();
    if(action.do==='private')return addPrivateField(action.type||action.label);
    if(action.do==='place')return addPlaceField(action.type||action.label, action.target);
    if(action.do==='gearReturn')return addWorkflowRecord(action.kind||action.label, action.target||'ギア/買い物');
    if(action.do==='care')return addWorkflowRecord(action.kind||action.label, action.target||'ギアケア');
    if(action.do==='improve')return addWorkflowRecord(action.kind||action.label, action.target||'改善');
    if(action.do==='drive')return addWorkflowRecord(action.kind||action.label, action.target||'移動ログ');
    if(action.do==='modeRecord'){
      const text=promptRecord(action.kind||action.label, action.kind||action.label);
      if(!text)return;
      addFieldRecord(action.kind||'memo',text,action.label,{target:action.target||'現地メモ',tags:[mode.title,action.kind||action.label]});
      save();render();toast('記録した');
      return;
    }
  }


  function sessionContextHints(){
    const hints=[];
    const rec=(state.records||[]).slice(-8).map(r=>`${r.title||''} ${r.text||''} ${(r.tags||[]).join(' ')}`).join(' ');
    const plan=current();
    const h=new Date().getHours();
    const add=(label,reason)=>hints.push({label,reason});
    if(state.walk.active) add(state.walkMode==='camp'?'サイト調査っぽい':'コタ散歩っぽい','散歩記録中');
    if(/うんち|おしっこ|体調|コタ|犬友達/.test(rec)) add('コタ散歩っぽい','コタ記録あり');
    if(/サイト候補|木陰|水場|炊事場|景色/.test(rec)) add('サイト調査っぽい','場所メモあり');
    if(/設営|配置|足りない|使わなかった|ペグ/.test(rec)) add('設営中っぽい','設営メモあり');
    if(/撤収|乾燥|忘れ物|積込|壊れた|汚れた/.test(rec)) add('撤収中っぽい','撤収メモあり');
    if(/出発|休憩|給油|渋滞|到着|道の駅|コンビニ/.test(rec)) add('ドライブ中っぽい','移動ログあり');
    if((plan.type==='camp'||/キャンプ|赤城|サイト|泊/.test(`${plan.title||''} ${plan.place||''}`)) && !hints.length) add('キャンプ中っぽい','主役プランがキャンプ');
    if(!hints.length){
      add('現地記録中','音声・写真・場所を残す');
      add('コタ同伴かも','体調/排泄は非公開');
      add('サイト調査かも','場所カード候補を残せる');
    }
    const seen=new Set();
    return hints.filter(x=>!seen.has(x.label)&&seen.add(x.label)).slice(0,4);
  }
  function sessionShortcutGroups(){
    return [
      {id:'kota',title:'コタ',desc:'体調・排泄・危険・犬友達。非公開は混ぜない。',items:[
        {label:'うんち',help:'非公開健康メモ',do:'private',kind:'うんち',target:'非公開コタ健康メモ'},
        {label:'おしっこ',help:'非公開健康メモ',do:'private',kind:'おしっこ',target:'非公開コタ健康メモ'},
        {label:'体調',help:'暑い/寒い/疲れなど',do:'private',kind:'体調',target:'非公開コタ健康メモ'},
        {label:'危険',help:'段差・車・拾い食い注意',do:'place',kind:'危険ポイント',target:'危険ポイント'},
        {label:'犬友達',help:'会った犬・飼い主',do:'friend',kind:'犬友達',target:'犬友達メモ'}
      ]},
      {id:'site',title:'サイト調査',desc:'次回使う場所カード。キャンプ場散歩の中身。',items:[
        {label:'サイト候補',help:'次に泊まりたい場所',do:'place',kind:'サイト候補',target:'場所カード / 次回サイト候補'},
        {label:'木陰',help:'コタの休憩場所',do:'place',kind:'木陰',target:'場所カード / コタ向け候補'},
        {label:'水場',help:'洗い物・給水の距離',do:'place',kind:'水場',target:'場所カード / 設営動線'},
        {label:'トイレ',help:'位置と距離',do:'place',kind:'トイレ',target:'設備メモ'},
        {label:'炊事場',help:'使いやすさ確認',do:'place',kind:'炊事場',target:'設備メモ'},
        {label:'景色',help:'眺めが良い場所',do:'place',kind:'景色',target:'レビュー候補'},
        {label:'危険',help:'段差・ぬかるみ・車',do:'place',kind:'危険',target:'危険ポイント'}
      ]},
      {id:'setup',title:'設営',desc:'次回の配置・準備・改善へ戻す。',items:[
        {label:'設営開始',help:'開始時刻',do:'record',kind:'設営開始',target:'設営ログ'},
        {label:'配置写真',help:'次回レイアウト',do:'camera',kind:'配置写真',target:'次回レイアウト'},
        {label:'足りないギア',help:'準備/買い物へ戻す',do:'return',kind:'足りないギア',target:'ギア / 買い物 / 準備'},
        {label:'使わなかったギア',help:'次回積むか判断',do:'return',kind:'使わなかったギア',target:'ギア見直し'},
        {label:'困ったこと',help:'改善へ送る',do:'return',kind:'設営で困ったこと',target:'改善メモ'},
        {label:'次回改善',help:'次回設営へ使う',do:'return',kind:'設営改善',target:'改善メモ'},
        {label:'設営完了',help:'完了時刻',do:'record',kind:'設営完了',target:'設営ログ'}
      ]},
      {id:'withdraw',title:'撤収',desc:'帰宅後やること・ギアケアへ戻す。',items:[
        {label:'撤収開始',help:'開始時刻',do:'record',kind:'撤収開始',target:'撤収ログ'},
        {label:'乾燥',help:'幕・ロープ・マット',do:'return',kind:'乾燥',target:'帰宅後やること / ギアケア'},
        {label:'忘れ物',help:'次回チェックへ',do:'return',kind:'忘れ物',target:'忘れ物チェック'},
        {label:'ゴミ',help:'持ち帰り/処分',do:'record',kind:'ゴミ',target:'撤収ログ'},
        {label:'積込',help:'車載・BOX位置',do:'return',kind:'積込',target:'車載改善'},
        {label:'壊れた/汚れた',help:'修理・洗浄へ',do:'return',kind:'壊れた/汚れた',target:'ギアケア / 修理 / 洗浄'},
        {label:'撤収完了',help:'完了時刻',do:'record',kind:'撤収完了',target:'撤収ログ'}
      ]},
      {id:'drive',title:'ドライブ',desc:'次回の出発時間・寄り道・渋滞判断へ使う。',items:[
        {label:'出発',help:'出発時刻',do:'drive',kind:'出発',target:'移動ログ'},
        {label:'休憩',help:'SA/PA/道の駅',do:'drive',kind:'休憩',target:'休憩候補'},
        {label:'給油',help:'給油場所とタイミング',do:'drive',kind:'給油',target:'移動ログ'},
        {label:'買い物寄り道',help:'通り道の店',do:'drive',kind:'買い物寄り道',target:'買い物 / 通り道候補'},
        {label:'渋滞',help:'次回回避',do:'drive',kind:'渋滞',target:'渋滞メモ'},
        {label:'道の駅/コンビニ',help:'使える寄り道',do:'place',kind:'道の駅/コンビニ',target:'場所カード / 通り道候補'},
        {label:'到着',help:'到着時刻',do:'drive',kind:'到着',target:'移動ログ'}
      ]}
    ];
  }
  function sessionRecord(data){
    const p=state.walk.track[state.walk.track.length-1];
    const rec={
      id:uid('rec'),
      eventId:state.currentPlanId,
      kind:data.kind||'memo',
      title:data.title||data.kind||'記録',
      text:data.text||'',
      mode:'現地セッション',
      sessionGroup:data.group||'session',
      target:data.target||'現地メモ',
      flow:data.flow||[data.target||'現地メモ'],
      tags:data.tags||[],
      time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}),
      date:today(),
      lat:p?.lat||null,
      lng:p?.lng||null,
      private:!!data.private
    };
    state.records=state.records||[];
    state.records.push(rec);
    return rec;
  }
  function sessionPrompt(label,def=''){
    // FIELD REBUILD 03: 現地操作は文字入力前提にしない。ワンタップ保存して、必要なら後で整理画面で直す。
    return def || label || '記録';
  }

  function sessionPrivate(item,group){
    const text=sessionPrompt(item.kind, item.kind)||item.kind;
    state.walk.health=state.walk.health||[];
    state.walk.health.push({type:item.kind,note:text,mode:'現地セッション',time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}),private:true});
    sessionRecord({kind:'health',title:item.kind,text,group:group.title,target:item.target,private:true,tags:['非公開','コタ',item.kind]});
    save();render();toast('非公開保存');
  }
  function sessionPlace(item,group){
    const name=sessionPrompt(item.kind,item.kind);
    if(!name)return;
    const p=state.walk.track[state.walk.track.length-1];
    state.walk.spots=state.walk.spots||[];
    state.walk.spots.push({name,type:item.kind,time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}),lat:p?.lat||null,lng:p?.lng||null,mode:'現地セッション',target:item.target});
    state.places=state.places||[];
    state.places.push({id:uid('place'),name,kind:item.kind,note:`${group.title}：${item.target}`,visits:1,lat:p?.lat||null,lng:p?.lng||null});
    state.mapPins=state.mapPins||[];
    state.mapPins.push({id:uid('pin'),eventId:state.currentPlanId,name,kind:item.kind,x:Math.round(20+Math.random()*60),y:Math.round(20+Math.random()*60),public:!/(危険|体調|うんち|おしっこ)/.test(item.kind),note:item.target,score:item.kind==='木陰'?5:3});
    sessionRecord({kind:'place',title:item.kind,text:name,group:group.title,target:item.target,tags:[group.title,item.kind,'場所']});
    save();render();toast('場所カード候補');
  }
  function sessionReturn(item,group){
    const text=sessionPrompt(item.kind,item.kind);
    if(!text)return;
    sessionRecord({kind:item.kind,title:item.kind,text,group:group.title,target:item.target,tags:[group.title,item.kind,'戻し']});
    state.notes=state.notes||[];
    state.notes.push({id:uid('note'),title:`${item.kind}：${group.title}`,text:`${text}\n戻し先：${item.target}`,private:false});
    save();render();toast('戻し先へ保存');
  }
  function sessionSimpleRecord(item,group){
    const text=sessionPrompt(item.kind,item.kind)||item.kind;
    sessionRecord({kind:item.kind,title:item.kind,text,group:group.title,target:item.target,tags:[group.title,item.kind]});
    if(item.do==='drive'||/出発|到着|休憩|渋滞|給油|買い物/.test(item.kind)){
      state.notes=state.notes||[];
      state.notes.push({id:uid('note'),title:`移動ログ：${item.kind}`,text:`${text}\n戻し先：${item.target}`,private:false});
    }
    save();render();toast('記録した');
  }
  function handleSessionShortcut(ref){
    const [gi,ii]=String(ref).split(':').map(Number);
    const group=sessionShortcutGroups()[gi];
    const item=group?.items?.[ii];
    if(!group||!item)return;
    if(item.do==='private')return sessionPrivate(item,group);
    if(item.do==='place')return sessionPlace(item,group);
    if(item.do==='return')return sessionReturn(item,group);
    if(item.do==='record'||item.do==='drive')return sessionSimpleRecord(item,group);
    if(item.do==='camera')return captureCamera();
    if(item.do==='friend')return friend();
  }
  function sessionHeroHtml(){
    const plan=current();
    return `<section class="sessionHero">
      <div class="sessionHeroTop">
        <span><b>現地セッション</b><small>${esc(plan.title||'現在のプラン')}。モードを決めずに、今起きたことを残す。</small></span>
        <span class="sessionBadge">FIELD</span>
      </div>
      <div class="sessionSuggest">${sessionContextHints().map(h=>`<span>${esc(h.label)}：${esc(h.reason)}</span>`).join('')}</div>
    </section>`;
  }
  function sessionMainActionsHtml(){
    return `<section class="sessionMainGrid">
      <button class="sessionMainBtn primary" data-act="toggleVoice"><b>${voiceRecorder?'音声停止':'音声メモ'}</b><small>${voiceRecorder?'録音中。もう一度押す':'気づいたことはまず声で残す'}</small></button>
      <button class="sessionMainBtn" data-act="captureCamera"><b>カメラ</b><small>サイト・配置・ギア・料理・道を撮る</small></button>
      <button class="sessionMainBtn" data-act="gps"><b>現在地</b><small>場所だけ残す。線だけ地図は出さない</small></button>
      <button class="sessionMainBtn" data-act="openMap"><b>Google Map</b><small>正確な場所は外部地図で見る</small></button>
    </section>`;
  }
  function sessionBtnClass(item){
    if(item.do==='private')return ' privateSave';
    if(item.do==='place')return ' placeSave';
    if(item.do==='return')return ' returnSave';
    if(item.do==='drive')return ' driveSave';
    return '';
  }
  function sessionShortcutButton(groupIndex,itemIndex,item){
    return `<button class="sessionQuickBtn${sessionBtnClass(item)}" data-session-shortcut="${groupIndex}:${itemIndex}"><b>${esc(item.label)}</b><small>${esc(item.help)} → ${esc(item.target)}</small></button>`;
  }
  function sessionPriorityHtml(){
    const groups=sessionShortcutGroups();
    const picks=[
      [0,0],[0,1],[0,2],
      [1,0],[1,2],[1,6],
      [2,2],[3,1],[4,4]
    ].filter(([g,i])=>groups[g]?.items?.[i]);
    return `<section class="sessionSection">
      <div class="sessionSectionHead"><span><b>今すぐ残す</b><small>よく使うものだけ。保存先は自動で分ける。</small></span></div>
      <div class="sessionQuickGrid">${picks.map(([g,i])=>sessionShortcutButton(g,i,groups[g].items[i])).join('')}</div>
    </section>`;
  }
  function sessionGroupsHtml(){
    const groups=sessionShortcutGroups();
    return `<section class="sessionSection">
      <div class="sessionSectionHead"><span><b>用途別に残す</b><small>必要な時だけ開く。整理はあとで。</small></span></div>
      ${groups.map((g,gi)=>`<details class="sessionGroup" ${gi<2?'open':''}>
        <summary><span><b>${esc(g.title)}</b><small>${esc(g.desc)}</small></span></summary>
        <div class="sessionGroupBody"><div class="sessionQuickGrid">${g.items.map((it,ii)=>sessionShortcutButton(gi,ii,it)).join('')}</div></div>
      </details>`).join('')}
    </section>`;
  }
  function sessionRecentHtml(){
    const rec=planRecords().slice().reverse().slice(0,3);
    return `<section class="section">
      <div class="head"><div><h2>直近の記録</h2><p>現地では3件だけ。詳しい整理は整理画面へ。</p></div><button class="btn" data-act="copyFieldSummary">コピー</button></div>
      <div class="fieldRecentList">${rec.map(r=>`<div class="sessionRecentCard"><b>${esc(r.title||recordKindLabel(r.kind))}</b><small>${esc(r.time||'')} / ${esc(r.sessionGroup||r.mode||'')}<br>${esc(r.text||'')}<br>保存先：${esc(r.target||'現地メモ')}</small><div class="sessionTags">${(r.tags||[]).slice(0,4).map(t=>`<span>${esc(t)}</span>`).join('')}${r.private?'<span>非公開</span>':''}</div></div>`).join('')||`<div class="sessionRecentCard"><b>まだなし</b><small>音声・カメラ・現在地、またはショートカットで残す。</small></div>`}</div>
    </section>`;
  }


  function obMainPlanLine(){
    const plan=current();
    const title=plan?.title||'現在のプラン';
    const day=plan?.start||today();
    const kota=(state.pets||[]).some(p=>p.id==='kota'&&p.active)?'コタあり':'';
    return `${esc(title)} / ${esc(day)}${kota?' / '+kota:''}`;
  }
  function obSmartHints(){
    const hints=sessionContextHints ? sessionContextHints() : [];
    return hints.slice(0,3).map(h=>h.label);
  }
  function obActionClass(item){
    if(item.do==='private')return ' privateSave';
    if(item.do==='place')return ' placeSave';
    if(item.do==='return')return ' returnSave';
    if(item.do==='drive')return ' driveSave';
    return '';
  }
  function obButton(groupIndex,itemIndex,item){
    return `<button class="${obActionClass(item)}" data-session-shortcut="${groupIndex}:${itemIndex}"><b>${esc(item.label)}</b><small>${esc(item.target||item.help||'記録')}</small></button>`;
  }
  function obHeroHtml(){
    return `<section class="obFieldHero">
      <div class="obFieldTop">
        <span><b>OUTBASE 現地</b><small>${obMainPlanLine()}</small></span>
        <span class="obFieldStatus">${state.walk.active?'記録中':'FIELD'}</span>
      </div>
      <div class="obFieldNow"><b>今はそのまま残せばいい</b><span>分類はあと。現地では、話す・撮る・場所だけ。</span></div>
      <div class="obSmartChips">${obSmartHints().map(x=>`<span>${esc(x)}</span>`).join('')}</div>
    </section>`;
  }
  function obMainActionsHtml(){
    return `<section>
      <button class="obPrimaryTalk" data-act="toggleVoice"><b>${voiceRecorder?'止める':'話す'}</b><small>${voiceRecorder?'録音中。もう一度押すと保存':'気づいたことをそのまま残す。押して録音 / もう一度で保存。'}</small></button>
      <div class="obMainPair">
        <button data-act="captureCamera"><b>撮る</b><small>カメラ起動。設営・サイト・料理・ギア・コタを残す。</small></button>
        <button data-act="gps"><b>場所</b><small>現在地を保存。正確な確認はGoogle Map。</small></button>
      </div>
    </section>`;
  }
  function obNowShortcutsHtml(){
    const groups=sessionShortcutGroups();
    const picks=[
      [0,0],[0,1],[0,2],[0,3],
      [1,0],[1,1],[1,2]
    ].filter(([g,i])=>groups[g]?.items?.[i]);
    return `<section class="obShortcutBlock">
      <div class="obShortcutHead"><span><b>いま使いそう</b><small>保存先は裏で分ける</small></span><button class="btn" data-act="openMap">Google Map</button></div>
      <div class="obShortcutGrid">${picks.map(([g,i])=>obButton(g,i,groups[g].items[i])).join('')}</div>
    </section>`;
  }
  function obMoreShortcutsHtml(){
    const groups=sessionShortcutGroups();
    const order=[1,2,3,4,0];
    return `<section>
      ${order.map((gi,idx)=>{
        const g=groups[gi];
        if(!g)return '';
        const open=idx===0?' open':'';
        return `<details class="obMorePanel"${open}>
          <summary><span><b>${esc(g.title)}</b><small>${esc(g.desc)}</small></span></summary>
          <div class="obMoreBody"><div class="obShortcutGrid">${g.items.map((it,ii)=>obButton(gi,ii,it)).join('')}</div></div>
        </details>`;
      }).join('')}
    </section>`;
  }
  function obRecentHtml(){
    const rec=planRecords().slice().reverse().slice(0,3);
    return `<section class="obRecent">
      <div class="obRecentHead"><span><b>直近</b><small>現地では3件だけ</small></span><button class="btn" data-act="copyFieldSummary">コピー</button></div>
      <div class="obRecentList">${rec.map(r=>`<div class="obRecentCard"><b>${esc(r.title||recordKindLabel(r.kind))}</b><small>${esc(r.time||'')} / ${esc(r.text||'')}<br>${r.target?`保存先：${esc(r.target)}`:''}</small><div class="obTags">${(r.tags||[]).slice(0,3).map(t=>`<span>${esc(t)}</span>`).join('')}${r.private?'<span>非公開</span>':''}</div></div>`).join('')||`<div class="obRecentCard"><b>まだなし</b><small>話す・撮る・場所、またはショートカットで残す。</small></div>`}</div>
    </section>`;
  }


  function fw02Modes(){
    return [
      {id:'kota',label:'コタ',group:0,sub:'散歩'},
      {id:'site',label:'サイト',group:1,sub:'調査'},
      {id:'setup',label:'設営',group:2,sub:'配置'},
      {id:'withdraw',label:'撤収',group:3,sub:'帰宅後'},
      {id:'drive',label:'ドライブ',group:4,sub:'移動'}
    ];
  }
  function fw02CurrentMode(){
    const list=fw02Modes();
    return list.find(x=>x.id===(state.fieldFixedMode||'kota'))||list[0];
  }
  function fw02ModeBar(){
    const cur=fw02CurrentMode().id;
    return `<div class="fw02Modes">${fw02Modes().map(m=>`<button class="${cur===m.id?'active':''}" data-fw02-mode="${m.id}">${esc(m.label)}<br><small>${esc(m.sub)}</small></button>`).join('')}</div>`;
  }
  function fw02MapHtml(){
    const p=state.walk.track[state.walk.track.length-1];
    const has=!!p;
    const url=has?`https://maps.google.com/maps?q=${p.lat},${p.lng}&z=16&output=embed`:'';
    return `<div class="fw02Map">
      <div class="fw02MapHead"><span><b>地図を見ながら記録</b><small>${has?`${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`:'現在地未取得'}</small></span></div>
      ${has?`<iframe loading="lazy" src="${url}"></iframe>`:`<div class="fw02MapEmpty">現在地を押すと<br>ここにGoogle Mapを表示</div>`}
      <div class="fw02MapOps"><button data-act="gps">現在地更新</button><button data-act="openMap">Google Map</button></div>
    </div>`;
  }
  function fw02ActionClass(item){
    if(item.do==='private')return ' privateSave';
    if(item.do==='place')return ' placeSave';
    if(item.do==='return')return ' returnSave';
    if(item.do==='drive')return ' driveSave';
    return '';
  }
  function fw02ModeActions(){
    const mode=fw02CurrentMode();
    const group=sessionShortcutGroups()[mode.group];
    const items=(group?.items||[]).slice(0,8);
    return `<div class="fw02ModePanel">
      <div class="fw02ModePanelHead"><span><b>${esc(group?.title||mode.label)}モード</b><small>${esc(group?.desc||'必要な操作だけ表示')}</small></span></div>
      <div class="fw02Actions">${items.map((it,ii)=>`<button class="${fw02ActionClass(it)}" data-session-shortcut="${mode.group}:${ii}"><b>${esc(it.label)}</b><small>${esc(it.target||it.help||'記録')}</small></button>`).join('')}</div>
    </div>`;
  }
  function fw02HeaderHtml(){
    const plan=current();
    return `<section class="fw02Head">
      <div class="fw02Top"><span><b>OUTBASE 現地</b><small>${esc(plan.title||'現在のプラン')} / ${state.drive?.active?'ドライブ記録中':state.walk.active?'散歩記録中':'待機中'}</small></span><span class="fw02Badge">${state.fieldFixedMode||'kota'}</span></div>
      ${fw02ModeBar()}
    </section>`;
  }
  function fw02MainHtml(){
    return `<section class="fw02Main">
      <div class="fw02Ops">
        <button class="holdVoice ${voiceRecorder?'recording':''}" data-hold-voice><b>${voiceRecorder?'録音中':'話す'}</b><small>${voiceRecorder?'指を離すと保存':'長押し中だけ録音。離すと保存。'}</small></button>
        <div class="fw02SubOps">
          <button data-act="captureCamera"><b>撮る</b><small>カメラ起動</small></button>
          <button data-act="gps"><b>場所</b><small>現在地保存</small></button>
        </div>
      </div>
      ${fw02MapHtml()}
    </section>`;
  }
  function fw02DriveHtml(){
    const d=state.drive||{};
    const active=!!d.active;
    const started=d.startedAt?new Date(d.startedAt).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}):'未開始';
    const speed=Number(d.lastSpeedKmh||0).toFixed(1);
    return `<div class="fw02Drive"><b>ドライブ自動終了</b><small>${active?`開始 ${started} / ${speed}km/h / 10分停止で自動終了`:'ドライブモードで開始すると、画面起動中は自動終了判定'}</small><button data-act="toggleDrive">${active?'ドライブ終了':'ドライブ開始'}</button></div>`;
  }
  function fw02RecentHtml(){
    const rec=planRecords().slice().reverse().slice(0,2);
    return `<div class="fw02Recent"><b>直近</b><small>2件だけ表示</small>${rec.map(r=>`<div class="fw02RecentLine">${esc(r.time||'')} ${esc(r.title||recordKindLabel(r.kind))} → ${esc(r.target||'現地メモ')}</div>`).join('')||`<div class="fw02RecentLine">まだなし</div>`}</div>`;
  }
  function fw02FootHtml(){
    return `<section class="fw02Foot">${fw02DriveHtml()}${fw02RecentHtml()}</section>`;
  }
  function startHoldVoice(){
    if(voiceRecorder&&voiceRecorder.state==='recording')return;
    startLiveSpeech();
    if(!navigator.mediaDevices || !window.MediaRecorder){
      voiceLiveText='';
      const text=prompt('音声メモ（録音非対応のため文字で保存）','');
      if(text){sessionRecord({kind:'voice',title:'音声メモ',text,target:'音声メモ',tags:['音声']});autoPin('音声','音声メモ',text);save();render();toast('音声メモ保存')}
      return;
    }
    navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
      voiceChunks=[];
      voiceStartedAt=Date.now();
      voiceRecorder=new MediaRecorder(stream);
      voiceRecorder.ondataavailable=e=>{if(e.data&&e.data.size)voiceChunks.push(e.data)};
      voiceRecorder.onstop=()=>{
        stopLiveSpeech();
        const blob=new Blob(voiceChunks,{type:voiceRecorder.mimeType||'audio/webm'});
        stream.getTracks().forEach(t=>t.stop());
        const file={name:`voice_${Date.now()}.webm`,type:blob.type,size:blob.size};
        const reader=new FileReader();
        reader.onload=()=>{
          addMediaRecord('voice',file,reader.result);
          if(voiceLiveText){
            const r=state.records[state.records.length-1];
            if(r){r.text=voiceLiveText;r.transcript=voiceLiveText;r.target='音声メモ / 文字起こし';}
          }
          voiceRecorder=null;voiceChunks=[];
          save();render();toast('音声保存');
          if(fw04DriveMode())driveAutoOffLater();
          voiceLiveText='';
        };
        reader.readAsDataURL(blob);
      };
      voiceRecorder.start();
      render();
    }).catch(()=>{
      stopLiveSpeech();
      const text=voiceLiveText||prompt('音声メモ（マイク許可なし）','');
      if(text){sessionRecord({kind:'voice',title:'音声メモ',text,target:'音声メモ / 文字起こし',tags:['音声']});autoPin('音声','音声メモ',text);save();render();toast('音声メモ保存');if(fw04DriveMode())driveAutoOffLater()}
      voiceLiveText='';
    });
  }

  function stopHoldVoice(){
    stopLiveSpeech();
    if(voiceRecorder&&voiceRecorder.state==='recording')voiceRecorder.stop();
  }

  function ensureDrive(){
    state.drive={active:false,startedAt:0,endedAt:0,lastMoveAt:0,lastPointAt:0,lastSpeedKmh:0,hasMoved:false,startTrackIndex:0,autoEndMinutes:10,...(state.drive||{})};
    return state.drive;
  }
  function toggleDrive(){
    const d=ensureDrive();
    if(d.active)return finishDrive('手動終了',false);
    d.active=true;d.startedAt=Date.now();d.endedAt=0;d.lastMoveAt=Date.now();d.lastPointAt=0;d.lastSpeedKmh=0;d.hasMoved=false;d.startTrackIndex=state.walk.track.length;
    sessionRecord?sessionRecord({kind:'出発',title:'ドライブ開始',text:'ドライブ開始',group:'ドライブ',target:'移動ログ',tags:['ドライブ','出発']}):addPublicRecord('memo','ドライブ開始','ドライブ開始');
    startGpsAuto();gps(true);save();render();toast('ドライブ開始');
  }
  function finishDrive(reason='ドライブ終了',auto=true){
    const d=ensureDrive();
    if(!d.active)return;
    d.active=false;d.endedAt=Date.now();
    const mins=Math.max(0,Math.round((d.endedAt-(d.startedAt||d.endedAt))/60000));
    sessionRecord?sessionRecord({kind:'到着',title:auto?'ドライブ自動終了':'ドライブ終了',text:`${reason} / ${mins}分`,group:'ドライブ',target:'移動ログ',tags:['ドライブ',auto?'自動終了':'終了']}):addPublicRecord('memo',`${reason} / ${mins}分`,'ドライブ終了');
    if(!state.walk.active)stopGpsAuto(false);
    save();render();toast(auto?'ドライブ自動終了':'ドライブ終了');
  }
  function maybeAutoEndDrive(p,last,dist){
    const d=ensureDrive();
    if(!d.active)return;
    const now=Date.now();
    if(last&&last.ts){
      const hours=Math.max((now-last.ts)/3600000, 1/3600000);
      const sp=dist/hours;
      d.lastSpeedKmh=sp;
      if(sp>8 || dist>.08){d.lastMoveAt=now;d.hasMoved=true;}
    }else{
      d.lastMoveAt=now;
    }
    d.lastPointAt=now;
    const idleMin=(now-(d.lastMoveAt||now))/60000;
    const runMin=(now-(d.startedAt||now))/60000;
    if(d.hasMoved && runMin>=15 && idleMin>=Number(d.autoEndMinutes||10))finishDrive('10分以上停止',true);
  }


  function fw03Modes(){
    return [
      {id:'kota',label:'コタ散歩',short:'コタ'},
      {id:'campWalk',label:'場内散歩',short:'場内'},
      {id:'site',label:'サイト調査',short:'サイト'},
      {id:'setup',label:'設営',short:'設営'},
      {id:'withdraw',label:'撤収',short:'撤収'},
      {id:'drive',label:'ドライブ',short:'移動'}
    ];
  }
  function fw03CurrentMode(){
    const id=state.fieldFixedMode||'kota';
    return fw03Modes().find(m=>m.id===id)||fw03Modes()[0];
  }
  function fw03ModeBar(){
    const cur=fw03CurrentMode().id;
    return `<div class="fw03Modes">${fw03Modes().map(m=>`<button class="${cur===m.id?'active':''}" data-fw03-mode="${m.id}">${esc(m.short)}</button>`).join('')}</div>`;
  }
  function fw03RunLine(){
    const cr=state.campRun||{};
    if(cr.active)return `キャンプ実行中 ${fmtDuration((Date.now()-(cr.startedAt||Date.now()))/1000)}`;
    if(cr.endedAt)return `前回終了 ${new Date(cr.endedAt).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}`;
    return '出発から帰宅到着までを1本で残す';
  }
  function startCampRun(){
    const lab=fw04RunLabels();
    state.campRun={active:true,startedAt:Date.now(),endedAt:0,startLabel:lab.start,endLabel:''};
    sessionRecord({kind:'開始',title:`${lab.start}`,text:`${lab.start}`,group:'実行セッション',target:'実行ログ',tags:['実行','開始']});
    save();render();toast(`${lab.start}`);
  }

  function endCampRun(){
    const lab=fw04RunLabels();
    const cr=state.campRun||{};
    if(state.drive?.active)finishDrive(lab.end,false);
    if(state.walk.active){
      state.walk.active=false;
      const ws=currentWalkSession(); if(ws&&ws.active){ws.active=false;ws.endedAt=Date.now();ws.distance=walkDistance();ws.duration=walkDurationSec();}
      stopGpsAuto(false);
    }
    (state.fieldSessions||[]).filter(s=>!s.endedAt).forEach(s=>{s.status='done';s.endedAt=Date.now()});
    state.campRun={...cr,active:false,endedAt:Date.now(),endLabel:lab.end};
    sessionRecord({kind:'終了',title:`${lab.end}`,text:`${lab.end}`,group:'実行セッション',target:'実行ログ / 帰宅後処理',tags:['実行','終了']});
    save();render();toast(`${lab.end}`);
  }

  function toggleDriveStartOnly(){
    const d=ensureDrive();
    if(d.active)return;
    d.active=true;d.startedAt=Date.now();d.endedAt=0;d.lastMoveAt=Date.now();d.lastPointAt=0;d.lastSpeedKmh=0;d.hasMoved=false;d.startTrackIndex=state.walk.track.length;
    startGpsAuto();gps(true);
  }
  function fw03Session(modeId=fw03CurrentMode().id){
    state.fieldSessions=state.fieldSessions||[];
    return state.fieldSessions.find(s=>s.modeId===modeId && !s.endedAt)||null;
  }
  function fw03StartMode(){
    const m=fw03CurrentMode();
    if(fw03Session(m.id))return toast('すでに開始中');
    const s={id:uid('fs'),modeId:m.id,label:m.label,eventId:state.currentPlanId,startedAt:Date.now(),endedAt:0,pauses:[],status:'active'};
    state.fieldSessions.push(s);
    if(['kota','campWalk','site'].includes(m.id)){state.walk.active=true;ensureWalkSession();startGpsAuto();gps(true);}
    if(m.id==='drive')toggleDriveStartOnly();
    sessionRecord({kind:'開始',title:`${m.label}開始`,text:`${m.label}開始`,group:m.label,target:'実行ログ',tags:[m.label,'開始']});
    save();render();toast(`${m.label}開始`);
  }
  function fw03PauseMode(reason='休憩'){
    const s=fw03Session(); if(!s)return toast('開始してない');
    if(s.status==='paused')return;
    s.status='paused';s.pauses=s.pauses||[];s.pauses.push({start:Date.now(),end:0,reason});
    sessionRecord({kind:'休憩',title:`${s.label}休憩`,text:reason,group:s.label,target:'作業時間 / 休憩時間',tags:[s.label,'休憩']});
    save();render();toast('休憩');
  }
  function fw03ResumeMode(){
    const s=fw03Session(); if(!s)return toast('開始してない');
    const p=(s.pauses||[]).slice().reverse().find(x=>!x.end);
    if(p)p.end=Date.now();
    s.status='active';
    sessionRecord({kind:'再開',title:`${s.label}再開`,text:'再開',group:s.label,target:'作業時間 / 休憩時間',tags:[s.label,'再開']});
    save();render();toast('再開');
  }
  function fw03EndMode(){
    const s=fw03Session(); if(!s)return toast('開始してない');
    const p=(s.pauses||[]).slice().reverse().find(x=>!x.end);
    if(p)p.end=Date.now();
    s.status='done';s.endedAt=Date.now();
    if(['kota','campWalk','site'].includes(s.modeId)){
      state.walk.active=false;
      const ws=currentWalkSession(); if(ws&&ws.active){ws.active=false;ws.endedAt=Date.now();ws.distance=walkDistance();ws.duration=walkDurationSec();}
      if(!state.drive?.active)stopGpsAuto(false);
    }
    if(s.modeId==='drive' && state.drive?.active)finishDrive('モード終了',false);
    const total=fw03SessionTotal(s), rest=fw03SessionRest(s);
    sessionRecord({kind:'終了',title:`${s.label}終了`,text:`合計 ${fmtDuration(total/1000)} / 休憩 ${fmtDuration(rest/1000)}`,group:s.label,target:'実行ログ / 次回見積',tags:[s.label,'終了']});
    save();render();toast(`${s.label}終了`);
  }
  function fw03SessionTotal(s){
    if(!s)return 0; return (s.endedAt||Date.now())-(s.startedAt||Date.now());
  }
  function fw03SessionRest(s){
    return (s?.pauses||[]).reduce((a,p)=>a+((p.end||Date.now())-(p.start||Date.now())),0);
  }
  function fw03ModeOps(){
    const s=fw03Session();
    const paused=s?.status==='paused';
    return `<div class="fw03SessionOps">
      <button class="${s?'active':''}" data-act="fw03StartMode">開始</button>
      <button data-act="fw03PauseMode">${paused?'休憩中':'休憩'}</button>
      <button data-act="fw03ResumeMode">再開</button>
      <button data-act="fw03EndMode">終了</button>
    </div>`;
  }

  function fw04RunLabels(){
    const mode=fw03CurrentMode?.().id||'';
    const type=current()?.type||'camp';
    if(type==='walk' || (mode==='kota' && !state.campRun?.active))return {start:'散歩出発',end:'帰宅'};
    if(mode==='drive')return {start:'出発',end:'到着'};
    return {start:'自宅出発',end:'帰宅到着'};
  }
  function fw04DriveMode(){
    return (fw03CurrentMode?.().id||'')==='drive';
  }
  function openDrivePanel(){
    state.drivePanelOpen=true;
    save();render();
  }
  function driveAutoOffLater(){
    if(!fw04DriveMode())return;
    const sec=Math.min(10,Math.max(1,Number(state.settings?.driveAutoOffSec||3)));
    if(driveAutoOffTimer)clearTimeout(driveAutoOffTimer);
    driveAutoOffTimer=setTimeout(()=>{
      if(fw04DriveMode() && !voiceRecorder){
        state.drivePanelOpen=false;
        save();render();
      }
    }, sec*1000);
  }
  function setDriveAutoOff(){
    const cur=Number(state.settings?.driveAutoOffSec||3);
    const v=Number(prompt('ドライブ操作パネルを自動OFFにする秒数（1〜10）', String(cur)));
    if(!v)return;
    state.settings.driveAutoOffSec=Math.min(10,Math.max(1,v));
    save();render();toast(`自動OFF ${state.settings.driveAutoOffSec}秒`);
  }
  function quickPin(){
    const m=fw03CurrentMode?fw03CurrentMode():{label:'現地'};
    autoPin('ピン',`${m.label}ピン`,'ワンタップピン');
    sessionRecord({kind:'ピン',title:`${m.label}ピン`,text:'ピンを保存',group:m.label,target:'ピン / 軌跡ログ',tags:[m.label,'ピン']});
    save();render();toast('ピン保存');
  }
  function drivePin(){
    state.drivePanelOpen=true;
    autoPin('ドライブピン','ドライブピン','ドライブ中ワンタップ');
    sessionRecord({kind:'ピン',title:'ドライブピン',text:'ドライブ中ピン',group:'ドライブ',target:'移動ログ / ピン',tags:['ドライブ','ピン']});
    save();render();toast('ピン保存');
    driveAutoOffLater();
  }

  function fw03ModeItems(){
    const id=fw03CurrentMode().id;
    const item=(label,target,doType='record',kind=label)=>({label,target,doType,kind});
    const walkItems=[
      item('散歩開始','散歩ログ','start'),
      item('ピン','散歩ピン','pin'),
      item('写真','写真+ピン','camera'),
      item('動画','動画+位置','video'),
      item('休憩','休憩時間','pause'),
      item('再開','散歩ログ','resume'),
      item('散歩終了','散歩ログ','end')
    ];
    const data={
      kota:walkItems,
      campWalk:[
        item('場内散歩開始','場内散歩ログ','start'),
        item('ピン','場内ピン','pin'),
        item('写真','写真+ピン','camera'),
        item('動画','動画+位置','video'),
        item('休憩','休憩時間','pause'),
        item('再開','場内散歩ログ','resume'),
        item('場内散歩終了','場内散歩ログ','end')
      ],
      site:[
        item('サイトMAP読込','サイトMAP','siteMap'),item('ピン','サイトMAPピン','pin'),item('サイト候補','場所カード候補','place'),
        item('探索済み','サイトMAPピン','place','探索済み'),item('未確認','サイトMAPピン','place','未確認'),item('水場','設備メモ','place'),
        item('トイレ','設備メモ','place'),item('炊事場','設備メモ','place'),item('木陰','コタ向け候補','place'),item('景色','レビュー候補','place')
      ],
      setup:[
        item('受付完了','設営工程ログ','record'),item('サイト到着','設営工程ログ','record'),item('考察中','レイアウト考察時間','pause','レイアウト考察'),
        item('荷下ろし','設営工程ログ','record'),item('設営開始','設営タイマー','start'),item('休憩','休憩時間','pause'),
        item('再開','作業時間','resume'),item('設営完了','設営ログ','end'),item('配置写真','次回レイアウト','camera'),
        item('車位置','配置図ピン','place'),item('テント位置','配置図ピン','place'),item('タープ位置','配置図ピン','place'),
        item('キッチン','配置図ピン','place'),item('寝室','配置図ピン','place'),item('コタ位置','配置図ピン','place'),
        item('風向き','次回レイアウト','return'),item('日当たり','次回レイアウト','return'),item('地面','次回レイアウト','return'),
        item('ペグ/ロープ','設営改善','return'),item('足りないギア','ギア/買い物/準備','return'),item('使わなかったギア','ギア見直し','return'),
        item('困った','改善メモ','return'),item('次回レイアウト','改善メモ','return')
      ],
      withdraw:[
        item('撤収開始','撤収タイマー','start'),item('休憩','休憩時間','pause'),item('乾燥待ち','待ち時間','pause'),
        item('再開','作業時間','resume'),item('乾燥','帰宅後やること','return'),item('濡れた','ギアケア','return'),
        item('汚れた','洗浄','return'),item('壊れた','修理','return'),item('忘れ物','忘れ物チェック','return'),
        item('ゴミ','撤収ログ','record'),item('積込','車載改善','return'),item('サイト最終確認','チェックアウト前確認','record'),
        item('チェックアウト','撤収ログ','record'),item('撤収完了','撤収ログ','end')
      ],
      drive:[
        item('ピン','移動ログ / ピン','drivePin'),
        item('自動OFF秒','設定','driveSec')
      ]
    };
    return data[id]||data.kota;
  }

  function fw03ClickItem(i){
    const it=fw03ModeItems()[Number(i)]; if(!it)return;
    const m=fw03CurrentMode();
    if(it.doType==='start')return fw03StartMode();
    if(it.doType==='pause')return fw03PauseMode(it.kind||it.label);
    if(it.doType==='resume')return fw03ResumeMode();
    if(it.doType==='end')return fw03EndMode();
    if(it.doType==='camera')return captureCamera();
    if(it.doType==='video')return captureMedia('video');
    if(it.doType==='gps')return gps();
    if(it.doType==='pin')return quickPin();
    if(it.doType==='map')return openMap();
    if(it.doType==='siteMap')return loadSiteMap();
    if(it.doType==='drivePin')return drivePin();
    if(it.doType==='driveSec')return setDriveAutoOff();
    if(it.doType==='private'){
      const group={title:m.label}; const item={kind:it.kind,label:it.label,target:it.target};
      return sessionPrivate(item,group);
    }
    if(it.doType==='place'){
      const group={title:m.label}; const item={kind:it.kind,label:it.label,target:it.target};
      return sessionPlace(item,group);
    }
    if(it.doType==='return'){
      const group={title:m.label}; const item={kind:it.kind,label:it.label,target:it.target};
      return sessionReturn(item,group);
    }
    sessionRecord({kind:it.kind,title:it.label,text:it.label,group:m.label,target:it.target,tags:[m.label,it.label]});
    autoPin(it.kind,it.label,it.target);
    save();render();toast('記録した');
  }

  function fw03ActionsHtml(){
    if(fw04DriveMode()){
      const sec=Number(state.settings?.driveAutoOffSec||3);
      return `<div class="fw04ModeNote">ドライブ中の記録は上の「ピン」と「話す」だけ。操作後 ${sec}秒で自動OFF。コタ散歩に寄る時は「コタ」モードで散歩開始して、終了後に移動へ戻る。</div>`;
    }
    const items=fw03ModeItems();
    return `<div class="fw03Actions">${items.map((it,i)=>`<button class="${it.doType==='private'?'privateSave':it.doType==='place'?'placeSave':it.doType==='return'?'returnSave':it.doType==='drive'?'driveSave':''}" data-fw03-item="${i}"><b>${esc(it.label)}</b><small>${esc(it.target)}</small></button>`).join('')}</div>`;
  }

  function fw03MapHtml(){
    const mode=fw03CurrentMode().id;
    const p=state.walk.track[state.walk.track.length-1];
    const pins=planPins().slice(-18);
    if(mode==='site'||mode==='setup'){
      const has=!!state.siteMap?.image;
      const bg=has?` style="background-image:url('${state.siteMap.image}')"`:'';
      return `<div class="fw03Map">
        <div class="fw03MapHead"><span><b>${mode==='setup'?'配置図 / サイトMAP':'サイトMAP'}</b><small>${has?esc(state.siteMap.name||'読込済み'):'未読込'}</small></span></div>
        <div class="fw03SiteMap ${has?'':'noImage'}"${bg}>${has?pins.map(pin=>`<button class="fw03Pin ${pinKindClass(pin.kind)}" style="left:${pin.x||50}%;top:${pin.y||50}%;" data-act="openPin" data-id="${pin.id}">${pinShort(pin.kind)}</button>`).join(''):'サイトMAP読込で画像を表示<br>写真・音声・候補押下でピンを残す'}</div>
        <div class="fw03MapOps"><button data-act="loadSiteMap">MAP読込</button><button data-act="addPinQuick" data-kind="現在地">ピン</button><button data-act="gps">現在地</button></div>
      </div>`;
    }
    const url=p?`https://maps.google.com/maps?q=${p.lat},${p.lng}&z=16&output=embed`:'';
    return `<div class="fw03Map">
      <div class="fw03MapHead"><span><b>${mode==='drive'?'Google Map / 位置ログ':'地図 / 軌跡ログ'}</b><small>${p?`${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`:'現在地未取得'} / GPS ${state.walk.track.length}点 / ピン ${pins.length}件</small></span></div>
      ${p?`<iframe loading="lazy" src="${url}"></iframe>`:`<div class="fw03MapEmpty">現在地を押すとGoogle Mapを表示<br>軌跡とピンはログに保存</div>`}
      <div class="fw03MapOps"><button data-act="gps">現在地</button><button data-act="addPinQuick" data-kind="現在地">ピン</button><button data-act="openMap">Google Map</button></div>
    </div>`;
  }
  function fw03HeaderHtml(){
    const p=current();
    const cr=state.campRun||{};
    const lab=fw04RunLabels();
    return `<section class="fw03Head">
      <div class="fw03HeadTop"><span><b>OUTBASE 現地</b><small>${esc(p.title||'現在のプラン')} / ${fw03RunLine()}</small></span><span class="fw02Badge">${state.wake?.active?'画面ON':'FIELD'}</span></div>
      <div class="fw03RunOps">
        <button class="${cr.active?'active':''}" data-act="startCampRun">${esc(lab.start)}</button>
        <button data-act="toggleWake">${state.wake?.active?'画面ON解除':'画面ON維持'}</button>
        <button data-act="endCampRun">${esc(lab.end)}</button>
      </div>
      ${fw03ModeBar()}
    </section>`;
  }

  function fw03ControlsHtml(){
    const drive=fw04DriveMode();
    const sec=Number(state.settings?.driveAutoOffSec||3);
    if(drive && !state.drivePanelOpen){
      return `<section class="fw03Controls fw04DriveOff">
        <button class="fw04DriveOffCard" data-act="openDrivePanel"><b>ドライブ操作OFF</b><small>タップで ${sec}秒だけ表示。運転中は触らない。Google Maps併用前提。</small></button>
      </section>`;
    }
    if(drive){
      return `<section class="fw03Controls">
        <button class="fw03Voice ${voiceRecorder?'recording':''}" data-hold-voice><b>${voiceRecorder?'録音中':'話す'}</b><small>${voiceRecorder?`離すと保存${voiceLiveText?' / '+esc(voiceLiveText.slice(-28)):''}`:`長押し音声メモ。離すと保存して${sec}秒後にOFF。`}</small></button>
        <div class="fw03SubGrid">
          <button data-act="drivePin"><b>ピン</b><small>現在地を移動ログへ</small></button>
          <button data-act="setDriveAutoOff"><b>${sec}秒OFF</b><small>1〜10秒で変更</small></button>
        </div>
      </section>`;
    }
    return `<section class="fw03Controls">
      <button class="fw03Voice ${voiceRecorder?'recording':''}" data-hold-voice><b>${voiceRecorder?'録音中':'話す'}</b><small>${voiceRecorder?`離すと保存${voiceLiveText?' / '+esc(voiceLiveText.slice(-28)):''}`:'長押し中だけ録音。対応端末はリアルタイム文字起こし。'}</small></button>
      <div class="fw03SubGrid fw04SubGrid4">
        <button data-act="quickPin"><b>ピン</b><small>今の場所を残す</small></button>
        <button data-act="captureCamera"><b>写真</b><small>写真+位置+ピン</small></button>
        <button data-act="captureMedia" data-kind="video"><b>動画</b><small>動画+位置</small></button>
        <button data-act="gps"><b>場所</b><small>現在地更新</small></button>
      </div>
    </section>`;
  }

  function fw03PanelHtml(){
    const m=fw03CurrentMode(), s=fw03Session(m.id);
    const total=s?fmtDuration(fw03SessionTotal(s)/1000):'未開始';
    const rest=s?fmtDuration(fw03SessionRest(s)/1000):'0:00';
    return `<div class="fw03Panel"><div class="fw03PanelHead"><span><b>${esc(m.label)}</b><small>合計 ${total} / 休憩 ${rest}</small></span></div>${fw03ModeOps()}${fw03ActionsHtml()}</div>`;
  }
  function fw03FooterHtml(){
    const gaps=(state.visibilityLog?.gaps||[]).slice(-1)[0];
    const rec=planRecords().slice().reverse().slice(0,1)[0];
    const gpsGap=gaps?`${Math.round(((gaps.end||Date.now())-gaps.start)/60000)}分欠測候補`:'欠測なし';
    const d=state.drive||{};
    return `<section class="fw03Footer">
      <div class="fw03Card"><b>GPS/時間</b><small>時間は開始時刻から復元。画面OFFは欠測として記録。サイトMAPはサイト/設営で読込。</small><div class="fw03Line">${gpsGap}</div></div>
      <div class="fw03Card"><b>ドライブ</b><small>${d.active?`記録中 ${Number(d.lastSpeedKmh||0).toFixed(1)}km/h / 停止10分で候補`:'出発・到着・停車を移動ログへ'}</small><div class="fw03Line">${d.active?'自動終了判定中':'停止中'}</div></div>
      <div class="fw03Card"><b>直近</b><small>${rec?`${esc(rec.time||'')} ${esc(rec.title||'記録')}`:'まだなし'}</small><div class="fw03Line">${rec?esc(rec.target||rec.text||'現地メモ'):'話す/撮る/場所で残す'}</div></div>
    </section>`;
  }
  function activeRibbon03(){
    const fs=fw03Session&&fw03Session();
    const active=state.walk.active||state.drive?.active||state.campRun?.active||fs;
    if(!active||state.route==='field')return '';
    const label=fs?`${fs.label} ${fs.status==='paused'?'休憩中':'実行中'}`:(state.drive?.active?'ドライブ中':'キャンプ実行中');
    return `<div class="activeRibbon03"><span><b>${esc(label)}</b><small>OUTBASE内の画面切替では継続。GPS欠測は記録。</small></span><button data-route="field">現地へ</button></div>`;
  }
  function autoPin(kind='ピン',name='記録',note=''){
    const p=state.walk.track[state.walk.track.length-1];
    state.mapPins=state.mapPins||[];
    state.mapPins.push({id:uid('pin'),eventId:state.currentPlanId,name,kind,x:Math.round(18+Math.random()*64),y:Math.round(18+Math.random()*64),lat:p?.lat||null,lng:p?.lng||null,public:!/(うんち|おしっこ|体調|非公開)/.test(kind),note,time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}),score:3});
  }
  function loadSiteMap(){
    state.importMode='siteMap';
    fileInput.accept='image/*';
    fileInput.multiple=false;
    fileInput.removeAttribute('capture');
    fileInput.click();
  }
  async function toggleWake(){
    state.wake=state.wake||{enabled:false,active:false};
    if(wakeLockObj){
      try{await wakeLockObj.release()}catch(e){}
      wakeLockObj=null;state.wake.active=false;state.wake.enabled=false;save();render();toast('画面ON解除');return;
    }
    try{
      if(navigator.wakeLock?.request){
        wakeLockObj=await navigator.wakeLock.request('screen');
        state.wake.active=true;state.wake.enabled=true;
        wakeLockObj.addEventListener?.('release',()=>{state.wake.active=false;save();render()});
        save();render();toast('画面ON維持');
      }else{
        state.wake.active=false;state.wake.enabled=false;toast('非対応');
      }
    }catch(e){state.wake.active=false;state.wake.enabled=false;toast('Wake Lock不可')}
  }
  function startLiveSpeech(){
    voiceLiveText='';
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR)return;
    try{
      speechRecognizer=new SR();
      speechRecognizer.lang='ja-JP';
      speechRecognizer.continuous=true;
      speechRecognizer.interimResults=true;
      speechRecognizer.onresult=e=>{
        let text='';
        for(let i=0;i<e.results.length;i++)text+=e.results[i][0]?.transcript||'';
        voiceLiveText=text.trim();
        const el=document.querySelector('[data-hold-voice] small');
        if(el&&voiceLiveText)el.textContent='離すと保存 / '+voiceLiveText.slice(-28);
      };
      speechRecognizer.start();
    }catch(e){speechRecognizer=null}
  }
  function stopLiveSpeech(){
    if(speechRecognizer){try{speechRecognizer.stop()}catch(e){}}
    speechRecognizer=null;
  }
  function visibility03(){
    if(document.hidden){
      state.visibilityLog=state.visibilityLog||{hiddenAt:0,gaps:[]};
      state.visibilityLog.hiddenAt=Date.now();save();
    }else{
      const v=state.visibilityLog||{hiddenAt:0,gaps:[]};
      if(v.hiddenAt && (state.walk.active||state.drive?.active||state.campRun?.active)){
        v.gaps=v.gaps||[];
        v.gaps.push({start:v.hiddenAt,end:Date.now(),route:state.route});
        v.hiddenAt=0;
        state.visibilityLog=v;
        startGpsAuto();gps(true);
        save();render();
      }
    }
  }


  function g05Modes(){return [
    {id:'kota',label:'コタ散歩',sub:'出発→ピン/写真/動画/話す→帰宅'},
    {id:'drive',label:'ドライブ',sub:'Google Mapsはナビ。OUTBASEはピン/話すだけ'},
    {id:'campWalk',label:'場内散歩',sub:'キャンプ場内を歩きながらピン/写真/動画'},
    {id:'site',label:'サイト調査',sub:'サイトMAP、候補、設備、場所ピン'},
    {id:'setup',label:'設営',sub:'設営開始、休憩、再開、完了'},
    {id:'withdraw',label:'撤収',sub:'撤収開始、乾燥待ち、積込、完了'}
  ]}
  function g05Mode(){const id=state.fieldFixedMode||'kota';return g05Modes().find(m=>m.id===id)||g05Modes()[0]}
  function g05ActiveSession(id=g05Mode().id){return (state.fieldSessions||[]).find(s=>s.modeId===id&&!s.endedAt)||null}
  function g05AnyActive(){return (state.fieldSessions||[]).find(s=>!s.endedAt)||null}
  function g05Status(){const s=g05AnyActive(); if(s)return `${s.label} ${s.status==='paused'?'休憩中':'記録中'}`; if(state.campRun?.active)return '実行中'; return 'まだ開始していません'}
  function g05SetMode(id){state.fieldFixedMode=id;if(id==='drive')state.drivePanelOpen=false;save();render()}
  function g05Start(id){state.fieldFixedMode=id;fw03StartMode()}
  function g05Pause(){fw03PauseMode('休憩')}
  function g05Resume(){fw03ResumeMode()}
  function g05End(){fw03EndMode()}
  function g05StartLabel(){const id=g05Mode().id; if(id==='kota')return '散歩出発'; if(id==='campWalk')return '場内散歩開始'; if(id==='drive')return '出発'; if(id==='site')return '調査開始'; if(id==='setup')return '設営開始'; if(id==='withdraw')return '撤収開始'; return '開始'}
  function g05EndLabel(){const id=g05Mode().id; if(id==='kota')return '帰宅'; if(id==='campWalk')return 'サイト帰着'; if(id==='drive')return '到着'; if(id==='site')return '調査終了'; if(id==='setup')return '設営完了'; if(id==='withdraw')return '撤収完了'; return '終了'}
  function g05PrimaryText(){const id=g05Mode().id; if(id==='drive')return '運転中は操作しない。停車中に「ピン」か「話す」だけ。'; if(id==='kota'||id==='campWalk')return 'やることは、開始して、ピン/写真/動画/話す、最後に終了だけ。'; if(id==='site')return 'まずサイトMAP。気になる場所はピン。細かい整理は帰宅後。'; if(id==='setup')return '設営は時間を残す。迷ったら写真か話すで残す。'; if(id==='withdraw')return '撤収は乾燥待ち、積込、忘れそうなことを残す。'; return '必要なことだけ押す。'}
  function g05ModeCards(){const cur=g05Mode().id;return `<section class="guide05ModeCards">${g05Modes().map(m=>`<button class="guide05ModeCard ${cur===m.id?'active':''}" data-g05-mode="${m.id}"><b>${esc(m.label)}</b><small>${esc(m.sub)}</small></button>`).join('')}</section>`}
  function g05StatusCard(){const gps=state.walk.track.length;const gaps=(state.visibilityLog?.gaps||[]).length;return `<section class="guide05Status"><div class="guide05StatusTop"><span><b>今の状態：${esc(g05Status())}</b><small>画面を見て、上から順番に押せばいい。開始・記録・終了だけに整理。</small></span><span class="guide05Badge">GUIDE</span></div><div class="guide05Now"><div><strong>選択中</strong><span>${esc(g05Mode().label)}</span></div><div><strong>GPS</strong><span>${gps}点 / 欠測 ${gaps}件</span></div><div><strong>次にやること</strong><span>${esc(g05StartLabel())} → 記録 → ${esc(g05EndLabel())}</span></div></div></section>`}
  function g05Steps(){const s=g05ActiveSession();const on=!!s;const paused=s?.status==='paused';return `<section class="guide05Steps"><button class="primary" data-g05-start="${g05Mode().id}"><b>${esc(g05StartLabel())}</b><small>${on?'開始済み':'ここから始める'}</small></button><button data-act="g05Pause"><b>休憩</b><small>${paused?'休憩中':'一時停止'}</small></button><button data-act="g05Resume"><b>再開</b><small>休憩後に押す</small></button><button data-act="g05End"><b>${esc(g05EndLabel())}</b><small>これで閉じる</small></button></section>`}
  function g05RecordButtons(){const id=g05Mode().id;const sec=Number(state.settings?.driveAutoOffSec||3); if(id==='drive'&&!state.drivePanelOpen)return `<section class="guide05Record"><button class="driveOff" data-act="openDrivePanel"><b>操作OFF</b><small>押すと${sec}秒だけピン/話すを表示</small></button><button data-act="openMap"><b>Google Maps</b><small>ナビは地図アプリで使う</small></button></section>`; if(id==='drive')return `<section class="guide05Record"><button data-act="drivePin"><b>ピン</b><small>${sec}秒後にOFF</small></button><button class="voice" data-hold-voice><b>話す</b><small>長押し音声メモ/文字起こし</small></button><button data-act="setDriveAutoOff"><b>${sec}秒OFF</b><small>1〜10秒で変更</small></button><button data-act="openMap"><b>Maps</b><small>ナビ起動</small></button></section>`; if(id==='site')return `<section class="guide05Record"><button data-act="loadSiteMap"><b>MAP</b><small>サイトMAP読込</small></button><button data-act="quickPin"><b>ピン</b><small>場所を残す</small></button><button data-act="captureCamera"><b>写真</b><small>写真+位置</small></button><button class="voice" data-hold-voice><b>話す</b><small>長押し文字起こし</small></button></section>`; return `<section class="guide05Record"><button data-act="quickPin"><b>ピン</b><small>今の場所を残す</small></button><button data-act="captureCamera"><b>写真</b><small>写真+位置</small></button><button data-act="captureMedia" data-kind="video"><b>動画</b><small>動画+位置</small></button><button class="voice" data-hold-voice><b>話す</b><small>長押し文字起こし</small></button></section>`}
  function g05MapAndLog(){const p=state.walk.track[state.walk.track.length-1];const rec=planRecords().slice().reverse().slice(0,4);const map=p?`<iframe loading="lazy" src="https://maps.google.com/maps?q=${p.lat},${p.lng}&z=16&output=embed"></iframe>`:`<div class="guide05MapEmpty">現在地を押すと地図表示。<br>ピン・写真・音声はここに紐づく。</div>`;return `<section class="guide05MapRow"><div class="guide05MapBox">${map}</div><div class="guide05Log"><b>直近の記録</b><small>何を押したかだけ見ればいい。</small><div class="guide05MiniList">${rec.length?rec.map(r=>`<div>${esc(r.time||'')} ${esc(r.title||r.kind||'記録')} / ${esc(r.target||'')}</div>`).join(''):'<div>まだ記録なし</div>'}</div></div></section>`}
  function g05Work(){const s=g05ActiveSession();return `<section class="guide05Work"><div class="guide05WorkHead"><span><b>${esc(g05Mode().label)}</b><small>${esc(g05PrimaryText())}</small></span><span class="guide05WorkState ${s?'on':''}">${s?(s.status==='paused'?'休憩中':'記録中'):'未開始'}</span></div>${g05Steps()}${g05RecordButtons()}${g05MapAndLog()}</section>`}
  function field(){
    return shell(`
      <section class="fieldGuide05">
        ${g05StatusCard()}
        <section class="guide05Help"><b>使い方</b><small>① 何をしているか選ぶ → ② 開始する → ③ ピン/写真/動画/話すで残す → ④ 終了する。細かい整理はあとで。</small></section>
        ${g05ModeCards()}
        ${g05Work()}
      </section>
    `);
  }

  function publicRecords(){
    return (state.records||[]).filter(r=>!r.private);
  }
  function improveNotes(){
    const words=['改善','次回','失敗','忘れ','雨','風','乾燥','買い','積込','修理','買替'];
    return state.notes.filter(n=>!n.private && words.some(w=>`${n.title} ${n.text}`.includes(w)));
  }

  function connectScore(){
    let s=0;
    if(state.events?.length)s+=15;
    if(state.gear?.length)s+=15;
    if(state.shopping?.length)s+=10;
    if(publicRecords().length)s+=15;
    if(state.places?.length)s+=10;
    if(state.candidates?.length)s+=10;
    if(state.shares?.length)s+=5;
    if(state.weatherPlan)s+=10;
    if(state.petPrep?.length)s+=10;
    return Math.min(100,s);
  }
  function dateToIcs(s){
    if(!s)return '';
    return s.replaceAll('-','');
  }
  function escapeIcs(v){
    return String(v||'').replaceAll('\\','\\\\').replaceAll('\n','\\n').replaceAll(',','\\,').replaceAll(';','\\;');
  }
  function buildIcs(){
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//OUTBASE//OUTBASE PWA//JA'];
    state.events.filter(e=>e.start).forEach(e=>{
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${e.id}@outbase`);
      lines.push(`SUMMARY:${escapeIcs(e.title)}`);
      lines.push(`DTSTART;VALUE=DATE:${dateToIcs(e.start)}`);
      lines.push(`DTEND;VALUE=DATE:${dateToIcs(addDays(e.end||e.start,1))}`);
      if(e.place)lines.push(`LOCATION:${escapeIcs(e.place)}`);
      if(e.memo)lines.push(`DESCRIPTION:${escapeIcs(e.memo)}`);
      if(e.repeat&&e.repeat!=='none'){
        const freq={daily:'DAILY',weekly:'WEEKLY',monthly:'MONTHLY',yearly:'YEARLY'}[e.repeat];
        if(freq)lines.push(`RRULE:FREQ=${freq}`);
      }
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }
  function csvEscape(v){
    const s=String(v??'');
    return /[",\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s;
  }
  function buildGearCsv(){
    const rows=[['name','category','qty','box','home','car','status','note']];
    state.gear.forEach(g=>{
      const b=state.boxes.find(x=>x.id===g.boxId);
      rows.push([g.name,g.cat,g.qty,b?.name||'',b?.home||'',g.car||b?.car||'',gearStatus[g.status]||g.status,g.note||'']);
    });
    return rows.map(r=>r.map(csvEscape).join(',')).join('\n');
  }
  function buildShoppingCsv(){
    const rows=[['name','qty','group','source','done']];
    state.shopping.forEach(s=>rows.push([s.name,s.qty,s.group,s.source,s.done?'done':'']));
    (state.petPrep||[]).forEach(p=>rows.push([p.name,p.qty,p.group,'petPrep',p.done?'done':'']));
    return rows.map(r=>r.map(csvEscape).join(',')).join('\n');
  }
  function buildPlacesCsv(){
    const rows=[['name','kind','visits','note']];
    (state.places||[]).forEach(p=>rows.push([p.name,p.kind,p.visits||1,p.note||'']));
    return rows.map(r=>r.map(csvEscape).join(',')).join('\n');
  }
  function downloadText(filename,text,type='text/plain'){
    const blob=new Blob([text],{type});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=filename;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  function buildGoogleCalendarUrl(e=current()){
    const start=dateToIcs(e.start||today());
    const end=dateToIcs(addDays(e.end||e.start||today(),1));
    const params=new URLSearchParams({action:'TEMPLATE',text:e.title||'OUTBASE予定',dates:`${start}/${end}`,details:e.memo||'',location:e.place||''});
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }
  function buildConnectSummary(){
    return `【OUTBASE 連携まとめ】\\n予定:${state.events.length} / ギア:${state.gear.length} / 買い物:${state.shopping.length} / 記録:${publicRecords().length}\\nICS:予定をカレンダーへ渡せる\\nCSV:ギア/買い物/場所を外へ出せる\\nJSON:完全バックアップ/復元\\n共有:LINE用コピー/端末共有\\n※Google Photosやリアルタイム同期は、この静的PWA単体では直接接続しない`;
  }
  function connectPanelHtml(){
    return `<section class="section"><div class="connectHero"><div class="connectHeroTop"><span><b>外へ出せる状態にする</b><small>静的PWAで現実にできる連携をまとめる。予定・CSV・バックアップ・共有を分ける。</small></span><span class="connectScore" style="--score:${connectScore()}">${connectScore()}</span></div><div class="connectCommand"><button class="mainCmd" data-act="exportIcs">予定を書き出す</button><button class="subCmd" data-act="nativeShare">端末共有</button></div></div><div class="connectRail"><button data-connect="export"><b>ICS</b><span>予定</span></button><button data-connect="csv"><b>CSV</b><span>台帳</span></button><button data-connect="share"><b>共有</b><span>LINE</span></button><button data-connect="backup"><b>JSON</b><span>復元</span></button></div></section>`;
  }
  function connectBody(){
    const tab=state.connectTab||'export';
    if(tab==='csv')return `<section class="section"><div class="exportGrid">
      <div class="exportItem"><div class="exportTop"><span><b>ギアCSV</b><small>ギア名 / BOX / 家の保管場所 / 車載位置 / 状態。</small></span><span class="pill">${state.gear.length}</span></div><div class="exportOps"><button data-act="exportGearCsv">DL</button><button data-act="copyGearSummary">コピー</button><button data-prep="gear">開く</button></div></div>
      <div class="exportItem"><div class="exportTop"><span><b>買い物CSV</b><small>食材・コタ用品・改善から来た買い物。</small></span><span class="pill">${state.shopping.length}</span></div><div class="exportOps"><button data-act="exportShoppingCsv">DL</button><button data-act="copyShop">コピー</button><button data-prep="shopping">開く</button></div></div>
      <div class="exportItem"><div class="exportTop"><span><b>場所CSV</b><small>散歩スポット・キャンプ場・再訪候補。</small></span><span class="pill">${state.places?.length||0}</span></div><div class="exportOps"><button data-act="exportPlacesCsv">DL</button><button data-memory="places">開く</button><button data-route="discover">探す</button></div></div>
    </div></section>`;
    if(tab==='share')return `<section class="section"><div class="honestBox"><b>共有</b><p>${esc(buildConnectSummary())}</p><div class="shareOps"><button class="primary" data-act="nativeShare">端末共有</button><button data-act="copyFamilyShare">リン共有コピー</button><button data-act="copyDashboard">現在地コピー</button><button data-act="copyTripReport">レポートコピー</button></div></div></section>`;
    if(tab==='backup')return `<section class="section"><div class="honestBox"><b>バックアップ/復元</b><p>JSONはOUTBASE全体の正本バックアップ。スマホ機種変更や作業前に保存する。</p><div class="shareOps"><button class="primary" data-act="backup">JSONバックアップ</button><button data-act="import">復元/取込</button><button data-act="copyAudit">監査コピー</button><button data-act="repairData">自動補修</button></div></div></section>`;
    return `<section class="section"><div class="connectCard"><div class="connectTop"><span><b>カレンダー連携</b><small>ICSファイルで予定を書き出す。Google Calendarの追加画面も開ける。</small></span><span class="pill">${state.events.filter(e=>e.start).length}件</span></div><div class="connectBody">単体・連日・繰り返しを含む予定を書き出す。静的PWAなので自動同期ではなく、ファイル/リンク連携。</div><div class="connectOps"><button class="primary" data-act="exportIcs">ICSダウンロード</button><button data-act="openGoogleCalendar">Google追加</button></div></div><div class="versionStrip">Google Photos / Google Calendar 双方向同期 / 家族リアルタイム同期は、この静的PWAだけでは未接続。ここでは現実に動く書き出し・共有・バックアップを優先。</div></section>`;
  }

  function memoryStats(){
    const pub=planRecords();
    const places=state.places||[];
    const imp=improveNotes();
    const reviews=state.reviews||[];
    const score=Math.min(100, Math.round((pub.length*18 + places.length*12 + imp.length*18 + reviews.length*18)/2));
    return {pub:pub.length,places:places.length,imp:imp.length,reviews:reviews.length,privateHealth:state.walk.health.length,score};
  }
  function memoryNextTarget(){
    const ms=memoryStats();
    if(ms.pub===0)return ['timeline','記録を整理する','公開できる記録がまだ少ない'];
    if(ms.places===0)return ['places','場所カードを作る','再訪に使う場所がまだ少ない'];
    if(ms.imp===0)return ['improve','次回改善を残す','次に直すことを1つ作る'];
    return ['review','レビューを作る','次回に使える形まで整理済み'];
  }
  function buildTripReport(){
    const p=current();
    const pub=planRecords();
    const spots=state.walk.spots||[];
    const friends=state.walk.friends||[];
    const imp=improveNotes();
    const lines=[
      `【OUTBASE レポート】`,
      `${p.title}`,
      `${p.start?`${fmt(p.start)}〜${fmt(p.end||p.start)}`:'日付未設定'} / ${typeName[p.type]||p.type}`,
      ``,
      `■現地記録`,
      pub.length?pub.slice(-8).map(r=>`・${r.time||''} ${recordKindLabel(r.kind)}：${r.text||r.title}`).join('\n'):'公開記録なし',
      ``,
      `■場所`,
      spots.length?spots.slice(-8).map(s=>`・${s.type||'スポット'}：${s.name}`).join('\n'):'場所記録なし',
      ``,
      `■犬友達`,
      friends.length?friends.slice(-5).map(f=>`・${f.name}`).join('\n'):'犬友達なし',
      ``,
      `■次回改善`,
      imp.length?imp.slice(-5).map(n=>`・${n.title}：${n.text}`).join('\n'):'改善メモなし',
      ``,
      `※体調 / うんち / おしっこ は非公開のため含めない`
    ];
    return lines.join('\n');
  }
  function buildPlaceSummary(place){
    return `【場所カード】\\n${place.name}\\n種類:${place.kind}\\n訪問:${place.visits||1}回\\nメモ:${place.note||''}`;
  }

  function memory(){
    const ms=memoryStats();
    const next=memoryNextTarget();
    return shell(`
      <section class="memoryHero">
        <div class="memoryHeroTop">
          <span><b>${next[1]}</b><small>${next[2]}。記録は残すだけではなく、次回に使える形へ。</small></span>
          <span class="memoryScore" style="--score:${ms.score}">${ms.score}</span>
        </div>
        <div class="memoryCommand">
          <button class="mainCmd" data-memory="${next[0]}">次をやる</button>
          <button class="subCmd" data-act="copyTripReport">レポートコピー</button>
        </div>
      </section>

      <div class="memoryStats">
        <button class="${ms.pub?'good':'warn'}" data-memory="timeline"><b>${ms.pub}</b><span>公開記録</span></button>
        <button class="${ms.places?'good':'warn'}" data-memory="places"><b>${ms.places}</b><span>場所</span></button>
        <button class="${ms.imp?'good':'warn'}" data-memory="improve"><b>${ms.imp}</b><span>改善</span></button>
        <button class="good" data-memory="data"><b>${ms.privateHealth}</b><span>非公開</span></button>
      </div>

      <section class="section"><div class="tabs">${['review:レビュー','timeline:記録','places:場所','improve:改善','insight:提案','notes:メモ','family:家族','connect:連携','data:データ'].map(x=>{const [id,l]=x.split(':');return `<button class="tab ${state.memoryTab===id?'active':''}" data-memory="${id}">${l}</button>`}).join('')}</div></section>
      ${memoryBody()}
    `)
  }


  function memoryBody(){
    if(state.memoryTab==='timeline'){
      const list=planRecords().slice().reverse();
      return `<section class="section"><div class="head"><div><h2>公開記録</h2><p>体調メモは混ぜない。レビューに使える記録だけ。</p></div><button class="btn primary" data-act="addNote">メモ追加</button></div><div class="memoryTimeline">${list.map(r=>`<div class="memoryItem"><div class="memoryItemTop"><span><b>${esc(recordKindLabel(r.kind))}</b><small>${esc(r.date||'')} ${esc(r.time||'')} / ${esc(r.mode||'')}</small></span><span class="pill">${esc(r.title||recordKindLabel(r.kind))}</span></div>${r.text?`<p>${esc(r.text)}</p>`:''}${mediaPreviewHtml(r)}<div class="improveOps"><button data-act="recordToImprove" data-id="${r.id}">改善へ</button><button data-act="recordToPlace" data-id="${r.id}">場所へ</button></div></div>`).join('')||`<div class="dataPanel"><b>公開記録なし</b><p>現地画面でメモ・写真・音声・料理を押すとここに並ぶ。</p></div>`}</div></section>`;
    }

    if(state.memoryTab==='insight')return `${insightPanelHtml()}${insightBodyHtml()}`;

    if(state.memoryTab==='places'){
      return `<section class="section"><div class="head"><div><h2>場所カード</h2><p>再訪・散歩・キャンプ場レビューに使う。</p></div></div><div class="placeGrid">${(state.places||[]).map(p=>`<div class="placeCard2"><div class="placeTop2"><span><b>${esc(p.name)}</b><small>${esc(p.kind)} / 訪問${p.visits||1}回<br>${esc(p.note||'')}</small></span><span class="pill">場所</span></div><div class="placeOps2"><button data-act="copyPlace" data-id="${p.id}">コピー</button><button data-act="visitPlace" data-id="${p.id}">再訪+1</button><button data-act="placeToPlan" data-id="${p.id}">予定化</button></div></div>`).join('')||`<div class="dataPanel"><b>場所カードなし</b><p>現地画面の景色・木陰・水場・危険から作れる。</p></div>`}</div></section>`;
    }

    if(state.memoryTab==='improve'){
      const list=improveNotes();
      return `<section class="section"><div class="head"><div><h2>次回改善</h2><p>思い出で終わらせず、次回の準備に戻す。</p></div><button class="btn primary" data-act="createImprove">改善追加</button></div><div class="improveList">${list.map(n=>`<div class="improveCard"><b>${esc(n.title)}</b><small>${esc(n.text)}</small><div class="improveOps"><button data-act="improveToPrep" data-id="${n.id}">準備へ送る</button><button data-act="doneImprove" data-id="${n.id}">完了</button></div></div>`).join('')||`<div class="dataPanel"><b>改善なし</b><p>「次はこうする」を1つ残すと、次回の準備に戻せる。</p></div>`}</div></section>`;
    }

    if(state.memoryTab==='family')return `${familyPanelHtml()}${familyBody()}`;
    if(state.memoryTab==='connect')return `${connectPanelHtml()}${connectBody()}`;

    if(state.memoryTab==='notes'){
      return `<section class="section"><div class="head"><div><h2>メモ</h2><p>共有可と非公開を分ける。</p></div><button class="btn primary" data-act="addNote">メモ追加</button></div><div class="list">${state.notes.map(n=>`<div class="row"><span><strong>${esc(n.title)}</strong><small>${esc(n.text)}</small></span><span class="pill ${n.private?'private':''}">${n.private?'非公開':'共有可'}</span></div>`).join('')}</div></section>`;
    }

    if(state.memoryTab==='data'){
      return `${safeSavePanelHtml()}<section class="section">${auditPanelHtml()}</section><section class="section"><div class="migrationBox"><b>STARTPRO_MIGRATION</b><p>${esc(buildStarterPack())}</p><div class="migrationOps"><button class="primary" data-act="migrateNow">移行補修</button><button data-act="copyStarterPack">スターターコピー</button></div></div></section><section class="section"><div class="dataPanel"><b>データ管理</b><p>端末保存のデータをバックアップ・復元する。非公開体調メモはレビューや場所カードには出さない。</p><div class="versionStrip">VERSION: ${VERSION}<br>保存サイズ: ${Math.round(JSON.stringify(state).length/1024)}KB</div><div class="dataGrid"><button class="primary" data-act="backup">バックアップ</button><button data-act="import">復元/取込</button><button data-act="copyTripReport">レポートコピー</button><button data-act="cleanupData">整理</button></div></div></section>`;
    }

    return `<section class="section"><div class="reportPanel"><div class="reportHead"><span><b>自動レビュー</b><small>公開記録・場所・改善だけで作る。非公開体調メモは除外。</small></span><span class="pill dark">生成</span></div><div class="reportBody">${esc(buildTripReport())}</div><div class="memoryOps"><button class="primary" data-act="saveTripReport">保存</button><button data-act="copyTripReport">コピー</button></div></div></section>`;
  }

  function drawer(){
    if(!state.drawer)return '';
    return `<div class="drawerBack" data-act="close"></div><div class="drawer">${drawerBody()}</div>`
  }
  function drawerBody(){
    const d=state.drawer;
    if(d.type==='planSwitch')return planSwitchHtml();
    if(d.type==='event'){const e=state.events.find(x=>x.id===d.id)||{id:'',title:'',type:'normal',start:d.date||state.selectedDate,end:d.date||state.selectedDate,repeat:'none',place:'',memo:''};return `<form class="form" data-form="event" data-id="${e.id}"><div class="head"><div><h2>${e.id?'予定変更':'予定追加'}</h2><p>単体・連日・繰り返し。</p></div><button class="btn" type="button" data-act="close">閉じる</button></div><div class="field"><label>予定名</label><input name="title" value="${esc(e.title)}" required></div><div class="two"><div class="field"><label>種類</label><select name="type">${Object.entries(typeName).map(([k,v])=>`<option value="${k}" ${e.type===k?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>繰り返し</label><select name="repeat">${Object.entries(repeatName).map(([k,v])=>`<option value="${k}" ${e.repeat===k?'selected':''}>${v}</option>`).join('')}</select></div></div><div class="two"><div class="field"><label>開始日</label><input type="date" name="start" value="${esc(e.start)}"></div><div class="field"><label>終了日</label><input type="date" name="end" value="${esc(e.end)}"></div></div><div class="field"><label>場所</label><input name="place" value="${esc(e.place)}"></div><div class="field"><label>メモ</label><textarea name="memo">${esc(e.memo)}</textarea></div><div class="actions"><button class="btn primary" type="submit">保存</button>${e.id?`<button class="btn wood" type="button" data-act="setCurrentPlan" data-id="${e.id}">主役にする</button><button class="btn danger" type="button" data-act="deleteEvent" data-id="${e.id}">削除</button>`:''}</div></form>`}
    if(d.type==='gear'){const g=state.gear.find(x=>x.id===d.id)||{id:'',name:'',cat:'',qty:1,boxId:state.boxes[0]?.id||'',car:'',status:'home',note:''};return `<form class="form" data-form="gear" data-id="${g.id}"><div class="head"><div><h2>${g.id?'ギア変更':'ギア登録'}</h2></div><button class="btn" type="button" data-act="close">閉じる</button></div><div class="field"><label>ギア名</label><input name="name" value="${esc(g.name)}" required></div><div class="two"><div class="field"><label>カテゴリ</label><input name="cat" value="${esc(g.cat)}"></div><div class="field"><label>数量</label><input type="number" min="1" name="qty" value="${g.qty}"></div></div><div class="two"><div class="field"><label>ボックス</label><select name="boxId">${state.boxes.map(b=>`<option value="${b.id}" ${g.boxId===b.id?'selected':''}>${esc(b.name)}</option>`).join('')}</select></div><div class="field"><label>状態</label><select name="status">${Object.entries(gearStatus).map(([k,v])=>`<option value="${k}" ${g.status===k?'selected':''}>${v}</option>`).join('')}</select></div></div><div class="field"><label>車載位置</label><input name="car" value="${esc(g.car)}"></div><div class="field"><label>メモ</label><textarea name="note">${esc(g.note)}</textarea></div><button class="btn primary" type="submit">保存</button></form>`}
    if(d.type==='box'){const b=state.boxes.find(x=>x.id===d.id)||{id:'',name:'',home:'',car:'',role:''};return `<form class="form" data-form="box" data-id="${b.id}"><div class="head"><div><h2>${b.id?'BOX変更':'BOX追加'}</h2></div><button class="btn" type="button" data-act="close">閉じる</button></div><div class="field"><label>BOX名</label><input name="name" value="${esc(b.name)}" required></div><div class="two"><div class="field"><label>家の場所</label><input name="home" value="${esc(b.home)}"></div><div class="field"><label>車の場所</label><input name="car" value="${esc(b.car)}"></div></div><div class="field"><label>役割</label><input name="role" value="${esc(b.role)}"></div><button class="btn primary" type="submit">保存</button></form>`}
    if(d.type==='meal'){const m=state.meals.find(x=>x.id===d.id)||{id:'',name:'',slot:'',ingredients:[],gear:[],note:''};return `<form class="form" data-form="meal" data-id="${m.id}"><div class="head"><div><h2>${m.id?'料理変更':'料理追加'}</h2></div><button class="btn" type="button" data-act="close">閉じる</button></div><div class="field"><label>料理名</label><input name="name" value="${esc(m.name)}" required></div><div class="field"><label>タイミング</label><input name="slot" value="${esc(m.slot)}"></div><div class="field"><label>材料（改行）</label><textarea name="ingredients">${esc(m.ingredients.join('\n'))}</textarea></div><div class="field"><label>必要ギア（改行）</label><textarea name="gear">${esc(m.gear.join('\n'))}</textarea></div><div class="field"><label>メモ</label><textarea name="note">${esc(m.note)}</textarea></div><button class="btn primary" type="submit">保存</button></form>`}
    if(d.type==='note')return `<form class="form" data-form="note"><div class="head"><div><h2>メモ追加</h2></div><button class="btn" type="button" data-act="close">閉じる</button></div><div class="field"><label>タイトル</label><input name="title" required></div><div class="field"><label>本文</label><textarea name="text"></textarea></div><div class="field"><label><input type="checkbox" name="private" style="width:auto;margin-right:8px">非公開</label></div><button class="btn primary" type="submit">保存</button></form>`;
    return '';
  }

  function render(keepScroll=true){
    const sx=window.scrollX||0, sy=window.scrollY||0;
    try{
      app.innerHTML = state.route==='calendar'?calendar():state.route==='discover'?discover():state.route==='prep'?prep():state.route==='field'?field():state.route==='memory'?memory():home();
      bind();
      if(state.route==='field')drawMap();
      bindSwipe();
      if(keepScroll)setTimeout(()=>window.scrollTo(sx,sy),0);
    }catch(err){
      console.error(err);
      state.lastError={message:err.message||String(err),time:new Date().toISOString(),route:state.route};
      try{save()}catch(e){}
      app.innerHTML=recoveryHtml(err);
      const repair=document.getElementById('recoverRepair');
      const media=document.getElementById('recoverMedia');
      const backup=document.getElementById('recoverBackup');
      if(repair)repair.onclick=()=>{state.route='home';safeRepair()};
      if(media)media.onclick=()=>clearMediaPreviews();
      if(backup)backup.onclick=()=>exportDebugBundle();
    }
  }
  function bind(){
    document.querySelectorAll('[data-g05-mode]').forEach(el=>el.onclick=()=>g05SetMode(el.dataset.g05Mode));
    document.querySelectorAll('[data-g05-start]').forEach(el=>el.onclick=()=>g05Start(el.dataset.g05Start));
    document.querySelectorAll('[data-fw03-mode]').forEach(el=>el.onclick=()=>{state.fieldFixedMode=el.dataset.fw03Mode;if(el.dataset.fw03Mode==='drive')state.drivePanelOpen=false;save();render()});
    document.querySelectorAll('[data-fw03-item]').forEach(el=>el.onclick=()=>fw03ClickItem(el.dataset.fw03Item));
    document.querySelectorAll('[data-fw02-mode]').forEach(el=>el.onclick=()=>{state.fieldFixedMode=el.dataset.fw02Mode;save();render()});
    document.querySelectorAll('[data-hold-voice]').forEach(el=>{
      el.onpointerdown=e=>{e.preventDefault();startHoldVoice()};
      el.onpointerup=e=>{e.preventDefault();stopHoldVoice()};
      el.onpointercancel=e=>{e.preventDefault();stopHoldVoice()};
      el.onpointerleave=e=>{if(voiceRecorder&&voiceRecorder.state==='recording')stopHoldVoice()};
    });
    document.querySelectorAll('[data-session-shortcut]').forEach(el=>el.onclick=()=>handleSessionShortcut(el.dataset.sessionShortcut));
    document.querySelectorAll('[data-field-mode]').forEach(el=>el.onclick=()=>{state.fieldMode=el.dataset.fieldMode;state.walkMode=el.dataset.fieldMode==='campWalk'?'camp':'normal';save();render()});
    document.querySelectorAll('[data-field-action]').forEach(el=>el.onclick=()=>handleFieldAction(el.dataset.fieldAction));
    document.querySelectorAll('[data-route]').forEach(el=>el.onclick=()=>{state.route=el.dataset.route;save();render()});
    document.querySelectorAll('[data-stage]').forEach(el=>el.onclick=()=>{state.stage=el.dataset.stage;save();render()});
    document.querySelectorAll('[data-prep]').forEach(el=>el.onclick=()=>{state.route='prep';state.prepTab=el.dataset.prep;save();render()});
    document.querySelectorAll('[data-gear]').forEach(el=>el.onclick=()=>{state.gearTab=el.dataset.gear;save();render()});
    document.querySelectorAll('[data-walk]').forEach(el=>el.onclick=()=>{state.walkMode=el.dataset.walk;save();render()});
    document.querySelectorAll('[data-memory]').forEach(el=>el.onclick=()=>{state.route='memory';state.memoryTab=el.dataset.memory;save();render()});
    document.querySelectorAll('[data-discover]').forEach(el=>el.onclick=()=>{state.route='discover';state.discoverTab=el.dataset.discover;save();render()});
    document.querySelectorAll('[data-family]').forEach(el=>el.onclick=()=>{state.familyTab=el.dataset.family;if(state.route!=='prep'&&state.route!=='memory')state.route='prep';state.prepTab='pets';save();render()});
    document.querySelectorAll('[data-connect]').forEach(el=>el.onclick=()=>{state.connectTab=el.dataset.connect;state.route='memory';state.memoryTab='connect';save();render()});
    document.querySelectorAll('[data-meal-tab]').forEach(el=>el.onclick=()=>{state.route='prep';state.prepTab='meals';state.mealTab=el.dataset.mealTab;save();render()});
    document.querySelectorAll('[data-timer-tab]').forEach(el=>el.onclick=()=>{state.timerTab=el.dataset.timerTab;save();render()});
    document.querySelectorAll('[data-insight]').forEach(el=>el.onclick=()=>{state.insightTab=el.dataset.insight;state.route='memory';state.memoryTab='insight';save();render()});
    document.querySelectorAll('[data-day]').forEach(el=>{let last=0;el.onclick=()=>{const now=Date.now();if(now-last<320)state.drawer={type:'event',date:el.dataset.day};else{state.selectedDate=el.dataset.day;state.currentMonth=el.dataset.day.slice(0,7)}last=now;save();render()}});
    document.querySelectorAll('[data-act]').forEach(el=>el.onclick=()=>act(el.dataset.act,el));
    document.querySelectorAll('form[data-form]').forEach(f=>f.onsubmit=submit);
    const gearSearch=document.getElementById('gearSearchInput');
    if(gearSearch){
      gearSearch.oninput=()=>{
        state.gearFilter=gearSearch.value;save();
        const box=document.getElementById('gearList');
        if(box){const list=filteredGear();box.innerHTML=list.map(gearCard).join('')||`<div class="gearReport"><b>該当なし</b><p>検索条件に合うギアがない。</p></div>`;box.querySelectorAll('[data-act]').forEach(x=>x.onclick=()=>act(x.dataset.act,x));}
      }
    }
    const centerSearch=document.getElementById('centerSearchInput');
    if(centerSearch){
      centerSearch.oninput=()=>{
        state.centerQuery=centerSearch.value;save();
        const box=document.getElementById('centerResults');
        if(box){box.innerHTML=filteredCenterItems().map(centerResult).join('')||`<div class="centerResult"><span class="centerIcon">無</span><span class="centerMain"><b>該当なし</b><small>別の言葉で探す。</small></span><span class="pill">0</span></div>`;box.querySelectorAll('[data-act]').forEach(x=>x.onclick=()=>act(x.dataset.act,x));}
      }
    }
  }
  function bindSwipe(){
    const days=document.getElementById('days'); if(!days)return; let sx=null;
    days.ontouchstart=e=>sx=e.touches[0].clientX;
    days.ontouchend=e=>{if(sx==null)return;const dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>60)moveMonth(dx<0?1:-1);sx=null}
  }
  function act(a,el){
    if(a==='g05Pause')return g05Pause();
    if(a==='g05Resume')return g05Resume();
    if(a==='g05End')return g05End();
    if(a==='openDrivePanel')return openDrivePanel();
    if(a==='drivePin')return drivePin();
    if(a==='setDriveAutoOff')return setDriveAutoOff();
    if(a==='quickPin')return quickPin();
    if(a==='startCampRun')return startCampRun();
    if(a==='endCampRun')return endCampRun();
    if(a==='toggleWake')return toggleWake();
    if(a==='fw03StartMode')return fw03StartMode();
    if(a==='fw03PauseMode')return fw03PauseMode();
    if(a==='fw03ResumeMode')return fw03ResumeMode();
    if(a==='fw03EndMode')return fw03EndMode();
    if(a==='loadSiteMap')return loadSiteMap();
    if(a==='setFieldMode')return setFieldMode(el.dataset.mode);
    if(a==='fieldModeAction')return fieldModeAction(el.dataset.code);

    if(a==='saveSnapshot')return saveSnapshot();
    if(a==='restoreSnapshot')return restoreSnapshot();
    if(a==='copySafeSaveGuide')return copySafeSaveGuide();

    if(a==='safeRepair')return safeRepair();
    if(a==='copyDiagnostics')return copyDiagnostics();
    if(a==='exportDebugBundle')return exportDebugBundle();
    if(a==='clearMediaPreviews')return clearMediaPreviews();

    if(a==='applyInsight')return applyInsight(el.dataset.id);
    if(a==='saveInsight')return saveInsight(el.dataset.id);
    if(a==='dismissInsight')return dismissInsight(el.dataset.id);
    if(a==='resetInsights')return resetInsights();
    if(a==='copyInsightReport')return copyInsightReport();

    if(a==='addPinQuick')return addPinQuick(el.dataset.kind||'スポット');
    if(a==='copySiteMapReport')return copySiteMapReport();
    if(a==='togglePinPublic')return togglePinPublic(el.dataset.id);
    if(a==='pinToPlace')return pinToPlace(el.dataset.id);
    if(a==='deletePin')return deletePin(el.dataset.id);
    if(a==='openPin')return openPin(el.dataset.id);

    if(a==='copyRouteSummary')return copyRouteSummary();
    if(a==='exportGpx')return exportGpx();
    if(a==='clearTrack')return clearTrack();
    if(a==='openMap')return openMap();

    if(a==='addTimerTemplate')return addTimerTemplate(el.dataset.kind||'meal');
    if(a==='timerPrompt')return timerPrompt();
    if(a==='startTimer')return startTimer(el.dataset.id);
    if(a==='pauseTimer')return pauseTimer(el.dataset.id);
    if(a==='resetTimer')return resetTimer(el.dataset.id);
    if(a==='completeTimer')return completeTimer(el.dataset.id);
    if(a==='copyTimers')return copyTimers();

    if(a==='planSwitch')return planSwitch();
    if(a==='selectPlan')return selectPlan(el.dataset.id);
    if(a==='copyPlanContext')return copyPlanContext();

    if(a==='addMealTemplate')return addMealTemplate(el.dataset.kind||'shrimp');
    if(a==='mealToShopAll')return mealToShopAll();
    if(a==='copyMealShare')return copyMealShare();
    if(a==='editAllergy')return editAllergy();
    if(a==='quickRecordMeal')return quickRecordMeal(el.dataset.id);

    if(a==='createCampTemplate')return createCampTemplate();
    if(a==='createWalkTemplate')return createWalkTemplate();
    if(a==='createPaymentTemplate')return createPaymentTemplate();
    if(a==='starterBackup')return starterBackup();
    if(a==='freshStart')return freshStart();
    if(a==='migrateNow')return migrateNow();
    if(a==='copyStarterPack')return copyStarterPack();

    if(a==='exportIcs')return exportIcs();
    if(a==='openGoogleCalendar')return openGoogleCalendar();
    if(a==='exportGearCsv')return exportGearCsv();
    if(a==='exportShoppingCsv')return exportShoppingCsv();
    if(a==='exportPlacesCsv')return exportPlacesCsv();
    if(a==='nativeShare')return nativeShare();

    if(a==='togglePetPrep')return togglePetPrep(el.dataset.id);
    if(a==='petToPrep')return petToPrep(el.dataset.id);
    if(a==='copyFamilyShare')return copyFamilyShare();
    if(a==='saveFamilyShare')return saveFamilyShare();

    if(a==='copyWeatherReport')return copyWeatherReport();
    if(a==='weatherSource')return weatherSource();
    if(a==='addForecast')return addForecast();
    if(a==='editForecast')return editForecast(el.dataset.id);
    if(a==='setWeatherDecision')return setWeatherDecision(el.dataset.type,el.dataset.value);
    if(a==='decideWeather')return decideWeather(el.dataset.type);
    if(a==='openWeatherChecks')return openWeatherChecks();

    if(a==='captureCamera')return captureCamera();
    if(a==='toggleDrive')return toggleDrive();
    if(a==='captureMedia')return captureMedia(el.dataset.kind);
    if(a==='toggleVoice')return toggleVoice();

    if(a==='copyAudit')return copyAudit();
    if(a==='repairData')return repairData();

    if(a==='openCenterItem')return openCenterItem(el.dataset.type,el.dataset.id);
    if(a==='resolveCenterItem')return resolveCenterItem(el.dataset.type,el.dataset.id);
    if(a==='clearCenterSearch')return clearCenterSearch();
    if(a==='copyDashboard')return copyDashboard();

    if(a==='addCandidate')return addCandidate();
    if(a==='candidateToPlan')return candidateToPlan(el.dataset.id);
    if(a==='toggleCandidateWish')return toggleCandidateWish(el.dataset.id);
    if(a==='copyCandidate')return copyCandidate(el.dataset.id);
    if(a==='compareCandidates')return compareCandidates();

    if(a==='copyTripReport')return copyTripReport();
    if(a==='saveTripReport')return saveTripReport();
    if(a==='recordToImprove')return recordToImprove(el.dataset.id);
    if(a==='recordToPlace')return recordToPlace(el.dataset.id);
    if(a==='copyPlace')return copyPlace(el.dataset.id);
    if(a==='visitPlace')return visitPlace(el.dataset.id);
    if(a==='placeToPlan')return placeToPlan(el.dataset.id);
    if(a==='createImprove')return createImprove();
    if(a==='improveToPrep')return improveToPrep(el.dataset.id);
    if(a==='doneImprove')return doneImprove(el.dataset.id);
    if(a==='cleanupData')return cleanupData();

    if(a==='quickRecord')return quickRecord(el.dataset.kind);
    if(a==='spotQuick')return spotQuick(el.dataset.type);
    if(a==='copyFieldSummary')return copyFieldSummary();

    if(a==='copyGearSummary')return copyGearSummary();
    if(a==='boxCare')return boxCare(el.dataset.id);
    if(a==='boxReport')return boxReport(el.dataset.id);
    if(a==='openBoxItems')return openBoxItems(el.dataset.id);
    if(a==='setGearStatus')return setGearStatus(el.dataset.id,el.dataset.status);

    if(a==='mealToShop')return mealToShop(el.dataset.id);
    if(a==='mealGearCheck')return mealGearCheck(el.dataset.id);
    if(a==='clearDoneShop')return clearDoneShop();
    if(a==='weatherDecision')return weatherDecision(el.dataset.type);
    if(a==='resetLoaded')return resetLoaded();

    if(a==='goToday')return goToday();
    if(a==='quickAdd')return quickAdd(el.dataset.type);
    if(a==='dateUnscheduled')return dateUnscheduled(el.dataset.id);
    if(a==='setCurrentPlan')return setCurrentPlan(el.dataset.id);

    if(a==='copyPlanSummary')return copyPlanSummary();
    if(a==='markAllLoaded')return markAllLoaded();
    if(a==='autoNext')return autoNext();
    if(a==='saveReview')return saveReview();
    if(a==='copyReview')return copyReview();
    if(a==='editPlan')state.drawer={type:'event',id:state.currentPlanId};
    if(a==='openEvent')state.drawer={type:'event',id:el.dataset.id};
    if(a==='addEvent')state.drawer={type:'event',date:el.dataset.date||state.selectedDate};
    if(a==='deleteEvent'){state.events=state.events.filter(e=>e.id!==el.dataset.id);state.drawer=null;toast('予定削除')}
    if(a==='prevMonth')return moveMonth(-1);
    if(a==='nextMonth')return moveMonth(1);
    if(a==='addMeal')state.drawer={type:'meal'};
    if(a==='editMeal')state.drawer={type:'meal',id:el.dataset.id};
    if(a==='genShop')return genShop();
    if(a==='addShop')return addShop();
    if(a==='toggleShop')return toggleShop(el.dataset.id);
    if(a==='copyShop')return copyShop();
    if(a==='toggleWeather'){state.weather=state.weather.map(w=>w.id===el.dataset.id?{...w,done:!w.done}:w);toast('天気更新')}
    if(a==='addGear')state.drawer={type:'gear'};
    if(a==='editGear')state.drawer={type:'gear',id:el.dataset.id};
    if(a==='addBox')state.drawer={type:'box'};
    if(a==='editBox')state.drawer={type:'box',id:el.dataset.id};
    if(a==='toggleBox')return toggleBox(el.dataset.id);
    if(a==='import'){state.importMode=null;fileInput.accept='.json,.txt,.csv,.md,.xlsx,.xls,image/*,video/*';fileInput.multiple=true;return fileInput.click();}
    if(a==='backup')return backup();
    if(a==='addNote')state.drawer={type:'note'};
    if(a==='toggleWalk')return toggleWalk();
    if(a==='gps')return gps();
    if(a==='spot')return spot();
    if(a==='friend')return friend();
    if(a==='map')return openMap();
    if(a==='health')return health(el.dataset.type);
    if(a==='close')state.drawer=null;
    save();render();
  }
  function submit(e){
    e.preventDefault();const f=e.target,type=f.dataset.form,id=f.dataset.id,data=Object.fromEntries(new FormData(f).entries());
    if(type==='event'){const obj={id:id||uid('evt'),title:data.title,type:data.type,start:data.start,end:data.end||data.start,repeat:data.repeat,place:data.place,memo:data.memo,level:1};state.events=id?state.events.map(x=>x.id===id?obj:x):[...state.events,obj];if(obj.type==='camp'||!state.currentPlanId)state.currentPlanId=obj.id;if(obj.start){state.selectedDate=obj.start;state.currentMonth=obj.start.slice(0,7)}state.drawer=null;toast('予定保存')}
    if(type==='gear'){const obj={id:id||uid('gear'),name:data.name,cat:data.cat,qty:+data.qty||1,boxId:data.boxId,car:data.car,status:data.status,note:data.note};state.gear=id?state.gear.map(x=>x.id===id?obj:x):[...state.gear,obj];state.drawer=null;toast('ギア保存')}
    if(type==='box'){const obj={id:id||uid('box'),name:data.name,home:data.home,car:data.car,role:data.role};state.boxes=id?state.boxes.map(x=>x.id===id?obj:x):[...state.boxes,obj];state.drawer=null;toast('BOX保存')}
    if(type==='meal'){const obj={id:id||uid('meal'),name:data.name,slot:data.slot,ingredients:data.ingredients.split('\n').map(x=>x.trim()).filter(Boolean),gear:data.gear.split('\n').map(x=>x.trim()).filter(Boolean),note:data.note};state.meals=id?state.meals.map(x=>x.id===id?obj:x):[...state.meals,obj];state.drawer=null;toast('料理保存')}
    if(type==='note'){state.notes.push({id:uid('note'),title:data.title,text:data.text,private:data.private==='on'});state.drawer=null;toast('メモ保存')}
    save();render();
  }
  function moveMonth(delta){const [y,m]=state.currentMonth.split('-').map(Number);const d=new Date(y,m-1+delta,1);state.currentMonth=`${d.getFullYear()}-${pad(d.getMonth()+1)}`;state.selectedDate=iso(d);save();render()}
  function genShop(){const ex=new Set(state.shopping.map(s=>s.name));state.meals.forEach(m=>m.ingredients.forEach(i=>{if(!ex.has(i)){state.shopping.push({id:uid('shop'),name:i,qty:'要確認',group:'食材',source:m.name,done:false});ex.add(i)}}));save();render();toast('買い物反映')}
  function addShop(){const name=prompt('買い物名');if(!name)return;state.shopping.push({id:uid('shop'),name,qty:prompt('数量','1')||'1',group:'手入力',source:'手入力',done:false});save();render()}
  function toggleShop(id){state.shopping=state.shopping.map(s=>s.id===id?{...s,done:!s.done}:s);save();render()}
  async function copyShop(){
    const groups=groupedShopping();
    const text=Object.entries(groups).map(([g,items])=>`■${g}\n${items.map(s=>`${s.done?'☑':'□'} ${s.name}：${s.qty}`).join('\n')}`).join('\n\n');
    try{await navigator.clipboard.writeText(text);toast('買い物コピー')}catch(e){prompt('コピー',text)}
  }
  function toggleBox(id){const gs=state.gear.filter(g=>g.boxId===id),all=gs.length&&gs.every(g=>g.status==='loaded');state.gear=state.gear.map(g=>g.boxId===id?{...g,status:all?'home':'loaded'}:g);save();render()}


  function addPinQuick(kind){
    const name=prompt(`${kind}名`,kind)||kind;
    const note=prompt('メモ','')||'';
    const p=state.walk.track[state.walk.track.length-1];
    state.mapPins=state.mapPins||[];
    state.mapPins.push({id:uid('pin'),eventId:state.currentPlanId,name,kind,x:Math.round(18+Math.random()*64),y:Math.round(18+Math.random()*64),lat:p?.lat||null,lng:p?.lng||null,public:!/(危険|注意|非公開|体調|うんち|おしっこ)/.test(kind),note,score:kind==='木陰'?5:kind==='危険'?1:3});
    if(p)state.walk.spots.push({name,type:kind,time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}),lat:p.lat,lng:p.lng,mode:fieldModeName()});
    save();render();toast('ピン追加');
  }
  async function copySiteMapReport(){
    const text=buildSiteMapReport();
    try{await navigator.clipboard.writeText(text);toast('MAPコピー')}catch(e){prompt('コピー',text)}
  }
  function togglePinPublic(id){
    state.mapPins=state.mapPins.map(p=>p.id===id?{...p,public:!p.public}:p);
    save();render();toast('公開設定変更');
  }
  function pinToPlace(id){
    const p=(state.mapPins||[]).find(x=>x.id===id); if(!p)return;
    state.places.push({id:uid('place'),name:p.name,kind:p.kind,note:p.note||'',visits:1});
    save();render();toast('場所カード追加');
  }
  function deletePin(id){
    state.mapPins=(state.mapPins||[]).filter(p=>p.id!==id);
    save();render();toast('ピン削除');
  }
  function openPin(id){
    const p=(state.mapPins||[]).find(x=>x.id===id); if(!p)return;
    const text=`${p.name}\\n${p.kind}\\n${p.note||''}`;
    alert(text);
  }

  async function copyRouteSummary(){
    const text=buildRouteSummary();
    try{await navigator.clipboard.writeText(text);toast('ルートコピー')}catch(e){prompt('コピー',text)}
  }
  function exportGpx(){
    downloadText(`outbase_route_${today()}.gpx`,buildGpx(),'application/gpx+xml');
    toast('GPX書き出し');
  }
  function clearTrack(){
    if(!confirm('GPS履歴をクリアする？'))return;
    state.walk.track=[];
    state.walk.sessions=[];
    state.walk.active=false;
    stopGpsAuto(false);
    save();render();toast('GPSクリア');
  }

  function toggleWalk(){
    state.walk.active=!state.walk.active;
    if(state.walk.active){
      ensureWalkSession();
      addPublicRecord('memo',`${fieldModeName()}開始`,'散歩開始');
      startGpsAuto();
      gps(true);
      toast('散歩開始');
    }else{
      const s=currentWalkSession();
      if(s){s.active=false;s.endedAt=Date.now();s.distance=walkDistance();s.duration=walkDurationSec();}
      stopGpsAuto(false);
      addPublicRecord('memo',`散歩終了：${walkDistance().toFixed(2)}km / ${fmtDuration(walkDurationSec())}`,'散歩終了');
      toast('散歩終了');
    }
    save();render()
  }
  function gps(silent=false){
    const push=(lat,lng,source='gps')=>{
      const ok=pushGpsPoint(lat,lng,source);
      if(ok && !silent){addPublicRecord('site','現在地を記録','現在地');autoPin('現在地','現在地','GPS手動保存');}
      save();
      if(!silent){render();toast(ok?'現在地記録':'GPSジャンプ除外')}
      return ok;
    };
    if(!navigator.geolocation)return push(35.867+Math.random()/1000,139.975+Math.random()/1000,'demo');
    navigator.geolocation.getCurrentPosition(p=>push(p.coords.latitude,p.coords.longitude,'manual'),()=>push(35.867+Math.random()/1000,139.975+Math.random()/1000,'demo'),{enableHighAccuracy:true,timeout:6000,maximumAge:5000})
  }

  function spot(){const name=prompt('スポット名');if(!name)return;state.walk.spots.push({name,time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})});save();render()}
  function friend(){const name=prompt('犬友達名');if(!name)return;state.walk.friends.push({name,time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}),mode:fieldModeName()});addPublicRecord('memo',`犬友達：${name}`,'犬友達');save();render();toast('犬友達保存')}
  function health(type){state.walk.health.push({type,mode:state.walkMode==='camp'?'キャンプ場散歩':'通常散歩',time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})});save();render();toast('非公開保存')}
  function openMap(){
    const p=state.walk.track[state.walk.track.length-1];
    if(!p)return toast('現在地なし');
    const url=`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
    window.open(url,'_blank');
  }
  function drawMap(){const c=document.getElementById('walkMap');if(!c)return;const ctx=c.getContext('2d'),w=c.width,h=c.height;ctx.clearRect(0,0,w,h);ctx.strokeStyle='rgba(17,19,15,.08)';for(let x=0;x<w;x+=34){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}for(let y=0;y<h;y+=34){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}const pts=state.walk.track;if(!pts.length)return;const lats=pts.map(p=>p.lat),lngs=pts.map(p=>p.lng),minLa=Math.min(...lats),maxLa=Math.max(...lats),minLn=Math.min(...lngs),maxLn=Math.max(...lngs);const mp=p=>({x:28+(w-56)*((p.lng-minLn)/((maxLn-minLn)||.001)),y:h-28-(h-56)*((p.lat-minLa)/((maxLa-minLa)||.001))});ctx.strokeStyle='#273a30';ctx.lineWidth=4;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();pts.forEach((p,i)=>{const m=mp(p);i?ctx.lineTo(m.x,m.y):ctx.moveTo(m.x,m.y)});ctx.stroke();pts.forEach((p,i)=>{const m=mp(p);ctx.fillStyle=i===pts.length-1?'#b99a66':'#3f5e4c';ctx.beginPath();ctx.arc(m.x,m.y,5,0,Math.PI*2);ctx.fill()})}









  function drawQuickMap(){
    const c=document.getElementById('quickWalkMap');
    if(!c)return;
    const ctx=c.getContext('2d'),w=c.width,h=c.height;
    ctx.clearRect(0,0,w,h);
    ctx.strokeStyle='rgba(17,19,15,.08)';
    for(let x=0;x<w;x+=34){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}
    for(let y=0;y<h;y+=34){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
    const pts=state.walk.track||[];
    if(!pts.length){
      ctx.fillStyle='rgba(17,19,15,.55)';
      ctx.font='700 24px sans-serif';
      ctx.fillText('現在地を押すとここにルート表示',28,64);
      return;
    }
    const lats=pts.map(p=>p.lat),lngs=pts.map(p=>p.lng),minLa=Math.min(...lats),maxLa=Math.max(...lats),minLn=Math.min(...lngs),maxLn=Math.max(...lngs);
    const mp=p=>({x:28+(w-56)*((p.lng-minLn)/((maxLn-minLn)||.001)),y:h-28-(h-56)*((p.lat-minLa)/((maxLa-minLa)||.001))});
    ctx.strokeStyle='#273a30';ctx.lineWidth=7;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
    pts.forEach((p,i)=>{const m=mp(p);i?ctx.lineTo(m.x,m.y):ctx.moveTo(m.x,m.y)});
    ctx.stroke();
    pts.forEach((p,i)=>{const m=mp(p);ctx.fillStyle=i===pts.length-1?'#b99a66':'#3f5e4c';ctx.beginPath();ctx.arc(m.x,m.y,i===pts.length-1?9:5,0,Math.PI*2);ctx.fill()});
  }

  async function copyAudit(){
    const text=buildAuditText();
    try{await navigator.clipboard.writeText(text);toast('監査をコピー')}catch(e){prompt('コピー',text)}
  }
  function repairData(){
    state.events=state.events||[];
    state.shopping=state.shopping||[];
    state.gear=state.gear||[];
    state.boxes=state.boxes||[];
    state.notes=state.notes||[];
    state.records=state.records||[];
    state.places=state.places||[];
    state.candidates=state.candidates||[];
    state.weather=state.weather||[];
    state.meals=state.meals||[];
    if(!state.boxes.length)state.boxes.push({id:uid('box'),name:'未分類BOX',home:'未設定',car:'未設定',role:'未分類'});
    const fallbackBox=state.boxes[0]?.id||'';
    state.gear=state.gear.map(g=>({...g,boxId:g.boxId||fallbackBox,status:g.status||'home',qty:g.qty||1}));
    state.events=state.events.map(e=>({...e,end:e.end||e.start||''}));
    if(!state.events.some(e=>e.id===state.currentPlanId) && state.events.length)state.currentPlanId=state.events[0].id;
    state.records=state.records.map(r=>/うんち|おしっこ|排泄|体調/.test(`${r.title||''} ${r.text||''}`)?{...r,private:true}:r);
    save();render();toast('自動補修完了');
  }

  function openCenterItem(type,id){
    if(type==='event'){state.drawer={type:'event',id};}
    else if(type==='gear'){state.route='prep';state.prepTab='gear';state.gearTab='list';state.gearFilter=state.gear.find(g=>g.id===id)?.name||'';}
    else if(type==='box'){state.route='prep';state.prepTab='gear';state.gearTab='boxes';}
    else if(type==='shopping'){state.route='prep';state.prepTab='shopping';}
    else if(type==='meal'){state.route='prep';state.prepTab='meals';}
    else if(type==='place'){state.route='memory';state.memoryTab='places';}
    else if(type==='candidate'){state.route='discover';state.discoverTab='wish';}
    else if(type==='note'){state.route='memory';state.memoryTab='notes';}
    else if(type==='record'){state.route='memory';state.memoryTab='timeline';}
    else if(type==='weather'){state.route='prep';state.prepTab='weather';}
    else if(type==='pet'||type==='petPrep'){state.route='prep';state.prepTab='pets';}
    else if(type==='timer'){state.route='prep';state.prepTab='timer';state.timerTab='active';}
    else if(type==='route'){state.route='field';}
    else if(type==='pin'){state.route='field';}
    else if(type==='insight'){state.route='memory';state.memoryTab='insight';state.insightTab='all';}
    save();render();
  }
  function resolveCenterItem(type,id){
    if(type==='event')state.events=state.events.map(e=>e.id===id?{...e,start:state.selectedDate||today(),end:state.selectedDate||today()}:e);
    if(type==='shopping')state.shopping=state.shopping.map(s=>s.id===id?{...s,done:true}:s);
    if(type==='gear')state.gear=state.gear.map(g=>g.id===id?{...g,status:'loaded'}:g);
    if(type==='weather')state.weather=state.weather.map(w=>w.id===id?{...w,done:true}:w);
    if(type==='candidate')return candidateToPlan(id);
    if(type==='petPrep')state.petPrep=state.petPrep.map(x=>x.id===id?{...x,done:true}:x);
    if(type==='timer')completeTimer(id);
    save();render();toast('処理した');
  }
  function clearCenterSearch(){
    state.centerQuery='';
    save();render();
  }
  async function copyDashboard(){
    const text=buildDashboardText();
    try{await navigator.clipboard.writeText(text);toast('現在地コピー')}catch(e){prompt('コピー',text)}
  }

  function addCandidate(){
    const name=prompt('候補名'); if(!name)return;
    const kind=confirm('キャンプ候補？ OK=キャンプ / キャンセル=散歩')?'camp':'walk';
    const area=prompt('場所/エリア','')||'';
    const drive=prompt('移動時間','')||'';
    const flags=(prompt('条件タグ（/区切り）','犬可/温水/景色')||'').split('/').map(x=>x.trim()).filter(Boolean);
    const memo=prompt('メモ','')||'';
    state.candidates=state.candidates||[];
    state.candidates.push({id:uid('cand'),name,kind,area,drive,price:'要確認',flags,memo,wish:true});
    state.discoverTab=kind;
    save();render();toast('候補追加');
  }
  function candidateToPlan(id){
    const c=(state.candidates||[]).find(x=>x.id===id) || bestCandidate();
    if(!c)return toast('候補なし');
    const date=state.selectedDate||today();
    const ev={id:uid('evt'),title:c.name,type:c.kind==='camp'?'camp':'walk',start:date,end:c.kind==='camp'?addDays(date,1):date,repeat:'none',place:c.area,memo:`候補から追加：${c.memo} / 条件:${(c.flags||[]).join('・')}`,level:c.kind==='camp'?4:1};
    state.events.push(ev);
    state.currentPlanId=ev.id;
    state.route='calendar';
    state.currentMonth=date.slice(0,7);
    state.selectedDate=date;
    save();render();toast('予定へ追加');
  }
  function toggleCandidateWish(id){
    state.candidates=(state.candidates||[]).map(c=>c.id===id?{...c,wish:!c.wish}:c);
    save();render();toast('保存状態を変更');
  }
  async function copyCandidate(id){
    const c=(state.candidates||[]).find(x=>x.id===id); if(!c)return;
    const text=buildCandidateText(c);
    try{await navigator.clipboard.writeText(text);toast('候補コピー')}catch(e){prompt('コピー',text)}
  }
  async function compareCandidates(){
    const text=buildCompareText();
    try{await navigator.clipboard.writeText(text);toast('比較をコピー')}catch(e){prompt('コピー',text)}
  }

  async function copyTripReport(){
    const text=buildTripReport();
    try{await navigator.clipboard.writeText(text);toast('レポートをコピー')}catch(e){prompt('コピー',text)}
  }
  function saveTripReport(){
    const text=buildTripReport();
    state.reviews=state.reviews||[];
    state.reviews.push({id:uid('rv'),eventId:state.currentPlanId,title:'OUTBASEレポート',text});
    state.notes.push({id:uid('note'),title:'OUTBASEレポート',text,private:false});
    save();render();toast('レポート保存');
  }
  function recordToImprove(id){
    const r=(state.records||[]).find(x=>x.id===id); if(!r)return;
    state.notes.push({id:uid('note'),title:'次回改善',text:`${recordKindLabel(r.kind)}から改善：${r.text||r.title}`,private:false});
    save();render();toast('改善へ追加');
  }
  function recordToPlace(id){
    const r=(state.records||[]).find(x=>x.id===id); if(!r)return;
    const name=prompt('場所名', r.title||r.text||'場所');
    if(!name)return;
    state.places.push({id:uid('place'),name,kind:r.mode||'記録から追加',note:r.text||r.title||'',visits:1});
    save();render();toast('場所カード追加');
  }
  async function copyPlace(id){
    const p=(state.places||[]).find(x=>x.id===id); if(!p)return;
    const text=buildPlaceSummary(p);
    try{await navigator.clipboard.writeText(text);toast('場所コピー')}catch(e){prompt('コピー',text)}
  }
  function visitPlace(id){
    state.places=(state.places||[]).map(p=>p.id===id?{...p,visits:(p.visits||1)+1}:p);
    save();render();toast('再訪+1');
  }
  function placeToPlan(id){
    const p=(state.places||[]).find(x=>x.id===id); if(!p)return;
    const ev={id:uid('evt'),title:`${p.name}へ行く`,type:p.kind?.includes('散歩')?'walk':'normal',start:state.selectedDate||today(),end:state.selectedDate||today(),repeat:'none',place:p.name,memo:p.note||'',level:1};
    state.events.push(ev);
    state.currentPlanId=ev.id;
    state.route='calendar';
    state.selectedDate=ev.start;
    state.currentMonth=ev.start.slice(0,7);
    save();render();toast('予定へ追加');
  }
  function createImprove(){
    const text=prompt('次回改善', '次回は');
    if(!text)return;
    state.notes.push({id:uid('note'),title:'次回改善',text,private:false});
    save();render();toast('改善追加');
  }
  function improveToPrep(id){
    const n=state.notes.find(x=>x.id===id); if(!n)return;
    state.shopping.push({id:uid('shop'),name:n.text.slice(0,24),qty:'要確認',group:'改善',source:'次回改善',done:false});
    state.route='prep';state.prepTab='shopping';
    save();render();toast('準備へ送った');
  }
  function doneImprove(id){
    state.notes=state.notes.map(n=>n.id===id?{...n,title:`✓ ${n.title}`}:n);
    save();render();toast('改善完了');
  }
  function cleanupData(){
    const before=(state.records||[]).length;
    state.records=(state.records||[]).filter(r=>r.text||r.title||r.kind).map(r=>/うんち|おしっこ|排泄|体調/.test(`${r.title||''} ${r.text||''}`)?{...r,private:true}:r);
    const after=state.records.length;
    repairData();
    toast(`整理 ${before-after}件`);
  }


  function captureCamera(){
    state.importMode='media:photo';
    fileInput.accept='image/*';
    fileInput.multiple=false;
    fileInput.setAttribute('capture','environment');
    fileInput.click();
  }
  function captureMedia(kind){
    state.importMode=`media:${kind}`;
    fileInput.accept=kind==='video'?'video/*':'image/*';
    fileInput.multiple=true;
    fileInput.removeAttribute('capture');
    fileInput.click();
  }
  async function toggleVoice(){
    if(voiceRecorder && voiceRecorder.state==='recording'){
      voiceRecorder.stop();
      return;
    }
    if(!navigator.mediaDevices || !window.MediaRecorder){
      const text=prompt('音声メモ（録音非対応のため文字で保存）','');
      if(text){addPublicRecord('voice',text,'音声メモ');save();render();toast('音声メモ保存')}
      return;
    }
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      voiceChunks=[];
      voiceStartedAt=Date.now();
      voiceRecorder=new MediaRecorder(stream);
      voiceRecorder.ondataavailable=e=>{if(e.data&&e.data.size)voiceChunks.push(e.data)};
      voiceRecorder.onstop=()=>{
        const blob=new Blob(voiceChunks,{type:voiceRecorder.mimeType||'audio/webm'});
        stream.getTracks().forEach(t=>t.stop());
        const file={name:`voice_${Date.now()}.webm`,type:blob.type,size:blob.size};
        const reader=new FileReader();
        reader.onload=()=>{
          addMediaRecord('voice',file,reader.result);
          voiceRecorder=null;voiceChunks=[];
          save();render();toast('音声保存');
        };
        reader.readAsDataURL(blob);
      };
      voiceRecorder.start();
      render();
      toast('録音開始');
    }catch(e){
      const text=prompt('音声メモ（マイク許可なし）','');
      if(text){addPublicRecord('voice',text,'音声メモ');save();render();toast('音声メモ保存')}
    }
  }

  function quickRecord(kind){
    const label=recordKindLabel(kind);
    let text='';
    if(kind==='memo'||kind==='voice'||kind==='meal') text=prompt(`${label}を一言`, '')||'';
    if(kind==='photo') text=prompt('写真メモ', '写真を撮った')||'写真を撮った';
    addPublicRecord(kind,text,label);
    save();render();toast(`${label}記録`);
  }
  function spotQuick(type){
    const name=prompt(`${type||'スポット'}名`, type||'スポット');
    if(!name)return;
    const p=state.walk.track[state.walk.track.length-1];
    const item={name,type:type||'スポット',time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}),lat:p?.lat||null,lng:p?.lng||null,mode:fieldModeName()};
    state.walk.spots.push(item);
    state.places.push({id:uid('place'),name,kind:item.mode,note:`${type||'スポット'}として記録`,visits:1});
    state.mapPins=state.mapPins||[];
    state.mapPins.push({id:uid('pin'),eventId:state.currentPlanId,name,kind:type||'スポット',x:Math.round(20+Math.random()*60),y:Math.round(20+Math.random()*60),public:!/(危険|注意|体調|うんち|おしっこ)/.test(type||''),note:`${fieldModeName()}で記録`,score:type==='木陰'?5:3});
    addPublicRecord('site',`${type||'スポット'}：${name}`,name);
    save();render();toast('場所を保存');
  }
  async function copyFieldSummary(){
    const text=buildFieldSummary();
    try{await navigator.clipboard.writeText(text);toast('現地まとめをコピー')}catch(e){prompt('コピー',text)}
  }

  async function copyGearSummary(){
    const text=buildGearSummary();
    try{await navigator.clipboard.writeText(text);toast('ギアまとめをコピー')}catch(e){prompt('コピー',text)}
  }
  function boxCare(id){
    state.gear=state.gear.map(g=>g.boxId===id?{...g,status:'dry'}:g);
    save();render();toast('BOXを乾燥へ');
  }
  async function boxReport(id){
    const b=state.boxes.find(x=>x.id===id); if(!b)return;
    const x=gearBoxStats(id);
    const text=`【${b.name}】\\n家:${b.home||'未設定'} / 車:${b.car||'未設定'}\\n${x.items.map(g=>`${g.status==='loaded'?'✓':'□'} ${g.name} ×${g.qty} / ${gearStatus[g.status]}`).join('\\n')}`;
    try{await navigator.clipboard.writeText(text);toast('BOX中身コピー')}catch(e){prompt('コピー',text)}
  }
  function openBoxItems(id){
    const b=state.boxes.find(x=>x.id===id); if(!b)return;
    state.gearFilter=b.name;
    state.gearTab='list';
    save();render();
  }
  function setGearStatus(id,status){
    state.gear=state.gear.map(g=>g.id===id?{...g,status}:g);
    save();render();toast('状態更新');
  }


  function addMealTemplate(kind){
    const t=mealTemplates()[kind]||mealTemplates().shrimp;
    const exists=state.meals.some(m=>m.name===t.name);
    const obj={id:uid('meal'),...t,name:exists?`${t.name} 追加`:t.name};
    state.meals.push(obj);
    state.mealTab='plan';
    save();render();toast('料理追加');
  }
  function mealToShopAll(){
    const before=state.shopping.length;
    state.meals.forEach(m=>mealToShop(m.id,true));
    save();render();toast(`${state.shopping.length-before}件追加`);
  }
  async function copyMealShare(){
    const text=buildMealShare();
    try{await navigator.clipboard.writeText(text);toast('献立コピー')}catch(e){prompt('コピー',text)}
  }
  function editAllergy(){
    state.settings=state.settings||{};
    state.settings.allergy=prompt('アレルギー・苦手',state.settings.allergy||'貝アレルギー / 魚卵苦手')||state.settings.allergy||'';
    state.settings.servings=prompt('人数',state.settings.servings||'大人2人+コタ')||state.settings.servings||'';
    save();render();toast('設定更新');
  }
  function quickRecordMeal(id){
    const m=state.meals.find(x=>x.id===id); if(!m)return;
    addPublicRecord('meal',`${m.name}：${m.note||''}`,'料理');
    state.route='field';
    save();render();toast('現地記録へ追加');
  }

  function mealToShop(id,silent=false){
    const m=state.meals.find(x=>x.id===id); if(!m)return;
    const names=new Set(state.shopping.map(s=>s.name));
    let added=0;
    m.ingredients.forEach(i=>{
      if(!names.has(i)){
        state.shopping.push({id:uid('shop'),name:i,qty:'要確認',group:'食材',source:m.name,done:false});
        names.add(i); added++;
      }
    });
    if(!silent){save();render();toast(added?`${added}件追加`:'追加なし');}
  }
  function mealGearCheck(id){
    const m=state.meals.find(x=>x.id===id); if(!m)return;
    const miss=mealMissing(m);
    if(miss.gear.length){
      const ok=confirm(`未登録ギア候補：\\n${miss.gear.join('\\n')}\\n\\nギアに追加する？`);
      if(ok){
        const box=state.boxes.find(b=>b.role.includes('料理'))||state.boxes[0];
        miss.gear.forEach(name=>state.gear.push({id:uid('gear'),name,cat:'料理',qty:1,boxId:box?.id||'',car:box?.car||'',status:'home',note:`${m.name}で使用`}));
        save();render();toast('ギア追加');
      }
    }else{state.prepTab='gear';state.gearTab='load';save();render();toast('必要ギア確認');}
  }
  function clearDoneShop(){
    state.shopping=state.shopping.filter(s=>!s.done);
    save();render();toast('購入済みを整理');
  }





  function timerTemplateData(kind){
    return {
      meal:['料理タイマー',600,'火を入れすぎない'],
      setup:['設営ひと区切り',1800,'30分で一度休憩'],
      pet:['コタ休憩',900,'暑さ寒さの確認'],
      withdraw:['撤収ラスト確認',1200,'忘れ物確認'],
      dry:['乾燥確認',3600,'帰宅後の乾燥'],
      walk:['散歩タイマー',1200,'歩きすぎ防止'],
      free:['自由タイマー',600,'']
    }[kind]||['自由タイマー',600,''];
  }
  function addTimerTemplate(kind){
    const [name,duration,note]=timerTemplateData(kind);
    state.timers=state.timers||[];
    state.timers.push({id:uid('tm'),eventId:state.currentPlanId,name,kind,duration,remaining:duration,status:'idle',startedAt:0,note});
    state.timerTab='active';
    save();render();toast('タイマー追加');
  }
  function timerPrompt(){
    const name=prompt('タイマー名','自由タイマー')||'自由タイマー';
    const min=+(prompt('分数','10')||10);
    state.timers=state.timers||[];
    state.timers.push({id:uid('tm'),eventId:state.currentPlanId,name,kind:'free',duration:min*60,remaining:min*60,status:'idle',startedAt:0,note:''});
    state.timerTab='active';
    save();render();toast('タイマー作成');
  }
  function startTimer(id){
    let t=(state.timers||[]).find(x=>x.id===id);
    if(!t){addTimerTemplate('meal');return}
    if(t.status==='done')t.remaining=t.duration;
    t.remaining=timerLeft(t)||t.duration;
    t.status='running';
    t.startedAt=Date.now();
    save();render();toast('タイマー開始');
  }
  function pauseTimer(id){
    const t=(state.timers||[]).find(x=>x.id===id); if(!t)return;
    t.remaining=timerLeft(t);
    t.status='paused';
    t.startedAt=0;
    save();render();toast('一時停止');
  }
  function resetTimer(id){
    const t=(state.timers||[]).find(x=>x.id===id); if(!t)return;
    t.remaining=t.duration;
    t.status='idle';
    t.startedAt=0;
    save();render();toast('リセット');
  }
  function completeTimer(id){
    const t=(state.timers||[]).find(x=>x.id===id); if(!t)return;
    t.remaining=0;
    t.status='done';
    t.startedAt=0;
    addPublicRecord('memo',`タイマー完了：${t.name}`,'タイマー');
    save();render();toast('完了');
  }
  async function copyTimers(){
    const text=buildTimerText();
    try{await navigator.clipboard.writeText(text);toast('タイマーコピー')}catch(e){prompt('コピー',text)}
  }

  function createCampTemplate(){
    const title=prompt('キャンプ名','次のキャンプ')||'次のキャンプ';
    const start=prompt('開始日 YYYY-MM-DD', state.selectedDate||today())||state.selectedDate||today();
    const nights=+(prompt('何泊？','1')||1);
    const ev={id:uid('evt'),title,type:'camp',start,end:addDays(start,nights),repeat:'none',place:prompt('場所','')||'',memo:'テンプレートから作成。犬可/天気/ギア/買い物を確認。',level:4};
    state.events.push(ev);
    state.currentPlanId=ev.id;
    state.selectedDate=start;
    state.currentMonth=start.slice(0,7);
    state.stage='prep';
    state.route='prep';
    state.prepTab='overview';
    state.settings.mode='production';
    state.weather=state.weather.map(w=>({...w,done:false}));
    state.petPrep=state.petPrep.map(p=>({...p,done:false}));
    ['コタ用水・フード予備','ゴミ袋','キッチンペーパー'].forEach(name=>{
      if(!state.shopping.some(s=>s.name===name))state.shopping.push({id:uid('shop'),name,qty:'要確認',group:name.includes('コタ')?'コタ':'消耗品',source:'キャンプテンプレート',done:false});
    });
    save();render();toast('キャンプ作成');
  }
  function createWalkTemplate(){
    const title=prompt('散歩名','コタ散歩')||'コタ散歩';
    const date=prompt('日付 YYYY-MM-DD', state.selectedDate||today())||state.selectedDate||today();
    const ev={id:uid('evt'),title,type:'walk',start:date,end:date,repeat:'none',place:prompt('場所','')||'',memo:'散歩テンプレート。体調メモは非公開。',level:2};
    state.events.push(ev);
    state.currentPlanId=ev.id;
    state.selectedDate=date;state.currentMonth=date.slice(0,7);
    state.route='field';state.stage='field';state.walkMode='normal';
    save();render();toast('散歩作成');
  }
  function createPaymentTemplate(){
    const title=prompt('支払い名','カード支払い確認')||'支払い確認';
    const date=prompt('初回日 YYYY-MM-DD', state.selectedDate||today())||state.selectedDate||today();
    const ev={id:uid('evt'),title,type:'payment',start:date,end:date,repeat:'monthly',place:'',memo:'毎月確認。',level:1};
    state.events.push(ev);
    state.selectedDate=date;state.currentMonth=date.slice(0,7);
    state.route='calendar';
    save();render();toast('支払い作成');
  }
  function starterBackup(){
    backup();
    saveSnapshot();
    setTimeout(()=>copyStarterPack(),300);
  }
  function freshStart(){
    if(!confirm('サンプルを減らして本番用に切り替える？ 先にバックアップ推奨。'))return;
    const keepPets=state.pets, keepFamily=state.family, keepPetPrep=state.petPrep, keepBoxes=state.boxes, keepGear=state.gear;
    state=migrateState(seed());
    state.pets=keepPets;state.family=keepFamily;state.petPrep=keepPetPrep;state.boxes=keepBoxes;state.gear=keepGear;
    state.events=[];state.shopping=[];state.records=[];state.reviews=[];state.notes=[];state.shares=[];
    state.currentPlanId='';
    state.settings.mode='production';
    state.settings.starterDone=true;
    save();render();toast('本番データへ切替');
  }
  function migrateNow(){
    state=migrateState(state);
    repairData();
    state.settings.starterDone=true;
    save();render();toast('移行補修完了');
  }
  async function copyStarterPack(){
    const text=buildStarterPack();
    try{await navigator.clipboard.writeText(text);toast('スターターコピー')}catch(e){prompt('コピー',text)}
  }

  function exportIcs(){
    downloadText(`outbase_events_${today()}.ics`,buildIcs(),'text/calendar');
    toast('ICSを書き出した');
  }
  function openGoogleCalendar(){
    window.open(buildGoogleCalendarUrl(current()),'_blank');
  }
  function exportGearCsv(){
    downloadText(`outbase_gear_${today()}.csv`,buildGearCsv(),'text/csv');
    toast('ギアCSV');
  }
  function exportShoppingCsv(){
    downloadText(`outbase_shopping_${today()}.csv`,buildShoppingCsv(),'text/csv');
    toast('買い物CSV');
  }
  function exportPlacesCsv(){
    downloadText(`outbase_places_${today()}.csv`,buildPlacesCsv(),'text/csv');
    toast('場所CSV');
  }
  async function nativeShare(){
    const text=buildConnectSummary();
    if(navigator.share){
      try{await navigator.share({title:'OUTBASE',text});toast('共有を開いた');return;}catch(e){}
    }
    try{await navigator.clipboard.writeText(text);toast('共有文コピー')}catch(e){prompt('コピー',text)}
  }

  function togglePetPrep(id){
    state.petPrep=state.petPrep.map(x=>x.id===id?{...x,done:!x.done}:x);
    const item=state.petPrep.find(x=>x.id===id);
    if(item && item.done && item.group==='コタ'){
      if(!state.shopping.some(s=>s.name===item.name))state.shopping.push({id:uid('shop'),name:item.name,qty:item.qty,group:'コタ',source:'ペット準備',done:false});
    }
    save();render();toast('ペット準備更新');
  }
  function petToPrep(id){
    state.familyTab='pets';
    state.route='prep';
    state.prepTab='pets';
    if(id==='kota'){
      const names=new Set(state.shopping.map(s=>s.name));
      (state.petPrep||[]).filter(x=>x.petId==='kota').forEach(x=>{
        if(!names.has(x.name)){
          state.shopping.push({id:uid('shop'),name:x.name,qty:x.qty,group:'コタ',source:'ペット準備',done:false});
          names.add(x.name);
        }
      });
    }
    save();render();toast('準備へ反映');
  }
  async function copyFamilyShare(){
    const text=buildFamilyShare();
    try{await navigator.clipboard.writeText(text);toast('共有をコピー')}catch(e){prompt('コピー',text)}
  }
  function saveFamilyShare(){
    const text=buildFamilyShare();
    state.shares=state.shares||[];
    state.shares.push({id:uid('share'),time:new Date().toLocaleString('ja-JP'),text});
    state.notes.push({id:uid('note'),title:'共有メモ',text,private:false});
    save();render();toast('共有履歴保存');
  }

  async function copyWeatherReport(){
    const text=buildWeatherReport();
    try{await navigator.clipboard.writeText(text);toast('天気まとめコピー')}catch(e){prompt('コピー',text)}
  }
  function weatherSource(){
    const wp=weatherPlan();
    const source=prompt('確認した天気サービス', wp.source||'そとてんき / ウェザーニュース / tenki.jp / Yahoo / 気象庁') || wp.source || '手入力';
    wp.source=source;
    wp.updated=new Date().toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
    save();render();toast('天気ソース更新');
  }
  function addForecast(){
    const wp=weatherPlan();
    const label=prompt('場面', '設営')||'予報';
    const time=prompt('時間帯', '初日 12-16時')||'時間未定';
    const rain=+(prompt('降水確率 %', '40')||0);
    const wind=+(prompt('風速 m/s', '4')||0);
    const temp=+(prompt('気温 ℃', '24')||0);
    const humidity=+(prompt('湿度 %', '75')||0);
    const note=prompt('判断メモ', '')||'';
    wp.forecast.push({id:uid('fc'),label,time,rain,wind,temp,humidity,note});
    wp.updated=new Date().toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
    save();render();toast('予報追加');
  }
  function editForecast(id){
    const wp=weatherPlan();
    const r=wp.forecast.find(x=>x.id===id); if(!r)return;
    r.rain=+(prompt('降水確率 %', r.rain)||r.rain);
    r.wind=+(prompt('風速 m/s', r.wind)||r.wind);
    r.temp=+(prompt('気温 ℃', r.temp)||r.temp);
    r.humidity=+(prompt('湿度 %', r.humidity)||r.humidity);
    r.note=prompt('判断メモ', r.note||'')||r.note||'';
    wp.updated=new Date().toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
    save();render();toast('予報変更');
  }
  function setWeatherDecision(type,value){
    const wp=weatherPlan();
    wp.decisions[type]=value;
    state.notes.push({id:uid('note'),title:`天気判断：${{setup:'設営',withdraw:'撤収',kota:'コタ',tent:'幕体'}[type]||type}`,text:`${value}：${weatherSuggestion(type)}`,private:false});
    save();render();toast('判断保存');
  }
  function decideWeather(type){
    if(!type || type==='copy')return copyWeatherReport();
    const sug=weatherSuggestion(type);
    const value=confirm(`${sug}\\n\\n注意/変更として保存する？\\nOK=注意 / キャンセル=通常`) ? '注意' : '通常';
    setWeatherDecision(type,value);
  }
  function openWeatherChecks(){
    state.prepTab='weather';
    save();render();
  }

  function weatherDecision(type){
    const label={setup:'設営判断',withdraw:'撤収判断',kota:'コタ判断',tent:'幕体判断'}[type]||'天気判断';
    state.notes.push({id:uid('note'),title:label,text:`${label}：${weatherDecisionText()}`,private:false});
    save();render();toast('判断メモ保存');
  }
  function resetLoaded(){
    state.gear=state.gear.map(g=>g.status==='loaded'?{...g,status:'home'}:g);
    save();render();toast('積込をリセット');
  }

  function goToday(){
    state.selectedDate=today();
    state.currentMonth=state.selectedDate.slice(0,7);
    save();render();
  }
  function quickAdd(type){
    const map={
      camp:{title:'キャンプ予定',end:addDays(state.selectedDate,2),repeat:'none',place:'',memo:'犬可 / 温水 / 天気 / ギア確認'},
      normal:{title:'予定',end:state.selectedDate,repeat:'none',place:'',memo:''},
      walk:{title:'コタ散歩',end:state.selectedDate,repeat:'none',place:'',memo:'通常散歩 / 体調メモは非公開'},
      payment:{title:'支払い確認',end:state.selectedDate,repeat:'monthly',place:'',memo:'月次確認'}
    };
    const t=map[type]||map.normal;
    const ev={id:uid('evt'),title:t.title,type,start:state.selectedDate,end:t.end,repeat:t.repeat,place:t.place,memo:t.memo,level:type==='camp'?4:1};
    state.events.push(ev);
    if(type==='camp')state.currentPlanId=ev.id;
    state.drawer={type:'event',id:ev.id};
    save();render();
  }
  function dateUnscheduled(id){
    state.events=state.events.map(e=>e.id===id?{...e,start:state.selectedDate,end:state.selectedDate}:e);
    save();render();toast('日付を付けた');
  }

  function planSwitch(){
    state.drawer={type:'planSwitch'};
    save();render();
  }
  function selectPlan(id){
    const e=state.events.find(x=>x.id===id);
    if(!e)return;
    state.currentPlanId=id;
    if(e.start){
      state.selectedDate=e.start;
      state.currentMonth=e.start.slice(0,7);
    }
    state.stage=e.type==='camp'?'prep':state.stage;
    state.drawer=null;
    save();render();toast('主役にした');
  }
  async function copyPlanContext(){
    const text=buildPlanContext();
    try{await navigator.clipboard.writeText(text);toast('主役コピー')}catch(e){prompt('コピー',text)}
  }

  function setCurrentPlan(id){
    const e=state.events.find(x=>x.id===id);
    if(e){
      state.currentPlanId=id;
      if(e.start){state.selectedDate=e.start;state.currentMonth=e.start.slice(0,7)}
      state.drawer=null;
      save();render();toast('主役にした');
    }
  }

  async function copyPlanSummary(){
    const text=buildPlanSummary();
    try{await navigator.clipboard.writeText(text);toast('準備まとめをコピー')}catch(e){prompt('コピー',text)}
  }
  function markAllLoaded(){
    state.gear=state.gear.map(g=>({...g,status:'loaded'}));
    save();render();toast('全ギアを積込済みにした');
  }
  function autoNext(){
    const st=prepStats();
    if(st.undoneShop>0){state.route='prep';state.prepTab='shopping';}
    else if(st.loaded<state.gear.length){state.route='prep';state.prepTab='gear';state.gearTab='load';}
    else if(st.wdone<state.weather.length){state.route='prep';state.prepTab='weather';}
    else {state.stage='field';state.route='field';}
    save();render();
  }
  function saveReview(){
    const text=buildReviewText();
    state.reviews=state.reviews||[];
    state.reviews.push({id:uid('rv'),eventId:state.currentPlanId,title:'自動レビュー',text});
    state.notes.push({id:uid('note'),title:'自動レビュー',text,private:false});
    save();render();toast('レビューを保存');
  }
  async function copyReview(){
    const text=buildReviewText();
    try{await navigator.clipboard.writeText(text);toast('レビューをコピー')}catch(e){prompt('コピー',text)}
  }

  fileInput.onchange=async()=>{
    const files=[...fileInput.files||[]];
    if(!files.length)return;
    const mode=state.importMode||'import';
    try{
      if(mode==='siteMap'){
        const f=files[0];
        const dataUrl=await readFileAsDataURL(f);
        state.siteMap={image:dataUrl,name:f.name,loadedAt:Date.now()};
        autoPin('サイトMAP','サイトMAP読込',f.name);
        sessionRecord({kind:'サイトMAP',title:'サイトMAP読込',text:f.name,group:'サイト調査',target:'サイトMAP / 場所カード',tags:['サイトMAP','読込']});
        state.importMode=null;
        save();render();toast('サイトMAP読込');
      }else if(mode.startsWith('media:')){
        const kind=mode.split(':')[1]==='video'?'video':'photo';
        for(const f of files){
          let dataUrl='';
          const keepPreview=(f.type.startsWith('image/') && f.size<420000) || (f.type.startsWith('video/') && f.size<800000);
          if(keepPreview)dataUrl=await readFileAsDataURL(f);
          addMediaRecord(kind,f,dataUrl);
        }
        state.importMode=null;
        save();render();toast(`${files.length}件メディア記録`);
      }else{
        const f=files[0];
        const text=await f.text();
        if(f.name.endsWith('.json')){
          const obj=JSON.parse(text);
          state=migrateState(obj.state||obj);
        }else{
          state.notes.push({id:uid('note'),title:'取込候補',text:f.name,private:false});
        }
        save();render();toast('取込保存');
      }
    }catch(e){
      state.importMode=null;
      toast('読込失敗');
    }
    fileInput.value='';
    fileInput.accept='.json,.txt,.csv,.md,.xlsx,.xls,image/*,video/*';
    fileInput.multiple=true;
    fileInput.removeAttribute('capture');
  };
  window.addEventListener('error',e=>{state.lastError={message:e.message||'error',time:new Date().toISOString(),route:state.route};try{save()}catch(_){}});
  window.addEventListener('unhandledrejection',e=>{state.lastError={message:String(e.reason?.message||e.reason||'promise'),time:new Date().toISOString(),route:state.route};try{save()}catch(_){}});
  document.addEventListener('visibilitychange',visibility03);
  setInterval(updateTimers,1000);
  if(state.walk.active||state.drive?.active)startGpsAuto();
  render();
})();
