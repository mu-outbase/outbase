
(() => {
  'use strict';
  const VERSION = 'v145-restore-design-calendar-lock';
  const STORAGE_KEY = 'outbase_v145_state';
  const LEGACY_KEYS = ['outbase_v144_state','outbase_v143_state','outbase_restart_43_state','outbase_restart_42_state','outbase_restart_35_state'];
  const app = document.getElementById('app');

  const today = () => new Date().toISOString().slice(0,10);
  const nowTime = () => new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const esc = (v) => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
  const uid = (p) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const dateObj = (iso) => { const [y,m,d] = String(iso || today()).split('-').map(Number); return new Date(y,(m||1)-1,d||1); };
  const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const addDays = (iso,n) => { const d = dateObj(iso); d.setDate(d.getDate()+n); return isoDate(d); };
  const inRange = (date,start,end) => date >= (start || date) && date <= (end || start || date);

  const labels = {
    normal:'普通', work:'仕事', hospital:'病院', payment:'支払い', family:'家族', pet:'ペット',
    shopping:'買い物', car:'車', camp:'キャンプ', walk:'散歩', travel:'旅行', picnic:'ピクニック', event:'イベント', other:'その他'
  };
  const levelLabel = (level) => ({1:'普通',2:'メモ付',3:'準備付',4:'記録付'})[Number(level)] || '普通';
  const typeLabel = (type) => labels[type] || '予定';
  const eventLevelFromType = (type) => ['camp','travel'].includes(type) ? 4 : ['walk','picnic','event','drive'].includes(type) ? 3 : ['pet','shopping','car'].includes(type) ? 2 : 1;
  const defaultPrep = [
    {id:'shop',group:'買い物',text:'買い物リストを確認',done:false},
    {id:'cook',group:'料理',text:'料理と量を確認',done:false},
    {id:'gear',group:'ギア',text:'ギア・電源・灯りを確認',done:false},
    {id:'kota',group:'コタ',text:'フード・水・暑さ寒さを確認',done:false},
    {id:'weather',group:'天気',text:'雨・風・気温を見る',done:false},
    {id:'route',group:'ルート',text:'出発・経由地・帰路を見る',done:false}
  ];
  const defaultState = {
    version:VERSION,
    screen:'home',
    month:today().slice(0,7),
    selectedDate:today(),
    activeEventId:'',
    tab:'summary',
    addMode:'event',
    toast:'',
    events:[
      {
        id:'evt-akagi', title:'スノーピーク赤城山キャンプ', type:'camp', level:4,
        startDate:'2026-06-26', endDate:'2026-06-27', startTime:'', endTime:'',
        location:'スノーピーク赤城山キャンプフィールド',
        memo:'夫婦＋コタ。準備・現地・記録・改善まで扱う出来事。',
        status:'planned', source:'sample', prep:clone(defaultPrep), records:[], improvements:[]
      },
      {
        id:'evt-sample-walk', title:'コタと自宅散歩', type:'walk', level:3,
        startDate:today(), endDate:today(), startTime:'', endTime:'',
        location:'自宅周辺', memo:'予定からでも現地からでも始められる例。',
        status:'planned', source:'sample', prep:[], records:[], improvements:[]
      }
    ],
    checks:[],
    trash:[]
  };

  let state = load();

  function load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw) return normalize(JSON.parse(raw));
      for(const k of LEGACY_KEYS){
        const v = localStorage.getItem(k);
        if(v) return normalize(migrate(JSON.parse(v)));
      }
    }catch(e){ console.warn(e); }
    return normalize(clone(defaultState));
  }

  function migrate(old){
    if(Array.isArray(old.events)) return old;
    const next = clone(defaultState);
    next.events = [];
    const projects = Array.isArray(old.projects) ? old.projects : [];
    for(const p of projects){
      next.events.push({
        id:p.id || uid('evt'), title:p.title || p.label || p.place || '予定/出来事',
        type:p.type || 'other', level:eventLevelFromType(p.type), startDate:p.startDate || today(),
        endDate:p.endDate || p.startDate || today(), startTime:'', endTime:'', location:p.place || '',
        memo:p.memo || '', status:'planned', source:'legacy',
        prep:Array.isArray(p.prep) ? p.prep.map(x => ({id:x.id||uid('prep'),group:x.group||x.key||'準備',text:x.text||x.name||x.note||x.key||'準備',done:Boolean(x.done||x.status==='確認済み')})) : [],
        records:[], improvements:[]
      });
    }
    if(!next.events.length) next.events = clone(defaultState.events);
    const records = [...(old.inbox || []), ...(old.memories || [])];
    for(const r of records){
      const e = next.events.find(x => x.id === r.projectId) || next.events[0];
      e.records.push({id:r.id||uid('rec'),entry:r.type||r.recordType||'メモ',text:r.text||r.memo||r.note||'',date:r.date||today(),time:r.time||nowTime(),location:'',source:'legacy',confidence:.6});
    }
    return next;
  }

  function normalize(s){
    s = {...clone(defaultState), ...s};
    s.events = Array.isArray(s.events) && s.events.length ? s.events : clone(defaultState.events);
    s.events = s.events.map(e => ({
      id:e.id || uid('evt'), title:e.title || '予定/出来事', type:e.type || 'other', level:Number(e.level || eventLevelFromType(e.type)),
      startDate:e.startDate || today(), endDate:e.endDate || e.startDate || today(), startTime:e.startTime || '', endTime:e.endTime || '',
      location:e.location || '', memo:e.memo || '', status:e.status || 'planned', source:e.source || 'local',
      prep:Array.isArray(e.prep) ? e.prep : [], records:Array.isArray(e.records) ? e.records : [], improvements:Array.isArray(e.improvements) ? e.improvements : []
    }));
    s.checks = Array.isArray(s.checks) ? s.checks : [];
    s.trash = Array.isArray(s.trash) ? s.trash : [];
    s.month = s.month || today().slice(0,7);
    s.selectedDate = s.selectedDate || today();
    if(s.activeEventId && !s.events.some(e => e.id === s.activeEventId)) s.activeEventId = '';
    s.tab = s.tab || 'summary';
    s.addMode = s.addMode || 'event';
    s.version = VERSION;
    return s;
  }

  function save(){ state.version = VERSION; localStorage.setItem(STORAGE_KEY, JSON.stringify({...state,toast:''})); }
  function toast(msg){ state.toast = msg; render(); clearTimeout(toast.t); toast.t=setTimeout(()=>{state.toast='';render();},1500); }
  function go(screen){ state.screen = screen || 'home'; save(); render(); window.scrollTo({top:0,behavior:'smooth'}); }
  function sortedEvents(){ return [...state.events].sort((a,b)=>(a.startDate+(a.startTime||'')).localeCompare(b.startDate+(b.startTime||''))); }
  function eventsForDate(date){ return sortedEvents().filter(e => inRange(date,e.startDate,e.endDate)); }
  function nextEvents(limit=4){ const t=today(); return sortedEvents().filter(e => e.endDate >= t).slice(0,limit); }
  function activeEvent(){ return state.events.find(e => e.id === state.activeEventId) || state.events[0] || null; }
  function dateLabel(e){ if(!e) return ''; let d=e.startDate || ''; if(e.endDate && e.endDate !== e.startDate) d += ` - ${e.endDate}`; if(e.startTime) d += ` ${e.startTime}`; return d; }
  function jpDate(iso){ const d=dateObj(iso); return `${d.getMonth()+1}/${d.getDate()} ${['日','月','火','水','木','金','土'][d.getDay()]}`; }

  function layout(content){
    app.innerHTML = `
      <header class="topbar">
        <button class="brand" data-action="go" data-screen="home">
          <div class="logo">OB</div>
          <div><div class="brand-title">OUTBASE</div><small class="brand-sub">全予定 / 37-40復旧ベース</small></div>
        </button>
        <button class="pill ${state.checks.length ? 'warn' : 'green'}" data-action="go" data-screen="checks">要確認 ${state.checks.length}</button>
      </header>
      ${content}
      ${bottomNav()}
      ${addSheet()}
      ${state.toast ? `<div class="toast">${esc(state.toast)}</div>` : ''}
    `;
  }

  function bottomNav(){
    const nav = [['home','⌂','今日'],['calendar','□','予定'],['add','＋','追加'],['checks','◇','確認'],['more','…','控え']];
    return `<nav class="bottom-nav">${nav.map(([s,i,l]) => `<button class="nav ${state.screen===s?'active':''}" data-action="${s==='add'?'openAdd':'go'}" data-screen="${s}" data-mode="event"><b>${i}</b><span>${l}</span></button>`).join('')}</nav>`;
  }

  function renderHome(){
    const todays = eventsForDate(today());
    const next = nextEvents(4);
    const records = state.events.reduce((a,e)=>a+e.records.length,0);
    layout(`
      <main class="screen active">
        <section class="hero">
          <div class="hero-row">
            <div class="hero-main"><small>今日</small><strong>${jpDate(today())}</strong><span>${todays.length ? `${todays.length}件の予定` : '今日の予定はなし'}</span></div>
            <button class="pill green" data-action="openAdd" data-mode="event">予定追加</button>
          </div>
          <div class="compact-stats">
            <button class="stat" data-action="go" data-screen="calendar"><b>${state.events.length}</b><small>予定</small></button>
            <button class="stat" data-action="go" data-screen="checks"><b>${state.checks.length}</b><small>要確認</small></button>
            <button class="stat" data-action="go" data-screen="more"><b>${records}</b><small>記録</small></button>
          </div>
        </section>

        <section class="section">
          <div class="section-title"><h2>すぐ追加</h2><small>タブ移動だけにしない</small></div>
          <div class="quick-line">
            ${quick('予定','event','＋')}${quick('準備','prep','□')}${quick('現地','onsite','◎')}${quick('実績','past','○')}${quick('メモ','memo','✎')}
          </div>
        </section>

        <section class="section">
          <div class="section-title"><h2>今日</h2><small>${today()}</small></div>
          <div class="stack">${todays.length ? todays.map(eventRow).join('') : `<div class="empty">今日の予定はありません。</div>`}</div>
        </section>

        <section class="section">
          <div class="section-title"><h2>次の予定</h2><small>近い順</small></div>
          <div class="stack">${next.length ? next.map(eventRow).join('') : `<div class="empty">次の予定はありません。</div>`}</div>
        </section>
      </main>
    `);
  }

  function quick(label,mode,icon){ return `<button class="quick" data-action="openAdd" data-mode="${mode}"><b>${icon}</b><span>${label}</span></button>`; }

  function eventRow(e){
    const open = e.prep.filter(p=>!p.done).length;
    return `
      <button class="row" data-action="openEvent" data-id="${esc(e.id)}">
        <span class="row-main"><strong>${esc(e.title)}</strong><small>${esc(typeLabel(e.type))} / Lv.${e.level} ${esc(levelLabel(e.level))} / ${esc(dateLabel(e))}${e.location ? ' / '+esc(e.location) : ''}</small></span>
        <span class="chip ${e.level>=3?'warn':'green'}">${e.level>=3 ? `準備${open}` : levelLabel(e.level)}</span>
      </button>
    `;
  }

  function renderCalendar(){
    const [y,m] = state.month.split('-').map(Number);
    const first = new Date(y,m-1,1);
    const start = new Date(y,m-1,1-first.getDay());
    const days = [];
    for(let i=0;i<42;i++){ const d=new Date(start); d.setDate(start.getDate()+i); days.push(d); }
    const selected = eventsForDate(state.selectedDate);
    layout(`
      <main class="screen active">
        <div class="page-head"><div><h1>予定</h1><p>ジョルテ代替。全部の予定を見る。</p></div><button class="pill green" data-action="openAdd" data-mode="event">予定追加</button></div>
        <section class="calendar-shell">
          <div class="calendar-head"><button class="tiny-btn" data-action="moveMonth" data-delta="-1">前</button><strong>${y}年 ${m}月</strong><button class="tiny-btn" data-action="moveMonth" data-delta="1">次</button></div>
          <div class="calendar-grid">
            ${['日','月','火','水','木','金','土'].map(d=>`<div class="dow">${d}</div>`).join('')}
            ${days.map(d => dayCell(d,m)).join('')}
          </div>
        </section>
        <section class="section">
          <div class="section-title"><h2>${jpDate(state.selectedDate)}</h2><small>${selected.length}件</small></div>
          <div class="stack">${selected.length ? selected.map(eventRow).join('') : `<div class="empty">この日の予定はありません。</div>`}</div>
        </section>
      </main>
    `);
  }

  function dayCell(d,month){
    const iso=isoDate(d); const ev=eventsForDate(iso);
    const cls=['day', d.getMonth()+1!==month?'out':'', iso===today()?'today':'', iso===state.selectedDate?'selected':''].filter(Boolean).join(' ');
    return `<button class="${cls}" data-action="selectDate" data-date="${iso}"><b>${d.getDate()}</b><span class="dots">${ev.slice(0,3).map(()=>'<i></i>').join('')}</span></button>`;
  }

  function addSheet(){
    return `
      <div class="sheet-backdrop" data-sheet-backdrop data-action="closeAdd"></div>
      <section class="sheet" data-add-sheet>
        <div class="sheet-head"><strong>追加</strong><button class="tiny-btn" data-action="closeAdd">閉じる</button></div>
        ${addForm()}
      </section>
    `;
  }

  function addForm(){
    return `
      <div class="mode-line">
        ${modeButton('event','予定')}${modeButton('prep','準備')}${modeButton('onsite','現地')}${modeButton('past','実績')}${modeButton('memo','メモ')}
      </div>
      <form class="form-card" data-add-form>
        ${state.addMode==='event' ? eventFields() : ''}
        ${state.addMode==='prep' ? prepFields() : ''}
        ${state.addMode==='onsite' ? onsiteFields() : ''}
        ${state.addMode==='past' ? pastFields() : ''}
        ${state.addMode==='memo' ? memoFields() : ''}
        <button class="btn primary" type="submit">${({event:'予定を保存',prep:'準備を保存',onsite:'現地記録を保存',past:'実績を作成',memo:'メモを保存'})[state.addMode]}</button>
      </form>
    `;
  }

  function modeButton(mode,label){ return `<button type="button" class="${state.addMode===mode?'active':''}" data-action="setAddMode" data-mode="${mode}">${label}</button>`; }

  function typeOptions(){ return Object.keys(labels).map(t=>`<option value="${t}">${labels[t]}</option>`).join(''); }
  function eventSelect(name){ return `<select name="${name}"><option value="">自動で選ぶ</option>${sortedEvents().map(e=>`<option value="${esc(e.id)}">${esc(e.title)} / ${esc(dateLabel(e))}</option>`).join('')}</select>`; }

  function eventFields(){
    return `
      <input name="title" placeholder="予定名" required>
      <div class="form-grid"><input name="startDate" type="date" value="${today()}"><input name="endDate" type="date" value="${today()}"></div>
      <div class="form-grid"><input name="startTime" type="time"><input name="endTime" type="time"></div>
      <div class="form-grid"><select name="type">${typeOptions()}</select><select name="level"><option value="1">Lv.1 普通</option><option value="2">Lv.2 メモ付</option><option value="3">Lv.3 準備付</option><option value="4">Lv.4 記録付</option></select></div>
      <input name="location" placeholder="場所"><textarea name="memo" placeholder="メモ"></textarea>
    `;
  }
  function prepFields(){ return `<input name="title" placeholder="準備内容" required><div class="form-grid"><input name="date" type="date" value="${today()}"><select name="group"><option>買い物</option><option>料理</option><option>ギア</option><option>コタ</option><option>天気</option><option>ルート</option><option>その他</option></select></div>${eventSelect('eventId')}<textarea name="memo" placeholder="補足"></textarea>`; }
  function onsiteFields(){ return `<input name="title" placeholder="現地記録" required><div class="form-grid"><input name="date" type="date" value="${today()}"><input name="time" type="time" value="${nowTime()}"></div><div class="form-grid"><select name="entry"><option>メモ</option><option>写真</option><option>声</option><option>コタ</option><option>場所</option><option>料理</option><option>ギア</option></select>${eventSelect('eventId')}</div><input name="location" placeholder="場所/スポット"><textarea name="memo" placeholder="詳細"></textarea>`; }
  function pastFields(){ return `<input name="title" placeholder="過去実績名" required><div class="form-grid"><input name="startDate" type="date" value="${today()}"><input name="endDate" type="date" value="${today()}"></div><div class="form-grid"><select name="type"><option value="camp">キャンプ</option><option value="travel">旅行</option><option value="walk">散歩</option><option value="event">イベント</option><option value="other">その他</option></select><select name="level"><option value="4">Lv.4 記録付</option><option value="3">Lv.3 準備付</option><option value="2">Lv.2 メモ付</option></select></div><input name="location" placeholder="場所"><textarea name="memo" placeholder="覚えていること"></textarea>`; }
  function memoFields(){ return `<input name="title" placeholder="メモ見出し" required><div class="form-grid"><input name="date" type="date" value="${today()}">${eventSelect('eventId')}</div><textarea name="memo" placeholder="内容"></textarea>`; }

  function openAdd(mode='event'){
    state.addMode = mode; save(); render();
    document.querySelector('[data-sheet-backdrop]')?.classList.add('show');
    document.querySelector('[data-add-sheet]')?.classList.add('show');
  }
  function closeAdd(){ document.querySelector('[data-sheet-backdrop]')?.classList.remove('show'); document.querySelector('[data-add-sheet]')?.classList.remove('show'); }

  function submitAdd(form){
    const data = Object.fromEntries(new FormData(form).entries());
    const mode = state.addMode;
    if(mode==='event') return createEvent(data);
    if(mode==='past') return createEvent({...data,status:'actual',source:'past',level:data.level||4});
    if(mode==='prep') return createPrep(data);
    if(mode==='onsite') return createRecord(data);
    if(mode==='memo') return createMemo(data);
  }

  function createEvent(data){
    const level = Number(data.level || eventLevelFromType(data.type));
    const e = {id:uid('evt'),title:data.title||'予定',type:data.type||'normal',level,startDate:data.startDate||today(),endDate:data.endDate||data.startDate||today(),startTime:data.startTime||'',endTime:data.endTime||'',location:data.location||'',memo:data.memo||'',status:data.status||'planned',source:data.source||'local',prep:level>=3?clone(defaultPrep):[],records:[],improvements:[]};
    state.events.push(e); state.activeEventId=e.id; state.selectedDate=e.startDate; state.month=e.startDate.slice(0,7); state.screen='detail'; state.tab='summary'; save(); closeAdd(); toast('予定を保存');
  }

  function createPrep(data){
    const entry = {mode:'prep',title:data.title||'準備',text:data.memo||'',date:data.date||today(),group:data.group||'準備',eventId:data.eventId||''};
    const target = resolveTarget(entry);
    if(target.event){ target.event.prep.push({id:uid('prep'),group:entry.group,text:entry.title + (entry.text?`：${entry.text}`:''),done:false}); save(); closeAdd(); return toast(`${target.event.title} に保存`); }
    addCheck(entry,target.candidates); closeAdd(); toast('要確認に保存');
  }
  function createRecord(data){
    const entry = {mode:'onsite',title:data.title||'現地記録',text:data.memo||'',date:data.date||today(),time:data.time||nowTime(),entry:data.entry||'メモ',location:data.location||'',eventId:data.eventId||''};
    const target = resolveTarget(entry);
    const rec = {id:uid('rec'),entry:entry.entry,text:entry.title+(entry.text?`\n${entry.text}`:''),date:entry.date,time:entry.time,location:entry.location,confidence:target.confidence,source:'v145'};
    if(target.event){ target.event.records.unshift(rec); save(); closeAdd(); return toast(`${target.event.title} に記録`); }
    addCheck(entry,target.candidates); closeAdd(); toast('要確認に保存');
  }
  function createMemo(data){
    const entry = {mode:'memo',title:data.title||'メモ',text:data.memo||'',date:data.date||today(),eventId:data.eventId||''};
    const target = resolveTarget(entry);
    const rec = {id:uid('rec'),entry:'メモ',text:entry.title+(entry.text?`\n${entry.text}`:''),date:entry.date,time:nowTime(),location:'',confidence:target.confidence,source:'v145'};
    if(target.event){ target.event.records.unshift(rec); save(); closeAdd(); return toast(`${target.event.title} にメモ`); }
    addCheck(entry,target.candidates); closeAdd(); toast('要確認に保存');
  }

  function resolveTarget(entry){
    if(entry.eventId){ const e=state.events.find(x=>x.id===entry.eventId); if(e) return {event:e,candidates:[e],confidence:1}; }
    const scored = state.events.map(e=>{
      let score=0;
      if(inRange(entry.date,e.startDate,e.endDate)) score+=.55;
      if(entry.date===addDays(e.startDate,-1)||entry.date===addDays(e.endDate,1)) score+=.18;
      if(entry.mode==='onsite' && e.level>=3 && inRange(entry.date,addDays(e.startDate,-1),addDays(e.endDate,1))) score+=.22;
      if(entry.mode==='prep' && e.level>=3 && entry.date<=e.startDate) score+=.18;
      const text=`${entry.title} ${entry.text||''} ${entry.location||''}`.toLowerCase();
      const hay=`${e.title} ${e.location} ${typeLabel(e.type)}`.toLowerCase();
      for(const token of hay.split(/[\\s/・,、。]+/).filter(Boolean).slice(0,10)){ if(token.length>=2 && text.includes(token)) score+=.08; }
      return {event:e,score:Math.min(score,1)};
    }).sort((a,b)=>b.score-a.score);
    const top=scored[0]; const candidates=scored.filter(x=>x.score>=.32).slice(0,3).map(x=>x.event);
    if(top && top.score>=.68) return {event:top.event,candidates,confidence:top.score};
    if(entry.mode==='prep' || (entry.mode==='onsite' && !candidates.length)){
      const temp = createTempEvent(entry, entry.mode==='prep'?3:3);
      return {event:temp,candidates:[temp],confidence:.58};
    }
    return {event:null,candidates,confidence:top?.score || 0};
  }
  function createTempEvent(entry,level){
    const e = {id:uid('evt'),title:entry.mode==='prep'?`${entry.date} 準備`:`${entry.date} メモ`,type:'other',level,startDate:entry.date,endDate:entry.date,startTime:'',endTime:'',location:entry.location||'',memo:'自動作成された仮出来事。あとで編集できます。',status:'temporary',source:'auto',prep:[],records:[],improvements:[]};
    state.events.push(e); return e;
  }
  function addCheck(entry,candidates){ state.checks.unshift({id:uid('chk'),entry,candidateIds:(candidates||[]).map(e=>e.id),createdAt:new Date().toISOString(),reason:'自動紐付けに迷ったもの'}); save(); }

  function renderChecks(){
    layout(`<main class="screen active"><div class="page-head"><div><h1>要確認</h1><p>全部整理する場所ではなく、迷った少数だけ。</p></div></div><div class="stack">${state.checks.length?state.checks.map(checkRow).join(''):`<div class="empty">要確認はありません。</div>`}</div></main>`);
  }
  function checkRow(c){
    const candidates=c.candidateIds.map(id=>state.events.find(e=>e.id===id)).filter(Boolean);
    return `<article class="card"><div class="row-main"><strong>${esc(c.entry.title||'要確認')}</strong><small>${esc(c.entry.date||'')} / ${esc(c.entry.mode)} / ${esc(c.reason)}</small>${c.entry.text?`<p>${esc(c.entry.text)}</p>`:''}</div><div class="btn-row">${candidates.map(e=>`<button class="btn primary" data-action="attachCheck" data-id="${esc(c.id)}" data-event-id="${esc(e.id)}">${esc(e.title)}</button>`).join('')}<button class="btn warn" data-action="makeCheckEvent" data-id="${esc(c.id)}">新規</button><button class="btn danger" data-action="deleteCheck" data-id="${esc(c.id)}">捨てる</button></div></article>`;
  }

  function attachEntryToEvent(entry,e,confidence){
    if(entry.mode==='prep') e.prep.push({id:uid('prep'),group:entry.group||'準備',text:entry.title+(entry.text?`：${entry.text}`:''),done:false});
    else e.records.unshift({id:uid('rec'),entry:entry.entry||'メモ',text:entry.title+(entry.text?`\n${entry.text}`:''),date:entry.date||today(),time:entry.time||nowTime(),location:entry.location||'',confidence,source:'check'});
  }
  function attachCheck(checkId,eventId){
    const c=state.checks.find(x=>x.id===checkId); const e=state.events.find(x=>x.id===eventId); if(!c||!e) return;
    attachEntryToEvent(c.entry,e,.75); state.checks=state.checks.filter(x=>x.id!==checkId); save(); toast('紐付けました');
  }
  function makeCheckEvent(checkId){
    const c=state.checks.find(x=>x.id===checkId); if(!c) return;
    const e=createTempEvent(c.entry, c.entry.mode==='memo'?2:3); attachEntryToEvent(c.entry,e,.55); state.checks=state.checks.filter(x=>x.id!==checkId); state.activeEventId=e.id; state.screen='detail'; save(); toast('新規出来事にしました');
  }

  function renderDetail(){
    const e=activeEvent(); if(!e) return renderHome();
    layout(`
      <main class="screen active">
        <div class="page-head"><div><h1>${esc(e.title)}</h1><p>${esc(typeLabel(e.type))} / Lv.${e.level} ${esc(levelLabel(e.level))} / ${esc(dateLabel(e))}</p></div><button class="tiny-btn" data-action="go" data-screen="calendar">戻る</button></div>
        <div class="tabs">${tab('summary','概要')}${tab('prep',`準備${e.prep.filter(p=>!p.done).length}`)}${tab('records',`記録${e.records.length}`)}${tab('improve',`改善${e.improvements.length}`)}${tab('edit','編集')}</div>
        ${detailBody(e)}
      </main>
    `);
  }
  function tab(k,l){ return `<button class="${state.tab===k?'active':''}" data-action="tab" data-tab="${k}">${l}</button>`; }
  function detailBody(e){
    if(state.tab==='prep') return `<section class="section"><div class="section-title"><h2>準備</h2><button class="pill green" data-action="openAddForEvent" data-mode="prep" data-id="${esc(e.id)}">追加</button></div><div class="stack">${e.prep.length?e.prep.map(p=>`<div class="row flat"><span class="row-main"><strong>${esc(p.text)}</strong><small>${esc(p.group||'準備')}</small></span><button class="chip ${p.done?'green':'warn'}" data-action="togglePrep" data-event-id="${esc(e.id)}" data-id="${esc(p.id)}">${p.done?'済':'未'}</button></div>`).join(''):`<div class="empty">準備はありません。</div>`}</div></section>`;
    if(state.tab==='records') return `<section class="section"><div class="section-title"><h2>記録</h2><button class="pill green" data-action="openAddForEvent" data-mode="onsite" data-id="${esc(e.id)}">追加</button></div><div class="stack">${e.records.length?e.records.map(r=>`<article class="card"><div class="row-main"><strong>${esc(r.entry||'メモ')}</strong><small>${esc(r.date||'')} ${esc(r.time||'')}${r.location?' / '+esc(r.location):''}</small><p>${esc(r.text||'')}</p></div><div class="btn-row"><button class="btn" data-action="recordToImprove" data-event-id="${esc(e.id)}" data-id="${esc(r.id)}">改善へ</button></div></article>`).join(''):`<div class="empty">記録はありません。</div>`}</div></section>`;
    if(state.tab==='improve') return `<section class="section"><div class="section-title"><h2>改善</h2><button class="pill green" data-action="addImprove" data-event-id="${esc(e.id)}">追加</button></div><div class="stack">${e.improvements.length?e.improvements.map(im=>`<div class="row flat"><span class="row-main"><strong>${esc(im.text)}</strong><small>${esc(im.date||'')}</small></span><button class="chip ${im.done?'green':'warn'}" data-action="toggleImprove" data-event-id="${esc(e.id)}" data-id="${esc(im.id)}">${im.done?'反映':'未'}</button></div>`).join(''):`<div class="empty">改善はありません。</div>`}</div></section>`;
    if(state.tab==='edit') return `<form class="form-card" data-edit-event data-id="${esc(e.id)}"><input name="title" value="${esc(e.title)}"><div class="form-grid"><input name="startDate" type="date" value="${esc(e.startDate)}"><input name="endDate" type="date" value="${esc(e.endDate)}"></div><div class="form-grid"><select name="type">${Object.keys(labels).map(t=>`<option value="${t}" ${e.type===t?'selected':''}>${labels[t]}</option>`).join('')}</select><select name="level">${[1,2,3,4].map(n=>`<option value="${n}" ${Number(e.level)===n?'selected':''}>Lv.${n} ${levelLabel(n)}</option>`).join('')}</select></div><input name="location" value="${esc(e.location)}" placeholder="場所"><textarea name="memo">${esc(e.memo)}</textarea><button class="btn primary" type="submit">更新</button></form>`;
    return `<section class="hero"><div class="row-main"><strong>${esc(e.location||'場所未定')}</strong><small>${esc(dateLabel(e))}</small>${e.memo?`<p>${esc(e.memo)}</p>`:''}</div><div class="btn-row"><button class="btn primary" data-action="openAddForEvent" data-mode="prep" data-id="${esc(e.id)}">準備</button><button class="btn primary" data-action="openAddForEvent" data-mode="onsite" data-id="${esc(e.id)}">現地</button><button class="btn" data-action="openAddForEvent" data-mode="memo" data-id="${esc(e.id)}">メモ</button></div></section>`;
  }

  function renderMore(){
    const records=state.events.reduce((a,e)=>a+e.records.length,0);
    layout(`<main class="screen active"><div class="page-head"><div><h1>控え</h1><p>ローカル保存。Google連携は後工程。</p></div></div><section class="section stack"><button class="row" data-action="copyBackup"><span class="row-main"><strong>バックアップをコピー</strong><small>予定 ${state.events.length} / 記録 ${records}</small></span><span class="chip">コピー</span></button><button class="row" data-action="importBackup"><span class="row-main"><strong>読み込む</strong><small>控えから復旧</small></span><span class="chip">復旧</span></button><button class="row" data-action="copyStatus"><span class="row-main"><strong>状態コピー</strong><small>確認用</small></span><span class="chip">状態</span></button></section></main>`);
  }

  function renderAddScreen(){
    layout(`<main class="screen active"><div class="page-head"><div><h1>追加</h1><p>予定・準備・現地・実績・メモ。</p></div></div>${addForm()}</main>`);
  }

  function render(){
    state=normalize(state);
    if(state.screen==='calendar') return renderCalendar();
    if(state.screen==='add') return renderAddScreen();
    if(state.screen==='checks') return renderChecks();
    if(state.screen==='detail') return renderDetail();
    if(state.screen==='more') return renderMore();
    return renderHome();
  }

  async function copy(text,msg){ try{ await navigator.clipboard.writeText(text); toast(msg||'コピーしました'); }catch(e){ prompt('コピーしてください',text); } }

  document.addEventListener('submit', e=>{
    const add=e.target.closest('[data-add-form]');
    if(add){ e.preventDefault(); return submitAdd(add); }
    const edit=e.target.closest('[data-edit-event]');
    if(edit){ e.preventDefault(); const ev=state.events.find(x=>x.id===edit.dataset.id); if(!ev) return; const data=Object.fromEntries(new FormData(edit).entries()); Object.assign(ev,{title:data.title||ev.title,type:data.type||ev.type,level:Number(data.level||ev.level),startDate:data.startDate||ev.startDate,endDate:data.endDate||data.startDate||ev.endDate,location:data.location||'',memo:data.memo||''}); save(); toast('更新しました'); return; }
  });

  document.addEventListener('click', e=>{
    const el=e.target.closest('[data-action]'); if(!el) return; const a=el.dataset.action;
    if(a==='go') return go(el.dataset.screen);
    if(a==='openAdd') return openAdd(el.dataset.mode||'event');
    if(a==='closeAdd') return closeAdd();
    if(a==='setAddMode'){ state.addMode=el.dataset.mode||'event'; save(); const open=!!document.querySelector('[data-add-sheet]')?.classList.contains('show'); render(); if(open){document.querySelector('[data-sheet-backdrop]')?.classList.add('show');document.querySelector('[data-add-sheet]')?.classList.add('show');} return; }
    if(a==='moveMonth'){ const [y,m]=state.month.split('-').map(Number); const d=new Date(y,m-1+Number(el.dataset.delta||0),1); state.month=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; save(); return renderCalendar(); }
    if(a==='selectDate'){ state.selectedDate=el.dataset.date; save(); return renderCalendar(); }
    if(a==='openEvent'){ state.activeEventId=el.dataset.id; state.tab='summary'; state.screen='detail'; save(); return renderDetail(); }
    if(a==='tab'){ state.tab=el.dataset.tab||'summary'; save(); return renderDetail(); }
    if(a==='openAddForEvent'){ state.activeEventId=el.dataset.id||state.activeEventId; openAdd(el.dataset.mode||'memo'); const sel=document.querySelector('[data-add-form] select[name="eventId"]'); if(sel) sel.value=state.activeEventId; return; }
    if(a==='togglePrep'){ const ev=state.events.find(x=>x.id===el.dataset.eventId); const p=ev?.prep.find(x=>x.id===el.dataset.id); if(p) p.done=!p.done; save(); return renderDetail(); }
    if(a==='addImprove'){ const ev=state.events.find(x=>x.id===el.dataset.eventId); const text=prompt('改善メモ','次回に活かす'); if(ev&&text){ev.improvements.unshift({id:uid('imp'),text,done:false,date:today()});save();renderDetail();} return; }
    if(a==='toggleImprove'){ const ev=state.events.find(x=>x.id===el.dataset.eventId); const im=ev?.improvements.find(x=>x.id===el.dataset.id); if(im) im.done=!im.done; save(); return renderDetail(); }
    if(a==='recordToImprove'){ const ev=state.events.find(x=>x.id===el.dataset.eventId); const rec=ev?.records.find(x=>x.id===el.dataset.id); if(ev&&rec){ev.improvements.unshift({id:uid('imp'),text:rec.text.slice(0,120),done:false,date:today()});state.tab='improve';save();toast('改善へ追加');} return; }
    if(a==='attachCheck') return attachCheck(el.dataset.id,el.dataset.eventId);
    if(a==='makeCheckEvent') return makeCheckEvent(el.dataset.id);
    if(a==='deleteCheck'){ const c=state.checks.find(x=>x.id===el.dataset.id); if(c) state.trash.unshift(c); state.checks=state.checks.filter(x=>x.id!==el.dataset.id); save(); return toast('削除控えへ'); }
    if(a==='copyBackup') return copy(JSON.stringify({...state,toast:''},null,2),'バックアップをコピー');
    if(a==='importBackup'){ const raw=prompt('バックアップを貼り付け'); if(!raw) return; try{state=normalize(JSON.parse(raw));save();toast('読み込みました');}catch(err){toast('読み込めません');} return; }
    if(a==='copyStatus') return copy(`OUTBASE v145\n予定:${state.events.length}\n要確認:${state.checks.length}`,'状態をコピー');
  });

  render();
})();
