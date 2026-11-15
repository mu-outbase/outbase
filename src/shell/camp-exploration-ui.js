(() => {
  'use strict';
  const api=()=>globalThis.OUTBASE_CAMP_EXPLORATION;
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const states=new WeakMap();
  const time=v=>new Date(v).toLocaleString('ja-JP');
  function markup(value){
    const p=value.routePayload||{};
    if(p.status!=='ready')return `<section class="ob22-page"><h1>場内探索</h1><p>${p.status==='loading'?'記録を読み込んでいます。':'キャンプの予定を選び直してください。'}</p><button type="button" data-ob22-back>予定へ戻る</button></section>`;
    return `<section class="ob22-page ob-explore" data-camp-exploration="${esc(p.activity.id)}" data-exploration-calendar-id="${esc(p.nativeEventId||'')}">
      <div class="ob22-route-head"><button type="button" data-explore-back>‹ キャンプの予定へ</button><span>場内探索</span></div>
      <section class="ob22-card"><h1>キャンプ場を歩いて記録</h1><h2>${esc(p.place)}</h2><p>${esc(p.activity.title)}</p><p>サイトの広さ・地面・日陰や、炊事場・トイレの様子を残せます。</p><div data-explore-session></div></section>
      <form class="ob22-card ob22-form" data-camp-exploration-form hidden>
        <h2 class="wide">この場所を記録</h2><label class="wide">種類<select name="category">${Object.entries(api().CATEGORIES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label>
        <label class="wide" data-explore-number>サイト番号・名前<input name="siteNumber" required maxlength="80" placeholder="例：A12、林間の奥"></label>
        <label class="wide">特徴・気づき<textarea name="features" maxlength="3000" rows="4" placeholder="広さ、地面、傾斜、日陰、設備の清潔さ、コタとの歩きやすさなど"></textarea></label>
        <div class="wide"><button type="button" data-explore-locate>現在地を付ける</button><button type="button" data-explore-clear-position hidden>位置を外す</button><p data-explore-location role="status">位置なしでも記録できます。</p></div>
        <label class="wide">写真（任意・20MBまで）<input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/gif" capture="environment"><span data-explore-photo-name></span></label>
        <div class="ob22-form-actions wide"><button type="submit" class="primary">この場所を保存</button></div><p class="wide" data-explore-save-status role="status" aria-live="polite"></p>
      </form>
      <section class="ob22-card"><h2>場内の地図と記録</h2><p>保存した地点と写真・メモを見返せます。背景地図は通信が必要です。</p><label>表示する種類<select data-explore-filter><option value="all">すべて</option>${Object.entries(api().CATEGORIES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><p data-explore-count></p><div data-explore-map></div><div data-explore-list></div></section>
    </section>`;
  }
  const world=p=>{const lat=Math.max(-85,Math.min(85,p.latitude))*Math.PI/180;return {x:(p.longitude+180)/360,y:(1-Math.log(Math.tan(lat)+1/Math.cos(lat))/Math.PI)/2};};
  function map(root,state,rows){
    const points=rows.filter(r=>Number.isFinite(r.payload.latitude)&&Number.isFinite(r.payload.longitude));const host=root.querySelector('[data-explore-map]');
    if(!points.length){host.innerHTML='<p>位置を付けた記録があると、ここに地図を表示します。</p>';return;}
    const projected=points.map(r=>world(r.payload));const minX=Math.min(...projected.map(p=>p.x)),maxX=Math.max(...projected.map(p=>p.x)),minY=Math.min(...projected.map(p=>p.y)),maxY=Math.max(...projected.map(p=>p.y));
    const zoom=state.camera?.zoom??Math.max(2,Math.min(18,Math.floor(Math.log2(Math.min(440/Math.max((maxX-minX)*256,.001),248/Math.max((maxY-minY)*256,.001))))));const cx=state.camera?.x??(minX+maxX)/2,cy=state.camera?.y??(minY+maxY)/2;state.currentCamera={x:cx,y:cy,zoom};
    const scale=256*2**zoom,left=cx*scale-256,top=cy*scale-160;let tiles='';
    for(let x=Math.floor(left/256);x<=Math.floor((left+512)/256);x++)for(let y=Math.floor(top/256);y<=Math.floor((top+320)/256);y++){if(y<0||y>=2**zoom)continue;const wrapped=((x%2**zoom)+2**zoom)%2**zoom;tiles+=`<image href="https://tile.openstreetmap.org/${zoom}/${wrapped}/${y}.png" x="${x*256-left}" y="${y*256-top}" width="256" height="256"/>`;}
    const markers=points.map((r,i)=>{const p=world(r.payload);return `<a href="#explore-${esc(r.id)}" data-explore-marker="${esc(r.id)}" aria-label="${esc(r.payload.title)}"><circle cx="${p.x*scale-left}" cy="${p.y*scale-top}" r="15" fill="#184f37" stroke="white" stroke-width="2"/><text x="${p.x*scale-left}" y="${p.y*scale-top+5}" text-anchor="middle" fill="white" font-size="13">${i+1}</text><title>${esc(r.payload.title)}</title></a>`;}).join('');
    host.innerHTML=`<svg data-explore-canvas tabindex="0" role="img" aria-label="場内探索の記録地点。指や矢印キーで地図を移動できます" viewBox="0 0 512 320" style="display:block;width:100%;border-radius:14px;background:#edf1eb;touch-action:none">${tiles}${markers}</svg><div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0"><button type="button" data-explore-zoom="1" aria-label="地図を拡大">＋</button><button type="button" data-explore-zoom="-1" aria-label="地図を縮小">−</button><button type="button" data-explore-zoom="0">全地点</button><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a></div>`;
    host.querySelectorAll('[data-explore-zoom]').forEach(b=>b.onclick=()=>{const delta=Number(b.dataset.exploreZoom);state.camera=delta?{...state.currentCamera,zoom:Math.max(2,Math.min(19,zoom+delta))}:null;renderRecords(root,state);});
    host.querySelectorAll('[data-explore-marker]').forEach(a=>a.onclick=e=>{e.preventDefault();if(state.dragged)return;const detail=root.querySelector(`[data-explore-observation="${a.dataset.exploreMarker}"]`);if(detail){detail.open=true;hydratePhoto(detail);detail.scrollIntoView({block:'center',behavior:'smooth'});}});
    const svg=host.querySelector('svg');let drag=null;
    svg.onpointerdown=e=>{if(e.pointerType==='mouse'&&e.button!==0)return;state.dragged=false;drag={x:e.clientX,y:e.clientY,camera:{...state.currentCamera}};};
    svg.onpointermove=e=>{if(!drag)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5){state.dragged=true;svg.setPointerCapture(e.pointerId);}};
    const stop=e=>{if(!drag)return;const d=drag;drag=null;if(!state.dragged)return;state.camera={...d.camera,x:d.camera.x-(e.clientX-d.x)*512/svg.getBoundingClientRect().width/scale,y:Math.max(0,Math.min(1,d.camera.y-(e.clientY-d.y)*512/svg.getBoundingClientRect().width/scale))};renderRecords(root,state);};svg.onpointerup=stop;svg.onpointercancel=()=>{drag=null;};
    svg.onkeydown=e=>{const move={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!move)return;e.preventDefault();state.camera={...state.currentCamera,x:cx+move[0]*80/scale,y:Math.max(0,Math.min(1,cy+move[1]*80/scale))};renderRecords(root,state);root.querySelector('[data-explore-canvas]')?.focus();};
  }
  async function hydratePhoto(detail){
    const image=detail.querySelector('[data-explore-photo]');if(!detail.open||!image||image.src)return;
    try{const blob=await globalThis.OUTBASE_PHOTO_RECORDS.readBlob('story-photo:'+image.dataset.explorePhoto);if(!blob)throw Error();if(!image.isConnected)return;const url=URL.createObjectURL(blob);image.onload=image.onerror=()=>URL.revokeObjectURL(url);image.src=url;}catch{if(image.isConnected)image.replaceWith(document.createTextNode('写真を読み込めませんでした。開き直してお試しください。'));}
  }
  function renderRecords(root,state){
    const filter=root.querySelector('[data-explore-filter]').value,rows=state.payload.observations.filter(r=>filter==='all'||r.payload.camp_exploration_v1.category===filter);const points=rows.filter(r=>Number.isFinite(r.payload.latitude)&&Number.isFinite(r.payload.longitude));
    root.querySelector('[data-explore-count]').textContent=`${rows.length}件（位置付き ${points.length}件）`;
    root.querySelector('[data-explore-list]').innerHTML=rows.length?rows.map(r=>{const p=r.payload,position=Number.isFinite(p.latitude)&&Number.isFinite(p.longitude),index=points.indexOf(r);return `<details id="explore-${esc(r.id)}" data-explore-observation="${esc(r.id)}" style="padding:12px 0;border-top:1px solid #e0e5df"><summary style="min-height:44px;overflow-wrap:anywhere">${index>=0?(index+1)+'. ':''}${esc(p.title)} · ${esc(api().CATEGORIES[p.camp_exploration_v1.category])}</summary><p>${esc(time(r.occurred_at))} · ${position?'位置付き ±'+Math.round(p.accuracy)+'m':'位置なし'}</p><p style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(p.camp_exploration_v1.features||'特徴のメモなし')}</p>${position?`<a target="_blank" rel="noopener noreferrer" href="https://www.openstreetmap.org/?mlat=${p.latitude}&amp;mlon=${p.longitude}#map=18/${p.latitude}/${p.longitude}">この地点を地図で開く</a>`:''}${p.media_id?`<img data-explore-photo="${esc(p.media_id)}" alt="${esc(p.title)}の写真" style="display:block;max-width:100%;height:auto;border-radius:12px;margin-top:12px">`:''}</details>`;}).join(''):'<p>記録はまだありません。探索を開始して、気になった場所を残してください。</p>';
    root.querySelectorAll('[data-explore-observation]').forEach(d=>d.ontoggle=()=>hydratePhoto(d));map(root,state,rows);
  }
  function sessionUI(root,state){
    const s=state.payload.session;root.querySelector('[data-explore-session]').innerHTML=s?`<p>探索中 · ${esc(time(s.payload.started_at))}から</p><button type="button" data-explore-end>探索を終了</button>`:`<p>${state.payload.sessions.length?'前の探索記録も下で見返せます。':'探索を始めると場所を記録できます。'}</p><button type="button" data-explore-start>場内探索を開始</button>`;
    root.querySelector('form').hidden=!s;
    const act=async(button,work)=>{if(state.busy)return;state.busy=true;button.disabled=true;try{await work();await refresh(root);}catch{button.disabled=false;root.querySelector('[data-explore-session]').insertAdjacentHTML('beforeend','<p role="status">探索の状態を保存できませんでした。もう一度お試しください。</p>');}finally{state.busy=false;}};
    root.querySelector('[data-explore-start]')?.addEventListener('click',e=>act(e.currentTarget,()=>state.nativeEventId?api().startCalendar(state.nativeEventId,globalThis.OUTBASE_IDS.ulid()):api().start(state.id,globalThis.OUTBASE_IDS.ulid())));
    root.querySelector('[data-explore-end]')?.addEventListener('click',e=>{const f=root.querySelector('form');if(f.elements.siteNumber.value||f.elements.features.value||f.elements.photo.files.length){root.querySelector('[data-explore-save-status]').textContent='入力中の場所を保存してから探索を終了してください。';return;}act(e.currentTarget,()=>api().finish(state.id,s.id));});
  }
  async function refresh(container){
    const root=container.matches?.('[data-camp-exploration]')?container:container.querySelector('[data-camp-exploration]');if(!root)return;
    const state=states.get(root);if(!state)return;const generation=++state.refreshGeneration;const payload=await (state.nativeEventId?api().loadCalendar(state.nativeEventId):api().load(state.id));if(!root.isConnected||generation!==state.refreshGeneration)return;state.payload=payload;state.id=payload.activity.id;root.dataset.campExploration=state.id;sessionUI(root,state);renderRecords(root,state);return payload;
  }
  function bind(main,value){
    const root=main.querySelector('[data-camp-exploration]');if(!root||states.has(root))return;
    const state={id:root.dataset.campExploration,nativeEventId:root.dataset.explorationCalendarId||null,payload:value.routePayload,position:null,busy:false,locating:false,refreshGeneration:0,requestId:globalThis.OUTBASE_IDS.ulid(),camera:null};states.set(root,state);
    const form=root.querySelector('form'),status=root.querySelector('[data-explore-save-status]'),locate=root.querySelector('[data-explore-locate]'),location=root.querySelector('[data-explore-location]');
    const live=()=>root.isConnected&&(state.nativeEventId?globalThis.OUTBASE_ROUTER.current().query.calendarEventId===state.nativeEventId:globalThis.OUTBASE_ROUTER.current().activityId===state.id)&&globalThis.OUTBASE_ROUTER.current().query.mode==='explore';
    root.querySelector('[data-explore-back]').onclick=()=>globalThis.OUTBASE_ROUTER.navigate(state.nativeEventId?'calendar':'activity',state.nativeEventId?{month:state.payload.nativeMonth||''}:{activityId:state.id},{transition:false,skipTransition:true});
    const category=()=>{const site=form.elements.category.value==='site';root.querySelector('[data-explore-number]').hidden=!site;form.elements.siteNumber.required=site;};form.elements.category.onchange=category;
    form.elements.photo.onchange=()=>{root.querySelector('[data-explore-photo-name]').textContent=form.elements.photo.files[0]?.name||'';};
    root.querySelector('[data-explore-clear-position]').onclick=()=>{state.position=null;location.textContent='位置なしで保存します。';root.querySelector('[data-explore-clear-position]').hidden=true;};
    locate.onclick=async()=>{if(state.locating)return;state.locating=true;locate.disabled=true;location.textContent='現在地を取得しています。';try{
      if(!navigator.geolocation)throw Error();const pos=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,maximumAge:0,timeout:15000}));if(!live())return;
      const point=globalThis.OUTBASE_LOCATION_RECORDER.point(pos);state.position=point;location.textContent=`位置を取得しました ±${Math.round(point.accuracy)}m。1分以内に保存してください。`;root.querySelector('[data-explore-clear-position]').hidden=false;
    }catch{if(live()){state.position=null;location.textContent='現在地を取得できませんでした。位置なしで写真とメモを保存できます。';}}finally{state.locating=false;if(locate.isConnected)locate.disabled=false;}};
    form.onsubmit=async e=>{e.preventDefault();if(state.busy||state.locating)return;const button=form.querySelector('[type=submit]');state.busy=true;button.disabled=true;status.textContent='保存しています。';let committed=false;
      try{await api().save({activityId:state.id,displayActivityId:state.id,sessionId:state.payload.session?.id,requestId:state.requestId,category:form.elements.category.value,siteNumber:form.elements.category.value==='site'?form.elements.siteNumber.value:'',features:form.elements.features.value,position:state.position,file:form.elements.photo.files[0]||null,guard:live});committed=true;
        form.reset();state.position=null;state.requestId=globalThis.OUTBASE_IDS.ulid();category();root.querySelector('[data-explore-photo-name]').textContent='';location.textContent='位置なしでも記録できます。';root.querySelector('[data-explore-clear-position]').hidden=true;status.textContent='この場所を端末に保存しました。';
        globalThis.OUTBASE_ACTIVITY_ROUTE_V16?.invalidate?.(state.id);globalThis.OUTBASE_SHELL_MODEL_V166?.invalidate?.('vault');await refresh(root);
      }catch(error){status.textContent=committed?'保存済みですが一覧を更新できませんでした。開き直すと確認できます。':error.message==='exploration_location_invalid'?'位置情報が古いか精度を確認できません。現在地を取り直すか、位置を外して保存してください。':error.message==='exploration_photo_invalid'?'JPEG・PNG・WebP・GIFの写真（20MBまで）を選んでください。入力は残っています。':'保存できませんでした。入力と写真は残っています。もう一度お試しください。';}finally{state.busy=false;if(button.isConnected)button.disabled=false;}
    };
    root.querySelector('[data-explore-filter]').onchange=()=>{state.camera=null;renderRecords(root,state);};sessionUI(root,state);renderRecords(root,state);
  }
  globalThis.OUTBASE_CAMP_EXPLORATION_UI=Object.freeze({markup,bind,refresh});
})();
