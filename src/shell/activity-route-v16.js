(() => {
  'use strict';

  const base = globalThis.OUTBASE_SHELL_RENDERER_V166 || globalThis.OUTBASE_SHELL_RENDERER_V165 || globalThis.OUTBASE_SHELL_RENDERER_V164;
  if (!base) throw new Error('OUTBASE activity renderer is not ready');
  if (base.__activityV16) return;

  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  const icons = {
    calendar:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
    pin:'<svg viewBox="0 0 24 24"><path d="M12 21s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2"/></svg>',
    prep:'<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8.5 10h7M8.5 14h7M8.5 18h4"/></svg>',
    record:'<svg viewBox="0 0 24 24"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/></svg>',
    photo:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m5 18 5-5 3 3 2-2 4 4"/></svg>',
    gear:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>',
    cook:'<svg viewBox="0 0 24 24"><path d="M5 10h14l-1 8H6l-1-8Z"/><path d="M8 10V8a4 4 0 0 1 8 0v2M3 12h2M19 12h2"/></svg>',
    improve:'<svg viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0-3.5 10.9V17h7v-3.1A6 6 0 0 0 12 3Z"/><path d="M9 20h6M9.5 11.5l1.5 1.5 3.5-4"/></svg>',
    settings:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 15a2 2 0 0 0 .4 2.2l-2.2 2.2A2 2 0 0 0 15 19l-1 2h-4l-1-2a2 2 0 0 0-2.2.4l-2.2-2.2A2 2 0 0 0 5 15l-2-1v-4l2-1a2 2 0 0 0-.4-2.2l2.2-2.2A2 2 0 0 0 9 5l1-2h4l1 2a2 2 0 0 0 2.2-.4l2.2 2.2A2 2 0 0 0 19 9l2 1v4Z"/></svg>',
    arrow:'<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>'
  };

  const date = value => {
    const d = new Date(value || '');
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const short = value => {
    const d = date(value);
    return d ? `${d.getMonth()+1}/${d.getDate()}（${'日月火水木金土'[d.getDay()]}）` : '日付未設定';
  };
  const time = value => {
    const d = date(value);
    return d ? `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` : '';
  };
  const range = item => {
    if (!item?.startAt) return '日程未設定';
    const same = String(item.startAt).slice(0,10) === String(item.endAt || item.startAt).slice(0,10);
    return same ? `${short(item.startAt)} ${time(item.startAt)}〜${time(item.endAt)}` : `${short(item.startAt)} ${time(item.startAt)}〜${short(item.endAt)} ${time(item.endAt)}`;
  };
  const recordLabel = row => {
    const p = row?.payload || {};
    return String(p.title || p.memo || p.text || p.note || p.transcript || p.caption || row?.type || '記録').trim().slice(0,90) || '記録';
  };

  const TEMPORARY_DISPLAY_PLACE = Object.freeze({
    title:'きゃんぷ',
    place:'ふもとっぱら（仮）'
  });

  const PREP_CATEGORY_LABEL = Object.freeze({
    weather:'天気',
    route:'ルート',
    gear:'持ち物',
    meal:'料理',
    cooking:'料理',
    shopping:'買い物',
    pet:'ペット',
    parking:'駐車場',
    ticket:'チケット',
    note:'メモ',
    memo:'メモ'
  });

  function displayPlace(item){
    const stored=String(item?.place||'').trim();
    if(stored)return stored;
    if(String(item?.title||'').trim()===TEMPORARY_DISPLAY_PLACE.title){
      return TEMPORARY_DISPLAY_PLACE.place;
    }
    return '場所未設定';
  }

  function prepMeta(item){
    if(item?.dueAt)return short(item.dueAt);
    const label=PREP_CATEGORY_LABEL[String(item?.category||'').toLowerCase()]||'';
    const title=String(item?.title||'').trim();
    return label&&label!==title?label:'未完了';
  }

  const contextApi=()=>globalThis.OUTBASE_ACTIVITY_CONTEXT_V18||globalThis.OUTBASE_ACTIVITY_CONTEXT;
  const legacyPlanId=item=>contextApi()?.planIdFrom?.(item)||item?.legacyPlanId||item?.metadata?.legacy_plan?.id||null;
  const activityContext=(item,overrides={})=>contextApi()?.fromActivity?.(item,overrides)||{
    activityId:item?.id||'',planId:legacyPlanId(item)||'',activityType:item?.type||'',activityTitle:item?.title||'',...overrides
  };

  const routeUrl=(name,item,params={})=>{
    const context=activityContext(item,params);
    try{return contextApi()?.shellUrl?.(name,context,params)||globalThis.OUTBASE_ROUTER.shellUrl(name,{...context,...params});}
    catch(_error){return `./?shell=1&view=${encodeURIComponent(name)}`;}
  };

  const legacyUrl=(name,item,params={})=>{
    const context=activityContext(item,params);
    try{return contextApi()?.legacyUrl?.(name,context,params)||globalThis.OUTBASE_ROUTER.legacyUrl(name,{...context,...params});}
    catch(_error){return `./?tab=${encodeURIComponent(name)}`;}
  };

  const preparationHref=item=>routeUrl('preparation',item);
  const startHref=item=>legacyUrl('record',item,{
    sheet:'start',returnShell:'activity',returnActivityId:item?.id
  });
  const recordHref=item=>legacyUrl('record',item,{
    returnShell:'activity',returnActivityId:item?.id
  });

  function activateLocalContext(item,{record=false,source='activity-detail'}={}){
    if(!item?.id)return false;
    const api=contextApi();
    if(api?.seedLocal){api.seedLocal(activityContext(item),{source,record});return true;}
    try{
      localStorage.setItem('outbase_core_activity_id',String(item.id));
      localStorage.setItem('outbase_primary_activity_id_v2',String(item.id));
      const planId=legacyPlanId(item);
      if(planId)localStorage.setItem('outbase_active_plan_id',String(planId));
      return true;
    }catch(_error){return false;}
  }

  async function persistContext(item){
    if(!item?.id)return false;
    const api=contextApi();
    if(api?.persist)return api.persist(activityContext(item));
    try{
      await globalThis.OUTBASE_REPOSITORIES_V160?.setCurrentActivity?.(item.id,{mode:'legacy-shadow',current_plan_id:legacyPlanId(item)||null});
      return true;
    }catch(_error){return false;}
  }

  function activateContext(item,options={}){
    const api=contextApi();
    if(api?.activate)return api.activate(item,{source:options.source||'activity-detail',record:options.record,persist:options.persist});
    activateLocalContext(item,options);
    return {context:activityContext(item),persisted:persistContext(item)};
  }

  function state(item){
    if (['active','paused'].includes(item.state)) return {phase:'実行中', title:'今は、残す。', label:'記録を開く', href:recordHref(item), context:true, icon:icons.record, sub:'写真・音声・メモをその場で残します。'};
    if (['organizing','completed','archived'].includes(item.state)) return {phase:'思い出', title:'残したものを振り返る。', label:'記録と思い出を見る', href:'#ob16-memory', context:false, icon:icons.photo, sub:'記録・写真・改善点をまとめて確認します。'};
    return {phase:item.stateLabel || '準備中', title:'次にやることを、迷わない。', label:'準備を進める', href:preparationHref(item), context:true, shell:'preparation', icon:icons.prep, sub:'持ち物・天気・料理・買い物を確認します。'};
  }

  function people(item){
    const rows = item?.participants?.rows || [];
    if (!rows.length) return '<span class="ob16-person">参加者未設定</span>';
    return rows.slice(0,8).map(row => `<span class="ob16-person">${row.type==='pet'||row.kind==='pet'?'🐾 ':''}${esc(row.name||'名前未設定')}</span>`).join('');
  }

  function hero(item){
    const visual = base.activityVisual ? base.activityVisual(item,{className:'ob16-cover-media',label:false}) : '';
    const s = state(item);
    return `<section class="ob16-hero">
      <div class="ob16-hero-visual">${visual}</div>
      <div class="ob16-hero-copy">
        <div class="ob16-hero-top"><span>${esc(item.typeLabel||'活動')}</span><span>${esc(s.phase)}</span><a href="${esc(item.legacyDetailUrl)}" data-ob17-context="legacy" aria-label="詳細設定">${icons.settings}</a></div>
        <h1>${esc(item.title||'名称未設定')}</h1>
        <p>${icons.calendar}<span>${esc(range(item))}</span></p>
        <p>${icons.pin}<span>${esc(displayPlace(item))}</span></p>
        <div class="ob16-people">${people(item)}</div>
      </div>
    </section>`;
  }

  function next(item){
    const s = state(item);
    const planned=!['active','paused','organizing','completed','archived'].includes(item.state);
    const primaryAttr=s.context?` data-ob17-context="${s.shell||'legacy'}"`:'';
    const first=planned
      ?`<a href="${esc(startHref(item))}" data-ob17-context="legacy">${icons.photo}<span>活動開始</span></a>`
      :`<a href="${esc(preparationHref(item))}" data-ob17-context="preparation">${icons.prep}<span>準備</span></a>`;
    return `<section class="ob16-next-card"><small>今やること</small><h2>${esc(s.title)}</h2><p>${esc(s.sub)}</p>
      <a class="ob16-primary-action" href="${esc(s.href)}"${primaryAttr}><span>${s.icon}</span><b>${esc(s.label)}</b>${icons.arrow}</a>
      <div class="ob16-secondary-actions">
        ${first}
        <a href="${esc(recordHref(item))}" data-ob17-context="legacy">${icons.record}<span>記録</span></a>
        <a href="${esc(item.calendarUrl)}">${icons.calendar}<span>カレンダー</span></a>
      </div>
    </section>`;
  }

  function prep(item){
    const p = item.preparation || {};
    const total = Number(p.total || 0), completed = Number(p.completed || 0), pending = Number(p.pending || Math.max(0,total-completed));
    const progress = Math.max(0,Math.min(100,Number(p.progress || 0)));
    const items = (p.items || []).filter(x => !(x.status==='completed' || x.completedAt)).slice(0,4);
    return `<section class="ob16-section-card"><div class="ob16-section-head"><div><small>いま使う</small><h2>準備</h2></div><a href="${esc(preparationHref(item))}" data-ob17-context="preparation">開く ›</a></div>
      <div class="ob16-prep-summary"><strong>${completed}<i>/ ${total||'—'}</i></strong><div class="ob16-progress"><i style="width:${progress}%"></i></div><b>${progress}%</b><span>${pending}件 未完了</span></div>
      <div class="ob16-prep-list">${items.length?items.map(x=>`<div><b>${esc(x.title||'準備')}</b><small>${esc(prepMeta(x))}</small></div>`).join(''):'<p>準備項目はまだありません。</p>'}</div>
      <a class="ob16-card-action" href="${esc(preparationHref(item))}" data-ob17-context="preparation"><span>${icons.prep}</span><span><b>準備リストを開く</b><small>持ち物・天気・料理・買い物</small></span>${icons.arrow}</a>
    </section>`;
  }

  function memory(item){
    const records = (item.records || []).slice(0,3);
    return `<section class="ob16-section-card" id="ob16-memory"><div class="ob16-section-head"><div><small>残したもの</small><h2>記録・思い出</h2></div><a href="${esc(recordHref(item))}" data-ob17-context="legacy">記録を開く ›</a></div>
      <div class="ob16-memory-metrics">
        <div>${icons.record}<small>記録</small><b>${Number(item.recordCount||0)}</b></div>
        <div>${icons.photo}<small>写真・動画</small><b>${Number(item.media?.types?.photo||0)+Number(item.media?.types?.video||0)}</b></div>
        <div>${icons.gear}<small>持ち物</small><b>${Number(item.assets?.length||0)}</b></div>
        <div>${icons.cook}<small>献立</small><b>${Number(item.mealCount||0)}</b></div>
      </div>
      <div class="ob16-record-list">${records.length?records.map(r=>`<article><span>${icons.record}</span><div><small>${esc(short(r.occurredAt))}</small><b>${esc(recordLabel(r))}</b></div></article>`).join(''):'<p>記録はまだありません。</p>'}</div>
      <a class="ob16-card-action" href="${esc(recordHref(item))}" data-ob17-context="legacy"><span>${icons.record}</span><span><b>記録を残す・見る</b><small>写真・動画・音声・メモ</small></span>${icons.arrow}</a>
    </section>`;
  }

  function improve(item){
    const rows = (item.organization?.improvements || []).filter(x => x.status!=='completed').slice(0,3);
    if (!rows.length) return '';
    return `<section class="ob16-section-card"><div class="ob16-section-head"><div><small>次回へつなぐ</small><h2>改善</h2></div><span>${Number(item.organization?.openImprovementCount||rows.length)}件</span></div><div class="ob16-improve-list">${rows.map(x=>`<div>${icons.improve}<b>${esc(x.title||x.summary||x.payload?.text||'改善項目')}</b></div>`).join('')}</div></section>`;
  }

  function markup(model){
    const result = model?.detail;
    if (!result || result.status!=='ready' || !result.activity) return '<section class="ob16-not-found"><h1>活動が見つかりません</h1><p>削除されたか、まだ移行されていない可能性があります。</p></section>';
    const item = result.activity;
    return `<section class="ob16-activity">${hero(item)}${next(item)}${prep(item)}${memory(item)}${improve(item)}<button id="outbaseCopyrightFooter" type="button" class="ob-copyright-footer">© 2026 OUTBASE</button></section>`;
  }

  function bind(main,model){
    const item=model?.detail?.activity||null;
    main.querySelector('#outbaseCopyrightFooter')?.addEventListener('click',()=>globalThis.OUTBASE_ABOUT?.open?.());
    main.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',event=>{const target=main.querySelector(a.getAttribute('href'));if(!target)return;event.preventDefault();target.scrollIntoView({behavior:'smooth',block:'start'});}));
    main.querySelectorAll('[data-ob17-context]').forEach(link=>link.addEventListener('click',event=>{
      if(!item)return;
      const mode=link.dataset.ob17Context||'legacy';
      if(mode==='preparation'){
        event.preventDefault();
        activateContext(item,{source:'activity-to-preparation'});
        globalThis.OUTBASE_PREPARATION_ROUTE_V17?.prime?.(item);
        globalThis.OUTBASE_ROUTER.navigate('preparation',contextApi()?.params?.(activityContext(item))||{
          activityId:item.id,planId:legacyPlanId(item)
        },{transition:false,skipTransition:true});
        return;
      }
      const record=String(link.href||'').includes('tab=record');
      activateContext(item,{source:'activity-to-legacy',record});
      link.setAttribute('aria-busy','true');
      link.classList.add('is-launching');
      // Native anchor navigation remains authoritative for FIELD03/legacy routes.
    }));
  }

  const renderer = Object.freeze({
    ...base,
    __activityV16:true,
    async mount(root,options={}){
      const value = await base.mount(root,options);
      const main = root?.querySelector?.('.ob3-shell')?.querySelector?.('.ob3-main');
      if (main) main.classList.toggle('ob3-main-activity', value?.route?.name==='activity');
      if (value?.route?.name==='activity' && main) {
        main.classList.remove('ob3-main-calendar');
        const item=value?.detail?.activity||null;
        if(item)activateContext(item,{source:'activity-render'});
        main.innerHTML = markup(value);
        base.hydrateMedia?.(main);
        bind(main,value);
      }
      return value;
    },
    updateNav(root,value){ base.updateNav?.(root,value); }
  });

  globalThis.OUTBASE_SHELL_RENDERER_V166 = renderer;
  globalThis.OUTBASE_SHELL_RENDERER_V165 = renderer;
  globalThis.OUTBASE_SHELL_RENDERER_V164 = renderer;
})();
