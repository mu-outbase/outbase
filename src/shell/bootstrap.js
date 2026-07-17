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
  let weatherTimer=null,weatherRefreshing=false;

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
    const top=modals?.top?.();if(top?.id?.startsWith?.('home-v36-')&&top.id!==id)modals?.close?.({historyBack:false});
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


  function appSettingsMarkup(){
    return `<div class="ob36-sheet-backdrop" data-ob36-sheet-backdrop><section class="ob36-sheet" role="dialog" aria-modal="true" aria-label="設定"><div class="ob36-sheet-grab"></div><header><div><small>OUTBASE SETTINGS</small><h2>設定</h2></div><button type="button" data-ob36-modal-close aria-label="閉じる">×</button></header><div class="ob36-settings-menu"><button type="button" data-ob36-open-weather-settings><span><b>天気設定</b><small>参照サイト・比較先・場所の優先順</small></span><em>›</em></button><button type="button" data-ob36-open-quick-settings><span><b>クイックアクション</b><small>HOMEの5枠と並び順</small></span><em>›</em></button></div></section></div>`;
  }
  function openAppSettings(){
    const host=openHomeModal('home-v36-settings',appSettingsMarkup());if(!host)return;
    host.querySelector('[data-ob36-open-weather-settings]')?.addEventListener('click',openWeatherSettings);
    host.querySelector('[data-ob36-open-quick-settings]')?.addEventListener('click',openQuickSettings);
  }
  function weatherSettingsMarkup(){
    const api=homeModel();const value=api?.weatherSettings?.()||{primary:'jma',compare:['weathernews','tenki'],locationMode:'plan',sources:[]};
    const options=(value.sources||api?.WEATHER_SOURCES||[]).map(item=>`<option value="${esc(item.id)}"${item.id===value.primary?' selected':''}>${esc(item.label)}</option>`).join('');
    const compare=(value.sources||api?.WEATHER_SOURCES||[]).map(item=>`<label><input type="checkbox" data-ob36-weather-compare value="${esc(item.id)}"${value.compare.includes(item.id)?' checked':''}${item.id===value.primary?' disabled':''}><span>${esc(item.label)}</span></label>`).join('');
    return `<div class="ob36-sheet-backdrop" data-ob36-sheet-backdrop><section class="ob36-sheet" role="dialog" aria-modal="true" aria-label="天気設定"><div class="ob36-sheet-grab"></div><header><div><small>WEATHER SOURCES</small><h2>天気設定</h2></div><button type="button" data-ob36-modal-close aria-label="閉じる">×</button></header><div class="ob36-weather-settings"><fieldset><legend>優先して見る予報サイト</legend><select data-ob36-weather-primary>${options}</select></fieldset><fieldset><legend>比較する予報サイト</legend>${compare}</fieldset><fieldset><legend>最初に使う場所</legend><label><input type="radio" name="ob36WeatherLocation" value="plan"${value.locationMode==='plan'?' checked':''}>予定の場所</label><label><input type="radio" name="ob36WeatherLocation" value="home"${value.locationMode==='home'?' checked':''}>自宅</label><label><input type="radio" name="ob36WeatherLocation" value="current"${value.locationMode==='current'?' checked':''}>現在地</label></fieldset></div><button class="ob36-sheet-done" type="button" data-ob36-weather-settings-save>保存</button></section></div>`;
  }
  function openWeatherSettings(){
    const host=openHomeModal('home-v36-weather-settings',weatherSettingsMarkup());if(!host)return;
    const primary=host.querySelector('[data-ob36-weather-primary]');
    primary?.addEventListener('change',()=>host.querySelectorAll('[data-ob36-weather-compare]').forEach(box=>{box.disabled=box.value===primary.value;if(box.disabled)box.checked=false;}));
    host.querySelector('[data-ob36-weather-settings-save]')?.addEventListener('click',()=>{
      const api=homeModel();const selectedPrimary=primary?.value||'jma';const compare=[...host.querySelectorAll('[data-ob36-weather-compare]:checked')].map(box=>box.value).filter(id=>id!==selectedPrimary);const mode=host.querySelector('input[name="ob36WeatherLocation"]:checked')?.value||'plan';
      safeSet(api.WEATHER_SOURCE_PRIMARY_KEY,selectedPrimary);safeSet(api.WEATHER_SOURCE_COMPARE_KEY,JSON.stringify(compare));safeSet(api.WEATHER_LOCATION_MODE_KEY,mode);closeHomeModal();refreshHome();toast('天気設定を保存しました');
    });
  }
  function isoDate(value){const d=new Date(value||Date.now());return Number.isNaN(d.getTime())?'':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function detailTime(value){const d=new Date(value||'');if(Number.isNaN(d.getTime()))return '—';return `${String(d.getHours()).padStart(2,'0')}時`;}
  function detailDate(value){const d=new Date(value||'');if(Number.isNaN(d.getTime()))return '日付未設定';return `${d.getMonth()+1}/${d.getDate()}（${'日月火水木金土'[d.getDay()]}）`;}
  function detailWeatherIcon(condition){
    if(String(condition).includes('雨'))return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 14h10a4 4 0 0 0 .2-8 5.8 5.8 0 0 0-10.8-1.4A4.7 4.7 0 0 0 6.5 14Z"/><path d="m8 17-1 3M12 17l-1 3M16 17l-1 3"/></svg>';
    if(String(condition).includes('晴れ'))return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="9" r="4"/><path d="M9 2v2M9 14v2M2 9h2M14 9h2M4 4l1.5 1.5M12.5 12.5 14 14"/><path d="M9 19h8a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.2 1.3"/></svg>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17h13a4.5 4.5 0 0 0 .2-9 6 6 0 0 0-11.3-1.5A5.2 5.2 0 0 0 5 17Z"/></svg>';
  }
  function weatherTone(kind,value){const n=Number(value);if(kind==='temperature'){if(n>=35)return 'danger';if(n>=28)return 'warm';if(n<10)return 'cool';return 'good';}if(kind==='rain'){if(n>=70)return 'danger';if(n>=40)return 'watch';if(n>=20)return 'info';return 'good';}if(kind==='wind'){if(n>=8)return 'danger';if(n>=4)return 'watch';return 'good';}if(kind==='confidence'){const text=String(value||'');if(/^A/.test(text))return 'good';if(/^B/.test(text))return 'watch';return 'danger';}return 'info';}
  function hourlyRowMarkup(row,index){
    return `<article class="ob36-hourly-row" data-ob36-hourly-row><button type="button" class="ob36-hourly-summary" data-ob36-hourly-toggle aria-expanded="false"><time><b>${esc(detailTime(row.at))}</b><small>${esc(detailDate(row.at))}</small></time><span class="ob36-hourly-condition">${detailWeatherIcon(row.condition)}<b>${esc(row.condition)}</b></span><span class="ob36-hourly-temp tone-${weatherTone('temperature',row.temperature)}"><b>${esc(row.temperature)}°</b><small>体感${esc(row.feelsLike)}°</small></span><span class="ob36-hourly-rain tone-${weatherTone('rain',row.rainProbability)}"><b>${esc(row.rainProbability)}%</b><small>降水</small></span><span class="ob36-hourly-wind tone-${weatherTone('wind',row.windAverage)}"><b>${esc(row.windAverage)}m/s</b><small>${esc(row.windDirection)}</small></span><em class="tone-${weatherTone('confidence',row.confidence)}">${esc(row.confidence)}</em><i aria-hidden="true">⌄</i></button><div class="ob36-hourly-extra" hidden><span><b>${esc(row.rainfall)}mm</b><small>降水量</small></span><span><b>${esc(row.windDirection)}</b><small>風向</small></span><span><b>${esc(row.windAverage)}m/s</b><small>平均風速</small></span><span><b>${esc(row.windGust)}m/s</b><small>最大瞬間</small></span><p>予報サイト間の差を含めた信頼度：<strong>${esc(row.confidence)}</strong></p></div></article>`;
  }
  function weatherDetailMarkup(detail){
    const hourly=(detail.hourly||[]).map(hourlyRowMarkup).join('');
    const judgements=(detail.judgements||[]).map(row=>`<div><b>${esc(row.label)}</b><span><strong>${esc(row.value)}</strong><small>${esc(row.detail)}</small></span></div>`).join('');
    const comparisons=(detail.comparisons||[]).map(row=>`<div><b>${esc(row.source)}</b><span>${esc(row.summary)}</span><em>${esc(row.rainProbability)}%・瞬間${esc(row.windGust)}m/s</em></div>`).join('');
    return `<section class="ob36-detail-summary"><div><small>${esc(detail.place)}　表示サンプル</small><h3>${esc(detail.condition)}</h3><strong class="tone-${weatherTone('temperature',detail.high)}">${esc(detail.high)}°／${esc(detail.low)}°</strong></div><div><span><b class="tone-${weatherTone('rain',detail.rainPeak)}">${esc(detail.rainPeak)}%</b><small>降水ピーク</small></span><span><b class="tone-${weatherTone('wind',detail.windGust)}">${esc(detail.windGust)}m/s</b><small>最大瞬間風速</small></span><span><b class="tone-${weatherTone('confidence',detail.confidence)}">${esc(detail.confidence)}</b><small>総合信頼度</small></span></div><div class="ob36-detail-update"><span>最終更新 ${esc(detail.updatedLabel)}</span><span>次回 ${esc(detail.nextUpdateLabel)}頃</span><button type="button" data-ob36-detail-refresh aria-label="天気を更新"><svg viewBox="0 0 24 24"><path d="M20 7v5h-5"/><path d="M18.5 15.5A7 7 0 1 1 19 8l1 4"/></svg></button></div></section><section class="ob36-hourly-section"><div class="ob36-detail-section-head"><h3>時間ごとの予報</h3><span>行を押すと詳細</span></div><div class="ob36-hourly-column-head"><span>時刻</span><span>天気</span><span>気温</span><span>降水</span><span>風</span><span>信頼度</span></div><div class="ob36-hourly-list">${hourly}</div></section><section class="ob36-detail-judgement"><div class="ob36-detail-section-head"><h3>外時間の判断</h3></div>${judgements}</section><section class="ob36-source-compare"><div class="ob36-detail-section-head"><h3>予報サイト比較</h3><span>夕方の予報</span></div>${comparisons}<p>総合判断：夕方は短時間の雨に注意。サイト間の差があるため信頼度はB＋。</p></section><div class="ob36-detail-meta"><span>優先：${esc(detail.primarySource)}</span><span>比較：${esc((detail.compareSources||[]).join('・')||'未設定')}</span></div>`;
  }
  function bindHourlyRows(host){host.querySelectorAll('[data-ob36-hourly-toggle]').forEach(button=>button.addEventListener('click',()=>{const row=button.closest('[data-ob36-hourly-row]');const extra=row?.querySelector('.ob36-hourly-extra');if(!extra)return;const open=button.getAttribute('aria-expanded')==='true';button.setAttribute('aria-expanded',open?'false':'true');extra.hidden=open;row.classList.toggle('open',!open);}));}
  async function openWeatherDetail({mode='plan',place='',start='',end=''}={}){
    const model=await homeModel()?.build?.();const rows=model?.next||[];const selected=model?.selectedPlan||rows[0]||null;const planPlace=selected?.place||'西湖キャンプビレッジ・ノーム';const planStart=isoDate(selected?.startAt);const planEnd=isoDate(selected?.endAt||selected?.startAt);const customPlace=place||'山中湖村';const customStart=start||isoDate(Date.now());const customEnd=end||customStart;const targetPlace=mode==='custom'?customPlace:planPlace;const targetStart=mode==='custom'?customStart:planStart;const targetEnd=mode==='custom'?customEnd:planEnd;const detail=homeModel()?.weatherDetail?.(selected,{place:targetPlace,start:targetStart,end:targetEnd})||{};
    const options=rows.map(item=>`<option value="${esc(item.id)}"${item.id===model?.selectedPlanId?' selected':''}>${esc(item.title)}</option>`).join('');
    const markup=`<div class="ob36-sheet-backdrop" data-ob36-sheet-backdrop><section class="ob36-sheet ob36-weather-detail-sheet" role="dialog" aria-modal="true" aria-label="時間ごとの天気"><div class="ob36-sheet-grab"></div><header><div><small>WEATHER DETAIL</small><h2>時間ごとの天気</h2></div><button type="button" data-ob36-modal-close aria-label="閉じる">×</button></header><div class="ob36-weather-mode"><button type="button" class="${mode==='plan'?'active':''}" data-ob36-weather-mode="plan">予定から見る</button><button type="button" class="${mode==='custom'?'active':''}" data-ob36-weather-mode="custom">場所・日付で見る</button></div>${mode==='plan'?`<div class="ob36-weather-search"><label class="wide"><span>予定</span><select data-ob36-detail-plan>${options}</select></label></div>`:`<div class="ob36-weather-search"><label class="wide"><span>場所</span><input type="text" data-ob36-custom-place value="${esc(customPlace)}" placeholder="キャンプ場・市区町村"></label><label><span>開始日</span><input type="date" data-ob36-custom-start value="${esc(customStart)}"></label><label><span>終了日</span><input type="date" data-ob36-custom-end value="${esc(customEnd)}"></label><button type="button" data-ob36-custom-weather>この条件で見る</button></div>`}${weatherDetailMarkup(detail)}<button class="ob36-sheet-done ob36-sheet-settings" type="button" data-ob36-open-weather-settings>参照サイト設定</button></section></div>`;
    const host=openHomeModal('home-v36-weather-detail',markup);if(!host)return;
    bindHourlyRows(host);
    host.querySelectorAll('[data-ob36-weather-mode]').forEach(button=>button.addEventListener('click',()=>openWeatherDetail({mode:button.dataset.ob36WeatherMode})));
    host.querySelector('[data-ob36-detail-plan]')?.addEventListener('change',async event=>{safeSet(homeModel().WEATHER_PLAN_KEY,event.target.value||'');await performWeatherRefresh('plan-change',{silent:true});openWeatherDetail({mode:'plan'});});
    host.querySelector('[data-ob36-custom-weather]')?.addEventListener('click',()=>openWeatherDetail({mode:'custom',place:host.querySelector('[data-ob36-custom-place]')?.value||'',start:host.querySelector('[data-ob36-custom-start]')?.value||'',end:host.querySelector('[data-ob36-custom-end]')?.value||''}));
    host.querySelector('[data-ob36-detail-refresh]')?.addEventListener('click',async()=>{await performWeatherRefresh('manual',{silent:false});openWeatherDetail({mode,place:targetPlace,start:targetStart,end:targetEnd});});
    host.querySelector('[data-ob36-open-weather-settings]')?.addEventListener('click',openWeatherSettings);
  }

  async function weatherContext(){const model=await homeModel()?.build?.();return {model,selected:model?.selectedPlan||model?.next?.[0]||null};}
  function clearWeatherTimer(){if(weatherTimer){clearTimeout(weatherTimer);weatherTimer=null;}}
  async function scheduleWeatherRefresh(){clearWeatherTimer();if(!mounted)return;const {selected}=await weatherContext();const meta=homeModel()?.weatherUpdateMeta?.(selected,new Date());if(!meta)return;const delay=Math.max(15000,Math.min(2147480000,Number(meta.nextUpdateAt)-Date.now()));weatherTimer=setTimeout(()=>performWeatherRefresh('timer',{silent:true}),delay);}
  async function performWeatherRefresh(reason='manual',{silent=false}={}){
    if(weatherRefreshing)return false;weatherRefreshing=true;document.body.classList.add('ob36-weather-refreshing');
    let connected=false,failed=false;
    try{
      const {selected}=await weatherContext();const service=globalThis.OUTBASE_WEATHER_SERVICE_V1;
      if(service?.refresh){await service.refresh({reason,plan:selected,scope:homeModel()?.weatherPreview?.(new Date(),selected)?.scope||'home'});connected=true;}
      homeModel()?.markWeatherUpdated?.(new Date(),selected);modelApi?.invalidate?.('home');await render('data-change');
    }catch(error){failed=true;console.warn('[OUTBASE weather refresh]',error);}
    finally{weatherRefreshing=false;document.body.classList.remove('ob36-weather-refreshing');scheduleWeatherRefresh();}
    if(!silent){if(failed)toast('更新できませんでした。前回の予報を表示します');else if(connected)toast('天気を更新しました');else toast('更新時刻を確認しました。実予報は接続準備中です');}
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
  function snapshot(){return Object.freeze({version:'v166.3-home-v36-r10',requested:requested(),mounted,route:router?.current?.()||null,safe:legacy?.shellSafe?.()??false,cutover:false,previewOnly:true});}
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
    if(bound)return;bound=true;
    document.addEventListener('click',event=>{
      if(!mounted)return;
      const modalClose=event.target.closest?.('[data-ob36-modal-close]');if(modalClose){event.preventDefault();closeHomeModal();return;}
      const homeBackdrop=event.target.closest?.('[data-ob36-sheet-backdrop]');if(homeBackdrop&&event.target===homeBackdrop){event.preventDefault();closeHomeModal();return;}
      const appSettings=event.target.closest?.('[data-ob36-app-settings]');if(appSettings){event.preventDefault();homeBridge.openAppSettings();return;}
      const settings=event.target.closest?.('[data-ob36-settings]');if(settings){event.preventDefault();homeBridge.openQuickSettings();return;}
      const weatherRefresh=event.target.closest?.('[data-ob36-weather-refresh]');if(weatherRefresh){event.preventDefault();homeBridge.performWeatherRefresh('manual',{silent:false});return;}
      const weatherDetail=event.target.closest?.('[data-ob36-weather-detail]');if(weatherDetail){event.preventDefault();homeBridge.openWeatherDetail();return;}
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
    const detail={status:'ready',version:'v166.3-home-v36-r10',previewOnly:true,cutover:false,route:router.current()};
    globalThis.dispatchEvent?.(new CustomEvent('outbase:v166-ready',{detail}));globalThis.dispatchEvent?.(new CustomEvent('outbase:v165-ready',{detail}));return detail;
  }
  const ready=start();
  const api=Object.freeze({ready,start,render,snapshot,fallback,applyScroll,routeScrollTarget});
  globalThis.OUTBASE_SHELL_V166=api;globalThis.OUTBASE_SHELL_V165=api;globalThis.OUTBASE_SHELL_V164=api;
})();
