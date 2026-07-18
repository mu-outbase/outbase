(() => {
  'use strict';

  const VERSION='calendar-v2-r2-routefix';
  const DB_NAME='outbase_calendar_db';
  const DB_VERSION=1;
  const STORES={
    calendars:{keyPath:'id',indexes:[['name','name'],['visible','visible']]},
    entries:{keyPath:'id',indexes:[['start_at','start_at'],['calendar_id','calendar_id'],['external_uid','external_uid'],['activity_id','activity_id']]},
    todos:{keyPath:'id',indexes:[['due_at','due_at'],['completed','completed'],['calendar_id','calendar_id']]},
    imports:{keyPath:'id',indexes:[['created_at','created_at'],['source','source']]},
    widget_snapshots:{keyPath:'id',indexes:[['generated_at','generated_at']]}
  };

  const state={
    date:new Date(),
    selected:dateKey(new Date()),
    view:'month',
    calendars:[],entries:[],todos:[],filters:new Set(),
    mounted:false,editing:null
  };

  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const uid=()=>globalThis.crypto?.randomUUID?.()||`obc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const pad=n=>String(n).padStart(2,'0');
  function dateKey(d){const x=new Date(d);return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`;}
  function monthKey(d){const x=new Date(d);return `${x.getFullYear()}-${pad(x.getMonth()+1)}`;}
  function localIso(date){const d=new Date(date);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
  function parseDate(v){const d=new Date(v);return Number.isNaN(d.getTime())?null:d;}
  function startOfDay(v){const d=new Date(v);d.setHours(0,0,0,0);return d;}
  function endOfDay(v){const d=new Date(v);d.setHours(23,59,59,999);return d;}

  function openDb(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{
        const db=req.result;
        for(const [name,def] of Object.entries(STORES)){
          const store=db.objectStoreNames.contains(name)?req.transaction.objectStore(name):db.createObjectStore(name,{keyPath:def.keyPath});
          for(const [idx,key,opt={}] of def.indexes){if(!store.indexNames.contains(idx))store.createIndex(idx,key,opt);}
        }
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }
  async function all(store){const db=await openDb();return new Promise((r,j)=>{const q=db.transaction(store,'readonly').objectStore(store).getAll();q.onsuccess=()=>r(q.result||[]);q.onerror=()=>j(q.error);});}
  async function put(store,row){const db=await openDb();return new Promise((r,j)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(row);tx.oncomplete=()=>r(row);tx.onerror=()=>j(tx.error);});}
  async function remove(store,id){const db=await openDb();return new Promise((r,j)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).delete(id);tx.oncomplete=()=>r();tx.onerror=()=>j(tx.error);});}

  async function ensureDefaults(){
    const rows=await all('calendars');
    if(rows.length)return;
    const defaults=[
      {id:'cal-outbase',name:'OUTBASE',color:'#174d31',visible:true,kind:'outbase'},
      {id:'cal-family',name:'家族',color:'#d58e12',visible:true,kind:'family'},
      {id:'cal-personal',name:'個人',color:'#66a9c7',visible:true,kind:'personal'},
      {id:'cal-import',name:'取込',color:'#8e8279',visible:true,kind:'import'}
    ];
    for(const row of defaults)await put('calendars',{...row,created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
  }

  async function migrateLegacy(){
    const marker='outbase_calendar_v2_legacy_migrated';
    if(localStorage.getItem(marker)==='1')return;
    try{
      const repo=globalThis.OUTBASE_REPOSITORIES_V160;
      if(!repo?.calendarEntries?.all)return;
      const [entries,activities]=await Promise.all([repo.calendarEntries.all(),repo.activities.all()]);
      const activityMap=new Map((activities||[]).map(x=>[x.id,x]));
      const existing=await all('entries');
      const refs=new Set(existing.map(x=>x.legacy_ref).filter(Boolean));
      for(const item of entries||[]){
        const legacyRef=item.legacy_ref||`story:${item.id}`;
        if(refs.has(legacyRef))continue;
        const a=activityMap.get(item.activity_id)||{};
        await put('entries',normalizeEntry({
          id:uid(),calendar_id:'cal-outbase',title:a.title||item.title||'予定',start_at:item.start_at,end_at:item.end_at||item.start_at,
          all_day:Boolean(item.all_day),timezone:item.timezone||'Asia/Tokyo',notes:a.metadata?.notes||'',activity_id:item.activity_id||null,
          recurrence:item.recurrence||null,reminders:item.reminders||[],legacy_ref:legacyRef,source:'outbase-story'
        }));
      }
      localStorage.setItem(marker,'1');
    }catch(error){console.warn('[OUTBASE Calendar v2] legacy migration deferred',error);}
  }

  function normalizeEntry(input){
    const now=new Date().toISOString();
    return {
      id:input.id||uid(),calendar_id:input.calendar_id||'cal-outbase',title:String(input.title||'予定').slice(0,160),
      start_at:new Date(input.start_at||Date.now()).toISOString(),end_at:new Date(input.end_at||input.start_at||Date.now()).toISOString(),
      all_day:Boolean(input.all_day),timezone:input.timezone||'Asia/Tokyo',location:input.location||'',notes:input.notes||'',url:input.url||'',
      activity_id:input.activity_id||null,participants:Array.isArray(input.participants)?input.participants:[],pet_ids:Array.isArray(input.pet_ids)?input.pet_ids:[],
      recurrence:input.recurrence||null,reminders:Array.isArray(input.reminders)?input.reminders:[],external_uid:input.external_uid||null,
      external_source_id:input.external_source_id||null,external_updated_at:input.external_updated_at||null,legacy_ref:input.legacy_ref||null,
      source:input.source||'outbase-calendar',created_at:input.created_at||now,updated_at:now,deleted_at:null
    };
  }

  function visibleEntries(){return state.entries.filter(e=>state.filters.size===0||state.filters.has(e.calendar_id));}
  function intersectsDay(e,key){const s=startOfDay(e.start_at).getTime(),t=endOfDay(e.end_at||e.start_at).getTime(),d=startOfDay(key).getTime();return d>=s&&d<=t;}
  function entriesForDay(key){return visibleEntries().filter(e=>!e.deleted_at&&intersectsDay(e,key)).sort((a,b)=>String(a.start_at).localeCompare(String(b.start_at)));}

  async function refresh(){
    state.calendars=(await all('calendars')).filter(x=>!x.deleted_at);
    if(state.filters.size===0)state.calendars.filter(x=>x.visible!==false).forEach(x=>state.filters.add(x.id));
    state.entries=(await all('entries')).filter(x=>!x.deleted_at);
    state.todos=(await all('todos')).filter(x=>!x.deleted_at);
    render();
    generateWidgetSnapshot();
  }

  function icon(name){const paths={
    prev:'<path d="m14 6-6 6 6 6"/>',next:'<path d="m10 6 6 6-6 6"/>',plus:'<path d="M12 5v14M5 12h14"/>',filter:'<path d="M4 6h16M7 12h10M10 18h4"/>',upload:'<path d="M12 16V4m0 0-4 4m4-4 4 4M5 20h14"/>',download:'<path d="M12 4v12m0 0-4-4m4 4 4-4M5 20h14"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>'};
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]||''}</svg>`;
  }

  function monthMatrix(date){
    const y=date.getFullYear(),m=date.getMonth();
    const first=new Date(y,m,1),start=new Date(y,m,1-first.getDay());
    return Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d;});
  }

  function calendarRequested(){
    const q=new URLSearchParams(location.search);
    const route=q.get('view')||q.get('route')||q.get('screen')||'';
    if(route==='calendar')return true;
    const shell=document.querySelector('.ob3-shell');
    if(shell?.dataset?.ob6Route==='calendar')return true;
    const main=shell?.querySelector('.ob3-main');
    if(!main)return false;
    const text=(main.textContent||'').replace(/\s+/g,' ');
    return /\d{4}年\d{1,2}月/.test(text)&&(/この月/.test(text)||main.querySelector('[data-date],[class*=calendar],[class*=month]'));
  }

  function targetMain(){
    if(!calendarRequested())return null;
    const shell=document.querySelector('.ob3-shell[data-ob6-route="calendar"]')||document.querySelector('.ob3-shell[data-ob6-route="home"]')||document.querySelector('.ob3-shell');
    return shell?.querySelector('.ob3-main')||null;
  }

  function render(){
    const main=targetMain();
    if(!main)return;
    main.classList.add('obcal-main');
    main.innerHTML=`<section class="obcal-shell" data-version="${VERSION}">
      ${renderHeader()}
      ${renderToolbar()}
      ${state.view==='month'?renderMonth():state.view==='week'?renderWeek():state.view==='day'?renderDay():renderList()}
      ${renderAgenda()}
    </section>${renderModal()}`;
    bind(main);
    state.mounted=true;
  }

  function renderHeader(){
    const label=`${state.date.getFullYear()}年${state.date.getMonth()+1}月`;
    return `<header class="obcal-topbar"><button class="obcal-icon" data-act="prev">${icon('prev')}</button><div><small>カレンダー</small><h1>${label}</h1></div><button class="obcal-today" data-act="today">今日</button><button class="obcal-icon" data-act="next">${icon('next')}</button></header>`;
  }
  function renderToolbar(){
    return `<div class="obcal-toolbar">
      <div class="obcal-segment">${['month','week','day','list'].map(v=>`<button class="${state.view===v?'active':''}" data-view="${v}">${{month:'月',week:'週',day:'日',list:'一覧'}[v]}</button>`).join('')}</div>
      <div class="obcal-tools"><button class="obcal-icon" data-act="filter" aria-label="絞り込み">${icon('filter')}</button><button class="obcal-icon" data-act="import" aria-label="取込">${icon('upload')}</button><button class="obcal-icon" data-act="export" aria-label="出力">${icon('download')}</button><button class="obcal-add" data-act="add">${icon('plus')}<span>追加</span></button></div>
    </div><div class="obcal-filter ${state.showFilters?'open':''}">${state.calendars.map(c=>`<label><input type="checkbox" data-cal="${esc(c.id)}" ${state.filters.has(c.id)?'checked':''}><i style="--c:${esc(c.color)}"></i>${esc(c.name)}</label>`).join('')}</div>`;
  }
  function renderMonth(){
    const cells=monthMatrix(state.date),cur=state.date.getMonth(),today=dateKey(new Date());
    return `<section class="obcal-card obcal-month"><div class="obcal-weekdays">${['日','月','火','水','木','金','土'].map(x=>`<span>${x}</span>`).join('')}</div><div class="obcal-grid">${cells.map(d=>{
      const key=dateKey(d),items=entriesForDay(key),outside=d.getMonth()!==cur;
      return `<button class="obcal-day ${outside?'outside':''} ${key===today?'today':''} ${key===state.selected?'selected':''}" data-date="${key}"><b>${d.getDate()}</b><span class="obcal-dots">${items.slice(0,3).map(e=>`<i style="--c:${calendarColor(e.calendar_id)}"></i>`).join('')}</span>${items.length?`<small>${esc(items[0].title)}</small>`:''}${items.length>1?`<em>+${items.length-1}</em>`:''}</button>`;
    }).join('')}</div></section>`;
  }
  function renderWeek(){
    const base=startOfDay(state.selected),day=base.getDay();base.setDate(base.getDate()-day);
    const days=Array.from({length:7},(_,i)=>{const d=new Date(base);d.setDate(base.getDate()+i);return d;});
    return `<section class="obcal-card obcal-week">${days.map(d=>{const key=dateKey(d),items=entriesForDay(key);return `<div class="obcal-week-col"><button data-date="${key}" class="${key===state.selected?'selected':''}"><small>${['日','月','火','水','木','金','土'][d.getDay()]}</small><b>${d.getDate()}</b></button>${items.map(renderMiniEvent).join('')||'<p>予定なし</p>'}</div>`;}).join('')}</section>`;
  }
  function renderDay(){return `<section class="obcal-card obcal-dayview"><h2>${formatDate(state.selected)}</h2>${entriesForDay(state.selected).map(renderEventCard).join('')||'<div class="obcal-empty">予定はありません</div>'}</section>`;}
  function renderList(){
    const rows=visibleEntries().slice().sort((a,b)=>String(a.start_at).localeCompare(String(b.start_at)));
    return `<section class="obcal-card obcal-list">${rows.map(renderEventCard).join('')||'<div class="obcal-empty">予定はありません</div>'}</section>`;
  }
  function renderAgenda(){
    const items=entriesForDay(state.selected),todos=state.todos.filter(t=>t.due_at&&dateKey(t.due_at)===state.selected);
    return `<section class="obcal-agenda"><div class="obcal-agenda-head"><div><small>選択日</small><h2>${formatDate(state.selected)}</h2></div><button data-act="add">${icon('plus')}予定を追加</button></div>
      <div class="obcal-agenda-list">${items.map(renderEventCard).join('')||'<div class="obcal-empty">この日の予定はありません</div>'}</div>
      ${todos.length?`<div class="obcal-todos"><h3>ToDo</h3>${todos.map(t=>`<label><input type="checkbox" data-todo="${t.id}" ${t.completed?'checked':''}><span>${esc(t.title)}</span></label>`).join('')}</div>`:''}
    </section>`;
  }
  function renderMiniEvent(e){return `<button class="obcal-mini" data-entry="${e.id}" style="--c:${calendarColor(e.calendar_id)}"><b>${esc(e.title)}</b><small>${timeLabel(e)}</small></button>`;}
  function renderEventCard(e){return `<article class="obcal-event" data-entry="${e.id}" style="--c:${calendarColor(e.calendar_id)}"><span></span><div><small>${timeLabel(e)} · ${esc(calendarName(e.calendar_id))}</small><h3>${esc(e.title)}</h3>${e.location?`<p>${esc(e.location)}</p>`:''}${e.activity_id?'<em>OUTBASE活動に接続済み</em>':''}</div><button data-edit="${e.id}">編集</button></article>`;}
  function calendarColor(id){return state.calendars.find(c=>c.id===id)?.color||'#174d31';}
  function calendarName(id){return state.calendars.find(c=>c.id===id)?.name||'カレンダー';}
  function timeLabel(e){if(e.all_day)return '終日';const s=parseDate(e.start_at),t=parseDate(e.end_at);return `${pad(s.getHours())}:${pad(s.getMinutes())}〜${pad(t.getHours())}:${pad(t.getMinutes())}`;}
  function formatDate(key){const d=new Date(`${key}T00:00:00`);return `${d.getMonth()+1}月${d.getDate()}日（${['日','月','火','水','木','金','土'][d.getDay()]}）`;}

  function renderModal(){
    if(!state.modal)return '';
    if(state.modal==='filters')return `<div class="obcal-modal"><div class="obcal-sheet"><button class="obcal-close" data-act="close">${icon('close')}</button><h2>表示するカレンダー</h2>${state.calendars.map(c=>`<label class="obcal-calrow"><input type="checkbox" data-cal="${c.id}" ${state.filters.has(c.id)?'checked':''}><i style="--c:${c.color}"></i><span>${esc(c.name)}</span></label>`).join('')}</div></div>`;
    if(state.modal==='import')return `<div class="obcal-modal"><div class="obcal-sheet"><button class="obcal-close" data-act="close">${icon('close')}</button><h2>カレンダーを取り込む</h2><p>ジョルテやGoogleカレンダーから書き出したICS、OUTBASEバックアップJSONを選択できます。</p><input id="obcalImport" type="file" accept=".ics,.json,.csv"><button class="obcal-primary" data-act="run-import">取り込む</button></div></div>`;
    if(state.modal==='export')return `<div class="obcal-modal"><div class="obcal-sheet"><button class="obcal-close" data-act="close">${icon('close')}</button><h2>エクスポート</h2><button class="obcal-primary" data-export="ics">iCalendar（ICS）</button><button class="obcal-secondary" data-export="csv">CSV</button><button class="obcal-secondary" data-export="json">OUTBASE完全バックアップ</button></div></div>`;
    const e=state.editing||normalizeEntry({start_at:`${state.selected}T09:00:00`,end_at:`${state.selected}T10:00:00`});
    return `<div class="obcal-modal"><form class="obcal-sheet obcal-editor" id="obcalForm"><button type="button" class="obcal-close" data-act="close">${icon('close')}</button><h2>${state.editing?'予定を編集':'予定を追加'}</h2>
      <label>タイトル<input name="title" required value="${esc(e.title==='予定'?'':e.title)}"></label>
      <label>カレンダー<select name="calendar_id">${state.calendars.map(c=>`<option value="${c.id}" ${c.id===e.calendar_id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label>
      <label class="obcal-check"><input type="checkbox" name="all_day" ${e.all_day?'checked':''}>終日</label>
      <div class="obcal-two"><label>開始<input type="datetime-local" name="start_at" value="${localIso(e.start_at)}"></label><label>終了<input type="datetime-local" name="end_at" value="${localIso(e.end_at)}"></label></div>
      <label>場所<input name="location" value="${esc(e.location)}"></label><label>メモ<textarea name="notes">${esc(e.notes)}</textarea></label>
      <label>繰り返し<select name="recurrence"><option value="">なし</option><option value="FREQ=DAILY" ${e.recurrence==='FREQ=DAILY'?'selected':''}>毎日</option><option value="FREQ=WEEKLY" ${e.recurrence==='FREQ=WEEKLY'?'selected':''}>毎週</option><option value="FREQ=MONTHLY" ${e.recurrence==='FREQ=MONTHLY'?'selected':''}>毎月</option><option value="FREQ=YEARLY" ${e.recurrence==='FREQ=YEARLY'?'selected':''}>毎年</option></select></label>
      <div class="obcal-actions"><button type="submit" class="obcal-primary">保存</button>${state.editing?'<button type="button" class="obcal-secondary" data-act="duplicate">複製</button><button type="button" class="obcal-danger" data-act="delete">削除</button>':''}</div>
    </form></div>`;
  }

  function bind(root){
    root.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;render();});
    root.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>{const same=state.selected===b.dataset.date;state.selected=b.dataset.date;if(same)openEditor();else render();});
    root.querySelectorAll('[data-entry],[data-edit]').forEach(b=>b.onclick=e=>{e.stopPropagation();openEditor(b.dataset.entry||b.dataset.edit);});
    root.querySelectorAll('[data-cal]').forEach(x=>x.onchange=()=>{x.checked?state.filters.add(x.dataset.cal):state.filters.delete(x.dataset.cal);render();});
    root.querySelectorAll('[data-todo]').forEach(x=>x.onchange=async()=>{const t=state.todos.find(t=>t.id===x.dataset.todo);if(t){t.completed=x.checked;t.updated_at=new Date().toISOString();await put('todos',t);refresh();}});
    root.querySelectorAll('[data-act]').forEach(b=>b.onclick=e=>{e.preventDefault();action(b.dataset.act);});
    root.querySelectorAll('[data-export]').forEach(b=>b.onclick=()=>exportData(b.dataset.export));
    const form=root.querySelector('#obcalForm');if(form)form.onsubmit=saveForm;
  }

  function action(name){
    if(name==='prev'||name==='next'){const delta=name==='prev'?-1:1;if(state.view==='month')state.date.setMonth(state.date.getMonth()+delta);else state.date.setDate(state.date.getDate()+delta*(state.view==='week'?7:1));state.selected=dateKey(state.date);render();return;}
    if(name==='today'){state.date=new Date();state.selected=dateKey(new Date());render();return;}
    if(name==='add'){openEditor();return;}
    if(name==='filter'){state.modal='filters';render();return;}
    if(name==='import'){state.modal='import';render();return;}
    if(name==='export'){state.modal='export';render();return;}
    if(name==='close'){state.modal=null;state.editing=null;render();return;}
    if(name==='duplicate'){const copy={...state.editing,id:uid(),title:`${state.editing.title}（コピー）`,created_at:new Date().toISOString()};state.editing=copy;state.modal='editor';render();return;}
    if(name==='delete'){if(confirm('この予定を削除しますか？'))remove('entries',state.editing.id).then(()=>{state.modal=null;state.editing=null;refresh();});return;}
    if(name==='run-import'){runImport();}
  }
  function openEditor(id){state.editing=id?state.entries.find(e=>e.id===id):null;state.modal='editor';render();}
  async function saveForm(ev){ev.preventDefault();const fd=new FormData(ev.currentTarget);const base=state.editing||{};const row=normalizeEntry({...base,title:fd.get('title'),calendar_id:fd.get('calendar_id'),all_day:fd.get('all_day')==='on',start_at:fd.get('start_at'),end_at:fd.get('end_at'),location:fd.get('location'),notes:fd.get('notes'),recurrence:fd.get('recurrence')||null});await put('entries',row);state.modal=null;state.editing=null;state.selected=dateKey(row.start_at);state.date=new Date(row.start_at);refresh();}

  async function runImport(){
    const file=document.querySelector('#obcalImport')?.files?.[0];if(!file){alert('ファイルを選択してください');return;}
    const text=await file.text();let imported=[];
    if(file.name.toLowerCase().endsWith('.ics'))imported=parseICS(text);
    else if(file.name.toLowerCase().endsWith('.json')){const data=JSON.parse(text);imported=data.entries||data.calendar_entries||[];}
    else imported=parseCSV(text);
    const existing=await all('entries');
    const keys=new Set(existing.map(e=>e.external_uid||fingerprint(e)));
    let added=0,skipped=0;
    for(const raw of imported){const row=normalizeEntry({...raw,calendar_id:raw.calendar_id||'cal-import',source:'import'});const key=row.external_uid||fingerprint(row);if(keys.has(key)){skipped++;continue;}keys.add(key);await put('entries',row);added++;}
    await put('imports',{id:uid(),source:file.name,created_at:new Date().toISOString(),added,skipped});
    state.modal=null;await refresh();alert(`${added}件を取り込みました。重複候補${skipped}件は除外しました。`);
  }
  function fingerprint(e){return [e.title,dateKey(e.start_at),e.start_at,e.end_at].join('|').toLowerCase();}
  function parseICS(text){
    const lines=text.replace(/\r\n[ \t]/g,'').split(/\r?\n/),out=[];let cur=null;
    const val=l=>l.slice(l.indexOf(':')+1).replace(/\\n/g,'\n').replace(/\\,/g,',');
    const dt=v=>{if(/^\d{8}$/.test(v))return `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T00:00:00`;const z=v.replace('Z','');return `${z.slice(0,4)}-${z.slice(4,6)}-${z.slice(6,8)}T${z.slice(9,11)}:${z.slice(11,13)}:${z.slice(13,15)||'00'}${v.endsWith('Z')?'Z':''}`;};
    for(const l of lines){if(l==='BEGIN:VEVENT'){cur={};continue;}if(l==='END:VEVENT'&&cur){out.push(cur);cur=null;continue;}if(!cur)continue;if(l.startsWith('UID'))cur.external_uid=val(l);else if(l.startsWith('SUMMARY'))cur.title=val(l);else if(l.startsWith('DTSTART')){const v=val(l);cur.start_at=dt(v);cur.all_day=/VALUE=DATE/.test(l)||/^\d{8}$/.test(v);}else if(l.startsWith('DTEND'))cur.end_at=dt(val(l));else if(l.startsWith('LOCATION'))cur.location=val(l);else if(l.startsWith('DESCRIPTION'))cur.notes=val(l);else if(l.startsWith('RRULE'))cur.recurrence=val(l);}
    return out;
  }
  function parseCSV(text){const lines=text.split(/\r?\n/).filter(Boolean);if(lines.length<2)return[];const headers=lines[0].split(',').map(x=>x.trim().replace(/^"|"$/g,''));return lines.slice(1).map(line=>{const cols=line.match(/("(?:[^"]|"")*"|[^,]*)/g).filter((_,i)=>i%2===0).map(x=>x.replace(/^"|"$/g,'').replace(/""/g,'"'));const o={};headers.forEach((h,i)=>o[h]=cols[i]||'');return {title:o.title||o['タイトル'],start_at:o.start_at||o['開始'],end_at:o.end_at||o['終了'],location:o.location||o['場所'],notes:o.notes||o['メモ']};});}

  async function exportData(type){
    const entries=visibleEntries().filter(e=>!e.deleted_at);let content='',name='',mime='text/plain';
    if(type==='json'){content=JSON.stringify({schemaVersion:2,generatedAt:new Date().toISOString(),calendars:state.calendars,entries,todos:state.todos},null,2);name=`OUTBASE_calendar_backup_${dateKey(new Date())}.json`;mime='application/json';}
    if(type==='csv'){const q=v=>`"${String(v??'').replaceAll('"','""')}"`;content=['title,start_at,end_at,all_day,calendar,location,notes',...entries.map(e=>[e.title,e.start_at,e.end_at,e.all_day,calendarName(e.calendar_id),e.location,e.notes].map(q).join(','))].join('\n');name=`OUTBASE_calendar_${dateKey(new Date())}.csv`;mime='text/csv';}
    if(type==='ics'){const fmt=v=>new Date(v).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');content=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//OUTBASE//Calendar v2//JA',...entries.flatMap(e=>['BEGIN:VEVENT',`UID:${e.external_uid||e.id}@outbase`,`DTSTAMP:${fmt(e.updated_at)}`,e.all_day?`DTSTART;VALUE=DATE:${dateKey(e.start_at).replaceAll('-','')}`:`DTSTART:${fmt(e.start_at)}`,e.all_day?`DTEND;VALUE=DATE:${dateKey(new Date(new Date(e.end_at).getTime()+86400000)).replaceAll('-','')}`:`DTEND:${fmt(e.end_at)}`,`SUMMARY:${e.title.replace(/[,;]/g,'\\$&')}`,e.location?`LOCATION:${e.location}`:'',e.notes?`DESCRIPTION:${e.notes.replace(/\n/g,'\\n')}`:'',e.recurrence?`RRULE:${e.recurrence}`:'','END:VEVENT'].filter(Boolean)),'END:VCALENDAR'].join('\r\n');name=`OUTBASE_calendar_${dateKey(new Date())}.ics`;mime='text/calendar';}
    const blob=new Blob([content],{type:`${mime};charset=utf-8`});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);state.modal=null;render();
  }

  async function generateWidgetSnapshot(){
    try{const now=new Date(),today=dateKey(now),month=monthKey(now);const upcoming=visibleEntries().filter(e=>new Date(e.end_at)>=startOfDay(now)).sort((a,b)=>String(a.start_at).localeCompare(String(b.start_at))).slice(0,20);const markers={};for(const e of visibleEntries()){const k=dateKey(e.start_at);if(k.startsWith(month))markers[k]=(markers[k]||0)+1;}await put('widget_snapshots',{id:'latest',schemaVersion:1,generated_at:new Date().toISOString(),today,month,todayEntries:entriesForDay(today).map(light),upcomingEntries:upcoming.map(light),openTodos:state.todos.filter(t=>!t.completed).slice(0,20),monthMarkers:markers,nextActivity:upcoming.find(x=>x.activity_id)||null});}catch(error){console.warn('[OUTBASE Calendar v2] widget snapshot failed',error);}
  }
  const light=e=>({id:e.id,title:e.title,start_at:e.start_at,end_at:e.end_at,all_day:e.all_day,calendar_id:e.calendar_id,activity_id:e.activity_id||null});

  function mountWhenReady(){
    let lastSignature='';
    const attempt=()=>{
      const main=targetMain();
      if(!main)return false;
      const signature=`${location.href}|${main.childElementCount}|${main.textContent?.slice(0,80)}`;
      if(main.querySelector('.obcal-shell[data-version="'+VERSION+'"]'))return true;
      if(signature===lastSignature)return false;
      lastSignature=signature;
      render();
      return true;
    };
    attempt();
    const observer=new MutationObserver(()=>setTimeout(attempt,0));
    observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['data-ob6-route']});
    addEventListener('popstate',()=>setTimeout(attempt,0));
    addEventListener('outbase:app-ready',()=>setTimeout(attempt,0));
    setTimeout(attempt,250);
    setTimeout(attempt,1000);
  }

  async function init(){
    if(!('indexedDB'in globalThis))return;
    await ensureDefaults();await migrateLegacy();await refresh();mountWhenReady();
    globalThis.OUTBASE_CALENDAR_V2=Object.freeze({version:VERSION,refresh,openEditor,exportData,generateWidgetSnapshot,db:{open:openDb,all,put,remove}});
  }
  init().catch(error=>console.error('[OUTBASE Calendar v2] init failed',error));
})();
