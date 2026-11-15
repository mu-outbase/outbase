(() => {
  'use strict';

  if(globalThis.OUTBASE_ROUTE_UNIFICATION_V22)return;

  const router=globalThis.OUTBASE_ROUTER;
  const modelBase=globalThis.OUTBASE_SHELL_MODEL_V166||globalThis.OUTBASE_SHELL_MODEL_V165||globalThis.OUTBASE_SHELL_MODEL_V164;
  const rendererBase=globalThis.OUTBASE_SHELL_RENDERER_V166||globalThis.OUTBASE_SHELL_RENDERER_V165||globalThis.OUTBASE_SHELL_RENDERER_V164;
  const ui=globalThis.OUTBASE_UI_V21;
  if(!router||!modelBase||!rendererBase||!ui)throw new Error('OUTBASE route unification dependencies are not ready');

  const icons=ui.icons;
  const reservationDrafts=new WeakMap();
  const ROUTES=new Set(['plan-editor','preparation-detail','start','memo','places','assets']);
  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const text=value=>String(value??'').trim();
  const safeArray=value=>Array.isArray(value)?value:[];
  const contextApi=()=>globalThis.OUTBASE_ACTIVITY_CONTEXT_V18||globalThis.OUTBASE_ACTIVITY_CONTEXT;
  const repos=()=>globalThis.OUTBASE_REPOSITORIES_V160;
  const plans=()=>globalThis.OUTBASE_PLAN_DOMAIN_V162;
  const prepDomain=()=>globalThis.OUTBASE_PREPARATION_DOMAIN_V162;

  function routeUrl(name,values={}){return router.shellUrl(name,values);}
  function routeValues(route={}){return route.query&&typeof route.query==='object'?route.query:{};}
  function currentActivityId(route={}){return route.activityId||contextApi()?.current?.()?.activityId||localStorage.getItem('outbase_core_activity_id')||'';}
  function metadataPlace(activity){
    const meta=activity?.metadata||{};const plan=meta.legacy_plan||{};const core=meta.legacy_core_activity||{};
    return text(activity?.place||plan.location||plan.placeName||core.location||meta.location||meta.placeName);
  }
  function localDate(value){const d=new Date(value||'');return Number.isNaN(d.getTime())?'':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function localTime(value){const d=new Date(value||'');return Number.isNaN(d.getTime())?'':`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}
  function shortDate(value){const d=new Date(value||'');return Number.isNaN(d.getTime())?'日程未設定':`${d.getMonth()+1}/${d.getDate()}（${'日月火水木金土'[d.getDay()]}）`;}
  function activityRange(item){const start=shortDate(item?.startAt);const end=shortDate(item?.endAt||item?.startAt);return start===end?start:`${start}〜${end}`;}
  function typeLabel(type){return {camp:'キャンプ',walk:'散歩',drive:'ドライブ',event:'イベント',shopping:'買い物',other:'活動'}[type]||'活動';}
  function toast(message){
    const bridge=globalThis.OUTBASE_HOME_V36_BRIDGE;
    if(bridge?.toast){bridge.toast(message);return;}
    let node=document.getElementById('outbaseRouteV22Toast');
    if(!node){node=document.createElement('div');node.id='outbaseRouteV22Toast';node.className='ob22-toast';document.body.appendChild(node);}
    node.textContent=String(message||'');node.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove('show'),1600);
  }
  function invalidate(activityId=''){
    clearPayloadCache();
    const shell=globalThis.OUTBASE_SHELL_MODEL_V166||globalThis.OUTBASE_SHELL_MODEL_V165||globalThis.OUTBASE_SHELL_MODEL_V164;
    shell?.invalidate?.('home');shell?.invalidate?.('vault');shell?.invalidate?.('calendar');
    if(activityId)shell?.invalidate?.(`activity:${activityId}`);
    globalThis.OUTBASE_ACTIVITY_ROUTE_V16?.invalidate?.(activityId);
    globalThis.OUTBASE_PREPARATION_ROUTE_V17?.invalidate?.(activityId);
    globalThis.OUTBASE_SEARCH_ROUTE_V11?.invalidate?.();
    globalThis.OUTBASE_VAULT_ROUTE_V13?.invalidate?.();
  }
  function activate(item,source='route-unification-v22'){
    if(!item?.id)return;
    const api=contextApi();
    if(api?.activate){api.activate(item,{source,record:false});return;}
    return {context:item,persisted:Promise.resolve(false)};
  }
  const PAYLOAD_TTL_MS=60000;
  const payloadCache=new Map();
  const payloadJobs=new Map();

  function routeKey(route={}){
    const query=routeValues(route);
    return [route.name||'',currentActivityId(route),query.assetId||'',query.mode||'',query.target||''].join(':');
  }
  function cachePayload(route,payload){payloadCache.set(routeKey(route),{payload,createdAt:Date.now()});return payload;}
  function cachedPayload(route){const entry=payloadCache.get(routeKey(route));if(!entry||Date.now()-entry.createdAt>PAYLOAD_TTL_MS){if(entry)payloadCache.delete(routeKey(route));return null;}return entry.payload;}
  function clearPayloadCache(){payloadCache.clear();payloadJobs.clear();}
  function currentContextItem(route={}){
    const query=routeValues(route);const context=contextApi()?.current?.()||{};const id=currentActivityId(route);
    if(!id&&!query.title&&!route.activityTitle)return null;
    return Object.freeze({
      id:id||'',
      title:query.title||route.activityTitle||context.activityTitle||'選択中の活動',
      type:query.activityType||route.activityType||context.activityType||'other',
      typeLabel:typeLabel(query.activityType||route.activityType||context.activityType||'other'),
      state:'planned',startAt:null,endAt:null,legacyPlanId:route.planId||context.planId||null,
      place:query.place||''
    });
  }
  function uniqueActivities(...groups){
    const map=new Map();
    groups.flatMap(group=>safeArray(group)).forEach(item=>{if(item?.id&&!map.has(String(item.id)))map.set(String(item.id),item);});
    return [...map.values()];
  }
  async function homeRows(){
    let payload=null;
    try{payload=await modelBase.preload?.('home');}catch(_error){}
    let home=payload?.home||null;
    if(!home){try{home=await globalThis.OUTBASE_HOME_SCREEN_MODEL_V164?.build?.();}catch(_error){}}
    return uniqueActivities(home?.current,home?.next,home?.recent);
  }
  async function vaultRows(){
    let payload=null;
    try{payload=await modelBase.preload?.('vault');}catch(_error){}
    const vault=payload?.vault||payload?.vaultV15||null;
    return uniqueActivities(vault?.activities);
  }
  function returnRoute(route,defaultName='home'){
    const query=routeValues(route);const allowed=new Set(['home','calendar','search','vault','activity','preparation','record','places','assets','plan-editor','preparation-detail','start','memo']);
    const name=allowed.has(query.returnShell)&&query.returnShell!==route.name?query.returnShell:defaultName;
    const activityId=query.returnActivityId||query.originActivityId||currentActivityId(route)||'';
    const values=activityId&&['activity','preparation','record'].includes(name)?{activityId,planId:route.planId||''}:{};
    if(name==='record'){values.returnShell=query.recordReturnShell||'preparation';values.returnActivityId=activityId;}
    return {name,values};
  }
  function backOr(route,defaultName='home',values={}){
    if(route.name==='memo'&&routeValues(route).returnShell==='record'&&route.activityId&&router.history.state()?.outbaseExecutionMemoOrigin===route.activityId){router.back();return;}
    const target=returnRoute(route,defaultName);
    router.navigate(target.name,{...target.values,...values},{replace:true,transition:false,skipTransition:true});
  }

  async function planEditorPayload(route){
    const id=routeValues(route).activityId||'';
    if(!id)return {raw:null,activity:null,calendar:[]};
    const [raw,activity,calendar]=await Promise.all([
      repos().activities.get(id),plans().get(id),repos().calendarEntries.byIndex('activity_id',id)
    ]);
    return {raw,activity,calendar:safeArray(calendar).filter(row=>!row.deleted_at).sort((a,b)=>String(a.start_at||'').localeCompare(String(b.start_at||'')))};
  }
  async function preparationPayload(route){
    const id=currentActivityId(route);
    if(!id)return {status:'missing'};
    const api=globalThis.OUTBASE_PREPARATION_ROUTE_V17;
    const warm=api?.cached?.(id);if(warm)return warm;
    const result=await api?.loadFast?.(id,{force:false});
    return result||{status:'missing'};
  }
  async function startPayload(){
    let rows=(await homeRows()).filter(item=>['candidate','planned','preparing','active','paused'].includes(item.state));
    if(!rows.length){try{rows=await plans().list({states:['candidate','planned','preparing','active','paused'],limit:60});}catch(_error){rows=[];}}
    return {rows:safeArray(rows)};
  }
  async function memoPayload(route){
    // HOME may contain readonly calendar projections, not writable activities.
    let rows=await plans().list({includeDeleted:false,limit:100});
    const requested=route.activityId;
    if(requested&&!rows.some(item=>item.id===requested)){
      const raw=await repos().activities.get(requested);
      if(raw&&!raw.deleted_at){const item=await plans().get(requested);if(item)rows=[item,...rows];}
    }
    return {rows:safeArray(rows).filter(item=>item.state!=='archived')};
  }
  async function placesPayload(route){
    if(routeValues(route).mode==='explore')return routeValues(route).calendarEventId?globalThis.OUTBASE_CAMP_EXPLORATION.loadCalendar(routeValues(route).calendarEventId):globalThis.OUTBASE_CAMP_EXPLORATION.load(currentActivityId(route));
    const [placeRows,homeActivityRows,vaultActivityRows]=await Promise.all([repos().places.all(),homeRows(),vaultRows()]);
    return {places:safeArray(placeRows).filter(row=>!row.deleted_at),activities:uniqueActivities(homeActivityRows,vaultActivityRows)};
  }
  async function assetsPayload(route){
    if(routeValues(route).mode==='meal')return globalThis.OUTBASE_MEAL_CONSULTATION.load({activityId:currentActivityId(route),nativeEventId:routeValues(route).calendarEventId||null});
    const rows=safeArray(await repos().assets.all()).filter(row=>!row.deleted_at);
    const id=routeValues(route).assetId||'';
    return {rows,selected:id?rows.find(row=>String(row.id)===String(id))||null:null};
  }
  async function loadPayload(route){
    if(route.name==='plan-editor')return planEditorPayload(route);
    if(route.name==='preparation-detail')return preparationPayload(route);
    if(route.name==='start')return startPayload(route);
    if(route.name==='memo')return memoPayload(route);
    if(route.name==='places')return placesPayload(route);
    if(route.name==='assets')return assetsPayload(route);
    return {};
  }
  async function buildPayload(route,{force=false}={}){
    if(route.name==='assets'&&routeValues(route).mode==='meal')return loadPayload(route);
    if(route.name==='places'&&routeValues(route).mode==='explore')return loadPayload(route);
    if(!force){const cached=cachedPayload(route);if(cached)return cached;const job=payloadJobs.get(routeKey(route));if(job)return job;}
    const job=Promise.resolve().then(()=>loadPayload(route)).then(payload=>cachePayload(route,payload)).catch(error=>({status:'error',error})).finally(()=>payloadJobs.delete(routeKey(route)));
    payloadJobs.set(routeKey(route),job);return job;
  }
  function prefetch(names=[]){
    const current=router.current();
    return Promise.allSettled(safeArray(names).map(name=>buildPayload({...current,name,query:{...routeValues(current)}})));
  }
  function provisionalPayload(route){
    if(route.name==='assets'&&routeValues(route).mode==='meal')return {status:'loading'};
    if(route.name==='places'&&routeValues(route).mode==='explore')return {status:'loading'};
    const cached=cachedPayload(route);if(cached)return cached;
    const item=currentContextItem(route);
    if(route.name==='plan-editor')return {raw:null,activity:routeValues(route).activityId?item:null,calendar:[]};
    if(route.name==='preparation-detail'){
      const warm=item?.id?globalThis.OUTBASE_PREPARATION_ROUTE_V17?.cached?.(item.id):null;if(warm)return warm;
      return {status:'loading',item,summary:{activity:item,items:[],sections:[],total:0,completed:0,pending:0,progress:0,persisted:false}};
    }
    if(route.name==='start'||route.name==='memo')return {rows:item?[item]:[]};
    if(route.name==='places')return {places:[],activities:item?[item]:[]};
    if(route.name==='assets')return {rows:[],selected:null};
    return {};
  }
  function provisionalValue(route){return Object.freeze({version:'v22.2',route,online:navigator.onLine,routePayload:provisionalPayload(route),provisional:true});}

  const model=Object.freeze({
    ...modelBase,
    __routeUnificationV22:true,
    __routeUnificationV222:true,
    async build(options={}){
      const route=router.current();
      if(!ROUTES.has(route?.name))return modelBase.build(options);
      const routePayload=await buildPayload(route,{force:Boolean(options.force)});
      return Object.freeze({version:'v22.2',route,online:navigator.onLine,routePayload});
    }
  });

  function routeHead(label,backLabel='戻る'){
    return `<div class="ob22-route-head"><button type="button" data-ob22-back>${icons.back}<span>${esc(backLabel)}</span></button><span>${esc(label)}</span></div>`;
  }
  function emptyCard(title,body){return `<section class="ob22-card ob22-empty"><span>${icons.record}</span><div><h2>${esc(title)}</h2><p>${esc(body)}</p></div></section>`;}
  function typeOptions(selected='other'){
    return [['camp','キャンプ'],['walk','散歩'],['drive','ドライブ'],['event','イベント'],['shopping','買い物'],['other','その他']].map(([value,label])=>`<option value="${value}"${value===selected?' selected':''}>${label}</option>`).join('');
  }

  function planEditorMarkup(value){
    const route=value.route;const payload=value.routePayload||{};const item=payload.activity||null;const raw=payload.raw||null;const calendar=payload.calendar?.[0]||null;const query=routeValues(route);
    const start=item?.startAt||calendar?.start_at||new Date(Date.now()+86400000).toISOString();
    const end=item?.endAt||calendar?.end_at||new Date(new Date(start).getTime()+2*3600000).toISOString();
    const meta=raw?.metadata||item?.metadata||{};const title=item?.title||query.title||'';const place=metadataPlace(item||raw)||query.place||'';const note=text(meta.note||meta.memo||meta.legacy_plan?.memo);
    const editing=Boolean(item?.id);const allDay=Boolean(calendar?.all_day);
    return `<section class="ob22-page ob22-plan-editor" data-ob22-route-page="plan-editor">
      ${routeHead(editing?'予定を編集':'予定を追加',editing?'予定詳細へ':'閉じる')}
      <section class="ob22-card ob22-page-title"><span>${icons.calendar}</span><div><small>${editing?'予定の設定':'新しい予定'}</small><h1>${editing?esc(item.title):'予定を追加'}</h1><p>日程・場所・種類を、新しいOUTBASE画面のまま登録します。</p></div></section>
      ${!editing?`<section class="ob22-card ob22-inline-form" data-ob22-reservation><h2>予約メール・本文から取り込む</h2><p>本文から候補を作り、下の入力欄で確認して保存します。画像・PDFの読み取りはまだ対応していません。</p><textarea data-ob22-reservation-source aria-label="予約本文" maxlength="20000" rows="6" placeholder="施設名、年を含む日程、チェックイン・アウト時刻がある予約本文"></textarea><button type="button" data-ob22-reservation-extract>候補を確認する</button><p role="status" aria-live="polite"></p><div data-ob22-reservation-preview hidden><pre style="white-space:pre-wrap;overflow-wrap:anywhere" data-ob22-reservation-summary></pre><button type="button" data-ob22-reservation-apply>候補を入力欄へ反映</button></div></section>`:''}
      <form class="ob22-card ob22-form" data-ob22-plan-form>
        <label class="wide"><span>予定名</span><input name="title" required maxlength="120" value="${esc(title)}" placeholder="例：湖畔キャンプ"></label>
        <label><span>種類</span><select name="type">${typeOptions(item?.type||query.activityType||'camp')}</select></label>
        <label class="ob22-check"><input type="checkbox" name="allDay"${allDay?' checked':''}><span>終日</span></label>
        <label><span>開始日</span><input type="date" name="startDate" required value="${localDate(start)}"></label>
        <label><span>開始時刻</span><input type="time" name="startTime" value="${localTime(start)||'09:00'}"></label>
        <label><span>終了日</span><input type="date" name="endDate" required value="${localDate(end)}"></label>
        <label><span>終了時刻</span><input type="time" name="endTime" value="${localTime(end)||'11:00'}"></label>
        <label class="wide"><span>場所</span><input name="place" value="${esc(place)}" placeholder="キャンプ場・公園・目的地"></label>
        <label class="wide"><span>メモ</span><textarea name="note" rows="4" placeholder="予約、集合、確認したいこと">${esc(note)}</textarea></label>
        ${!editing?'<fieldset class="wide" data-ob22-reservation-prep hidden><legend>一緒に作成する準備候補</legend><label class="ob22-check"><input type="checkbox" data-ob22-reservation-pet><span>コタも同行する</span></label><div data-ob22-reservation-prep-items></div><p>不要な候補はチェックを外せます。日程・場所も確認してから保存してください。</p></fieldset>':''}
        <div class="ob22-form-actions wide"><button type="button" class="secondary" data-ob22-back>キャンセル</button><button type="submit" class="primary">${editing?'変更を保存':'予定を追加'}</button></div>
        ${editing?'<button type="button" class="ob22-danger wide" data-ob22-plan-delete>この予定を削除</button>':''}
      </form>
    </section>`;
  }

  function bindReservation(main,form){
    const panel=main.querySelector('[data-ob22-reservation]');if(!panel||!form)return;
    form.dataset.reservationRequest=globalThis.OUTBASE_IDS.ulid();let candidate=null;
    const status=panel.querySelector('[role="status"]'),preview=panel.querySelector('[data-ob22-reservation-preview]');
    panel.querySelector('[data-ob22-reservation-source]').addEventListener('input',()=>{candidate=null;preview.hidden=true;status.textContent='本文を変更しました。候補を確認し直してください。';});
    panel.querySelector('[data-ob22-reservation-extract]').addEventListener('click',()=>{try{
      candidate=globalThis.OUTBASE_RESERVATION_IMPORT.extract(panel.querySelector('textarea').value);preview.hidden=false;
      panel.querySelector('[data-ob22-reservation-summary]').textContent=[candidate.place||'施設名：未取得',`${candidate.startDate||'開始日：未取得'} ${candidate.startTime||'開始時刻：未取得'}`,`${candidate.endDate||'終了日：未取得'} ${candidate.endTime||'終了時刻：未取得'}`,...candidate.warnings].join('\n');
      status.textContent='候補です。まだ保存していません。';
    }catch{candidate=null;preview.hidden=true;status.textContent='予約本文を入力してください（2万文字まで）。';}});
    const renderPrep=()=>{const pet=form.querySelector('[data-ob22-reservation-pet]').checked;form.querySelector('[data-ob22-reservation-prep-items]').innerHTML=globalThis.OUTBASE_RESERVATION_IMPORT.suggestions({pet}).map(row=>`<label class="ob22-check"><input type="checkbox" checked data-ob22-reservation-prep-item data-category="${esc(row.category)}" value="${esc(row.title)}"><span>${esc(row.title)}</span></label>`).join('');};
    form.querySelector('[data-ob22-reservation-pet]').addEventListener('change',()=>{
      const selected=new Map([...form.querySelectorAll('[data-ob22-reservation-prep-item]')].map(n=>[n.dataset.category,n.checked]));renderPrep();form.querySelectorAll('[data-ob22-reservation-prep-item]').forEach(n=>{if(selected.has(n.dataset.category))n.checked=selected.get(n.dataset.category);});
    });
    panel.querySelector('[data-ob22-reservation-apply]').addEventListener('click',()=>{if(!candidate)return;
      for(const name of ['title','place','startDate','endDate','startTime','endTime'])form.elements[name].value=candidate[name]||'';
      form.elements.type.value='camp';form.elements.allDay.checked=false;form.elements.startTime.required=true;form.elements.endTime.required=true;reservationDrafts.set(form,{source:candidate.source});form.querySelector('[data-ob22-reservation-prep]').hidden=false;renderPrep();status.textContent='入力欄へ反映しました。未取得の日程・時刻を補い、確認してから保存してください。';form.elements.title.focus();
    });
  }
  function prepItemMarkup(item){const done=item.status==='completed'||Boolean(item.completedAt);return `<button type="button" class="ob22-prep-row ${done?'done':''}" data-ob22-prep-toggle="${esc(item.id||'')}"><span class="check">${done?icons.check:''}</span><span><b>${esc((item.origin==='meal'||item.source==='meal-consultation-v1')?globalThis.OUTBASE_MEAL_CONSULTATION.displayText(item.title||'準備'):item.title||'準備')}</b><small>${done?'完了':esc((item.origin==='improvement'?globalThis.OUTBASE_IMPROVEMENT_PREPARATION?.CATEGORIES?.[item.category]:null)||prepDomain()?.CATEGORY_LABELS?.[item.category]||'未完了')}</small></span>${icons.arrow}</button>`;}
  function preparationShareText(item,sections){
    const lines=[`${item.title||'予定'}の準備リスト`,activityRange(item),metadataPlace(item)||'場所未設定'];
    for(const section of sections){lines.push('',`【${section.label||'準備'}】`);for(const row of safeArray(section.items))lines.push(`${row.status==='completed'||row.completedAt?'☑':'☐'} ${(row.origin==='meal'||row.source==='meal-consultation-v1')?globalThis.OUTBASE_MEAL_CONSULTATION.displayText(row.title||'準備'):row.title||'準備'}`);}
    return lines.join('\n');
  }
  async function sharePreparation(form,mode){
    const field=form.querySelector('textarea');const status=form.querySelector('[role="status"]');
    if(mode==='share'&&navigator.share){try{await navigator.share({title:'準備リスト',text:field.value});status.textContent='共有先へ渡しました。';return;}catch(error){if(error.name==='AbortError'){status.textContent='共有を取り消しました。';return;}}}
    try{await navigator.clipboard.writeText(field.value);status.textContent='コピーしました。LINEなどに貼り付けて送れます。';}
    catch{field.focus();field.select();field.setSelectionRange(0,field.value.length);status.textContent='本文を選択しました。長押ししてコピーできます。';}
  }
  function preparationMarkup(value){
    const result=value.routePayload||{};
    if(result.status==='loading'){
      const item=result.item||result.summary?.activity||currentContextItem(value.route)||{};
      return `<section class="ob22-page ob22-prep-detail" data-ob22-route-page="preparation-detail">${routeHead('詳細な準備','準備へ')}<section class="ob22-card ob22-page-title"><span>${icons.prep}</span><div><small>${esc(typeLabel(item.type))}</small><h1>${esc(item.title||'準備')}</h1><p>準備項目を読み込んでいます。</p></div></section><section class="ob22-card ob22-list-card"><div class="ob22-loading-inline"><span></span><b>準備リストを読み込んでいます</b></div></section></section>`;
    }
    if(result.status!=='ready')return `<section class="ob22-page">${routeHead('詳細な準備','準備へ')}${emptyCard('準備を開けませんでした','対象の予定を選び直してください。')}</section>`;
    const summary=result.summary||{};const item=result.item||summary.activity;const sections=safeArray(summary.sections);
    return `<section class="ob22-page ob22-prep-detail" data-ob22-route-page="preparation-detail" data-ob22-activity-id="${esc(item.id)}">
      ${routeHead('詳細な準備','準備へ')}
      <section class="ob22-card ob22-page-title"><span>${icons.prep}</span><div><small>${esc(typeLabel(item.type))}</small><h1>${esc(item.title||'予定')}</h1><p>${esc(activityRange(item))}・${esc(metadataPlace(item)||'場所未設定')}</p></div><em>${Number(summary.progress||0)}%</em></section>
      <section class="ob22-card ob22-progress"><strong>${Number(summary.completed||0)}<i>/ ${Number(summary.total||0)}</i></strong><div><span style="width:${Math.max(0,Math.min(100,Number(summary.progress||0)))}%"></span></div><b>${Number(summary.pending||0)}件 未完了</b></section>
      ${item.type==='camp'?`<section class="ob22-card ob22-inline-form"><h2>料理相談・献立</h2><p>人数・食材・器具から料理を選び、買い物と持ち物に反映します。</p><button type="button" data-meal-open="${esc(item.id)}">献立を考える</button></section>`:''}
      <div class="ob22-prep-groups">${sections.map(section=>`<section class="ob22-card ob22-prep-group"><header><span>${ui.categoryIcons?.[section.key]||icons.prep}</span><div><small>${esc(section.label||'準備')}</small><h2>${esc(section.label||'準備')}</h2></div></header><div>${safeArray(section.items).map(prepItemMarkup).join('')}</div></section>`).join('')}</div>
      <section class="ob22-card ob22-inline-form" data-ob22-prep-share><h2>準備リストを送る</h2><p>リンや同行者に、分類と完了状態をまとめて送れます。</p><textarea aria-label="共有する準備リスト" readonly rows="6">${esc(preparationShareText(item,sections))}</textarea><button type="button" data-ob22-prep-share-action="share">共有する</button><button type="button" data-ob22-prep-share-action="copy">コピーする</button><p role="status" aria-live="polite"></p></section>
      <form class="ob22-card ob22-inline-form" data-ob22-prep-add><h2>準備項目を追加</h2><select name="category"><option value="gear">持ち物</option><option value="weather">天気</option><option value="route">行き方</option><option value="meal">料理</option><option value="shopping">買い物</option><option value="pet">ペット</option><option value="parking">駐車</option><option value="ticket">予約・チケット</option><option value="note">メモ</option></select><input name="title" required placeholder="確認すること"><button type="submit">追加</button></form>
    </section>`;
  }

  function activityChoice(item,currentId=''){
    return `<button type="button" class="ob22-choice ${String(item.id)===String(currentId)?'current':''}" data-ob22-start-plan="${esc(item.id)}"><span>${item.type==='walk'?icons.walk:item.type==='camp'?icons.camp:item.type==='drive'?icons.drive:icons.play}</span><span><small>${esc(typeLabel(item.type))}・${esc(activityRange(item))}</small><b>${esc(item.title)}</b><em>${esc(metadataPlace(item)||'場所未設定')}</em></span>${icons.arrow}</button>`;
  }
  function startMarkup(value){
    const rows=safeArray(value.routePayload?.rows);const current=currentActivityId(value.route);
    return `<section class="ob22-page ob22-start" data-ob22-route-page="start">
      ${routeHead('活動を始める','閉じる')}
      <section class="ob22-card ob22-page-title"><span>${icons.play}</span><div><small>活動開始</small><h1>どの活動を始めますか？</h1><p>予定を選ぶと、新しい実行画面へそのまま進みます。</p></div></section>
      <section class="ob22-card ob22-list-card"><h2>コタ散歩</h2><p>予定の作成なしで時間を記録します。記録中の散歩があれば、その散歩へ戻ります。GPS記録も一緒に始めるか選べます。</p><label style="display:flex;align-items:center;gap:10px;padding:12px 0"><input type="checkbox" data-kota-start-gps ${kotaGpsPreference()?'checked':''}>散歩開始と一緒にGPS記録を開始</label><p>この選択は次回も使います。位置情報の許可は端末の設定に従います。別アプリの使用中や消灯中はGPS記録が停止します。</p><div class="ob22-form-actions" style="grid-template-columns:1fr"><button class="primary" type="button" data-ob22-kota-start>コタ散歩を始める</button></div><p role="status" data-ob22-kota-status hidden></p></section>
      <section class="ob22-card ob22-list-card"><div class="ob22-section-title"><h2>予定から始める</h2><span>${rows.length}件</span></div><div class="ob22-choice-list">${rows.length?rows.map(item=>activityChoice(item,current)).join(''):'<p class="ob22-muted">開始できる予定はまだありません。</p>'}</div></section>
      <form class="ob22-card ob22-form" data-ob22-quick-start><div class="ob22-section-title wide"><h2>予定なしで始める</h2></div><label class="wide"><span>活動名</span><input name="title" required value="${esc(routeValues(value.route).title||'')}" placeholder="例：コタ通常散歩"></label><label class="wide"><span>種類</span><select name="type">${typeOptions(routeValues(value.route).activityType||'walk')}</select></label><div class="ob22-form-actions wide"><button type="submit" class="primary">実行画面を開く</button></div></form>
    </section>`;
  }

  function memoMarkup(value){
    const rows=safeArray(value.routePayload?.rows);const route=value.route;const query=routeValues(route);const current=currentActivityId(route);const target=query.target||'memo';
    const requestId=globalThis.OUTBASE_IDS?.ulid?.()||`memo-request-${Date.now()}`;
    const bound=query.returnShell==='record'&&route.activityId;
    const missing=bound&&!rows.some(item=>item.id===bound);
    return `<section class="ob22-page ob22-memo" data-ob22-route-page="memo">
      ${routeHead(target==='improvement'?'改善メモ':'記録を残す','閉じる')}
      <section class="ob22-card ob22-page-title"><span>${target==='improvement'?icons.improve:icons.memo}</span><div><small>${target==='improvement'?'次回へつなぐ':'クイック記録'}</small><h1>${target==='improvement'?'改善メモを残す':'メモを残す'}</h1><p>旧FIELD03を開かず、選んだ活動へ直接保存します。</p></div></section>
      <form class="ob22-card ob22-form" data-ob22-memo-form data-ob22-target="${esc(target)}" data-ob22-request-id="${esc(requestId)}">
        <input type="hidden" name="requestId" value="${esc(requestId)}">
        ${bound?`<input type="hidden" name="activityId" value="${esc(bound)}">`:''}
        <label class="wide"><span>記録先</span><select name="activityId" ${bound?'disabled':''}><option value="">活動を選ばず保存</option>${rows.map(item=>`<option value="${esc(item.id)}"${String(item.id)===String(current)?' selected':''}>${esc(item.title)}｜${esc(activityRange(item))}</option>`).join('')}</select></label>
        <label class="wide"><span>見出し</span><input name="title" maxlength="90" placeholder="あとで見つけやすい名前"></label>
        <label class="wide"><span>内容</span><textarea name="body" rows="8" required placeholder="今の気づき、確認したいこと、次回の改善など"></textarea></label>
        <p class="wide" data-ob22-memo-status role="status" ${missing?'':'hidden'}>${missing?'記録先の活動を読み込めません。実行画面に戻って開き直してください。':''}</p>
        <div class="ob22-form-actions wide"><button type="button" class="secondary" data-ob22-back>キャンセル</button><button type="submit" class="primary" ${missing?'disabled':''}>保存</button></div>
      </form>
    </section>`;
  }

  function placeRows(payload){
    const map=new Map();
    safeArray(payload.places).forEach(row=>{const name=text(row.name||row.title||row.label);if(name)map.set(name,{name,sub:text(row.address||row.memo||row.payload?.address||'登録した場所'),source:'place',id:row.id});});
    safeArray(payload.activities).forEach(item=>{const name=metadataPlace(item);if(name&&!map.has(name))map.set(name,{name,sub:`${item.title}で使用`,source:'activity',id:item.id});});
    return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'ja'));
  }
  function placesMarkup(value){
    const rows=placeRows(value.routePayload||{});
    return `<section class="ob22-page ob22-places" data-ob22-route-page="places">
      ${routeHead('場所を探す','探すへ')}
      <section class="ob22-card ob22-page-title"><span>${icons.pin}</span><div><small>保存済みの場所</small><h1>キャンプ場・場所を探す</h1><p>予定や過去の記録で使った場所を、同じ画面で探します。</p></div></section>
      <section class="ob22-card ob22-search-box"><span>${icons.search}</span><input type="search" data-ob22-place-search placeholder="場所名・住所・予定名"><button type="button" data-ob22-place-clear>${icons.close}</button></section>
      <section class="ob22-card ob22-list-card"><div class="ob22-section-title"><h2>登録した場所</h2><span data-ob22-place-count>${rows.length}件</span></div><div class="ob22-place-list">${rows.length?rows.map(row=>`<article class="ob22-place-row" data-ob22-place-row data-ob22-place-text="${esc(`${row.name} ${row.sub}`.toLowerCase())}"><span>${icons.pin}</span><div><b>${esc(row.name)}</b><small>${esc(row.sub)}</small></div><button type="button" data-ob22-place-plan="${esc(row.name)}">予定に使う</button></article>`).join(''):'<p class="ob22-muted">登録した場所はまだありません。</p>'}</div></section>
      <form class="ob22-card ob22-form" data-ob22-place-add><div class="ob22-section-title wide"><h2>場所を登録</h2></div><label class="wide"><span>場所名</span><input name="name" required placeholder="キャンプ場・公園・施設"></label><label class="wide"><span>住所・メモ</span><input name="memo" placeholder="住所、サイト番号、注意点など"></label><div class="ob22-form-actions wide"><button type="submit" class="primary">場所を登録</button></div></form>
    </section>`;
  }

  function assetPayload(row){const p=row?.payload||{};return {name:text(row?.name),category:text(p.category||row?.asset_type||row?.type||'ギア'),quantity:Number(p.quantity??row?.quantity??1),storage:text(p.storage||row?.storage),memo:text(p.memo||row?.memo)};}
  function assetsMarkup(value){
    const payload=value.routePayload||{};const rows=safeArray(payload.rows);const selected=payload.selected;const query=routeValues(value.route);const editing=Boolean(selected||query.mode==='add');const data=assetPayload(selected||{});
    return `<section class="ob22-page ob22-assets" data-ob22-route-page="assets">
      ${routeHead(editing?'持ち物を編集':'持ち物','保管庫へ')}
      <section class="ob22-card ob22-page-title"><span>${icons.gear}</span><div><small>共通台帳</small><h1>${editing?(selected?'持ち物を編集':'持ち物を登録'):'持ち物'}</h1><p>ギア・消耗品・保管場所を、新しい保管庫から管理します。</p></div>${!editing?'<button type="button" class="ob22-head-action" data-ob22-asset-add>追加</button>':''}</section>
      ${editing?`<form class="ob22-card ob22-form" data-ob22-asset-form data-ob22-asset-id="${esc(selected?.id||'')}"><label class="wide"><span>名前</span><input name="name" required value="${esc(data.name)}" placeholder="製品名・持ち物名"></label><label><span>分類</span><input name="category" value="${esc(data.category)}" placeholder="ギア・消耗品"></label><label><span>数量</span><input name="quantity" type="number" min="0" step="1" value="${data.quantity}"></label>${globalThis.OUTBASE_MEAL_CONSULTATION_UI.gearRegistrationMarkup(selected)}<label class="wide"><span>保管場所</span><input name="storage" value="${esc(data.storage)}" placeholder="車・倉庫・シェルコンなど"></label><label class="wide"><span>メモ</span><textarea name="memo" rows="4">${esc(data.memo)}</textarea></label><div class="ob22-form-actions wide"><button type="button" class="secondary" data-ob22-assets-list>一覧へ戻る</button><button type="submit" class="primary">保存</button></div>${selected?'<button type="button" class="ob22-danger wide" data-ob22-asset-delete>削除</button>':''}</form>`:`<section class="ob22-card ob22-list-card"><div class="ob22-section-title"><h2>登録済み</h2><span>${rows.length}件</span></div><div class="ob22-asset-list">${rows.length?rows.map(row=>{const item=assetPayload(row);return `<button type="button" class="ob22-asset-row" data-ob22-asset-edit="${esc(row.id)}"><span>${icons.gear}</span><span><small>${esc(item.category)}・数量 ${item.quantity}</small><b>${esc(item.name||'名称未設定')}</b><em>${esc(item.storage||item.memo||'登録済み')}</em></span>${icons.arrow}</button>`;}).join(''):'<p class="ob22-muted">持ち物はまだ登録されていません。</p>'}</div></section>`}
    </section>`;
  }

  function pageMarkup(value){
    if(value.routePayload?.status==='error')return `<section class="ob22-page">${routeHead('OUTBASE','戻る')}${emptyCard('読み込めませんでした','保存済みデータは削除されていません。画面を戻って、もう一度開いてください。')}</section>`;
    if(value.route.name==='plan-editor')return planEditorMarkup(value);
    if(value.route.name==='preparation-detail')return preparationMarkup(value);
    if(value.route.name==='start')return startMarkup(value);
    if(value.route.name==='memo')return memoMarkup(value);
    if(value.route.name==='places')return routeValues(value.route).mode==='explore'?globalThis.OUTBASE_CAMP_EXPLORATION_UI.markup(value):placesMarkup(value);
    if(value.route.name==='assets')return routeValues(value.route).mode==='meal'?globalThis.OUTBASE_MEAL_CONSULTATION_UI.markup(value):assetsMarkup(value);
    return '';
  }

  function dateTimeIso(dateValue,timeValue,allDay,end=false){
    const time=allDay?(end?'23:59':'00:00'):(timeValue||'09:00');
    const d=new Date(`${dateValue}T${time}:00`);
    return Number.isNaN(d.getTime())?null:d.toISOString();
  }
  async function savePlan(form,value){
    const fd=new FormData(form);const title=text(fd.get('title'));if(!title)return;
    const allDay=fd.get('allDay')==='on';const startAt=dateTimeIso(fd.get('startDate'),fd.get('startTime'),allDay,false);const endAt=dateTimeIso(fd.get('endDate'),fd.get('endTime'),allDay,true);
    if(!startAt||!endAt||new Date(endAt)<new Date(startAt)){toast('終了日時を確認してください');return;}
    const imported=reservationDrafts.get(form);
    if(imported){
      if(allDay||text(fd.get('type'))!=='camp'||!fd.get('startTime')||!fd.get('endTime')){toast('予約取込は時刻を指定したキャンプとして保存してください');return;}
      const preparation=[...form.querySelectorAll('[data-ob22-reservation-prep-item]:checked')].map(n=>({category:n.dataset.category,title:n.value}));
      const saved=await globalThis.OUTBASE_RESERVATION_IMPORT.approve({requestId:form.dataset.reservationRequest,title,place:text(fd.get('place')),note:text(fd.get('note')),startAt,endAt,source:imported.source,preparation});
      invalidate(saved.id);const item=await plans().get(saved.id);activate(item||saved,'reservation-import');toast('予約と準備候補を保存しました');router.navigate('activity',{activityId:saved.id},{replace:true,transition:false,skipTransition:true});return;
    }
    const payload=value.routePayload||{};const current=payload.raw||null;const place=text(fd.get('place'));const note=text(fd.get('note'));const type=text(fd.get('type'))||'other';
    const meta={...(current?.metadata||{}),location:place,placeName:place,note,source:'shell-route-unification-v22'};
    meta.legacy_plan={...(meta.legacy_plan||{}),title,location:place,placeName:place,activityType:type,startAt,endAt,memo:note};
    let saved=await repos().activities.save({...current,title,type,state:current?.state||'planned',start_at:startAt,end_at:endAt,visibility:current?.visibility||'private',timezone:'Asia/Tokyo',metadata:meta,source:current?.source||'shell-route-unification-v22'});
    if(!meta.legacy_plan.id){meta.legacy_plan.id=`shell-${saved.id}`;saved=await repos().activities.save({...saved,metadata:meta});}
    const calendar=payload.calendar?.[0]||null;
    await repos().calendarEntries.save({...calendar,activity_id:saved.id,start_at:startAt,end_at:endAt,all_day:allDay,timezone:'Asia/Tokyo',source:calendar?.source||'shell-route-unification-v22'});
    const publicItem=await plans().get(saved.id);activate(publicItem||{id:saved.id,title,type,metadata:meta},'plan-editor-save');invalidate(saved.id);toast(payload.activity?'予定を更新しました':'予定を追加しました');
    router.navigate('activity',{activityId:saved.id},{replace:true,transition:false,skipTransition:true});
  }
  async function deletePlan(value){
    const id=value.routePayload?.raw?.id||value.routePayload?.activity?.id;if(!id)return;
    if(globalThis.confirm&&!globalThis.confirm('この予定を削除しますか？'))return;
    // Calendar rows must be retired while their referenced activity is live.
    const rows=await repos().calendarEntries.byIndex('activity_id',id);
    for(const row of rows||[])if(!row.deleted_at)await repos().calendarEntries.softDelete(row.id);
    await repos().activities.softDelete(id);
    invalidate(id);toast('予定を削除しました');router.navigate('home',{}, {replace:true,transition:false,skipTransition:true});
  }
  async function togglePrep(value,id){
    if(!id)return;const row=await repos().preparationItems.get(id);if(!row)return;const done=row.status==='completed'||Boolean(row.completed_at);
    if(row.source==='meal-consultation-v1'&&row.payload?.shopping_item_id)await globalThis.OUTBASE_MEAL_CONSULTATION.toggleShopping(id,currentActivityId(value.route));else await repos().preparationItems.save({...row,status:done?'pending':'completed',completed_at:done?null:new Date().toISOString()});
    const activityId=currentActivityId(value.route);invalidate(activityId);router.navigate('preparation-detail',{activityId},{replace:true,preserveScroll:true,transition:false,skipTransition:true});
  }
  async function addPrep(form,value){
    const fd=new FormData(form);const title=text(fd.get('title'));if(!title)return;const activityId=currentActivityId(value.route);if(!activityId)return;
    const current=await repos().activities.get(activityId);await repos().preparationItems.save({household_id:current?.household_id||'',activity_id:activityId,category:text(fd.get('category'))||'note',title,status:'pending',sort_order:999,origin:'user',source:'shell-route-unification-v22'});
    invalidate(activityId);toast('準備項目を追加しました');router.navigate('preparation-detail',{activityId},{replace:true,preserveScroll:true,transition:false,skipTransition:true});
  }
  function kotaGpsPreference(){try{return localStorage.getItem('outbase-kota-start-gps')==='yes';}catch(_error){return false;}}
  function openExecution(item,returnShell='start'){
    if(!item?.id)return;activate(item,'start-to-execution');globalThis.OUTBASE_EXECUTION_ROUTE_V19?.prime?.(item);
    router.navigate('record',{activityId:item.id,planId:item.legacyPlanId||'',activityType:item.type||'',activityTitle:item.title||'',returnShell,returnActivityId:item.id},{transition:false,skipTransition:true});
  }
  async function quickStart(form){
    const fd=new FormData(form);const title=text(fd.get('title'));if(!title)return;const type=text(fd.get('type'))||'other';const startAt=new Date();const endAt=new Date(startAt.getTime()+2*3600000);
    let saved=await repos().activities.save({title,type,state:'planned',start_at:startAt.toISOString(),end_at:endAt.toISOString(),timezone:'Asia/Tokyo',visibility:'private',metadata:{location:'',source:'shell-route-unification-v22',legacy_plan:{title,activityType:type,startAt:startAt.toISOString(),endAt:endAt.toISOString()}},source:'shell-route-unification-v22'});
    const meta={...(saved.metadata||{}),legacy_plan:{...(saved.metadata?.legacy_plan||{}),id:`shell-${saved.id}`}};saved=await repos().activities.save({...saved,metadata:meta});
    await repos().calendarEntries.save({activity_id:saved.id,start_at:startAt.toISOString(),end_at:endAt.toISOString(),all_day:false,timezone:'Asia/Tokyo',source:'shell-route-unification-v22'});
    const item=await plans().get(saved.id);invalidate(saved.id);openExecution(item||{id:saved.id,title,type,metadata:meta},'start');
  }
  async function saveMemo(form,value){
    const fd=new FormData(form);let activityId=text(fd.get('activityId'));const title=text(fd.get('title'));const body=text(fd.get('body'));if(!body)throw new Error('memo_body_required');const target=form.dataset.ob22Target||'memo';
    const displayedActivityId=routeValues(value.route).returnShell==='record'?value.route.activityId:activityId;
    const result=await globalThis.OUTBASE_SAFE_MEMO_V1.save({
      activityId,
      displayActivityId:displayedActivityId,
      title,
      body,
      target,
      kind:activityId?'activity':'quick',
      requestId:text(fd.get('requestId'))||form.dataset.ob22RequestId||''
    });
    if(result.item){
      globalThis.OUTBASE_EXECUTION_ROUTE_V19?.invalidate?.(result.activityId);
      if(routeValues(value.route).returnShell==='record'){
        invalidate(result.activityId);toast('メモを保存しました');
        if(router.current().name==='memo')backOr(value.route,'record',{activityId:result.activityId});
        return;
      }
      activate(result.item,'memo-save');invalidate(result.activityId);toast(target==='improvement'?'改善メモを保存しました':'メモを保存しました');router.navigate('activity',{activityId:result.activityId},{replace:true,transition:false,skipTransition:true});
      return;
    }
    invalidate();toast(target==='improvement'?'未分類の改善メモを保存しました':'未分類メモを保存しました');router.navigate('home',{},{
      replace:true,transition:false,skipTransition:true
    });
  }
  const memoSubmissions=new Set();
  async function submitMemo(form,value){
    const requestId=new FormData(form).get('requestId')||form.dataset.ob22RequestId;
    if(memoSubmissions.has(requestId))return;
    memoSubmissions.add(requestId);
    form.querySelector('[type="submit"]').disabled=true;
    const status=form.querySelector('[data-ob22-memo-status]');status.hidden=false;status.textContent='メモを保存しています。';
    try{await saveMemo(form,value);}
    catch(_error){
      const current=document.querySelector('[data-ob22-memo-form]');
      if(current&&new FormData(current).get('requestId')===requestId){
        const notice=current.querySelector('[data-ob22-memo-status]');notice.hidden=false;notice.textContent='保存できませんでした。入力内容は残っています。記録先を確認して、もう一度お試しください。';
      }
    }finally{
      memoSubmissions.delete(requestId);
      const current=document.querySelector('[data-ob22-memo-form]');
      if(current&&new FormData(current).get('requestId')===requestId)current.querySelector('[type="submit"]').disabled=false;
    }
  }
  async function addPlace(form){const fd=new FormData(form);const name=text(fd.get('name'));if(!name)return;await repos().places.save({name,memo:text(fd.get('memo')),status:'active',source:'shell-route-unification-v22'});toast('場所を登録しました');router.navigate('places',{}, {replace:true,preserveScroll:true});}
  async function saveAsset(form){const fd=new FormData(form);const name=text(fd.get('name'));if(!name)return;const id=form.dataset.ob22AssetId||'';const current=id?await repos().assets.get(id):null;await repos().assets.save({...current,name,asset_type:text(fd.get('category'))||'ギア',quantity:Number(fd.get('quantity')??1),storage:text(fd.get('storage')),memo:text(fd.get('memo')),status:current?.status||'active',payload:{...(current?.payload||{}),category:text(fd.get('category'))||'ギア',quantity:Number(fd.get('quantity')??1),storage:text(fd.get('storage')),memo:text(fd.get('memo')),cooking:{...(current?.payload?.cooking||{}),role:text(fd.get('cookingRole'))||'auto',heat_sources:fd.getAll('cookingHeat').filter(k=>['gas','charcoal','campfire'].includes(k))}},source:current?.source||'shell-route-unification-v22'});globalThis.dispatchEvent(new CustomEvent('outbase:assets-change'));invalidate();toast(id?'持ち物を更新しました':'持ち物を登録しました');router.navigate('assets',{}, {replace:true});}
  async function deleteAsset(value){const id=value.routePayload?.selected?.id;if(!id)return;if(globalThis.confirm&&!globalThis.confirm('この持ち物を削除しますか？'))return;await repos().assets.softDelete(id);globalThis.dispatchEvent(new CustomEvent('outbase:assets-change'));invalidate();toast('持ち物を削除しました');router.navigate('assets',{}, {replace:true});}

  function bind(main,value){
    globalThis.OUTBASE_MEAL_CONSULTATION_UI.bind(main,value);
    globalThis.OUTBASE_CAMP_EXPLORATION_UI.bind(main,value);
    main.querySelectorAll('[data-ob22-back]').forEach(button=>button.addEventListener('click',()=>{
      const defaultName=value.route.name==='preparation-detail'?'preparation':value.route.name==='places'?'search':value.route.name==='assets'?'vault':value.route.name==='plan-editor'&&value.routePayload?.activity?'activity':'home';
      const values=currentActivityId(value.route)?{activityId:currentActivityId(value.route),planId:value.route.planId||''}:{};
      backOr(value.route,defaultName,values);
    }));
    const planForm=main.querySelector('[data-ob22-plan-form]');
    bindReservation(main,planForm);
    planForm?.addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('[type="submit"]');if(button.disabled)return;button.disabled=true;savePlan(form,value).catch(error=>{console.error(error);toast('予定を保存できませんでした。入力は残っています。');}).finally(()=>{if(button.isConnected)button.disabled=false;});});
    main.querySelector('[data-ob22-plan-delete]')?.addEventListener('click',()=>deletePlan(value).catch(()=>toast('予定を削除できませんでした')));
    main.querySelector('[data-meal-open]')?.addEventListener('click',event=>router.navigate('assets',{activityId:event.currentTarget.dataset.mealOpen,mode:'meal'},{transition:false,skipTransition:true}));
    main.querySelectorAll('[data-ob22-prep-toggle]').forEach(button=>button.addEventListener('click',()=>togglePrep(value,button.dataset.ob22PrepToggle).catch(()=>toast('更新できませんでした'))));
    main.querySelectorAll('[data-ob22-prep-share-action]').forEach(button=>button.addEventListener('click',()=>sharePreparation(button.closest('[data-ob22-prep-share]'),button.dataset.ob22PrepShareAction)));
    main.querySelector('[data-ob22-prep-add]')?.addEventListener('submit',event=>{event.preventDefault();addPrep(event.currentTarget,value).catch(()=>toast('追加できませんでした'));});
    main.querySelectorAll('[data-ob22-start-plan]').forEach(button=>button.addEventListener('click',()=>{const item=safeArray(value.routePayload?.rows).find(row=>String(row.id)===String(button.dataset.ob22StartPlan));openExecution(item,'start');}));
    const kota=main.querySelector('[data-ob22-kota-start]');
    if(kota){const requestId=globalThis.OUTBASE_IDS.ulid();kota.addEventListener('click',async()=>{
      if(kota.disabled)return;kota.disabled=true;const status=main.querySelector('[data-ob22-kota-status]');status.hidden=false;status.textContent='散歩を開いています。';
      try{const useGps=!!main.querySelector('[data-kota-start-gps]')?.checked;const saved=await globalThis.OUTBASE_KOTA_WALK.start(requestId);try{localStorage.setItem('outbase-kota-start-gps',useGps?'yes':'no');}catch(_error){}if(useGps)globalThis.OUTBASE_LOCATION_RECORDER.requestStart(saved.id);invalidate(saved.id);openExecution(saved,'start');}
      catch(error){status.textContent='散歩を開始できませんでした。空き容量を確認して、もう一度お試しください。';kota.disabled=false;}
    });}
    main.querySelector('[data-ob22-quick-start]')?.addEventListener('submit',event=>{event.preventDefault();quickStart(event.currentTarget).catch(()=>toast('活動を作成できませんでした'));});
    main.querySelector('[data-ob22-memo-form]')?.addEventListener('submit',event=>{event.preventDefault();submitMemo(event.currentTarget,value);});
    const search=main.querySelector('[data-ob22-place-search]');const filterPlaces=()=>{const q=text(search?.value).toLowerCase();let count=0;main.querySelectorAll('[data-ob22-place-row]').forEach(row=>{const visible=!q||String(row.dataset.ob22PlaceText||'').includes(q);row.hidden=!visible;if(visible)count++;});const node=main.querySelector('[data-ob22-place-count]');if(node)node.textContent=`${count}件`;};
    search?.addEventListener('input',filterPlaces);main.querySelector('[data-ob22-place-clear]')?.addEventListener('click',()=>{if(search){search.value='';filterPlaces();search.focus();}});
    main.querySelectorAll('[data-ob22-place-plan]').forEach(button=>button.addEventListener('click',()=>router.navigate('plan-editor',valuesWithReturn({place:button.dataset.ob22PlacePlan||''},value.route))));
    main.querySelector('[data-ob22-place-add]')?.addEventListener('submit',event=>{event.preventDefault();addPlace(event.currentTarget).catch(()=>toast('場所を登録できませんでした'));});
    main.querySelector('[data-ob22-asset-add]')?.addEventListener('click',()=>router.navigate('assets',valuesWithReturn({mode:'add'},value.route)));
    main.querySelectorAll('[data-ob22-asset-edit]').forEach(button=>button.addEventListener('click',()=>router.navigate('assets',valuesWithReturn({assetId:button.dataset.ob22AssetEdit},value.route)))); 
    main.querySelector('[data-ob22-assets-list]')?.addEventListener('click',()=>router.navigate('assets',{}, {replace:true}));
    main.querySelector('[data-ob22-asset-form]')?.addEventListener('submit',event=>{event.preventDefault();saveAsset(event.currentTarget).catch(()=>toast('持ち物を保存できませんでした'));});
    main.querySelector('[data-ob22-asset-delete]')?.addEventListener('click',()=>deleteAsset(value).catch(()=>toast('削除できませんでした')));
  }

  function ensureRouteShell(root,routeName='home'){
    let shell=root?.querySelector?.(':scope > .ob3-shell')||root?.querySelector?.('.ob3-shell');
    if(shell)return shell;
    if(!root)return null;
    root.innerHTML=`<div class="ob3-shell ob6-north" data-ob6-route="${esc(routeName)}"><header class="ob3-header"></header><main class="ob3-main"></main><nav class="ob3-nav"></nav><div id="outbaseShellModal"></div></div>`;
    return root.querySelector?.(':scope > .ob3-shell')||root.querySelector?.('.ob3-shell');
  }

  function loadingMarkup(routeName){
    const labels={
      'plan-editor':'予定を読み込んでいます',
      'preparation-detail':'詳細な準備を読み込んでいます',
      start:'活動開始を準備しています',
      memo:'記録画面を準備しています',
      places:'場所を読み込んでいます',
      assets:'持ち物を読み込んでいます'
    };
    return `<section class="ob22-page"><div class="ob22-card ob22-loading"><span></span><b>${esc(labels[routeName]||'画面を読み込んでいます')}</b></div></section>`;
  }

  function captureFormState(main){
    const rows=[];
    main?.querySelectorAll?.('input[name],select[name],textarea[name]').forEach((node,index)=>rows.push({index,name:node.name,type:node.type||node.tagName,value:node.value,checked:Boolean(node.checked)}));
    const active=document.activeElement;const focus=active&&main?.contains?.(active)?{name:active.name||'',index:[...main.querySelectorAll('input,select,textarea,button')].indexOf(active)}:null;
    return {rows,focus};
  }
  function restoreFormState(main,state){
    if(!main||!state)return;
    const pools={};main.querySelectorAll('input[name],select[name],textarea[name]').forEach(node=>{(pools[node.name]||(pools[node.name]=[])).push(node);});
    state.rows.forEach(entry=>{const node=(pools[entry.name]||[]).shift();if(!node)return;if(['checkbox','radio'].includes(node.type))node.checked=entry.checked;else node.value=entry.value;});
    requestAnimationFrame(()=>{if(state.focus){const controls=[...main.querySelectorAll('input,select,textarea,button')];const node=(state.focus.name&&main.querySelector(`[name="${CSS.escape(state.focus.name)}"]`))||controls[state.focus.index];node?.focus?.({preventScroll:true});}});
  }
  function sameRequestedRoute(a,b){return a?.name===b?.name&&String(a?.activityId||'')===String(b?.activityId||'')&&String(routeValues(a).assetId||'')===String(routeValues(b).assetId||'')&&String(routeValues(a).mode||'')===String(routeValues(b).mode||'')&&String(routeValues(a).target||'')===String(routeValues(b).target||'');}

  function routeFailureMarkup(error){
    console.error('[OUTBASE route unification v22.2]',error);
    return `<section class="ob22-page">${routeHead('OUTBASE','戻る')}${emptyCard('画面を開けませんでした','保存済みデータは削除されていません。前の画面へ戻って、もう一度開いてください。')}</section>`;
  }

  const renderer=Object.freeze({
    ...rendererBase,
    __routeUnificationV22:true,
    __routeUnificationV221:true,
    __routeUnificationV222:true,
    async mount(root,options={}){
      const requested=router.current();
      if(!ROUTES.has(requested?.name))return rendererBase.mount(root,options);

      const shell=ensureRouteShell(root,requested.name);
      const main=shell?.querySelector?.('.ob3-main');
      if(!shell||!main)throw new Error('OUTBASE v22.2 route shell is not ready');

      if(requested.name==='places'&&routeValues(requested).mode==='explore'&&(routeValues(requested).calendarEventId?main.querySelector('[data-camp-exploration]')?.dataset.explorationCalendarId===routeValues(requested).calendarEventId:main.querySelector('[data-camp-exploration]')?.dataset.campExploration===String(currentActivityId(requested)))){
        try{await globalThis.OUTBASE_CAMP_EXPLORATION_UI.refresh(main);}catch(_error){}return {route:requested,online:navigator.onLine};
      }
      if(requested.name==='assets'&&routeValues(requested).mode==='meal'&&(routeValues(requested).calendarEventId?main.querySelector('[data-meal-consultation]')?.dataset.mealCalendarId===routeValues(requested).calendarEventId:main.querySelector('[data-meal-consultation]')?.dataset.mealConsultation===String(currentActivityId(requested)))){
        try{await globalThis.OUTBASE_MEAL_CONSULTATION_UI.refresh(main);}catch(_error){}return {route:requested,online:navigator.onLine};
      }
      shell.dataset.ob6Route=requested.name;
      main.className='ob3-main ob3-main-ob22';
      const immediate=provisionalValue(requested);
      main.innerHTML=pageMarkup(immediate)||loadingMarkup(requested.name);
      bind(main,immediate);
      try{rendererBase.updateNav?.(root,Object.freeze({route:requested,online:navigator.onLine,routeUnificationLoading:true}));}catch(_error){}
      globalThis.OUTBASE_THEME_V166?.sync?.('route-unification-v22-immediate');

      let value;
      try{
        value=await model.build(options);
        if(!sameRequestedRoute(router.current(),requested))return value;
        const formState=captureFormState(main);
        main.className='ob3-main ob3-main-ob22';
        main.innerHTML=pageMarkup(value)||routeFailureMarkup(new Error(`OUTBASE v22.2 empty markup: ${requested.name}`));
        bind(main,value);
        restoreFormState(main,formState);
        if(requested.name==='memo'){
          const form=main.querySelector('[data-ob22-memo-form]');
          if(form&&memoSubmissions.has(new FormData(form).get('requestId'))){
            form.querySelector('[type="submit"]').disabled=true;
            const status=form.querySelector('[data-ob22-memo-status]');status.hidden=false;status.textContent='メモを保存しています。';
          }
        }
        rendererBase.updateNav?.(root,value);
        globalThis.OUTBASE_THEME_V166?.sync?.('route-unification-v22-render');
        return value;
      }catch(error){
        if(!sameRequestedRoute(router.current(),requested))return Object.freeze({route:requested,online:navigator.onLine,routePayload:{status:'error',error}});
        main.className='ob3-main ob3-main-ob22';
        main.innerHTML=routeFailureMarkup(error);
        const fallback=Object.freeze({route:requested,online:navigator.onLine,routePayload:{status:'error',error}});
        bind(main,fallback);
        try{rendererBase.updateNav?.(root,fallback);}catch(_error){}
        globalThis.OUTBASE_THEME_V166?.sync?.('route-unification-v22-error');
        return fallback;
      }
    },
    updateNav(root,value){rendererBase.updateNav?.(root,value);}
  });

  function valuesWithReturn(values={},current=router.current()){
    return {
      ...values,
      returnShell:current?.name||'home',
      returnActivityId:current?.activityId||undefined,
      originActivityId:current?.activityId||undefined
    };
  }

  function mapLegacyUrl(url){
    const tab=url.searchParams.get('tab')||'';const sheet=url.searchParams.get('sheet')||url.searchParams.get('planSheet')||'';const current=router.current();const activityId=url.searchParams.get('activityId')||url.searchParams.get('returnActivityId')||currentActivityId(current);const planId=url.searchParams.get('planId')||current.planId||'';
    if(tab==='plan'&&sheet==='add')return {name:'plan-editor',values:valuesWithReturn({},current)};
    if(tab==='record'&&sheet==='start')return {name:'start',values:valuesWithReturn({activityId,planId},current)};
    if(tab==='record'&&sheet==='memo')return {name:'memo',values:valuesWithReturn({activityId,planId,target:localStorage.getItem('outbase_record_target')==='次回改善'?'improvement':'memo'},current)};
    if(tab==='prep'&&(url.searchParams.has('outbaseAdd')||url.searchParams.has('outbaseVault')))return {name:'assets',values:valuesWithReturn({assetId:url.searchParams.get('gearId')||'',mode:url.searchParams.has('outbaseAdd')?'add':''},current)};
    if(tab==='prep')return {name:'preparation-detail',values:valuesWithReturn({activityId,planId},current)};
    if(tab==='search')return {name:'places',values:valuesWithReturn({},current)};
    if(tab==='memory')return {name:'vault',values:{}};
    if(tab==='plan')return activityId?{name:'plan-editor',values:valuesWithReturn({activityId,planId},current)}:{name:'home',values:{}};
    if(tab==='record'){
      const state=localStorage.getItem('outbase_record_session_state')||'idle';
      if(['active','paused'].includes(state))return null;
      return {name:'record',values:{activityId,planId,returnShell:current.name||'home',returnActivityId:current.activityId||activityId}};
    }
    return null;
  }

  function routeForControl(control){
    const current=router.current();
    const action=control?.dataset?.ob3Action||control?.dataset?.ob12Action||'';
    if(action==='plan-add')return {name:'plan-editor',values:valuesWithReturn({},current)};
    if(action==='start')return {name:'start',values:valuesWithReturn({activityId:currentActivityId(current)},current)};
    if(action==='memo')return {name:'memo',values:valuesWithReturn({activityId:currentActivityId(current)},current)};
    if(action==='gear-add')return {name:'assets',values:valuesWithReturn({mode:'add'},current)};
    const quick=control?.dataset?.ob36Quick||'';
    if(quick==='prep')return {name:'preparation',values:{activityId:currentActivityId(current)}};
    if(quick==='walk-kota')return {name:'start',values:valuesWithReturn({title:'コタ通常散歩',activityType:'walk'},current)};
    if(quick==='memo')return {name:'memo',values:valuesWithReturn({activityId:currentActivityId(current)},current)};
    if(quick==='improvement-memo')return {name:'memo',values:valuesWithReturn({activityId:currentActivityId(current),target:'improvement'},current)};
    if(quick==='plan-add')return {name:'plan-editor',values:valuesWithReturn({},current)};
    return null;
  }

  function closeCentralWithoutBack(){
    const stack=globalThis.OUTBASE_MODAL_STACK_V164;const hadCentral=stack?.top?.()?.id==='central';
    document.getElementById('outbaseShellModal')?.replaceChildren();
    if(hadCentral)stack.close?.({historyBack:false});
    return Boolean(hadCentral);
  }

  function intercept(event){
    if(event.defaultPrevented||event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    if(!router.shellRequested?.()&&!document.body.classList.contains('outbaseShellPreview'))return;
    const control=event.target.closest?.('[data-ob3-action],[data-ob12-action],[data-ob36-quick]');
    const mappedControl=routeForControl(control);
    if(mappedControl){event.preventDefault();event.stopImmediatePropagation();const replace=closeCentralWithoutBack();router.navigate(mappedControl.name,mappedControl.values,{replace,transition:false,skipTransition:true});return;}
    const anchor=event.target.closest?.('a[href]');if(!anchor||anchor.target==='_blank'||anchor.hasAttribute('download'))return;
    let url;try{url=new URL(anchor.href,location.href);}catch(_error){return;}if(url.origin!==location.origin||!url.searchParams.has('tab'))return;
    const mapped=mapLegacyUrl(url);if(!mapped)return;event.preventDefault();event.stopImmediatePropagation();router.navigate(mapped.name,mapped.values,{transition:false,skipTransition:true});
  }

  addEventListener('click',intercept,true);

  globalThis.OUTBASE_SHELL_MODEL_V166=model;globalThis.OUTBASE_SHELL_MODEL_V165=model;globalThis.OUTBASE_SHELL_MODEL_V164=model;
  globalThis.OUTBASE_SHELL_RENDERER_V166=renderer;globalThis.OUTBASE_SHELL_RENDERER_V165=renderer;globalThis.OUTBASE_SHELL_RENDERER_V164=renderer;
  globalThis.OUTBASE_ROUTE_UNIFICATION_V22=Object.freeze({version:'v22.2',routes:Object.freeze([...ROUTES]),mapLegacyUrl,routeForControl,prefetch,clearPayloadCache,returnRoute});
})();
