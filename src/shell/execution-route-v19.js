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
  let tickTimer=null;

  const esc=value=>String(value??'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');

  const icons={
    back:'<svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg>',
    play:'<svg viewBox="0 0 24 24"><path d="m8 5 11 7-11 7z"/></svg>',
    pause:'<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>',
    stop:'<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
    locate:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
    photo:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m5 18 5-5 3 3 2-2 4 4"/></svg>',
    video:'<svg viewBox="0 0 24 24"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/></svg>',
    audio:'<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/></svg>',
    memo:'<svg viewBox="0 0 24 24"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/></svg>',
    pin:'<svg viewBox="0 0 24 24"><path d="M12 21s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2"/></svg>',
    parking:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9M9 13h4"/></svg>',
    cloud:'<svg viewBox="0 0 24 24"><path d="M6.5 18h11a4 4 0 0 0 .1-8 6 6 0 0 0-11.2-1.5A4.8 4.8 0 0 0 6.5 18Z"/><path d="m9 14 3 3 5-6"/></svg>',
    arrow:'<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>'
  };

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
    if(String(value.activityId||'')!==String(activityId||''))return defaultState(activityId);
    const mode=['idle','active','paused','ended'].includes(value.mode)?value.mode:'idle';
    return {...defaultState(activityId),...value,mode};
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

  async function loadFast(activityId,{force=false}={}){
    if(!activityId)return {status:'missing'};
    if(!force){const value=cached(activityId);if(value)return value;}
    try{
      const shellModel=globalThis.OUTBASE_SHELL_MODEL_V166||globalThis.OUTBASE_SHELL_MODEL_V165||globalThis.OUTBASE_SHELL_MODEL_V164;
      const payload=await shellModel?.preload?.('activity',{activityId});
      const result=payload?.detail;
      if(result?.status==='ready'&&result.activity){
        const value=Object.freeze({status:'ready',item:result.activity,detail:result});
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
    if(mode==='ended')return '終了確認';
    return '開始前';
  }
  function controlText(mode){
    if(mode==='active')return '一時停止';
    if(mode==='paused')return '再開';
    if(mode==='ended')return 'もう一度確認';
    return '活動を始める';
  }
  function controlIcon(mode){return mode==='active'?icons.pause:icons.play;}

  function mapMarkup(state){
    const position=state.position;
    const label=position?`現在地取得済み ±${Math.round(Number(position.accuracy||0))||'—'}m`:'現在地はまだ取得していません';
    const coordinates=position?`${Number(position.lat).toFixed(5)}, ${Number(position.lng).toFixed(5)}`:'GPS・軌跡・場所記録';
    return `<section class="ob19-map-card ob36-card">
      <div class="ob19-card-head"><div><small>LIVE MAP</small><h2>現在地と記録</h2></div><span class="${position?'ready':''}">${esc(label)}</span></div>
      <div class="ob19-map-stage" aria-label="新しい実行画面の地図領域">
        <div class="ob19-map-grid"></div><span class="ob19-map-road r1"></span><span class="ob19-map-road r2"></span><span class="ob19-map-park"></span><i class="ob19-map-dot"></i>
        <p>${esc(coordinates)}</p>
      </div>
      <button type="button" class="ob19-locate" data-ob19-locate>${icons.locate}<span><b>現在地を確認</b><small>端末の位置情報を一度取得</small></span>${icons.arrow}</button>
    </section>`;
  }

  function actionButton(key,label,sub,icon){
    return `<button type="button" class="ob19-quick" data-ob19-feature="${esc(key)}"><span>${icon}</span><b>${esc(label)}</b><small>${esc(sub)}</small></button>`;
  }

  function markup(result,route){
    if(result.status!=='ready'){
      const message=result.status==='missing'?'対象の予定が選ばれていません。':result.status==='error'?'実行画面を読み込めませんでした。':'予定が見つかりません。';
      return `<section class="ob19-execution"><div class="ob19-error ob36-card"><h1>実行</h1><p>${esc(message)}</p><button type="button" data-ob19-home>ホームへ戻る</button></div></section>`;
    }
    const item=result.item;
    const state=uiState(item.id);
    const type=contextApi()?.typeLabel?.(item.type||'')||item.typeLabel||'活動';
    const returnLabel=route?.returnShell==='activity'?'予定詳細へ':'準備へ';
    const engineReady=false;
    return `<section class="ob19-execution" data-ob19-activity-id="${esc(item.id)}">
      <div class="ob19-route-head">
        <button type="button" class="ob19-back" data-ob19-back>${icons.back}<span>${esc(returnLabel)}</span></button>
        <span class="ob19-route-label">実行</span>
      </div>

      <section class="ob19-overview ob36-card">
        <div class="ob19-overview-main"><span class="ob19-overview-icon">${icons.play}</span><div><small>ACTIVITY</small><h1>${esc(item.title||'予定')}</h1><p>${esc(type)}・${esc(range(item))}</p><p>${esc(item.place||'場所未設定')}</p></div></div>
        <div class="ob19-engine-state"><i></i><span><b>${engineReady?'記録基盤 接続済み':'新実行画面を準備中'}</b><small>${engineReady?'GPSと保存を利用できます':'FIELD03の記録中核はCodex工程で接続します'}</small></span></div>
      </section>

      ${mapMarkup(state)}

      <section class="ob19-session ob36-card">
        <div class="ob19-metrics"><div><small>経過時間</small><b data-ob19-elapsed>${formatElapsed(currentElapsed(state))}</b></div><div><small>距離</small><b>0.00 <i>km</i></b></div></div>
        <div class="ob19-controls">
          <button type="button" class="ob19-control primary" data-ob19-control>${controlIcon(state.mode)}<span>${esc(controlText(state.mode))}</span></button>
          <button type="button" class="ob19-control secondary" data-ob19-end ${['active','paused'].includes(state.mode)?'':'disabled'}>${icons.stop}<span>終了</span></button>
        </div>
        <p class="ob19-control-note">この版の開始・停止は画面操作確認用です。GPS軌跡と本保存にはまだ接続しません。</p>
      </section>

      <section class="ob19-recording ob36-card">
        <div class="ob19-card-head"><div><small>QUICK RECORD</small><h2>今これを残す</h2></div><span>予定：${esc(item.title||'活動')}</span></div>
        <div class="ob19-quick-grid">
          ${actionButton('photo','写真','位置と時刻',icons.photo)}
          ${actionButton('video','動画','その場の様子',icons.video)}
          ${actionButton('audio','音声','話して残す',icons.audio)}
          ${actionButton('memo','メモ','気づきを記録',icons.memo)}
          ${actionButton('pin','場所ピン','あとで見返す',icons.pin)}
          ${actionButton('parking','駐車位置','車へ戻る',icons.parking)}
        </div>
        <p class="ob19-inline-notice" data-ob19-notice>写真・動画・音声・メモ・ピンは、Codexで記録エンジンを移植した時に一括接続します。</p>
      </section>

      <section class="ob19-save ob36-card">
        <span>${icons.cloud}</span><div><b>端末保存・オフライン復元</b><small>保存構造を保護したまま新画面へ移植予定</small></div><em>未接続</em>
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

    main.querySelector('[data-ob19-control]')?.addEventListener('click',()=>{
      const current=uiState(item.id);
      let patch={};
      if(current.mode==='active')patch={mode:'paused',elapsedMs:currentElapsed(current),startedAt:0,notice:'一時停止しました'};
      else if(current.mode==='paused')patch={mode:'active',startedAt:Date.now(),notice:'再開しました'};
      else patch={mode:'active',elapsedMs:0,startedAt:Date.now(),notice:'活動を開始しました'};
      writeUiState(item.id,patch);
      rerender(main,result,route);
    });

    main.querySelector('[data-ob19-end]')?.addEventListener('click',()=>{
      const current=uiState(item.id);
      writeUiState(item.id,{mode:'ended',elapsedMs:currentElapsed(current),startedAt:0,notice:'終了状態を確認中'});
      rerender(main,result,route);
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
      if(requested.name!=='record')clearTimer();
      const primed=requested.name==='record'?cached(requested.activityId):null;
      const beforeMain=root?.querySelector?.('.ob3-shell')?.querySelector?.('.ob3-main');
      if(primed&&beforeMain){
        beforeMain.classList.add('ob3-main-record');
        beforeMain.classList.remove('ob3-main-calendar','ob3-main-preparation','ob3-main-activity');
        rerender(beforeMain,primed,requested,{preserveScroll:false});
      }

      const value=await base.mount(root,options);
      const main=root?.querySelector?.('.ob3-shell')?.querySelector?.('.ob3-main');
      const active=value?.route?.name==='record';
      if(main)main.classList.toggle('ob3-main-record',active);
      if(active&&main){
        main.classList.remove('ob3-main-calendar','ob3-main-preparation','ob3-main-activity');
        clearLegacyLaunchState(main);
        const result=cached(value.route.activityId)||primed||await loadFast(value.route.activityId);
        if(result.status==='ready')activateContext(result.item,'execution-render');
        rerender(main,result,value.route,{preserveScroll:false});
      }
      return value;
    },
    updateNav(root,value){base.updateNav?.(root,value);}
  });

  globalThis.OUTBASE_EXECUTION_ROUTE_V19=Object.freeze({
    loadFast,cached,invalidate(activityId){cache.delete(String(activityId||''));},uiState,writeUiState,UI_STATE_KEY
  });
  globalThis.OUTBASE_SHELL_RENDERER_V166=renderer;
  globalThis.OUTBASE_SHELL_RENDERER_V165=renderer;
  globalThis.OUTBASE_SHELL_RENDERER_V164=renderer;
})();
