
(() => {
  'use strict';
  const EVENT_KEY='outbase_calendar_complete_v3_events';
  const TODO_KEY='outbase_calendar_complete_v3_todos';
  const pad=n=>String(n).padStart(2,'0');
  const key=d=>{const x=new Date(d);return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`};
  const uid=()=>crypto.randomUUID?.()||`ob-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  const calendars=[
    {id:'activity',name:'活動'},{id:'camp',name:'キャンプ'},{id:'walk',name:'散歩'},
    {id:'family',name:'家族'},{id:'work',name:'仕事'},{id:'personal',name:'個人'}
  ];
  const people=['むー','リン','コタ','アオ','エラ','ユキ'];
  const sampleEvents=[
    {id:'camp1',title:'湖畔キャンプ',start:'2026-07-20T10:00',end:'2026-07-22T12:00',allDay:false,calendarId:'camp',participants:['むー','リン','コタ'],place:'湖畔キャンプ場',memo:'',repeat:{freq:'none',interval:1,until:''},reminders:['1d']},
    {id:'walk1',title:'コタと公園散歩',start:'2026-07-27T08:00',end:'2026-07-27T09:30',allDay:false,calendarId:'walk',participants:['コタ'],place:'公園',memo:'',repeat:{freq:'none',interval:1,until:''},reminders:['10m']}
  ];
  const sampleTodos=[
    {id:'todo1',title:'キャンプ食材を確認',due:'2026-07-19',done:false,calendarId:'camp',participants:['むー','リン']}
  ];
  const state={date:new Date('2026-07-19T12:00'),selected:'2026-07-19',view:'month',filters:new Set(calendars.map(c=>c.id)),people:new Set(people),editing:null};

  function read(keyName,fallback){try{const v=JSON.parse(localStorage.getItem(keyName)||'null');return Array.isArray(v)?v:fallback}catch(_){return fallback}}
  function events(){return read(EVENT_KEY,sampleEvents)} function saveEvents(v){localStorage.setItem(EVENT_KEY,JSON.stringify(v))}
  function todos(){return read(TODO_KEY,sampleTodos)} function saveTodos(v){localStorage.setItem(TODO_KEY,JSON.stringify(v))}
  function cal(id){return calendars.find(c=>c.id===id)||calendars[0]}
  function activeEvent(e){return state.filters.has(e.calendarId)&&(!e.participants?.length||e.participants.some(p=>state.people.has(p)))}
  function startDay(e){return key(e.start)} function endDay(e){return key(e.end||e.start)} function multi(e){return startDay(e)!==endDay(e)}
  function occurs(e,k){return k>=startDay(e)&&k<=endDay(e)}
  function dayEvents(k){return events().filter(activeEvent).filter(e=>occurs(e,k)).sort((a,b)=>a.start.localeCompare(b.start))}
  function fmtDate(k){const d=new Date(k+'T12:00');return `${d.getMonth()+1}月${d.getDate()}日（${'日月火水木金土'[d.getDay()]}）`}
  function fmtRange(e){const s=new Date(e.start),t=new Date(e.end||e.start);if(e.allDay)return `${s.getMonth()+1}/${s.getDate()} 終日`;return key(s)===key(t)?`${s.getMonth()+1}/${s.getDate()} ${pad(s.getHours())}:${pad(s.getMinutes())}〜${pad(t.getHours())}:${pad(t.getMinutes())}`:`${s.getMonth()+1}/${s.getDate()} ${pad(s.getHours())}:${pad(s.getMinutes())}〜${t.getMonth()+1}/${t.getDate()} ${pad(t.getHours())}:${pad(t.getMinutes())}`}
  function cells(){const y=state.date.getFullYear(),m=state.date.getMonth(),f=new Date(y,m,1),s=new Date(y,m,1-f.getDay());return Array.from({length:42},(_,i)=>{const d=new Date(s);d.setDate(s.getDate()+i);return d})}

  function renderFormalPeople(){
    const host=document.getElementById('formalPeopleFilters');
    if(!host)return;
    host.innerHTML=people.map(p=>`<button type="button" class="formal-person ${state.people.has(p)?'active':''}" data-formal-person="${esc(p)}">${['コタ','アオ','エラ','ユキ'].includes(p)?'🐾 ':''}${esc(p)}</button>`).join('');
    host.querySelectorAll('[data-formal-person]').forEach(button=>button.addEventListener('click',()=>{
      const p=button.dataset.formalPerson;
      state.people.has(p)?state.people.delete(p):state.people.add(p);
      render();
    }));
  }

  function render(){
    renderFormalPeople();
    $('#periodLabel').textContent=state.view==='day'?fmtDate(state.selected):`${state.date.getFullYear()}年${state.date.getMonth()+1}月`;
    $('#selectedLabel').textContent=fmtDate(state.selected);
    $$('.view-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));
    $('#agendaSection').classList.toggle('hidden',state.view==='todo');
    $('#calendarArea').innerHTML=state.view==='month'?renderMonth():state.view==='week'?renderWeek():state.view==='day'?renderDay():state.view==='list'?renderList():renderTodo();
    renderAgenda();renderFilters();bind();
  }

  function renderMonth(){
    const cur=state.date.getMonth(),today=key(new Date());
    return `<section class="calendar-card"><div class="weekdays">${[...'日月火水木金土'].map(x=>`<span>${x}</span>`).join('')}</div><div class="month-grid">${cells().map(d=>{
      const k=key(d),rows=dayEvents(k),m=rows.find(multi),singles=rows.filter(e=>!multi(e));let seg='<div class="multi-lane"></div>';
      if(m){const st=k===startDay(m),en=k===endDay(m),cls=st&&en?'single':st?'start':en?'end':'middle';seg=`<div class="multi-lane"><span class="segment ${cls} tone-${esc(m.calendarId)}" title="${esc(m.title)}">${st?esc(m.title):''}</span></div>`}
      return `<button class="day-cell ${d.getMonth()!==cur?'outside':''} ${k===state.selected?'selected':''} ${k===today?'today':''}" data-date="${k}"><strong>${d.getDate()}</strong>${seg}<div class="single-lane">${singles.slice(0,3).map(e=>`<span class="mini-event" data-tone="${esc(e.calendarId)}">${esc(e.title)}</span>`).join('')}${singles.length>3?`<span class="mini-event" data-tone="personal">ほか${singles.length-3}件</span>`:''}</div></button>`
    }).join('')}</div></section>`
  }
  function renderWeek(){const b=new Date(state.selected+'T12:00');b.setDate(b.getDate()-b.getDay());const ds=Array.from({length:7},(_,i)=>{const d=new Date(b);d.setDate(b.getDate()+i);return d});return `<section class="week-view"><h2>${ds[0].getMonth()+1}/${ds[0].getDate()}〜${ds[6].getMonth()+1}/${ds[6].getDate()}</h2><div class="week-columns">${ds.map(d=>{const k=key(d),r=dayEvents(k);return `<div class="week-col"><button data-date="${k}">${fmtDate(k)}</button>${r.map(eventCard).join('')||'<p>予定なし</p>'}</div>`}).join('')}</div></section>`}
  function renderDay(){const r=dayEvents(state.selected);return `<section class="day-view"><h2>${fmtDate(state.selected)}</h2>${r.map(eventCard).join('')||'<div class="empty">予定なし</div>'}</section>`}
  function renderList(){const r=events().filter(activeEvent).sort((a,b)=>a.start.localeCompare(b.start));return `<section class="list-view">${r.map(eventCard).join('')||'<div class="empty">予定なし</div>'}</section>`}
  function renderTodo(){const r=todos();return `<section class="todo-view"><div class="section-title"><h2>ToDo</h2><button id="addTodoBtn">＋</button></div>${r.map(todoCard).join('')||'<div class="empty">ToDoはありません</div>'}</section>`}
  function eventCard(e){return `<article class="event-card" data-edit-event="${e.id}"><h3>${esc(e.title)}</h3><p>${esc(fmtRange(e))}</p>${e.place?`<p>${esc(e.place)}</p>`:''}<div class="badges"><span class="badge">${esc(cal(e.calendarId).name)}</span>${e.repeat?.freq!=='none'?'<span class="badge">繰返</span>':''}${e.reminders?.length?'<span class="badge">通知</span>':''}</div></article>`}
  function todoCard(t){return `<article class="todo-card" data-edit-todo="${t.id}"><h3>${t.done?'✓ ':''}${esc(t.title)}</h3><p>期限 ${esc(t.due||'未設定')}</p><div class="badges"><span class="badge">${esc(cal(t.calendarId).name)}</span></div></article>`}
  function renderAgenda(){const r=dayEvents(state.selected);$('#agendaList').innerHTML=r.length?r.map(eventCard).join(''):'<div class="empty">この日の予定はありません。</div>'}
  function renderFilters(){$('#filterPanel').innerHTML=`<h3>カレンダー</h3><div class="filter-grid">${calendars.map(c=>`<button class="chip ${state.filters.has(c.id)?'active':''}" data-cal-filter="${c.id}">${c.name}</button>`).join('')}</div><h3>家族・ペット</h3><div class="filter-grid">${people.map(p=>`<button class="chip ${state.people.has(p)?'active':''}" data-person-filter="${p}">${p}</button>`).join('')}</div>`}

  function bind(){
    $$('[data-date]').forEach(b=>b.onclick=()=>{state.selected=b.dataset.date;state.date=new Date(state.selected+'T12:00');render()});
    $$('[data-edit-event]').forEach(x=>x.onclick=()=>openEvent(x.dataset.editEvent));
    $$('[data-edit-todo]').forEach(x=>x.onclick=()=>openTodo(x.dataset.editTodo));
    $$('[data-cal-filter]').forEach(x=>x.onclick=()=>{state.filters.has(x.dataset.calFilter)?state.filters.delete(x.dataset.calFilter):state.filters.add(x.dataset.calFilter);render()});
    $$('[data-person-filter]').forEach(x=>x.onclick=()=>{state.people.has(x.dataset.personFilter)?state.people.delete(x.dataset.personFilter):state.people.add(x.dataset.personFilter);render()});
    $('#addTodoBtn')?.addEventListener('click',()=>openTodo());
  }

  function modal(eyebrow,title,body){$('#sheetEyebrow').textContent=eyebrow;$('#sheetTitle').textContent=title;$('#sheetBody').innerHTML=body;$('#modal').classList.remove('hidden')}
  function close(){$('#modal').classList.add('hidden');state.editing=null}

  function openEvent(id){
    const e=id?events().find(x=>x.id===id):null;const base=state.selected;state.editing=e?.id||null;
    modal('予定',e?'予定を編集':'予定を追加',`<form id="eventForm"><input type="hidden" name="id" value="${esc(e?.id||'')}"><div class="form-section"><label>タイトル<input name="title" required value="${esc(e?.title||'')}"></label></div><div class="form-grid two"><label>開始<input type="datetime-local" name="start" required value="${esc(e?.start||base+'T09:00')}"></label><label>終了<input type="datetime-local" name="end" required value="${esc(e?.end||base+'T10:00')}"></label></div><div class="checks"><label><input type="checkbox" name="allDay" ${e?.allDay?'checked':''}>終日</label></div><div class="form-grid two"><label>カレンダー<select name="calendarId">${calendars.map(c=>`<option value="${c.id}" ${(e?.calendarId||'activity')===c.id?'selected':''}>${c.name}</option>`).join('')}</select></label><label>通知<select name="reminder"><option value="">なし</option><option value="10m">10分前</option><option value="1h">1時間前</option><option value="1d">1日前</option></select></label></div><div class="form-grid two"><label>繰り返し<select name="freq"><option value="none">なし</option><option value="daily">毎日</option><option value="weekly">毎週</option><option value="monthly">毎月</option><option value="yearly">毎年</option></select></label><label>間隔<input type="number" min="1" name="interval" value="${e?.repeat?.interval||1}"></label></div><div class="form-section"><label>繰り返し終了<input type="date" name="until" value="${esc(e?.repeat?.until||'')}"></label></div><div class="form-section"><label>参加者<input name="participants" value="${esc((e?.participants||[]).join('、'))}"></label></div><div class="form-section"><label>場所<input name="place" value="${esc(e?.place||'')}"></label></div><div class="form-section"><label>メモ<textarea name="memo" rows="4">${esc(e?.memo||'')}</textarea></label></div><div class="form-actions">${e?'<button type="button" id="deleteEvent" class="danger">削除</button><button type="button" id="duplicateEvent">複製</button>':''}<button class="primary">保存</button></div></form>`);
    const f=$('#eventForm');if(e){f.freq.value=e.repeat?.freq||'none';f.reminder.value=e.reminders?.[0]||''}
    f.onsubmit=ev=>{ev.preventDefault();const fd=new FormData(f),rows=events(),rid=fd.get('id')||uid();const row={id:rid,title:fd.get('title'),start:fd.get('start'),end:fd.get('end'),allDay:fd.get('allDay')==='on',calendarId:fd.get('calendarId'),participants:String(fd.get('participants')||'').split(/[、,]/).map(x=>x.trim()).filter(Boolean),place:fd.get('place'),memo:fd.get('memo'),repeat:{freq:fd.get('freq'),interval:Number(fd.get('interval')||1),until:fd.get('until')},reminders:fd.get('reminder')?[fd.get('reminder')]:[]};const i=rows.findIndex(x=>x.id===rid);i>=0?rows[i]=row:rows.push(row);saveEvents(rows);state.selected=startDay(row);state.date=new Date(row.start);close();render()}
    $('#deleteEvent')?.addEventListener('click',()=>{if(confirm('削除しますか？')){saveEvents(events().filter(x=>x.id!==e.id));close();render()}});
    $('#duplicateEvent')?.addEventListener('click',()=>{saveEvents([...events(),{...e,id:uid(),title:e.title+'（コピー）'}]);close();render()});
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

  $('#addEventBtn')?.addEventListener('click',()=>openEvent());$('#quickAddBtn')?.addEventListener('click',()=>openEvent());$('#navAdd')?.addEventListener('click',()=>openEvent());$('#settingsBtn')?.addEventListener('click',openSettings);$('#filterBtn')?.addEventListener('click',()=>$('#filterPanel')?.classList.toggle('hidden'));$('#closeModal')?.addEventListener('click',close);$('#modal')?.addEventListener('click',e=>{if(e.target.id==='modal')close()});
  $('#todayBtn')?.addEventListener('click',()=>{state.date=new Date();state.selected=key(new Date());render()});
  $('#prevBtn')?.addEventListener('click',()=>{if(state.view==='month')state.date.setMonth(state.date.getMonth()-1);else state.date.setDate(state.date.getDate()-(state.view==='week'?7:1));state.selected=key(state.date);render()});
  $('#nextBtn')?.addEventListener('click',()=>{if(state.view==='month')state.date.setMonth(state.date.getMonth()+1);else state.date.setDate(state.date.getDate()+(state.view==='week'?7:1));state.selected=key(state.date);render()});
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
