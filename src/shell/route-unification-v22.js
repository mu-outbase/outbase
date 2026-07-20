(() => {
  'use strict';

  if(globalThis.OUTBASE_ROUTE_UNIFICATION_V22)return;

  const router=globalThis.OUTBASE_ROUTER;
  const modelBase=globalThis.OUTBASE_SHELL_MODEL_V166||globalThis.OUTBASE_SHELL_MODEL_V165||globalThis.OUTBASE_SHELL_MODEL_V164;
  const rendererBase=globalThis.OUTBASE_SHELL_RENDERER_V166||globalThis.OUTBASE_SHELL_RENDERER_V165||globalThis.OUTBASE_SHELL_RENDERER_V164;
  const ui=globalThis.OUTBASE_UI_V21;
  if(!router||!modelBase||!rendererBase||!ui)throw new Error('OUTBASE route unification dependencies are not ready');

  const icons=ui.icons;
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
    const shell=globalThis.OUTBASE_SHELL_MODEL_V166||globalThis.OUTBASE_SHELL_MODEL_V165||globalThis.OUTBASE_SHELL_MODEL_V164;
    shell?.invalidate?.('home');shell?.invalidate?.('vault');shell?.invalidate?.('calendar');
    if(activityId)shell?.invalidate?.(`activity:${activityId}`);
    globalThis.OUTBASE_ACTIVITY_ROUTE_V16?.invalidate?.(activityId);
    globalThis.OUTBASE_PREPARATION_ROUTE_V17?.invalidate?.(activityId);
  }
  function activate(item,source='route-unification-v22'){
    if(!item?.id)return;
    const api=contextApi();
    if(api?.activate){api.activate(item,{source,record:false});return;}
    try{localStorage.setItem('outbase_core_activity_id',String(item.id));localStorage.setItem('outbase_primary_activity_id_v2',String(item.id));}catch(_error){}
  }
  function backOr(name='home',values={}){
    if(history.state?.outbaseShell&&history.length>1){router.back();return;}
    router.navigate(name,values,{replace:true,transition:false,skipTransition:true});
  }

  async function planEditorPayload(route){
    const id=currentActivityId(route);
    const raw=id?await repos().activities.get(id):null;
    const activity=id?await plans().get(id):null;
    const calendar=id?await repos().calendarEntries.byIndex('activity_id',id):[];
    return {raw,activity,calendar:safeArray(calendar).filter(row=>!row.deleted_at).sort((a,b)=>String(a.start_at||'').localeCompare(String(b.start_at||'')))};
  }
  async function preparationPayload(route){
    const id=currentActivityId(route);
    if(!id)return {status:'missing'};
    try{await prepDomain()?.ensureBaseline?.(id);}catch(_error){}
    const result=await globalThis.OUTBASE_PREPARATION_ROUTE_V17?.loadFast?.(id,{force:true});
    return result||{status:'missing'};
  }
  async function startPayload(){
    const rows=await plans().list({states:['candidate','planned','preparing','active','paused'],limit:60});
    return {rows:safeArray(rows)};
  }
  async function memoPayload(){
    const rows=await plans().list({includeDeleted:false,limit:100});
    return {rows:safeArray(rows).filter(item=>!['archived'].includes(item.state))};
  }
  async function placesPayload(){
    const [placeRows,activityRows]=await Promise.all([repos().places.all(),plans().list({includeDeleted:false,limit:200})]);
    return {places:safeArray(placeRows).filter(row=>!row.deleted_at),activities:safeArray(activityRows)};
  }
  async function assetsPayload(route){
    const rows=safeArray(await repos().assets.all()).filter(row=>!row.deleted_at);
    const id=routeValues(route).assetId||'';
    return {rows,selected:id?rows.find(row=>String(row.id)===String(id))||null:null};
  }
  async function buildPayload(route){
    try{
      if(route.name==='plan-editor')return await planEditorPayload(route);
      if(route.name==='preparation-detail')return await preparationPayload(route);
      if(route.name==='start')return await startPayload(route);
      if(route.name==='memo')return await memoPayload(route);
      if(route.name==='places')return await placesPayload(route);
      if(route.name==='assets')return await assetsPayload(route);
      return {};
    }catch(error){return {status:'error',error};}
  }

  const model=Object.freeze({
    ...modelBase,
    __routeUnificationV22:true,
    async build(options={}){
      const value=await modelBase.build(options);
      const route=value?.route||router.current();
      if(!ROUTES.has(route?.name))return value;
      const routePayload=await buildPayload(route);
      return Object.freeze({...value,route,routePayload});
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
        <div class="ob22-form-actions wide"><button type="button" class="secondary" data-ob22-back>キャンセル</button><button type="submit" class="primary">${editing?'変更を保存':'予定を追加'}</button></div>
        ${editing?'<button type="button" class="ob22-danger wide" data-ob22-plan-delete>この予定を削除</button>':''}
      </form>
    </section>`;
  }

  function prepItemMarkup(item){const done=item.status==='completed'||Boolean(item.completedAt);return `<button type="button" class="ob22-prep-row ${done?'done':''}" data-ob22-prep-toggle="${esc(item.id||'')}"><span class="check">${done?icons.check:''}</span><span><b>${esc(item.title||'準備')}</b><small>${done?'完了':esc(prepDomain()?.CATEGORY_LABELS?.[item.category]||'未完了')}</small></span>${icons.arrow}</button>`;}
  function preparationMarkup(value){
    const result=value.routePayload||{};
    if(result.status!=='ready')return `<section class="ob22-page">${routeHead('詳細な準備','準備へ')}${emptyCard('準備を開けませんでした','対象の予定を選び直してください。')}</section>`;
    const summary=result.summary||{};const item=result.item||summary.activity;const sections=safeArray(summary.sections);
    return `<section class="ob22-page ob22-prep-detail" data-ob22-route-page="preparation-detail" data-ob22-activity-id="${esc(item.id)}">
      ${routeHead('詳細な準備','準備へ')}
      <section class="ob22-card ob22-page-title"><span>${icons.prep}</span><div><small>${esc(typeLabel(item.type))}</small><h1>${esc(item.title||'予定')}</h1><p>${esc(activityRange(item))}・${esc(metadataPlace(item)||'場所未設定')}</p></div><em>${Number(summary.progress||0)}%</em></section>
      <section class="ob22-card ob22-progress"><strong>${Number(summary.completed||0)}<i>/ ${Number(summary.total||0)}</i></strong><div><span style="width:${Math.max(0,Math.min(100,Number(summary.progress||0)))}%"></span></div><b>${Number(summary.pending||0)}件 未完了</b></section>
      <div class="ob22-prep-groups">${sections.map(section=>`<section class="ob22-card ob22-prep-group"><header><span>${ui.categoryIcons?.[section.key]||icons.prep}</span><div><small>${esc(section.label||'準備')}</small><h2>${esc(section.label||'準備')}</h2></div></header><div>${safeArray(section.items).map(prepItemMarkup).join('')}</div></section>`).join('')}</div>
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
      <section class="ob22-card ob22-list-card"><div class="ob22-section-title"><h2>予定から始める</h2><span>${rows.length}件</span></div><div class="ob22-choice-list">${rows.length?rows.map(item=>activityChoice(item,current)).join(''):'<p class="ob22-muted">開始できる予定はまだありません。</p>'}</div></section>
      <form class="ob22-card ob22-form" data-ob22-quick-start><div class="ob22-section-title wide"><h2>予定なしで始める</h2></div><label class="wide"><span>活動名</span><input name="title" required value="${esc(routeValues(value.route).title||'')}" placeholder="例：コタ通常散歩"></label><label class="wide"><span>種類</span><select name="type">${typeOptions(routeValues(value.route).activityType||'walk')}</select></label><div class="ob22-form-actions wide"><button type="submit" class="primary">実行画面を開く</button></div></form>
    </section>`;
  }

  function memoMarkup(value){
    const rows=safeArray(value.routePayload?.rows);const route=value.route;const query=routeValues(route);const current=currentActivityId(route);const target=query.target||'memo';
    return `<section class="ob22-page ob22-memo" data-ob22-route-page="memo">
      ${routeHead(target==='improvement'?'改善メモ':'記録を残す','閉じる')}
      <section class="ob22-card ob22-page-title"><span>${target==='improvement'?icons.improve:icons.memo}</span><div><small>${target==='improvement'?'次回へつなぐ':'クイック記録'}</small><h1>${target==='improvement'?'改善メモを残す':'メモを残す'}</h1><p>旧FIELD03を開かず、選んだ活動へ直接保存します。</p></div></section>
      <form class="ob22-card ob22-form" data-ob22-memo-form data-ob22-target="${esc(target)}">
        <label class="wide"><span>記録先</span><select name="activityId"><option value="">活動を選ばず保存</option>${rows.map(item=>`<option value="${esc(item.id)}"${String(item.id)===String(current)?' selected':''}>${esc(item.title)}｜${esc(activityRange(item))}</option>`).join('')}</select></label>
        <label class="wide"><span>見出し</span><input name="title" maxlength="90" placeholder="あとで見つけやすい名前"></label>
        <label class="wide"><span>内容</span><textarea name="body" rows="8" required placeholder="今の気づき、確認したいこと、次回の改善など"></textarea></label>
        <div class="ob22-form-actions wide"><button type="button" class="secondary" data-ob22-back>キャンセル</button><button type="submit" class="primary">保存</button></div>
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

  function assetPayload(row){const p=row?.payload||{};return {name:text(row?.name),category:text(p.category||row?.asset_type||row?.type||'ギア'),quantity:Number(p.quantity||row?.quantity||1)||1,storage:text(p.storage||row?.storage),memo:text(p.memo||row?.memo)};}
  function assetsMarkup(value){
    const payload=value.routePayload||{};const rows=safeArray(payload.rows);const selected=payload.selected;const query=routeValues(value.route);const editing=Boolean(selected||query.mode==='add');const data=assetPayload(selected||{});
    return `<section class="ob22-page ob22-assets" data-ob22-route-page="assets">
      ${routeHead(editing?'持ち物を編集':'持ち物','保管庫へ')}
      <section class="ob22-card ob22-page-title"><span>${icons.gear}</span><div><small>共通台帳</small><h1>${editing?(selected?'持ち物を編集':'持ち物を登録'):'持ち物'}</h1><p>ギア・消耗品・保管場所を、新しい保管庫から管理します。</p></div>${!editing?'<button type="button" class="ob22-head-action" data-ob22-asset-add>追加</button>':''}</section>
      ${editing?`<form class="ob22-card ob22-form" data-ob22-asset-form data-ob22-asset-id="${esc(selected?.id||'')}"><label class="wide"><span>名前</span><input name="name" required value="${esc(data.name)}" placeholder="製品名・持ち物名"></label><label><span>分類</span><input name="category" value="${esc(data.category)}" placeholder="ギア・消耗品"></label><label><span>数量</span><input name="quantity" type="number" min="0" step="1" value="${data.quantity}"></label><label class="wide"><span>保管場所</span><input name="storage" value="${esc(data.storage)}" placeholder="車・倉庫・シェルコンなど"></label><label class="wide"><span>メモ</span><textarea name="memo" rows="4">${esc(data.memo)}</textarea></label><div class="ob22-form-actions wide"><button type="button" class="secondary" data-ob22-assets-list>一覧へ戻る</button><button type="submit" class="primary">保存</button></div>${selected?'<button type="button" class="ob22-danger wide" data-ob22-asset-delete>削除</button>':''}</form>`:`<section class="ob22-card ob22-list-card"><div class="ob22-section-title"><h2>登録済み</h2><span>${rows.length}件</span></div><div class="ob22-asset-list">${rows.length?rows.map(row=>{const item=assetPayload(row);return `<button type="button" class="ob22-asset-row" data-ob22-asset-edit="${esc(row.id)}"><span>${icons.gear}</span><span><small>${esc(item.category)}・数量 ${item.quantity}</small><b>${esc(item.name||'名称未設定')}</b><em>${esc(item.storage||item.memo||'登録済み')}</em></span>${icons.arrow}</button>`;}).join(''):'<p class="ob22-muted">持ち物はまだ登録されていません。</p>'}</div></section>`}
    </section>`;
  }

  function pageMarkup(value){
    if(value.routePayload?.status==='error')return `<section class="ob22-page">${routeHead('OUTBASE','戻る')}${emptyCard('読み込めませんでした','保存済みデータは削除されていません。画面を戻って、もう一度開いてください。')}</section>`;
    if(value.route.name==='plan-editor')return planEditorMarkup(value);
    if(value.route.name==='preparation-detail')return preparationMarkup(value);
    if(value.route.name==='start')return startMarkup(value);
    if(value.route.name==='memo')return memoMarkup(value);
    if(value.route.name==='places')return placesMarkup(value);
    if(value.route.name==='assets')return assetsMarkup(value);
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
    await repos().activities.softDelete(id);const rows=await repos().calendarEntries.byIndex('activity_id',id);for(const row of rows||[])await repos().calendarEntries.softDelete(row.id);
    invalidate(id);toast('予定を削除しました');router.navigate('home',{}, {replace:true,transition:false,skipTransition:true});
  }
  async function togglePrep(value,id){
    if(!id)return;const row=await repos().preparationItems.get(id);if(!row)return;const done=row.status==='completed'||Boolean(row.completed_at);
    await repos().preparationItems.save({...row,status:done?'pending':'completed',completed_at:done?null:new Date().toISOString()});
    const activityId=currentActivityId(value.route);invalidate(activityId);router.navigate('preparation-detail',{activityId},{replace:true,preserveScroll:true,transition:false,skipTransition:true});
  }
  async function addPrep(form,value){
    const fd=new FormData(form);const title=text(fd.get('title'));if(!title)return;const activityId=currentActivityId(value.route);if(!activityId)return;
    const current=await repos().activities.get(activityId);await repos().preparationItems.save({household_id:current?.household_id||'',activity_id:activityId,category:text(fd.get('category'))||'note',title,status:'pending',sort_order:999,origin:'user',source:'shell-route-unification-v22'});
    invalidate(activityId);toast('準備項目を追加しました');router.navigate('preparation-detail',{activityId},{replace:true,preserveScroll:true,transition:false,skipTransition:true});
  }
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
    const fd=new FormData(form);let activityId=text(fd.get('activityId'));const title=text(fd.get('title'));const body=text(fd.get('body'));if(!body)return;const target=form.dataset.ob22Target||'memo';
    let item=activityId?await plans().get(activityId):null;
    if(!item){const now=new Date();const saved=await repos().activities.save({title:title||'メモ',type:'other',state:'organizing',start_at:now.toISOString(),end_at:now.toISOString(),timezone:'Asia/Tokyo',visibility:'private',metadata:{location:'',source:'shell-route-unification-v22'},source:'shell-route-unification-v22'});activityId=saved.id;item=await plans().get(activityId);}
    if(target==='improvement')await repos().improvementItems.save({activity_id:activityId,title:title||body.slice(0,40),summary:body,status:'open',payload:{text:body},source:'shell-route-unification-v22'});
    else await repos().records.save({activity_id:activityId,type:'note',occurred_at:new Date().toISOString(),visibility:'private',payload:{title:title||body.slice(0,40),text:body,memo:body},source:'shell-route-unification-v22'});
    activate(item||{id:activityId,title:title||'メモ',type:'other'},'memo-save');invalidate(activityId);toast(target==='improvement'?'改善メモを保存しました':'メモを保存しました');router.navigate('activity',{activityId},{replace:true,transition:false,skipTransition:true});
  }
  async function addPlace(form){const fd=new FormData(form);const name=text(fd.get('name'));if(!name)return;await repos().places.save({name,memo:text(fd.get('memo')),status:'active',source:'shell-route-unification-v22'});toast('場所を登録しました');router.navigate('places',{}, {replace:true,preserveScroll:true});}
  async function saveAsset(form){const fd=new FormData(form);const name=text(fd.get('name'));if(!name)return;const id=form.dataset.ob22AssetId||'';const current=id?await repos().assets.get(id):null;await repos().assets.save({...current,name,asset_type:text(fd.get('category'))||'ギア',quantity:Number(fd.get('quantity')||1),storage:text(fd.get('storage')),memo:text(fd.get('memo')),status:current?.status||'active',payload:{...(current?.payload||{}),category:text(fd.get('category'))||'ギア',quantity:Number(fd.get('quantity')||1),storage:text(fd.get('storage')),memo:text(fd.get('memo'))},source:current?.source||'shell-route-unification-v22'});invalidate();toast(id?'持ち物を更新しました':'持ち物を登録しました');router.navigate('assets',{}, {replace:true});}
  async function deleteAsset(value){const id=value.routePayload?.selected?.id;if(!id)return;if(globalThis.confirm&&!globalThis.confirm('この持ち物を削除しますか？'))return;await repos().assets.softDelete(id);invalidate();toast('持ち物を削除しました');router.navigate('assets',{}, {replace:true});}

  function bind(main,value){
    main.querySelectorAll('[data-ob22-back]').forEach(button=>button.addEventListener('click',()=>{
      const name=value.route.name==='preparation-detail'?'preparation':value.route.name==='places'?'search':value.route.name==='assets'?'vault':value.route.name==='plan-editor'&&value.routePayload?.activity?'activity':'home';
      const values=currentActivityId(value.route)?{activityId:currentActivityId(value.route)}:{};backOr(name,values);
    }));
    main.querySelector('[data-ob22-plan-form]')?.addEventListener('submit',event=>{event.preventDefault();event.currentTarget.querySelector('[type="submit"]').disabled=true;savePlan(event.currentTarget,value).catch(error=>{console.error(error);toast('予定を保存できませんでした');event.currentTarget.querySelector('[type="submit"]').disabled=false;});});
    main.querySelector('[data-ob22-plan-delete]')?.addEventListener('click',()=>deletePlan(value).catch(()=>toast('予定を削除できませんでした')));
    main.querySelectorAll('[data-ob22-prep-toggle]').forEach(button=>button.addEventListener('click',()=>togglePrep(value,button.dataset.ob22PrepToggle).catch(()=>toast('更新できませんでした'))));
    main.querySelector('[data-ob22-prep-add]')?.addEventListener('submit',event=>{event.preventDefault();addPrep(event.currentTarget,value).catch(()=>toast('追加できませんでした'));});
    main.querySelectorAll('[data-ob22-start-plan]').forEach(button=>button.addEventListener('click',()=>{const item=safeArray(value.routePayload?.rows).find(row=>String(row.id)===String(button.dataset.ob22StartPlan));openExecution(item,'start');}));
    main.querySelector('[data-ob22-quick-start]')?.addEventListener('submit',event=>{event.preventDefault();quickStart(event.currentTarget).catch(()=>toast('活動を作成できませんでした'));});
    main.querySelector('[data-ob22-memo-form]')?.addEventListener('submit',event=>{event.preventDefault();saveMemo(event.currentTarget,value).catch(()=>toast('保存できませんでした'));});
    const search=main.querySelector('[data-ob22-place-search]');const filterPlaces=()=>{const q=text(search?.value).toLowerCase();let count=0;main.querySelectorAll('[data-ob22-place-row]').forEach(row=>{const visible=!q||String(row.dataset.ob22PlaceText||'').includes(q);row.hidden=!visible;if(visible)count++;});const node=main.querySelector('[data-ob22-place-count]');if(node)node.textContent=`${count}件`;};
    search?.addEventListener('input',filterPlaces);main.querySelector('[data-ob22-place-clear]')?.addEventListener('click',()=>{if(search){search.value='';filterPlaces();search.focus();}});
    main.querySelectorAll('[data-ob22-place-plan]').forEach(button=>button.addEventListener('click',()=>router.navigate('plan-editor',{place:button.dataset.ob22PlacePlan||''})));
    main.querySelector('[data-ob22-place-add]')?.addEventListener('submit',event=>{event.preventDefault();addPlace(event.currentTarget).catch(()=>toast('場所を登録できませんでした'));});
    main.querySelector('[data-ob22-asset-add]')?.addEventListener('click',()=>router.navigate('assets',{mode:'add'}));
    main.querySelectorAll('[data-ob22-asset-edit]').forEach(button=>button.addEventListener('click',()=>router.navigate('assets',{assetId:button.dataset.ob22AssetEdit}))); 
    main.querySelector('[data-ob22-assets-list]')?.addEventListener('click',()=>router.navigate('assets',{}, {replace:true}));
    main.querySelector('[data-ob22-asset-form]')?.addEventListener('submit',event=>{event.preventDefault();saveAsset(event.currentTarget).catch(()=>toast('持ち物を保存できませんでした'));});
    main.querySelector('[data-ob22-asset-delete]')?.addEventListener('click',()=>deleteAsset(value).catch(()=>toast('削除できませんでした')));
  }

  const renderer=Object.freeze({
    ...rendererBase,
    __routeUnificationV22:true,
    async mount(root,options={}){
      const value=await rendererBase.mount(root,options);
      if(!ROUTES.has(value?.route?.name))return value;
      const shell=root?.querySelector?.('.ob3-shell');const main=shell?.querySelector?.('.ob3-main');if(!main)return value;
      main.className='ob3-main ob3-main-ob22';main.innerHTML=pageMarkup(value);bind(main,value);rendererBase.updateNav?.(root,value);globalThis.OUTBASE_THEME_V166?.sync?.('route-unification-v22');return value;
    },
    updateNav(root,value){rendererBase.updateNav?.(root,value);}
  });

  function mapLegacyUrl(url){
    const tab=url.searchParams.get('tab')||'';const sheet=url.searchParams.get('sheet')||url.searchParams.get('planSheet')||'';const current=router.current();const activityId=url.searchParams.get('activityId')||url.searchParams.get('returnActivityId')||currentActivityId(current);const planId=url.searchParams.get('planId')||current.planId||'';
    if(tab==='plan'&&sheet==='add')return {name:'plan-editor',values:{}};
    if(tab==='record'&&sheet==='start')return {name:'start',values:{activityId,planId}};
    if(tab==='record'&&sheet==='memo')return {name:'memo',values:{activityId,planId,target:localStorage.getItem('outbase_record_target')==='次回改善'?'improvement':'memo'}};
    if(tab==='prep'&&(url.searchParams.has('outbaseAdd')||url.searchParams.has('outbaseVault')))return {name:'assets',values:{assetId:url.searchParams.get('gearId')||'',mode:url.searchParams.has('outbaseAdd')?'add':''}};
    if(tab==='prep')return {name:'preparation-detail',values:{activityId,planId}};
    if(tab==='search')return {name:'places',values:{}};
    if(tab==='memory')return {name:'vault',values:{}};
    if(tab==='plan')return activityId?{name:'plan-editor',values:{activityId,planId}}:{name:'home',values:{}};
    if(tab==='record'){
      const state=localStorage.getItem('outbase_record_session_state')||'idle';
      if(['active','paused'].includes(state))return null;
      return {name:'record',values:{activityId,planId}};
    }
    return null;
  }

  function routeForControl(control){
    const action=control?.dataset?.ob3Action||control?.dataset?.ob12Action||'';
    if(action==='plan-add')return {name:'plan-editor',values:{}};
    if(action==='start')return {name:'start',values:{activityId:currentActivityId(router.current())}};
    if(action==='memo')return {name:'memo',values:{activityId:currentActivityId(router.current())}};
    if(action==='gear-add')return {name:'assets',values:{mode:'add'}};
    const quick=control?.dataset?.ob36Quick||'';
    if(quick==='prep')return {name:'preparation',values:{activityId:currentActivityId(router.current())}};
    if(quick==='walk-kota')return {name:'start',values:{title:'コタ通常散歩',activityType:'walk'}};
    if(quick==='memo')return {name:'memo',values:{activityId:currentActivityId(router.current())}};
    if(quick==='improvement-memo')return {name:'memo',values:{activityId:currentActivityId(router.current()),target:'improvement'}};
    if(quick==='plan-add')return {name:'plan-editor',values:{}};
    return null;
  }

  function intercept(event){
    if(event.defaultPrevented||event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    if(!router.shellRequested?.()&&!document.body.classList.contains('outbaseShellPreview'))return;
    const control=event.target.closest?.('[data-ob3-action],[data-ob12-action],[data-ob36-quick]');
    const mappedControl=routeForControl(control);
    if(mappedControl){event.preventDefault();event.stopImmediatePropagation();document.getElementById('outbaseShellModal')?.replaceChildren();router.navigate(mappedControl.name,mappedControl.values,{transition:false,skipTransition:true});return;}
    const anchor=event.target.closest?.('a[href]');if(!anchor||anchor.target==='_blank'||anchor.hasAttribute('download'))return;
    let url;try{url=new URL(anchor.href,location.href);}catch(_error){return;}if(url.origin!==location.origin||!url.searchParams.has('tab'))return;
    const mapped=mapLegacyUrl(url);if(!mapped)return;event.preventDefault();event.stopImmediatePropagation();router.navigate(mapped.name,mapped.values,{transition:false,skipTransition:true});
  }

  addEventListener('click',intercept,true);

  globalThis.OUTBASE_SHELL_MODEL_V166=model;globalThis.OUTBASE_SHELL_MODEL_V165=model;globalThis.OUTBASE_SHELL_MODEL_V164=model;
  globalThis.OUTBASE_SHELL_RENDERER_V166=renderer;globalThis.OUTBASE_SHELL_RENDERER_V165=renderer;globalThis.OUTBASE_SHELL_RENDERER_V164=renderer;
  globalThis.OUTBASE_ROUTE_UNIFICATION_V22=Object.freeze({version:'v22.0',routes:Object.freeze([...ROUTES]),mapLegacyUrl,routeForControl});
})();
