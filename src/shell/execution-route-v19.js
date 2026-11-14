(() => {
  'use strict';

  const base=
    globalThis.OUTBASE_SHELL_RENDERER_V166||
    globalThis.OUTBASE_SHELL_RENDERER_V165||
    globalThis.OUTBASE_SHELL_RENDERER_V164;

  if(!base)throw new Error('OUTBASE execution renderer is not ready');
  if(base.__executionV19)return;

  const CACHE_TTL_MS=90000;
  const UI_STATE_KEY='outbase_execution_ui_state_v19';
  const cache=new Map();
  const savedSessions=new Map();
  const saving=new Set();
  let tickTimer=null;

  const esc=value=>String(value??'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
  const ui=globalThis.OUTBASE_UI_V21;
  if(!ui)throw new Error('OUTBASE UI v21 is not ready');
  const icons=ui.icons;

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
  function activityPlace(item){
    return String(item?.place||item?.placeName||item?.metadata?.place||item?.metadata?.legacy_plan?.place||'').trim()||'場所未設定';
  }

  const contextApi=()=>globalThis.OUTBASE_ACTIVITY_CONTEXT_V18||globalThis.OUTBASE_ACTIVITY_CONTEXT;
  const planId=item=>contextApi()?.planIdFrom?.(item)||item?.legacyPlanId||item?.metadata?.legacy_plan?.id||null;
  const activityContext=(item,overrides={})=>contextApi()?.fromActivity?.(item,overrides)||{
    activityId:item?.id||'',planId:planId(item)||'',activityType:item?.type||'',activityTitle:item?.title||'',...overrides
  };

  function safeSessionRead(){
    try{
      const value=JSON.parse(sessionStorage.getItem(UI_STATE_KEY)||'null');
      return value&&typeof value==='object'?value:{};
    }catch(_error){return {};}
  }
  function safeSessionWrite(value){
    try{sessionStorage.setItem(UI_STATE_KEY,JSON.stringify(value));return true;}
    catch(_error){return false;}
  }
  function defaultState(activityId=''){
    return {activityId:String(activityId||''),mode:'idle',elapsedMs:0,startedAt:0,position:null,notice:'',updatedAt:Date.now()};
  }
  function uiState(activityId){
    const value=safeSessionRead();
    const transient=String(value.activityId||'')===String(activityId||'')?value:{};
    return {...defaultState(activityId),...transient,...(savedSessions.get(String(activityId))||{mode:'idle',elapsedMs:0,startedAt:0})};
  }
  function writeUiState(activityId,patch={}){
    const value={...uiState(activityId),...patch,activityId:String(activityId||''),updatedAt:Date.now()};
    safeSessionWrite(value);
    return value;
  }
  function currentElapsed(value){
    const base=Math.max(0,Number(value?.elapsedMs||0));
    if(value?.mode!=='active'||!value.startedAt)return base;
    return base+Math.max(0,Date.now()-Number(value.startedAt||0));
  }
  function formatElapsed(ms){
    const seconds=Math.max(0,Math.floor(Number(ms||0)/1000));
    const h=Math.floor(seconds/3600),m=Math.floor((seconds%3600)/60),s=seconds%60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function cached(activityId){
    const entry=cache.get(String(activityId||''));
    if(!entry||Date.now()-entry.createdAt>=CACHE_TTL_MS){
      if(entry)cache.delete(String(activityId||''));
      return null;
    }
    return entry.value;
  }

  function prime(item){
    if(!item?.id)return null;
    const value=Object.freeze({status:'ready',item,detail:{status:'ready',activity:item}});
    cache.set(String(item.id),{createdAt:Date.now(),value});
    return value;
  }

  async function loadFast(activityId,{force=false}={}){
    if(!activityId)return {status:'missing'};
    if(!force){const value=cached(activityId);if(value)return value;}
    try{
      const shellModel=globalThis.OUTBASE_SHELL_MODEL_V166||globalThis.OUTBASE_SHELL_MODEL_V165||globalThis.OUTBASE_SHELL_MODEL_V164;
      const payload=await shellModel?.preload?.('activity',{activityId});
      const result=payload?.detail;
      if(result?.status==='ready'&&result.activity){
        let item=result.activity;
        if(force){
          const saved=await globalThis.OUTBASE_REPOSITORIES_V160.activities.get(activityId);
          if(!saved||saved.deleted_at)return {status:'not_found'};
          item={...item,state:saved.state,metadata:saved.metadata,updatedAt:saved.updated_at};
        }
        const value=Object.freeze({status:'ready',item,detail:result});
        cache.set(String(activityId),{createdAt:Date.now(),value});
        return value;
      }
      return {status:result?.status||'not_found'};
    }catch(error){return {status:'error',error};}
  }

  function activateContext(item,source='execution-render'){
    if(!item?.id)return;
    const context=activityContext(item,{source});
    contextApi()?.activate?.(item,{source,record:false});
    return context;
  }

  function modeText(mode){
    if(mode==='active')return '記録中';
    if(mode==='paused')return '一時停止中';
    if(mode==='ended')return '終了・整理待ち';
    return '開始前';
  }
  function controlText(mode){
    if(mode==='active')return '一時停止';
    if(mode==='paused')return '再開';
    if(mode==='ended')return '活動終了';
    return '活動を始める';
  }
  function controlIcon(mode){return mode==='active'?icons.pause:icons.play;}

  function loadingMarkup(route){
    const title=route?.activityTitle||'予定を読み込んでいます';
    const type=contextApi()?.typeLabel?.(route?.activityType||'')||route?.activityType||'活動';
    return `<section class="ob19-execution ob20-page ob20-loading-page">
      <div class="ob19-route-head ob20-route-head"><button type="button" class="ob19-back" data-ob19-loading-back>${icons.back}<span>準備へ</span></button><span class="ob19-route-label">実行</span></div>
      <section class="ob20-plan-card ob36-card ob20-loading-card"><span class="ob19-overview-icon">${icons.play}</span><div><small>${esc(type)}</small><h1>${esc(title)}</h1><p>実行画面を準備しています。</p></div></section>
      <section class="ob20-session-card ob36-card"><div class="ob20-skeleton wide"></div><div class="ob20-skeleton"></div><div class="ob20-skeleton"></div></section>
      <section class="ob19-map-card ob36-card"><div class="ob20-skeleton map"></div></section>
    </section>`;
  }

  function mapMarkup(state){
    const position=state.position;
    const label=position?`現在地取得済み ±${Math.round(Number(position.accuracy||0))||'—'}m`:'現在地はまだ取得していません';
    const coordinates=position?`${Number(position.lat).toFixed(5)}, ${Number(position.lng).toFixed(5)}`:'現在地を取得すると、ここに表示します';
    return `<section class="ob19-map-card ob36-card">
      <div class="ob19-card-head"><div><small>現在地</small><h2>地図と場所の記録</h2></div><span class="${position?'ready':''}">${esc(label)}</span></div>
      <div class="ob19-map-stage" aria-label="実行画面の地図領域">
        <div class="ob19-map-grid"></div><span class="ob19-map-road r1"></span><span class="ob19-map-road r2"></span><span class="ob19-map-park"></span><i class="ob19-map-dot"></i>
        <p>${esc(coordinates)}</p>
      </div>
      <button type="button" class="ob19-locate" data-ob19-locate>${icons.locate}<span><b>現在地を確認</b><small>端末の位置情報を一度取得</small></span>${icons.arrow}</button>
    </section>`;
  }

  function actionButton(key,label,sub,icon){
    return `<button type="button" class="ob19-quick" data-ob19-feature="${esc(key)}"><span>${icon}</span><b>${esc(label)}</b><small>${esc(sub)}</small></button>`;
  }

  function savedNotes(item){
    const notes=(item.records||[]).filter(row=>row.type==='note');
    if(!notes.length)return '';
    return `<section class="ob19-recording ob19-saved-notes ob36-card"><div class="ob19-card-head"><h2>保存したメモ</h2></div>${notes.slice(0,5).map(row=>{
      const payload=row.payload||{};
      return `<details><summary>${esc(payload.title||'メモ')}</summary><p>${esc(payload.text||payload.memo||'')}</p></details>`;
    }).join('')}</section>`;
  }

  function markup(result,route){
    if(result.status!=='ready'){
      const message=result.status==='missing'?'対象の予定が選ばれていません。':result.status==='error'?'実行画面を読み込めませんでした。':'予定が見つかりません。';
      return `<section class="ob19-execution ob20-page"><div class="ob19-error ob36-card"><h1>実行</h1><p>${esc(message)}</p><button type="button" data-ob19-home>ホームへ戻る</button></div></section>`;
    }
    const item=result.item;
    const state=uiState(item.id);
    const type=contextApi()?.typeLabel?.(item.type||'')||item.typeLabel||'活動';
    const returnLabel=route?.returnShell==='activity'?'予定詳細へ':'準備へ';
    return `<section class="ob19-execution ob20-page" data-ob19-activity-id="${esc(item.id)}">
      <div class="ob19-route-head ob20-route-head">
        <button type="button" class="ob19-back" data-ob19-back>${icons.back}<span>${esc(returnLabel)}</span></button>
        <span class="ob19-route-label">実行</span>
      </div>

      <section class="ob19-overview ob20-plan-card ob36-card">
        <span class="ob19-overview-icon">${icons.play}</span>
        <div class="ob19-overview-main"><div><small>${esc(type)}</small><h1>${esc(item.title||'予定')}</h1><p>${esc(range(item))}</p><p>${esc(activityPlace(item))}</p></div></div>
        <span class="ob20-status-pill">${esc(modeText(state.mode))}</span>
      </section>

      <section class="ob19-session ob20-session-card ob36-card">
        <div class="ob19-card-head"><div><small>活動時間</small><h2>今の記録</h2></div><span>${esc(modeText(state.mode))}</span></div>
        <div class="ob19-metrics"><div><small>経過時間</small><b data-ob19-elapsed>${formatElapsed(currentElapsed(state))}</b></div><div><small>距離</small><b>0.00 <i>km</i></b></div></div>
        <div class="ob19-controls">
          <button type="button" class="ob19-control primary" data-ob19-control ${state.mode==='ended'||saving.has(item.id)||!savedSessions.has(String(item.id))?'disabled':''}>${controlIcon(state.mode)}<span>${esc(controlText(state.mode))}</span></button>
          <button type="button" class="ob19-control secondary" data-ob19-end ${['active','paused'].includes(state.mode)&&!saving.has(item.id)&&savedSessions.has(String(item.id))?'':'disabled'}>${icons.stop}<span>終了</span></button>
        </div>
      </section>

      ${mapMarkup(state)}

      <section class="ob19-recording ob36-card">
        <div class="ob19-card-head"><div><small>クイック記録</small><h2>今これを残す</h2></div><span>${esc(item.title||'活動')}</span></div>
        <div class="ob19-quick-grid">
          ${actionButton('photo','写真','位置と時刻',icons.photo)}
          ${actionButton('video','動画','その場の様子',icons.video)}
          ${actionButton('audio','音声','話して残す',icons.audio)}
          ${actionButton('memo','メモ','気づきを記録',icons.memo)}
          ${actionButton('pin','場所ピン','あとで見返す',icons.pin)}
          ${actionButton('parking','駐車位置','車へ戻る',icons.parking)}
        </div>
        <p class="ob19-inline-notice" data-ob19-notice role="status">${esc(state.notice||'この確認版では、写真・音声などはまだ保存されません。')}</p>
      </section>

      ${savedNotes(item)}

      <section class="ob19-save ob36-card">
        <span>${icons.cloud}</span><div><b>活動状態を端末に保存</b><small>開始・一時停止・再開・終了に対応。写真・音声などの保存は未接続です。</small></div><em>状態保存</em>
      </section>

      <button type="button" class="ob19-detail-button" data-ob19-detail><span>予定詳細を見る</span>${icons.arrow}</button>
    </section>`;
  }

  function clearTimer(){if(tickTimer){clearInterval(tickTimer);tickTimer=null;}}
  function startTimer(main,item){
    clearTimer();
    const update=()=>{
      const node=main?.querySelector?.('[data-ob19-elapsed]');
      if(!node||!main.isConnected){clearTimer();return;}
      node.textContent=formatElapsed(currentElapsed(uiState(item.id)));
    };
    update();tickTimer=setInterval(update,1000);
  }

  function rerender(main,result,route,{preserveScroll=true}={}){
    const y=preserveScroll?window.scrollY:0;
    main.innerHTML=markup(result,route);
    bind(main,result,route);
    if(preserveScroll)requestAnimationFrame(()=>window.scrollTo(0,y));
  }

  function fallbackRoute(route,item){
    const name=['activity','preparation'].includes(route?.returnShell)?route.returnShell:'preparation';
    const context=activityContext(item,{returnShell:'activity',returnActivityId:item.id});
    return {name,values:contextApi()?.params?.(context)||{activityId:item.id,planId:planId(item)}};
  }

  function backToOrigin(route,item){
    clearTimer();
    if(history.state?.outbaseShell&&history.length>1){globalThis.OUTBASE_ROUTER.back();return;}
    const fallback=fallbackRoute(route,item);
    globalThis.OUTBASE_ROUTER.navigate(fallback.name,fallback.values,{replace:true,transition:false,skipTransition:true});
  }

  function bind(main,result,route){
    main.querySelector('[data-ob19-home]')?.addEventListener('click',()=>globalThis.OUTBASE_ROUTER.navigate('home',{}, {replace:true}));
    if(result.status!=='ready')return;
    const item=result.item;
    activateContext(item,'execution-bind');

    main.querySelector('[data-ob19-back]')?.addEventListener('click',()=>backToOrigin(route,item));
    main.querySelector('[data-ob19-detail]')?.addEventListener('click',()=>{
      clearTimer();
      const context=activityContext(item,{returnShell:'record',returnActivityId:item.id});
      globalThis.OUTBASE_ROUTER.navigate('activity',contextApi()?.params?.(context)||{activityId:item.id,planId:planId(item)},{transition:false,skipTransition:true});
    });

    async function saveAction(action){
      if(saving.has(item.id))return;
      saving.add(item.id);
      main.querySelectorAll('[data-ob19-control],[data-ob19-end]').forEach(button=>{button.disabled=true;});
      const notice=main.querySelector('[data-ob19-notice]');if(notice)notice.textContent='活動状態を保存しています。';
      try{
        const saved=await globalThis.OUTBASE_EXECUTION_SESSION.transition(item.id,action,{expectedMode:uiState(item.id).mode});
        savedSessions.set(String(item.id),globalThis.OUTBASE_EXECUTION_SESSION.fromActivity(saved));
        writeUiState(item.id,{notice:{start:'活動を開始しました',pause:'一時停止しました',resume:'再開しました',end:'活動を終了し、整理待ちとして保存しました'}[action]});
        cache.delete(String(item.id));
        globalThis.OUTBASE_SHELL_MODEL_V166?.invalidate?.();
        globalThis.OUTBASE_ACTIVITY_ROUTE_V16?.invalidate?.(item.id);
        globalThis.OUTBASE_PREPARATION_ROUTE_V17?.invalidate?.(item.id);
        globalThis.OUTBASE_ROUTE_UNIFICATION_V22?.clearPayloadCache?.();
      }catch(error){
        writeUiState(item.id,{notice:error?.message==='execution_state_changed'
          ?'別の操作で活動状態が変わりました。画面を開き直してください。'
          :'活動状態を保存できませんでした。操作前の状態を保っています。もう一度お試しください。'});
      }finally{
        saving.delete(item.id);
        if(globalThis.OUTBASE_ROUTER?.current?.().name==='record'&&globalThis.OUTBASE_ROUTER.current().activityId===item.id)rerender(main,result,route);
      }
    }

    main.querySelector('[data-ob19-control]')?.addEventListener('click',()=>{
      const current=uiState(item.id);
      if(current.mode==='ended')return;
      saveAction(current.mode==='active'?'pause':current.mode==='paused'?'resume':'start');
    });

    main.querySelector('[data-ob19-end]')?.addEventListener('click',()=>{
      saveAction('end');
    });

    main.querySelector('[data-ob19-locate]')?.addEventListener('click',event=>{
      const button=event.currentTarget;
      const notice=main.querySelector('[data-ob19-notice]');
      if(!navigator.geolocation){if(notice)notice.textContent='この端末では位置情報を利用できません。';return;}
      button.disabled=true;button.classList.add('is-loading');
      navigator.geolocation.getCurrentPosition(position=>{
        writeUiState(item.id,{position:{lat:position.coords.latitude,lng:position.coords.longitude,accuracy:position.coords.accuracy,time:position.timestamp}});
        rerender(main,result,route);
      },error=>{
        button.disabled=false;button.classList.remove('is-loading');
        if(notice)notice.textContent=error?.code===1?'位置情報の利用が許可されていません。':'現在地を取得できませんでした。';
      },{enableHighAccuracy:true,timeout:12000,maximumAge:15000});
    });

    main.querySelectorAll('[data-ob19-feature]').forEach(button=>button.addEventListener('click',()=>{
      if(button.dataset.ob19Feature==='memo'){
        clearTimer();
        const api=globalThis.OUTBASE_ROUTER;
        api.navigate('memo',{activityId:item.id,planId:planId(item),returnShell:'record',returnActivityId:item.id,recordReturnShell:route.returnShell||'preparation'},{transition:false,skipTransition:true});
        api.history.replace({...api.history.state(),outbaseExecutionMemoOrigin:item.id});
        return;
      }
      const labels={photo:'写真',video:'動画',audio:'音声',memo:'メモ',pin:'場所ピン',parking:'駐車位置'};
      const notice=main.querySelector('[data-ob19-notice]');
      if(notice)notice.textContent=`${labels[button.dataset.ob19Feature]||'記録'}は、FIELD03の保存中核を移植した完成版で有効になります。`;
      button.classList.add('is-selected');
      setTimeout(()=>button.classList.remove('is-selected'),500);
    }));

    startTimer(main,item);
  }

  function clearLegacyLaunchState(root=document){
    root.querySelectorAll?.('[aria-busy="true"]').forEach(node=>node.removeAttribute('aria-busy'));
    root.querySelectorAll?.('.is-launching').forEach(node=>node.classList.remove('is-launching'));
    root.querySelectorAll?.('[data-ob17-start],[data-ob17-advanced]').forEach(node=>{node.removeAttribute('disabled');node.style.pointerEvents='';});
  }

  if(!globalThis.__OUTBASE_EXECUTION_PAGE_SHOW_V19__){
    globalThis.__OUTBASE_EXECUTION_PAGE_SHOW_V19__=true;
    addEventListener('pageshow',()=>clearLegacyLaunchState(document));
  }

  const renderer=Object.freeze({
    ...base,
    __executionV19:true,
    async mount(root,options={}){
      const requested=globalThis.OUTBASE_ROUTER?.current?.()||{};
      if(requested.name!=='record'){
        clearTimer();
        return base.mount(root,options);
      }

      let value;
      let result;
      let shell=root?.querySelector?.(':scope > .ob3-shell')||root?.querySelector?.('.ob3-shell');
      if(!shell){
        root.innerHTML='<div class="ob3-shell ob6-north" data-ob6-route="record"><header class="ob3-header"></header><main class="ob3-main"></main><nav class="ob3-nav"></nav><div id="outbaseShellModal"></div></div>';
        shell=root?.querySelector?.(':scope > .ob3-shell')||root?.querySelector?.('.ob3-shell');
      }
      const main=shell?.querySelector?.('.ob3-main');
      if(shell)shell.dataset.ob6Route='record';
      if(main){
        main.classList.add('ob3-main-record');
        main.classList.remove('ob3-main-calendar','ob3-main-preparation','ob3-main-activity');
        clearLegacyLaunchState(main);
        const primed=cached(requested.activityId);
        if(primed)rerender(main,primed,requested,{preserveScroll:false});
        else{
          main.innerHTML=loadingMarkup(requested);
          main.querySelector?.('[data-ob19-loading-back]')?.addEventListener('click',()=>globalThis.OUTBASE_ROUTER?.back?.());
        }
      }
      try{base.updateNav?.(root,Object.freeze({route:requested,online:navigator.onLine,executionImmediate:true}));}catch(_error){}
      globalThis.OUTBASE_THEME_V166?.sync?.('execution-immediate');

      try{
        const shellModel=globalThis.OUTBASE_SHELL_MODEL_V166||globalThis.OUTBASE_SHELL_MODEL_V165||globalThis.OUTBASE_SHELL_MODEL_V164;
        const primed=cached(requested.activityId);
        const modelPromise=shellModel?.build?Promise.resolve(shellModel.build(options)):Promise.resolve(Object.freeze({route:requested,online:navigator.onLine}));
        const resultPromise=loadFast(requested.activityId,{force:true});
        [value,result]=await Promise.all([modelPromise,resultPromise]);
        if(result?.status==='ready')savedSessions.set(String(requested.activityId),globalThis.OUTBASE_EXECUTION_SESSION.fromActivity(result.item));
        base.updateNetwork?.(shell,value?.online);
        base.updateNav?.(root,value||Object.freeze({route:requested,online:navigator.onLine}));
        if(main&&globalThis.OUTBASE_ROUTER?.current?.().name==='record')rerender(main,result||{status:'error'},requested,{preserveScroll:false});
        globalThis.OUTBASE_THEME_V166?.sync?.('execution-render');
        return value;
      }catch(error){
        console.error('[OUTBASE execution mount]',error);
        if(main){
          main.innerHTML='<section class="ob19-execution ob20-page"><div class="ob19-error ob36-card"><h1>実行画面を開けませんでした</h1><p>準備画面へ戻って、もう一度開いてください。</p><button type="button" data-ob19-recover>準備へ戻る</button></div></section>';
          main.querySelector?.('[data-ob19-recover]')?.addEventListener('click',()=>{
            const values={activityId:requested.activityId||'',planId:requested.planId||'',returnShell:'activity',returnActivityId:requested.activityId||''};
            globalThis.OUTBASE_ROUTER?.navigate?.('preparation',values,{replace:true,transition:false,skipTransition:true});
          });
        }
        return value||Object.freeze({route:requested,online:navigator.onLine,executionError:true});
      }
    },
    updateNav(root,value){base.updateNav?.(root,value);}
  });

  globalThis.OUTBASE_EXECUTION_ROUTE_V19=Object.freeze({
    loadFast,cached,prime,invalidate(activityId){cache.delete(String(activityId||''));},uiState,writeUiState,UI_STATE_KEY
  });
  globalThis.OUTBASE_SHELL_RENDERER_V166=renderer;
  globalThis.OUTBASE_SHELL_RENDERER_V165=renderer;
  globalThis.OUTBASE_SHELL_RENDERER_V164=renderer;
})();
