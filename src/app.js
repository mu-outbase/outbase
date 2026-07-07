
(() => {
  'use strict';
  const VERSION = 'outbase-genius-ui-preppro-20260707';
  const KEY = 'outbase_genius_ui_state';
  const app = document.getElementById('app');
  const fileInput = document.getElementById('fileInput');

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
      route:'home', stage:'before', currentMonth:'2026-07', selectedDate:'2026-07-07', currentPlanId:'akagi', prepTab:'overview', gearTab:'list', walkMode:'normal', drawer:null, toast:null,
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
      walk:{active:false,track:[],spots:[],friends:[],health:[]},
      records:[],
      reviews:[{id:'rv1',eventId:'akagi',title:'次回改善',text:'雨予報なら直営・乾燥サービス優先。買い物とギアは前日までに終わらせる。'}]
    }
  }

  let state=load();
  function load(){try{const raw=localStorage.getItem(KEY); if(raw)return {...seed(),...JSON.parse(raw)}}catch(e){} return seed()}
  function save(){localStorage.setItem(KEY,JSON.stringify(state))}
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

  function top(){
    const p=current();
    return `<div class="top">
      <div class="top-row">
        <button class="brand" data-route="home"><span class="logo">OB</span><span><b>OUTBASE</b><small>field system</small></span></button>
        <button class="plan" data-act="editPlan"><i></i><b>${esc(p.title)}</b><small>${p.start?`${fmt(p.start)}〜${fmt(p.end||p.start)} / ${typeName[p.type]}`:'日付未設定'}</small></button>
      </div>
      <div class="stage">
        ${[['before','準備前'],['prep','準備中'],['field','現地'],['after','帰宅後']].map(([id,label])=>`<button class="${state.stage===id?'active':''}" data-stage="${id}">${label}</button>`).join('')}
      </div>
    </div>`;
  }
  function nav(){
    return `<nav class="bottomNav">${[['home','⌂','今日'],['calendar','▦','予定'],['prep','◫','準備'],['field','＋','現地'],['memory','○','整理']].map(([r,i,l])=>`<button class="${state.route===r?'active':''}" data-route="${r}"><b>${i}</b><span>${l}</span></button>`).join('')}</nav>`;
  }
  function shell(html){return `<div class="shell">${top()}<main class="main">${html}</main></div>${drawer()}${state.toast?`<div class="toast">${esc(state.toast)}</div>`:''}${nav()}`}


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
    return `【OUTBASE 準備まとめ】\\n${p.title}\\n${p.start?`${fmt(p.start)}〜${fmt(p.end||p.start)}`:'日付未設定'}\\n\\n■買い物\\n${shop}\\n\\n■ギア\\n${gear}\\n\\n■天気判断\\n${state.weather.map(w=>`${w.done?'✓':'□'} ${w.when}：${w.check}`).join('\\n')}`;
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
      ${planFlowHtml()}
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


  function prepNextTarget(){
    const st=prepStats();
    if(state.meals.length===0)return ['meals','献立を決める','料理を1つ入れる'];
    if(st.undoneShop>0)return ['shopping','買い物を終わらせる',`${st.undoneShop}件残り`];
    if(st.loaded<state.gear.length)return ['gear','ギアを積む',`${state.gear.length-st.loaded}件残り`];
    if(st.wdone<state.weather.length)return ['weather','天気で判断する',`${state.weather.length-st.wdone}件残り`];
    return ['overview','現地へ行ける','準備はほぼ完了'];
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
    const undone=state.weather.filter(w=>!w.done);
    if(!undone.length)return '天気確認は完了。あとは当日の風と雨で最終判断。';
    const first=undone[0];
    return `${first.when}：${first.check} を確認。雨・風・気温で設営時間、コタの暑寒、幕体を決める。`;
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

      <section class="section"><div class="tabs">${['overview:全体','meals:料理','shopping:買い物','gear:ギア','weather:天気'].map(x=>{const [id,l]=x.split(':');return `<button class="tab ${state.prepTab===id?'active':''}" data-prep="${id}">${l}</button>`}).join('')}</div></section>
      ${prepBody()}
    `)
  }

  function prepBody(){
    const st=prepStats();
    if(state.prepTab==='meals')return `<section class="section">
      <div class="head"><div><h2>料理</h2><p>献立から買い物とギアへ自動でつなげる。</p></div><button class="btn primary" data-act="addMeal">追加</button></div>
      ${state.meals.map(m=>{const miss=mealMissing(m);return `<div class="mealBundle">
        <div class="mealBundleTop"><span><h3>${esc(m.name)}</h3><p>${esc(m.slot)} / ${esc(m.note)}</p></span><button class="btn" data-act="editMeal" data-id="${m.id}">編集</button></div>
        <div class="miniTags">${m.ingredients.slice(0,6).map(i=>`<span>${esc(i)}</span>`).join('')}${m.ingredients.length>6?`<span>+${m.ingredients.length-6}</span>`:''}</div>
        <div class="commandDock"><button class="btn primary" data-act="mealToShop" data-id="${m.id}">材料を買い物へ</button><button class="btn" data-act="mealGearCheck" data-id="${m.id}">必要ギア確認</button></div>
        ${(miss.ingredients.length||miss.gear.length)?`<div class="warnLine">不足候補：${[...miss.ingredients,...miss.gear].map(esc).join(' / ')}</div>`:''}
      </div>`}).join('') || `<div class="row"><span><strong>料理なし</strong><small>まず1つ入れる。材料とギアへつながる。</small></span><button class="btn primary" data-act="addMeal">追加</button></div>`}
    </section>`;

    if(state.prepTab==='shopping'){const groups=groupedShopping();return `<section class="section">
      <div class="head"><div><h2>買い物</h2><p>店で迷わない。グループごとに消す。</p></div><button class="btn primary" data-act="addShop">追加</button></div>
      <div class="finishPanel"><div class="finishHead"><span><b>買い物残り ${st.undoneShop}件</b><small>買ったら行ごとに押す。</small></span><span class="pill ${st.undoneShop===0?'dark':'wood'}">${st.undoneShop===0?'完了':'未完'}</span></div>
      <div class="finishBody">${Object.entries(groups).map(([g,items])=>`<div class="groupHead"><span>${esc(g)}</span><span>${items.filter(i=>!i.done).length}/${items.length}</span></div>${items.map(s=>`<button class="finishRow" data-act="toggleShop" data-id="${s.id}"><span><b>${s.done?'✓ ':''}${esc(s.name)}</b><small>${esc(s.qty)} / ${esc(s.source)}</small></span><span class="roundMark ${s.done?'done':''}">${s.done?'✓':'□'}</span></button>`).join('')}`).join('')}</div></div>
      <div class="commandDock"><button class="btn primary" data-act="copyShop">LINE用コピー</button><button class="btn" data-act="clearDoneShop">購入済みを隠す</button></div>
    </section>`;}

    if(state.prepTab==='gear')return gearView();

    if(state.prepTab==='weather')return `<section class="section">
      <div class="head"><div><h2>天気判断</h2><p>天気を見るだけで終わらせず、設営・撤収・コタ・幕体を決める。</p></div></div>
      <div class="decisionCard"><b>今の判断</b><p>${esc(weatherDecisionText())}</p><div class="decisionOps"><button data-act="weatherDecision" data-type="setup">設営判断</button><button data-act="weatherDecision" data-type="withdraw">撤収判断</button><button data-act="weatherDecision" data-type="kota">コタ判断</button><button data-act="weatherDecision" data-type="tent">幕体判断</button></div></div>
      <div class="list" style="margin-top:10px">${state.weather.map(w=>`<button class="row" data-act="toggleWeather" data-id="${w.id}"><span><strong>${w.done?'✓ ':''}${esc(w.when)}</strong><small>${esc(w.check)}</small></span><span class="pill ${w.done?'dark':''}">${w.done?'済':'確認'}</span></button>`).join('')}</div>
    </section>`;

    return `<section class="section">
      ${planFlowHtml()}
      <div class="finishPanel" style="margin-top:12px"><div class="finishHead"><span><b>準備を終わらせる</b><small>次にやることだけを上から潰す。</small></span><span class="pill ${st.score>=80?'dark':'wood'}">${st.score}%</span></div><div class="finishBody">${smartPrepRows()}</div></div>
      <div class="commandDock"><button class="btn primary" data-act="autoNext">次に進める</button><button class="btn" data-act="copyPlanSummary">準備まとめコピー</button></div>
    </section>`;
  }

  function gearView(){
    return `<section class="section"><div class="head"><div><h2>ギア</h2><p>登録・変更・ボックス・車載位置を一体で管理。</p></div><button class="btn primary" data-act="addGear">登録</button></div><div class="tabs">${['list:一覧','boxes:ボックス','load:積込','care:乾燥/修理','import:取込'].map(x=>{const [id,l]=x.split(':');return `<button class="tab ${state.gearTab===id?'active':''}" data-gear="${id}">${l}</button>`}).join('')}</div></section>${gearBody()}`
  }
  function gearBody(){
    if(state.gearTab==='boxes')return `<section class="section"><div class="list">${state.boxes.map(b=>{const names=state.gear.filter(g=>g.boxId===b.id).map(g=>g.name).join(' / ');return `<button class="row" data-act="editBox" data-id="${b.id}"><span><strong>${esc(b.name)}</strong><small>家:${esc(b.home)} / 車:${esc(b.car)}<br>${esc(names||'中身なし')}</small></span><span class="pill">変更</span></button>`}).join('')}</div><div class="actions"><button class="btn primary" data-act="addBox">BOX追加</button></div></section>`;
    if(state.gearTab==='load')return `<section class="section"><div class="decisionCard"><b>積込順</b><p>重い物・奥に置く物から積む。ボックスを押すと中身をまとめて積込済みにする。</p><div class="decisionOps"><button data-act="markAllLoaded">全部積込済み</button><button data-act="resetLoaded">積込リセット</button></div></div><div class="list" style="margin-top:10px">${state.boxes.map(b=>{const list=state.gear.filter(g=>g.boxId===b.id), loaded=list.filter(g=>g.status==='loaded').length;return `<button class="row" data-act="toggleBox" data-id="${b.id}"><span><strong>${esc(b.name)}</strong><small>${loaded}/${list.length} 積込済 / 車:${esc(b.car)} / 家:${esc(b.home)}</small></span><span class="pill ${loaded===list.length&&list.length?'dark':''}">${loaded===list.length&&list.length?'完了':'積む'}</span></button>`}).join('')}</div></section>`;
    if(state.gearTab==='care'){const targets=state.gear.filter(g=>['dry','repair','replace'].includes(g.status));return `<section class="section"><div class="list">${targets.length?targets.map(gearRow).join(''):`<div class="row"><span><strong>対象なし</strong><small>乾燥・修理・買替候補はない。</small></span></div>`}</div></section>`}
    if(state.gearTab==='import')return `<section class="section"><div class="tile"><strong>取込候補</strong><small>Excel・購入履歴・写真を候補として保存。</small><div class="actions"><button class="btn primary" data-act="import">ファイル選択</button><button class="btn" data-act="backup">バックアップ</button></div></div></section>`;
    return `<section class="section"><div class="list">${state.gear.map(gearRow).join('')}</div></section>`;
  }
  function gearRow(g){const b=state.boxes.find(x=>x.id===g.boxId);return `<button class="row" data-act="editGear" data-id="${g.id}"><span><strong>${esc(g.name)} ×${g.qty}</strong><small>${esc(g.cat)} / ${esc(b?.name||'未収納')} / 車:${esc(g.car)} / ${gearStatus[g.status]}<br>${esc(g.note)}</small></span><span class="pill">変更</span></button>`}

  function field(){
    const modeText=state.walkMode==='camp'?'キャンプ場散歩':'通常散歩';
    return shell(`
      <section class="nextAction">
        <div class="nextActionIn">
          <div class="nextLabel"><span>FIELD MODE</span><span>${modeText}</span></div>
          <h1>${state.walk.active?'記録中':'現地は3秒。'}</h1>
          <p>表に出すのは散歩・場所・スポット。体調メモは非公開だけ。</p>
          <div class="nextButtons">
            <button class="bigGo" data-act="toggleWalk">${state.walk.active?'散歩終了':'散歩開始'}<small>まずここだけ押す</small></button>
            <button class="subGo" data-act="gps">現在地を記録</button>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="segment"><button class="${state.walkMode==='normal'?'active':''}" data-walk="normal">通常散歩</button><button class="${state.walkMode==='camp'?'active':''}" data-walk="camp">キャンプ場散歩</button></div>
        <div class="metricGrid" style="margin-top:12px"><div class="metricBox"><small>GPS</small><b>${state.walk.track.length}</b></div><div class="metricBox"><small>スポット</small><b>${state.walk.spots.length}</b></div><div class="metricBox"><small>犬友達</small><b>${state.walk.friends.length}</b></div></div>
      </section>

      <section class="section">
        <div class="fieldGrid">
          <button class="fieldBig primary" data-act="gps"><b>現在地</b><small>地図に1点追加</small></button>
          <button class="fieldBig" data-act="spot"><b>スポット</b><small>良い場所を残す</small></button>
          <button class="fieldBig" data-act="friend"><b>犬友達</b><small>名前未確認でもOK</small></button>
          <button class="fieldBig" data-act="addNote"><b>メモ</b><small>後で整理へ送る</small></button>
        </div>
      </section>

      <section class="section"><div class="map"><canvas id="walkMap" width="600" height="226"></canvas>${state.walk.track.length?'':'<div class="empty">現在地を押すと<br>簡易ルートを描く</div>'}</div><div class="actions"><button class="btn" data-act="map">Google Map</button></div></section>
      <section class="section"><details class="privateBox"><summary>非公開の体調メモ</summary><div class="actions"><button class="btn" data-act="health" data-type="体調">体調</button><button class="btn" data-act="health" data-type="うんち">うんち</button><button class="btn" data-act="health" data-type="おしっこ">おしっこ</button></div><div class="list" style="margin-top:12px">${state.walk.health.slice().reverse().map(h=>`<div class="row"><span><strong>${esc(h.type)}</strong><small>${esc(h.time)} / ${esc(h.mode)} / 非公開</small></span><span class="pill private">非公開</span></div>`).join('')||'<div class="row"><span><strong>まだなし</strong><small>表には出さない。</small></span></div>'}</div></details></section>
    `)
  }

  function memory(){
    return shell(`
      <section class="section"><div class="reportBox"><b>自動レビュー</b><p>${esc(buildReviewText())}</p><div class="actions"><button class="btn wood" data-act="saveReview">レビュー保存</button><button class="btn" data-act="copyReview">コピー</button></div></div></section>
      <section class="section"><div class="head"><div><h2>整理</h2><p>記録を見返し、次回に使える形へ。</p></div><button class="btn primary" data-act="addNote">メモ追加</button></div><div class="list">${state.notes.map(n=>`<div class="row"><span><strong>${esc(n.title)}</strong><small>${esc(n.text)}</small></span><span class="pill ${n.private?'private':''}">${n.private?'非公開':'共有可'}</span></div>`).join('')}</div></section>
      <section class="section"><div class="head"><div><h2>場所カード</h2><p>散歩先・キャンプ場・再訪候補。</p></div></div><div class="list">${state.places.map(p=>`<div class="row"><span><strong>${esc(p.name)}</strong><small>${esc(p.kind)} / 訪問${p.visits}回<br>${esc(p.note)}</small></span><span class="pill">場所</span></div>`).join('')}</div></section>
      <section class="section"><div class="actions"><button class="btn primary" data-act="backup">バックアップ</button><button class="btn" data-act="import">復元/取込</button></div></section>
    `)
  }


  function buildReviewText(){
    const p=current();
    const st=prepStats();
    const walk=`散歩GPS ${state.walk.track.length}点、スポット ${state.walk.spots.length}件、犬友達 ${state.walk.friends.length}件。体調メモは非公開。`;
    const prep=`買い物未完 ${st.undoneShop}件、ギア積込 ${st.loaded}/${state.gear.length}、天気確認 ${st.wdone}/${state.weather.length}。`;
    const next=state.notes.filter(n=>!n.private).slice(-2).map(n=>n.text).join(' / ') || '次回改善は未整理。';
    return `${p.title}：${prep} ${walk} 次回メモ：${next}`;
  }

  function drawer(){
    if(!state.drawer)return '';
    return `<div class="drawerBack" data-act="close"></div><div class="drawer">${drawerBody()}</div>`
  }
  function drawerBody(){
    const d=state.drawer;
    if(d.type==='event'){const e=state.events.find(x=>x.id===d.id)||{id:'',title:'',type:'normal',start:d.date||state.selectedDate,end:d.date||state.selectedDate,repeat:'none',place:'',memo:''};return `<form class="form" data-form="event" data-id="${e.id}"><div class="head"><div><h2>${e.id?'予定変更':'予定追加'}</h2><p>単体・連日・繰り返し。</p></div><button class="btn" type="button" data-act="close">閉じる</button></div><div class="field"><label>予定名</label><input name="title" value="${esc(e.title)}" required></div><div class="two"><div class="field"><label>種類</label><select name="type">${Object.entries(typeName).map(([k,v])=>`<option value="${k}" ${e.type===k?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>繰り返し</label><select name="repeat">${Object.entries(repeatName).map(([k,v])=>`<option value="${k}" ${e.repeat===k?'selected':''}>${v}</option>`).join('')}</select></div></div><div class="two"><div class="field"><label>開始日</label><input type="date" name="start" value="${esc(e.start)}"></div><div class="field"><label>終了日</label><input type="date" name="end" value="${esc(e.end)}"></div></div><div class="field"><label>場所</label><input name="place" value="${esc(e.place)}"></div><div class="field"><label>メモ</label><textarea name="memo">${esc(e.memo)}</textarea></div><div class="actions"><button class="btn primary" type="submit">保存</button>${e.id?`<button class="btn wood" type="button" data-act="setCurrentPlan" data-id="${e.id}">主役にする</button><button class="btn danger" type="button" data-act="deleteEvent" data-id="${e.id}">削除</button>`:''}</div></form>`}
    if(d.type==='gear'){const g=state.gear.find(x=>x.id===d.id)||{id:'',name:'',cat:'',qty:1,boxId:state.boxes[0]?.id||'',car:'',status:'home',note:''};return `<form class="form" data-form="gear" data-id="${g.id}"><div class="head"><div><h2>${g.id?'ギア変更':'ギア登録'}</h2></div><button class="btn" type="button" data-act="close">閉じる</button></div><div class="field"><label>ギア名</label><input name="name" value="${esc(g.name)}" required></div><div class="two"><div class="field"><label>カテゴリ</label><input name="cat" value="${esc(g.cat)}"></div><div class="field"><label>数量</label><input type="number" min="1" name="qty" value="${g.qty}"></div></div><div class="two"><div class="field"><label>ボックス</label><select name="boxId">${state.boxes.map(b=>`<option value="${b.id}" ${g.boxId===b.id?'selected':''}>${esc(b.name)}</option>`).join('')}</select></div><div class="field"><label>状態</label><select name="status">${Object.entries(gearStatus).map(([k,v])=>`<option value="${k}" ${g.status===k?'selected':''}>${v}</option>`).join('')}</select></div></div><div class="field"><label>車載位置</label><input name="car" value="${esc(g.car)}"></div><div class="field"><label>メモ</label><textarea name="note">${esc(g.note)}</textarea></div><button class="btn primary" type="submit">保存</button></form>`}
    if(d.type==='box'){const b=state.boxes.find(x=>x.id===d.id)||{id:'',name:'',home:'',car:'',role:''};return `<form class="form" data-form="box" data-id="${b.id}"><div class="head"><div><h2>${b.id?'BOX変更':'BOX追加'}</h2></div><button class="btn" type="button" data-act="close">閉じる</button></div><div class="field"><label>BOX名</label><input name="name" value="${esc(b.name)}" required></div><div class="two"><div class="field"><label>家の場所</label><input name="home" value="${esc(b.home)}"></div><div class="field"><label>車の場所</label><input name="car" value="${esc(b.car)}"></div></div><div class="field"><label>役割</label><input name="role" value="${esc(b.role)}"></div><button class="btn primary" type="submit">保存</button></form>`}
    if(d.type==='meal'){const m=state.meals.find(x=>x.id===d.id)||{id:'',name:'',slot:'',ingredients:[],gear:[],note:''};return `<form class="form" data-form="meal" data-id="${m.id}"><div class="head"><div><h2>${m.id?'料理変更':'料理追加'}</h2></div><button class="btn" type="button" data-act="close">閉じる</button></div><div class="field"><label>料理名</label><input name="name" value="${esc(m.name)}" required></div><div class="field"><label>タイミング</label><input name="slot" value="${esc(m.slot)}"></div><div class="field"><label>材料（改行）</label><textarea name="ingredients">${esc(m.ingredients.join('\n'))}</textarea></div><div class="field"><label>必要ギア（改行）</label><textarea name="gear">${esc(m.gear.join('\n'))}</textarea></div><div class="field"><label>メモ</label><textarea name="note">${esc(m.note)}</textarea></div><button class="btn primary" type="submit">保存</button></form>`}
    if(d.type==='note')return `<form class="form" data-form="note"><div class="head"><div><h2>メモ追加</h2></div><button class="btn" type="button" data-act="close">閉じる</button></div><div class="field"><label>タイトル</label><input name="title" required></div><div class="field"><label>本文</label><textarea name="text"></textarea></div><div class="field"><label><input type="checkbox" name="private" style="width:auto;margin-right:8px">非公開</label></div><button class="btn primary" type="submit">保存</button></form>`;
    return '';
  }

  function render(){
    app.innerHTML = state.route==='calendar'?calendar():state.route==='prep'?prep():state.route==='field'?field():state.route==='memory'?memory():home();
    bind();
    if(state.route==='field')drawMap();
    bindSwipe();
  }
  function bind(){
    document.querySelectorAll('[data-route]').forEach(el=>el.onclick=()=>{state.route=el.dataset.route;save();render()});
    document.querySelectorAll('[data-stage]').forEach(el=>el.onclick=()=>{state.stage=el.dataset.stage;save();render()});
    document.querySelectorAll('[data-prep]').forEach(el=>el.onclick=()=>{state.route='prep';state.prepTab=el.dataset.prep;save();render()});
    document.querySelectorAll('[data-gear]').forEach(el=>el.onclick=()=>{state.gearTab=el.dataset.gear;save();render()});
    document.querySelectorAll('[data-walk]').forEach(el=>el.onclick=()=>{state.walkMode=el.dataset.walk;save();render()});
    document.querySelectorAll('[data-day]').forEach(el=>{let last=0;el.onclick=()=>{const now=Date.now();if(now-last<320)state.drawer={type:'event',date:el.dataset.day};else{state.selectedDate=el.dataset.day;state.currentMonth=el.dataset.day.slice(0,7)}last=now;save();render()}});
    document.querySelectorAll('[data-act]').forEach(el=>el.onclick=()=>act(el.dataset.act,el));
    document.querySelectorAll('form[data-form]').forEach(f=>f.onsubmit=submit);
  }
  function bindSwipe(){
    const days=document.getElementById('days'); if(!days)return; let sx=null;
    days.ontouchstart=e=>sx=e.touches[0].clientX;
    days.ontouchend=e=>{if(sx==null)return;const dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>60)moveMonth(dx<0?1:-1);sx=null}
  }
  function act(a,el){

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
    if(a==='import')return fileInput.click();
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
    if(type==='event'){const obj={id:id||uid('evt'),title:data.title,type:data.type,start:data.start,end:data.end||data.start,repeat:data.repeat,place:data.place,memo:data.memo,level:1};state.events=id?state.events.map(x=>x.id===id?obj:x):[...state.events,obj];if(obj.type==='camp')state.currentPlanId=obj.id;state.drawer=null;toast('予定保存')}
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
  async function copyShop(){const text=state.shopping.map(s=>`${s.done?'☑':'□'} ${s.name}：${s.qty}`).join('\n');try{await navigator.clipboard.writeText(text);toast('コピー')}catch(e){prompt('コピー',text)}}
  function toggleBox(id){const gs=state.gear.filter(g=>g.boxId===id),all=gs.length&&gs.every(g=>g.status==='loaded');state.gear=state.gear.map(g=>g.boxId===id?{...g,status:all?'home':'loaded'}:g);save();render()}
  function toggleWalk(){state.walk.active=!state.walk.active;toast(state.walk.active?'散歩開始':'散歩終了');save();render()}
  function gps(){const push=(lat,lng)=>{state.walk.track.push({lat,lng,time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})});save();render();toast('現在地記録')}; if(!navigator.geolocation)return push(35.867+Math.random()/1000,139.975+Math.random()/1000); navigator.geolocation.getCurrentPosition(p=>push(p.coords.latitude,p.coords.longitude),()=>push(35.867+Math.random()/1000,139.975+Math.random()/1000),{enableHighAccuracy:true,timeout:4000})}
  function spot(){const name=prompt('スポット名');if(!name)return;state.walk.spots.push({name,time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})});save();render()}
  function friend(){const name=prompt('犬友達名');if(!name)return;state.walk.friends.push({name,time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})});save();render()}
  function health(type){state.walk.health.push({type,mode:state.walkMode==='camp'?'キャンプ場散歩':'通常散歩',time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})});save();render();toast('非公開保存')}
  function openMap(){const p=state.walk.track[state.walk.track.length-1];if(!p)return toast('先に現在地');window.open(`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`,'_blank')}
  function backup(){const blob=new Blob([JSON.stringify({version:VERSION,state},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`outbase_backup_${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  function drawMap(){const c=document.getElementById('walkMap');if(!c)return;const ctx=c.getContext('2d'),w=c.width,h=c.height;ctx.clearRect(0,0,w,h);ctx.strokeStyle='rgba(17,19,15,.08)';for(let x=0;x<w;x+=34){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}for(let y=0;y<h;y+=34){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}const pts=state.walk.track;if(!pts.length)return;const lats=pts.map(p=>p.lat),lngs=pts.map(p=>p.lng),minLa=Math.min(...lats),maxLa=Math.max(...lats),minLn=Math.min(...lngs),maxLn=Math.max(...lngs);const mp=p=>({x:28+(w-56)*((p.lng-minLn)/((maxLn-minLn)||.001)),y:h-28-(h-56)*((p.lat-minLa)/((maxLa-minLa)||.001))});ctx.strokeStyle='#273a30';ctx.lineWidth=4;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();pts.forEach((p,i)=>{const m=mp(p);i?ctx.lineTo(m.x,m.y):ctx.moveTo(m.x,m.y)});ctx.stroke();pts.forEach((p,i)=>{const m=mp(p);ctx.fillStyle=i===pts.length-1?'#b99a66':'#3f5e4c';ctx.beginPath();ctx.arc(m.x,m.y,5,0,Math.PI*2);ctx.fill()})}



  function mealToShop(id){
    const m=state.meals.find(x=>x.id===id); if(!m)return;
    const names=new Set(state.shopping.map(s=>s.name));
    let added=0;
    m.ingredients.forEach(i=>{
      if(!names.has(i)){
        state.shopping.push({id:uid('shop'),name:i,qty:'要確認',group:'食材',source:m.name,done:false});
        names.add(i); added++;
      }
    });
    save();render();toast(added?`${added}件追加`:'追加なし');
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
  function setCurrentPlan(id){
    if(state.events.some(e=>e.id===id)){
      state.currentPlanId=id;
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

  fileInput.onchange=async()=>{const files=[...fileInput.files||[]];if(!files.length)return;const f=files[0];try{const text=await f.text();if(f.name.endsWith('.json')){const obj=JSON.parse(text);if(obj.state)state={...seed(),...obj.state};}else{state.notes.push({id:uid('note'),title:'取込候補',text:f.name,private:false});}save();render();toast('取込保存')}catch(e){toast('読込失敗')}fileInput.value=''};
  render();
})();
