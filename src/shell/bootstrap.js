(() => {
  'use strict';
  const router=globalThis.OUTBASE_ROUTER;
  const legacy=globalThis.OUTBASE_LEGACY_UI_V165;
  const renderer=globalThis.OUTBASE_SHELL_RENDERER_V166||globalThis.OUTBASE_SHELL_RENDERER_V165;
  const modals=globalThis.OUTBASE_MODAL_STACK_V164;
  const modelApi=globalThis.OUTBASE_SHELL_MODEL_V166||globalThis.OUTBASE_SHELL_MODEL_V165||globalThis.OUTBASE_SHELL_MODEL_V164;
  const PREP_COMMON_STORE_KEY='outbase_prep_common_v1';
  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  let root=null,mounted=false,bound=false,previousScrollRestoration=null,renderPromise=null,pendingReason=null;

  function modalHost(){return document.getElementById('outbaseShellModal');}
  function homeModel(){return globalThis.OUTBASE_HOME_SCREEN_MODEL_V164;}
  function safeSet(key,value){try{localStorage.setItem(key,String(value));return true;}catch(_error){return false;}}
  function clearHomeModal(){const host=modalHost();if(host)host.innerHTML='';document.body.classList.remove('ob36-modal-open');}
  function closeHomeModal({historyBack=true}={}){
    clearHomeModal();
    const top=modals?.top?.();
    if(top?.id?.startsWith?.('home-v36-'))modals.close({historyBack});
  }
  function openHomeModal(id,markup){
    const host=modalHost();if(!host)return null;
    host.innerHTML=markup;document.body.classList.add('ob36-modal-open');
    if(modals?.top?.()?.id!==id)modals?.open?.(id);
    return host;
  }
  function toast(text){
    let node=document.getElementById('outbaseHomeV36Toast');
    if(!node){node=document.createElement('div');node.id='outbaseHomeV36Toast';node.className='ob36-toast';document.body.appendChild(node);}
    node.textContent=String(text||'');node.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove('show'),1400);
  }

  function readPrepCommon(){
    try{
      const value=JSON.parse(localStorage.getItem(PREP_COMMON_STORE_KEY)||'{}');
      if(!value||typeof value!=='object')return {modules:{},updatedAt:0};
      if(!value.modules||typeof value.modules!=='object')value.modules={};
      return value;
    }catch(_error){return {modules:{},updatedAt:0};}
  }
  function cookingState(store=readPrepCommon()){
    const value=store.modules.cooking&&typeof store.modules.cooking==='object'?store.modules.cooking:{items:[],note:''};
    return {items:Array.isArray(value.items)?value.items.map(item=>String(item)).filter(Boolean):[],note:String(value.note||'')};
  }
  function writeCooking(state){
    const store=readPrepCommon();store.modules.cooking={items:[...state.items],note:String(state.note||'')};store.updatedAt=Date.now();
    return safeSet(PREP_COMMON_STORE_KEY,JSON.stringify(store))?state:null;
  }
  function cookingMarkup(state){
    const rows=state.items.length?state.items.map((item,index)=>`<li><span>${esc(item)}</span><button type="button" data-ob36-cooking-remove="${index}" aria-label="削除">×</button></li>`).join(''):'<li class="empty"><span>献立案やレシピはまだありません。</span></li>';
    return `<div class="ob36-sheet-backdrop" data-ob36-sheet-backdrop><section class="ob36-sheet" role="dialog" aria-modal="true" aria-label="日常料理"><div class="ob36-sheet-grab"></div><header><div><small>DAILY COOKING</small><h2>日常料理</h2><p>共通準備の料理メモと同じ保存先です。</p></div><button type="button" data-ob36-modal-close aria-label="閉じる">×</button></header><ul class="ob36-cooking-list">${rows}</ul><div class="ob36-cooking-add"><input id="ob36CookingItem" type="text" placeholder="献立・レシピ名を追加"><button type="button" data-ob36-cooking-add>追加</button></div><label class="ob36-field"><span>料理メモ</span><textarea id="ob36CookingNote" placeholder="量、材料、次回の工夫など">${esc(state.note)}</textarea></label><button class="ob36-sheet-done" type="button" data-ob36-cooking-done>保存して閉じる</button></section></div>`;
  }
  function bindCooking(host){
    host.querySelector('[data-ob36-cooking-done]')?.addEventListener('click',()=>{const state=cookingState();state.note=host.querySelector('#ob36CookingNote')?.value||'';if(!writeCooking(state)){toast('日常料理を保存できませんでした');return;}closeHomeModal();toast('日常料理を保存しました');});
    host.querySelector('[data-ob36-cooking-add]')?.addEventListener('click',()=>{const input=host.querySelector('#ob36CookingItem');const text=String(input?.value||'').trim();if(!text)return;const state=cookingState();if(!state.items.includes(text))state.items.push(text);state.note=host.querySelector('#ob36CookingNote')?.value||state.note;if(!writeCooking(state)){toast('日常料理を保存できませんでした');return;}openCooking();});
    host.querySelectorAll('[data-ob36-cooking-remove]').forEach(button=>button.addEventListener('click',()=>{const state=cookingState();state.items.splice(Number(button.dataset.ob36CookingRemove),1);state.note=host.querySelector('#ob36CookingNote')?.value||state.note;if(!writeCooking(state)){toast('日常料理を保存できませんでした');return;}openCooking();}));
    host.querySelector('#ob36CookingItem')?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();host.querySelector('[data-ob36-cooking-add]')?.click();}});
  }
  function openCooking(){const host=openHomeModal('home-v36-cooking',cookingMarkup(cookingState()));if(host)bindCooking(host);}

  function normalizedQuickIds(ids){
    const catalog=homeModel()?.QUICK_CATALOG||[];const allowed=new Set(catalog.map(item=>item.id));const rows=[];
    for(const id of ids||[]){if(allowed.has(id)&&!rows.includes(id))rows.push(id);}
    for(const id of homeModel()?.DEFAULT_QUICK_IDS||[]){if(rows.length>=5)break;if(!rows.includes(id))rows.push(id);}
    return rows.slice(0,5);
  }
  function currentQuickIds(){return homeModel()?.quickIds?.()||[...(homeModel()?.DEFAULT_QUICK_IDS||[])];}
  function quickSettingsMarkup(ids){
    const catalog=homeModel()?.QUICK_CATALOG||[];const rows=normalizedQuickIds(ids);
    const options=current=>catalog.map(item=>`<option value="${esc(item.id)}"${item.id===current?' selected':''}>${esc(item.label)}</option>`).join('');
    const slots=rows.map((id,index)=>`<div class="ob36-slot"><span class="ob36-slot-no">${index+1}</span><select data-ob36-quick-slot="${index}" aria-label="クイックアクション${index+1}">${options(id)}</select><button type="button" data-ob36-quick-up="${index}" aria-label="上へ"${index===0?' disabled':''}>↑</button><button type="button" data-ob36-quick-down="${index}" aria-label="下へ"${index===rows.length-1?' disabled':''}>↓</button></div>`).join('');
    return `<div class="ob36-sheet-backdrop" data-ob36-sheet-backdrop><section class="ob36-sheet" role="dialog" aria-modal="true" aria-label="クイックアクション設定"><div class="ob36-sheet-grab"></div><header><div><small>HOME SHORTCUTS</small><h2>クイックアクション設定</h2><p>5枠の内容と順番を変更できます。</p></div><button type="button" data-ob36-modal-close aria-label="閉じる">×</button></header><div class="ob36-slot-list">${slots}</div><button class="ob36-sheet-done" type="button" data-ob36-quick-save>完了</button></section></div>`;
  }
  function readSlotIds(host){return [...host.querySelectorAll('[data-ob36-quick-slot]')].sort((a,b)=>Number(a.dataset.ob36QuickSlot)-Number(b.dataset.ob36QuickSlot)).map(select=>select.value);}
  function renderQuickSettings(ids=currentQuickIds()){
    const host=modalHost();if(!host)return;host.innerHTML=quickSettingsMarkup(ids);
    host.querySelectorAll('[data-ob36-quick-up]').forEach(button=>button.addEventListener('click',()=>{const rows=readSlotIds(host);const index=Number(button.dataset.ob36QuickUp);[rows[index-1],rows[index]]=[rows[index],rows[index-1]];renderQuickSettings(rows);}));
    host.querySelectorAll('[data-ob36-quick-down]').forEach(button=>button.addEventListener('click',()=>{const rows=readSlotIds(host);const index=Number(button.dataset.ob36QuickDown);[rows[index+1],rows[index]]=[rows[index],rows[index+1]];renderQuickSettings(rows);}));
    host.querySelector('[data-ob36-quick-save]')?.addEventListener('click',()=>{const normalized=normalizedQuickIds(readSlotIds(host));safeSet(homeModel().QUICK_STORE_KEY,JSON.stringify(normalized));closeHomeModal();modelApi?.invalidate?.('home');globalThis.OUTBASE_SHELL_V166?.render?.('data-change');toast('クイックアクションを更新しました');});
  }
  function openQuickSettings(){const host=openHomeModal('home-v36-quick',quickSettingsMarkup(currentQuickIds()));if(host)renderQuickSettings(currentQuickIds());}

  function openMemoTarget(target){safeSet('outbase_record_target',target);location.assign(`${location.pathname}?tab=record&sheet=memo`);}
  function openKotaWalk(){safeSet('outbase_record_target','コタ散歩');location.assign(`${location.pathname}?tab=record&sheet=start`);}
  function openGenericMemo(){safeSet('outbase_record_target','メモ');legacy?.openMemo?.();}
  function openGenericStart(){safeSet('outbase_record_target','未選択');legacy?.openStart?.();}
  function runQuick(action,element){
    if(action==='prep'){const url=element?.dataset?.ob36Url||'';location.assign(url||`${location.pathname}?tab=prep`);return true;}
    if(action==='walk-kota'){openKotaWalk();return true;}
    if(action==='memo'){openGenericMemo();return true;}
    if(action==='daily-cooking'){openCooking();return true;}
    if(action==='improvement-memo'){openMemoTarget('次回改善');return true;}
    if(action==='plan-add'){legacy?.openPlanAdd?.();return true;}
    if(action==='calendar'){router?.navigate?.('calendar');return true;}
    if(action==='search'){router?.navigate?.('search');return true;}
    if(action==='vault'){router?.navigate?.('vault');return true;}
    return false;
  }
  const homeBridge=Object.freeze({runQuick,openCooking,openQuickSettings,closeModal:closeHomeModal,toast,openMemoTarget,openKotaWalk,openGenericMemo,openGenericStart,readPrepCommon,cookingState,writeCooking,normalizedQuickIds});
  globalThis.OUTBASE_HOME_V36_BRIDGE=homeBridge;

  function requested(){return router?.shellRequested?.()===true;}
  function snapshot(){return Object.freeze({version:'v166.3-home-v36-r6',requested:requested(),mounted,route:router?.current?.()||null,safe:legacy?.shellSafe?.()??false,cutover:false,previewOnly:true});}
  function restoreBrowserScrollMode(){if(previousScrollRestoration!==null&&'scrollRestoration'in history)history.scrollRestoration=previousScrollRestoration;previousScrollRestoration=null;}
  function removeBoot(){document.documentElement.classList?.add?.('outbaseShellReady');document.documentElement.classList?.remove?.('outbaseShellBoot');document.getElementById('outbaseBootScreen')?.remove();}
  function fallback(reason){
    restoreBrowserScrollMode();document.documentElement.classList?.remove?.('outbaseShellBoot','outbaseShellReady');document.getElementById('outbaseBootScreen')?.remove();
    document.body.classList.remove('outbaseShellPreview');globalThis.OUTBASE_THEME_V166?.sync?.('shell-fallback');root?.remove();root=null;mounted=false;
    globalThis.dispatchEvent?.(new CustomEvent('outbase:v166-fallback',{detail:{reason,snapshot:snapshot()}}));globalThis.dispatchEvent?.(new CustomEvent('outbase:v165-fallback',{detail:{reason,snapshot:snapshot()}}));return {status:'fallback',reason};
  }
  function currentScrollY(){const number=Number(globalThis.scrollY??document.scrollingElement?.scrollTop??0);return Number.isFinite(number)&&number>0?Math.round(number):0;}
  function routeScrollTarget(reason,before){if(reason==='popstate'||reason==='replace-preserve')return router.savedScrollY?.()||0;if(['initial','push','replace'].includes(reason))return 0;return before;}
  function applyScroll(top){
    const value=Math.max(0,Number(top)||0);
    return new Promise(resolve=>{const run=()=>{const scroller=document.scrollingElement||document.documentElement||document.body;if(scroller)scroller.scrollTop=value;if(typeof globalThis.scrollTo==='function')globalThis.scrollTo(0,value);resolve(value);};if(typeof globalThis.requestAnimationFrame==='function')globalThis.requestAnimationFrame(run);else setTimeout(run,0);});
  }
  async function performRender(reason){if(!mounted||!root)return;const before=currentScrollY();const force=reason==='data-change';await renderer.mount(root,{force});await applyScroll(routeScrollTarget(reason,before));}
  function render(reason='refresh'){
    if(!mounted||!root)return Promise.resolve();pendingReason=reason;if(renderPromise)return renderPromise;
    renderPromise=(async()=>{while(pendingReason){const next=pendingReason;pendingReason=null;await performRender(next);}})().catch(error=>{console.error('[OUTBASE v166.3 HOME v36 r3] shell render failed',error);fallback('render_failed');}).finally(()=>{renderPromise=null;});return renderPromise;
  }
  function action(name){if(name==='plan-add')return legacy.openPlanAdd();if(name==='memo')return homeBridge.openGenericMemo();if(name==='start')return homeBridge.openGenericStart();if(name==='calendar')return router.navigate('calendar');}
  function navValues(element){return {activityId:element.dataset.ob5ActivityId||'',month:element.dataset.ob5Month||'',people:element.dataset.ob5People||''};}
  function schedulePreload(){const task=()=>{modelApi?.preload?.('vault');const month=new Date().toISOString().slice(0,7);modelApi?.preload?.('calendar',{month});};if(typeof requestIdleCallback==='function')requestIdleCallback(task,{timeout:1800});else setTimeout(task,900);}
  function refreshHome(){modelApi?.invalidate?.('home');return render('data-change');}

  function bind(){
    if(bound)return;bound=true;
    document.addEventListener('click',event=>{
      if(!mounted)return;
      const modalClose=event.target.closest?.('[data-ob36-modal-close]');if(modalClose){event.preventDefault();closeHomeModal();return;}
      const homeBackdrop=event.target.closest?.('[data-ob36-sheet-backdrop]');if(homeBackdrop&&event.target===homeBackdrop){event.preventDefault();closeHomeModal();return;}
      const settings=event.target.closest?.('[data-ob36-settings]');if(settings){event.preventDefault();homeBridge.openQuickSettings();return;}
      const notify=event.target.closest?.('[data-ob36-notify]');if(notify){event.preventDefault();homeBridge.toast('通知機能は接続準備中です');return;}
      const quick=event.target.closest?.('[data-ob36-quick]');if(quick){event.preventDefault();homeBridge.runQuick(quick.dataset.ob36Quick,quick);return;}
      const weatherScope=event.target.closest?.('[data-ob36-weather-scope]');if(weatherScope){event.preventDefault();safeSet(globalThis.OUTBASE_HOME_SCREEN_MODEL_V164.WEATHER_SCOPE_KEY,weatherScope.dataset.ob36WeatherScope==='current'?'current':'home');refreshHome();return;}
      const shellNav=event.target.closest?.('[data-ob5-nav]');if(shellNav){event.preventDefault();router.navigate(shellNav.dataset.ob5Route||'home',navValues(shellNav));return;}
      const route=event.target.closest?.('[data-ob3-route]');if(route){event.preventDefault();router.navigate(route.dataset.ob3Route);return;}
      const filter=event.target.closest?.('[data-ob5-filter]');if(filter){event.preventDefault();const current=router.current();const next=globalThis.OUTBASE_FAMILY_FILTER_DOMAIN_V165.toggle(current.people,filter.dataset.ob5Filter);router.navigate('calendar',{month:current.month,people:globalThis.OUTBASE_FAMILY_FILTER_DOMAIN_V165.serialize(next)},{replace:true,preserveScroll:true});return;}
      if(event.target.closest?.('[data-ob3-central]')){modals.open('central');renderer.showCentral();return;}
      if(event.target.closest?.('[data-ob3-close]')||event.target.matches?.('[data-ob3-backdrop]')){renderer.hideCentral();modals.close();return;}
      const button=event.target.closest?.('[data-ob3-action]');if(button){event.preventDefault();action(button.dataset.ob3Action);return;}
      const old=event.target.closest?.('[data-ob3-legacy]');if(old){event.preventDefault();const target=old.dataset.ob3Legacy;if(target==='search')legacy.openSearch();else if(target==='vault')legacy.openVault();else legacy.openLegacyHome();}
    },true);
    document.addEventListener('change',event=>{const select=event.target.closest?.('[data-ob36-weather-plan]');if(!select)return;safeSet(globalThis.OUTBASE_HOME_SCREEN_MODEL_V164.WEATHER_PLAN_KEY,select.value||'');refreshHome();},true);
    router.subscribe((_route,reason)=>render(reason));
    modals.subscribe((stack,reason)=>{if(!stack.length&&reason==='back'){clearHomeModal();renderer.hideCentral();}});
    addEventListener('online',()=>renderer.updateNetwork?.(root,true));addEventListener('offline',()=>renderer.updateNetwork?.(root,false));
  }
  async function start(){
    if(!requested())return {status:'not_requested',snapshot:snapshot()};
    if(!legacy.shellSafe())return fallback('active_session_protected');
    if('scrollRestoration'in history){previousScrollRestoration=history.scrollRestoration;history.scrollRestoration='manual';}
    root=document.getElementById('outbaseShellRoot');if(!root){root=document.createElement('div');root.id='outbaseShellRoot';root.hidden=true;document.body.insertBefore(root,document.body.firstChild);}
    document.body.classList.add('outbaseShellPreview');globalThis.OUTBASE_THEME_V166?.sync?.('shell-start');mounted=true;bind();await render('initial');if(!mounted||!root)return {status:'fallback',reason:'render_failed',snapshot:snapshot()};root.hidden=false;removeBoot();schedulePreload();
    const detail={status:'ready',version:'v166.3-home-v36-r6',previewOnly:true,cutover:false,route:router.current()};
    globalThis.dispatchEvent?.(new CustomEvent('outbase:v166-ready',{detail}));globalThis.dispatchEvent?.(new CustomEvent('outbase:v165-ready',{detail}));return detail;
  }
  const ready=start();
  const api=Object.freeze({ready,start,render,snapshot,fallback,applyScroll,routeScrollTarget});
  globalThis.OUTBASE_SHELL_V166=api;globalThis.OUTBASE_SHELL_V165=api;globalThis.OUTBASE_SHELL_V164=api;
})();
