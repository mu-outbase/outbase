
(() => {
  'use strict';
  const KEY='outbase_calendar_lab_events_v1';
  const state={date:new Date(),selected:key(new Date()),view:'month',filters:new Set(['activity','camp','walk','family']),editing:null};
  const sample=[
    {id:'s1',title:'湖畔キャンプ',start:'2026-07-20T10:00',end:'2026-07-22T12:00',allDay:false,type:'camp',place:'湖畔キャンプ場',memo:'表示確認用サンプル'},
    {id:'s2',title:'コタと公園散歩',start:'2026-07-27T08:00',end:'2026-07-27T09:30',allDay:false,type:'walk',place:'公園',memo:''}
  ];
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const pad=n=>String(n).padStart(2,'0');
  function key(d){const x=new Date(d);return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`;}
  function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');return Array.isArray(v)?v:sample;}catch(_){return sample;}}
  function save(v){localStorage.setItem(KEY,JSON.stringify(v));}
  function events(){return load().filter(e=>state.filters.has(e.type));}
  function sameDay(e,k){const s=new Date(e.start),t=new Date(e.end);const d=new Date(k+'T12:00');s.setHours(0,0,0,0);t.setHours(23,59,59,999);return d>=s&&d<=t;}
  function eventsFor(k){return events().filter(e=>sameDay(e,k)).sort((a,b)=>a.start.localeCompare(b.start));}
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
  function formatDate(k){const d=new Date(k+'T12:00');return `${d.getMonth()+1}月${d.getDate()}日（${'日月火水木金土'[d.getDay()]}）`;}
  function formatRange(e){const s=new Date(e.start),t=new Date(e.end);if(e.allDay)return `${s.getMonth()+1}/${s.getDate()} 終日`;return `${s.getMonth()+1}/${s.getDate()} ${pad(s.getHours())}:${pad(s.getMinutes())}〜${pad(t.getHours())}:${pad(t.getMinutes())}`;}
  function monthCells(){
    const y=state.date.getFullYear(),m=state.date.getMonth(),first=new Date(y,m,1),start=new Date(y,m,1-first.getDay());
    return Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d;});
  }
  function render(){
    $('#monthLabel').textContent=`${state.date.getFullYear()}年${state.date.getMonth()+1}月`;
    $('#selectedLabel').textContent=formatDate(state.selected);
    $$('.view-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));
    const area=$('#calendarArea');
    if(state.view==='month') area.innerHTML=renderMonth();
    if(state.view==='week') area.innerHTML=renderWeek();
    if(state.view==='day') area.innerHTML=renderDay();
    if(state.view==='list') area.innerHTML=renderList();
    const rows=eventsFor(state.selected);
    $('#agendaList').innerHTML=rows.length?rows.map(card).join(''):'<div class="empty">この日の予定はありません。</div>';
    bindDynamic();
  }
  function renderMonth(){
    const cur=state.date.getMonth(),today=key(new Date());
    return `<section class="calendar-card"><div class="weekdays">${[...'日月火水木金土'].map(x=>`<span>${x}</span>`).join('')}</div><div class="month-grid">${monthCells().map(d=>{
      const k=key(d),rows=eventsFor(k);
      return `<button class="day-cell ${d.getMonth()!==cur?'outside':''} ${k===state.selected?'selected':''} ${k===today?'today':''}" data-date="${k}"><b>${d.getDate()}</b>${rows.length?`<div class="dots">${rows.slice(0,3).map(()=>'<i></i>').join('')}</div><span class="event-mini">${esc(rows[0].title)}</span>`:''}</button>`;
    }).join('')}</div></section>`;
  }
  function renderWeek(){
    const base=new Date(state.selected+'T12:00');base.setDate(base.getDate()-base.getDay());
    const days=Array.from({length:7},(_,i)=>{const d=new Date(base);d.setDate(base.getDate()+i);return d;});
    return `<section class="week-view"><div class="week-columns">${days.map(d=>{const k=key(d),rows=eventsFor(k);return `<div class="week-col"><button data-date="${k}">${formatDate(k)}</button>${rows.map(card).join('')||'<p>予定なし</p>'}</div>`}).join('')}</div></section>`;
  }
  function renderDay(){const rows=eventsFor(state.selected);return `<section class="day-view"><h2>${formatDate(state.selected)}</h2>${rows.map(card).join('')||'<div class="empty">予定なし</div>'}</section>`}
  function renderList(){const rows=events().slice().sort((a,b)=>a.start.localeCompare(b.start));return `<section class="list-view">${rows.map(card).join('')||'<div class="empty">予定なし</div>'}</section>`}
  function card(e){return `<article class="event-card" data-edit="${esc(e.id)}"><h3>${esc(e.title)}</h3><p>${esc(formatRange(e))}</p>${e.place?`<p>${esc(e.place)}</p>`:''}</article>`}
  function bindDynamic(){
    $$('[data-date]').forEach(b=>b.onclick=()=>{const k=b.dataset.date;if(state.selected===k){openForm(null,k)}else{state.selected=k;state.date=new Date(k+'T12:00');render();}});
    $$('[data-edit]').forEach(x=>x.onclick=()=>openForm(x.dataset.edit));
  }
  function openForm(id,date){
    const rows=load(),e=id?rows.find(x=>x.id===id):null;state.editing=e?.id||null;
    const f=$('#eventForm');f.reset();
    const base=date||state.selected, start=e?.start||`${base}T09:00`, end=e?.end||`${base}T10:00`;
    f.elements.id.value=e?.id||'';f.elements.title.value=e?.title||'';f.elements.start.value=start;f.elements.end.value=end;
    f.elements.allDay.checked=!!e?.allDay;f.elements.type.value=e?.type||'activity';f.elements.place.value=e?.place||'';f.elements.memo.value=e?.memo||'';
    $('#formTitle').textContent=e?'予定を編集':'予定を追加';$('#deleteBtn').classList.toggle('hidden',!e);$('#duplicateBtn').classList.toggle('hidden',!e);
    $('#modal').classList.remove('hidden');
  }
  function close(){ $('#modal').classList.add('hidden'); state.editing=null; }
  function uid(){return crypto.randomUUID?.()||`lab-${Date.now()}-${Math.random().toString(36).slice(2)}`}
  $('#eventForm').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget),rows=load(),id=fd.get('id')||uid();
    const row={id,title:fd.get('title'),start:fd.get('start'),end:fd.get('end'),allDay:fd.get('allDay')==='on',type:fd.get('type'),place:fd.get('place'),memo:fd.get('memo')};
    const i=rows.findIndex(x=>x.id===id);if(i>=0)rows[i]=row;else rows.push(row);save(rows);state.selected=key(row.start);state.date=new Date(row.start);close();render();
  };
  $('#deleteBtn').onclick=()=>{if(!state.editing||!confirm('この予定を削除しますか？'))return;save(load().filter(x=>x.id!==state.editing));close();render()};
  $('#duplicateBtn').onclick=()=>{const e=load().find(x=>x.id===state.editing);if(!e)return;const rows=load();rows.push({...e,id:uid(),title:e.title+'（コピー）'});save(rows);close();render()};
  $('#closeModal').onclick=close;$('#modal').onclick=e=>{if(e.target.id==='modal')close()};
  $('#addBtn').onclick=()=>openForm();$('#quickAddBtn').onclick=()=>openForm();$('#navAdd').onclick=()=>openForm();
  $('#todayBtn').onclick=()=>{state.date=new Date();state.selected=key(new Date());render()};
  $('#prevBtn').onclick=()=>{if(state.view==='month')state.date.setMonth(state.date.getMonth()-1);else state.date.setDate(state.date.getDate()-(state.view==='week'?7:1));state.selected=key(state.date);render()};
  $('#nextBtn').onclick=()=>{if(state.view==='month')state.date.setMonth(state.date.getMonth()+1);else state.date.setDate(state.date.getDate()+(state.view==='week'?7:1));state.selected=key(state.date);render()};
  $$('.view-tabs button').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;render()});
  $('#filterBtn').onclick=()=>$('#filterPanel').classList.toggle('hidden');
  $$('[data-filter]').forEach(x=>x.onchange=()=>{x.checked?state.filters.add(x.dataset.filter):state.filters.delete(x.dataset.filter);render()});
  $('#importBtn').onclick=()=>$('#icsFile').click();
  $('#icsFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;const text=await f.text(),out=[];let cur=null;
    const val=l=>l.slice(l.indexOf(':')+1).replace(/\\n/g,'\n');
    const dt=v=>/^\d{8}$/.test(v)?`${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T00:00`:`${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T${v.slice(9,11)}:${v.slice(11,13)}`;
    for(const l of text.split(/\r?\n/)){if(l==='BEGIN:VEVENT'){cur={id:uid(),type:'activity'};continue}if(l==='END:VEVENT'&&cur){cur.end=cur.end||cur.start;out.push(cur);cur=null;continue}if(!cur)continue;if(l.startsWith('SUMMARY'))cur.title=val(l);if(l.startsWith('DTSTART'))cur.start=dt(val(l));if(l.startsWith('DTEND'))cur.end=dt(val(l));if(l.startsWith('LOCATION'))cur.place=val(l);}
    save([...load(),...out]);close();render();alert(`${out.length}件を取り込みました`);
  };
  $('#exportBtn').onclick=()=>{const fmt=v=>new Date(v).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const body=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//OUTBASE LAB//JA',...load().flatMap(e=>['BEGIN:VEVENT',`UID:${e.id}@outbase`,`DTSTART:${fmt(e.start)}`,`DTEND:${fmt(e.end)}`,`SUMMARY:${e.title}`,e.place?`LOCATION:${e.place}`:'','END:VEVENT'].filter(Boolean)),'END:VCALENDAR'].join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([body],{type:'text/calendar'}));a.download='OUTBASE_calendar_lab.ics';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)};
  render();
})();
