
(() => {
  'use strict';
  const STORAGE_KEY='outbase_calendar_preview_v21_events';
  const SETTINGS_KEY='outbase_calendar_preview_v21_settings';
  const pad=n=>String(n).padStart(2,'0');
  const dateKey=d=>{const x=new Date(d);return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`};
  const monthKey=d=>{const x=new Date(d);return `${x.getFullYear()}-${pad(x.getMonth()+1)}`};
  const uid=()=>crypto.randomUUID?.()||`obp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  const calendars=[
    {id:'activity',name:'活動',tone:'activity',visible:true},
    {id:'camp',name:'キャンプ',tone:'camp',visible:true},
    {id:'walk',name:'散歩',tone:'walk',visible:true},
    {id:'family',name:'家族',tone:'family',visible:true},
    {id:'personal',name:'個人',tone:'personal',visible:true}
  ];
  const sample=[
    {id:'s1',title:'湖畔キャンプ',start:'2026-07-20T10:00',end:'2026-07-22T12:00',allDay:false,calendarId:'camp',place:'湖畔キャンプ場',memo:'表示確認用サンプル',repeat:'none',notify:'none',participants:['むー','リン'],createdAt:new Date().toISOString()},
    {id:'s2',title:'コタと公園散歩',start:'2026-07-27T08:00',end:'2026-07-27T09:30',allDay:false,calendarId:'walk',place:'公園',memo:'',repeat:'none',notify:'10m',participants:['コタ'],createdAt:new Date().toISOString()}
  ];
  const state={date:new Date('2026-07-19T12:00'),selected:'2026-07-19',view:'month',filters:new Set(calendars.map(x=>x.id)),editing:null};

  function readEvents(){try{const rows=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(Array.isArray(rows))return rows;const old=JSON.parse(localStorage.getItem('outbase_calendar_lab_events_v1')||'null');if(Array.isArray(old)){const migrated=old.map(x=>({...x,calendarId:x.calendarId||x.type||'activity',repeat:x.repeat||'none',notify:x.notify||'none',participants:x.participants||[]}));writeEvents(migrated);return migrated;}return sample;}catch(_){return sample}}
  function writeEvents(rows){localStorage.setItem(STORAGE_KEY,JSON.stringify(rows))}
  function calendarById(id){return calendars.find(x=>x.id===id)||calendars[0]}
  function visibleEvents(){return readEvents().filter(e=>state.filters.has(e.calendarId||'activity'))}
  function eventStartDay(e){return dateKey(e.start)}
  function eventEndDay(e){return dateKey(e.end||e.start)}
  function occursOn(e,k){return k>=eventStartDay(e)&&k<=eventEndDay(e)}
  function eventsForDay(k){return visibleEvents().filter(e=>occursOn(e,k)).sort((a,b)=>String(a.start).localeCompare(String(b.start)))}
  function isMulti(e){return eventStartDay(e)!==eventEndDay(e)}
  function formatDate(k){const d=new Date(k+'T12:00');return `${d.getMonth()+1}月${d.getDate()}日（${'日月火水木金土'[d.getDay()]}）`}
  function formatRange(e){
    const s=new Date(e.start),t=new Date(e.end||e.start);
    if(e.allDay)return `${s.getMonth()+1}/${s.getDate()} 終日`;
    const same=dateKey(s)===dateKey(t);
    return same
      ? `${s.getMonth()+1}/${s.getDate()} ${pad(s.getHours())}:${pad(s.getMinutes())}〜${pad(t.getHours())}:${pad(t.getMinutes())}`
      : `${s.getMonth()+1}/${s.getDate()} ${pad(s.getHours())}:${pad(s.getMinutes())}〜${t.getMonth()+1}/${t.getDate()} ${pad(t.getHours())}:${pad(t.getMinutes())}`;
  }
  function monthCells(){const y=state.date.getFullYear(),m=state.date.getMonth(),first=new Date(y,m,1),start=new Date(y,m,1-first.getDay());return Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d})}

  function render(){
    $('#monthLabel').textContent=`${state.date.getFullYear()}年${state.date.getMonth()+1}月`;
    $('#selectedLabel').textContent=formatDate(state.selected);
    $$('.view-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));
    renderFilters();
    const area=$('#calendarArea');
    area.innerHTML=state.view==='month'?renderMonth():state.view==='week'?renderWeek():state.view==='day'?renderDay():renderList();
    renderAgenda();
    bindDynamic();
  }

  function renderFilters(){
    $('#filterPanel').innerHTML=`<h3>表示するカレンダー</h3><div class="filter-grid">${calendars.map(c=>`<button class="filter-chip ${state.filters.has(c.id)?'active':''}" data-filter="${c.id}">${esc(c.name)}</button>`).join('')}</div>`;
  }

  function renderMonth(){
    const cells=monthCells(),cur=state.date.getMonth(),today=dateKey(new Date());
    const cellMarkup=cells.map(d=>{const k=dateKey(d),rows=eventsForDay(k),singles=rows.filter(e=>!isMulti(e));return `<button class="day-cell ${d.getMonth()!==cur?'outside':''} ${k===state.selected?'selected':''} ${k===today?'today':''}" data-date="${k}"><strong>${d.getDate()}</strong><div class="month-events">${singles.slice(0,2).map(e=>`<span class="month-event tone-${calendarById(e.calendarId).tone}">${esc(e.title)}</span>`).join('')}${singles.length>2?`<span class="month-more">ほか${singles.length-2}件</span>`:''}</div></button>`}).join('');
    return `<section class="calendar-card"><div class="weekdays">${[...'日月火水木金土'].map(x=>`<span>${x}</span>`).join('')}</div><div class="month-grid">${cellMarkup}</div>${renderMultiDayBars(cells)}</section>`;
  }

  function renderMultiDayBars(cells){
    const rows=visibleEvents().filter(isMulti),bars=[];
    const cellMap=new Map(cells.map((d,i)=>[dateKey(d),i]));
    rows.forEach((e,idx)=>{
      let cursor=new Date(eventStartDay(e)+'T12:00'),end=new Date(eventEndDay(e)+'T12:00');
      while(cursor<=end){
        const week=Math.floor((cellMap.get(dateKey(cursor))||0)/7);
        const startIndex=cellMap.get(dateKey(cursor));
        if(startIndex==null){cursor.setDate(cursor.getDate()+1);continue}
        const weekEndIndex=week*7+6;
        let segmentEnd=new Date(cursor);
        while(segmentEnd<end){
          const next=new Date(segmentEnd);next.setDate(next.getDate()+1);
          const ni=cellMap.get(dateKey(next));if(ni==null||ni>weekEndIndex)break;segmentEnd=next;
        }
        const startCol=(startIndex%7)+1,endCol=((cellMap.get(dateKey(segmentEnd))||startIndex)%7)+2;
        const row=idx%2;
        bars.push(`<div class="multiday-row ${dateKey(cursor)===eventStartDay(e)?'start':'middle'} ${dateKey(segmentEnd)===eventEndDay(e)?'end':''}" style="left:calc((100% / 7) * ${startCol-1} + 4px);width:calc((100% / 7) * ${endCol-startCol} - 8px);top:${54 + week*70 + row*21}px">${dateKey(cursor)===eventStartDay(e)?esc(e.title):''}</div>`);
        segmentEnd.setDate(segmentEnd.getDate()+1);cursor=segmentEnd;
      }
    });
    return `<div class="multiday-layer">${bars.join('')}</div>`;
  }

  function renderWeek(){
    const base=new Date(state.selected+'T12:00');base.setDate(base.getDate()-base.getDay());
    const days=Array.from({length:7},(_,i)=>{const d=new Date(base);d.setDate(base.getDate()+i);return d});
    return `<section class="week-view"><div class="week-columns">${days.map(d=>{const k=dateKey(d),rows=eventsForDay(k);return `<div class="week-col"><button data-date="${k}">${formatDate(k)}</button>${rows.map(eventCard).join('')||'<p>予定なし</p>'}</div>`}).join('')}</div></section>`;
  }
  function renderDay(){const rows=eventsForDay(state.selected);return `<section class="day-view"><h2>${formatDate(state.selected)}</h2>${rows.map(eventCard).join('')||'<div class="empty">予定なし</div>'}</section>`}
  function renderList(){const rows=visibleEvents().slice().sort((a,b)=>String(a.start).localeCompare(String(b.start)));return `<section class="list-view">${rows.map(eventCard).join('')||'<div class="empty">予定なし</div>'}</section>`}
  function eventCard(e){
    const cal=calendarById(e.calendarId);
    return `<article class="event-card" data-edit="${esc(e.id)}">
      <h3>${esc(e.title)}</h3>
      <p>${esc(formatRange(e))}</p>
      ${e.place?`<p>${esc(e.place)}</p>`:''}
      <div class="event-meta">
        <span class="badge">${esc(cal.name)}</span>
        ${e.repeat!=='none'?`<span class="badge">繰返</span>`:''}
        ${e.notify!=='none'?`<span class="badge">通知</span>`:''}
      </div>
    </article>`;
  }
  function renderAgenda(){const rows=eventsForDay(state.selected);$('#agendaList').innerHTML=rows.length?rows.map(eventCard).join(''):'<div class="empty">この日の予定はありません。</div>'}

  function bindDynamic(){
    $$('[data-date]').forEach(b=>b.onclick=()=>{const k=b.dataset.date;if(state.selected===k)openEditor(null,k);else{state.selected=k;state.date=new Date(k+'T12:00');render()}});
    $$('[data-edit]').forEach(x=>x.onclick=()=>openEditor(x.dataset.edit));
    $$('[data-filter]').forEach(b=>b.onclick=()=>{state.filters.has(b.dataset.filter)?state.filters.delete(b.dataset.filter):state.filters.add(b.dataset.filter);render()});
  }

  function openModal({eyebrow,title,body}){$('#sheetEyebrow').textContent=eyebrow;$('#sheetTitle').textContent=title;$('#sheetBody').innerHTML=body;$('#modal').classList.remove('hidden');$('#modal').setAttribute('aria-hidden','false')}
  function closeModal(){$('#modal').classList.add('hidden');$('#modal').setAttribute('aria-hidden','true');state.editing=null}
  function toLocal(v){const d=new Date(v);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}

  function openEditor(id,date){
    const rows=readEvents(),e=id?rows.find(x=>x.id===id):null;state.editing=e?.id||null;
    const base=date||state.selected,start=e?.start||`${base}T09:00`,end=e?.end||`${base}T10:00`;
    openModal({eyebrow:'予定',title:e?'予定を編集':'予定を追加',body:`
      <form id="eventForm">
        <input type="hidden" name="id" value="${esc(e?.id||'')}">
        <div class="form-section"><label>タイトル<input name="title" required maxlength="100" value="${esc(e?.title||'')}"></label></div>
        <div class="form-section form-grid two">
          <label>開始<input name="start" type="datetime-local" required value="${esc(start)}"></label>
          <label>終了<input name="end" type="datetime-local" required value="${esc(end)}"></label>
        </div>
        <div class="check-row"><label><input name="allDay" type="checkbox" ${e?.allDay?'checked':''}>終日</label></div>
        <div class="form-section form-grid two">
          <label>カレンダー<select name="calendarId">${calendars.map(c=>`<option value="${c.id}" ${(e?.calendarId||'activity')===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label>
          <label>通知<select name="notify"><option value="none">なし</option><option value="10m" ${e?.notify==='10m'?'selected':''}>10分前</option><option value="1h" ${e?.notify==='1h'?'selected':''}>1時間前</option><option value="1d" ${e?.notify==='1d'?'selected':''}>1日前</option></select></label>
        </div>
        <div class="form-section form-grid two">
          <label>繰り返し<select name="repeat"><option value="none">なし</option><option value="daily" ${e?.repeat==='daily'?'selected':''}>毎日</option><option value="weekly" ${e?.repeat==='weekly'?'selected':''}>毎週</option><option value="monthly" ${e?.repeat==='monthly'?'selected':''}>毎月</option><option value="yearly" ${e?.repeat==='yearly'?'selected':''}>毎年</option></select></label>
          <label>参加者<input name="participants" value="${esc((e?.participants||[]).join('、'))}" placeholder="むー、リン、コタ"></label>
        </div>
        <div class="form-section"><label>場所<input name="place" value="${esc(e?.place||'')}"></label></div>
        <div class="form-section"><label>メモ<textarea name="memo" rows="4">${esc(e?.memo||'')}</textarea></label></div>
        <div class="form-actions">
          ${e?'<button type="button" id="deleteBtn" class="danger">削除</button><button type="button" id="duplicateBtn" class="secondary">複製</button>':''}
          <button type="submit" class="primary">保存</button>
        </div>
      </form>`});
    $('#eventForm').onsubmit=saveEditor;
    $('#deleteBtn')?.addEventListener('click',()=>{if(confirm('この予定を削除しますか？')){writeEvents(readEvents().filter(x=>x.id!==state.editing));closeModal();render()}});
    $('#duplicateBtn')?.addEventListener('click',()=>{const src=readEvents().find(x=>x.id===state.editing);if(!src)return;const copy={...src,id:uid(),title:`${src.title}（コピー）`,createdAt:new Date().toISOString()};writeEvents([...readEvents(),copy]);closeModal();render()});
  }

  function saveEditor(ev){
    ev.preventDefault();const fd=new FormData(ev.currentTarget),rows=readEvents(),id=fd.get('id')||uid();
    const row={id,title:String(fd.get('title')||'').trim(),start:fd.get('start'),end:fd.get('end'),allDay:fd.get('allDay')==='on',calendarId:fd.get('calendarId'),notify:fd.get('notify'),repeat:fd.get('repeat'),participants:String(fd.get('participants')||'').split(/[、,]/).map(x=>x.trim()).filter(Boolean),place:fd.get('place'),memo:fd.get('memo'),updatedAt:new Date().toISOString()};
    const i=rows.findIndex(x=>x.id===id);if(i>=0)rows[i]={...rows[i],...row};else rows.push({...row,createdAt:new Date().toISOString()});
    writeEvents(rows);state.selected=dateKey(row.start);state.date=new Date(row.start);closeModal();render();
  }

  function openSettings(){
    openModal({eyebrow:'CALENDAR',title:'カレンダー設定',body:`
      <div class="settings-list">
        <section class="settings-block"><h3>インポート・エクスポート</h3><p>ジョルテや他カレンダーから移行する受け口です。</p><div class="settings-actions"><button id="importIcs">ICS取込</button><button id="exportIcs">ICS出力</button><button id="exportJson">完全バックアップ</button></div></section>
        <section class="settings-block"><h3>表示</h3><p>月・週・日・一覧を同じ予定データから切り替えます。</p></section>
        <section class="settings-block"><h3>将来のアプリ・ウィジェット</h3><p>今日の予定・近日予定・月間マーカーを同じデータから生成できる構造で保持します。</p><div class="settings-actions"><button id="widgetPreview">ウィジェット用データ確認</button></div></section>
      </div>`});
    $('#importIcs').onclick=()=>$('#icsFile').click();
    $('#exportIcs').onclick=exportIcs;
    $('#exportJson').onclick=exportJson;
    $('#widgetPreview').onclick=()=>{
      const now=new Date();
      const today=dateKey(now);
      const snapshot={
        schemaVersion:1,
        generatedAt:new Date().toISOString(),
        today,
        todayEntries:readEvents().filter(e=>occursOn(e,today)),
        upcomingEntries:readEvents().filter(e=>new Date(e.end||e.start)>=now).sort((a,b)=>String(a.start).localeCompare(String(b.start))).slice(0,10),
        monthMarkers:readEvents().reduce((acc,e)=>{const k=dateKey(e.start);acc[k]=(acc[k]||0)+1;return acc;},{})
      };
      alert(JSON.stringify(snapshot,null,2));
    };
  }

  function parseIcs(text){
    const lines=text.replace(/\r\n[ \t]/g,'').split(/\r?\n/),out=[];let cur=null;
    const val=l=>l.slice(l.indexOf(':')+1).replace(/\\n/g,'\n').replace(/\\,/g,',');
    const dt=v=>/^\d{8}$/.test(v)?`${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T00:00`:`${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T${v.slice(9,11)}:${v.slice(11,13)}`;
    for(const l of lines){if(l==='BEGIN:VEVENT'){cur={id:uid(),calendarId:'activity',notify:'none',repeat:'none',participants:[]};continue}if(l==='END:VEVENT'&&cur){cur.end=cur.end||cur.start;out.push(cur);cur=null;continue}if(!cur)continue;if(l.startsWith('SUMMARY'))cur.title=val(l);else if(l.startsWith('DTSTART'))cur.start=dt(val(l));else if(l.startsWith('DTEND'))cur.end=dt(val(l));else if(l.startsWith('LOCATION'))cur.place=val(l);else if(l.startsWith('DESCRIPTION'))cur.memo=val(l);else if(l.startsWith('RRULE'))cur.repeat=val(l);}
    return out;
  }
  function fingerprint(e){return [e.title,e.start,e.end].join('|').toLowerCase()}
  function exportIcs(){const fmt=v=>new Date(v).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const body=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//OUTBASE Preview//JA',...readEvents().flatMap(e=>['BEGIN:VEVENT',`UID:${e.id}@outbase`,`DTSTART:${fmt(e.start)}`,`DTEND:${fmt(e.end)}`,`SUMMARY:${e.title}`,e.place?`LOCATION:${e.place}`:'',e.memo?`DESCRIPTION:${String(e.memo).replace(/\n/g,'\\n')}`:'','END:VEVENT'].filter(Boolean)),'END:VCALENDAR'].join('\r\n');download(body,'OUTBASE_calendar_preview.ics','text/calendar')}
  function exportJson(){download(JSON.stringify({schemaVersion:2,generatedAt:new Date().toISOString(),calendars,events:readEvents()},null,2),'OUTBASE_calendar_preview_backup.json','application/json')}
  function download(content,name,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type:`${type};charset=utf-8`}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}

  $('#icsFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;const imported=parseIcs(await file.text()),rows=readEvents(),keys=new Set(rows.map(fingerprint));let added=0,skipped=0;for(const item of imported){const key=fingerprint(item);if(keys.has(key)){skipped++;continue}keys.add(key);rows.push(item);added++}writeEvents(rows);closeModal();render();alert(`${added}件を取り込みました。重複候補${skipped}件は除外しました。`)};

  $('#addBtn').onclick=()=>openEditor();$('#quickAddBtn').onclick=()=>openEditor();$('#navAdd').onclick=()=>openEditor();
  $('#todayBtn').onclick=()=>{state.date=new Date();state.selected=dateKey(new Date());render()};
  $('#settingsBtn').onclick=openSettings;
  $('#filterBtn').onclick=()=>$('#filterPanel').classList.toggle('hidden');
  $('#prevBtn').onclick=()=>{if(state.view==='month')state.date.setMonth(state.date.getMonth()-1);else state.date.setDate(state.date.getDate()-(state.view==='week'?7:1));state.selected=dateKey(state.date);render()};
  $('#nextBtn').onclick=()=>{if(state.view==='month')state.date.setMonth(state.date.getMonth()+1);else state.date.setDate(state.date.getDate()+(state.view==='week'?7:1));state.selected=dateKey(state.date);render()};
  $$('.view-tabs button').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;render()});
  $('#closeModal').onclick=closeModal;$('#modal').onclick=e=>{if(e.target.id==='modal')closeModal()};

  render();
})();
