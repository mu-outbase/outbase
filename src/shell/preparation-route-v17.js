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
  const planId=item=>item?.legacyPlanId||item?.metadata?.legacy_plan?.id||null;

  function legacyUrl(name,params={}){
    return globalThis.OUTBASE_ROUTER.legacyUrl(name,params);
  }

  function location(activity){
    const meta=activity?.metadata||{};
    const plan=meta.legacy_plan||{};
    const core=meta.legacy_core_activity||{};
    return String(plan.location||plan.placeName||core.location||meta.location||'').trim();
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
        place:location(activity)
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

  async function activateContext(item){
    if(!item?.id)return false;
    try{
      localStorage.setItem('outbase_core_activity_id',String(item.id));
      localStorage.setItem('outbase_primary_activity_id_v2',String(item.id));
      const legacyPlanId=planId(item);
      if(legacyPlanId)localStorage.setItem('outbase_active_plan_id',String(legacyPlanId));
      await globalThis.OUTBASE_REPOSITORIES_V160?.setCurrentActivity?.(item.id,{
        mode:'legacy-shadow',
        current_plan_id:legacyPlanId||null
      });
      return true;
    }catch(_error){
      return false;
    }
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
      return `<section class="ob17-preparation"><div class="ob17-error"><h1>準備</h1><p>${esc(message)}</p><button type="button" data-ob17-home>ホームへ戻る</button></div></section>`;
    }

    const {summary,item}=result;
    const total=Number(summary.total||0);
    const completed=Number(summary.completed||0);
    const pending=Number(summary.pending||Math.max(0,total-completed));
    const progress=Math.max(0,Math.min(100,Number(summary.progress||0)));
    const legacyPlanId=planId(item);
    const advanced=legacyUrl('activity',{
      activityId:item.id,
      planId:legacyPlanId,
      returnShell:'preparation',
      returnActivityId:item.id
    });
    const start=legacyUrl('record',{
      activityId:item.id,
      planId:legacyPlanId,
      sheet:'start',
      returnShell:'activity',
      returnActivityId:item.id
    });

    return `<section class="ob17-preparation" data-ob17-activity-id="${esc(item.id)}">
      <button type="button" class="ob17-back" data-ob17-detail>${icons.back}<span>予定詳細</span></button>

      <section class="ob17-prep-hero">
        <small>PREPARATION</small>
        <h1>${esc(item.title||'予定')}</h1>
        <p>${esc(range(item))}</p>
        <p>${esc(item.place||'場所未設定')}</p>
        <div class="ob17-progress-row">
          <strong>${completed}<i>/ ${total}</i></strong>
          <div><span style="width:${progress}%"></span></div>
          <b>${progress}%</b>
        </div>
        <em>${pending}件 未完了</em>
      </section>

      <div class="ob17-prep-sections">${sectionsMarkup(summary)}</div>

      <section class="ob17-flow-actions">
        <button type="button" class="primary" data-ob17-start data-href="${esc(start)}">
          <span>${icons.play}</span>
          <span><b>活動を始める</b><small>当日のGPS・写真・音声・メモへ</small></span>
          ${icons.arrow}
        </button>
        <button type="button" class="secondary" data-ob17-advanced data-href="${esc(advanced)}">
          <span>${icons.prep}</span>
          <span><b>詳細な準備を開く</b><small>持ち物台帳・料理・買い物など</small></span>
          ${icons.arrow}
        </button>
      </section>

      <button id="outbaseCopyrightFooter" type="button" class="ob-copyright-footer">© 2026 OUTBASE</button>
    </section>`;
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

  async function rerender(main,activityId,{preserveScroll=true}={}){
    const y=preserveScroll?window.scrollY:0;
    main.innerHTML='<section class="ob17-preparation"><div class="ob17-loading">準備を読み込んでいます。</div></section>';
    const result=await loadFast(activityId);
    main.innerHTML=markup(result);
    bind(main,result);
    if(result.status==='ready'&&!result.summary.persisted)setTimeout(()=>persistBaseline(main,activityId),0);
    if(preserveScroll)requestAnimationFrame(()=>window.scrollTo(0,y));
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
    main.querySelector('#outbaseCopyrightFooter')?.addEventListener('click',()=>globalThis.OUTBASE_ABOUT?.open?.());

    main.querySelector('[data-ob17-home]')?.addEventListener('click',()=>{
      globalThis.OUTBASE_ROUTER.navigate('home',{}, {transition:true});
    });

    if(result.status!=='ready')return;
    const item=result.item;

    main.querySelector('[data-ob17-detail]')?.addEventListener('click',()=>{
      globalThis.OUTBASE_ROUTER.navigate('activity',{activityId:item.id,planId:planId(item)},{transition:true});
    });

    main.querySelectorAll('[data-ob17-prep-toggle]').forEach(button=>button.addEventListener('click',async()=>{
      button.disabled=true;
      try{await toggleItem(main,result,button.dataset.ob17PrepToggle||'');}
      catch(_error){button.disabled=false;}
    }));

    main.querySelector('[data-ob17-start]')?.addEventListener('click',async event=>{
      const button=event.currentTarget;
      button.disabled=true;
      await activateContext(item);
      location.assign(button.dataset.href);
    });

    main.querySelector('[data-ob17-advanced]')?.addEventListener('click',async event=>{
      const button=event.currentTarget;
      button.disabled=true;
      await activateContext(item);
      location.assign(button.dataset.href);
    });
  }

  const renderer=Object.freeze({
    ...base,
    __preparationV17:true,
    async mount(root,options={}){
      const value=await base.mount(root,options);
      const main=root?.querySelector?.('.ob3-shell')?.querySelector?.('.ob3-main');
      const active=value?.route?.name==='preparation';
      if(main)main.classList.toggle('ob3-main-preparation',active);
      if(active&&main){
        main.classList.remove('ob3-main-calendar','ob3-main-activity');
        await rerender(main,value.route.activityId,{preserveScroll:false});
      }
      return value;
    },
    updateNav(root,value){base.updateNav?.(root,value);}
  });

  globalThis.OUTBASE_SHELL_RENDERER_V166=renderer;
  globalThis.OUTBASE_SHELL_RENDERER_V165=renderer;
  globalThis.OUTBASE_SHELL_RENDERER_V164=renderer;
})();
