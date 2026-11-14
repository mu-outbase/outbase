(() => {
  'use strict';

  const base = globalThis.OUTBASE_SHELL_RENDERER_V166 || globalThis.OUTBASE_SHELL_RENDERER_V165 || globalThis.OUTBASE_SHELL_RENDERER_V164;
  if (!base) throw new Error('OUTBASE activity renderer is not ready');
  if (base.__activityV16) return;

  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  const ui=globalThis.OUTBASE_UI_V21;
  if(!ui)throw new Error('OUTBASE UI v21 is not ready');
  const icons=ui.icons;

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
  const DETAIL_ORIGIN_KEY='outbase_preparation_origin_v1';
  const DETAIL_CACHE_TTL_MS=90000;
  const detailCache=new Map();

  function prime(model){
    const item=model?.detail?.activity||null;
    if(!item?.id)return null;
    detailCache.set(String(item.id),{model,createdAt:Date.now()});
    return model;
  }
  function cached(activityId){
    const entry=detailCache.get(String(activityId||''));
    if(!entry||Date.now()-entry.createdAt>=DETAIL_CACHE_TTL_MS){
      if(entry)detailCache.delete(String(activityId||''));
      return null;
    }
    return entry.model;
  }
  function rememberPreparationOrigin(item){
    try{
      sessionStorage.setItem(DETAIL_ORIGIN_KEY,JSON.stringify({
        route:'activity',activityId:String(item?.id||''),planId:String(legacyPlanId(item)||''),savedAt:Date.now()
      }));
    }catch(_error){}
  }
  const legacyPlanId=item=>contextApi()?.planIdFrom?.(item)||item?.legacyPlanId||item?.metadata?.legacy_plan?.id||null;
  const activityContext=(item,overrides={})=>contextApi()?.fromActivity?.(item,overrides)||{
    activityId:item?.id||'',planId:legacyPlanId(item)||'',activityType:item?.type||'',activityTitle:item?.title||'',...overrides
  };

  const routeUrl=(name,item,params={})=>{
    const context=activityContext(item,params);
    try{return contextApi()?.shellUrl?.(name,context,params)||globalThis.OUTBASE_ROUTER.shellUrl(name,{...context,...params});}
    catch(_error){return `./?shell=1&view=${encodeURIComponent(name)}`;}
  };

  const preparationHref=item=>routeUrl('preparation',item,{returnShell:'activity',returnActivityId:item?.id});
  const startHref=item=>routeUrl('record',item,{
    returnShell:'activity',returnActivityId:item?.id
  });
  const recordHref=item=>routeUrl('record',item,{
    returnShell:'activity',returnActivityId:item?.id
  });

  function activateLocalContext(item,{record=false,source='activity-detail'}={}){
    if(!item?.id)return false;
    const api=contextApi();
    if(api?.seedLocal){api.seedLocal(activityContext(item),{source,record});return true;}
    return false;
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
    if (['active','paused'].includes(item.state)) return {phase:'実行中', title:'今は、残す。', label:'記録を開く', href:recordHref(item), context:true, shell:'record', icon:icons.record, sub:'写真・音声・メモをその場で残します。'};
    if (['organizing','completed','archived'].includes(item.state)) return {phase:'思い出', title:'残したものを振り返る。', label:'記録と思い出を見る', href:'#ob16-memory', context:false, icon:icons.photo, sub:'記録・写真・改善点をまとめて確認します。'};
    return {phase:item.stateLabel || '準備中', title:'次にやることを、迷わない。', label:'準備を進める', href:preparationHref(item), context:true, shell:'preparation', icon:icons.prep, sub:'持ち物・天気・料理・買い物を確認します。'};
  }

  function people(item){
    const rows = item?.participants?.rows || [];
    if (!rows.length) return globalThis.OUTBASE_KOTA_WALK.isWalk(item)?'<span class="ob16-person">コタと散歩</span>':'<span class="ob16-person">参加者未設定</span>';
    return rows.slice(0,8).map(row => `<span class="ob16-person">${row.type==='pet'||row.kind==='pet'?'🐾 ':''}${esc(row.name||'名前未設定')}</span>`).join('');
  }

  function hero(item){
    const visual = base.activityVisual ? base.activityVisual(item,{className:'ob16-cover-media',label:false}) : '';
    const s = state(item);
    return `<section class="ob16-hero ob20-plan-card ob36-card">
      <div class="ob20-plan-thumb">${visual}</div>
      <div class="ob20-plan-copy">
        <div class="ob20-plan-top"><span>${esc(item.typeLabel||'活動')}</span><span>${esc(s.phase)}</span><a href="${esc(routeUrl('plan-editor',item,{mode:'edit'}))}" aria-label="予定を編集">${icons.settings}</a></div>
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
      ?`<a href="${esc(startHref(item))}" data-ob17-context="record">${icons.play}<span>活動開始</span></a>`
      :`<a href="${esc(preparationHref(item))}" data-ob17-context="preparation">${icons.prep}<span>準備</span></a>`;
    return `<section class="ob16-next-card ob20-action-card ob36-card"><small>今やること</small><h2>${esc(s.title)}</h2><p>${esc(s.sub)}</p>
      <a class="ob16-primary-action" href="${esc(s.href)}"${primaryAttr}><span>${s.icon}</span><b>${esc(s.label)}</b>${icons.arrow}</a>
      <div class="ob16-secondary-actions">
        ${first}
        <a href="${esc(recordHref(item))}" data-ob17-context="record">${icons.record}<span>記録</span></a>
        <a href="${esc(routeUrl('calendar',item,{month:(item.startAt||'').slice(0,7)}))}">${icons.calendar}<span>カレンダー</span></a>
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
    return `<section class="ob16-section-card" id="ob16-memory"><div class="ob16-section-head"><div><small>残したもの</small><h2>記録・思い出</h2></div><a href="${esc(recordHref(item))}" data-ob17-context="record">記録を開く ›</a></div>
      <div class="ob16-memory-metrics">
        <div>${icons.record}<small>記録</small><b>${Number(item.recordCount||0)}</b></div>
        <div>${icons.photo}<small>写真・動画</small><b>${Number(item.media?.types?.photo||0)+Number(item.media?.types?.video||0)}</b></div>
        <div>${icons.gear}<small>持ち物</small><b>${Number(item.assets?.length||0)}</b></div>
        <div>${icons.cook}<small>献立</small><b>${Number(item.mealCount||0)}</b></div>
      </div>
      <div class="ob16-record-list">${records.length?records.map(r=>`<article><span>${icons.record}</span><div><small>${esc(short(r.occurredAt))}</small><b>${esc(recordLabel(r))}</b></div></article>`).join(''):'<p>記録はまだありません。</p>'}</div>
      <a class="ob16-card-action" href="${esc(recordHref(item))}" data-ob17-context="record"><span>${icons.record}</span><span><b>記録を残す・見る</b><small>写真・動画・音声・メモ</small></span>${icons.arrow}</a>
    </section>`;
  }

  function walkHistory(item){
    const api=globalThis.OUTBASE_KOTA_WALK;if(!api.isWalk(item))return '';
    const counts=api.summary(item.walkRecords||[]),session=globalThis.OUTBASE_EXECUTION_SESSION.fromActivity(item);
    const distance=globalThis.OUTBASE_LOCATION_RECORDER.summary(item.locationRecords||[]).meters/1000,elapsed=session.elapsedMs+(session.mode==='active'?Math.max(0,Date.now()-session.startedAt):0);
    return `<section class="ob16-section-card" data-kota-history><h2>コタ散歩の記録</h2><p>記録時間 ${Math.floor(elapsed/60000)}分${Math.floor(elapsed/1000)%60}秒 · 距離 ${distance.toFixed(2)} km</p><p>${Object.entries(api.EVENTS).map(([kind,label])=>`${esc(label)} ${counts[kind]}回`).join(' · ')}</p><p>写真 ${Number(item.media?.types?.photo||0)}件 · 音声 ${Number(item.media?.types?.audio||0)}件</p><a href="${esc(recordHref(item))}" data-ob17-context="record">散歩の記録・写真・音声を見る</a></section>`;
  }

  const improvementDrafts=new Map();
  function improve(item){
    const rows=(item.organization?.openImprovements||item.organization?.improvements||[]).filter(x=>x.status!=='completed');
    const categories=globalThis.OUTBASE_IMPROVEMENT_PREPARATION.CATEGORIES;
    return `<section class="ob16-section-card"><div class="ob16-section-head"><div><small>次回へつなぐ</small><h2>改善</h2></div><span>${rows.length}件</span></div>
      <a data-ob16-improvement-add href="${esc(globalThis.OUTBASE_ROUTER.shellUrl('memo',{activityId:item.id,target:'improvement'}))}">改善メモを追加</a>
      <p>改善を分類して、次の活動の準備へ追加します。</p>
      ${rows.map(row=>{const draft=improvementDrafts.get(row.id)||{};return `<details data-ob16-improvement="${esc(row.id)}" ${draft.open?'open':''}><summary style="padding:12px 0">${esc(row.title||row.summary||'改善項目')}</summary><form class="ob22-form" data-ob16-transfer="${esc(row.id)}">
        <label class="wide"><span>改善内容</span><textarea name="title" required maxlength="240" rows="3">${esc(draft.title??row.summary??row.payload?.text??row.title??'')}</textarea></label>
        <label><span>分類</span><select name="category" required><option value="">分類を選択</option>${Object.entries(categories).map(([key,label])=>`<option value="${key}" ${draft.category===key?'selected':''}>${esc(label)}</option>`).join('')}</select></label>
        <label><span>次の活動</span><select name="destination" required><option value="">活動を読み込んでいます</option></select></label>
        <p class="wide" role="status" data-ob16-transfer-status hidden></p>
        <div class="ob22-form-actions wide" style="grid-template-columns:minmax(0,1fr)"><button class="primary wide" type="submit" disabled>次回準備へ追加</button></div>
      </form></details>`;}).join('')}
      <p data-ob16-destinations-status role="status"></p>
      ${(item.organization?.appliedImprovements||[]).length?`<details><summary>次回準備へ追加済み</summary>${item.organization.appliedImprovements.map(row=>`<p>${esc(row.summary||row.title)}<br>${esc(categories[row.payload.preparation_transfer.category]||'準備')} · <a data-ob16-destination="${esc(row.payload.preparation_transfer.activity_id)}" href="${esc(globalThis.OUTBASE_ROUTER.shellUrl('preparation-detail',{activityId:row.payload.preparation_transfer.activity_id}))}">追加先の準備を見る</a></p>`).join('')}</details>`:''}
    </section>`;
  }

  function markup(model){
    const result = model?.detail;
    if (!result || result.status!=='ready' || !result.activity) return '<section class="ob16-not-found"><h1>活動が見つかりません</h1><p>削除されたか、まだ移行されていない可能性があります。</p></section>';
    const item = result.activity;
    return `<section class="ob16-activity">${hero(item)}${next(item)}${walkHistory(item)}${prep(item)}${memory(item)}${improve(item)}<button id="outbaseCopyrightFooter" type="button" class="ob-copyright-footer">© 2026 OUTBASE</button></section>`;
  }

  function bind(main,model,{loading=false}={}){
    const item=model?.detail?.activity||null;
    const openPreparation=(event,id)=>{event.preventDefault();event.stopPropagation();globalThis.OUTBASE_ROUTER.navigate('preparation-detail',{activityId:id,returnShell:'activity'},{transition:false,skipTransition:true});};
    main.querySelectorAll('[data-ob16-destination]').forEach(link=>link.addEventListener('click',event=>openPreparation(event,link.dataset.ob16Destination)));
    main.querySelector('[data-ob16-improvement-add]')?.addEventListener('click',event=>{event.preventDefault();globalThis.OUTBASE_ROUTER.navigate('memo',{activityId:item.id,target:'improvement'},{transition:false,skipTransition:true});});
    const forms=[...main.querySelectorAll('[data-ob16-transfer]')];
    main.querySelectorAll('[data-ob16-improvement]').forEach(detail=>{
      const id=detail.dataset.ob16Improvement;
      detail.querySelector('summary').addEventListener('click',()=>improvementDrafts.set(id,{...(improvementDrafts.get(id)||{}),open:!detail.open}));
    });
    for(const form of forms){
      const remember=()=>{const fields=new FormData(form);improvementDrafts.set(form.dataset.ob16Transfer,{...(improvementDrafts.get(form.dataset.ob16Transfer)||{}),title:fields.get('title'),category:fields.get('category'),destination:fields.get('destination')});};
      form.addEventListener('input',remember);form.addEventListener('change',remember);
    }
    if(loading)for(const form of forms)form.querySelectorAll('textarea,select,button').forEach(input=>input.disabled=true);
    if(forms.length&&!loading){
      globalThis.OUTBASE_IMPROVEMENT_PREPARATION.destinations(item.id).then(rows=>{
        if(!main.isConnected||globalThis.OUTBASE_ROUTER.current().activityId!==item.id)return;
        for(const form of forms){
          form.querySelector('[name=destination]').innerHTML='<option value="">次の活動を選択</option>'+rows.map(row=>`<option value="${esc(row.id)}">${esc(row.title)}</option>`).join('');
          const selected=improvementDrafts.get(form.dataset.ob16Transfer)?.destination;if(rows.some(row=>row.id===selected))form.querySelector('[name=destination]').value=selected;
          form.querySelector('[type=submit]').disabled=!rows.length;
        }
        if(!rows.length)main.querySelector('[data-ob16-destinations-status]').textContent='追加先の予定がありません。先に次の活動の予定を作成してください。';
      }).catch(()=>{const status=main.querySelector('[data-ob16-destinations-status]');if(status)status.textContent='追加先を読み込めませんでした。画面を開き直してください。';});
      for(const form of forms)form.addEventListener('submit',async event=>{
        event.preventDefault();if(form.dataset.saving==='1')return;
        form.dataset.saving='1';const button=form.querySelector('[type=submit]'),status=form.querySelector('[data-ob16-transfer-status]');button.disabled=true;
        const data=new FormData(form);let committed=false;
        status.hidden=false;status.textContent='次回準備へ保存しています。';
        try{
          await globalThis.OUTBASE_IMPROVEMENT_PREPARATION.apply({improvementId:form.dataset.ob16Transfer,displayActivityId:item.id,targetActivityId:data.get('destination'),category:data.get('category'),title:data.get('title')});
          committed=true;status.textContent='次回準備へ追加しました。';
          form.querySelectorAll('input,select,textarea').forEach(input=>input.disabled=true);button.textContent='追加済み';
          globalThis.OUTBASE_SHELL_MODEL_V166?.invalidate?.();
          globalThis.OUTBASE_ACTIVITY_ROUTE_V16?.invalidate?.(item.id);
          globalThis.OUTBASE_ACTIVITY_ROUTE_V16?.invalidate?.(data.get('destination'));
          globalThis.OUTBASE_PREPARATION_ROUTE_V17?.invalidate?.(data.get('destination'));
          globalThis.OUTBASE_ROUTE_UNIFICATION_V22?.clearPayloadCache?.();
          const link=document.createElement('a');link.href=globalThis.OUTBASE_ROUTER.shellUrl('preparation-detail',{activityId:data.get('destination'),returnShell:'activity'});link.dataset.ob16Destination=data.get('destination');link.textContent='追加先の準備を見る';link.addEventListener('click',event=>openPreparation(event,data.get('destination')));form.append(link);
        }catch(error){status.textContent=committed?'保存済みです。表示を更新するには画面を開き直してください。':error.message==='improvement_already_applied'?'この改善は既に別の内容で準備へ追加されています。画面を開き直してください。':'保存できませんでした。追加先の予定と空き容量を確認して再度お試しください。';}
        finally{form.dataset.saving='0';button.disabled=committed;}
      });
    }
    main.querySelector('#outbaseCopyrightFooter')?.addEventListener('click',()=>globalThis.OUTBASE_ABOUT?.open?.());
    main.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',event=>{const target=main.querySelector(a.getAttribute('href'));if(!target)return;event.preventDefault();target.scrollIntoView({behavior:'smooth',block:'start'});}));
    main.querySelectorAll('[data-ob17-context]').forEach(link=>link.addEventListener('click',event=>{
      if(!item)return;
      const mode=link.dataset.ob17Context||'legacy';
      if(mode==='preparation'){
        event.preventDefault();
        rememberPreparationOrigin(item);
        const context=activityContext(item,{returnShell:'activity',returnActivityId:item.id});
        activateContext(item,{source:'activity-to-preparation'});
        globalThis.OUTBASE_PREPARATION_ROUTE_V17?.prime?.(item);
        globalThis.OUTBASE_ROUTER.navigate('preparation',contextApi()?.params?.(context)||{
          activityId:item.id,planId:legacyPlanId(item),returnShell:'activity',returnActivityId:item.id
        },{transition:false,skipTransition:true});
        return;
      }
      if(mode==='record'){
        event.preventDefault();
        const context=activityContext(item,{returnShell:'activity',returnActivityId:item.id});
        activateContext(item,{source:'activity-to-execution',record:false});
        globalThis.OUTBASE_EXECUTION_ROUTE_V19?.prime?.(item);
        globalThis.OUTBASE_ROUTER.navigate('record',contextApi()?.params?.(context)||{
          activityId:item.id,planId:legacyPlanId(item),returnShell:'activity',returnActivityId:item.id
        },{transition:false,skipTransition:true});
        return;
      }
      activateContext(item,{source:'activity-to-legacy',record:false});
      link.setAttribute('aria-busy','true');
      link.classList.add('is-launching');
      // Native anchor navigation remains authoritative for remaining legacy settings.
    }));
  }

  function routeLoadingMarkup(route={}){
    const title=route.activityTitle||'予定を読み込んでいます';
    return `<section class="ob16-activity ob16-loading-page"><section class="ob20-plan-card ob36-card ob20-loading-card"><div class="ob20-plan-copy"><small>予定詳細</small><h1>${esc(title)}</h1><p>内容を読み込んでいます。</p><div class="ob20-skeleton wide"></div><div class="ob20-skeleton"></div></div></section><section class="ob16-section-card ob36-card"><div class="ob20-skeleton wide"></div><div class="ob20-skeleton"></div><div class="ob20-skeleton"></div></section></section>`;
  }

  const renderer = Object.freeze({
    ...base,
    __activityV16:true,
    async mount(root,options={}){
      const requested=globalThis.OUTBASE_ROUTER?.current?.()||{};
      const primed=requested.name==='activity'?cached(requested.activityId):null;
      const beforeMain=root?.querySelector?.('.ob3-shell')?.querySelector?.('.ob3-main');
      if(beforeMain){
        beforeMain.classList.add('ob3-main-activity');
        beforeMain.classList.remove('ob3-main-calendar','ob3-main-preparation');
        if(primed){
          beforeMain.innerHTML=markup(primed);
          base.hydrateMedia?.(beforeMain);
          bind(beforeMain,primed,{loading:true});
        }else{
          beforeMain.innerHTML=routeLoadingMarkup(requested);
        }
      }

      const value = await base.mount(root,options);
      const main = root?.querySelector?.('.ob3-shell')?.querySelector?.('.ob3-main');
      if (main) main.classList.toggle('ob3-main-activity', value?.route?.name==='activity');
      if (value?.route?.name==='activity' && main) {
        main.classList.remove('ob3-main-calendar','ob3-main-preparation');
        const item=value?.detail?.activity||null;
        if(item){prime(value);globalThis.OUTBASE_EXECUTION_ROUTE_V19?.prime?.(item);}
        main.innerHTML = markup(value);
        base.hydrateMedia?.(main);
        bind(main,value);
      }
      return value;
    },
    updateNav(root,value){ base.updateNav?.(root,value); }
  });

  globalThis.OUTBASE_ACTIVITY_ROUTE_V16=Object.freeze({prime,cached,invalidate(activityId){detailCache.delete(String(activityId||''));},DETAIL_CACHE_TTL_MS});

  globalThis.OUTBASE_SHELL_RENDERER_V166 = renderer;
  globalThis.OUTBASE_SHELL_RENDERER_V165 = renderer;
  globalThis.OUTBASE_SHELL_RENDERER_V164 = renderer;
})();
