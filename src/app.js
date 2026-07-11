(function(){
  const tabs=['plan','search','prep','record','memory'];
  let active=new URLSearchParams(location.search).get('tab')||location.hash.replace('#','')||'plan';
  if(!tabs.includes(active)) active='plan';

  const params=new URLSearchParams(location.search);
  let recordSessionState=params.get('recordState')||localStorage.getItem('outbase_record_session_state')||'idle';
  if(!['idle','active','paused'].includes(recordSessionState)) recordSessionState='idle';
  let recordCount=Number(localStorage.getItem('outbase_record_count')||18);
  let recordTarget=localStorage.getItem('outbase_record_target')||'コタ通常散歩';
  let recordSheet=params.get('sheet')||'';
  let mapMode=Number(localStorage.getItem('outbase_record_map_mode')||0)%2;
  let wakeLock=null;
  let geoWatchId=null;
  let timerId=null;
  let gpsStatus='現在地を確認中';
  let currentPosition=readStored('outbase_record_current_position',null);
  let trackPoints=readStored('outbase_record_track_points',[]);
  let savedPins=readStored('outbase_record_saved_pins',[]);
  let elapsedMs=Number(localStorage.getItem('outbase_record_elapsed_ms')||0);
  let activeStartedAt=recordSessionState==='active'?Number(localStorage.getItem('outbase_record_active_started_at')||Date.now()):0;
  let lastOneShotRequestAt=0;
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
  let currentSessionId=localStorage.getItem('outbase_record_session_id')||'';
  let sessionStartedAt=Number(localStorage.getItem('outbase_record_session_started_at')||0);
  let recoverableSession=readStored('outbase_record_recoverable_session',null);
  let resumeBreakPending=localStorage.getItem('outbase_record_resume_break_pending')==='1';
  const previewMode=params.get('preview')||'';

  const defaultPlanTypes=[
    {id:'type-walk',name:'散歩',tone:'green',hidden:false},
    {id:'type-drive-walk',name:'ドライブ散歩',tone:'gold',hidden:false},
    {id:'type-camp',name:'キャンプ',tone:'green',hidden:false},
    {id:'type-shopping',name:'ショッピング',tone:'blue',hidden:false},
    {id:'type-event',name:'イベント',tone:'slate',hidden:false},
    {id:'type-other',name:'その他',tone:'slate',hidden:false}
  ];
  const defaultCompanions=[
    {id:'comp-solo',name:'ひとり',hidden:false,solo:true},
    {id:'comp-rin',name:'リン',hidden:false},
    {id:'comp-kota',name:'コタ',hidden:false}
  ];
  const defaultPlans=[
    {id:'plan-kota-5',title:'コタ散歩',type:'散歩',start:'2026-07-05',end:'2026-07-05',startTime:'07:00',endTime:'08:00',allDay:false,companionNames:['コタ'],location:'近所',prep:'準備不要',note:''},
    {id:'plan-drive-6',title:'手賀沼ドライブ散歩',type:'ドライブ散歩',start:'2026-07-06',end:'2026-07-06',startTime:'09:00',endTime:'12:00',allDay:false,companionNames:['コタ'],location:'手賀沼',prep:'駐車場確認',note:'駐車位置も記録する。'},
    {id:'plan-shopping-10',title:'ショッピング',type:'ショッピング',start:'2026-07-10',end:'2026-07-10',startTime:'10:00',endTime:'12:00',allDay:false,companionNames:['リン','コタ'],location:'',prep:'準備不要',note:''},
    {id:'plan-kota-12',title:'コタ散歩',type:'散歩',start:'2026-07-12',end:'2026-07-12',startTime:'07:00',endTime:'08:00',allDay:false,companionNames:['コタ'],location:'近所',prep:'準備不要',note:''},
    {id:'plan-drive-13',title:'手賀沼ドライブ散歩',type:'ドライブ散歩',start:'2026-07-13',end:'2026-07-13',startTime:'09:00',endTime:'12:00',allDay:false,companionNames:['コタ'],location:'手賀沼',prep:'準備中',note:'駐車場、水飲み場、日陰を確認する。'},
    {id:'plan-akagi',title:'スノーピーク赤城山CF',type:'キャンプ',start:'2026-07-18',end:'2026-07-20',allDay:true,companionNames:['リン','コタ'],location:'群馬県前橋市',prep:'準備中',note:'2泊。買い物・料理・ギア・ルートを準備。'},
    {id:'plan-event-23',title:'地域イベント',type:'イベント',start:'2026-07-23',end:'2026-07-23',startTime:'13:00',endTime:'16:00',allDay:false,companionNames:[],location:'',prep:'未着手',note:''}
  ];
  let planTypes=readStored('outbase_plan_types_v2',defaultPlanTypes);
  let companions=readStored('outbase_plan_companions_v2',defaultCompanions);
  let plans=readStored('outbase_plans_v1',defaultPlans);
  let selectedPlanDate=localStorage.getItem('outbase_selected_plan_date')||'2026-07-13';
  let planMonth=localStorage.getItem('outbase_plan_month')||selectedPlanDate.slice(0,7);
  let planSheet=params.get('planSheet')||'';
  let selectedPlanId=params.get('planId')||'';
  let planDraft=null;
  let planDraftDirty=false;
  let planSheetDrag=null;
  let planCalendarTouchStart=null;
  let planCalendarSwipeSuppressUntil=0;
  let planReminderTimer=null;
  let activePlanId=localStorage.getItem('outbase_active_plan_id')||'plan-drive-13';
  const defaultGearLibrary=[
    {id:'gear-living-shell',name:'リビングシェル アイボリー',category:'テント',quantity:1,storage:'自宅',condition:'使用可',memo:''},
    {id:'gear-amenity-dome',name:'アメニティドームM アイボリー',category:'テント',quantity:1,storage:'自宅',condition:'使用可',memo:''},
    {id:'gear-igt4',name:'IGT 4ユニット',category:'テーブル',quantity:1,storage:'自宅',condition:'使用可',memo:''},
    {id:'gear-delta3',name:'EcoFlow DELTA 3 1500',category:'電源',quantity:1,storage:'自宅',condition:'使用可',memo:''},
    {id:'gear-glacier',name:'EcoFlow Glacier Classic',category:'冷蔵',quantity:1,storage:'自宅',condition:'使用可',memo:''},
    {id:'gear-kota-cart',name:'AirBuggy Dome3 Large',category:'ペット',quantity:1,storage:'玄関',condition:'使用可',memo:''}
  ];
  let gearLibrary=readStored('outbase_gear_library_v1',defaultGearLibrary);
  let prepStore=readStored('outbase_prep_v1',{});
  let prepSheet='';
  let prepModuleId='';
  let prepSheetDrag=null;
  let modalTapBlockUntil=0;
  if(previewMode==='prep01'||previewMode==='prep01-module') activePlanId='plan-akagi';
  if(previewMode==='prep01-module'){prepSheet='module';prepModuleId='gear';}
  if(previewMode==='plan-add'||previewMode==='plan011-add') planSheet='add';
  if(previewMode==='plan-detail'){planSheet='detail';selectedPlanId='plan-drive-13';}
  if(previewMode==='plan-list') planSheet='list';
  if(previewMode==='plan011-repeat'||previewMode==='plan012-repeat'){planSheet='add';}
  if(previewMode==='plan012-reminder'){planSheet='add';}
  if(previewMode==='plan011-types') planSheet='type-manager';

  function migratePlanData(){
    const schema=Number(localStorage.getItem('outbase_plan_schema')||0);
    const demoRemove=new Set(['plan-oz','plan-tani','plan-check-10']);
    plans=plans.filter(p=>!demoRemove.has(p.id)).map(p=>{
      const companionNames=Array.isArray(p.companionNames)?p.companionNames:String(p.companion||'').split(/[・,、]/).map(x=>x.trim()).filter(Boolean);
      return {...p,type:p.type==='買い物'?'ショッピング':p.type==='日常'?'その他':p.type,startTime:p.startTime||p.time||'',endTime:p.endTime||'',allDay:Boolean(p.allDay),companionNames,reminders:Array.isArray(p.reminders)?p.reminders:[],allDayReminderTime:p.allDayReminderTime||'09:00'};
    });
    if(!plans.length) plans=defaultPlans.map(p=>({...p,reminders:[],allDayReminderTime:'09:00'}));
    if(schema<3){
      localStorage.setItem('outbase_plan_schema','3');
      localStorage.setItem('outbase_plans_v1',JSON.stringify(plans));
    }
  }
  migratePlanData();

  if(recordSessionState==='idle'){
    elapsedMs=0;
    activeStartedAt=0;
    trackPoints=[];
    currentSessionId='';
    sessionStartedAt=0;
    resumeBreakPending=false;
    localStorage.setItem('outbase_record_elapsed_ms','0');
    localStorage.setItem('outbase_record_track_points','[]');
    localStorage.removeItem('outbase_record_active_started_at');
    localStorage.removeItem('outbase_record_session_id');
    localStorage.removeItem('outbase_record_session_started_at');
    localStorage.removeItem('outbase_record_resume_break_pending');
  }else if(recordSessionState==='paused'){
    activeStartedAt=0;
  }
  if(currentPosition){
    gpsStatus=recordSessionState==='active'
      ?`GPS記録中 ±${currentPosition.accuracy||'-'}m`
      :recordSessionState==='paused'
        ?`一時停止中・現在地取得済み ±${currentPosition.accuracy||'-'}m`
        :`現在地取得済み ±${currentPosition.accuracy||'-'}m`;
  }

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


  function parseYmd(value){
    const [y,m,d]=String(value).split('-').map(Number);
    return new Date(y,m-1,d,12,0,0,0);
  }
  function toYmd(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
  function addDays(date,days){const d=new Date(date);d.setDate(d.getDate()+days);return d;}
  function compareYmd(a,b){return String(a).localeCompare(String(b));}
  function planForId(id){return plans.find(p=>p.id===id)||null;}
  function activePlan(){
    if(activePlanId==='none')return null;
    return planForId(activePlanId)||plans.find(p=>compareYmd(p.end||p.start,new Date().toISOString().slice(0,10))>=0)||plans[0]||null;
  }
  function activePlanCandidates(){
    const today=new Date().toISOString().slice(0,10),current=planForId(activePlanId);
    const rows=plans.filter(p=>p.id===current?.id||compareYmd(p.end||p.start,today)>=0).sort((a,b)=>compareYmd(a.start,b.start)||(a.startTime||'').localeCompare(b.startTime||''));
    return rows.slice(0,12);
  }
  function anySheetOpen(){return Boolean(planSheet||prepSheet||recordSheet);}
  function blockUnderlyingNavigation(ms=420){modalTapBlockUntil=Math.max(modalTapBlockUntil,Date.now()+ms);}
  function planTypeLabel(type){return type||'予定';}
  function planTypeSetting(name){return planTypes.find(t=>t.name===name)||null;}
  function planTone(plan){return plan.tone||planTypeSetting(plan.type)?.tone||'slate';}
  function planCompanionNames(plan){
    if(Array.isArray(plan.companionNames)) return plan.companionNames.filter(Boolean);
    if(Array.isArray(plan.companionIds)) return plan.companionIds.map(id=>companions.find(c=>c.id===id)?.name).filter(Boolean);
    return String(plan.companion||'').split(/[・,、]/).map(x=>x.trim()).filter(Boolean);
  }
  function planCompanionLabel(plan){return planCompanionNames(plan).join('・');}
  function dateTimeAt(value,time,endOfDay=false){
    const [y,m,d]=String(value).split('-').map(Number);
    if(time){const [hh,mm]=time.split(':').map(Number);return new Date(y,m-1,d,hh||0,mm||0,0,0);}
    return endOfDay?new Date(y,m-1,d,23,59,59,999):new Date(y,m-1,d,0,0,0,0);
  }
  function planStatus(plan){
    if(plan.manualStatus==='中止'||plan.manualStatus==='未実施') return plan.manualStatus;
    const now=new Date();
    const start=dateTimeAt(plan.start,plan.allDay?'':(plan.startTime||plan.time||''),false);
    const end=dateTimeAt(plan.end||plan.start,plan.allDay?'':(plan.endTime||''),true);
    if(now<start) return '予定';
    if(now<=end) return '実施中';
    return '終了済み';
  }
  function planRangeLabel(plan){
    if(!plan) return '';
    const s=parseYmd(plan.start),e=parseYmd(plan.end||plan.start);
    const left=`${s.getMonth()+1}/${s.getDate()}`;
    const right=plan.end&&plan.end!==plan.start?`−${e.getMonth()+1}/${e.getDate()}`:'';
    const startTime=plan.allDay?'':(plan.startTime||plan.time||'');
    const endTime=plan.allDay?'':(plan.endTime||'');
    const times=startTime?` ${startTime}${endTime?`−${endTime}`:''}`:'';
    return `${left}${right}${times}`;
  }
  function selectedDateLabel(value){const d=parseYmd(value),w=['日','月','火','水','木','金','土'][d.getDay()];return `${d.getMonth()+1}月${d.getDate()}日（${w}）`;}
  function plansForDate(value){return plans.filter(p=>compareYmd(p.start,value)<=0&&compareYmd(p.end||p.start,value)>=0).sort((a,b)=>(a.startTime||a.time||'99:99').localeCompare(b.startTime||b.time||'99:99'));}
  function persistPlans(){
    localStorage.setItem('outbase_plans_v1',JSON.stringify(plans));
    localStorage.setItem('outbase_plan_types_v2',JSON.stringify(planTypes));
    localStorage.setItem('outbase_plan_companions_v2',JSON.stringify(companions));
    localStorage.setItem('outbase_selected_plan_date',selectedPlanDate);
    localStorage.setItem('outbase_plan_month',planMonth);
    localStorage.setItem('outbase_active_plan_id',activePlanId);
    localStorage.setItem('outbase_plan_schema','3');
  }
  function monthCalendar(monthKey){
    const [y,m]=monthKey.split('-').map(Number),first=new Date(y,m-1,1,12),last=new Date(y,m,0,12);
    const start=addDays(first,-first.getDay()),end=addDays(last,6-last.getDay());
    const days=[];for(let d=new Date(start);d<=end;d=addDays(d,1)) days.push(new Date(d));
    return {year:y,month:m,days,weeks:days.length/7,start:toYmd(start),end:toYmd(end)};
  }
  function changePlanMonth(direction){
    const [y,m]=planMonth.split('-').map(Number),d=new Date(y,m-1+direction,1,12);
    planMonth=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    selectedPlanDate=`${planMonth}-01`;
    persistPlans();
  }
  function calendarSegments(meta){
    const visible=plans.filter(p=>compareYmd(p.end||p.start,meta.start)>=0&&compareYmd(p.start,meta.end)<=0);
    const occupied=Array.from({length:meta.weeks},()=>[[],[]]);
    const html=[];
    for(const plan of visible.sort((a,b)=>compareYmd(a.start,b.start)||compareYmd(b.end||b.start,a.end||a.start))){
      const ps=parseYmd(plan.start),pe=parseYmd(plan.end||plan.start);
      for(let week=0;week<meta.weeks;week++){
        const ws=meta.days[week*7],we=meta.days[week*7+6];
        const ss=ps>ws?ps:ws,se=pe<we?pe:we;if(ss>se) continue;
        const col=Math.round((ss-ws)/86400000)+1,span=Math.round((se-ss)/86400000)+1;
        let lane=0;while(lane<2&&occupied[week][lane].some(r=>!(col+span-1<r[0]||col>r[1]))) lane++;
        if(lane>=2) continue;occupied[week][lane].push([col,col+span-1]);
        html.push(`<div class="eventBar ${planTone(plan)} planSegment" style="grid-column:${col}/span ${span};grid-row:${week+1};--lane:${lane}" aria-hidden="true">${escapeHtml(plan.title)}</div>`);
      }
    }
    return html.join('');
  }
  function companionIdsForPlan(plan){
    if(Array.isArray(plan?.companionIds)) return plan.companionIds.filter(id=>companions.some(c=>c.id===id));
    const names=planCompanionNames(plan||{});
    return names.map(name=>companions.find(c=>c.name===name)?.id).filter(Boolean);
  }
  function defaultRepeat(startValue){
    const start=parseYmd(startValue||selectedPlanDate),day=start.getDate(),weekday=start.getDay();
    const lastDay=new Date(start.getFullYear(),start.getMonth()+1,0,12).getDate();
    const ordinal=day+7>lastDay?-1:Math.ceil(day/7);
    return {mode:'none',customFrequency:'weekly',interval:2,weekdays:[weekday],monthlyMode:'dayOfMonth',monthDay:day,monthOrdinal:ordinal,monthWeekday:weekday,endMode:'none',count:10,until:''};
  }
  function normalizeRepeat(raw,startValue){
    const base=defaultRepeat(startValue),r=raw||{};
    if(r.mode){return {...base,...r,weekdays:Array.isArray(r.weekdays)&&r.weekdays.length?r.weekdays.map(Number):base.weekdays};}
    if(r.frequency&&r.frequency!=='none'){
      const interval=Math.max(1,Number(r.interval)||1);
      return {...base,mode:interval===1?r.frequency:'custom',customFrequency:r.frequency,interval,weekdays:Array.isArray(r.weekdays)&&r.weekdays.length?r.weekdays.map(Number):base.weekdays,endMode:r.endMode||'none',count:Number(r.count)||10,until:r.until||''};
    }
    return base;
  }
  function blankPlanDraft(plan=null){
    const editing=Boolean(plan),startValue=plan?.start||selectedPlanDate;
    return {
      editingId:plan?.id||'',title:plan?.title||'',start:startValue,end:plan?.end||plan?.start||selectedPlanDate,
      startTime:plan?.startTime||plan?.time||'',endTime:plan?.endTime||'',allDay:editing?Boolean(plan.allDay):true,
      type:plan?.type||'',companionIds:companionIdsForPlan(plan),companionNames:planCompanionNames(plan||{}),location:plan?.location||'',note:plan?.note||'',
      repeat:normalizeRepeat(plan?.repeat,startValue),reminders:Array.isArray(plan?.reminders)?plan.reminders.map(x=>({...x,id:x.id||newId('reminder')})):[],allDayReminderTime:plan?.allDayReminderTime||'09:00'
    };
  }
  function ensurePlanDraft(plan=null){if(!planDraft||planDraft.editingId!==(plan?.id||'')) planDraft=blankPlanDraft(plan);return planDraft;}
  function syncPlanDraftFromForm(){
    if(!planDraft) return;
    const get=id=>document.getElementById(id);
    planDraft.title=get('planTitleInput')?.value??planDraft.title;
    planDraft.start=get('planStartInput')?.value||planDraft.start;
    planDraft.end=get('planEndInput')?.value||planDraft.end;
    planDraft.startTime=get('planStartTimeInput')?.value??planDraft.startTime;
    planDraft.endTime=get('planEndTimeInput')?.value??planDraft.endTime;
    planDraft.allDay=Boolean(get('planAllDayInput')?.checked);
    planDraft.location=get('planLocationInput')?.value??planDraft.location;
    planDraft.note=get('planNoteInput')?.value??planDraft.note;
    planDraft.allDayReminderTime=get('planAllDayReminderTime')?.value||planDraft.allDayReminderTime||'09:00';
    const mode=get('planRepeatMode');if(mode) planDraft.repeat.mode=mode.value;
    const customFrequency=get('planRepeatCustomFrequency');if(customFrequency) planDraft.repeat.customFrequency=customFrequency.value;
    const interval=get('planRepeatInterval');if(interval) planDraft.repeat.interval=Math.max(1,Number(interval.value)||1);
    const monthlyMode=get('planRepeatMonthlyMode');if(monthlyMode) planDraft.repeat.monthlyMode=monthlyMode.value;
    const monthDay=get('planRepeatMonthDay');if(monthDay) planDraft.repeat.monthDay=Math.min(31,Math.max(1,Number(monthDay.value)||1));
    const monthOrdinal=get('planRepeatMonthOrdinal');if(monthOrdinal) planDraft.repeat.monthOrdinal=Number(monthOrdinal.value)||1;
    const monthWeekday=get('planRepeatMonthWeekday');if(monthWeekday) planDraft.repeat.monthWeekday=Number(monthWeekday.value)||0;
    const endMode=get('planRepeatEndMode');if(endMode) planDraft.repeat.endMode=endMode.value;
    const count=get('planRepeatCount');if(count) planDraft.repeat.count=Math.max(1,Number(count.value)||10);
    const until=get('planRepeatUntil');if(until) planDraft.repeat.until=until.value;
    const reminderRows=[...document.querySelectorAll('[data-reminder-row]')];
    if(reminderRows.length){
      planDraft.reminders=reminderRows.map(row=>({id:row.dataset.reminderRow,value:Math.max(1,Number(row.querySelector('[data-reminder-value]')?.value)||1),unit:row.querySelector('[data-reminder-unit]')?.value||'day'}));
    }
  }
  function openPlanEditor(plan=null){selectedPlanId=plan?.id||'';planDraft=blankPlanDraft(plan);planDraftDirty=false;planSheet=plan?'edit':'add';}
  function attemptClosePlanSheet(){
    if((planSheet==='add'||planSheet==='edit')&&planDraftDirty&&!confirm('入力内容を破棄して閉じますか？')) return false;
    blockUnderlyingNavigation();
    planSheet='';selectedPlanId='';planDraft=null;planDraftDirty=false;render();return true;
  }
  function nthWeekdayOfMonth(year,month,weekday,ordinal){
    if(ordinal===-1){const last=new Date(year,month+1,0,12);last.setDate(last.getDate()-((last.getDay()-weekday+7)%7));return last;}
    const first=new Date(year,month,1,12),offset=(weekday-first.getDay()+7)%7,day=1+offset+(Math.max(1,ordinal)-1)*7;
    if(day>new Date(year,month+1,0,12).getDate()) return null;
    return new Date(year,month,day,12);
  }
  function monthDate(year,month,day){const last=new Date(year,month+1,0,12).getDate();return new Date(year,month,Math.min(last,Math.max(1,day)),12);}
  function repeatDates(draft){
    const repeat=normalizeRepeat(draft.repeat,draft.start),start=parseYmd(draft.start),mode=repeat.mode||'none';
    if(mode==='none') return [draft.start];
    const frequency=mode==='custom'?(repeat.customFrequency||'weekly'):mode;
    const interval=mode==='custom'?Math.max(1,Number(repeat.interval)||1):1;
    const max=200,countLimit=repeat.endMode==='count'?Math.min(max,Math.max(1,Number(repeat.count)||10)):max;
    const defaultDays={daily:730,weekly:3650,monthly:7300,yearly:36500}[frequency]||7300;
    const until=repeat.endMode==='until'&&repeat.until?parseYmd(repeat.until):addDays(start,defaultDays);
    const dates=[],seen=new Set();
    const push=d=>{if(!d||d<start||d>until||dates.length>=countLimit)return;const key=toYmd(d);if(!seen.has(key)){seen.add(key);dates.push(key);}};
    if(frequency==='daily'){
      for(let i=0;dates.length<countLimit;i++){const d=addDays(start,i*interval);if(d>until)break;push(d);}
    }else if(frequency==='weekly'){
      const weekdays=(repeat.weekdays&&repeat.weekdays.length?repeat.weekdays:[start.getDay()]).map(Number),anchor=addDays(start,-start.getDay());
      for(let d=new Date(start);d<=until&&dates.length<countLimit;d=addDays(d,1)){
        const week=Math.floor((d-anchor)/604800000);
        if(week%interval===0&&weekdays.includes(d.getDay())) push(d);
      }
    }else if(frequency==='monthly'){
      for(let i=0;dates.length<countLimit;i++){
        const monthIndex=start.getMonth()+i*interval,year=start.getFullYear()+Math.floor(monthIndex/12),month=((monthIndex%12)+12)%12;
        const d=repeat.monthlyMode==='nthWeekday'?nthWeekdayOfMonth(year,month,Number(repeat.monthWeekday),Number(repeat.monthOrdinal)):monthDate(year,month,Number(repeat.monthDay)||start.getDate());
        if(d&&d>until)break;push(d);
      }
    }else if(frequency==='yearly'){
      for(let i=0;dates.length<countLimit;i++){const y=start.getFullYear()+i*interval,d=monthDate(y,start.getMonth(),start.getDate());if(d>until)break;push(d);}
    }
    return dates.length?dates:[draft.start];
  }
  function rowsFromPlanDraft(draft){
    const duration=Math.max(0,Math.round((parseYmd(draft.end)-parseYmd(draft.start))/86400000));
    const dates=repeatDates(draft),seriesId=dates.length>1?newId('series'):'';
    const names=draft.companionIds.map(id=>companions.find(c=>c.id===id)?.name).filter(Boolean);
    return dates.map((date,index)=>({
      id:draft.editingId||newId('plan'),seriesId,seriesIndex:index,title:draft.title.trim(),type:draft.type||'',start:date,end:toYmd(addDays(parseYmd(date),duration)),
      startTime:draft.allDay?'':draft.startTime,endTime:draft.allDay?'':draft.endTime,allDay:Boolean(draft.allDay),companionIds:[...draft.companionIds],companionNames:names,
      location:draft.location.trim(),note:draft.note.trim(),prep:'未着手',manualStatus:'',repeat:dates.length>1?{...draft.repeat,weekdays:[...draft.repeat.weekdays]}:null,
      reminders:draft.reminders.map(x=>({...x})),allDayReminderTime:draft.allDayReminderTime||'09:00'
    }));
  }
  function reminderUnitLabel(unit){return {month:'か月前',week:'週間前',day:'日前',hour:'時間前'}[unit]||'日前';}
  function reminderDate(plan,reminder){
    const base=dateTimeAt(plan.start,plan.allDay?(plan.allDayReminderTime||'09:00'):(plan.startTime||'09:00'),false),d=new Date(base),value=Math.max(1,Number(reminder.value)||1);
    if(reminder.unit==='month')d.setMonth(d.getMonth()-value);else if(reminder.unit==='week')d.setDate(d.getDate()-value*7);else if(reminder.unit==='day')d.setDate(d.getDate()-value);else d.setHours(d.getHours()-value);
    return d;
  }
  function reminderSummary(plan){
    const rows=Array.isArray(plan?.reminders)?plan.reminders:[];
    return rows.map(r=>`${r.value}${reminderUnitLabel(r.unit)}`).join('・');
  }
  async function showPlanNotification(plan){
    const options={body:`${planRangeLabel(plan)}${plan.location?` / ${plan.location}`:''}`,tag:`outbase-plan-${plan.id}`,icon:'assets/memory_hero_art.png'};
    try{if(navigator.serviceWorker){const reg=await navigator.serviceWorker.ready;await reg.showNotification(plan.title,options);}else if(window.Notification)new Notification(plan.title,options);}catch(_e){}
  }
  function checkPlanReminders(){
    if(!window.Notification||Notification.permission!=='granted')return;
    const now=Date.now(),done=readStored('outbase_plan_notified_v1',{});let changed=false;
    for(const plan of plans){for(const reminder of (plan.reminders||[])){const at=reminderDate(plan,reminder).getTime(),key=`${plan.id}:${reminder.id}:${at}`;if(!done[key]&&now>=at&&now-at<90000){done[key]=now;changed=true;showPlanNotification(plan);}}}
    if(changed)localStorage.setItem('outbase_plan_notified_v1',JSON.stringify(done));
  }
  function requestPlanNotificationPermission(){if(window.Notification&&Notification.permission==='default')Notification.requestPermission().then(()=>checkPlanReminders()).catch(()=>{});}

  function clearRecoverableSession(){
    recoverableSession=null;
    localStorage.removeItem('outbase_record_recoverable_session');
  }
  function currentSessionRecords(){
    if(!currentSessionId) return [];
    return savedRecords.filter(r=>r.sessionId===currentSessionId&&!r.keepWithParking&&!r.parkingAssist);
  }
  function currentSessionPins(){
    if(!currentSessionId) return [];
    return savedPins.filter(pin=>pin.sessionId===currentSessionId&&pin.category!=='parking');
  }
  function destructiveSummary(){
    const rows=currentSessionRecords(),pins=currentSessionPins();
    const counts={photo:0,video:0,speech:0,memo:0,pin:pins.length};
    rows.forEach(r=>{if(r.kind!=='pin'&&Object.prototype.hasOwnProperty.call(counts,r.kind)) counts[r.kind]+=1;});
    const labels=[];
    if(counts.photo) labels.push(`写真${counts.photo}件`);
    if(counts.video) labels.push(`動画${counts.video}件`);
    if(counts.speech) labels.push(`音声${counts.speech}件`);
    if(counts.memo) labels.push(`メモ${counts.memo}件`);
    if(counts.pin) labels.push(`場所${counts.pin}件`);
    return labels.length?`${labels.join('・')}も削除されます`:'軌跡と経過時間が削除されます';
  }
  function snapshotCurrentSession(finishedElapsed,finishedDistance){
    return {
      sessionId:currentSessionId||newId('session'),
      startedAt:sessionStartedAt||Date.now(),
      finishedAt:Date.now(),
      target:recordTarget,
      elapsedMs:finishedElapsed,
      distanceKm:finishedDistance,
      trackPoints:trackPoints.map(p=>({...p})),
      records:currentSessionRecords().map(r=>({...r})),
      pins:currentSessionPins().map(pin=>({...pin,parking:pin.parking?{...pin.parking}:{}}))
    };
  }
  function resetSessionToIdle(){
    activeStartedAt=0;
    elapsedMs=0;
    recordSessionState='idle';
    currentSessionId='';
    sessionStartedAt=0;
    resumeBreakPending=false;
    recordSheet='';
    stopGeoWatch();
    releaseScreenAwake();
    trackPoints=[];
    savedPins=savedPins.filter(pin=>pin.category==='parking'&&!pin.clearedAt);
    gpsStatus=currentPosition?`現在地取得済み ±${currentPosition.accuracy||'-'}m`:'現在地を確認中';
  }
  function restoreRecoverableSession(){
    const snap=recoverableSession;
    if(!snap) return false;
    currentSessionId=snap.sessionId||newId('session');
    sessionStartedAt=Number(snap.startedAt||Date.now());
    elapsedMs=Number(snap.elapsedMs||0);
    trackPoints=Array.isArray(snap.trackPoints)?snap.trackPoints.map(p=>({...p})):[];
    const recordIds=new Set(savedRecords.map(r=>r.id));
    for(const row of (snap.records||[])) if(!recordIds.has(row.id)) savedRecords.push({...row});
    const pinIds=new Set(savedPins.map(pin=>pin.id));
    for(const pin of (snap.pins||[])) if(!pinIds.has(pin.id)) savedPins.push({...pin,parking:pin.parking?{...pin.parking}:{}});
    recordTarget=snap.target||recordTarget;
    recordSessionState='active';
    activeStartedAt=Date.now();
    resumeBreakPending=true;
    mapFollow=true;
    gpsStatus=currentPosition?`GPS記録中 ±${currentPosition.accuracy||'-'}m`:'GPSを取得しています';
    clearRecoverableSession();
    persistRecordState();
    return true;
  }
  function discardCurrentSession(){
    const records=currentSessionRecords();
    const recordIds=new Set(records.map(r=>r.id));
    savedRecords=savedRecords.filter(r=>!recordIds.has(r.id));
    recordCount=Math.max(0,recordCount-records.length);
    records.forEach(r=>deleteRecordDB(r.id));
    const pinIds=new Set(currentSessionPins().map(pin=>pin.id));
    savedPins=savedPins.filter(pin=>!pinIds.has(pin.id)||pin.category==='parking');
    clearRecoverableSession();
    resetSessionToIdle();
    persistRecordState();
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
    const current=activePlan(),candidateCount=activePlanCandidates().length;
    const chipTitle=current?current.title:'主役予定なし';
    const chipMeta=current?`${planTypeLabel(current.type)}&nbsp; / &nbsp;${planRangeLabel(current)}${candidateCount>1?`&nbsp; / &nbsp;他${candidateCount-1}件`:''}`:'タップして主役予定を選択';
    return `<header class="header ${active==='record'?'recordHeader':'compactHeader'}">
      <div class="topLine">
        <div class="brand"><div class="ob">OB</div><div><div class="brandName">OUTBASE</div><div class="brandSub">route design</div></div></div>
        <button class="planChip" data-open-plan-switcher><span class="planTitle"><i></i>${escapeHtml(chipTitle)}</span><span>${chipMeta}</span></button>
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
    const meta=monthCalendar(planMonth);
    const selectedRows=plansForDate(selectedPlanDate);
    const today=new Date().toISOString().slice(0,10);
    const dayCells=meta.days.map((d,index)=>{
      const key=toYmd(d),other=d.getMonth()+1!==meta.month,selected=key===selectedPlanDate,isToday=key===today,sun=d.getDay()===0,sat=d.getDay()===6;
      const classes=[other?'other':'',selected?'selected':'',isToday?'today':'',sun?'sun':'',sat?'sat':''].filter(Boolean).join(' ');
      const col=index%7+1,row=Math.floor(index/7)+1,count=plansForDate(key).length;
      return `<button class="day ${classes}" style="grid-column:${col};grid-row:${row}" data-plan-date="${key}"><span class="num">${d.getDate()}</span>${count>2?`<small class="dayMore">+${count-2}</small>`:''}</button>`;
    }).join('');
    return `<section class="page ${active==='plan'?'active':''}" id="page-plan">
      <section class="calendarCard planCalendarCard" style="--weeks:${meta.weeks}" data-plan-calendar-swipe>
        <div class="calendarHead planCalendarHead"><div class="month">${meta.year}.${String(meta.month).padStart(2,'0')}</div><div class="monthBtns"><button data-plan-month="prev">‹</button><button data-plan-today>今日</button><button data-plan-month="next">›</button></div><span class="planSwipeHint">左右スワイプで月移動</span></div>
        <div class="week"><span class="sun">日</span><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span class="sat">土</span></div>
        <div class="monthGrid planMonthGrid" style="--weeks:${meta.weeks}">${dayCells}${calendarSegments(meta)}</div>
        <p class="calendarHint">1回目で選択。同じ日をもう一度タップすると新規追加。</p>
      </section>
      <section class="scheduleCard selectedDayCard">
        <div class="selectedDayHead"><div><small>選択日</small><h2>${selectedDateLabel(selectedPlanDate)}</h2></div><button data-open-plan-add>＋追加</button></div>
        <div class="selectedDayRows">${selectedRows.length?selectedRows.map(plan=>`<button class="selectedPlanRow" data-plan-id="${plan.id}"><time>${plan.allDay?'終日':(plan.startTime||plan.time||'未定')}</time><i class="dot ${planTone(plan)}"></i><div><small>${escapeHtml(planTypeLabel(plan.type))}${planCompanionLabel(plan)?`・${escapeHtml(planCompanionLabel(plan))}`:''}</small><b>${escapeHtml(plan.title)}</b></div><em>${escapeHtml(planStatus(plan))}</em><span>›</span></button>`).join(''):`<div class="selectedDayEmpty"><b>予定はありません</b><span>同じ日をもう一度タップするか「＋追加」で登録できます。</span></div>`}</div>
        <button class="scheduleMore planAllButton" data-open-plan-list>すべての予定を見る&nbsp; ›</button>
      </section>
    </section>`;
  }

  function typeChipsMarkup(selected){
    const rows=planTypes.filter(t=>!t.hidden);
    return `<div class="planChoiceHead"><span>種類 <small>未選択は「予定」扱い</small></span><button type="button" data-manage-types>編集</button></div><div class="choiceChips typeChoiceChips"><button type="button" class="${!selected?'selected':''}" data-plan-type-choice="">予定</button>${rows.map(t=>`<button type="button" class="${selected===t.name?'selected':''}" data-plan-type-choice="${escapeHtml(t.name)}"><i class="dot ${t.tone||'slate'}"></i>${escapeHtml(t.name)}</button>`).join('')}</div>`;
  }
  function companionChipsMarkup(selectedIds){
    const rows=companions.filter(c=>!c.hidden);
    return `<div class="planChoiceHead"><span>同行者 <small>複数選択できます</small></span><button type="button" data-manage-companions>編集</button></div><div class="choiceChips companionChoiceChips">${rows.map(c=>`<button type="button" class="${selectedIds.includes(c.id)?'selected':''}" data-companion-choice="${c.id}">${escapeHtml(c.name)}</button>`).join('')}</div>`;
  }
  function repeatSummary(repeat){
    const r=repeat||{},labels={daily:'毎日',weekly:'毎週',monthly:'毎月',yearly:'毎年'};
    if(!r.mode||r.mode==='none')return 'なし';
    if(r.mode==='custom')return `${r.interval||2}${{daily:'日',weekly:'週',monthly:'か月',yearly:'年'}[r.customFrequency]||'週'}ごと`;
    return labels[r.mode]||'設定あり';
  }
  function repeatMarkup(draft){
    const r=draft.repeat,weekdayNames=['日','月','火','水','木','金','土'],actualFrequency=r.mode==='custom'?r.customFrequency:r.mode;
    const weekly=actualFrequency==='weekly',monthly=actualFrequency==='monthly';
    const weekdayButtons=weekdayNames.map((name,i)=>`<button type="button" class="${r.weekdays.includes(i)?'selected':''}" data-repeat-weekday="${i}">${name}</button>`).join('');
    return `<details class="repeatBox" ${r.mode!=='none'?'open':''}><summary>繰り返し <b>${escapeHtml(repeatSummary(r))}</b></summary><div class="repeatInner">
      <label class="planField">繰り返し<select id="planRepeatMode"><option value="none" ${r.mode==='none'?'selected':''}>なし</option><option value="daily" ${r.mode==='daily'?'selected':''}>毎日</option><option value="weekly" ${r.mode==='weekly'?'selected':''}>毎週</option><option value="monthly" ${r.mode==='monthly'?'selected':''}>毎月</option><option value="yearly" ${r.mode==='yearly'?'selected':''}>毎年</option><option value="custom" ${r.mode==='custom'?'selected':''}>カスタム</option></select></label>
      <div class="customRepeatFields ${r.mode==='custom'?'show':''}"><label class="planField">間隔<input id="planRepeatInterval" type="number" min="1" max="99" value="${r.interval||2}"></label><label class="planField">単位<select id="planRepeatCustomFrequency"><option value="daily" ${r.customFrequency==='daily'?'selected':''}>日</option><option value="weekly" ${r.customFrequency==='weekly'?'selected':''}>週</option><option value="monthly" ${r.customFrequency==='monthly'?'selected':''}>か月</option><option value="yearly" ${r.customFrequency==='yearly'?'selected':''}>年</option></select></label></div>
      <div class="repeatSubsection ${weekly?'show':''}"><div class="repeatSubHead"><span>曜日指定</span><div><button type="button" data-weekday-preset="weekday">平日</button><button type="button" data-weekday-preset="weekend">土日</button></div></div><div class="weekdayChoices show">${weekdayButtons}</div></div>
      <div class="repeatSubsection monthlyRepeatFields ${monthly?'show':''}"><label class="planField">毎月の基準<select id="planRepeatMonthlyMode"><option value="dayOfMonth" ${r.monthlyMode==='dayOfMonth'?'selected':''}>日付</option><option value="nthWeekday" ${r.monthlyMode==='nthWeekday'?'selected':''}>第◯曜日</option></select></label><div class="monthDayFields ${r.monthlyMode==='dayOfMonth'?'show':''}"><label class="planField">日<input id="planRepeatMonthDay" type="number" min="1" max="31" value="${r.monthDay||parseYmd(draft.start).getDate()}"></label></div><div class="monthOrdinalFields ${r.monthlyMode==='nthWeekday'?'show':''}"><label class="planField">週<select id="planRepeatMonthOrdinal"><option value="1" ${r.monthOrdinal===1?'selected':''}>第1</option><option value="2" ${r.monthOrdinal===2?'selected':''}>第2</option><option value="3" ${r.monthOrdinal===3?'selected':''}>第3</option><option value="4" ${r.monthOrdinal===4?'selected':''}>第4</option><option value="5" ${r.monthOrdinal===5?'selected':''}>第5</option><option value="-1" ${r.monthOrdinal===-1?'selected':''}>最終</option></select></label><label class="planField">曜日<select id="planRepeatMonthWeekday">${weekdayNames.map((name,i)=>`<option value="${i}" ${r.monthWeekday===i?'selected':''}>${name}曜日</option>`).join('')}</select></label></div></div>
      <div class="planFormGrid repeatEndGrid"><label class="planField">終了<select id="planRepeatEndMode"><option value="none" ${r.endMode==='none'?'selected':''}>指定なし</option><option value="until" ${r.endMode==='until'?'selected':''}>終了日</option><option value="count" ${r.endMode==='count'?'selected':''}>回数</option></select></label><label class="planField repeatCountField ${r.endMode==='count'?'show':''}">回数<input id="planRepeatCount" type="number" min="1" max="200" value="${r.count||10}"></label><label class="planField repeatUntilField ${r.endMode==='until'?'show':''}">終了日<input id="planRepeatUntil" type="date" value="${r.until||''}"></label></div>
    </div></details>`;
  }
  function reminderMarkup(draft){
    const rows=draft.reminders||[];
    return `<details class="reminderBox" ${rows.length?'open':''}><summary>お知らせ <b>${rows.length?`${rows.length}件`:'なし'}</b></summary><div class="reminderInner"><div class="reminderRows">${rows.map(r=>`<div class="reminderRow" data-reminder-row="${r.id}"><input type="number" min="1" max="999" value="${r.value||1}" data-reminder-value><select data-reminder-unit><option value="month" ${r.unit==='month'?'selected':''}>か月前</option><option value="week" ${r.unit==='week'?'selected':''}>週間前</option><option value="day" ${r.unit==='day'?'selected':''}>日前</option><option value="hour" ${r.unit==='hour'?'selected':''}>時間前</option></select><button type="button" data-remove-reminder="${r.id}">削除</button></div>`).join('')}</div><button type="button" class="addReminderButton" data-add-reminder>＋お知らせを追加</button><label class="planField allDayReminderField ${draft.allDay&&rows.length?'show':''}">終日予定の通知時刻<input id="planAllDayReminderTime" type="time" value="${draft.allDayReminderTime||'09:00'}"></label><p class="reminderNote">端末通知は許可後、OUTBASEが動作中のときに通知します。</p></div></details>`;
  }
  function planSheetMarkup(){
    if(!planSheet) return '';
    const plan=planForId(selectedPlanId);
    const dragHeader=(eyebrow,title)=>`<div class="planSheetDragZone" data-plan-drag-zone><div class="sheetHandle"></div><small>${eyebrow}</small><h2>${title}</h2></div>`;
    if(planSheet==='switcher'){
      const current=activePlan(),rows=activePlanCandidates();
      return `<div class="recordSheetBackdrop planSheetBackdrop" data-plan-backdrop><section class="recordSheet planSwitcherSheet" data-plan-sheet-panel>${dragHeader('CURRENT PLAN','主役予定を切り替える')}<p class="planSwitcherLead">複数の予定は同時に保持されます。ここで選んだ1件だけを、今見ている準備・記録の主役にします。</p><div class="planSwitcherRows">${rows.map(p=>{const progress=prepProgress(p),isActive=current?.id===p.id;return `<button class="planSwitcherRow ${isActive?'active':''}" data-switch-active-plan="${p.id}"><i class="dot ${planTone(p)}"></i><div><small>${escapeHtml(planTypeLabel(p.type))} ・ ${escapeHtml(planRangeLabel(p))}</small><b>${escapeHtml(p.title)}</b><span>準備 ${progress.done}/${progress.total} ・ ${escapeHtml(planStatus(p))}</span></div><em>${isActive?'選択中':'選ぶ'}</em></button>`;}).join('')}<button class="planSwitcherRow none ${!current?'active':''}" data-switch-active-plan="none"><i></i><div><small>主役を外す</small><b>予定なし</b><span>共通ギア管理は引き続き使えます</span></div><em>${!current?'選択中':'選ぶ'}</em></button></div><div class="sheetActions"><button data-close-plan-sheet>閉じる</button><button class="sheetPrimary" data-tab-from-switcher="plan">予定を確認</button></div></section></div>`;
    }
    if(planSheet==='add'||planSheet==='edit'){
      const editing=planSheet==='edit'&&plan,draft=ensurePlanDraft(editing?plan:null);
      if(previewMode==='plan011-repeat'||previewMode==='plan012-repeat'){draft.repeat.mode='weekly';draft.repeat.weekdays=[1,4];}
      if(previewMode==='plan012-reminder'&&!draft.reminders.length)draft.reminders=[{id:newId('reminder'),value:1,unit:'week'},{id:newId('reminder'),value:1,unit:'day'}];
      return `<div class="recordSheetBackdrop planSheetBackdrop" data-plan-backdrop><section class="recordSheet planEditSheet" data-plan-sheet-panel>${dragHeader('PLAN',editing?'予定を編集':'新しい予定')}<label class="planField wide">名前<input id="planTitleInput" value="${escapeHtml(draft.title)}" placeholder="例：手賀沼ドライブ散歩"></label><label class="allDayToggle"><input id="planAllDayInput" type="checkbox" ${draft.allDay?'checked':''}><span>終日</span></label><div class="planFormGrid dateTimeGrid"><label class="planField">開始日<input id="planStartInput" type="date" value="${draft.start}"></label><label class="planField timeField ${draft.allDay?'disabled':''}">開始時間<input id="planStartTimeInput" type="time" value="${draft.startTime}" ${draft.allDay?'disabled':''}></label><label class="planField">終了日<input id="planEndInput" type="date" value="${draft.end}"></label><label class="planField timeField ${draft.allDay?'disabled':''}">終了時間<input id="planEndTimeInput" type="time" value="${draft.endTime}" ${draft.allDay?'disabled':''}></label></div>${typeChipsMarkup(draft.type)}${companionChipsMarkup(draft.companionIds)}<label class="planField wide">場所<input id="planLocationInput" value="${escapeHtml(draft.location)}" placeholder="場所は後でもOK"></label>${repeatMarkup(draft)}${reminderMarkup(draft)}<label class="planField wide">メモ<textarea id="planNoteInput" placeholder="準備や当日の補足">${escapeHtml(draft.note)}</textarea></label><div class="sheetActions"><button data-close-plan-sheet>閉じる</button><button class="sheetPrimary" data-save-plan>${editing?'更新':'追加'}</button></div></section></div>`;
    }
    if(planSheet==='type-manager'){
      return `<div class="recordSheetBackdrop planSheetBackdrop" data-plan-backdrop><section class="recordSheet managerSheet" data-plan-sheet-panel>${dragHeader('CUSTOM','種類を編集')}<p>初期種類も追加した種類も、名称・色の変更と削除ができます。</p><div class="managerRows">${planTypes.map(t=>`<div class="managerRow"><input value="${escapeHtml(t.name)}" data-type-name="${t.id}"><select data-type-tone="${t.id}">${['green','gold','blue','slate','red'].map(c=>`<option value="${c}" ${t.tone===c?'selected':''}>${{green:'緑',gold:'金',blue:'青',slate:'灰',red:'赤'}[c]}</option>`).join('')}</select><button data-type-delete="${t.id}">削除</button></div>`).join('')}</div><div class="managerAdd"><input id="newTypeName" placeholder="新しい種類"><button data-add-type>追加</button></div><div class="sheetActions"><button class="sheetPrimary" data-return-plan-editor>予定入力へ戻る</button></div></section></div>`;
    }
    if(planSheet==='companion-manager'){
      return `<div class="recordSheetBackdrop planSheetBackdrop" data-plan-backdrop><section class="recordSheet managerSheet" data-plan-sheet-panel>${dragHeader('CUSTOM','同行者を編集')}<p>同行者は複数選択できます。「ひとり」は他と同時選択できません。</p><div class="managerRows">${companions.map(c=>`<div class="managerRow companionManagerRow"><input value="${escapeHtml(c.name)}" data-companion-name="${c.id}"><span>${c.solo?'固定':''}</span><button data-companion-delete="${c.id}" ${c.solo?'disabled':''}>削除</button></div>`).join('')}</div><div class="managerAdd"><input id="newCompanionName" placeholder="新しい同行者"><button data-add-companion>追加</button></div><div class="sheetActions"><button class="sheetPrimary" data-return-plan-editor>予定入力へ戻る</button></div></section></div>`;
    }
    if(planSheet==='detail'&&plan){
      const status=planStatus(plan),companionsText=planCompanionLabel(plan),notice=reminderSummary(plan);
      return `<div class="recordSheetBackdrop planSheetBackdrop" data-plan-backdrop><section class="recordSheet planDetailSheet" data-plan-sheet-panel>${dragHeader(escapeHtml(planTypeLabel(plan.type)),escapeHtml(plan.title))}<div class="planDetailHero"><div><small>日時</small><b>${escapeHtml(planRangeLabel(plan))}</b></div><div><small>状態</small><b>${escapeHtml(status)}</b></div></div><div class="planDetailMeta">${plan.location?`<p><span>場所</span><b>${escapeHtml(plan.location)}</b></p>`:''}${companionsText?`<p><span>同行</span><b>${escapeHtml(companionsText)}</b></p>`:''}<p><span>準備</span><b>${escapeHtml(plan.prep||'未着手')}</b></p>${plan.seriesId?`<p><span>繰り返し</span><b>${escapeHtml(repeatSummary(plan.repeat))}</b></p>`:''}${notice?`<p><span>お知らせ</span><b>${escapeHtml(notice)}</b></p>`:''}${plan.note?`<p><span>メモ</span><b>${escapeHtml(plan.note)}</b></p>`:''}</div><button class="planPrimaryAction" data-plan-set-active="${plan.id}">この予定を主役にする</button><div class="planActionGrid three"><button data-plan-prepare="${plan.id}">準備を始める</button><button data-plan-record="${plan.id}">この予定で記録</button><button data-plan-edit="${plan.id}">編集</button></div><div class="sheetActions"><button data-close-plan-sheet>閉じる</button><button class="planDanger" data-plan-delete="${plan.id}">削除</button></div></section></div>`;
    }
    if(planSheet==='list'){
      const sorted=[...plans].sort((a,b)=>compareYmd(a.start,b.start)||(a.startTime||a.time||'').localeCompare(b.startTime||b.time||''));
      return `<div class="recordSheetBackdrop planSheetBackdrop" data-plan-backdrop><section class="recordSheet planListSheet" data-plan-sheet-panel>${dragHeader('ALL PLANS','すべての予定')}<div class="planListRows">${sorted.map(p=>`<button data-plan-id="${p.id}"><time>${escapeHtml(planRangeLabel(p))}</time><i class="dot ${planTone(p)}"></i><div><small>${escapeHtml(planTypeLabel(p.type))}・${escapeHtml(planStatus(p))}</small><b>${escapeHtml(p.title)}</b></div><span>›</span></button>`).join('')}</div><div class="sheetActions"><button data-close-plan-sheet>閉じる</button><button class="sheetPrimary" data-open-plan-add>＋追加</button></div></section></div>`;
    }
    return '';
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

  function persistPrepStore(){localStorage.setItem('outbase_prep_v1',JSON.stringify(prepStore));}
  function persistGearLibrary(){localStorage.setItem('outbase_gear_library_v1',JSON.stringify(gearLibrary));}
  function prepModuleDefinitions(_plan){
    const library={
      weather:{id:'weather',icon:I.sun,title:'天気',sub:'雨・気温・風・警報',tasks:['降水と雨雲を確認','気温と暑さ・寒さを確認','風と警報・撤収判断を確認']},
      gear:{id:'gear',icon:I.bag,title:'ギア',sub:'今回の持出し・積載・共通管理',tasks:['今回使うギアを選ぶ','積載順と忘れ物を確認','電源・燃料・電池を確認']},
      cooking:{id:'cooking',icon:I.cup,title:'料理',sub:'献立・量・調理順',tasks:['食事ごとの献立を決める','量と食べ切れるか確認','調理順と使用ギアを確認']},
      shopping:{id:'shopping',icon:I.cart,title:'買物',sub:'食材・消耗品・不足品',tasks:['食材と飲み物を確認','調味料・消耗品を確認','不足品と買い忘れを確認']},
      route:{id:'route',icon:I.route,title:'ルート',sub:'出発・休憩・駐車・到着',tasks:['出発時刻を決める','休憩・買い出し地点を確認','到着方法と駐車場を確認']}
    };
    return ['weather','gear','cooking','shopping','route'].map(id=>library[id]);
  }
  function prepPlanBucket(plan){
    if(!prepStore[plan.id]) prepStore[plan.id]={modules:{},updatedAt:0};
    if(!prepStore[plan.id].modules) prepStore[plan.id].modules={};
    return prepStore[plan.id];
  }
  function prepModuleState(plan,module){
    const bucket=prepPlanBucket(plan);
    if(!bucket.modules[module.id]) bucket.modules[module.id]={checked:[],customItems:[],note:'',gearIds:[]};
    const state=bucket.modules[module.id];
    if(!Array.isArray(state.checked))state.checked=[];
    if(!Array.isArray(state.customItems))state.customItems=[];
    if(!Array.isArray(state.gearIds))state.gearIds=[];
    return state;
  }
  function prepModuleItems(plan,module){const state=prepModuleState(plan,module);return [...module.tasks,...state.customItems];}
  function prepProgress(plan){
    const modules=prepModuleDefinitions(plan);let done=0,total=0;
    modules.forEach(module=>{const items=prepModuleItems(plan,module),checked=prepModuleState(plan,module).checked;total+=items.length;done+=items.filter((_,i)=>checked.includes(i)).length;});
    return {done,total,percent:total?Math.round(done/total*100):0};
  }
  function syncPlanPrepStatus(plan){
    const progress=prepProgress(plan);let status='未着手';
    if(progress.total&&progress.done>=progress.total)status='準備完了';
    else if(progress.done>0)status='準備中';
    plan.prep=status;prepPlanBucket(plan).updatedAt=Date.now();persistPrepStore();persistPlans();return status;
  }
  function prepStatusLabel(plan){return syncPlanPrepStatus(plan);}
  function prepCard(plan,module){
    const state=prepModuleState(plan,module),items=prepModuleItems(plan,module),done=items.filter((_,i)=>state.checked.includes(i)).length,complete=items.length&&done===items.length,percent=items.length?done/items.length*100:0,next=items.find((_,i)=>!state.checked.includes(i));
    const gearCount=module.id==='gear'?state.gearIds.filter(id=>gearLibrary.some(g=>g.id===id)).length:0;
    const foot=complete?'確認済み':module.id==='gear'&&gearCount?`今回 ${gearCount}点を選択`:next?`次：${next}`:'未着手';
    return `<button class="prepModuleCard ${complete?'complete':''}" style="--module-progress:${percent}%" data-prep-module="${module.id}"><div class="prepModuleIcon">${module.icon}</div><div class="prepModuleCopy"><h3>${escapeHtml(module.title)}</h3><small>${escapeHtml(module.sub)}</small><span>${escapeHtml(foot)}</span></div><span class="prepModuleCount">${done}/${items.length}</span><b>${complete?'✓':'›'}</b></button>`;
  }
  function prepPage(){
    const plan=activePlan(),candidateCount=activePlanCandidates().length;
    if(!plan)return `<section class="page ${active==='prep'?'active':''}" id="page-prep"><section class="prepEmpty prepEmpty01"><h1>準備</h1><p>主役予定を選ぶと、天気・ギア・料理・買物・ルートを表示します。</p><div><button data-open-plan-switcher>主役予定を選ぶ</button><button data-open-gear-manager>共通ギア管理</button></div></section></section>`;
    const modules=prepModuleDefinitions(plan),progress=prepProgress(plan),status=prepStatusLabel(plan),days=Math.ceil((parseYmd(plan.start)-new Date(new Date().setHours(0,0,0,0)))/86400000),dayText=days>0?`あと${days}日`:days===0?'今日':days===-1?'昨日':'開始済み';
    return `<section class="page ${active==='prep'?'active':''}" id="page-prep">
      <section class="prepHero prepHero01" data-prep-plan-detail><img src="assets/prep_hero_art.png" alt=""><div class="prepHeroCopy"><small>PREPARATION</small><h1>準備</h1><p>${escapeHtml(plan.title)}</p><span>${escapeHtml(dayText)} ・ ${escapeHtml(planRangeLabel(plan))}</span></div><div class="prepPercent" style="--prep:${progress.percent}"><b>${progress.percent}<small>%</small></b><span>${escapeHtml(status)}</span></div><em class="prepHeroLink">予定詳細&nbsp;›</em></section>
      <div class="prepQuickBar"><button data-open-plan-switcher><span>${I.calendar}</span><div><small>同時進行</small><b>${candidateCount}件・主役を切替</b></div><em>›</em></button><button data-open-gear-manager><span>${I.bag}</span><div><small>共通</small><b>ギア管理 ${gearLibrary.length}点</b></div><em>›</em></button></div>
      <div class="prepSectionHead compact"><div><small>${escapeHtml(status)}</small><h2>準備項目</h2></div><span>${progress.done}/${progress.total}</span></div>
      <div class="prepModuleGrid compact">${modules.map(module=>prepCard(plan,module)).join('')}</div>
    </section>`;
  }
  function gearManagerMarkup(plan){
    const gearModule=prepModuleDefinitions(plan)[1],selected=plan?prepModuleState(plan,gearModule).gearIds:[],categories=['テント','タープ','寝具','テーブル','キッチン','照明','電源','冷蔵','収納','ペット','その他'],conditions=['使用可','点検','修理','買替'];
    return `<div class="recordSheetBackdrop prepSheetBackdrop" data-prep-backdrop><section class="recordSheet gearManagerSheet" data-prep-sheet-panel><div class="prepSheetDragZone" data-prep-drag-zone><div class="sheetHandle"></div><small>GEAR LIBRARY</small><h2>共通ギア管理</h2><p>所有 ${gearLibrary.length}点${plan?` ・ ${escapeHtml(plan.title)}へ ${selected.length}点選択`:''}</p></div>${!plan?'<p class="gearManagerNotice">主役予定なしでも所有ギアの追加・編集はできます。</p>':''}<div class="gearManagerRows">${gearLibrary.map(g=>`<article class="gearManagerRow ${selected.includes(g.id)?'selected':''}" data-gear-row="${g.id}"><div class="gearManagerTop"><button data-toggle-gear-plan="${g.id}" ${plan?'':'disabled'}>${selected.includes(g.id)?'今回から外す':'今回に追加'}</button><input value="${escapeHtml(g.name)}" data-gear-name="${g.id}" aria-label="ギア名"><button class="gearDelete" data-delete-gear="${g.id}">×</button></div><div class="gearManagerMeta"><select data-gear-category="${g.id}">${categories.map(c=>`<option value="${c}" ${g.category===c?'selected':''}>${c}</option>`).join('')}</select><label>数量<input type="number" min="1" max="99" value="${Number(g.quantity)||1}" data-gear-quantity="${g.id}"></label><input value="${escapeHtml(g.storage||'')}" placeholder="保管場所" data-gear-storage="${g.id}"><select data-gear-condition="${g.id}">${conditions.map(c=>`<option value="${c}" ${g.condition===c?'selected':''}>${c}</option>`).join('')}</select></div></article>`).join('')}</div><div class="gearAddBox"><h3>ギアを追加</h3><div><input id="newGearName" placeholder="ギア名"><select id="newGearCategory">${categories.map(c=>`<option value="${c}">${c}</option>`).join('')}</select><input id="newGearQuantity" type="number" min="1" max="99" value="1"><button data-add-gear>追加</button></div></div><div class="sheetActions"><button data-close-prep-sheet>閉じる</button><button class="sheetPrimary" data-close-prep-sheet>保存して戻る</button></div></section></div>`;
  }
  function prepSheetMarkup(){
    if(!prepSheet)return '';
    const plan=activePlan();
    if(prepSheet==='gear-manager')return gearManagerMarkup(plan);
    const module=plan?prepModuleDefinitions(plan).find(x=>x.id===prepModuleId):null;if(!plan||!module)return '';
    const state=prepModuleState(plan,module),items=prepModuleItems(plan,module),done=items.filter((_,i)=>state.checked.includes(i)).length,allDone=items.length&&done===items.length;
    const selectedGear=module.id==='gear'?state.gearIds.map(id=>gearLibrary.find(g=>g.id===id)).filter(Boolean):[];
    const action=module.id==='route'?`<button class="prepExternalAction" data-prep-external="route">${I.route}<span><b>Google Mapsで場所と駐車場を確認</b><small>${escapeHtml(plan.location||'目的地は予定詳細で設定')}</small></span><em>›</em></button>`:module.id==='weather'?`<button class="prepExternalAction" data-prep-external="weather">${I.sun}<span><b>最新の天気を確認</b><small>${escapeHtml(plan.location||plan.title)}</small></span><em>›</em></button>`:module.id==='shopping'?`<button class="prepExternalAction" data-prep-copy>${I.cart}<span><b>未完了項目をコピー</b><small>LINEやメモへ貼り付け</small></span><em>›</em></button>`:module.id==='gear'?`<button class="prepExternalAction" data-open-gear-manager>${I.bag}<span><b>共通ギア管理を開く</b><small>${selectedGear.length?`今回 ${selectedGear.length}点：${selectedGear.slice(0,2).map(g=>g.name).join('・')}${selectedGear.length>2?'ほか':''}`:'所有ギアから今回の持出しを選ぶ'}</small></span><em>›</em></button>`:'';
    return `<div class="recordSheetBackdrop prepSheetBackdrop" data-prep-backdrop><section class="recordSheet prepDetailSheet" data-prep-sheet-panel><div class="prepSheetDragZone" data-prep-drag-zone><div class="sheetHandle"></div><small>PREPARATION</small><h2>${escapeHtml(module.title)}</h2><p>${escapeHtml(module.sub)} ・ ${done}/${items.length}完了</p></div><div class="prepChecklist">${items.map((item,index)=>`<div class="prepCheckRow ${state.checked.includes(index)?'checked':''}"><button data-prep-check="${index}"><i>${state.checked.includes(index)?'✓':''}</i><span>${escapeHtml(item)}</span></button>${index>=module.tasks.length?`<button class="prepRemoveItem" data-prep-remove="${index}">×</button>`:''}</div>`).join('')}</div><div class="prepAddRow"><input id="prepNewItem" placeholder="この予定だけの項目を追加"><button data-prep-add>追加</button></div>${action}<label class="prepNoteField"><span>メモ</span><textarea id="prepModuleNote" placeholder="確認したことや当日の注意点">${escapeHtml(state.note||'')}</textarea></label><div class="sheetActions"><button data-close-prep-sheet>閉じる</button><button class="sheetPrimary" data-prep-mark-all>${allDone?'未完了に戻す':'この項目を完了'}</button></div></section></div>`;
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
    const screenState=recordSessionState==='active'?'画面ON':'画面通常';
    const canRecover=recordSessionState==='idle'&&recoverableSession;
    const idleMode=recordSessionState==='idle';
    return `<section class="page ${active==='record'?'active':''} ${canRecover?'hasRecoverable':''}" id="page-record">
      <section class="recordHero">
        <div class="recordHeroTitle"><small>RECORD</small><h1>記録</h1></div>
        <div class="recordState"><i class="statusDot ${recordSessionState}"></i><span>${stateText}</span></div>
        <div class="recordHeroSide"><span>同伴 コタ</span></div>
      </section>
      ${canRecover?`<section class="resumeSessionBar"><div><small>直前の散歩を終了しました</small><b>${formatElapsed(Number(recoverableSession.elapsedMs||0))}・${Number(recoverableSession.distanceKm||0).toFixed(2)} km</b></div><button data-resume-session>散歩を再開</button></section>`:''}
      <section class="recordMapCard ${idleMode?'idleMode':''}">
        <div class="mapHead">
          <div><h2>散歩MAP</h2><p><i class="statusDot"></i><span id="gpsStatusText">${gpsStatus}</span>&nbsp; / &nbsp;端末保存&nbsp; / &nbsp;${screenState}</p></div>
          <div class="mapHeadActions">${recordSessionState!=='idle'?'<button class="endButton" data-open-sheet="end">終了</button>':''}<button data-record-action="map-mode">${mapMode===0?'記録を隠す':'記録を表示'}</button></div>
        </div>
        <div class="mapStage">
          <div id="recordLiveMap" class="recordLiveMap" role="application" aria-label="現在地に追従する散歩地図">
            <div class="mapTilePane"></div>
            <svg class="mapTrackSvg" aria-hidden="true"></svg>
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
              <button data-record-action="pin">${idleMode?'駐車位置を記録':'場所を記録'}</button>
              <button data-record-action="google-map">Google<br>Map</button>
            </div>
          </div>
        </div>
        ${idleMode?`<div class="quickIdleNotice"><div>${I.record}</div><span><b>散歩を開始するとクイック記録が使えます</b><small>駐車位置は開始前でも保存できます</small></span></div>`:`<div class="quickArea"><h3>クイック記録 <span>すべて日時・位置つきで保存</span></h3><div>${quick.map(q=>`<button data-record-action="${q[3]}" class="quick-${q[3]}">${q[0]}<b>${q[1]}</b><small>${q[2]}</small></button>`).join('')}</div></div>`}
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
    if(recordSheet==='end') return `<div class="recordSheetBackdrop"><section class="recordSheet endSheet"><div class="sheetHandle"></div><small>SESSION SUMMARY</small><h2>散歩記録を終了しますか？</h2><div class="summaryName"><b>${recordTarget}</b><span>${currentPosition?'現在地を保存済み':'位置情報を確認中'}</span></div><div class="summaryGrid summaryGridTwo"><div><small>経過時間</small><b>${formatElapsed(elapsedNow())}</b></div><div><small>距離</small><b>${sessionDistanceKm().toFixed(2)} km</b></div></div><div class="syncSummary"><i></i>端末保存済み・同期待ち 0件</div><div class="endActionStack"><button class="sheetPrimary" data-finish-session>終了して保存</button><button data-close-sheet>散歩に戻る</button><button class="sheetDanger" data-discard-session-request>この散歩を破棄</button></div></section></div>`;
    if(recordSheet==='discard-confirm') return `<div class="recordSheetBackdrop"><section class="recordSheet discardSheet"><div class="sheetHandle"></div><small>DISCARD SESSION</small><h2>この散歩を破棄しますか？</h2><div class="discardWarning"><b>元に戻せません</b><p>${escapeHtml(destructiveSummary())}</p><small>駐車位置は車に戻るため残します。</small></div><div class="sheetActions"><button data-open-sheet="end">戻る</button><button class="sheetDangerPrimary" data-discard-session-confirm>破棄する</button></div></section></div>`;
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
    if(currentSessionId) localStorage.setItem('outbase_record_session_id',currentSessionId);else localStorage.removeItem('outbase_record_session_id');
    if(sessionStartedAt) localStorage.setItem('outbase_record_session_started_at',String(sessionStartedAt));else localStorage.removeItem('outbase_record_session_started_at');
    if(resumeBreakPending) localStorage.setItem('outbase_record_resume_break_pending','1');else localStorage.removeItem('outbase_record_resume_break_pending');
    if(recoverableSession) localStorage.setItem('outbase_record_recoverable_session',JSON.stringify(recoverableSession));else localStorage.removeItem('outbase_record_recoverable_session');
    if(activeParkingId) localStorage.setItem('outbase_active_parking_id',activeParkingId);else localStorage.removeItem('outbase_active_parking_id');
  }

  function elapsedNow(){if(recordSessionState==='idle') return 0;return elapsedMs+(recordSessionState==='active'&&activeStartedAt?Date.now()-activeStartedAt:0);}
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
  function sessionDistanceKm(){if(recordSessionState==='idle') return 0;let d=0;for(let i=1;i<trackPoints.length;i++){if(trackPoints[i].breakBefore) continue;d+=haversineKm(trackPoints[i-1],trackPoints[i]);}return d;}
  function updateMetrics(){
    const distance=document.getElementById('distanceValue');if(distance) distance.innerHTML=`${sessionDistanceKm().toFixed(2)}<small>km</small>`;
    const elapsed=document.getElementById('elapsedValue');if(elapsed) elapsed.textContent=formatElapsed(elapsedNow());
    const status=document.getElementById('gpsStatusText');if(status) status.textContent=gpsStatus;
  }
  function startMetricTimer(){clearInterval(timerId);timerId=setInterval(updateMetrics,1000);updateMetrics();}

  async function keepScreenAwake(){
    try{if('wakeLock' in navigator&&recordSessionState==='active') wakeLock=await navigator.wakeLock.request('screen');}catch(_e){}
  }
  async function releaseScreenAwake(){
    try{if(wakeLock){await wakeLock.release();wakeLock=null;}}catch(_e){wakeLock=null;}
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
    const explicitSession=Object.prototype.hasOwnProperty.call(data,'sessionId')?data.sessionId:(recordSessionState==='idle'?null:currentSessionId);
    const record={...data,id:data.id||newId(kind),kind,createdAt,target:recordTarget,sessionState:recordSessionState,sessionId:explicitSession,location:resolvedLocation};
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
    rec.onend=()=>{parkingSpeechActive=false;parkingSpeechRecognition=null;el.classList.remove('holding');if(text){refreshParkingAssist(pin,text);saveRecord('speech',{text,linkedPinId:pin.id,parkingAssist:true,keepWithParking:true,sessionId:null},locationSnapshot());render();setTimeout(()=>showRecordToast(`駐車情報を「${parkingSummary(pin)}」として整理しました`),0);}else{if(small) small.textContent='階・色・柱・番号を自動整理';showRecordToast('音声は保存されませんでした');}};
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
    input.addEventListener('change',async()=>{if(!(input.files&&input.files.length)) return;const file=input.files[0],loc=locationSnapshot();const rec=saveRecord('photo',{name:file.name,type:file.type,size:file.size,linkedPinId:pin.id,parkingAssist:true,keepWithParking:true,sessionId:null},loc,file);pin.parking=pin.parking||{};pin.parking.photoRecordId=rec.id;pin.parking.photoName=file.name;pin.parking.photoSavedAt=Date.now();pin.parking.ocrState='reading';refreshParkingAssist(pin);persistRecordState();render();setTimeout(()=>showRecordToast('写真を保存しました。表示の文字を自動で読んでいます'),0);const text=await extractParkingPhotoText(file);pin.parking.ocrState=text?'done':'unreadable';if(text){pin.parking.ocrText=text;const parsed=parseParkingText(text);pin.parking={...pin.parking,...Object.fromEntries(Object.entries(parsed).filter(([,v])=>v))};pin.note=pin.note||text;}refreshParkingAssist(pin);persistRecordState();render();setTimeout(()=>showRecordToast(text?`写真から「${parkingSummary(pin)}」を自動補完しました`:'文字を読めませんでしたが、写真は保存済みです'),0);},{once:true});input.click();
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
    const tilePane=map.querySelector('.mapTilePane'),markerPane=map.querySelector('.mapMarkerPane'),svg=map.querySelector('.mapTrackSvg');
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
    if(mapMode===0&&trackPoints.length>1){
      const segments=[];let segment=[];
      for(const p of trackPoints){if(p.breakBefore&&segment.length){segments.push(segment);segment=[];}segment.push(p);}
      if(segment.length) segments.push(segment);
      svg.innerHTML=segments.filter(seg=>seg.length>1).map(seg=>`<polyline points="${seg.map(p=>{const q=pointOnMap(p,box);return `${q.x.toFixed(1)},${q.y.toFixed(1)}`;}).join(' ')}"></polyline>`).join('');
    }else svg.innerHTML='';
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
    currentPosition=next;
    gpsStatus=recordSessionState==='active'
      ?`GPS記録中 ±${next.accuracy}m`
      :recordSessionState==='paused'
        ?`一時停止中・現在地取得済み ±${next.accuracy}m`
        :`現在地取得済み ±${next.accuracy}m`;
    if(recordSessionState==='active'){
      if(resumeBreakPending){
        trackPoints.push({...next,breakBefore:true});
        resumeBreakPending=false;
      }else{
        const last=trackPoints[trackPoints.length-1],jump=last?haversineKm(last,next):0;
        if(!last||(jump>=0.002&&jump<=1)) trackPoints.push(next);
      }
      if(trackPoints.length>5000) trackPoints=trackPoints.slice(-5000);
    }
    autoAttachMissingLocations();
    if(mapFollow) mapCenter={lat:next.lat,lng:next.lng};
    persistRecordState();updateMetrics();renderLiveMap();
  }
  function onPositionError(error){
    gpsStatus=error&&error.code===1
      ?'位置情報の許可が必要です'
      :recordSessionState==='active'?'GPSを再取得しています':recordSessionState==='paused'?'一時停止中':'現在地を再取得しています';
    updateMetrics();
  }
  function startGeoWatch(){
    if(geoWatchId!==null||recordSessionState!=='active'||!navigator.geolocation) return;
    gpsStatus='GPSを取得しています';updateMetrics();
    geoWatchId=navigator.geolocation.watchPosition(onPosition,onPositionError,{enableHighAccuracy:true,maximumAge:2000,timeout:15000});
  }
  function stopGeoWatch(){if(geoWatchId!==null&&navigator.geolocation){navigator.geolocation.clearWatch(geoWatchId);geoWatchId=null;}}
  function requestOnePosition(centerAfter=false){
    if(!navigator.geolocation){showRecordToast('この端末では現在地を取得できません');return;}
    gpsStatus='現在地を確認しています';lastOneShotRequestAt=Date.now();updateMetrics();
    navigator.geolocation.getCurrentPosition(p=>{onPosition(p);if(centerAfter){mapFollow=true;mapCenter={lat:currentPosition.lat,lng:currentPosition.lng};renderLiveMap();showRecordToast('現在地を中央に表示しました');}},e=>{onPositionError(e);showRecordToast('位置情報を許可してください');},{enableHighAccuracy:true,maximumAge:0,timeout:12000});
  }
  function addCurrentPin(){
    const createdAt=Date.now(),loc=locationSnapshot(createdAt),parkingOnly=recordSessionState==='idle';
    const pin={id:newId('pin'),lat:loc.lat,lng:loc.lng,accuracy:loc.accuracy,time:createdAt,category:parkingOnly?'parking':'unclassified',label:parkingOnly?'駐車場':'未分類の場所',note:'',parking:{},sessionId:parkingOnly?null:currentSessionId,locationSource:loc.lat!=null?'auto':'pending-auto'};
    savedPins.push(pin);pendingPinId=pin.id;if(parkingOnly) activeParkingId=pin.id;
    saveRecord('pin',{id:pin.id,category:pin.category,label:pin.label,note:'',parking:{},createdAt,sessionId:pin.sessionId,keepWithParking:parkingOnly},loc);
    persistRecordState();recordSheet='pin';render();
    setTimeout(()=>showRecordToast(parkingOnly?'駐車位置を保存しました':'場所を保存しました'),0);
    if(loc.lat==null&&navigator.geolocation){
      navigator.geolocation.getCurrentPosition(onPosition,()=>{}, {enableHighAccuracy:true,maximumAge:0,timeout:12000});
    }
  }

  function initializeRecordRuntime(){
    startMetricTimer();
    if(recordSessionState==='active'){
      startGeoWatch();
      keepScreenAwake();
    }else{
      stopGeoWatch();
      releaseScreenAwake();
    }
    if(active==='record'){
      renderLiveMap();bindMapGestures();
      const stale=!currentPosition||Date.now()-Number(currentPosition.time||0)>15000;
      if(recordSessionState!=='active'&&stale&&Date.now()-lastOneShotRequestAt>15000) requestOnePosition(false);
    }
  }

  function bindPlanActions(){
    document.querySelectorAll('[data-plan-date]').forEach(el=>{
      el.addEventListener('click',e=>{
        e.preventDefault();e.stopPropagation();
        if(Date.now()<planCalendarSwipeSuppressUntil)return;
        const date=el.dataset.planDate;
        if(selectedPlanDate===date){openPlanEditor(null);planDraft.start=date;planDraft.end=date;render();return;}
        selectedPlanDate=date;planMonth=date.slice(0,7);persistPlans();render();
      });
    });
    document.querySelectorAll('[data-open-plan-switcher]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();recordSheet='';prepSheet='';prepModuleId='';planSheet='switcher';render();}));
    document.querySelectorAll('[data-switch-active-plan]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();activePlanId=el.dataset.switchActivePlan||'none';persistPlans();blockUnderlyingNavigation(250);planSheet='';render();}));
    document.querySelectorAll('[data-tab-from-switcher]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();blockUnderlyingNavigation(250);planSheet='';active=el.dataset.tabFromSwitcher||'plan';history.replaceState(null,'',`?tab=${active}&v=clean-v6-prep011`);render();window.scrollTo({top:0,behavior:'instant'});}));
    document.querySelectorAll('[data-plan-id]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();selectedPlanId=el.dataset.planId;planDraft=null;planSheet='detail';render();}));
    document.querySelectorAll('[data-open-plan-add]').forEach(el=>el.addEventListener('click',()=>{openPlanEditor(null);render();}));
    document.querySelectorAll('[data-open-plan-list]').forEach(el=>el.addEventListener('click',()=>{planSheet='list';render();}));
    document.querySelectorAll('[data-close-plan-sheet]').forEach(el=>el.addEventListener('click',attemptClosePlanSheet));
    document.querySelectorAll('[data-plan-month]').forEach(el=>el.addEventListener('click',()=>{changePlanMonth(el.dataset.planMonth==='next'?1:-1);render();}));
    document.querySelectorAll('[data-plan-today]').forEach(el=>el.addEventListener('click',()=>{selectedPlanDate=new Date().toISOString().slice(0,10);planMonth=selectedPlanDate.slice(0,7);persistPlans();render();}));
    const calendar=document.querySelector('[data-plan-calendar-swipe]');
    if(calendar){
      calendar.addEventListener('pointerdown',e=>{if(e.target.closest('.monthBtns button'))return;planCalendarTouchStart={x:e.clientX,y:e.clientY,id:e.pointerId};},{passive:true});
      calendar.addEventListener('pointerup',e=>{if(!planCalendarTouchStart||planCalendarTouchStart.id!==e.pointerId)return;const dx=e.clientX-planCalendarTouchStart.x,dy=e.clientY-planCalendarTouchStart.y;planCalendarTouchStart=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.3){planCalendarSwipeSuppressUntil=Date.now()+450;changePlanMonth(dx<0?1:-1);render();}},{passive:true});
      calendar.addEventListener('pointercancel',()=>{planCalendarTouchStart=null;},{passive:true});
    }
    document.querySelectorAll('[data-plan-edit]').forEach(el=>el.addEventListener('click',()=>{const p=planForId(el.dataset.planEdit);if(!p)return;openPlanEditor(p);render();}));
    document.querySelectorAll('[data-plan-set-active]').forEach(el=>el.addEventListener('click',()=>{activePlanId=el.dataset.planSetActive;persistPlans();planSheet='';render();}));
    document.querySelectorAll('[data-plan-prepare]').forEach(el=>el.addEventListener('click',()=>{activePlanId=el.dataset.planPrepare;persistPlans();planSheet='';active='prep';history.replaceState(null,'',`?tab=prep&v=clean-v6-plan012`);render();window.scrollTo({top:0,behavior:'instant'});}));
    document.querySelectorAll('[data-plan-record]').forEach(el=>el.addEventListener('click',()=>{const p=planForId(el.dataset.planRecord);if(!p)return;activePlanId=p.id;recordTarget=p.title;localStorage.setItem('outbase_record_target',recordTarget);persistPlans();planSheet='';active='record';history.replaceState(null,'',`?tab=record&v=clean-v6-plan012`);render();window.scrollTo({top:0,behavior:'instant'});}));
    document.querySelectorAll('[data-plan-delete]').forEach(el=>el.addEventListener('click',()=>{const p=planForId(el.dataset.planDelete);if(!p)return;if(!confirm(`「${p.title}」を削除しますか？`))return;plans=plans.filter(x=>x.id!==p.id);if(activePlanId===p.id)activePlanId=plans[0]?.id||'';persistPlans();planSheet='';selectedPlanId='';render();}));

    const backdrop=document.querySelector('[data-plan-backdrop]');
    if(backdrop)backdrop.addEventListener('pointerup',e=>{e.preventDefault();e.stopPropagation();if(e.target===backdrop)attemptClosePlanSheet();});
    const panel=document.querySelector('[data-plan-sheet-panel]'),dragZone=document.querySelector('[data-plan-drag-zone]');
    if(panel&&dragZone){
      const finishDrag=e=>{
        if(!planSheetDrag||planSheetDrag.id!==e.pointerId)return;
        const dy=Math.max(0,e.clientY-planSheetDrag.y);panel.classList.remove('dragging');panel.style.transition='transform .2s ease';
        if(dy>72){panel.style.transform='translateY(110%)';setTimeout(()=>attemptClosePlanSheet(),150);}else{panel.style.transform='';setTimeout(()=>{panel.style.transition='';},210);}
        planSheetDrag=null;
      };
      dragZone.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;planSheetDrag={id:e.pointerId,y:e.clientY};try{dragZone.setPointerCapture(e.pointerId);}catch(_e){}panel.classList.add('dragging');panel.style.transition='none';e.preventDefault();});
      dragZone.addEventListener('pointermove',e=>{if(!planSheetDrag||planSheetDrag.id!==e.pointerId)return;const dy=Math.max(0,e.clientY-planSheetDrag.y);panel.style.transform=`translateY(${dy}px)`;e.preventDefault();});
      dragZone.addEventListener('pointerup',finishDrag);dragZone.addEventListener('pointercancel',finishDrag);
    }

    const draftInputs=document.querySelectorAll('.planEditSheet input,.planEditSheet textarea,.planEditSheet select');
    draftInputs.forEach(el=>{el.addEventListener('input',()=>{syncPlanDraftFromForm();planDraftDirty=true;});el.addEventListener('change',()=>{syncPlanDraftFromForm();planDraftDirty=true;});});
    const rerenderOnChange=['planAllDayInput','planRepeatMode','planRepeatCustomFrequency','planRepeatMonthlyMode','planRepeatEndMode'];
    rerenderOnChange.forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('change',()=>{syncPlanDraftFromForm();planDraftDirty=true;render();});});
    const startInput=document.getElementById('planStartInput');if(startInput)startInput.addEventListener('change',()=>{syncPlanDraftFromForm();const d=parseYmd(planDraft.start);if(planDraft.repeat.mode==='none'){planDraft.repeat.weekdays=[d.getDay()];planDraft.repeat.monthDay=d.getDate();}planDraftDirty=true;render();});
    document.querySelectorAll('[data-plan-type-choice]').forEach(el=>el.addEventListener('click',()=>{if(!planDraft)return;planDraft.type=el.dataset.planTypeChoice;planDraftDirty=true;document.querySelectorAll('[data-plan-type-choice]').forEach(x=>x.classList.toggle('selected',x===el));}));
    document.querySelectorAll('[data-companion-choice]').forEach(el=>el.addEventListener('click',()=>{if(!planDraft)return;const id=el.dataset.companionChoice,c=companions.find(x=>x.id===id);let ids=[...planDraft.companionIds];if(c?.solo){ids=ids.includes(id)?[]:[id];}else{ids=ids.filter(x=>companions.find(c2=>c2.id===x)?.solo!==true);ids=ids.includes(id)?ids.filter(x=>x!==id):[...ids,id];}planDraft.companionIds=ids;planDraftDirty=true;document.querySelectorAll('[data-companion-choice]').forEach(x=>x.classList.toggle('selected',ids.includes(x.dataset.companionChoice)));}));
    document.querySelectorAll('[data-repeat-weekday]').forEach(el=>el.addEventListener('click',()=>{if(!planDraft)return;const day=Number(el.dataset.repeatWeekday),days=[...planDraft.repeat.weekdays];planDraft.repeat.weekdays=days.includes(day)?days.filter(x=>x!==day):[...days,day].sort();if(!planDraft.repeat.weekdays.length)planDraft.repeat.weekdays=[parseYmd(planDraft.start).getDay()];planDraftDirty=true;render();}));
    document.querySelectorAll('[data-weekday-preset]').forEach(el=>el.addEventListener('click',()=>{if(!planDraft)return;planDraft.repeat.weekdays=el.dataset.weekdayPreset==='weekday'?[1,2,3,4,5]:[0,6];planDraftDirty=true;render();}));
    const addReminder=document.querySelector('[data-add-reminder]');if(addReminder)addReminder.addEventListener('click',()=>{syncPlanDraftFromForm();planDraft.reminders.push({id:newId('reminder'),value:1,unit:'day'});planDraftDirty=true;render();});
    document.querySelectorAll('[data-remove-reminder]').forEach(el=>el.addEventListener('click',()=>{syncPlanDraftFromForm();planDraft.reminders=planDraft.reminders.filter(r=>r.id!==el.dataset.removeReminder);planDraftDirty=true;render();}));

    document.querySelectorAll('[data-manage-types]').forEach(el=>el.addEventListener('click',()=>{syncPlanDraftFromForm();planSheet='type-manager';render();}));
    document.querySelectorAll('[data-manage-companions]').forEach(el=>el.addEventListener('click',()=>{syncPlanDraftFromForm();planSheet='companion-manager';render();}));
    document.querySelectorAll('[data-return-plan-editor]').forEach(el=>el.addEventListener('click',()=>{planSheet=planDraft?.editingId?'edit':'add';render();}));
    document.querySelectorAll('[data-type-name]').forEach(el=>el.addEventListener('change',()=>{const row=planTypes.find(t=>t.id===el.dataset.typeName),old=row?.name,name=el.value.trim();if(row&&name){row.name=name;if(planDraft?.type===old)planDraft.type=name;persistPlans();}}));
    document.querySelectorAll('[data-type-tone]').forEach(el=>el.addEventListener('change',()=>{const row=planTypes.find(t=>t.id===el.dataset.typeTone);if(row){row.tone=el.value;persistPlans();}}));
    document.querySelectorAll('[data-type-delete]').forEach(el=>el.addEventListener('click',()=>{const row=planTypes.find(t=>t.id===el.dataset.typeDelete);if(!row||!confirm(`種類「${row.name}」を削除しますか？
過去の予定に保存された種類名は残ります。`))return;planTypes=planTypes.filter(t=>t.id!==row.id);if(planDraft?.type===row.name)planDraft.type='';persistPlans();render();}));
    const addType=document.querySelector('[data-add-type]');if(addType)addType.addEventListener('click',()=>{const input=document.getElementById('newTypeName'),name=input?.value.trim();if(!name)return;if(planTypes.some(t=>t.name===name)){alert('同じ種類が既にあります');return;}planTypes.push({id:newId('type'),name,tone:'slate',hidden:false});persistPlans();render();});
    document.querySelectorAll('[data-companion-name]').forEach(el=>el.addEventListener('change',()=>{const row=companions.find(c=>c.id===el.dataset.companionName),old=row?.name,name=el.value.trim();if(row&&name){row.name=name;if(planDraft){const idx=planDraft.companionNames.indexOf(old);if(idx>=0)planDraft.companionNames[idx]=name;}persistPlans();}}));
    document.querySelectorAll('[data-companion-delete]').forEach(el=>el.addEventListener('click',()=>{const row=companions.find(c=>c.id===el.dataset.companionDelete);if(!row||row.solo||!confirm(`同行者「${row.name}」を削除しますか？
過去の予定に保存された名前は残ります。`))return;companions=companions.filter(c=>c.id!==row.id);if(planDraft)planDraft.companionIds=planDraft.companionIds.filter(id=>id!==row.id);persistPlans();render();}));
    const addCompanion=document.querySelector('[data-add-companion]');if(addCompanion)addCompanion.addEventListener('click',()=>{const input=document.getElementById('newCompanionName'),name=input?.value.trim();if(!name)return;if(companions.some(c=>c.name===name)){alert('同じ同行者が既にあります');return;}companions.push({id:newId('comp'),name,hidden:false});persistPlans();render();});

    const save=document.querySelector('[data-save-plan]');if(save)save.addEventListener('click',()=>{
      syncPlanDraftFromForm();if(!planDraft?.title.trim()){alert('名前を入力してください');return;}
      if(compareYmd(planDraft.end,planDraft.start)<0){alert('終了日は開始日以降にしてください');return;}
      if(!planDraft.allDay&&planDraft.start===planDraft.end&&planDraft.startTime&&planDraft.endTime&&planDraft.endTime<planDraft.startTime){alert('終了時間は開始時間以降にしてください');return;}
      const rows=rowsFromPlanDraft(planDraft);
      if(planDraft.editingId){const idx=plans.findIndex(p=>p.id===planDraft.editingId);if(idx>=0)plans[idx]={...plans[idx],...rows[0],id:planDraft.editingId};selectedPlanId=planDraft.editingId;}
      else{plans.push(...rows);selectedPlanId=rows[0].id;}
      selectedPlanDate=rows[0].start;planMonth=rows[0].start.slice(0,7);activePlanId=activePlanId||rows[0].id;persistPlans();if(rows[0].reminders.length)requestPlanNotificationPermission();planDraftDirty=false;planDraft=null;planSheet='detail';render();
    });
  }

  function closePrepSheet(){
    const note=document.getElementById('prepModuleNote'),plan=activePlan(),module=plan?prepModuleDefinitions(plan).find(x=>x.id===prepModuleId):null;
    if(note&&plan&&module){prepModuleState(plan,module).note=note.value;syncPlanPrepStatus(plan);}
    blockUnderlyingNavigation();prepSheet='';prepModuleId='';render();
  }
  function bindPrepActions(){
    document.querySelectorAll('[data-prep-module]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();prepModuleId=el.dataset.prepModule;prepSheet='module';render();}));
    document.querySelectorAll('[data-open-gear-manager]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();prepSheet='gear-manager';render();}));
    const detail=document.querySelector('[data-prep-plan-detail]');if(detail)detail.addEventListener('click',()=>{const plan=activePlan();if(!plan)return;selectedPlanId=plan.id;planSheet='detail';prepSheet='';render();});
    document.querySelectorAll('[data-close-prep-sheet]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();closePrepSheet();}));
    document.querySelectorAll('[data-prep-check]').forEach(el=>el.addEventListener('click',()=>{const plan=activePlan(),module=prepModuleDefinitions(plan).find(x=>x.id===prepModuleId);if(!plan||!module)return;const state=prepModuleState(plan,module),index=Number(el.dataset.prepCheck);state.checked=state.checked.includes(index)?state.checked.filter(x=>x!==index):[...state.checked,index].sort((a,b)=>a-b);syncPlanPrepStatus(plan);render();}));
    const add=document.querySelector('[data-prep-add]');if(add)add.addEventListener('click',()=>{const input=document.getElementById('prepNewItem'),text=input?.value.trim(),plan=activePlan(),module=prepModuleDefinitions(plan).find(x=>x.id===prepModuleId);if(!text||!plan||!module)return;prepModuleState(plan,module).customItems.push(text);syncPlanPrepStatus(plan);render();});
    document.querySelectorAll('[data-prep-remove]').forEach(el=>el.addEventListener('click',()=>{const plan=activePlan(),module=prepModuleDefinitions(plan).find(x=>x.id===prepModuleId);if(!plan||!module)return;const state=prepModuleState(plan,module),index=Number(el.dataset.prepRemove),customIndex=index-module.tasks.length;if(customIndex<0)return;state.customItems.splice(customIndex,1);state.checked=state.checked.filter(x=>x!==index).map(x=>x>index?x-1:x);syncPlanPrepStatus(plan);render();}));
    const note=document.getElementById('prepModuleNote');if(note)note.addEventListener('input',()=>{const plan=activePlan(),module=prepModuleDefinitions(plan).find(x=>x.id===prepModuleId);if(!plan||!module)return;prepModuleState(plan,module).note=note.value;persistPrepStore();});
    const all=document.querySelector('[data-prep-mark-all]');if(all)all.addEventListener('click',()=>{const plan=activePlan(),module=prepModuleDefinitions(plan).find(x=>x.id===prepModuleId);if(!plan||!module)return;const state=prepModuleState(plan,module),items=prepModuleItems(plan,module),complete=items.length&&items.every((_,i)=>state.checked.includes(i));state.checked=complete?[]:items.map((_,i)=>i);syncPlanPrepStatus(plan);render();});
    const copy=document.querySelector('[data-prep-copy]');if(copy)copy.addEventListener('click',async()=>{const plan=activePlan(),module=prepModuleDefinitions(plan).find(x=>x.id===prepModuleId);if(!plan||!module)return;const state=prepModuleState(plan,module),text=[`${plan.title}｜${module.title}`,...prepModuleItems(plan,module).filter((_,i)=>!state.checked.includes(i)).map(x=>`□ ${x}`)].join('\n');try{await navigator.clipboard.writeText(text);showRecordToast('未完了項目をコピーしました');}catch(_e){showRecordToast('コピーできませんでした');}});
    document.querySelectorAll('[data-prep-external]').forEach(el=>el.addEventListener('click',()=>{const plan=activePlan(),kind=el.dataset.prepExternal;if(kind==='route'){const q=encodeURIComponent(plan.location||plan.title);window.open(`https://www.google.com/maps/search/?api=1&query=${q}`,'_blank','noopener');}else if(kind==='weather'){const q=encodeURIComponent(`${plan.location||plan.title} 天気`);window.open(`https://www.google.com/search?q=${q}`,'_blank','noopener');}}));

    document.querySelectorAll('[data-toggle-gear-plan]').forEach(el=>el.addEventListener('click',()=>{const plan=activePlan();if(!plan)return;const module=prepModuleDefinitions(plan)[1],state=prepModuleState(plan,module),id=el.dataset.toggleGearPlan;state.gearIds=state.gearIds.includes(id)?state.gearIds.filter(x=>x!==id):[...state.gearIds,id];persistPrepStore();render();}));
    const addGear=document.querySelector('[data-add-gear]');if(addGear)addGear.addEventListener('click',()=>{const name=document.getElementById('newGearName')?.value.trim();if(!name)return;gearLibrary.push({id:newId('gear'),name,category:document.getElementById('newGearCategory')?.value||'その他',quantity:Math.max(1,Number(document.getElementById('newGearQuantity')?.value)||1),storage:'',condition:'使用可',memo:''});persistGearLibrary();render();});
    document.querySelectorAll('[data-delete-gear]').forEach(el=>el.addEventListener('click',()=>{const gear=gearLibrary.find(g=>g.id===el.dataset.deleteGear);if(!gear||!confirm(`「${gear.name}」を共通ギア管理から削除しますか？`))return;gearLibrary=gearLibrary.filter(g=>g.id!==gear.id);Object.values(prepStore).forEach(bucket=>Object.values(bucket.modules||{}).forEach(state=>{if(Array.isArray(state.gearIds))state.gearIds=state.gearIds.filter(id=>id!==gear.id);}));persistGearLibrary();persistPrepStore();render();}));
    const gearFields=['name','category','quantity','storage','condition'];
    gearFields.forEach(field=>document.querySelectorAll(`[data-gear-${field}]`).forEach(el=>el.addEventListener('change',()=>{const row=gearLibrary.find(g=>g.id===el.dataset[`gear${field[0].toUpperCase()+field.slice(1)}`]);if(!row)return;row[field]=field==='quantity'?Math.max(1,Number(el.value)||1):el.value.trim();persistGearLibrary();})));

    const backdrop=document.querySelector('[data-prep-backdrop]');if(backdrop)backdrop.addEventListener('pointerup',e=>{e.preventDefault();e.stopPropagation();if(e.target===backdrop)closePrepSheet();});
    const panel=document.querySelector('[data-prep-sheet-panel]'),zone=document.querySelector('[data-prep-drag-zone]');
    if(panel&&zone){
      const finish=e=>{if(!prepSheetDrag||prepSheetDrag.id!==e.pointerId)return;const dy=Math.max(0,e.clientY-prepSheetDrag.y);panel.classList.remove('dragging');panel.style.transition='transform .2s ease';if(dy>72){panel.style.transform='translateY(110%)';blockUnderlyingNavigation();setTimeout(closePrepSheet,150);}else{panel.style.transform='';setTimeout(()=>{panel.style.transition='';},210);}prepSheetDrag=null;};
      zone.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;prepSheetDrag={id:e.pointerId,y:e.clientY};try{zone.setPointerCapture(e.pointerId);}catch(_e){}panel.classList.add('dragging');panel.style.transition='none';e.preventDefault();e.stopPropagation();});
      zone.addEventListener('pointermove',e=>{if(!prepSheetDrag||prepSheetDrag.id!==e.pointerId)return;panel.style.transform=`translateY(${Math.max(0,e.clientY-prepSheetDrag.y)}px)`;e.preventDefault();e.stopPropagation();});zone.addEventListener('pointerup',finish);zone.addEventListener('pointercancel',finish);
    }
  }

  function bindRecordActions(){
    document.querySelectorAll('[data-open-sheet]').forEach(el=>el.addEventListener('click',()=>{recordSheet=el.dataset.openSheet;render();}));
    document.querySelectorAll('[data-open-parking-recall]').forEach(el=>el.addEventListener('click',()=>{recordSheet='parking-recall';render();}));
    document.querySelectorAll('[data-resume-session]').forEach(el=>el.addEventListener('click',()=>{if(restoreRecoverableSession()){render();keepScreenAwake();setTimeout(()=>showRecordToast('直前の散歩を再開しました'),0);}}));
    document.querySelectorAll('[data-discard-session-request]').forEach(el=>el.addEventListener('click',()=>{recordSheet='discard-confirm';render();}));
    document.querySelectorAll('[data-discard-session-confirm]').forEach(el=>el.addEventListener('click',()=>{discardCurrentSession();render();setTimeout(()=>showRecordToast('この散歩を破棄しました'),0);}));
    document.querySelectorAll('[data-parking-speech]').forEach(el=>{el.addEventListener('pointerdown',e=>{e.preventDefault();try{el.setPointerCapture(e.pointerId);}catch(_e){}clearTimeout(parkingSpeechHoldTimer);parkingSpeechHoldTimer=setTimeout(()=>beginParkingSpeechHold(el),280);});el.addEventListener('pointerup',e=>{e.preventDefault();stopParkingSpeechHold();if(!parkingSpeechActive&&!parkingSpeechRecognition) showRecordToast('駐車情報は長押しで話してください');});el.addEventListener('pointercancel',stopParkingSpeechHold);});
    document.querySelectorAll('[data-parking-photo]').forEach(el=>el.addEventListener('click',captureParkingPhoto));
    document.querySelectorAll('[data-parking-action]').forEach(el=>el.addEventListener('click',()=>{const pin=activeParking();if(!pin) return;const action=el.dataset.parkingAction;if(action==='map'){active='record';recordSheet='';mapFollow=false;mapCenter={lat:pin.lat??mapCenter.lat,lng:pin.lng??mapCenter.lng};render();setTimeout(()=>showRecordToast('駐車位置を地図中央に表示しました'),0);}else if(action==='route'){if(pin.lat==null){showRecordToast('駐車位置を自動補完中です');return;}window.open(`https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}&travelmode=walking`,'_blank','noopener');}else if(action==='photo') showParkingPhoto(pin);else if(action==='note'){showRecordToast(pin.parking?.speechText||pin.note||'音声・メモはありません');}else if(action==='arrived'){pin.clearedAt=Date.now();activeParkingId='';persistRecordState();recordSheet='';render();setTimeout(()=>showRecordToast('駐車位置の常時表示を終了しました'),0);}}));
    document.querySelectorAll('[data-close-sheet]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();blockUnderlyingNavigation();recordSheet='';memoDraft='';editingRecordId=null;render();}));
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
          let toast='';
          if(recordSessionState==='idle'){
            clearRecoverableSession();
            currentSessionId=newId('session');
            sessionStartedAt=Date.now();
            resumeBreakPending=false;
            const freshCurrent=currentPosition&&Date.now()-Number(currentPosition.time||0)<=15000;
            trackPoints=freshCurrent?[{...currentPosition,time:Date.now()}]:[];
            savedPins=savedPins.filter(pin=>pin.category==='parking'&&!pin.clearedAt);
            elapsedMs=0;
            activeStartedAt=Date.now();
            recordSessionState='active';
            mapFollow=true;
            gpsStatus=freshCurrent?`GPS記録中 ±${currentPosition.accuracy||'-'}m`:'GPSを取得しています';
            toast='散歩記録を開始しました';
          }else if(recordSessionState==='active'){
            elapsedMs=elapsedNow();
            activeStartedAt=0;
            recordSessionState='paused';
            stopGeoWatch();
            releaseScreenAwake();
            gpsStatus=currentPosition?`一時停止中・現在地取得済み ±${currentPosition.accuracy||'-'}m`:'一時停止中';
            toast='散歩記録を一時停止しました';
          }else{
            activeStartedAt=Date.now();
            recordSessionState='active';
            gpsStatus=currentPosition?`GPS記録中 ±${currentPosition.accuracy||'-'}m`:'GPSを取得しています';
            toast='散歩記録を再開しました';
          }
          persistRecordState();render();if(recordSessionState==='active') keepScreenAwake();setTimeout(()=>showRecordToast(toast),0);
        }else if(action==='map-mode'){mapMode=(mapMode+1)%2;persistRecordState();render();}
        else if(action==='current') centerMapOnCurrent();
        else if(action==='pin') addCurrentPin();
        else if(action==='photo'||action==='video') openCapture(action);
        else if(action==='memo'){memoDraft='';editingRecordId=null;recordSheet='memo';render();}
        else if(action==='google-map'){const p=currentPosition||mapCenter;window.open(`https://www.google.com/maps?q=${p.lat},${p.lng}`,'_blank','noopener');}
      });
    });
    const saveMemo=document.querySelector('[data-save-memo]');if(saveMemo) saveMemo.addEventListener('click',()=>{const text=document.getElementById('recordMemo').value.trim();if(!text){showRecordToast('メモを入力してください');return;}const loc=locationSnapshot();if(editingRecordId){const old=savedRecords.find(x=>x.id===editingRecordId);const record=saveRecord(old?.kind||'speech',{...(old||{}),id:editingRecordId,text},old?.location||loc);editingRecordId=null;memoDraft='';recordSheet='';render();setTimeout(()=>showRecordToast('文字起こしを更新しました'),0);}else{saveRecord('memo',{text},loc);memoDraft='';recordSheet='';render();setTimeout(()=>showRecordToast('メモを位置つきで保存しました'),0);}});
    const savePin=document.querySelector('[data-save-pin-detail]');if(savePin) savePin.addEventListener('click',()=>{const pin=savedPins.find(x=>x.id===pendingPinId)||savedPins[savedPins.length-1];if(!pin) return;const selected=document.querySelector('[data-pin-category].selected');pin.category=selected?selected.dataset.pinCategory:(pin.category||'unclassified');const names={water:'水飲み場',toilet:'トイレ',parking:'駐車場',vending:'自販機',bench:'ベンチ',shade:'日陰・休憩',entrance:'出入口',caution:'注意場所',other:'その他',unclassified:'未分類の場所'};pin.label=names[pin.category]||'未分類の場所';pin.note=(document.getElementById('pinNote')?.value||'').trim();pin.parking=pin.category==='parking'?{...(pin.parking||{}),floor:(document.getElementById('parkingFloor')?.value||pin.parking?.floor||'').trim(),area:(document.getElementById('parkingArea')?.value||pin.parking?.area||'').trim(),number:(document.getElementById('parkingNumber')?.value||pin.parking?.number||'').trim()}:{};if(pin.category==='parking'){activeParkingId=pin.id;pin.sessionId=null;}const loc={lat:pin.lat,lng:pin.lng,accuracy:pin.accuracy,time:pin.time,pending:pin.lat==null};saveRecord('pin',{id:pin.id,category:pin.category,label:pin.label,note:pin.note,parking:pin.parking,sessionId:pin.category==='parking'?null:pin.sessionId,keepWithParking:pin.category==='parking'},loc);persistRecordState();recordSheet='';render();setTimeout(()=>showRecordToast(`${pin.label}として保存しました`),0);});
    const finish=document.querySelector('[data-finish-session]');if(finish) finish.addEventListener('click',()=>{
      const finishedElapsed=elapsedNow();
      const finishedDistance=sessionDistanceKm();
      autoAttachMissingLocations();
      const hasAnyLocation=trackPoints.some(p=>p.lat!=null)||savedPins.some(p=>p.lat!=null)||savedRecords.some(r=>r.sessionId===currentSessionId&&r.location&&r.location.lat!=null);
      recoverableSession=snapshotCurrentSession(finishedElapsed,finishedDistance);
      localStorage.setItem('outbase_last_session_summary',JSON.stringify({finishedAt:recoverableSession.finishedAt,target:recordTarget,elapsedMs:finishedElapsed,distanceKm:finishedDistance,trackPoints:[...trackPoints]}));
      resetSessionToIdle();
      persistRecordState();render();setTimeout(()=>showRecordToast(hasAnyLocation?'散歩記録を保存しました。間違いなら再開できます':'散歩記録を保存しました。今回は位置情報を取得できませんでした'),0);
    });
  }

  function render(){
    const modalOpen=anySheetOpen();
    document.getElementById('app').innerHTML=`<div class="appShell ${modalOpen?'hasModal':''}">${header()}<main>${planPage()}${searchPage()}${prepPage()}${recordPage()}${memoryPage()}</main>${parkingRecallButton()}${nav()}${planSheetMarkup()}${prepSheetMarkup()}${sheetMarkup()}</div>`;
    document.querySelectorAll('.navBtn').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(anySheetOpen()||Date.now()<modalTapBlockUntil)return;active=btn.dataset.tab;recordSheet='';planSheet='';prepSheet='';prepModuleId='';history.replaceState(null,'',`?tab=${active}&v=clean-v6-prep011`);render();window.scrollTo({top:0,behavior:'instant'});}));
    bindPlanActions();
    bindPrepActions();
    bindRecordActions();
    initializeRecordRuntime();
  }

  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){if(recordSessionState==='active'){keepScreenAwake();startGeoWatch();}checkPlanReminders();}});
  render();
  checkPlanReminders();
  planReminderTimer=setInterval(checkPlanReminders,30000);
})();
