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
  const walkSaving=new Set();
  const walkLimits=new Map();
  const walkLimit=item=>globalThis.OUTBASE_KOTA_WALK.isWalk(item)?walkLimits.get(item.id)||5:5;
  const photoDrafts=new Map();
  const videoDrafts=new Map();
  const audioOpen=new Set();
  const audioSaving=new Set();
  const audioNotices=new Map();
  const photoUrls=new Set();
  const videoPlayers=new Set();
  function clearPhotoUrls(){
    for(const video of videoPlayers){video.pause();video.removeAttribute('src');video.load();}videoPlayers.clear();
    for(const url of photoUrls)URL.revokeObjectURL(url);photoUrls.clear();
  }
  function photoUrl(blob){const url=URL.createObjectURL(blob);photoUrls.add(url);return url;}
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

  const mapCameras=new Map();
  function walkMapMarkup(item,position,locations){
    const tracks=locations.tracks||[],pins=locations.pins||[];
    const newest=tracks.flat().reduce((latest,p)=>!latest||p.captured_at>latest.captured_at?p:latest,null);
    const current=position&&(!newest||position.time>=newest.captured_at)&&Number.isFinite(position.lat)&&Number.isFinite(position.lng)?{latitude:position.lat,longitude:position.lng}:null;
    const points=[...tracks.flat(),...pins.map(r=>r.payload),...(current?[current]:[])];
    const unlocated=!points.length;
    if(unlocated)points.push({latitude:36,longitude:138});
    const project=p=>{const lat=Math.max(-85.05112878,Math.min(85.05112878,p.latitude))*Math.PI/180;return {x:(p.longitude+180)/360,y:(1-Math.log(Math.tan(lat)+1/Math.cos(lat))/Math.PI)/2};};
    const anchor=project(points[0]).x;
    // Unwrap longitude so walks crossing the date line remain local.
    const unwrap=p=>{const v=project(p);v.x+=Math.round(anchor-v.x);return v;};
    const all=points.map(unwrap),minX=Math.min(...all.map(p=>p.x)),maxX=Math.max(...all.map(p=>p.x)),minY=Math.min(...all.map(p=>p.y)),maxY=Math.max(...all.map(p=>p.y));
    const fit=unlocated?5:Math.max(2,Math.min(17,Math.floor(Math.log2(Math.min(440/Math.max((maxX-minX)*256,0.001),248/Math.max((maxY-minY)*256,0.001))))));
    const camera=mapCameras.get(item.id),zoom=camera?.zoom??fit,centerX=camera?.x??(minX+maxX)/2,centerY=camera?.y??(minY+maxY)/2;
    const scale=256*2**zoom,left=centerX*scale-256,top=centerY*scale-160;
    const xy=p=>{const v=unwrap(p);return {x:v.x*scale-left,y:v.y*scale-top};};
    let tiles='';
    for(let x=Math.floor(left/256);x<=Math.floor((left+512)/256);x++)for(let y=Math.floor(top/256);y<=Math.floor((top+320)/256);y++){
      if(y<0||y>=2**zoom)continue;
      const wrapped=((x%2**zoom)+2**zoom)%2**zoom;
      tiles+=`<image data-walk-tile href="https://tile.openstreetmap.org/${zoom}/${wrapped}/${y}.png" x="${x*256-left}" y="${y*256-top}" width="256" height="256"/>`;
    }
    const lines=tracks.map(track=>`<polyline data-walk-track points="${track.map(p=>{const v=xy(p);return v.x+','+v.y;}).join(' ')}" fill="none" stroke="#176847" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
    const markers=pins.map(row=>{const p=xy(row.payload);return `<g data-walk-pin><circle cx="${p.x}" cy="${p.y}" r="11" fill="#a65c16" stroke="white" stroke-width="3"/><title>${row.payload.pin_kind==='parking'?'駐車位置':'場所ピン'}</title></g>`;}).join('');
    const last=current||newest,dot=last?xy(last):null;
    return `${unlocated?'<p data-walk-map-empty>現在地は未取得です。日本付近の地図を表示しています。「現在地を確認」で移動できます。</p>':''}<div data-walk-map style="margin-top:12px;border:1px solid #d8ded8;border-radius:16px;overflow:hidden;background:#edf1eb"><svg data-walk-map-canvas data-center-x="${centerX}" data-center-y="${centerY}" data-zoom="${zoom}" tabindex="0" viewBox="0 0 512 320" role="img" aria-label="散歩の地図。指で移動、矢印キーでも移動できます。緑線は歩いたルート、青点は現在地または最後の記録地点" style="display:block;width:100%;height:auto;touch-action:none;cursor:grab"><g data-walk-map-layer>${tiles}${lines}${markers}${dot?`<circle data-walk-position cx="${dot.x}" cy="${dot.y}" r="8" fill="#2474d8" stroke="white" stroke-width="3"/>`:''}</g></svg><div style="padding:8px;display:flex;flex-wrap:wrap;gap:8px;align-items:center"><button type="button" data-walk-zoom="1" style="min-width:44px;min-height:44px" aria-label="地図を拡大">＋</button><button type="button" data-walk-zoom="-1" style="min-width:44px;min-height:44px" aria-label="地図を縮小">−</button><button type="button" data-walk-zoom="0" style="min-width:44px;min-height:44px">全体</button><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style="margin-left:auto;font-size:12px">© OpenStreetMap contributors</a></div></div><p data-walk-map-status style="font-size:12px">指で地図を動かせます。「全体」でルート全体に戻ります。背景地図には通信が必要です。緑線は保存したルート、青点は現在地または最後の記録地点です。</p>`;
  }

  function gpsStatusMarkup(state,item){
    if(!globalThis.OUTBASE_KOTA_WALK.isWalk(item))return '';
    const gps=globalThis.OUTBASE_LOCATION_RECORDER.snapshot(item.id);
    const prior=(item.locationRecords||[]).some(row=>row.type==='gps_point');
    const stopped=!gps.tracking&&(prior||!!gps.notice);
    const title=gps.tracking?'GPS記録中':state.mode==='ended'?'GPS記録終了':state.mode==='paused'?'GPS停止中（一時停止）':stopped?'GPS停止中':'GPS未開始';
    return `<div data-kota-gps-status role="status" style="margin-top:12px;padding:12px;border:1px solid ${gps.tracking?'#b7d6bd':'#dfd2ae'};border-radius:14px;background:${gps.tracking?'#eef6ef':'#fff9eb'}"><b>${title}</b><p style="margin:6px 0;font-size:13px">${gps.tracking?'画面を開いている間、ルートを記録しています。':state.mode==='active'?'時間の記録は続いています。GPSが止まっている間の移動はルート・距離に追加されません。':state.mode==='paused'?'散歩を再開したあと、GPSも再開してください。':'保存したルートを地図で見返せます。'}</p>${!gps.tracking&&state.mode==='active'?`<button type="button" data-kota-gps-resume style="min-height:44px;padding:8px 16px;border:0;border-radius:12px;background:#184f37;color:white;font:inherit">${stopped?'GPS記録を再開':'GPS記録を開始'}</button>`:''}</div>`;
  }

  function mapMarkup(state,item){
    const gps=globalThis.OUTBASE_LOCATION_RECORDER.snapshot(item.id),locations=globalThis.OUTBASE_LOCATION_RECORDER.summary(item.locationRecords||[]);
    const latest=locations.tracks.flat().reduce((a,p)=>!a||p.captured_at>a.captured_at?p:a,null);
    const position=latest&&(!state.position||latest.captured_at>state.position.time)?{lat:latest.latitude,lng:latest.longitude,accuracy:latest.accuracy,time:latest.captured_at}:state.position;
    const label=position?`現在地取得済み ±${Math.round(Number(position.accuracy||0))||'—'}m`:'現在地はまだ取得していません';
    const coordinates=position?`${Number(position.lat).toFixed(5)}, ${Number(position.lng).toFixed(5)}`:'現在地を取得すると、ここに表示します';
    return `<section class="ob19-map-card ob36-card">
      <div class="ob19-card-head"><div><small>現在地</small><h2>地図と場所の記録</h2></div><span class="${position?'ready':''}">${esc(label)}</span></div>
      <div aria-label="現在地の座標">
        <p>${esc(coordinates)}</p>
      </div>
      ${walkMapMarkup(item,position,locations)}
      <button type="button" class="ob19-locate" data-ob19-locate>${icons.locate}<span><b>現在地を確認</b><small>端末の位置情報を一度取得</small></span>${icons.arrow}</button>
      <button type="button" class="ob19-locate" data-ob19-gps ${!gps.tracking&&state.mode!=='active'?'disabled':''}>${icons.locate}<span><b>${gps.tracking?'GPS記録を停止':'GPS記録を開始'}</b><small>歩いたルートを地図に残す</small></span>${icons.arrow}</button>
      <p role="status">${esc(gps.notice)}</p><p>画面を離れる・一時停止・終了でGPS記録は停止します。再開時は開始ボタンを押してください。距離は精度のよい位置情報からの概算です。</p>
      ${[locations.pins.find(r=>r.payload.pin_kind==='parking'),...locations.pins.filter(r=>r.payload.pin_kind==='place').slice(0,4)].filter(Boolean).map(r=>`<p>${r.payload.pin_kind==='parking'?'駐車位置':'場所ピン'} · ${esc(new Date(r.payload.captured_at).toLocaleString('ja-JP'))}<br><a href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(r.payload.latitude+','+r.payload.longitude)}" target="_blank" rel="noopener noreferrer">${esc(r.payload.latitude.toFixed(5)+', '+r.payload.longitude.toFixed(5))} を地図で開く</a></p>`).join('')}
    </section>`;
  }

  function actionButton(key,label,sub,icon){
    return `<button type="button" class="ob19-quick" data-ob19-feature="${esc(key)}"><span>${icon}</span><b>${esc(label)}</b><small>${esc(sub)}</small></button>`;
  }

  function savedNotes(item){
    const notes=(globalThis.OUTBASE_KOTA_WALK.isWalk(item)?item.walkNotes||[]:item.records||[]).filter(row=>row.type==='note');
    if(!notes.length)return '';
    return `<section class="ob19-recording ob19-saved-notes ob36-card"><div class="ob19-card-head"><h2>保存したメモ</h2></div>${notes.slice(0,walkLimit(item)).map(row=>{
      const payload=row.payload||{};
      return `<details><summary>${esc(payload.title||'メモ')}</summary><p>${esc(payload.text||payload.memo||'')}</p></details>`;
    }).join('')}</section>`;
  }

  function photosMarkup(item){
    const draft=photoDrafts.get(item.id);
    const editor=draft?`<section class="ob19-recording ob36-card" data-ob19-photo-editor><h2>写真を保存</h2><p>${esc(draft.file.name||'写真')}</p><img class="ob19-photo-preview" data-ob19-photo-draft alt="選択した写真"><p role="status">${esc(draft.error||(draft.saving?'写真を保存しています。':'端末内に保存します。JPEG・PNG・WebP・GIF、20MBまで。'))}</p><button type="button" data-ob19-photo-save ${draft.saving?'disabled':''}>写真を保存</button><button type="button" data-ob19-photo-cancel ${draft.saving?'disabled':''}>キャンセル</button></section>`:'';
    const photos=(item.photos||[]).slice(0,walkLimit(item));
    return `<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-ob19-photo-file hidden>${editor}${photos.length?`<section class="ob19-recording ob36-card"><h2>保存した写真</h2><div class="ob19-photo-grid">${photos.map(photo=>`<figure><img class="ob19-photo-preview" data-ob19-photo-key="${esc(photo.key)}" alt="${esc(photo.filename)}"><figcaption>${esc(photo.filename)}</figcaption><small data-ob19-photo-status>読み込み中</small></figure>`).join('')}</div></section>`:''}`;
  }
  function hydratePhotos(main,item){
    const draft=photoDrafts.get(item.id);
    const preview=main.querySelector('[data-ob19-photo-draft]');if(preview&&draft)preview.src=photoUrl(draft.file);
    main.querySelectorAll('[data-ob19-photo-key]').forEach(async image=>{
      try{
        const blob=await globalThis.OUTBASE_PHOTO_RECORDS.readBlob(image.dataset.ob19PhotoKey);
        if(!image.isConnected)return;
        if(!blob)throw new Error('photo_missing');
        const status=image.parentElement.querySelector('[data-ob19-photo-status]');
        image.onload=()=>{status.textContent='端末に保存済み';};
        image.onerror=()=>{status.textContent='写真を表示できませんでした。';};
        image.src=photoUrl(blob);
      }catch(_error){if(image.isConnected)image.parentElement.querySelector('[data-ob19-photo-status]').textContent='写真を読み込めませんでした。';}
    });
  }

  function videosMarkup(item){
    const draft=videoDrafts.get(item.id),videos=(item.videos||[]).slice(0,walkLimit(item));
    const editor=draft?`<section class="ob19-recording ob36-card" data-ob19-video-editor><h2>動画を保存</h2><p>${esc(draft.file.name||'動画')}</p><video class="ob19-video-preview" controls playsinline preload="metadata" data-ob19-video-draft></video><p role="status">${esc(draft.error||(draft.saving?'動画を保存しています。':'端末内に保存します。MP4・WebM、50MBまで。'))}</p><button type="button" data-ob19-video-save ${draft.saving?'disabled':''}>動画を保存</button><button type="button" data-ob19-video-cancel ${draft.saving?'disabled':''}>キャンセル</button></section>`:'';
    return `<input type="file" accept="video/mp4,video/webm" data-ob19-video-file hidden>${editor}${videos.length?`<section class="ob19-recording ob36-card"><h2>保存した動画（直近${videos.length}件）</h2><div class="ob19-video-grid">${videos.map(video=>`<figure><video class="ob19-video-preview" controls playsinline preload="metadata" data-ob19-video-key="${esc(video.key)}"></video><figcaption>${esc(video.filename)}</figcaption><small data-ob19-video-status>読み込み中</small></figure>`).join('')}</div></section>`:''}`;
  }
  function hydrateVideos(main,item){
    const draft=videoDrafts.get(item.id),preview=main.querySelector('[data-ob19-video-draft]');
    if(preview&&draft){videoPlayers.add(preview);preview.src=photoUrl(draft.file);}
    main.querySelectorAll('[data-ob19-video-key]').forEach(async video=>{
      videoPlayers.add(video);
      try{
        const blob=await globalThis.OUTBASE_VIDEO_RECORDS.readBlob(video.dataset.ob19VideoKey);
        if(!video.isConnected)return;if(!blob)throw new Error('video_missing');
        const status=video.parentElement.querySelector('[data-ob19-video-status]');
        video.onloadedmetadata=()=>{status.textContent='端末に保存済み';};
        video.onerror=()=>{status.textContent='この動画は再生できません。';};
        video.src=photoUrl(blob);
      }catch(_error){if(video.isConnected)video.parentElement.querySelector('[data-ob19-video-status]').textContent='動画を読み込めませんでした。';}
    });
  }

  function audioMarkup(item){
    const draft=globalThis.OUTBASE_AUDIO_RECORDER.snapshot(item.id),busy=audioSaving.has(item.id);
    const editor=audioOpen.has(item.id)?`<section class="ob19-recording ob36-card" data-ob19-audio-editor><h2>音声を録音</h2><p>最長5分・20MBまで。画面を離れると録音を停止します。文字起こしは行いません。</p><p role="status">${esc(audioNotices.get(item.id)||draft.notice||'「録音開始」でマイクを使用します。')}</p>${draft.status==='recording'?'<b data-ob19-audio-elapsed>00:00</b>':''}${draft.file?'<audio controls preload="metadata" data-ob19-audio-draft></audio>':''}<div>${['idle','error'].includes(draft.status)?'<button type="button" data-ob19-audio-start>録音開始</button>':''}${draft.status==='recording'?'<button type="button" data-ob19-audio-stop>録音停止</button>':''}${draft.status==='ready'?`<button type="button" data-ob19-audio-save ${busy?'disabled':''}>音声を保存</button>`:''}<button type="button" data-ob19-audio-cancel ${busy?'disabled':''}>キャンセル</button></div></section>`:'';
    const audios=(item.audios||[]).slice(0,walkLimit(item));
    return `${editor}${audios.length?`<section class="ob19-recording ob36-card"><h2>保存した音声（直近${audios.length}件）</h2>${audios.map(audio=>`<figure class="ob19-audio-item"><figcaption>${esc(audio.filename)}</figcaption><audio controls preload="metadata" data-ob19-audio-key="${esc(audio.key)}"></audio><small data-ob19-audio-status>読み込み中</small></figure>`).join('')}</section>`:''}`;
  }
  function hydrateAudio(main,item){
    const draft=globalThis.OUTBASE_AUDIO_RECORDER.snapshot(item.id),preview=main.querySelector('[data-ob19-audio-draft]');
    if(preview&&draft.file){videoPlayers.add(preview);preview.src=photoUrl(draft.file);}
    main.querySelectorAll('[data-ob19-audio-key]').forEach(async audio=>{
      videoPlayers.add(audio);
      try{
        const blob=await globalThis.OUTBASE_AUDIO_RECORDS.readBlob(audio.dataset.ob19AudioKey);if(!audio.isConnected)return;if(!blob)throw new Error('audio_missing');
        const status=audio.parentElement.querySelector('[data-ob19-audio-status]');
        audio.onloadedmetadata=()=>{status.textContent='端末に保存済み・文字起こしなし';};audio.onerror=()=>{status.textContent='音声を再生できません。';};audio.src=photoUrl(blob);
      }catch(_error){if(audio.isConnected)audio.parentElement.querySelector('[data-ob19-audio-status]').textContent='音声を読み込めませんでした。';}
    });
  }

  function walkMarkup(item,state){
    const api=globalThis.OUTBASE_KOTA_WALK;if(!api.isWalk(item))return '';
    const counts=api.summary(item.walkRecords||[]),ended=state.mode==='ended',awake=globalThis.OUTBASE_SCREEN_AWAKE.snapshot(item.id);
    return `<section class="ob19-recording ob36-card" data-kota-walk><h2>${ended?'コタ散歩のまとめ':'コタの様子を記録'}</h2>
      <div class="ob19-quick-grid">${Object.entries(api.EVENTS).map(([kind,label])=>`<button class="ob19-quick" type="button" data-kota-event="${kind}" ${state.mode!=='active'||walkSaving.has(item.id)?'disabled':''}><b>${esc(label)}</b><small>${counts[kind]}回${ended?'':' · タップで記録'}</small></button>`).join('')}</div>
      ${!ended?`<button type="button" class="ob19-locate" data-kota-awake ${state.mode!=='active'?'disabled':''}>${icons.play}<span><b>${awake.enabled?'点灯維持をやめる':'画面を点灯したままにする'}</b></span>${icons.arrow}</button><p role="status" data-kota-awake-status>${esc(awake.notice)}</p><p>ONにした間は自動消灯を防ぎます。画面を手動で閉じた場合、GPSは停止します。復帰後はGPS開始ボタンを押してください。</p>`:''}
      <p>${ended?'散歩の記録は端末に保存済みです。下の「散歩の履歴を見る」から振り返れます。':'時刻と一緒に端末へ保存します。一時停止中は追加できません。'}</p>
      ${!ended&&(item.walkRecords||[]).length?`<button type="button" data-kota-undo ${walkSaving.has(item.id)?'disabled':''}>直前の記録を取り消す</button>`:''}
      <details><summary>今回の出来事</summary>${(item.walkRecords||[]).slice().reverse().map(r=>`<p>${esc(new Date(r.occurredAt).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}))} · ${esc(api.EVENTS[r.payload?.walk_event]||'記録')}</p>`).join('')||'<p>まだ記録はありません。</p>'}</details></section>`;
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
        <div class="ob19-metrics"><div><small>経過時間</small><b data-ob19-elapsed>${formatElapsed(currentElapsed(state))}</b></div><div><small>距離</small><b>${(globalThis.OUTBASE_LOCATION_RECORDER.summary(item.locationRecords||[]).meters/1000).toFixed(2)} <i>km</i></b></div></div>
        ${gpsStatusMarkup(state,item)}
        <div class="ob19-controls">
          <button type="button" class="ob19-control primary" data-ob19-control ${state.mode==='ended'||saving.has(item.id)||!savedSessions.has(String(item.id))?'disabled':''}>${controlIcon(state.mode)}<span>${esc(controlText(state.mode))}</span></button>
          <button type="button" class="ob19-control secondary" data-ob19-end ${['active','paused'].includes(state.mode)&&!saving.has(item.id)&&savedSessions.has(String(item.id))?'':'disabled'}>${icons.stop}<span>${globalThis.OUTBASE_KOTA_WALK.isWalk(item)?'散歩を終了':'終了'}</span></button>
        </div>
      </section>

      ${mapMarkup(state,item)}
      ${walkMarkup(item,state)}

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
        <p class="ob19-inline-notice" data-ob19-notice role="status">${esc(state.notice||'メモ・写真・動画・音声を端末に保存できます。音声の文字起こしは行いません。')}</p>
      </section>

      ${savedNotes(item)}
      ${photosMarkup(item)}
      ${videosMarkup(item)}
      ${audioMarkup(item)}
      ${globalThis.OUTBASE_KOTA_WALK.isWalk(item)&&[item.walkNotes,item.photos,item.videos,item.audios].some(rows=>(rows||[]).length>walkLimit(item))?'<button type="button" class="ob19-detail-button" data-kota-more>保存した記録をさらに表示（各5件）</button>':''}

      <section class="ob19-save ob36-card">
        <span>${icons.cloud}</span><div><b>活動状態と記録を端末に保存</b><small>メモ・写真・動画・音声に対応。文字起こしは行いません。</small></div><em>端末保存</em>
      </section>

      <button type="button" class="ob19-detail-button" data-ob19-detail><span>${globalThis.OUTBASE_KOTA_WALK.isWalk(item)&&state.mode==='ended'?'散歩の履歴を見る':'予定詳細を見る'}</span>${icons.arrow}</button>
    </section>`;
  }

  function clearTimer(){if(tickTimer){clearInterval(tickTimer);tickTimer=null;}}
  function startTimer(main,item){
    clearTimer();
    const update=()=>{
      const node=main?.querySelector?.('[data-ob19-elapsed]');
      if(!node||!main.isConnected){clearTimer();return;}
      node.textContent=formatElapsed(currentElapsed(uiState(item.id)));
      const audio=main.querySelector('[data-ob19-audio-elapsed]'),draft=globalThis.OUTBASE_AUDIO_RECORDER.snapshot(item.id);
      if(audio&&draft.status==='recording')audio.textContent=formatElapsed(Date.now()-draft.startedAt);
    };
    update();tickTimer=setInterval(update,1000);
  }

  function rerender(main,result,route,{preserveScroll=true}={}){
    const y=preserveScroll?window.scrollY:0;
    clearPhotoUrls();
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

  function bindGpsButtons(main,item){
    main.querySelectorAll('[data-ob19-gps],[data-kota-gps-resume]').forEach(button=>{button.onclick=()=>{const gps=globalThis.OUTBASE_LOCATION_RECORDER;if(gps.snapshot(item.id).tracking)gps.stop();else gps.start(item.id);};});
  }
  function bindLocation(main,result,route){
    const item=result.item;
    const canvas=main.querySelector('[data-walk-map-canvas]');
    const camera=()=>({x:Number(canvas.dataset.centerX),y:Number(canvas.dataset.centerY),zoom:Number(canvas.dataset.zoom)});
    const redraw=()=>{const latest=cached(item.id)||result;main.querySelector('.ob19-map-card').outerHTML=mapMarkup(uiState(item.id),latest.item);bindLocation(main,latest,route);};
    const pan=(dx,dy)=>{const view=camera(),scale=256*2**view.zoom;mapCameras.set(item.id,{...view,x:view.x-dx/scale,y:Math.max(0,Math.min(1,view.y-dy/scale))});};
    main.querySelectorAll('[data-walk-zoom]').forEach(button=>button.addEventListener('click',()=>{
      const delta=Number(button.dataset.walkZoom);if(delta){const view=camera();mapCameras.set(item.id,{...view,zoom:Math.max(2,Math.min(19,view.zoom+delta))});}else mapCameras.delete(item.id);
      redraw();
    }));
    if(canvas){
      let drag=null;
      canvas.addEventListener('pointerdown',event=>{if(!event.isPrimary||event.button!==0)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY};canvas.dataset.dragging='yes';canvas.setPointerCapture(event.pointerId);});
      canvas.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;const box=canvas.getBoundingClientRect();canvas.querySelector('[data-walk-map-layer]').setAttribute('transform',`translate(${(event.clientX-drag.x)*512/box.width} ${(event.clientY-drag.y)*320/box.height})`);});
      const finish=event=>{if(!drag||drag.id!==event.pointerId)return;const box=canvas.getBoundingClientRect();if(event.type==='pointerup')pan((event.clientX-drag.x)*512/box.width,(event.clientY-drag.y)*320/box.height);drag=null;delete canvas.dataset.dragging;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);redraw();};
      canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);
      canvas.addEventListener('lostpointercapture',()=>{if(drag){drag=null;delete canvas.dataset.dragging;redraw();}});
      canvas.addEventListener('keydown',event=>{const delta={ArrowLeft:[64,0],ArrowRight:[-64,0],ArrowUp:[0,64],ArrowDown:[0,-64]}[event.key];if(!delta)return;event.preventDefault();pan(...delta);redraw();main.querySelector('[data-walk-map-canvas]')?.focus({preventScroll:true});});
    }
    main.querySelectorAll('[data-walk-tile]').forEach(tile=>tile.addEventListener('error',()=>{
      tile.style.visibility='hidden';
      const status=main.querySelector('[data-walk-map-status]');if(status)status.textContent='背景地図を取得できません。保存したルートと地点は表示しています。通信状況を確認してください。';
    }));
    bindGpsButtons(main,item);

    main.querySelector('[data-ob19-locate]')?.addEventListener('click',event=>{
      const button=event.currentTarget;
      const notice=main.querySelector('[data-ob19-notice]');
      if(!navigator.geolocation){if(notice)notice.textContent='この端末では位置情報を利用できません。';return;}
      button.disabled=true;button.classList.add('is-loading');
      navigator.geolocation.getCurrentPosition(position=>{
        mapCameras.delete(item.id);
        writeUiState(item.id,{position:{lat:position.coords.latitude,lng:position.coords.longitude,accuracy:position.coords.accuracy,time:position.timestamp}});
        const current=globalThis.OUTBASE_ROUTER?.current?.();
        if(current?.name==='record'&&current.activityId===item.id){main.querySelector('.ob19-map-card').outerHTML=mapMarkup(uiState(item.id),item);bindLocation(main,result,current);}
      },error=>{
        button.disabled=false;button.classList.remove('is-loading');
        if(notice)notice.textContent=error?.code===1?'位置情報の利用が許可されていません。':'現在地を取得できませんでした。';
      },{enableHighAccuracy:true,timeout:12000,maximumAge:15000});
    });

  }

  function bind(main,result,route){
    main.querySelector('[data-ob19-home]')?.addEventListener('click',()=>globalThis.OUTBASE_ROUTER.navigate('home',{}, {replace:true}));
    if(result.status!=='ready')return;
    const item=result.item;
    activateContext(item,'execution-bind');
    globalThis.OUTBASE_LOCATION_RECORDER.startRequested(item.id);

    main.querySelector('[data-kota-awake]')?.addEventListener('click',()=>globalThis.OUTBASE_SCREEN_AWAKE.toggle(item.id));
    main.querySelector('[data-kota-more]')?.addEventListener('click',()=>{walkLimits.set(item.id,walkLimit(item)+5);rerender(main,result,route);});
    main.querySelectorAll('[data-kota-event],[data-kota-undo]').forEach(button=>button.addEventListener('click',async()=>{
      if(walkSaving.has(item.id))return;walkSaving.add(item.id);main.querySelectorAll('[data-kota-event]').forEach(node=>node.disabled=true);
      let committed=false,refreshed=result;
      try{
        if(button.hasAttribute('data-kota-undo'))await globalThis.OUTBASE_KOTA_WALK.undo({activityId:item.id,displayActivityId:route.activityId,recordId:item.walkRecords[0].id});
        else await globalThis.OUTBASE_KOTA_WALK.addEvent({activityId:item.id,displayActivityId:route.activityId,kind:button.dataset.kotaEvent,requestId:globalThis.OUTBASE_IDS.ulid()});committed=true;
        cache.delete(String(item.id));globalThis.OUTBASE_SHELL_MODEL_V166.invalidate();globalThis.OUTBASE_ACTIVITY_ROUTE_V16.invalidate(item.id);globalThis.OUTBASE_ROUTE_UNIFICATION_V22.clearPayloadCache();globalThis.OUTBASE_VAULT_ROUTE_V13?.invalidate?.();
        writeUiState(item.id,{notice:button.hasAttribute('data-kota-undo')?'直前の記録を取り消しました。':'コタの様子を保存しました。'});const loaded=await loadFast(item.id,{force:true});
        if(loaded.status==='ready')refreshed=loaded;else writeUiState(item.id,{notice:'記録は保存済みです。表示を更新するには画面を開き直してください。'});
      }catch(error){writeUiState(item.id,{notice:committed?'記録は保存済みです。画面を開き直してください。':'記録できませんでした。散歩の状態と空き容量を確認して再度お試しください。'});}
      finally{walkSaving.delete(item.id);const current=globalThis.OUTBASE_ROUTER.current();if(main.isConnected&&current.name==='record'&&current.activityId===item.id)rerender(main,refreshed,current);}
    }));
    main.querySelector('[data-ob19-back]')?.addEventListener('click',()=>backToOrigin(route,item));
    main.querySelector('[data-ob19-detail]')?.addEventListener('click',()=>{
      clearTimer();
      const context=activityContext(item,{returnShell:'record',returnActivityId:item.id});
      globalThis.OUTBASE_ROUTER.navigate('activity',contextApi()?.params?.(context)||{activityId:item.id,planId:planId(item)},{transition:false,skipTransition:true});
    });

    async function saveAction(action){
      if(saving.has(item.id))return;
      if(action==='pause'||action==='end'){globalThis.OUTBASE_LOCATION_RECORDER.stop();globalThis.OUTBASE_SCREEN_AWAKE.disable();}
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

    bindLocation(main,result,route);

    main.querySelectorAll('[data-ob19-feature]').forEach(button=>button.addEventListener('click',()=>{
      if(button.dataset.ob19Feature==='photo'){main.querySelector('[data-ob19-photo-file]').click();return;}
      if(button.dataset.ob19Feature==='video'){main.querySelector('[data-ob19-video-file]').click();return;}
      if(button.dataset.ob19Feature==='audio'){if(audioSaving.has(item.id))return;audioOpen.add(item.id);audioNotices.delete(item.id);rerender(main,result,route);return;}
      if(button.dataset.ob19Feature==='memo'){
        clearTimer();
        const api=globalThis.OUTBASE_ROUTER;
        api.navigate('memo',{activityId:item.id,planId:planId(item),returnShell:'record',returnActivityId:item.id,recordReturnShell:route.returnShell||'preparation'},{transition:false,skipTransition:true});
        api.history.replace({...api.history.state(),outbaseExecutionMemoOrigin:item.id});
        return;
      }
      if(['pin','parking'].includes(button.dataset.ob19Feature)){globalThis.OUTBASE_LOCATION_RECORDER.pin(item.id,button.dataset.ob19Feature==='pin'?'place':'parking');return;}
      const labels={photo:'写真',video:'動画',audio:'音声',memo:'メモ',pin:'場所ピン',parking:'駐車位置'};
      const notice=main.querySelector('[data-ob19-notice]');
      if(notice)notice.textContent=`${labels[button.dataset.ob19Feature]||'記録'}は、FIELD03の保存中核を移植した完成版で有効になります。`;
      button.classList.add('is-selected');
      setTimeout(()=>button.classList.remove('is-selected'),500);
    }));

    main.querySelector('[data-ob19-photo-file]')?.addEventListener('change',event=>{
      const file=event.target.files?.[0];if(!file)return;
      if(photoDrafts.get(item.id)?.saving)return;
      photoDrafts.set(item.id,{file,requestId:globalThis.OUTBASE_IDS.ulid(),saving:false,error:''});
      rerender(main,result,route);
    });
    main.querySelector('[data-ob19-photo-cancel]')?.addEventListener('click',()=>{photoDrafts.delete(item.id);rerender(main,result,route);});
    main.querySelector('[data-ob19-photo-save]')?.addEventListener('click',async()=>{
      const draft=photoDrafts.get(item.id);if(!draft||draft.saving)return;
      draft.saving=true;draft.error='';rerender(main,result,route);
      let refreshed=result;
      try{
        await globalThis.OUTBASE_PHOTO_RECORDS.save({activityId:item.id,displayActivityId:route.activityId,file:draft.file,requestId:draft.requestId});
        photoDrafts.delete(item.id);writeUiState(item.id,{notice:'写真を端末に保存しました。'});
        cache.delete(String(item.id));globalThis.OUTBASE_SHELL_MODEL_V166?.invalidate?.();
        globalThis.OUTBASE_ACTIVITY_ROUTE_V16?.invalidate?.(item.id);
        globalThis.OUTBASE_ROUTE_UNIFICATION_V22?.clearPayloadCache?.();
        globalThis.OUTBASE_VAULT_ROUTE_V13?.invalidate?.();
        const loaded=await loadFast(item.id,{force:true});
        if(loaded.status==='ready'){
          refreshed=loaded;savedSessions.set(String(item.id),globalThis.OUTBASE_EXECUTION_SESSION.fromActivity(loaded.item));
        }else writeUiState(item.id,{notice:'写真は保存済みですが、表示を更新できませんでした。実行画面を開き直してください。'});
      }catch(error){draft.error=error?.message==='photo_file_not_supported'?'JPEG・PNG・WebP・GIFの画像（20MBまで）を選んでください。':'写真を保存できませんでした。選択した写真は残っています。もう一度お試しください。';}
      finally{
        draft.saving=false;
        if(globalThis.OUTBASE_ROUTER.current().name==='record'&&globalThis.OUTBASE_ROUTER.current().activityId===item.id)rerender(main,refreshed,route);
      }
    });

    main.querySelector('[data-ob19-video-file]')?.addEventListener('change',event=>{
      const file=event.target.files?.[0];if(!file||videoDrafts.get(item.id)?.saving)return;
      videoDrafts.set(item.id,{file,requestId:globalThis.OUTBASE_IDS.ulid(),saving:false,error:''});rerender(main,result,route);
    });
    main.querySelector('[data-ob19-video-cancel]')?.addEventListener('click',()=>{videoDrafts.delete(item.id);rerender(main,result,route);});
    main.querySelector('[data-ob19-video-save]')?.addEventListener('click',async()=>{
      const draft=videoDrafts.get(item.id);if(!draft||draft.saving)return;
      draft.saving=true;draft.error='';rerender(main,result,route);let refreshed=result;
      try{
        await globalThis.OUTBASE_VIDEO_RECORDS.save({activityId:item.id,displayActivityId:route.activityId,file:draft.file,requestId:draft.requestId});
        videoDrafts.delete(item.id);writeUiState(item.id,{notice:'動画を端末に保存しました。'});
        cache.delete(String(item.id));globalThis.OUTBASE_SHELL_MODEL_V166?.invalidate?.();
        globalThis.OUTBASE_ACTIVITY_ROUTE_V16?.invalidate?.(item.id);globalThis.OUTBASE_ROUTE_UNIFICATION_V22?.clearPayloadCache?.();globalThis.OUTBASE_VAULT_ROUTE_V13?.invalidate?.();
        const loaded=await loadFast(item.id,{force:true});
        if(loaded.status==='ready'){refreshed=loaded;savedSessions.set(String(item.id),globalThis.OUTBASE_EXECUTION_SESSION.fromActivity(loaded.item));}
        else writeUiState(item.id,{notice:'動画は保存済みですが、表示を更新できませんでした。実行画面を開き直してください。'});
      }catch(error){draft.error=error?.message==='video_file_not_supported'?'MP4・WebMの動画（50MBまで）を選んでください。':'動画を保存できませんでした。選択した動画は残っています。再生できるファイルか確認して、もう一度お試しください。';}
      finally{draft.saving=false;if(globalThis.OUTBASE_ROUTER.current().name==='record'&&globalThis.OUTBASE_ROUTER.current().activityId===item.id)rerender(main,refreshed,route);}
    });

    main.querySelector('[data-ob19-audio-start]')?.addEventListener('click',()=>{audioNotices.delete(item.id);globalThis.OUTBASE_AUDIO_RECORDER.start(item.id);});
    main.querySelector('[data-ob19-audio-stop]')?.addEventListener('click',()=>globalThis.OUTBASE_AUDIO_RECORDER.stop(item.id));
    main.querySelector('[data-ob19-audio-cancel]')?.addEventListener('click',()=>{audioOpen.delete(item.id);audioNotices.delete(item.id);globalThis.OUTBASE_AUDIO_RECORDER.cancel(item.id);rerender(main,result,route);});
    main.querySelector('[data-ob19-audio-save]')?.addEventListener('click',async()=>{
      const draft=globalThis.OUTBASE_AUDIO_RECORDER.snapshot(item.id);if(!draft.file||audioSaving.has(item.id))return;
      audioSaving.add(item.id);audioNotices.set(item.id,'音声を保存しています。');rerender(main,result,route);let refreshed=result;
      try{
        await globalThis.OUTBASE_AUDIO_RECORDS.save({activityId:item.id,displayActivityId:route.activityId,file:draft.file,requestId:draft.requestId});
        audioOpen.delete(item.id);audioNotices.delete(item.id);globalThis.OUTBASE_AUDIO_RECORDER.cancel(item.id);writeUiState(item.id,{notice:'音声を端末に保存しました。文字起こしは行っていません。'});
        cache.delete(String(item.id));globalThis.OUTBASE_SHELL_MODEL_V166?.invalidate?.();globalThis.OUTBASE_ACTIVITY_ROUTE_V16?.invalidate?.(item.id);globalThis.OUTBASE_ROUTE_UNIFICATION_V22?.clearPayloadCache?.();globalThis.OUTBASE_VAULT_ROUTE_V13?.invalidate?.();
        const loaded=await loadFast(item.id,{force:true});
        if(loaded.status==='ready'){refreshed=loaded;savedSessions.set(String(item.id),globalThis.OUTBASE_EXECUTION_SESSION.fromActivity(loaded.item));}
        else writeUiState(item.id,{notice:'音声は保存済みですが、表示を更新できませんでした。実行画面を開き直してください。'});
      }catch(_error){audioNotices.set(item.id,'音声を保存できませんでした。録音は残っています。もう一度お試しください。');}
      finally{audioSaving.delete(item.id);if(globalThis.OUTBASE_ROUTER.current().name==='record'&&globalThis.OUTBASE_ROUTER.current().activityId===item.id)rerender(main,refreshed,route);}
    });

    hydratePhotos(main,item);hydrateVideos(main,item);hydrateAudio(main,item);
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
    addEventListener('pagehide',clearPhotoUrls);
    addEventListener('outbase:navigation',()=>{if(globalThis.OUTBASE_ROUTER?.current?.().name!=='record')clearPhotoUrls();});
    addEventListener('outbase:audio-change',event=>{const route=globalThis.OUTBASE_ROUTER?.current?.();if(route?.name==='record'&&route.activityId===event.detail.activityId&&audioOpen.has(route.activityId))globalThis.OUTBASE_SHELL_V166?.render?.('audio-change');});
  }

  const renderer=Object.freeze({
    ...base,
    __executionV19:true,
    async mount(root,options={}){
      const requested=globalThis.OUTBASE_ROUTER?.current?.()||{};
      if(requested.name!=='record'){
        clearTimer();
        clearPhotoUrls();
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

  globalThis.addEventListener('outbase:screen-awake-change',event=>{
    const id=event.detail.activityId,route=globalThis.OUTBASE_ROUTER.current();if(route.name!=='record'||route.activityId!==id)return;
    const snapshot=globalThis.OUTBASE_SCREEN_AWAKE.snapshot(id),button=document.querySelector('[data-kota-awake]'),status=document.querySelector('[data-kota-awake-status]');
    if(button){const label=button.querySelector('b')||button;label.textContent=snapshot.enabled?'点灯維持をやめる':'画面を点灯したままにする';}if(status)status.textContent=snapshot.notice;
  });

  globalThis.addEventListener('outbase:location-change',async event=>{
    const id=event.detail.activityId;
    cache.delete(String(id));
    globalThis.OUTBASE_SHELL_MODEL_V166?.invalidate?.();
    globalThis.OUTBASE_ACTIVITY_ROUTE_V16?.invalidate?.(id);
    globalThis.OUTBASE_ROUTE_UNIFICATION_V22?.clearPayloadCache?.();
    const route=globalThis.OUTBASE_ROUTER?.current?.();
    if(route?.name!=='record'||route.activityId!==id)return;
    const result=await loadFast(id,{force:true});
    const current=globalThis.OUTBASE_ROUTER?.current?.();
    const main=document.querySelector('.ob3-main-record');
    if(main&&current?.name==='record'&&current.activityId===id&&result.status==='ready'){
      const dragging=main.querySelector('[data-walk-map-canvas]')?.dataset.dragging==='yes';
      if(!dragging)main.querySelector('.ob19-map-card').outerHTML=mapMarkup(uiState(id),result.item);
      const gpsStatus=main.querySelector('[data-kota-gps-status]');if(gpsStatus)gpsStatus.outerHTML=gpsStatusMarkup(uiState(id),result.item);
      if(!dragging)bindLocation(main,result,current);else bindGpsButtons(main,result.item);
      const distance=main.querySelector('.ob19-metrics > div:last-child b');
      if(distance)distance.innerHTML=(globalThis.OUTBASE_LOCATION_RECORDER.summary(result.item.locationRecords||[]).meters/1000).toFixed(2)+' <i>km</i>';
    }
  });

  globalThis.OUTBASE_EXECUTION_ROUTE_V19=Object.freeze({
    loadFast,cached,prime,invalidate(activityId){cache.delete(String(activityId||''));},uiState,writeUiState,UI_STATE_KEY
  });
  globalThis.OUTBASE_SHELL_RENDERER_V166=renderer;
  globalThis.OUTBASE_SHELL_RENDERER_V165=renderer;
  globalThis.OUTBASE_SHELL_RENDERER_V164=renderer;
})();
