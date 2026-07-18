(() => {
  'use strict';
  const router=globalThis.OUTBASE_ROUTER;
  const legacy=globalThis.OUTBASE_LEGACY_UI_V165;
  const renderer=globalThis.OUTBASE_SHELL_RENDERER_V166||globalThis.OUTBASE_SHELL_RENDERER_V165;
  const modals=globalThis.OUTBASE_MODAL_STACK_V164;
  const modelApi=globalThis.OUTBASE_SHELL_MODEL_V166||globalThis.OUTBASE_SHELL_MODEL_V165||globalThis.OUTBASE_SHELL_MODEL_V164;
  const PREP_COMMON_STORE_KEY='outbase_prep_common_v1';
  const WEATHER_PLACE_HISTORY_KEY='outbase_weather_place_history_v1';
  const WEATHER_PLACE_HISTORY_LIMIT=8;
  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  let root=null,mounted=false,bound=false,previousScrollRestoration=null,renderPromise=null,pendingReason=null;
  let weatherTimer=null,weatherRefreshing=false,radarTimer=null;
  let sheetSwipe=null;

  function modalHost(){return document.getElementById('outbaseShellModal');}
  function homeModel(){return globalThis.OUTBASE_HOME_SCREEN_MODEL_V164;}
  function safeSet(key,value){try{localStorage.setItem(key,String(value));return true;}catch(_error){return false;}}
  function safeGet(key,fallback=''){try{return localStorage.getItem(key)||fallback;}catch(_error){return fallback;}}
  function normalizePlaceHistoryValue(value){let text=String(value||'').trim();try{text=text.normalize('NFKC');}catch(_error){}return text.replace(/[　\s]+/g,' ').trim();}
  function placeHistoryKey(value){return normalizePlaceHistoryValue(value).replace(/[　\s・･]/g,'').toLowerCase();}
  function fixedWeatherPlaces(){return Object.freeze([{label:'現在地',value:'現在地'},{label:'自宅',value:'自宅'}]);}
  function readWeatherPlaceHistory(){
    try{
      const raw=JSON.parse(safeGet(WEATHER_PLACE_HISTORY_KEY,'[]')||'[]');const rows=Array.isArray(raw)?raw:[];const seen=new Set();const fixedKeys=new Set(fixedWeatherPlaces().map(item=>placeHistoryKey(item.value)));
      return rows.map(item=>normalizePlaceHistoryValue(typeof item==='string'?item:item?.value)).filter(value=>{const key=placeHistoryKey(value);if(!key||fixedKeys.has(key)||seen.has(key))return false;seen.add(key);return true;}).slice(0,WEATHER_PLACE_HISTORY_LIMIT);
    }catch(_error){return [];}
  }
  function writeWeatherPlaceHistory(rows){const values=[];const seen=new Set();const fixedKeys=new Set(fixedWeatherPlaces().map(item=>placeHistoryKey(item.value)));for(const item of rows||[]){const value=normalizePlaceHistoryValue(item);const key=placeHistoryKey(value);if(!key||fixedKeys.has(key)||seen.has(key))continue;seen.add(key);values.push(value);if(values.length>=WEATHER_PLACE_HISTORY_LIMIT)break;}return safeSet(WEATHER_PLACE_HISTORY_KEY,JSON.stringify(values));}
  function rememberWeatherPlace(value){const place=normalizePlaceHistoryValue(value);const key=placeHistoryKey(place);if(!key)return readWeatherPlaceHistory();const fixedKeys=new Set(fixedWeatherPlaces().map(item=>placeHistoryKey(item.value)));if(fixedKeys.has(key))return readWeatherPlaceHistory();const rows=readWeatherPlaceHistory().filter(item=>placeHistoryKey(item)!==key);rows.unshift(place);writeWeatherPlaceHistory(rows);return rows;}
  function removeWeatherPlaceHistory(value){const key=placeHistoryKey(value);const rows=readWeatherPlaceHistory().filter(item=>placeHistoryKey(item)!==key);writeWeatherPlaceHistory(rows);return rows;}
  function clearWeatherPlaceHistory(){safeSet(WEATHER_PLACE_HISTORY_KEY,'[]');return [];}
  function weatherPlaceHistoryMarkup(){
    const fixed=fixedWeatherPlaces().map(item=>`<button type="button" class="ob36-place-choice fixed" data-ob36-place-history-select="${esc(item.value)}" aria-label="${esc(item.label)}を選択">${esc(item.label)}</button>`).join('');
    const rows=readWeatherPlaceHistory();const recent=rows.map(value=>`<span class="ob36-place-choice recent" role="group" aria-label="${esc(value)}"><button type="button" class="label" data-ob36-place-history-select="${esc(value)}" aria-label="${esc(value)}を選択">${esc(value)}</button><button type="button" class="remove" data-ob36-place-history-remove="${esc(value)}" aria-label="${esc(value)}を履歴から削除">×</button></span>`).join('');
    return `<div class="ob36-place-history"><div class="ob36-place-history-head"><span>場所を選ぶ</span>${rows.length?'<button type="button" data-ob36-place-history-clear>履歴をすべて削除</button>':''}</div><div class="ob36-place-history-list" role="list">${fixed}${recent}</div></div>`;
  }
  function clearRadarTimer(){if(radarTimer){clearTimeout(radarTimer);radarTimer=null;}}
  function clearHomeModal(){clearRadarTimer();const host=modalHost();if(host)host.innerHTML='';document.body.classList.remove('ob36-modal-open');}
  function closeHomeModal({historyBack=true}={}){
    clearHomeModal();
    const top=modals?.top?.();
    if(top?.id?.startsWith?.('home-v36-'))modals.close({historyBack});
  }
  function openHomeModal(id,markup){
    const host=modalHost();if(!host)return null;
    const top=modals?.top?.();if(top?.id?.startsWith?.('home-v36-')&&top.id!==id)modals?.close?.({historyBack:false});
    host.innerHTML=markup;document.body.classList.add('ob36-modal-open');
    if(modals?.top?.()?.id!==id)modals?.open?.(id);
    return host;
  }
  const DISMISS_SHEET_SELECTOR='.ob36-sheet,.ob3-sheet,[role="dialog"][class*="sheet"]';
  const DISMISS_HANDLE_SELECTOR='.ob36-sheet-grab,.ob3-sheet-handle,.ob3-sheet-grab,[class*="sheet-grab"],[class*="sheet-handle"]';
  function sheetBackdrop(sheet){return sheet?.closest?.('[data-ob36-sheet-backdrop],[data-ob3-backdrop],.ob36-sheet-backdrop,.ob3-backdrop,[class*="sheet-backdrop"]')||null;}
  function resetSheetPosition(sheet,{animate=true}={}){
    if(!sheet)return;
    sheet.style.transition=animate?'transform .2s ease,opacity .2s ease':'none';sheet.style.transform='';sheet.style.opacity='';sheet.classList.remove('ob-swipe-tracking','ob-swipe-closing');
    const backdrop=sheetBackdrop(sheet);if(backdrop){backdrop.style.transition=animate?'background-color .2s ease':'none';backdrop.style.backgroundColor='';}
    if(animate)setTimeout(()=>{if(!sheet.isConnected)return;sheet.style.transition='';const current=sheetBackdrop(sheet);if(current)current.style.transition='';},220);
  }
  function dismissSheet(sheet){
    if(!sheet)return;
    if(sheet.closest?.('#outbaseShellModal')||sheet.classList.contains('ob36-sheet')){closeHomeModal();return;}
    if(sheet.classList.contains('ob3-sheet')||sheet.closest?.('[data-ob3-backdrop]')){renderer?.hideCentral?.();modals?.close?.();return;}
    const close=sheet.querySelector?.('[data-ob36-modal-close],[data-ob3-close],[data-close],[aria-label="閉じる"]');if(close){close.click();return;}
    const backdrop=sheetBackdrop(sheet);if(backdrop){backdrop.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));}
  }
  function finishSheetSwipe(cancelled=false){
    const state=sheetSwipe;sheetSwipe=null;if(!state)return;
    const elapsed=Math.max(1,performance.now()-state.startedAt);const velocity=state.dy/elapsed;const shouldClose=!cancelled&&state.dy>=72&&(state.dy>=112||velocity>=.48);
    if(!shouldClose){resetSheetPosition(state.sheet);return;}
    state.sheet.classList.add('ob-swipe-closing');state.sheet.style.transition='transform .2s ease-in,opacity .2s ease-in';state.sheet.style.transform='translate3d(0,110dvh,0)';state.sheet.style.opacity='.45';
    const backdrop=sheetBackdrop(state.sheet);if(backdrop){backdrop.style.transition='background-color .2s ease-in';backdrop.style.backgroundColor='rgba(20,25,22,0)';}
    setTimeout(()=>dismissSheet(state.sheet),190);
  }
  function bindSheetSwipeDismiss(){
    document.addEventListener('pointerdown',event=>{
      if(!mounted||event.isPrimary===false||event.button>0)return;
      const sheet=event.target.closest?.(DISMISS_SHEET_SELECTOR);if(!sheet)return;
      const rect=sheet.getBoundingClientRect();const handle=event.target.closest?.(DISMISS_HANDLE_SELECTOR);const header=event.target.closest?.('header,.ob3-sheet-head,[class*="sheet-head"]');const interactive=event.target.closest?.('button,input,select,textarea,a,[contenteditable="true"]');
      if(!handle&&(!header||interactive||event.clientY>rect.top+112))return;
      if(!handle&&Number(sheet.scrollTop||0)>1)return;
      sheetSwipe={sheet,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,dy:0,startedAt:performance.now(),dragging:false};
      resetSheetPosition(sheet,{animate:false});try{sheet.setPointerCapture?.(event.pointerId);}catch(_error){}
    },true);
    document.addEventListener('pointermove',event=>{
      const state=sheetSwipe;if(!state||event.pointerId!==state.pointerId)return;
      const dx=event.clientX-state.startX;const dy=Math.max(0,event.clientY-state.startY);state.dy=dy;
      if(!state.dragging){if(dy<8)return;if(Math.abs(dx)>dy*.9){finishSheetSwipe(true);return;}state.dragging=true;state.sheet.classList.add('ob-swipe-tracking');}
      event.preventDefault();const eased=Math.min(dy,Math.max(140,innerHeight*.55));state.sheet.style.transform=`translate3d(0,${eased}px,0)`;state.sheet.style.opacity=String(Math.max(.62,1-eased/700));
      const backdrop=sheetBackdrop(state.sheet);if(backdrop)backdrop.style.backgroundColor=`rgba(20,25,22,${Math.max(0,.25-eased/900)})`;
    },{capture:true,passive:false});
    document.addEventListener('pointerup',event=>{if(sheetSwipe&&event.pointerId===sheetSwipe.pointerId)finishSheetSwipe(false);},true);
    document.addEventListener('pointercancel',event=>{if(sheetSwipe&&event.pointerId===sheetSwipe.pointerId)finishSheetSwipe(true);},true);
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


  function appSettingsMarkup(){
    return `<div class="ob36-sheet-backdrop" data-ob36-sheet-backdrop><section class="ob36-sheet" role="dialog" aria-modal="true" aria-label="設定"><div class="ob36-sheet-grab"></div><header><div><small>OUTBASE SETTINGS</small><h2>設定</h2></div><button type="button" data-ob36-modal-close aria-label="閉じる">×</button></header><div class="ob36-settings-menu"><button type="button" data-ob36-open-weather-settings><span><b>天気設定</b><small>外部予報サイト・場所の優先順</small></span><em>›</em></button><button type="button" data-ob36-open-quick-settings><span><b>クイックアクション</b><small>HOMEの5枠と並び順</small></span><em>›</em></button></div></section></div>`;
  }
  function openAppSettings(){
    const host=openHomeModal('home-v36-settings',appSettingsMarkup());if(!host)return;
    host.querySelector('[data-ob36-open-weather-settings]')?.addEventListener('click',openWeatherSettings);
    host.querySelector('[data-ob36-open-quick-settings]')?.addEventListener('click',openQuickSettings);
  }
  function weatherSettingsMarkup(){
    const api=homeModel();const value=api?.weatherSettings?.()||{primary:'weathernews',compare:['tenki','yahoo','sototenki'],locationMode:'plan',sources:[]};
    const options=(value.sources||api?.WEATHER_SOURCES||[]).map(item=>`<option value="${esc(item.id)}"${item.id===value.primary?' selected':''}>${esc(item.label)}</option>`).join('');
    const compare=(value.sources||api?.WEATHER_SOURCES||[]).map(item=>`<label><input type="checkbox" data-ob36-weather-compare value="${esc(item.id)}"${value.compare.includes(item.id)?' checked':''}${item.id===value.primary?' disabled':''}><span>${esc(item.label)}</span></label>`).join('');
    return `<div class="ob36-sheet-backdrop" data-ob36-sheet-backdrop><section class="ob36-sheet" role="dialog" aria-modal="true" aria-label="天気設定"><div class="ob36-sheet-grab"></div><header><div><small>WEATHER SOURCES</small><h2>天気設定</h2></div><button type="button" data-ob36-modal-close aria-label="閉じる">×</button></header><div class="ob36-weather-source-note"><b>自動取得</b><span>Open-Meteo（予報モデルは地点に合わせて自動選択）</span></div><div class="ob36-weather-settings"><fieldset><legend>最初に表示する外部予報サイト</legend><select data-ob36-weather-primary>${options}</select></fieldset><fieldset><legend>時間別画面に表示する外部予報サイト</legend>${compare}</fieldset><fieldset><legend>最初に使う場所</legend><label><input type="radio" name="ob36WeatherLocation" value="plan"${value.locationMode==='plan'?' checked':''}>予定の場所</label><label><input type="radio" name="ob36WeatherLocation" value="home"${value.locationMode==='home'?' checked':''}>自宅</label><label><input type="radio" name="ob36WeatherLocation" value="current"${value.locationMode==='current'?' checked':''}>現在地</label></fieldset></div><button class="ob36-sheet-done" type="button" data-ob36-weather-settings-save>保存</button></section></div>`;
  }
  function openWeatherSettings(){
    const host=openHomeModal('home-v36-weather-settings',weatherSettingsMarkup());if(!host)return;
    const primary=host.querySelector('[data-ob36-weather-primary]');
    primary?.addEventListener('change',()=>host.querySelectorAll('[data-ob36-weather-compare]').forEach(box=>{box.disabled=box.value===primary.value;if(box.disabled)box.checked=false;}));
    host.querySelector('[data-ob36-weather-settings-save]')?.addEventListener('click',()=>{
      const api=homeModel();const selectedPrimary=primary?.value||'weathernews';const compare=[...host.querySelectorAll('[data-ob36-weather-compare]:checked')].map(box=>box.value).filter(id=>id!==selectedPrimary);const mode=host.querySelector('input[name="ob36WeatherLocation"]:checked')?.value||'plan';
      safeSet(api.WEATHER_SOURCE_PRIMARY_KEY,selectedPrimary);safeSet(api.WEATHER_SOURCE_COMPARE_KEY,JSON.stringify(compare));safeSet(api.WEATHER_LOCATION_MODE_KEY,mode);closeHomeModal();refreshHome();toast('天気設定を保存しました');
    });
  }
  function isoDate(value){const d=new Date(value||Date.now());return Number.isNaN(d.getTime())?'':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function detailTime(value){const d=new Date(value||'');if(Number.isNaN(d.getTime()))return '—';return `${String(d.getHours()).padStart(2,'0')}時`;}
  function detailDate(value){const d=new Date(value||'');if(Number.isNaN(d.getTime()))return '日付未設定';return `${d.getMonth()+1}/${d.getDate()}（${'日月火水木金土'[d.getDay()]}）`;}
  function detailWeatherIcon(condition){
    const text=String(condition||'');
    const defs='<defs><radialGradient id="ob36DetailSun"><stop offset="0" stop-color="#fff7a6"/><stop offset=".62" stop-color="#ffd653"/><stop offset="1" stop-color="#f5aa19"/></radialGradient><linearGradient id="ob36DetailCloud" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff"/><stop offset=".58" stop-color="#f4f7f8"/><stop offset="1" stop-color="#dbe3e6"/></linearGradient></defs>';
    const sun='<circle cx="22" cy="21" r="11" fill="url(#ob36DetailSun)" stroke="#dda014" stroke-width="1.4"/><path d="M22 3v6M22 33v6M4 21h6M34 21h6M9 8l4 4M31 30l4 4M35 8l-4 4" stroke="#dda014" stroke-width="1.55" stroke-linecap="round"/>';
    const cloud='<path d="M17 47h31a8 8 0 0 0 0-16 12 12 0 0 0-22-2 9 9 0 0 0-9 18Z" fill="url(#ob36DetailCloud)" stroke="#afb9bd"/>';
    const shell=body=>`<svg class="ob36-weather-reference ob36-weather-glyph" viewBox="0 0 64 56" aria-hidden="true">${defs}${body}</svg>`;
    if(text.includes('雷'))return shell(cloud+'<path d="m31 43-5 8h5l-2 5 10-10h-6l3-3Z" fill="#efb528" stroke="#cc8614"/><path d="m20 49-2 5m27-5-2 5" stroke="#438fc5" stroke-width="2" stroke-linecap="round"/>');
    if(text.includes('雨'))return shell(cloud+'<path d="m23 49-2 5m10-5-2 5m10-5-2 5" stroke="#438fc5" stroke-width="2.2" stroke-linecap="round"/>');
    if(text.includes('晴')&&text.includes('くも'))return shell(sun+cloud);
    if(text.includes('晴'))return shell('<circle cx="32" cy="28" r="14" fill="url(#ob36DetailSun)" stroke="#dda014" stroke-width="1.5"/><path d="M32 5v8M32 43v8M9 28h8M47 28h8M16 12l6 6M42 38l6 6M48 12l-6 6M22 38l-6 6" stroke="#dda014" stroke-width="2" stroke-linecap="round"/>');
    return shell(cloud);
  }
  function weatherTone(kind,value){const n=Number(value);if(kind==='temperature'){if(n>=35)return 'danger';if(n>=28)return 'warm';if(n<10)return 'cool';return 'good';}if(kind==='rain'){if(n>=70)return 'danger';if(n>=40)return 'watch';if(n>=20)return 'info';return 'good';}if(kind==='wind'){if(n>=8)return 'danger';if(n>=4)return 'watch';return 'good';}if(kind==='confidence'){const text=String(value||'');if(/^A/.test(text))return 'good';if(/^B/.test(text))return 'watch';return 'danger';}return 'info';}
  function radarService(){return globalThis.OUTBASE_WEATHER_RADAR_V1||null;}
  const RADAR_HORIZON_KEY='outbase_rain_horizon_v1';
  function radarHorizon(value=null){const n=Number(value??safeGet(RADAR_HORIZON_KEY,'6'));return [1,3,6,12,24].includes(n)?n:6;}
  function radarTileMarkup(map){
    if(!map)return '';
    const tiles=(map.tiles||[]).map(tile=>`<span class="ob36-radar-tile" style="left:${tile.dx*256}px;top:${tile.dy*256}px"><img class="base" src="${esc(tile.baseUrl)}" alt="" loading="lazy"><img class="rain" src="${esc(tile.radarUrl)}" alt="" loading="lazy"></span>`).join('');
    return `<div class="ob36-radar-map"><div class="ob36-radar-map-grid" style="left:calc(50% - ${Number(map.centerX).toFixed(2)}px);top:calc(50% - ${Number(map.centerY).toFixed(2)}px)">${tiles}</div><span class="ob36-radar-pin" aria-label="対象地点"></span><div class="ob36-radar-map-caption"><b>雨雲の現在</b><small>${esc(new Date(map.frameTime).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}))}更新</small></div></div>`;
  }
  function rainTimelineMarkup(view){
    const rows=(view?.rows||[]).slice(0,25);if(!rows.length)return '<p class="ob36-radar-empty">この時間帯の降水予報はまだありません。</p>';
    return `<div class="ob36-rain-timeline">${rows.map(row=>{const probability=Math.max(0,Math.min(100,Number(row.rainProbability)||0));const rainfall=Math.max(0,Number(row.rainfall)||0);const level=rainfall>=5||probability>=80?'danger':rainfall>=1||probability>=50?'watch':probability>=20?'info':'good';return `<article class="tone-${level}"><time>${esc(detailTime(row.at))}</time><span class="ob36-rain-bar"><i style="height:${Math.max(5,probability)}%"></i></span><b>${Math.round(probability)}%</b><small>${rainfall.toFixed(1)}mm</small></article>`;}).join('')}</div>`;
  }
  function rainRadarMarkup(view){
    if(!view)return '';
    const buttons=(view.horizons||[1,3,6,12,24]).map(value=>`<button type="button" class="${Number(value)===Number(view.horizon)?'active':''}" data-ob36-radar-horizon="${value}">${value}時間</button>`).join('');
    const map=view.map?radarTileMarkup(view.map):`<div class="ob36-radar-unavailable"><b>${view.radarApplicable?'レーダーを取得しています':'予定日のレーダーはまだありません'}</b><p>${esc(view.note||'')}</p></div>`;
    const summary=view.summary||{};
    return `<section class="ob36-radar-section" data-ob36-radar-host><div class="ob36-detail-section-head"><h3>雨雲レーダー・この先の雨</h3><span>標準 ${esc(view.horizon)}時間</span></div><div class="ob36-radar-horizons">${buttons}</div>${map}<div class="ob36-radar-summary"><div><small>降り始め</small><b>${esc(summary.start||'—')}</b></div><div><small>強まり</small><b>${esc(summary.peak||'—')}</b></div><div><small>止みそう</small><b>${esc(summary.stop||'—')}</b></div><div><small>最大確率</small><b>${summary.maxProbability==null?'—':esc(summary.maxProbability)+'%'}</b></div><div><small>降水量予測</small><b>${summary.totalRainfall==null?'—':esc(summary.rainfallLabel||rainfallLabel(summary.totalRainfall,summary.maxProbability))}</b></div><div><small>選択範囲の確度</small><b>${esc(confidenceLabel(summary.confidence))}</b></div></div><p class="ob36-radar-message">${esc(summary.message||'')} ${esc(view.note||'')}</p>${rainTimelineMarkup(view)}<div class="ob36-radar-actions"><button type="button" data-ob36-radar-refresh>最新に更新</button><button type="button" data-ob36-radar-jma="${esc(view.jmaUrl||'https://www.jma.go.jp/bosai/nowc/')}">気象庁の1時間先</button></div><small class="ob36-radar-source">レーダー：RainViewer　予報：Open-Meteo　地図：© OpenStreetMap contributors</small></section>`;
  }
  function bindRainRadar(host,{detail,mode='today',place='',start='',end='',horizon=6,radarStartAt=null}={}){
    const service=radarService();if(!service)return;
    host.querySelectorAll('[data-ob36-radar-horizon]').forEach(button=>button.addEventListener('click',()=>{const next=radarHorizon(button.dataset.ob36RadarHorizon);safeSet(RADAR_HORIZON_KEY,next);openWeatherDetail({mode,place,start,end,horizon:next,skipFetch:true,skipRadarFetch:true});}));
    host.querySelector('[data-ob36-radar-jma]')?.addEventListener('click',event=>{const url=event.currentTarget.dataset.ob36RadarJma;window.open(url,'_blank','noopener,noreferrer');});
    host.querySelector('[data-ob36-radar-refresh]')?.addEventListener('click',async()=>{try{await service.refresh({force:true});toast('雨雲レーダーを更新しました');}catch(_error){toast('レーダーを更新できませんでした');}openWeatherDetail({mode,place,start,end,horizon,skipFetch:true,skipRadarFetch:true});});
    clearRadarTimer();radarTimer=setTimeout(async()=>{const activeHost=modalHost();if(!activeHost?.querySelector?.('[data-ob36-radar-host]'))return;try{await service.refresh({force:true});const nextView=service.view(detail,{horizon,startAt:radarStartAt,mode});const current=activeHost.querySelector('[data-ob36-radar-host]');if(current)current.outerHTML=rainRadarMarkup(nextView);bindRainRadar(activeHost,{detail,mode,place,start,end,horizon,radarStartAt});}catch(_error){bindRainRadar(activeHost,{detail,mode,place,start,end,horizon,radarStartAt});}},service.REFRESH_MS||300000);
  }
  function externalLinksService(){return globalThis.OUTBASE_WEATHER_EXTERNAL_LINKS_V1||null;}
  function externalWeatherIcon(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.2 2.2 3.3 4.9 3.3 8S14.2 17.8 12 20M12 4c-2.2 2.2-3.3 4.9-3.3 8s1.1 5.8 3.3 8"/></svg>';}
  function externalWeatherMarkup(detail){
    const service=externalLinksService();if(!service)return '';
    const providerIds=Array.isArray(detail?.externalProviderIds)&&detail.externalProviderIds.length?detail.externalProviderIds:['weathernews','tenki','yahoo','sototenki'];
    const rows=service.getLinks({place:detail?.place||'',latitude:detail?.latitude,longitude:detail?.longitude,type:detail?.activityType||'',providerIds});
    const cards=rows.map(row=>{
      const mainAction=row.ready?`data-ob36-external-open="${esc(row.directUrl)}"`:row.id==='weathernews'?`data-ob36-external-search="${esc(row.searchUrl)}"`:`data-ob36-external-config="${esc(row.id)}"`;
      const editActions=row.id==='weathernews'?'':`<div class="ob36-external-card-actions"><button type="button" data-ob36-external-config="${esc(row.id)}">${row.ready?'変更':'設定'}</button>${row.source==='saved'?`<button type="button" class="danger" data-ob36-external-remove="${esc(row.id)}" data-ob36-external-label="${esc(row.label)}">解除</button>`:''}</div>`;
      return `<article class="ob36-external-card ${row.ready?'is-ready':'needs-setup'} ${row.id==='weathernews'?'not-editable':''}"><button type="button" class="ob36-external-main" ${mainAction}><span class="ob36-external-symbol">${externalWeatherIcon()}</span><span><b>${esc(row.label)}</b><small>${esc(row.ready?'この場所の詳細天気を開く':'初回だけリンクを設定')}</small></span><em>${esc(row.statusLabel)}</em></button>${editActions}</article>`;
    }).join('');
    return `<section class="ob36-external-weather"><div class="ob36-detail-section-head"><h3>他の予報でも確認</h3><button type="button" class="ob36-external-edit-toggle" data-ob36-external-edit-toggle aria-expanded="false">編集</button></div><div class="ob36-external-grid">${cards}</div><p>未登録はカードから初回設定。保存済みリンクの変更・解除は「編集」から行います。</p></section>`;
  }
  function externalSetupMarkup({provider,detail}={}){
    const service=externalLinksService();const search=service?.searchUrl?.(provider?.id,detail?.place||'',detail?.activityType||'')||'';
    return `<div class="ob36-sheet-backdrop" data-ob36-sheet-backdrop><section class="ob36-sheet ob36-external-setup-sheet" role="dialog" aria-modal="true" aria-label="外部予報リンク設定"><div class="ob36-sheet-grab"></div><header><div><small>EXTERNAL WEATHER</small><h2>${esc(provider?.label||'外部予報')}を設定</h2></div><button type="button" data-ob36-external-back aria-label="戻る">×</button></header><div class="ob36-external-target"><small>対象地点</small><b>${esc(detail?.place||'場所未設定')}</b></div><div class="ob36-external-steps"><div><i>1</i><span><b>サイトで対象地点を探す</b><small>1時間天気やピンポイント天気のページを開きます。</small></span></div><button type="button" data-ob36-external-site-search="${esc(search)}">${esc(provider?.label||'外部サイト')}で探す</button><div><i>2</i><span><b>見つけたページのURLを貼る</b><small>ブラウザのアドレスをコピーしてOUTBASEへ戻ります。</small></span></div><input type="url" data-ob36-external-url placeholder="https://…/1hour…" inputmode="url" autocomplete="off"></div><p class="ob36-external-validation" data-ob36-external-validation></p><button class="ob36-sheet-done" type="button" data-ob36-external-save>保存して直接開けるようにする</button></section></div>`;
  }
  function openExternalWeatherSetup({providerId,detail,mode='plan',place='',start='',end=''}={}){
    const service=externalLinksService();const provider=(service?.PROVIDERS||[]).find(item=>item.id===providerId);if(!provider)return;
    const host=openHomeModal('home-v36-external-weather',externalSetupMarkup({provider,detail}));if(!host)return;
    const back=()=>openWeatherDetail({mode,place,start,end,skipFetch:true});
    host.querySelector('[data-ob36-external-back]')?.addEventListener('click',back);
    host.querySelector('[data-ob36-external-site-search]')?.addEventListener('click',event=>service.open?.(event.currentTarget.dataset.ob36ExternalSiteSearch));
    host.querySelector('[data-ob36-external-save]')?.addEventListener('click',()=>{
      const input=host.querySelector('[data-ob36-external-url]');const message=host.querySelector('[data-ob36-external-validation]');
      try{service.saveLink({place:detail?.place||place,latitude:detail?.latitude,longitude:detail?.longitude,providerId,url:input?.value||''});toast(`${provider.label}を登録しました`);back();}
      catch(error){if(message)message.textContent=error?.message==='invalid_weather_link_provider'?`${provider.label}のURLを貼り付けてください。`:'1時間天気またはピンポイント天気のURLを確認してください。';input?.focus();}
    });
  }
  function bindExternalWeatherLinks(host,{detail,mode='plan',place='',start='',end=''}={}){
    const service=externalLinksService();if(!service)return;
    const section=host.querySelector('.ob36-external-weather');const toggle=host.querySelector('[data-ob36-external-edit-toggle]');
    toggle?.addEventListener('click',()=>{const editing=!section?.classList.contains('is-editing');section?.classList.toggle('is-editing',editing);toggle.setAttribute('aria-expanded',editing?'true':'false');toggle.textContent=editing?'完了':'編集';});
    host.querySelectorAll('[data-ob36-external-open]').forEach(button=>button.addEventListener('click',()=>service.open?.(button.dataset.ob36ExternalOpen)));
    host.querySelectorAll('[data-ob36-external-search]').forEach(button=>button.addEventListener('click',()=>service.open?.(button.dataset.ob36ExternalSearch)));
    host.querySelectorAll('[data-ob36-external-config]').forEach(button=>button.addEventListener('click',()=>openExternalWeatherSetup({providerId:button.dataset.ob36ExternalConfig,detail,mode,place,start,end})));
    host.querySelectorAll('[data-ob36-external-remove]').forEach(button=>button.addEventListener('click',()=>{const label=button.dataset.ob36ExternalLabel||'外部予報';if(globalThis.confirm&&!globalThis.confirm(`${label}の保存リンクを解除しますか？`))return;const ok=service.removeLink?.({place:detail?.place||place,latitude:detail?.latitude,longitude:detail?.longitude,providerId:button.dataset.ob36ExternalRemove});toast(ok?`${label}の保存リンクを解除しました`:`${label}を解除できませんでした`);openWeatherDetail({mode,place,start,end,skipFetch:true,skipRadarFetch:true});}));
  }
  function hourlyTimeLabel(row){return detailTime(row?.at||'');}
  function hourlyDateKey(row){const date=new Date(row?.at||'');return Number.isNaN(date.getTime())?'':`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
  function hourlyDateLabel(row){const date=new Date(row?.at||'');if(Number.isNaN(date.getTime()))return detailDate(row?.at||'');return `${date.getMonth()+1}/${date.getDate()}（${['日','月','火','水','木','金','土'][date.getDay()]}）`;}
  function hourlyNumber(value,fallback=0){const number=Number(value);return Number.isFinite(number)?number:fallback;}
  function rainfallLabel(value,probability=0){const amount=Number(value);const chance=Number(probability)||0;if(!Number.isFinite(amount))return '—';if(amount>0&&amount<0.1)return '0.1mm未満';if(amount===0&&chance>=40)return '微量予測';return `${amount}mm`;}
  function confidenceLabel(value){const text=String(value||'—').replaceAll('-','−');if(/^A/.test(text))return '高い';if(/^B/.test(text))return '標準';if(/^C/.test(text))return '変わりやすい';return '未判定';}
  function hourlyHighlights(rows){
    const list=Array.isArray(rows)?rows:[];if(!list.length)return [];
    const rain=[...list].sort((a,b)=>hourlyNumber(b.rainProbability)-hourlyNumber(a.rainProbability))[0];
    const wind=[...list].sort((a,b)=>hourlyNumber(b.windGust,b.windAverage)-hourlyNumber(a.windGust,a.windAverage))[0];
    const hot=[...list].sort((a,b)=>hourlyNumber(b.feelsLike,b.temperature)-hourlyNumber(a.feelsLike,a.temperature))[0];
    const daytime=list.filter(row=>{const hour=new Date(row.at||'').getHours();return hour>=5&&hour<=22;});
    const calm=[...(daytime.length?daytime:list)].sort((a,b)=>{
      const score=row=>hourlyNumber(row.rainProbability)*1.2+hourlyNumber(row.windAverage)*10+Math.max(0,hourlyNumber(row.feelsLike,row.temperature)-28)*5+Math.max(0,12-hourlyNumber(row.feelsLike,row.temperature))*2;
      return score(a)-score(b);
    })[0];
    const rainValue=hourlyNumber(rain?.rainProbability);
    const windAverage=hourlyNumber(wind?.windAverage);
    const hotValue=hourlyNumber(hot?.feelsLike,hot?.temperature);
    return [
      {label:'雨',value:rainValue>=70?`${hourlyTimeLabel(rain)}頃は雨具を準備`:rainValue>=40?'雨具があると安心':'大きな雨の心配は小さめ',detail:'詳しい確率は時間カードで確認',tone:rainValue>=70?'watch':'good'},
      {label:'風',value:windAverage>=5?'風の強まる時間に注意':'風は概ね穏やか',detail:'平均風速を基準に判断',tone:windAverage>=5?'watch':'good'},
      {label:'暑さ',value:hotValue>=30?'昼は日陰と水分補給':hotValue>=26?'暑さ対策があると安心':'過ごしやすい見込み',detail:hotValue>=30?`${hourlyTimeLabel(hot)}頃に暑さが強まる見込み`:'時間ごとの体感を確認',tone:hotValue>=35?'danger':hotValue>=26?'watch':'good'},
      {label:'おすすめの時間',value:`${hourlyTimeLabel(calm)}頃`,detail:'雨・風・体感が比較的穏やか',tone:'good'}
    ];
  }
  function hourlyCardMarkup(row,index,previousDate=''){
    const dateKey=hourlyDateKey(row);const showDate=dateKey&&dateKey!==previousDate;
    return `<button type="button" class="ob36-hourly-card ${index===0?'active':''}" data-ob36-hourly-card data-hourly-index="${index}" data-hourly-step="${index%3===0?'3':'1'}" aria-pressed="${index===0?'true':'false'}"><small class="ob36-hourly-card-date">${showDate?esc(hourlyDateLabel(row)):'　'}</small><time>${esc(hourlyTimeLabel(row))}</time><span class="ob36-hourly-card-icon">${detailWeatherIcon(row.condition)}</span><b class="tone-${weatherTone('temperature',row.temperature)}">${esc(row.temperature)}°</b><small class="tone-${weatherTone('rain',row.rainProbability)}">雨 ${esc(row.rainProbability)}%</small><small class="tone-${weatherTone('wind',row.windAverage)}">風 ${esc(row.windAverage)}m/s</small></button>`;
  }
  function hourlySelectedMarkup(row,index=0){
    if(!row)return '<div class="ob36-hourly-selected-empty">時間を選ぶと詳しい内容を表示します。</div>';
    return `<article class="ob36-hourly-selected" data-ob36-hourly-selected><div class="ob36-hourly-selected-head"><div><small>${esc(hourlyDateLabel(row))}</small><h4>${esc(hourlyTimeLabel(row))}　${esc(row.condition)}</h4></div><span>${detailWeatherIcon(row.condition)}</span></div><div class="ob36-hourly-selected-grid"><div><b class="tone-${weatherTone('temperature',row.temperature)}">${esc(row.temperature)}°</b><small>気温</small></div><div><b class="tone-${weatherTone('temperature',row.feelsLike)}">${esc(row.feelsLike)}°</b><small>体感</small></div><div><b class="tone-${weatherTone('rain',row.rainProbability)}">${esc(row.rainProbability)}%</b><small>降水確率</small></div><div><b>${esc(rainfallLabel(row.rainfall,row.rainProbability))}</b><small>降水量予測</small></div><div><b class="tone-${weatherTone('wind',row.windAverage)}">${esc(row.windAverage)}m/s</b><small>平均風速</small></div><div><b class="tone-${weatherTone('wind',row.windGust)}">${esc(row.windGust)}m/s</b><small>最大瞬間</small></div><div><b>${esc(row.windDirection)}</b><small>風向</small></div><div><b class="tone-${weatherTone('confidence',row.confidence)}">${esc(confidenceLabel(row.confidence))}</b><small>その時間の確度</small></div></div></article>`;
  }
  function hourlyOverviewMarkup(rows){
    const list=Array.isArray(rows)?rows:[];let previousDate='';const cards=[];
    list.forEach((row,index)=>{const key=hourlyDateKey(row);cards.push(hourlyCardMarkup(row,index,previousDate));if(key)previousDate=key;});
    const highlights=hourlyHighlights(list).map(item=>`<div><small>${item.label}</small><span><b class="tone-${item.tone}">${item.value}</b><em>${item.detail||''}</em></span></div>`).join('');
    return `<section class="ob36-hourly-section"><div class="ob36-detail-section-head"><h3>時間ごとの予報</h3><span>横で流れを見る</span></div><div class="ob36-hourly-points"><h4>この期間のポイント</h4><div class="ob36-hourly-highlights">${highlights}</div></div><div class="ob36-hourly-density" role="group" aria-label="時間間隔"><button type="button" class="active" data-ob36-hourly-density="3">3時間ごと</button><button type="button" data-ob36-hourly-density="1">1時間ごと</button></div><div class="ob36-hourly-rail" data-ob36-hourly-rail>${cards.join('')||'<p class="ob36-intel-empty">この期間の時間別予報はまだありません。</p>'}</div>${hourlySelectedMarkup(list[0],0)}</section>`;
  }
  function weatherDetailMarkup(detail){
    if(!detail||detail.status==='loading')return `<section class="ob36-detail-empty"><b>予報を取得しています</b><p>場所と日付を確認して最新データへ接続します。</p></section>`;
    const hourlyRows=Array.isArray(detail.hourly)?detail.hourly:[];
    const judgements=(detail.judgements||[]).map(row=>`<div><b>${esc(row.label==='外活動'?'外で過ごしやすい時間':row.label)}</b><span><strong>${esc(row.value)}</strong><small>${esc(row.detail)}</small></span></div>`).join('');
    const comparisons=(detail.comparisons||[]).map(row=>`<div><b>${esc(row.source)}</b><span>${esc(row.summary||'取得済み')}</span><em>${row.status==='reference'?'確認先':`${esc(row.rainProbability)}%・瞬間${esc(row.windGust)}m/s`}</em></div>`).join('');
    const rain=Number(detail.rainPeak)||0;
    const maxAverage=hourlyRows.reduce((m,row)=>Math.max(m,Number(row.windAverage)||0),0);
    const gust=Number(detail.windGust)||0;
    const rainText=rain>=80?'雨の時間あり':rain>=40?'雨具があると安心':rain>=20?'にわか雨に注意':'雨の心配は小さめ';
    const rainSub=rain>=80?'一時的に強まる可能性':rain>=40?'時間帯により降る可能性':'予定全体では大きな崩れなし';
    const windText=maxAverage>=8?'風が強い時間あり':maxAverage>=5?'風に注意':maxAverage>=3?'やや風あり':'風は概ね穏やか';
    const windSub=gust>=10?`突風は最大${gust}m/s予測`:`平均最大${maxAverage.toFixed(1)}m/s・突風は補足値`;
    const weatherSummary=`<div class="ob36-detail-decision-metrics"><span><b>${esc(rainText)}</b><small>${esc(rainSub)}</small></span><span><b>${esc(windText)}</b><small>${esc(windSub)}</small></span><span><b class="tone-${weatherTone('confidence',detail.confidence)}">${esc(detail.confidenceDescription||confidenceLabel(detail.confidence))}</b><small>予報の信頼度</small></span></div>`;
    return `<section class="ob36-detail-summary"><div class="ob36-detail-summary-main"><span class="ob36-detail-main-icon">${detailWeatherIcon(detail.condition)}</span><div><small>${esc(detail.place)}　${esc(detail.provider||detail.primarySource||'自動取得')}</small><h3>${esc(detail.condition)}</h3><strong><span class="tone-${weatherTone('temperature',detail.high)}">${detail.high==null?'—':esc(detail.high)}°</span><i>／</i><span class="tone-${weatherTone('temperature',detail.low)}">${detail.low==null?'—':esc(detail.low)}°</span></strong></div></div>${weatherSummary}<div class="ob36-detail-update"><span>最終更新 ${esc(detail.updatedLabel)}</span><span>次回 ${esc(detail.nextUpdateLabel)}頃</span><button type="button" data-ob36-detail-refresh aria-label="天気を更新"><svg viewBox="0 0 24 24"><path d="M20 7v5h-5"/><path d="M18.5 15.5A7 7 0 1 1 19 8l1 4"/></svg></button></div></section><section class="ob36-detail-judgement"><div class="ob36-detail-section-head"><h3>外時間の判断</h3></div>${judgements||'<p class="ob36-intel-empty">予報取得後に判定します。</p>'}</section>${hourlyOverviewMarkup(hourlyRows)}${externalWeatherMarkup(detail)}<section class="ob36-source-compare ob36-source-compare-last"><div class="ob36-detail-section-head"><h3>取得データ</h3><span>自動更新</span></div>${comparisons||'<p class="ob36-intel-empty">取得元を確認中です。</p>'}<p class="ob36-weather-attribution">天気データ：<a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a>　予報モデル：自動選択</p>${detail.geocodeAttribution?`<p>${esc(detail.geocodeAttribution)}</p>`:''}</section>`;
  }
  function bindHourlyRows(host){
    const rows=host.querySelectorAll('[data-ob36-hourly-card]');const rail=host.querySelector('[data-ob36-hourly-rail]');
    const detailRows=host.__ob36HourlyRows||[];
    const activate=button=>{rows.forEach(item=>{const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-pressed',active?'true':'false');});const index=Number(button.dataset.hourlyIndex||0);const row=detailRows[index];const selected=host.querySelector('[data-ob36-hourly-selected]');if(selected&&row)selected.outerHTML=hourlySelectedMarkup(row,index);};
    const applyDensity=(step,{reset=true}={})=>{host.querySelectorAll('[data-ob36-hourly-density]').forEach(item=>item.classList.toggle('active',item.dataset.ob36HourlyDensity===step));rows.forEach(item=>{item.hidden=step==='3'&&item.dataset.hourlyStep!=='3';});if(reset&&rail)rail.scrollLeft=0;const current=Array.from(rows).find(item=>item.classList.contains('active')&&!item.hidden);const first=current||Array.from(rows).find(item=>!item.hidden);if(first)activate(first);};
    rows.forEach(button=>button.addEventListener('click',()=>activate(button)));
    host.querySelectorAll('[data-ob36-hourly-density]').forEach(button=>button.addEventListener('click',()=>applyDensity(button.dataset.ob36HourlyDensity||'3')));
    applyDensity('3',{reset:false});
  }
  function weatherModeParams(host,{place='',start='',end=''}={}){return {place:host.querySelector('[data-ob36-custom-place]')?.value||place,start:host.querySelector('[data-ob36-custom-start]')?.value||start,end:host.querySelector('[data-ob36-custom-end]')?.value||end};}
  function actionButtonIcon(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2"/></svg>';}
  function actionButtonArrow(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';}
  function planWeatherChoiceDate(value){
    const date=new Date(value||'');if(Number.isNaN(date.getTime()))return '日程未設定';
    return `${date.getMonth()+1}/${date.getDate()}（${['日','月','火','水','木','金','土'][date.getDay()]}）`;
  }
  function planWeatherChoiceRange(item){
    const start=planWeatherChoiceDate(item?.startAt);const end=planWeatherChoiceDate(item?.endAt||item?.startAt);
    return start===end?start:`${start}〜${end}`;
  }
  function planWeatherChoiceRelative(item){
    const start=new Date(item?.startAt||'');if(Number.isNaN(start.getTime()))return '日程未設定';
    const today=new Date();today.setHours(0,0,0,0);start.setHours(0,0,0,0);const days=Math.round((start-today)/86400000);
    if(days===0)return '今日';if(days===1)return '明日';if(days>1)return `あと${days}日`;if(days===-1)return '昨日';return `${Math.abs(days)}日前`;
  }
  function planWeatherChoiceMarkup(rows,selectedId){
    if(!rows.length)return '<div class="ob36-plan-weather-empty"><b>予定はまだありません</b><small>予定を登録すると、場所と日程から天気を表示します。</small></div>';
    return `<div class="ob36-plan-weather-choices">${rows.map(item=>`<button type="button" class="ob36-plan-weather-choice ${item.id===selectedId?'active':''}" data-ob36-detail-plan-card="${esc(item.id)}" aria-pressed="${item.id===selectedId?'true':'false'}"><span class="ob36-plan-weather-choice-top"><em>${esc(item.typeLabel||'活動')}</em><strong>${esc(planWeatherChoiceRelative(item))}</strong></span><b>${esc(item.title||'予定')}</b><small>${esc(item.place||'場所未設定')}</small><span class="ob36-plan-weather-choice-date">${esc(planWeatherChoiceRange(item))}</span></button>`).join('')}</div>`;
  }
  async function openWeatherDetail({mode='plan',place='',start='',end='',horizon=null,skipFetch=false,skipRadarFetch=false,planScrollLeft=null}={}){
    const model=await homeModel()?.build?.();const rows=model?.next||[];const selected=model?.selectedPlan||rows[0]||null;const planPlace=selected?.place||'場所未設定';const planStart=isoDate(selected?.startAt);const planEnd=isoDate(selected?.endAt||selected?.startAt);const customPlace=place||'山中湖村';const customStart=start||isoDate(Date.now());const customEnd=end||customStart;const todayScope=model?.weather?.scope||'home';const targetPlace=mode==='custom'?customPlace:mode==='today'?(model?.weather?.locationLabel||'現在地'):planPlace;const targetStart=mode==='custom'?customStart:mode==='today'?isoDate(Date.now()):planStart;const targetEnd=mode==='custom'?customEnd:mode==='today'?targetStart:planEnd;
    if(!skipFetch&&navigator.onLine){try{await performWeatherRefresh(mode==='custom'?'custom-search':mode==='today'?'today-detail-open':'detail-open',{silent:true,custom:mode==='custom'?{place:targetPlace,start:targetStart,end:targetEnd}:null,planOverride:mode==='plan'?selected:null,plansOverride:mode==='plan'?rows:[],scopeOverride:mode==='today'?todayScope:null});}catch(_error){}}
    const detail=mode==='today'?(homeModel()?.todayWeatherDetail?.(new Date())||{}):(homeModel()?.weatherDetail?.(selected,{place:mode==='custom'?targetPlace:'',start:targetStart,end:targetEnd})||{});
    const title=mode==='today'?'今日の詳しい天気':mode==='custom'?'場所・日付の詳しい天気':'予定の詳しい天気';
    const modeButtons=`<div class="ob36-weather-mode mode-${esc(mode)}"><button type="button" class="${mode==='today'?'active':''}" data-ob36-weather-mode="today">今日を見る</button><button type="button" class="${mode==='plan'?'active':''}" data-ob36-weather-mode="plan">予定を見る</button><button type="button" class="${mode==='custom'?'active':''}" data-ob36-weather-mode="custom">場所・日付で見る</button></div>`;
    const search=mode==='plan'?`<div class="ob36-plan-weather-picker"><div class="ob36-plan-weather-picker-head"><b>予定を選ぶ</b><small>選ぶだけで場所と日程を切替</small></div>${planWeatherChoiceMarkup(rows,model?.selectedPlanId||selected?.id||'')}</div>`:mode==='custom'?`<div class="ob36-weather-search"><label class="wide"><span>場所</span><input type="text" data-ob36-custom-place value="${esc(customPlace)}" placeholder="キャンプ場・市区町村" autocomplete="off"></label><div class="wide">${weatherPlaceHistoryMarkup()}</div><label><span>開始日</span><input type="date" data-ob36-custom-start value="${esc(customStart)}"></label><label><span>終了日</span><input type="date" data-ob36-custom-end value="${esc(customEnd)}"></label><button type="button" class="ob36-action-button" data-ob36-custom-weather><span class="ob36-action-button-icon">${actionButtonIcon()}</span><span class="ob36-action-button-copy"><b>この条件で見る</b><small>入力した場所と日付の天気を表示</small></span><span class="ob36-action-button-arrow">${actionButtonArrow()}</span></button></div>`:`<div class="ob36-weather-search"><label class="wide"><span>対象</span><input type="text" value="${esc(model?.weather?.locationLabel||'現在地')}・今日の残り時間" disabled></label></div>`;
    const markup=`<div class="ob36-sheet-backdrop" data-ob36-sheet-backdrop><section class="ob36-sheet ob36-weather-detail-sheet" role="dialog" aria-modal="true" aria-label="${title}"><div class="ob36-sheet-grab"></div><header><div><small>WEATHER DETAIL</small><h2>${title}</h2></div><button type="button" data-ob36-modal-close aria-label="閉じる">×</button></header><div class="ob36-weather-mode-zone">${modeButtons}${search}</div><div class="ob36-weather-mode-page">${weatherDetailMarkup(detail)}</div></section></div>`;
    const host=openHomeModal('home-v36-weather-detail',markup);if(!host)return;
    if(mode==='plan'&&Number.isFinite(Number(planScrollLeft))){const rail=host.querySelector('.ob36-plan-weather-choices');if(rail){const left=Math.max(0,Number(planScrollLeft)||0);rail.scrollLeft=left;requestAnimationFrame(()=>{if(rail.isConnected)rail.scrollLeft=left;});}}
    host.querySelectorAll('[data-ob36-weather-mode]').forEach(button=>button.addEventListener('click',()=>{const params=weatherModeParams(host,{place:targetPlace,start:targetStart,end:targetEnd});openWeatherDetail({mode:button.dataset.ob36WeatherMode,...params});}));
    host.querySelectorAll('[data-ob36-place-history-select]').forEach(button=>button.addEventListener('click',()=>{const input=host.querySelector('[data-ob36-custom-place]');if(!input)return;input.value=button.dataset.ob36PlaceHistorySelect||'';input.focus();input.setSelectionRange?.(input.value.length,input.value.length);}));
    host.querySelectorAll('[data-ob36-place-history-remove]').forEach(button=>button.addEventListener('click',()=>{const params=weatherModeParams(host,{place:targetPlace,start:targetStart,end:targetEnd});removeWeatherPlaceHistory(button.dataset.ob36PlaceHistoryRemove||'');openWeatherDetail({mode:'custom',...params,skipFetch:true});toast('場所履歴から削除しました');}));
    host.querySelector('[data-ob36-place-history-clear]')?.addEventListener('click',()=>{const params=weatherModeParams(host,{place:targetPlace,start:targetStart,end:targetEnd});clearWeatherPlaceHistory();openWeatherDetail({mode:'custom',...params,skipFetch:true});toast('場所履歴を削除しました');});
    host.querySelectorAll('[data-ob36-detail-plan-card]').forEach(button=>button.addEventListener('click',async()=>{const id=button.dataset.ob36DetailPlanCard||'';if(!id||id===model?.selectedPlanId)return;const rail=button.closest('.ob36-plan-weather-choices');const planScrollLeft=Number(rail?.scrollLeft)||0;safeSet(homeModel().WEATHER_PLAN_KEY,id);button.disabled=true;await performWeatherRefresh('plan-change',{silent:true,planOverride:rows.find(item=>item.id===id)||null,plansOverride:rows});openWeatherDetail({mode:'plan',skipFetch:true,planScrollLeft});}));
    host.querySelector('[data-ob36-custom-weather]')?.addEventListener('click',async event=>{const button=event.currentTarget;const nextPlace=String(host.querySelector('[data-ob36-custom-place]')?.value||'').trim();const nextStart=host.querySelector('[data-ob36-custom-start]')?.value||'';const nextEnd=host.querySelector('[data-ob36-custom-end]')?.value||'';if(!nextPlace){toast('場所を入力してください');host.querySelector('[data-ob36-custom-place]')?.focus();return;}if(!nextStart||!nextEnd){toast('開始日と終了日を選んでください');return;}if(nextEnd<nextStart){toast('終了日は開始日以降にしてください');return;}button.disabled=true;button.setAttribute('aria-busy','true');const ok=await performWeatherRefresh('custom-search',{silent:false,custom:{place:nextPlace,start:nextStart,end:nextEnd}});if(ok){rememberWeatherPlace(nextPlace);openWeatherDetail({mode:'custom',place:nextPlace,start:nextStart,end:nextEnd,skipFetch:true});return;}button.disabled=false;button.removeAttribute('aria-busy');});
    host.querySelector('[data-ob36-detail-refresh]')?.addEventListener('click',async()=>{await performWeatherRefresh('manual',{silent:false,custom:mode==='custom'?{place:targetPlace,start:targetStart,end:targetEnd}:null,planOverride:mode==='plan'?selected:null,plansOverride:mode==='plan'?rows:[],scopeOverride:mode==='today'?todayScope:null});openWeatherDetail({mode,place:targetPlace,start:targetStart,end:targetEnd,skipFetch:true});});
    host.__ob36HourlyRows=Array.isArray(detail.hourly)?detail.hourly:[];bindHourlyRows(host);bindExternalWeatherLinks(host,{detail,mode,place:targetPlace,start:targetStart,end:targetEnd});
  }

  async function weatherContext(){const model=await homeModel()?.build?.();return {model,selected:model?.selectedPlan||model?.next?.[0]||null,plans:model?.next||[]};}
  function clearWeatherTimer(){if(weatherTimer){clearTimeout(weatherTimer);weatherTimer=null;}}
  async function scheduleWeatherRefresh(){clearWeatherTimer();if(!mounted)return;const {selected}=await weatherContext();const meta=homeModel()?.weatherUpdateMeta?.(selected,new Date());if(!meta)return;const delay=Math.max(15000,Math.min(2147480000,Number(meta.nextUpdateAt)-Date.now()));weatherTimer=setTimeout(()=>performWeatherRefresh('timer',{silent:true}),delay);}
  async function performWeatherRefresh(reason='manual',{silent=false,custom=null,planOverride=null,plansOverride=null,scopeOverride=null}={}){
    if(weatherRefreshing)return false;weatherRefreshing=true;document.body.classList.add('ob36-weather-refreshing');
    let connected=false,failed=false;
    try{
      const {selected,plans}=await weatherContext();const service=globalThis.OUTBASE_WEATHER_SERVICE_V1;const activePlan=planOverride||selected;const scope=scopeOverride||homeModel()?.weatherPreview?.(new Date(),activePlan)?.scope||'home';
      if(!service?.refresh)throw new Error('weather_service_unavailable');
      await service.refresh({reason,plan:activePlan,plans:plansOverride||plans,scope,custom});connected=true;
      homeModel()?.markWeatherUpdated?.(new Date(),activePlan);modelApi?.invalidate?.('home');await render('data-change');
    }catch(error){failed=true;console.warn('[OUTBASE weather refresh]',error);modelApi?.invalidate?.('home');await render('data-change');}
    finally{weatherRefreshing=false;document.body.classList.remove('ob36-weather-refreshing');scheduleWeatherRefresh();}
    if(!silent){if(failed)toast('更新できませんでした。前回の予報を表示します');else if(connected)toast('天気を更新しました');}
    return !failed;
  }
  async function maybeAutoRefresh(reason='timer'){
    const {selected}=await weatherContext();if(homeModel()?.weatherNeedsRefresh?.(selected,new Date(),reason))return performWeatherRefresh(reason,{silent:true});scheduleWeatherRefresh();return false;
  }

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
  const homeBridge=Object.freeze({runQuick,openCooking,openQuickSettings,openAppSettings,openWeatherSettings,openWeatherDetail,performWeatherRefresh,closeModal:closeHomeModal,toast,openMemoTarget,openKotaWalk,openGenericMemo,openGenericStart,readPrepCommon,cookingState,writeCooking,normalizedQuickIds});
  globalThis.OUTBASE_HOME_V36_BRIDGE=homeBridge;

  function requested(){return router?.shellRequested?.()===true;}
  function snapshot(){return Object.freeze({version:'v166.3-home-v36-r34',requested:requested(),mounted,route:router?.current?.()||null,safe:legacy?.shellSafe?.()??false,cutover:false,previewOnly:true});}
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
    renderPromise=(async()=>{while(pendingReason){const next=pendingReason;pendingReason=null;await performRender(next);}})().catch(error=>{console.error('[OUTBASE v166.3 HOME v36 r10] shell render failed',error);fallback('render_failed');}).finally(()=>{renderPromise=null;});return renderPromise;
  }
  function action(name){if(name==='plan-add')return legacy.openPlanAdd();if(name==='memo')return homeBridge.openGenericMemo();if(name==='start')return homeBridge.openGenericStart();if(name==='calendar')return router.navigate('calendar');}
  function navValues(element){return {activityId:element.dataset.ob5ActivityId||'',month:element.dataset.ob5Month||'',people:element.dataset.ob5People||''};}
  function schedulePreload(){const task=()=>{modelApi?.preload?.('vault');const month=new Date().toISOString().slice(0,7);modelApi?.preload?.('calendar',{month});};if(typeof requestIdleCallback==='function')requestIdleCallback(task,{timeout:1800});else setTimeout(task,900);}
  function refreshHome(){modelApi?.invalidate?.('home');return render('data-change');}

  function bind(){
    if(bound)return;bound=true;bindSheetSwipeDismiss();
    document.addEventListener('click',event=>{
      if(!mounted)return;
      const modalClose=event.target.closest?.('[data-ob36-modal-close]');if(modalClose){event.preventDefault();closeHomeModal();return;}
      const homeBackdrop=event.target.closest?.('[data-ob36-sheet-backdrop]');if(homeBackdrop&&event.target===homeBackdrop){event.preventDefault();closeHomeModal();return;}
      const appSettings=event.target.closest?.('[data-ob36-app-settings]');if(appSettings){event.preventDefault();homeBridge.openAppSettings();return;}
      const settings=event.target.closest?.('[data-ob36-settings]');if(settings){event.preventDefault();homeBridge.openQuickSettings();return;}
      const weatherRefresh=event.target.closest?.('[data-ob36-weather-refresh]');if(weatherRefresh){event.preventDefault();homeBridge.performWeatherRefresh('manual',{silent:false});return;}
      const todayWeatherDetail=event.target.closest?.('[data-ob36-today-weather-detail]');if(todayWeatherDetail){event.preventDefault();homeBridge.openWeatherDetail({mode:'today'});return;}
      const weatherDetail=event.target.closest?.('[data-ob36-weather-detail]');if(weatherDetail){event.preventDefault();homeBridge.openWeatherDetail({mode:'plan'});return;}
      const samplePlan=event.target.closest?.('[data-ob36-sample-plan]');if(samplePlan){event.preventDefault();homeBridge.toast('表示サンプルです。実際の予定はカレンダーから開けます');return;}
      const notify=event.target.closest?.('[data-ob36-notify]');if(notify){event.preventDefault();homeBridge.toast('通知機能は接続準備中です');return;}
      const quick=event.target.closest?.('[data-ob36-quick]');if(quick){event.preventDefault();homeBridge.runQuick(quick.dataset.ob36Quick,quick);return;}
      const weatherScope=event.target.closest?.('[data-ob36-weather-scope]');if(weatherScope){event.preventDefault();safeSet(globalThis.OUTBASE_HOME_SCREEN_MODEL_V164.WEATHER_SCOPE_KEY,weatherScope.dataset.ob36WeatherScope==='current'?'current':'home');performWeatherRefresh('scope-change',{silent:true});return;}
      const shellNav=event.target.closest?.('[data-ob5-nav]');if(shellNav){event.preventDefault();router.navigate(shellNav.dataset.ob5Route||'home',navValues(shellNav));return;}
      const route=event.target.closest?.('[data-ob3-route]');if(route){event.preventDefault();router.navigate(route.dataset.ob3Route);return;}
      const filter=event.target.closest?.('[data-ob5-filter]');if(filter){event.preventDefault();const current=router.current();const next=globalThis.OUTBASE_FAMILY_FILTER_DOMAIN_V165.toggle(current.people,filter.dataset.ob5Filter);router.navigate('calendar',{month:current.month,people:globalThis.OUTBASE_FAMILY_FILTER_DOMAIN_V165.serialize(next)},{replace:true,preserveScroll:true});return;}
      if(event.target.closest?.('[data-ob3-central]')){modals.open('central');renderer.showCentral();return;}
      if(event.target.closest?.('[data-ob3-close]')||event.target.matches?.('[data-ob3-backdrop]')){renderer.hideCentral();modals.close();return;}
      const button=event.target.closest?.('[data-ob3-action]');if(button){event.preventDefault();action(button.dataset.ob3Action);return;}
      const old=event.target.closest?.('[data-ob3-legacy]');if(old){event.preventDefault();const target=old.dataset.ob3Legacy;if(target==='search')legacy.openSearch();else if(target==='vault')legacy.openVault();else legacy.openLegacyHome();}
    },true);
    document.addEventListener('change',event=>{const select=event.target.closest?.('[data-ob36-weather-plan]');if(!select)return;safeSet(globalThis.OUTBASE_HOME_SCREEN_MODEL_V164.WEATHER_PLAN_KEY,select.value||'');performWeatherRefresh('plan-change',{silent:true});},true);
    router.subscribe((_route,reason)=>render(reason));
    modals.subscribe((stack,reason)=>{if(!stack.length&&reason==='back'){clearHomeModal();renderer.hideCentral();}});
    addEventListener('online',()=>{renderer.updateNetwork?.(root,true);maybeAutoRefresh('online');});addEventListener('offline',()=>renderer.updateNetwork?.(root,false));
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')maybeAutoRefresh('resume');});
    addEventListener('focus',()=>maybeAutoRefresh('resume'));
  }
  async function start(){
    if(!requested())return {status:'not_requested',snapshot:snapshot()};
    if(!legacy.shellSafe())return fallback('active_session_protected');
    if('scrollRestoration'in history){previousScrollRestoration=history.scrollRestoration;history.scrollRestoration='manual';}
    root=document.getElementById('outbaseShellRoot');if(!root){root=document.createElement('div');root.id='outbaseShellRoot';root.hidden=true;document.body.insertBefore(root,document.body.firstChild);}
    document.body.classList.add('outbaseShellPreview');globalThis.OUTBASE_THEME_V166?.sync?.('shell-start');mounted=true;bind();await render('initial');if(!mounted||!root)return {status:'fallback',reason:'render_failed',snapshot:snapshot()};root.hidden=false;removeBoot();schedulePreload();await performWeatherRefresh('app-open',{silent:true});
    const detail={status:'ready',version:'v166.3-home-v36-r34',previewOnly:true,cutover:false,route:router.current()};
    globalThis.dispatchEvent?.(new CustomEvent('outbase:v166-ready',{detail}));globalThis.dispatchEvent?.(new CustomEvent('outbase:v165-ready',{detail}));return detail;
  }
  const ready=start();
  const api=Object.freeze({ready,start,render,snapshot,fallback,applyScroll,routeScrollTarget});
  globalThis.OUTBASE_SHELL_V166=api;globalThis.OUTBASE_SHELL_V165=api;globalThis.OUTBASE_SHELL_V164=api;
})();
