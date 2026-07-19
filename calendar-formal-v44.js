
(() => {
  'use strict';
  const EVENT_KEY='outbase_calendar_complete_v3_events';
  const TODO_KEY='outbase_calendar_complete_v3_todos';
  const CALENDAR_KEY='outbase_calendar_custom_types_v1';
  const UI_STATE_KEY='outbase_calendar_ui_state_v1';
  const pad=n=>String(n).padStart(2,'0');
  const key=d=>{const x=new Date(d);return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`};
  const uid=()=>crypto.randomUUID?.()||`ob-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  const DEFAULT_CALENDARS=[
    {id:'activity',name:'活動',color:'#d9b07c',system:true},
    {id:'camp',name:'キャンプ',color:'#b58acb',system:true},
    {id:'walk',name:'散歩',color:'#5f9b78',system:true},
    {id:'family',name:'家族',color:'#d47f86',system:true},
    {id:'work',name:'仕事',color:'#6f8fb8',system:true},
    {id:'personal',name:'個人',color:'#8d8178',system:true}
  ];
  let calendars=DEFAULT_CALENDARS.map(x=>({...x}));
  const people=['むー','リン','コタ','アオ','エラ','ユキ'];
  const sampleEvents=[
    {id:'camp1',title:'湖畔キャンプ',start:'2026-07-20T10:00',end:'2026-07-22T12:00',allDay:false,calendarId:'camp',participants:['むー','リン','コタ'],place:'湖畔キャンプ場',memo:'',repeat:{freq:'none',interval:1,until:''},reminders:['1d']},
    {id:'walk1',title:'コタと公園散歩',start:'2026-07-27T08:00',end:'2026-07-27T09:30',allDay:false,calendarId:'walk',participants:['コタ'],place:'公園',memo:'',repeat:{freq:'none',interval:1,until:''},reminders:['10m']}
  ];
  const sampleTodos=[
    {id:'todo1',title:'キャンプ食材を確認',due:'2026-07-19',done:false,calendarId:'camp',participants:['むー','リン']}
  ];
  let uiStateLoaded=false;
  const state={date:new Date(),selected:key(new Date()),view:'month',filters:new Set(calendars.map(c=>c.id)),people:new Set(people),editing:null};
  function readUiState(){
    try{
      const saved=JSON.parse(sessionStorage.getItem(UI_STATE_KEY)||localStorage.getItem(UI_STATE_KEY)||'null');
      if(!saved||typeof saved!=='object')return;
      uiStateLoaded=true;
      if(saved.month&&/^\d{4}-\d{2}$/.test(saved.month)){
        const [y,m]=saved.month.split('-').map(Number);
        state.date=new Date(y,m-1,1,12);
      }
      if(saved.selected&&/^\d{4}-\d{2}-\d{2}$/.test(saved.selected))state.selected=saved.selected;
      if(['month','week','day','list','todo'].includes(saved.view))state.view=saved.view;
      if(Array.isArray(saved.filters))state.filters=new Set(saved.filters);
      if(Array.isArray(saved.people))state.people=new Set(saved.people);
      if(saved.agendaOpen===false)document.addEventListener('DOMContentLoaded',()=>$('#agendaSection')?.classList.add('collapsed'),{once:true});
    }catch(_error){}
  }
  function writeUiState(){
    const value={
      month:`${state.date.getFullYear()}-${pad(state.date.getMonth()+1)}`,
      selected:state.selected,
      view:state.view,
      filters:[...state.filters],
      people:[...state.people],
      agendaOpen:!$('#agendaSection')?.classList.contains('collapsed')
    };
    try{sessionStorage.setItem(UI_STATE_KEY,JSON.stringify(value));localStorage.setItem(UI_STATE_KEY,JSON.stringify(value));}catch(_error){}
    try{
      parent?.postMessage?.({type:'OUTBASE_CALENDAR_STATE',value},location.origin);
    }catch(_error){}
  }
  function applyRouteState(){
    const query=new URLSearchParams(location.search);
    const month=query.get('month');
    const selected=query.get('selected');
    const peopleParam=query.get('people');
    if(month&&/^\d{4}-\d{2}$/.test(month)){
      const [y,m]=month.split('-').map(Number);
      state.date=new Date(y,m-1,1,12);
    }
    if(selected&&/^\d{4}-\d{2}-\d{2}$/.test(selected))state.selected=selected;
    if(peopleParam)state.people=new Set(peopleParam.split(',').filter(Boolean));
  }
  readUiState();
  applyRouteState();

  function read(keyName,fallback){try{const v=JSON.parse(localStorage.getItem(keyName)||'null');return Array.isArray(v)?v:fallback}catch(_){return fallback}}
  calendars=read(CALENDAR_KEY,calendars).map((c,i)=>{
    const fallback=DEFAULT_CALENDARS.find(x=>x.id===c.id);
    return {...c,color:c.color||fallback?.color||['#b58acb','#5f9b78','#d47f86','#6f8fb8','#d9b07c','#8d8178'][i%6],system:Boolean(fallback?.system||c.system)};
  });
  if(uiStateLoaded){
    state.filters=new Set([...state.filters].filter(id=>calendars.some(c=>c.id===id)));
  }else{
    state.filters=new Set(calendars.map(c=>c.id));
  }
  function saveCalendars(v){calendars=v;localStorage.setItem(CALENDAR_KEY,JSON.stringify(v))}
  function calStyle(id){
    const color=cal(id)?.color||'#8d8178';
    return `--event-color:${color};--event-soft:${color}22;--event-line:${color}99`;
  }
  function events(){return read(EVENT_KEY,sampleEvents)} function saveEvents(v){localStorage.setItem(EVENT_KEY,JSON.stringify(v))}
  function todos(){return read(TODO_KEY,sampleTodos)} function saveTodos(v){localStorage.setItem(TODO_KEY,JSON.stringify(v))}
  function cal(id){return calendars.find(c=>c.id===id)||calendars[0]}
  function activeEvent(e){return state.filters.has(e.calendarId)&&(!e.participants?.length||e.participants.some(p=>state.people.has(p)))}
  function startDay(e){return key(e.start)} function endDay(e){return key(e.end||e.start)} function multi(e){return startDay(e)!==endDay(e)}
  function occurs(e,k){return k>=startDay(e)&&k<=endDay(e)}
  function localDateTime(d){return `${key(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`}
  function addRepeatDate(value,freq,interval){
    const d=new Date(value);
    const step=Math.max(1,Number(interval)||1);
    if(freq==='daily')d.setDate(d.getDate()+step);
    if(freq==='weekly')d.setDate(d.getDate()+7*step);
    if(freq==='monthly'){
      const day=d.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth()+step);
      const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
      d.setDate(Math.min(day,last));
    }
    if(freq==='yearly'){
      const month=d.getMonth(),day=d.getDate();
      d.setDate(1);
      d.setFullYear(d.getFullYear()+step);
      d.setMonth(month);
      const last=new Date(d.getFullYear(),month+1,0).getDate();
      d.setDate(Math.min(day,last));
    }
    return d;
  }
  function eventOccurrencesForRange(event,rangeStartKey,rangeEndKey){
    const rangeStart=new Date(rangeStartKey+'T00:00');
    const rangeEnd=new Date(rangeEndKey+'T23:59:59');
    const baseStart=new Date(event.start);
    const baseEnd=new Date(event.end||event.start);
    const duration=Math.max(0,baseEnd-baseStart);
    const repeat=event.repeat||{freq:'none',interval:1,until:''};
    const makeOccurrence=start=>{
      const end=new Date(start.getTime()+duration);
      return {...event,_sourceId:event.id,start:localDateTime(start),end:localDateTime(end)};
    };
    if(!repeat.freq||repeat.freq==='none'){
      return baseEnd>=rangeStart&&baseStart<=rangeEnd?[makeOccurrence(baseStart)]:[];
    }
    const result=[];
    const until=repeat.until?new Date(repeat.until+'T23:59:59'):null;
    let cursor=new Date(baseStart);
    for(let guard=0;guard<1000;guard++){
      if(cursor>rangeEnd)break;
      if(until&&cursor>until)break;
      const occurrence=makeOccurrence(cursor);
      if(new Date(occurrence.end)>=rangeStart&&new Date(occurrence.start)<=rangeEnd)result.push(occurrence);
      const next=addRepeatDate(cursor,repeat.freq,repeat.interval);
      if(next<=cursor)break;
      cursor=next;
    }
    return result;
  }
  function eventsForRange(startKeyValue,endKeyValue){
    return events().filter(activeEvent)
      .flatMap(event=>eventOccurrencesForRange(event,startKeyValue,endKeyValue))
      .sort((a,b)=>a.start.localeCompare(b.start));
  }
  function dayEvents(k){return eventsForRange(k,k)}
  function fmtDate(k){const d=new Date(k+'T12:00');return `${d.getMonth()+1}月${d.getDate()}日（${'日月火水木金土'[d.getDay()]}）`}
  function fmtRange(e){const s=new Date(e.start),t=new Date(e.end||e.start);if(e.allDay)return `${s.getMonth()+1}/${s.getDate()} 終日`;return key(s)===key(t)?`${s.getMonth()+1}/${s.getDate()} ${pad(s.getHours())}:${pad(s.getMinutes())}〜${pad(t.getHours())}:${pad(t.getMinutes())}`:`${s.getMonth()+1}/${s.getDate()} ${pad(s.getHours())}:${pad(s.getMinutes())}〜${t.getMonth()+1}/${t.getDate()} ${pad(t.getHours())}:${pad(t.getMinutes())}`}
  function cells(){const y=state.date.getFullYear(),m=state.date.getMonth(),f=new Date(y,m,1),s=new Date(y,m,1-f.getDay());return Array.from({length:42},(_,i)=>{const d=new Date(s);d.setDate(s.getDate()+i);return d})}


  function monthWeeks(){
    const all=cells();
    return Array.from({length:6},(_,i)=>all.slice(i*7,i*7+7));
  }

  function weekBars(days){
    const weekStart=key(days[0]),weekEnd=key(days[6]);
    const candidates=eventsForRange(weekStart,weekEnd).filter(multi)
      .filter(e=>endDay(e)>=weekStart&&startDay(e)<=weekEnd)
      .sort((a,b)=>startDay(a).localeCompare(startDay(b))||endDay(b).localeCompare(endDay(a)));

    const occupied=[Array(7).fill(false),Array(7).fill(false)];
    const bars=[];
    for(const event of candidates){
      const visibleStart=startDay(event)<weekStart?weekStart:startDay(event);
      const visibleEnd=endDay(event)>weekEnd?weekEnd:endDay(event);
      const startCol=Math.max(0,Math.round((new Date(visibleStart+'T12:00')-new Date(weekStart+'T12:00'))/86400000));
      const endCol=Math.min(6,Math.round((new Date(visibleEnd+'T12:00')-new Date(weekStart+'T12:00'))/86400000));
      let lane=occupied.findIndex(row=>row.slice(startCol,endCol+1).every(v=>!v));
      if(lane<0)continue;
      for(let c=startCol;c<=endCol;c++)occupied[lane][c]=true;
      bars.push({
        event,startCol,endCol,lane,
        showTitle:startDay(event)>=weekStart
      });
    }
    return bars;
  }

  function activeFilterLabel(){
    const calCount=state.filters.size;
    const peopleCount=state.people.size;
    if(calCount===calendars.length&&peopleCount===people.length)return '全件';
    return `${calCount}種・${peopleCount}人`;
  }

  let embeddedHeightObserver=null;
  let embeddedHeightFrame=0;

  function reportEmbeddedHeight(){
    if(!document.documentElement.classList.contains('outbaseCalendarEmbedded'))return;
    cancelAnimationFrame(embeddedHeightFrame);
    embeddedHeightFrame=requestAnimationFrame(()=>{
      const shell=$('.calendar-shell');
      if(!shell)return;
      const height=Math.ceil(shell.scrollHeight + shell.offsetTop + 2);
      try{
        parent.postMessage({
          type:'OUTBASE_CALENDAR_RESIZE',
          height
        },location.origin);
      }catch(_error){}
    });
  }

  function bindEmbeddedHeightObserver(){
    if(!document.documentElement.classList.contains('outbaseCalendarEmbedded'))return;
    const shell=$('.calendar-shell');
    if(!shell||embeddedHeightObserver)return;
    if('ResizeObserver' in window){
      embeddedHeightObserver=new ResizeObserver(()=>reportEmbeddedHeight());
      embeddedHeightObserver.observe(shell);
    }
    addEventListener('load',reportEmbeddedHeight,{once:true});
    document.fonts?.ready?.then(reportEmbeddedHeight).catch(()=>{});
  }

  function render(){
    $('#periodLabel').textContent=state.view==='day'?fmtDate(state.selected):`${state.date.getFullYear()}年${state.date.getMonth()+1}月`;
    $('#selectedLabel').textContent=fmtDate(state.selected);
    $('#filterCount').textContent=activeFilterLabel();
    $$('.view-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));
    $('#agendaSection').classList.toggle('hidden',state.view==='todo');
    const collapsed=$('#agendaSection').classList.contains('collapsed');
    $('#agendaToggle')?.setAttribute('aria-expanded',String(!collapsed));
    $('#prevBtn').disabled=state.view==='todo';
    $('#nextBtn').disabled=state.view==='todo';
    $('#calendarArea').innerHTML=state.view==='month'?renderMonth():state.view==='week'?renderWeek():state.view==='day'?renderDay():state.view==='list'?renderList():renderTodo();
    renderAgenda();renderFilters();bind();writeUiState();
    bindEmbeddedHeightObserver();
    reportEmbeddedHeight();
  }

  function renderMonth(){
    const cur=state.date.getMonth(),today=key(new Date());
    const weekHtml=monthWeeks().map(days=>{
      const bars=weekBars(days);
      const barCounts=Array(7).fill(0);
      bars.forEach(bar=>{for(let c=bar.startCol;c<=bar.endCol;c++)barCounts[c]++});
      const cellsHtml=days.map((d,index)=>{
        const k=key(d),rows=dayEvents(k);
        const singles=rows.filter(e=>!multi(e));
        const visibleLimit=barCounts[index]>=2?1:barCounts[index]===1?2:3;
        return `<button class="day-cell ${d.getMonth()!==cur?'outside':''} ${k===state.selected?'selected':''} ${k===today?'today':''} ${barCounts[index]>=2?'has-two-bars':''}" data-date="${k}">
          <strong>${d.getDate()}</strong>
          <span class="day-cell-events">
            ${singles.slice(0,visibleLimit).map(e=>`<span class="cell-event tone-${esc(e.calendarId)}" style="${calStyle(e.calendarId)}">${esc(e.title)}</span>`).join('')}
            ${singles.length>visibleLimit?`<span class="cell-event cell-more">ほか${singles.length-visibleLimit}件</span>`:''}
          </span>
        </button>`;
      }).join('');
      const barsHtml=bars.map(bar=>`<span class="week-bar tone-${esc(bar.event.calendarId)}" style="grid-column:${bar.startCol+1}/${bar.endCol+2};grid-row:${bar.lane+1};${calStyle(bar.event.calendarId)}" title="${esc(bar.event.title)}">${bar.showTitle?esc(bar.event.title):''}</span>`).join('');
      return `<div class="month-week">${cellsHtml}<div class="week-bars">${barsHtml}</div></div>`;
    }).join('');
    return `<section class="calendar-card"><div class="weekdays">${[...'日月火水木金土'].map(x=>`<span>${x}</span>`).join('')}</div><div class="month-grid">${weekHtml}</div></section>`;
  }
  function renderWeek(){const b=new Date(state.selected+'T12:00');b.setDate(b.getDate()-b.getDay());const ds=Array.from({length:7},(_,i)=>{const d=new Date(b);d.setDate(b.getDate()+i);return d});return `<section class="week-view"><h2>${ds[0].getMonth()+1}/${ds[0].getDate()}〜${ds[6].getMonth()+1}/${ds[6].getDate()}</h2><div class="week-columns">${ds.map(d=>{const k=key(d),r=dayEvents(k);return `<div class="week-col"><button data-date="${k}">${fmtDate(k)}</button>${r.map(eventCard).join('')||'<p>予定なし</p>'}</div>`}).join('')}</div></section>`}
  function renderDay(){const r=dayEvents(state.selected);return `<section class="day-view"><h2>${fmtDate(state.selected)}</h2>${r.map(eventCard).join('')||'<div class="empty">予定なし</div>'}</section>`}
  function renderList(){
    const y=state.date.getFullYear(),m=state.date.getMonth();
    const first=key(new Date(y,m,1,12));
    const last=key(new Date(y,m+1,0,12));
    const r=eventsForRange(first,last);
    return `<section class="list-view"><div class="section-title"><h2>${y}年${m+1}月の予定</h2></div>${r.map(eventCard).join('')||'<div class="empty">予定なし</div>'}</section>`;
  }
  function renderTodo(){
    const r=todos().filter(t=>state.filters.has(t.calendarId));
    return `<section class="todo-view"><div class="section-title"><h2>ToDo</h2><button id="addTodoBtn" type="button">＋</button></div>${r.map(todoCard).join('')||'<div class="empty">ToDoはありません</div>'}</section>`;
  }
  function eventCard(e){return `<article class="event-card" data-id="${esc(e._sourceId||e.id)}"><h3>${esc(e.title)}</h3><p>${esc(fmtRange(e))}</p>${e.place?`<p>${esc(e.place)}</p>`:''}<div class="badges"><span class="badge" style="${calStyle(e.calendarId)}">${esc(cal(e.calendarId).name)}</span>${e.repeat?.freq!=='none'?'<span class="badge">繰返</span>':''}${e.reminders?.length?'<span class="badge">通知</span>':''}</div></article>`}
  function todoCard(t){return `<article class="todo-card" data-id="${esc(t.id)}"><h3>${t.done?'✓ ':''}${esc(t.title)}</h3><p>期限 ${esc(t.due||'未設定')}</p><div class="badges"><span class="badge">${esc(cal(t.calendarId).name)}</span></div></article>`}
  function renderAgenda(){const r=dayEvents(state.selected);$('#agendaList').innerHTML=r.length?r.map(eventCard).join(''):'<div class="empty">この日の予定はありません。</div>'}
  function renderFilters(){
    $('#filterPanel').innerHTML=`<h3>予定の種類</h3><div class="filter-grid">${calendars.map(c=>`<button class="chip ${state.filters.has(c.id)?'active':''}" data-cal-filter="${c.id}">${c.name}</button>`).join('')}</div><h3>家族・ペット</h3><div class="filter-grid">${people.map(p=>`<button class="chip ${state.people.has(p)?'active':''}" data-person-filter="${p}">${['コタ','アオ','エラ','ユキ'].includes(p)?'🐾 ':''}${p}</button>`).join('')}</div>`;
  }

  function modal(eyebrow,title,body){
    $('#sheetEyebrow').textContent=eyebrow;
    $('#sheetTitle').textContent=title;
    $('#sheetBody').innerHTML=body;
    $('#modal').classList.remove('hidden');
    const sheet=$('#modalSheet');
    if(sheet){sheet.style.transform='';sheet.style.transition=''}
    bindSheetSwipe();
    reportEmbeddedHeight();
  }
  function close(){
    $('#modal').classList.add('hidden');
    const sheet=$('#modalSheet');
    if(sheet){sheet.style.transform='';sheet.style.transition=''}
    state.editing=null;
    reportEmbeddedHeight();
  }
  function bindSheetSwipe(){
    const sheet=$('#modalSheet');
    if(!sheet||sheet.dataset.swipeBound==='1')return;
    sheet.dataset.swipeBound='1';
    let startY=0,delta=0,tracking=false;
    sheet.addEventListener('touchstart',event=>{
      if(sheet.scrollTop>0)return;
      startY=event.touches[0].clientY;
      delta=0;tracking=true;
      sheet.style.transition='none';
    },{passive:true});
    sheet.addEventListener('touchmove',event=>{
      if(!tracking)return;
      delta=Math.max(0,event.touches[0].clientY-startY);
      if(delta>0)sheet.style.transform=`translateY(${Math.min(delta,180)}px)`;
    },{passive:true});
    sheet.addEventListener('touchend',()=>{
      if(!tracking)return;
      tracking=false;
      sheet.style.transition='transform .22s ease';
      if(delta>=90){
        sheet.style.transform='translateY(100%)';
        setTimeout(close,190);
      }else{
        sheet.style.transform='';
      }
    },{passive:true});
  }

  function bind(){
    let tapTimer=0;
    let lastTapAt=0;
    let lastTapDate='';

    $$('.day-cell[data-date]').forEach(cell=>{
      cell.addEventListener('click',event=>{
        event.preventDefault();
        const date=cell.dataset.date;
        const now=Date.now();
        const doubleTap=lastTapDate===date&&(now-lastTapAt)<=360;
        clearTimeout(tapTimer);

        if(doubleTap){
          lastTapAt=0;
          lastTapDate='';
          state.selected=date;
          state.date=new Date(date+'T12:00');
          render();
          setTimeout(()=>openEvent(null,date),0);
          return;
        }

        lastTapAt=now;
        lastTapDate=date;
        tapTimer=setTimeout(()=>{
          state.selected=date;
          const selectedDate=new Date(date+'T12:00');
          if(selectedDate.getMonth()!==state.date.getMonth()||selectedDate.getFullYear()!==state.date.getFullYear()){
            state.date=selectedDate;
          }
          render();
        },260);
      });
    });

    $$('[data-date]:not(.day-cell)').forEach(button=>button.addEventListener('click',()=>{
      const date=button.dataset.date;
      state.selected=date;
      state.date=new Date(date+'T12:00');
      render();
    }));

    $$('.event-card[data-id]').forEach(card=>card.addEventListener('click',()=>openEvent(card.dataset.id)));
    $$('.todo-card[data-id]').forEach(card=>card.addEventListener('click',()=>openTodo(card.dataset.id)));
    $('#addTodoBtn')?.addEventListener('click',()=>openTodo());

    $$('[data-cal-filter]').forEach(button=>button.addEventListener('click',()=>{
      const id=button.dataset.calFilter;
      state.filters.has(id)?state.filters.delete(id):state.filters.add(id);
      render();
    }));

    $$('[data-person-filter]').forEach(button=>button.addEventListener('click',()=>{
      const name=button.dataset.personFilter;
      state.people.has(name)?state.people.delete(name):state.people.add(name);
      render();
    }));
  }

  function openEvent(id,forcedDate){
    const e=id?events().find(x=>x.id===id):null;
    const base=forcedDate||state.selected;
    state.editing=e?.id||null;
    const selectedParticipants=new Set(e?.participants||[]);
    const selectedCalendar=e?.calendarId||calendars[0]?.id||'activity';
    const startValue=e?.start||base+'T09:00';
    const endValue=e?.end||base+'T10:00';

    modal('予定',e?'予定を編集':fmtDate(base),`
      <form id="eventForm" class="event-editor balanced-event-editor">
        <input type="hidden" name="id" value="${esc(e?.id||'')}">
        <input type="hidden" name="calendarId" value="${esc(selectedCalendar)}">
        <input type="hidden" name="participants" value="${esc((e?.participants||[]).join('、'))}">

        <label class="balanced-title">
          <span>予定名</span>
          <input name="title" required autofocus autocomplete="off" value="${esc(e?.title||'')}" placeholder="予定名を入力">
        </label>

        <section class="balanced-date">
          <label><span>開始</span><input type="datetime-local" name="start" required value="${esc(startValue)}"></label>
          <label><span>終了</span><input type="datetime-local" name="end" required value="${esc(endValue)}"></label>
          <label class="balanced-all-day"><input type="checkbox" name="allDay" ${e?.allDay?'checked':''}><span>終日</span></label>
        </section>

        <fieldset class="editor-chip-group">
          <legend>種類</legend>
          <div class="editor-chips" data-calendar-chips>
            ${calendars.map(c=>`<button type="button" class="editor-chip ${selectedCalendar===c.id?'active':''}" data-calendar-value="${c.id}" style="--chip-color:${c.color||'#8d8178'}">${esc(c.name)}</button>`).join('')}
            <button type="button" class="editor-chip editor-chip-add" id="addCalendarType">＋ 種類追加</button>
          </div>
          <details class="type-manager">
            <summary>種類の色・削除を管理</summary>
            <div class="type-manager-list">
              ${calendars.map(c=>`<div class="type-manager-row" data-type-row="${c.id}">
                <input class="type-color-input" type="color" value="${c.color||'#8d8178'}" data-type-color="${c.id}" aria-label="${esc(c.name)}の色">
                <span>${esc(c.name)}</span>
                ${c.system?'<small>標準</small>':`<button type="button" class="type-delete" data-type-delete="${c.id}">削除</button>`}
              </div>`).join('')}
            </div>
          </details>
        </fieldset>

        <fieldset class="editor-chip-group">
          <legend>参加者</legend>
          <div class="editor-chips" data-participant-chips>
            ${people.map(p=>`<button type="button" class="editor-chip ${selectedParticipants.has(p)?'active':''}" data-participant-value="${esc(p)}">${['コタ','アオ','エラ','ユキ'].includes(p)?'🐾 ':''}${esc(p)}</button>`).join('')}
          </div>
        </fieldset>

        <label><span>場所</span><input name="place" value="${esc(e?.place||'')}" placeholder="場所"></label>
        <label><span>メモ</span><textarea name="memo" rows="3" placeholder="メモ">${esc(e?.memo||'')}</textarea></label>

        <details class="editor-advanced">
          <summary>通知・繰り返し</summary>
          <div class="editor-advanced-body">
            <label><span>通知</span><select name="reminder">
              <option value="">なし</option><option value="10m">10分前</option>
              <option value="1h">1時間前</option><option value="1d">1日前</option>
            </select></label>
            <label><span>繰り返し</span><select name="freq">
              <option value="none">なし</option><option value="daily">毎日</option>
              <option value="weekly">毎週</option><option value="monthly">毎月</option>
              <option value="yearly">毎年</option>
            </select></label>
            <div class="form-grid two">
              <label><span>間隔</span><input type="number" min="1" name="interval" value="${e?.repeat?.interval||1}"></label>
              <label><span>繰り返し終了</span><input type="date" name="until" value="${esc(e?.repeat?.until||'')}"></label>
            </div>
          </div>
        </details>

        <div class="balanced-actions">
          ${e?'<button type="button" id="deleteEvent" class="danger">削除</button><button type="button" id="duplicateEvent">複製</button>':''}
          <button type="submit" class="primary">保存</button>
        </div>
      </form>
    `);

    const f=$('#eventForm');
    if(e){
      f.freq.value=e.repeat?.freq||'none';
      f.reminder.value=e.reminders?.[0]||'';
    }

    $$('[data-calendar-value]').forEach(button=>button.addEventListener('click',()=>{
      $$('[data-calendar-value]').forEach(x=>x.classList.remove('active'));
      button.classList.add('active');
      f.calendarId.value=button.dataset.calendarValue;
    }));

    $('#addCalendarType')?.addEventListener('click',()=>{
      const name=prompt('追加する種類名');
      if(!name?.trim())return;
      const clean=name.trim();
      const exists=calendars.find(c=>c.name===clean);
      if(exists){
        f.calendarId.value=exists.id;
        $$('[data-calendar-value]').forEach(x=>x.classList.toggle('active',x.dataset.calendarValue===exists.id));
        return;
      }
      const item={id:`custom-${Date.now().toString(36)}`,name:clean,color:'#8d8178',system:false};
      saveCalendars([...calendars,item]);
      state.filters.add(item.id);
      f.calendarId.value=item.id;
      const button=document.createElement('button');
      button.type='button';
      button.className='editor-chip active';
      button.dataset.calendarValue=item.id;
      button.textContent=item.name; button.style.setProperty('--chip-color',item.color);
      $$('[data-calendar-value]').forEach(x=>x.classList.remove('active'));
      $('#addCalendarType').before(button);
      button.addEventListener('click',()=>{
        $$('[data-calendar-value]').forEach(x=>x.classList.remove('active'));
        button.classList.add('active');
        f.calendarId.value=item.id;
      });
    });

    $$('[data-type-color]').forEach(input=>input.addEventListener('input',()=>{
      const id=input.dataset.typeColor;
      const next=calendars.map(c=>c.id===id?{...c,color:input.value}:c);
      saveCalendars(next);
      $$(`[data-calendar-value="${id}"]`).forEach(button=>button.style.setProperty('--chip-color',input.value));
    }));

    $$('[data-type-delete]').forEach(button=>button.addEventListener('click',()=>{
      const id=button.dataset.typeDelete;
      const target=calendars.find(c=>c.id===id);
      if(!target||target.system)return;
      if(events().some(e=>e.calendarId===id)){
        alert('この種類を使っている予定があります。先に予定の種類を変更してください。');
        return;
      }
      if(!confirm(`「${target.name}」を削除しますか？`))return;
      saveCalendars(calendars.filter(c=>c.id!==id));
      state.filters.delete(id);
      if(f.calendarId.value===id){
        f.calendarId.value=calendars[0]?.id||'activity';
      }
      button.closest('[data-type-row]')?.remove();
      $$(`[data-calendar-value="${id}"]`).forEach(x=>x.remove());
    }));

    $$('[data-participant-value]').forEach(button=>button.addEventListener('click',()=>{
      button.classList.toggle('active');
      f.participants.value=$$('[data-participant-value].active').map(x=>x.dataset.participantValue).join('、');
    }));

    f.onsubmit=ev=>{
      ev.preventDefault();
      const fd=new FormData(f),rows=events(),rid=fd.get('id')||uid();
      const row={
        id:rid,title:String(fd.get('title')||'').trim(),
        start:fd.get('start')||base+'T09:00',
        end:fd.get('end')||base+'T10:00',
        allDay:fd.get('allDay')==='on',
        calendarId:fd.get('calendarId')||calendars[0]?.id||'activity',
        participants:String(fd.get('participants')||'').split(/[、,]/).map(x=>x.trim()).filter(Boolean),
        place:fd.get('place')||'',memo:fd.get('memo')||'',
        repeat:{freq:fd.get('freq')||'none',interval:Number(fd.get('interval')||1),until:fd.get('until')||''},
        reminders:fd.get('reminder')?[fd.get('reminder')]:[]
      };
      if(!row.title)return;
      if(new Date(row.end)<new Date(row.start)){
        alert('終了日時は開始日時以降にしてください。');
        return;
      }
      const i=rows.findIndex(x=>x.id===rid);
      i>=0?rows[i]=row:rows.push(row);
      saveEvents(rows);
      state.selected=startDay(row);
      state.date=new Date(row.start);
      close();render();
    };

    $('#deleteEvent')?.addEventListener('click',()=>{
      if(confirm('削除しますか？')){saveEvents(events().filter(x=>x.id!==e.id));close();render()}
    });
    $('#duplicateEvent')?.addEventListener('click',()=>{
      saveEvents([...events(),{...e,id:uid(),title:e.title+'（コピー）'}]);close();render()
    });
  }

  function openTodo(id){
    const t=id?todos().find(x=>x.id===id):null;modal('ToDo',t?'ToDoを編集':'ToDoを追加',`<form id="todoForm"><input type="hidden" name="id" value="${esc(t?.id||'')}"><label>タイトル<input name="title" required value="${esc(t?.title||'')}"></label><label>期限<input type="date" name="due" value="${esc(t?.due||state.selected)}"></label><label>カレンダー<select name="calendarId">${calendars.map(c=>`<option value="${c.id}" ${(t?.calendarId||'activity')===c.id?'selected':''}>${c.name}</option>`).join('')}</select></label><div class="checks"><label><input type="checkbox" name="done" ${t?.done?'checked':''}>完了</label></div><div class="form-actions">${t?'<button type="button" id="deleteTodo" class="danger">削除</button>':''}<button class="primary">保存</button></div></form>`);
    $('#todoForm').onsubmit=ev=>{ev.preventDefault();const fd=new FormData(ev.currentTarget),rows=todos(),rid=fd.get('id')||uid(),row={id:rid,title:fd.get('title'),due:fd.get('due'),calendarId:fd.get('calendarId'),done:fd.get('done')==='on'};const i=rows.findIndex(x=>x.id===rid);i>=0?rows[i]=row:rows.push(row);saveTodos(rows);close();render()}
    $('#deleteTodo')?.addEventListener('click',()=>{saveTodos(todos().filter(x=>x.id!==t.id));close();render()});
  }

  function openSettings(){modal('CALENDAR','カレンダー設定',`<div class="settings-block"><h3>移行・出力</h3><div class="settings-actions"><button id="importIcs">ICS取込</button><button id="importCsv">CSV取込</button><button id="exportIcs">ICS出力</button><button id="exportCsv">CSV出力</button><button id="exportJson">完全バックアップ</button></div></div><div class="settings-block"><h3>重複判定</h3><p>タイトル・開始・終了が一致する予定は取込時に除外します。</p></div><div class="settings-block"><h3>将来のアプリ・ウィジェット</h3><div class="settings-actions"><button id="widgetData">ウィジェット用データ</button></div></div>`);
    $('#importIcs').onclick=()=>$('#icsFile').click();$('#importCsv').onclick=()=>$('#csvFile').click();$('#exportIcs').onclick=exportIcs;$('#exportCsv').onclick=exportCsv;$('#exportJson').onclick=()=>download(JSON.stringify({schemaVersion:3,events:events(),todos:todos(),calendars},null,2),'OUTBASE_calendar_backup.json','application/json');$('#widgetData').onclick=()=>alert(JSON.stringify(widgetSnapshot(),null,2));
  }

  function fp(e){return [e.title,e.start,e.end].join('|').toLowerCase()}
  function widgetSnapshot(){const now=new Date(),today=key(now);return {schemaVersion:1,generatedAt:new Date().toISOString(),today,todayEntries:events().filter(e=>occurs(e,today)),upcomingEntries:events().filter(e=>new Date(e.end||e.start)>=now).sort((a,b)=>a.start.localeCompare(b.start)).slice(0,10),openTodos:todos().filter(t=>!t.done)}}
  function download(content,name,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type:`${type};charset=utf-8`}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
  function exportCsv(){const rows=[['title','start','end','allDay','calendar','participants','place','memo'],...events().map(e=>[e.title,e.start,e.end,e.allDay,e.calendarId,(e.participants||[]).join('|'),e.place||'',e.memo||''])];download(rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n'),'OUTBASE_calendar.csv','text/csv')}
  function exportIcs(){const fmt=v=>new Date(v).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const body=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//OUTBASE//JA',...events().flatMap(e=>['BEGIN:VEVENT',`UID:${e.id}@outbase`,`DTSTART:${fmt(e.start)}`,`DTEND:${fmt(e.end)}`,`SUMMARY:${e.title}`,e.place?`LOCATION:${e.place}`:'','END:VEVENT'].filter(Boolean)),'END:VCALENDAR'].join('\r\n');download(body,'OUTBASE_calendar.ics','text/calendar')}

  $('#icsFile').onchange=async ev=>{const text=await ev.target.files[0].text(),rows=events(),seen=new Set(rows.map(fp)),out=[];let cur=null;const val=l=>l.slice(l.indexOf(':')+1);const dt=v=>`${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T${v.slice(9,11)||'00'}:${v.slice(11,13)||'00'}`;for(const l of text.split(/\r?\n/)){if(l==='BEGIN:VEVENT'){cur={id:uid(),calendarId:'activity',participants:[],repeat:{freq:'none',interval:1,until:''},reminders:[]};continue}if(l==='END:VEVENT'&&cur){cur.end=cur.end||cur.start;if(!seen.has(fp(cur))){seen.add(fp(cur));out.push(cur)}cur=null;continue}if(!cur)continue;if(l.startsWith('SUMMARY'))cur.title=val(l);if(l.startsWith('DTSTART'))cur.start=dt(val(l));if(l.startsWith('DTEND'))cur.end=dt(val(l));if(l.startsWith('LOCATION'))cur.place=val(l)}saveEvents([...rows,...out]);close();render();alert(`${out.length}件取り込みました`)};
  $('#csvFile').onchange=async ev=>{const lines=(await ev.target.files[0].text()).split(/\r?\n/).filter(Boolean),rows=events(),seen=new Set(rows.map(fp)),out=[];for(const line of lines.slice(1)){const c=line.match(/("([^"]|"")*"|[^,]*)/g).filter(x=>x!==',').map(x=>x.replace(/^"|"$/g,'').replace(/""/g,'"'));const e={id:uid(),title:c[0],start:c[1],end:c[2],allDay:c[3]==='true',calendarId:c[4]||'activity',participants:(c[5]||'').split('|').filter(Boolean),place:c[6]||'',memo:c[7]||'',repeat:{freq:'none',interval:1,until:''},reminders:[]};if(!seen.has(fp(e))){seen.add(fp(e));out.push(e)}}saveEvents([...rows,...out]);close();render();alert(`${out.length}件取り込みました`)};
  $('#notificationBtn')?.addEventListener('click',()=>alert('通知はHOMEの通知センターへ統合予定です。'));
  $('#agendaToggle')?.addEventListener('click',()=>{const section=$('#agendaSection');const collapsed=section.classList.toggle('collapsed');$('#agendaToggle')?.setAttribute('aria-expanded',String(!collapsed));writeUiState();reportEmbeddedHeight();});
  $('#periodButton')?.addEventListener('click',()=>{const value=prompt('表示する年月を入力してください（例：2026-07）',`${state.date.getFullYear()}-${pad(state.date.getMonth()+1)}`);if(!value||!/^[0-9]{4}-[0-9]{2}$/.test(value))return;const [y,m]=value.split('-').map(Number);state.date=new Date(y,m-1,1,12);state.selected=key(state.date);render();});
  $('#addEventBtn')?.addEventListener('click',()=>openEvent());$('#quickAddBtn')?.addEventListener('click',()=>openEvent());$('#navAdd')?.addEventListener('click',()=>openEvent());$('#settingsBtn')?.addEventListener('click',openSettings);$('#filterBtn')?.addEventListener('click',()=>{$('#filterPanel')?.classList.toggle('hidden');reportEmbeddedHeight();});$('#closeModal')?.addEventListener('click',close);$('#modal')?.addEventListener('click',e=>{if(e.target.id==='modal')close()});
  $('#todayBtn')?.addEventListener('click',()=>{state.date=new Date();state.selected=key(new Date());render()});
  $('#prevBtn')?.addEventListener('click',()=>{if(state.view==='todo')return;if(state.view==='month'||state.view==='list')state.date.setMonth(state.date.getMonth()-1);else state.date.setDate(state.date.getDate()-(state.view==='week'?7:1));state.selected=key(state.date);render()});
  $('#nextBtn')?.addEventListener('click',()=>{if(state.view==='todo')return;if(state.view==='month'||state.view==='list')state.date.setMonth(state.date.getMonth()+1);else state.date.setDate(state.date.getDate()+(state.view==='week'?7:1));state.selected=key(state.date);render()});
  $$('.view-tabs button').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;render()});
  render();
})();
;(() => {
  'use strict';
  document.querySelectorAll('[data-parent-nav]').forEach(link=>{
    link.addEventListener('click',event=>{
      if(window.parent===window)return;
      event.preventDefault();
      window.parent.postMessage({type:'OUTBASE_CALENDAR_NAVIGATE',name:link.dataset.parentNav},location.origin);
    });
  });
})();

;(() => {
  'use strict';
  setTimeout(() => {
    const period = document.getElementById('periodLabel');
    const area = document.getElementById('calendarArea');
    if (period && !period.textContent.trim() && area && !area.children.length) {
      period.textContent = '読み込みエラー';
      area.innerHTML = '<div class="empty">カレンダーを読み込めませんでした。画面を閉じて、もう一度開いてください。</div>';
    }
  }, 1800);
})();

;(() => {
  document.addEventListener('click',event=>{
    const panel=document.getElementById('filterPanel');
    const button=document.getElementById('filterBtn');
    if(!panel||panel.classList.contains('hidden'))return;
    if(panel.contains(event.target)||button?.contains(event.target))return;
    panel.classList.add('hidden');
  });
})();
