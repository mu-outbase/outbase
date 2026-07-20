(() => {
  'use strict';

  const base=
    globalThis.OUTBASE_SHELL_RENDERER_V166||
    globalThis.OUTBASE_SHELL_RENDERER_V165||
    globalThis.OUTBASE_SHELL_RENDERER_V164;

  if(!base)throw new Error('OUTBASE preparation renderer is not ready');
  if(base.__preparationV17)return;

  const esc=value=>String(value??'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');

  const icons={
    back:'<svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg>',
    check:'<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>',
    play:'<svg viewBox="0 0 24 24"><path d="m8 5 11 7-11 7z"/></svg>',
    arrow:'<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>',
    prep:'<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8.5 10h7M8.5 14h7M8.5 18h4"/></svg>'
  };

  const categoryIcon=Object.freeze({
    weather:'☀',route:'↗',gear:'▦',meal:'⌁',shopping:'✓',pet:'●',
    parking:'P',ticket:'券',note:'…'
  });
  const cache=new Map();
  const baselineJobs=new Map();
  const CACHE_TTL_MS=30000;
  const DETAIL_ORIGIN_KEY='outbase_preparation_origin_v1';

  const date=value=>{
    const d=new Date(value||'');
    return Number.isNaN(d.getTime())?null:d;
  };
  const short=value=>{
    const d=date(value);
    return d?`${d.getMonth()+1}/${d.getDate()}（${'日月火水木金土'[d.getDay()]}）`:'日程未設定';
  };
  const range=item=>{
    if(!item?.startAt)return '日程未設定';
    const start=short(item.startAt);
    const end=short(item.endAt||item.startAt);
    return start===end?start:`${start}〜${end}`;
  };
  const contextApi=()=>globalThis.OUTBASE_ACTIVITY_CONTEXT_V18||globalThis.OUTBASE_ACTIVITY_CONTEXT;
  const planId=item=>contextApi()?.planIdFrom?.(item)||item?.legacyPlanId||item?.metadata?.legacy_plan?.id||null;
  const activityContext=(item,overrides={})=>contextApi()?.fromActivity?.(item,overrides)||{
    activityId:item?.id||'',planId:planId(item)||'',activityType:item?.type||'',activityTitle:item?.title||'',...overrides
  };

  function legacyUrl(name,item,params={}){
    const context=activityContext(item,params);
    return contextApi()?.legacyUrl?.(name,context,params)||globalThis.OUTBASE_ROUTER.legacyUrl(name,{...context,...params});
  }

  function routeUrl(name,item,params={}){
    const context=activityContext(item,params);
    return contextApi()?.shellUrl?.(name,context,params)||globalThis.OUTBASE_ROUTER.shellUrl(name,{...context,...params});
  }

  function activityPlace(activity){
    const meta=activity?.metadata||{};
    const plan=meta.legacy_plan||{};
    const core=meta.legacy_core_activity||{};
    return String(activity?.place||activity?.placeName||plan.location||plan.placeName||core.location||meta.location||'').trim()||'場所未設定';
  }

  function sections(items,domain){
    const output=[];
    for(const item of items||[]){
      const key=item.category||'note';
      let group=output.find(section=>section.key===key);
      if(!group){
        group={key,label:domain.CATEGORY_LABELS[key]||item.title||'準備',items:[]};
        output.push(group);
      }
      group.items.push(item);
    }
    return output;
  }

  function cached(activityId){
    const value=cache.get(activityId);
    if(!value||Date.now()-value.createdAt>=CACHE_TTL_MS)return null;
    return value.result;
  }

  function resultFromActivity(item){
    if(!item?.id)return null;
    const domain=globalThis.OUTBASE_PREPARATION_DOMAIN_V162;
    if(!domain)return null;
    const preparation=item.preparation||{};
    const provided=Array.isArray(preparation.items)?preparation.items:[];
    const effective=provided.length?provided:domain.baselineFor(item);
    const completed=effective.filter(row=>row.status==='completed'||row.completedAt).length;
    const summary=Object.freeze({
      activity:item,
      items:Object.freeze([...effective]),
      sections:Object.freeze(sections(effective,domain).map(section=>Object.freeze({
        ...section,items:Object.freeze([...section.items])
      }))),
      total:Number(preparation.total??effective.length),
      completed:Number(preparation.completed??completed),
      pending:Number(preparation.pending??Math.max(0,effective.length-completed)),
      progress:Number(preparation.progress??(effective.length?Math.round(completed/effective.length*100):0)),
      persisted:Boolean(preparation.persisted||provided.some(row=>row?.id)),
      generatedAt:new Date().toISOString(),
      primed:true
    });
    return Object.freeze({status:'ready',summary,item});
  }

  function prime(item){
    const result=resultFromActivity(item);
    if(!result)return null;
    cache.set(String(item.id),{createdAt:Date.now(),result});
    return result;
  }

  async function loadFast(activityId,{force=false}={}){
    if(!activityId)return {status:'missing'};
    if(!force){
      const value=cached(activityId);
      if(value)return value;
    }
    try{
      const repos=globalThis.OUTBASE_REPOSITORIES_V160;
      const utils=globalThis.OUTBASE_DOMAIN_UTILS_V162;
      const domain=globalThis.OUTBASE_PREPARATION_DOMAIN_V162;
      if(!repos||!utils||!domain)throw new Error('preparation_dependencies_not_ready');

      const [rawActivity,calendarRows,currentItems]=await Promise.all([
        repos.activities.get(activityId),
        repos.calendarEntries.byIndex('activity_id',activityId),
        domain.items(activityId)
      ]);
      if(!rawActivity||rawActivity.deleted_at)return {status:'not_found'};

      const activity=utils.publicActivity(rawActivity);
      const calendar=(calendarRows||[])
        .filter(row=>!row.deleted_at)
        .sort((a,b)=>Number(new Date(a.start_at||0))-Number(new Date(b.start_at||0)));
      const first=calendar[0]||null;
      const item=Object.freeze({
        ...activity,
        startAt:activity.startAt||utils.iso(first?.start_at),
        endAt:activity.endAt||utils.iso(first?.end_at||first?.start_at),
        place:activityPlace(activity)
      });
      const effective=currentItems.length?currentItems:domain.baselineFor(activity);
      const completed=effective.filter(row=>row.status==='completed'||row.completedAt).length;
      const summary=Object.freeze({
        activity:item,
        items:Object.freeze([...effective]),
        sections:Object.freeze(sections(effective,domain).map(section=>Object.freeze({
          ...section,items:Object.freeze([...section.items])
        }))),
        total:effective.length,
        completed,
        pending:Math.max(0,effective.length-completed),
        progress:effective.length?Math.round(completed/effective.length*100):0,
        persisted:currentItems.length>0,
        generatedAt:new Date().toISOString()
      });
      const result=Object.freeze({status:'ready',summary,item});
      cache.set(activityId,{createdAt:Date.now(),result});
      return result;
    }catch(error){
      return {status:'error',error};
    }
  }

  function activateContext(item,{record=false,source='preparation'}={}){
    if(!item?.id)return null;
    const api=contextApi();
    if(api?.activate)return api.activate(item,{source,record});
    try{
      localStorage.setItem('outbase_core_activity_id',String(item.id));
      localStorage.setItem('outbase_primary_activity_id_v2',String(item.id));
      const legacyPlanId=planId(item);
      if(legacyPlanId)localStorage.setItem('outbase_active_plan_id',String(legacyPlanId));
    }catch(_error){}
    return {context:activityContext(item),persisted:Promise.resolve(false)};
  }


  function warmDetail(item){
    if(!item?.id)return;
    const activityRoute=globalThis.OUTBASE_ACTIVITY_ROUTE_V16;
    if(activityRoute?.cached?.(item.id))return;
    const modelApi=globalThis.OUTBASE_SHELL_MODEL_V166||globalThis.OUTBASE_SHELL_MODEL_V165||globalThis.OUTBASE_SHELL_MODEL_V164;
    if(!modelApi?.preload)return;
    Promise.resolve(modelApi.preload('activity',{activityId:item.id}))
      .then(payload=>{if(payload?.detail)activityRoute?.prime?.(payload);})
      .catch(()=>{});
  }

  function backToDetail(item){
    if(!item?.id)return;
    activateContext(item,{source:'preparation-to-detail'});
    warmDetail(item);
    const context=activityContext(item,{returnShell:'activity',returnActivityId:item.id});
    const values=contextApi()?.params?.(context)||{activityId:item.id,planId:planId(item)};
    try{
      const origin=JSON.parse(sessionStorage.getItem(DETAIL_ORIGIN_KEY)||'null');
      if(origin&&String(origin.activityId||'')===String(item.id))sessionStorage.removeItem(DETAIL_ORIGIN_KEY);
    }catch(_error){}
    globalThis.OUTBASE_ROUTER.navigate('activity',values,{transition:false,skipTransition:true});
  }

  function prepareLegacyAnchor(item,control,{record=false,source='preparation-to-legacy'}={}){
    if(!item?.id||!control?.href)return false;
    activateContext(item,{record,source});
    control.setAttribute?.('aria-busy','true');
    control.classList?.add?.('is-launching');
    return true;
  }

  function itemMarkup(item){
    const done=item.status==='completed'||Boolean(item.completedAt);
    const enabled=Boolean(item.id);
    return `<button type="button" class="ob17-prep-item ${done?'done':''}" data-ob17-prep-toggle="${esc(item.id||'')}" ${enabled?'':'disabled'}>
      <span class="ob17-check">${done?icons.check:''}</span>
      <span class="ob17-prep-copy"><b>${esc(item.title||'準備')}</b><small>${done?'完了':enabled?'未完了':'準備中'}</small></span>
    </button>`;
  }

  function sectionsMarkup(summary){
    const rows=summary?.sections||[];
    if(!rows.length)return '<p class="ob17-empty">準備項目はまだありません。</p>';
    return rows.map(section=>`
      <section class="ob17-prep-section">
        <header><span>${esc(categoryIcon[section.key]||'•')}</span><h2>${esc(section.label||'準備')}</h2></header>
        <div>${(section.items||[]).map(itemMarkup).join('')}</div>
      </section>
    `).join('');
  }

  function markup(result){
    if(result.status!=='ready'){
      const message=result.status==='missing'?'対象の予定が選ばれていません。':result.status==='error'?'準備を読み込めませんでした。':'予定が見つかりません。';
      return `<section class="ob17-preparation ob20-page"><div class="ob17-error ob36-card"><h1>準備</h1><p>${esc(message)}</p><button type="button" data-ob17-home>ホームへ戻る</button></div></section>`;
    }

    const {summary,item}=result;
    const total=Number(summary.total||0);
    const completed=Number(summary.completed||0);
    const pending=Number(summary.pending||Math.max(0,total-completed));
    const progress=Math.max(0,Math.min(100,Number(summary.progress||0)));
    const type=contextApi()?.typeLabel?.(item.type||item.activityType||'')||item.typeLabel||'予定';
    const advanced=legacyUrl('activity',item,{returnShell:'preparation',returnActivityId:item.id});
    const start=routeUrl('record',item,{returnShell:'preparation',returnActivityId:item.id});

    return `<section class="ob17-preparation ob20-page" data-ob17-activity-id="${esc(item.id)}">
      <div class="ob17-route-head ob20-route-head">
        <button type="button" class="ob17-back" data-ob17-detail>${icons.back}<span>予定詳細へ</span></button>
        <span class="ob17-route-label">準備</span>
      </div>

      <section class="ob17-prep-hero ob20-plan-card ob36-card">
        <div class="ob17-prep-heading">
          <span class="ob17-prep-heading-icon">${icons.prep}</span>
          <div>
            <small>準備</small>
            <h1>${esc(item.title||'予定')}</h1>
            <p>${esc(type)}・${esc(range(item))}</p>
            <p>${esc(activityPlace(item))}</p>
          </div>
          <em>${pending?`${pending}件 未完了`:'準備完了'}</em>
        </div>
        <div class="ob17-progress-row">
          <strong>${completed}<i>/ ${total}</i></strong>
          <div><span style="width:${progress}%"></span></div>
          <b>${progress}%</b>
        </div>
      </section>

      <div class="ob17-prep-sections">${sectionsMarkup(summary)}</div>

      <section class="ob17-flow-actions ob20-flow-card ob36-card">
        <a class="primary" href="${esc(start)}" data-ob17-start>
          <span>${icons.play}</span>
          <span><b>活動を始める</b><small>現在地・写真・音声・メモ</small></span>
          ${icons.arrow}
        </a>
        <a class="secondary" href="${esc(advanced)}" data-ob17-advanced>
          <span>${icons.prep}</span>
          <span><b>詳細な準備を開く</b><small>持ち物・料理・買い物など</small></span>
          ${icons.arrow}
        </a>
      </section>
    </section>`;
  }

  function renderResult(main,result,{preserveScroll=false}={}){
    if(!main||!result)return false;
    const y=preserveScroll?window.scrollY:0;
    if(result.status==='ready'){activateContext(result.item,{source:'preparation-render'});warmDetail(result.item);globalThis.OUTBASE_EXECUTION_ROUTE_V19?.prime?.(result.item);}
    main.innerHTML=markup(result);
    bind(main,result);
    if(preserveScroll)requestAnimationFrame(()=>window.scrollTo(0,y));
    return true;
  }

  function isCurrentPreparation(main,activityId){
    const route=globalThis.OUTBASE_ROUTER?.current?.();
    return main?.isConnected&&route?.name==='preparation'&&String(route.activityId||'')===String(activityId||'');
  }

  function refreshAfterPaint(main,activityId){
    requestAnimationFrame(()=>{
      Promise.resolve(loadFast(activityId,{force:true}))
        .then(result=>{
          if(!isCurrentPreparation(main,activityId))return;
          renderResult(main,result);
          if(result.status==='ready'&&!result.summary.persisted)setTimeout(()=>persistBaseline(main,activityId),0);
        })
        .catch(()=>{});
    });
  }

  function persistBaseline(main,activityId){
    if(!activityId||baselineJobs.has(activityId))return;
    const domain=globalThis.OUTBASE_PREPARATION_DOMAIN_V162;
    if(!domain?.ensureBaseline)return;
    const job=Promise.resolve()
      .then(()=>domain.ensureBaseline(activityId))
      .then(async result=>{
        cache.delete(activityId);
        if(result?.status!=='ready'||!main?.isConnected)return;
        const current=main.querySelector('.ob17-preparation')?.dataset?.ob17ActivityId||'';
        if(current!==String(activityId))return;
        const refreshed=await loadFast(activityId,{force:true});
        main.innerHTML=markup(refreshed);
        bind(main,refreshed);
      })
      .catch(()=>{})
      .finally(()=>baselineJobs.delete(activityId));
    baselineJobs.set(activityId,job);
  }

  async function rerender(main,activityId,{preserveScroll=true,showLoading=true}={}){
    if(showLoading)main.innerHTML='<section class="ob17-preparation"><div class="ob17-loading">準備を読み込んでいます。</div></section>';
    const result=await loadFast(activityId);
    renderResult(main,result,{preserveScroll});
    if(result.status==='ready'&&!result.summary.persisted)setTimeout(()=>persistBaseline(main,activityId),0);
    return result;
  }

  async function toggleItem(main,result,itemId){
    if(result.status!=='ready'||!itemId)return;
    const repo=globalThis.OUTBASE_REPOSITORIES_V160?.preparationItems;
    const row=await repo?.get?.(itemId);
    if(!row)return;
    const done=row.status==='completed'||Boolean(row.completed_at);
    await repo.save({
      ...row,
      status:done?'pending':'completed',
      completed_at:done?null:new Date().toISOString()
    });
    cache.delete(result.item.id);
    globalThis.OUTBASE_SHELL_MODEL_V166?.invalidate?.(`activity:${result.item.id}`);
    await rerender(main,result.item.id);
  }

  function bind(main,result){
    main.querySelector('[data-ob17-home]')?.addEventListener('click',()=>{
      globalThis.OUTBASE_ROUTER.navigate('home',{}, {transition:true});
    });

    if(result.status!=='ready')return;
    const item=result.item;

    main.querySelector('[data-ob17-detail]')?.addEventListener('click',()=>backToDetail(item));

    main.querySelectorAll('[data-ob17-prep-toggle]').forEach(button=>button.addEventListener('click',async()=>{
      button.disabled=true;
      try{await toggleItem(main,result,button.dataset.ob17PrepToggle||'');}
      catch(_error){button.disabled=false;}
    }));

    main.querySelector('[data-ob17-start]')?.addEventListener('click',event=>{
      event.preventDefault();
      activateContext(item,{record:false,source:'preparation-to-execution'});
      globalThis.OUTBASE_EXECUTION_ROUTE_V19?.prime?.(item);
      const context=activityContext(item,{returnShell:'preparation',returnActivityId:item.id});
      globalThis.OUTBASE_ROUTER.navigate('record',contextApi()?.params?.(context)||{
        activityId:item.id,planId:planId(item),returnShell:'preparation',returnActivityId:item.id
      },{transition:false,skipTransition:true});
    });

    main.querySelector('[data-ob17-advanced]')?.addEventListener('click',event=>{
      prepareLegacyAnchor(item,event.currentTarget,{record:false,source:'preparation-to-advanced'});
    });
  }

  const renderer=Object.freeze({
    ...base,
    __preparationV17:true,
    async mount(root,options={}){
      const requested=globalThis.OUTBASE_ROUTER?.current?.();
      const primed=requested?.name==='preparation'?cached(requested.activityId):null;
      const beforeMain=root?.querySelector?.('.ob3-shell')?.querySelector?.('.ob3-main');
      if(primed&&beforeMain){
        beforeMain.classList.add('ob3-main-preparation');
        beforeMain.classList.remove('ob3-main-calendar','ob3-main-activity');
        renderResult(beforeMain,primed);
      }

      const value=await base.mount(root,options);
      const main=root?.querySelector?.('.ob3-shell')?.querySelector?.('.ob3-main');
      const active=value?.route?.name==='preparation';
      if(main)main.classList.toggle('ob3-main-preparation',active);
      if(active&&main){
        main.classList.remove('ob3-main-calendar','ob3-main-activity');
        const ready=cached(value.route.activityId)||primed;
        if(ready){
          renderResult(main,ready);
          refreshAfterPaint(main,value.route.activityId);
        }else{
          main.innerHTML='<section class="ob17-preparation"><div class="ob17-loading">準備を読み込んでいます。</div></section>';
          void rerender(main,value.route.activityId,{preserveScroll:false,showLoading:false});
        }
      }
      return value;
    },
    updateNav(root,value){base.updateNav?.(root,value);}
  });

  globalThis.OUTBASE_PREPARATION_ROUTE_V17=Object.freeze({
    prime,cached,loadFast,invalidate(activityId){cache.delete(String(activityId||''));}
  });
  globalThis.OUTBASE_SHELL_RENDERER_V166=renderer;
  globalThis.OUTBASE_SHELL_RENDERER_V165=renderer;
  globalThis.OUTBASE_SHELL_RENDERER_V164=renderer;
})();
