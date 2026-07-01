/* =========================================================
   OUTBASE outbaseLifeV211.js
   UI v211: 画面単一化・散歩専用UI固定
   - 旧ホーム/旧散歩UIの混在を止める
   - 散歩中は専用UIのみ：写真/動画/音声/メモ/犬友/スポット/終了
   - 下ナビは散歩中に出さない
   - 散歩終了後は結果画面へ
========================================================= */
(function(){
  'use strict';

  const V='211';
  const ROOT='outbaseLifeOSV211';
  const STYLE='outbaseLifeOSV211Style';
  const WALK_PANEL='outbaseWalkPanelV211';
  const RESULT='outbaseWalkResultPageV211';
  const VIDEO_INPUT='walkVideoInputV211';
  const PAGES={record:'outbaseRecordPageV211',calendar:'outbaseCalendarPageV211',project:'outbaseProjectPageV211',assets:'outbaseAssetsPageV211'};
  let route='home';
  let voiceRecorder=null;
  let voiceChunks=[];
  let enforcing=false;

  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const now=()=>new Date().toLocaleString();
  const activeWalk=()=>{try{return typeof currentSession!=='undefined'&&currentSession&&currentSession.type==='walk'&&currentSession.status===EVENT_STATUS.ACTIVE;}catch(e){return false;}};
  const activeState=()=>{try{return typeof hasActiveState==='function'&&hasActiveState();}catch(e){return false;}};

  function ready(){document.body.classList.add('outbase-life-ready');}
  function addStyle(){
    if($(STYLE)) return;
    const s=document.createElement('style');s.id=STYLE;s.textContent=`
      :root{--obg:#1f6f3a;--obd:#123d25;--obs:#edf6ee;--obc:#fbfaf5;--obt:#243127;--obm:#6b766c;--obl:#e5ebe4;--obr:#c91f28;}
      body{background:#fbfaf5}.page{box-sizing:border-box}.life211-page,#homePage{background:linear-gradient(180deg,#f4f8f2 0%,#fbfaf5 100%);padding:14px 14px 104px}.life211-wrap{display:flex;flex-direction:column;gap:14px}.life211-card{background:#fff;border:1px solid rgba(31,111,58,.08);border-radius:24px;padding:16px;box-shadow:0 10px 24px rgba(20,81,45,.08);color:var(--obt)}
      .life211-hero{background:linear-gradient(135deg,#1f6f3a,#4f8f5b);color:#fff;min-height:128px;position:relative;overflow:hidden}.life211-hero:after{content:'';position:absolute;right:22px;top:18px;width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,.35)}.life211-k{font-size:12px;letter-spacing:.12em;opacity:.92}.life211-title{font-size:28px;font-weight:900;line-height:1.25;position:relative;z-index:1}.life211-sub{font-size:13px;line-height:1.55;margin-top:8px;opacity:.92;position:relative;z-index:1}
      .life211-grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.life211-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.life211-grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.life211-btn,.walk211-btn,.result211-btn{border:1px solid var(--obl);background:#fff;color:var(--obd);border-radius:18px;font-weight:900;min-height:58px;padding:10px;font-size:15px}.life211-primary,.walk211-primary{background:linear-gradient(180deg,var(--obg),var(--obd));color:#fff;border:0}.life211-btn span,.walk211-btn span{display:block;font-size:22px;margin-bottom:4px}.life211-mini{border:1px solid var(--obl);border-radius:18px;padding:12px;min-height:82px;background:#fff}.life211-label,.life211-note{font-size:12px;color:var(--obm);line-height:1.5}.life211-value{font-size:20px;font-weight:900;line-height:1.3}
      .life211-nav{position:fixed;left:50%;transform:translateX(-50%);bottom:10px;width:min(680px,calc(100vw - 20px));display:grid;grid-template-columns:repeat(5,1fr);gap:2px;background:rgba(255,255,255,.96);border:1px solid rgba(31,111,58,.1);border-radius:22px;box-shadow:0 10px 22px rgba(20,81,45,.12);padding:8px;z-index:70}.life211-nav button{border:0;background:transparent;color:var(--obm);font-size:11px;font-weight:900;min-height:48px}.life211-nav button.on{color:var(--obd)}.life211-nav span{display:block;font-size:20px}.life211-active{border-left:5px solid var(--obg)}
      #walkPage{background:linear-gradient(180deg,#f4f8f2 0%,#fbfaf5 100%);padding:14px 14px 26px!important}#walkPage .life211-nav{display:none!important}#walkPage>.card{border-radius:24px;box-shadow:0 10px 24px rgba(20,81,45,.08);border:1px solid rgba(31,111,58,.08)}#walkPage .timer{font-size:44px;font-weight:900;text-align:center}.walk211-hide{display:none!important}.walk211-card{display:flex;flex-direction:column;gap:12px}.walk211-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.walk211-badge{font-size:12px;background:#edf6ee;color:var(--obd);border-radius:999px;padding:6px 10px;font-weight:900}.walk211-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.walk211-btn{min-height:76px}.walk211-end{background:linear-gradient(180deg,#d4242d,#a5161d);color:#fff;border:0;min-height:70px}.walk211-detail{border:1px solid var(--obl);border-radius:18px;padding:10px;background:#fff}.walk211-detail summary{font-weight:900;color:var(--obd)}.walk211-status{font-size:13px;color:var(--obm);line-height:1.5;min-height:20px}.walk211-home{border:0;background:transparent;color:var(--obm);font-weight:900;text-decoration:underline;text-align:center;min-height:36px}
      #${RESULT}{background:linear-gradient(180deg,#f4f8f2 0%,#fbfaf5 100%);padding:14px 14px 40px}.result211-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.result211-mini{border:1px solid var(--obl);border-radius:18px;padding:12px}.result211-label{font-size:12px;color:var(--obm)}.result211-value{font-size:21px;font-weight:900}.result211-actions{display:flex;flex-direction:column;gap:10px}.result211-primary{background:linear-gradient(180deg,var(--obg),var(--obd));color:#fff;border:0}
      @media(max-width:520px){.life211-title{font-size:24px}.life211-grid4{gap:7px}.life211-btn{font-size:12px;padding:8px 2px}.life211-btn span{font-size:20px}.life211-card{padding:15px}.walk211-grid{gap:8px}.walk211-btn{font-size:15px}}
    `;document.head.appendChild(s);
  }
  function ensure(id){let p=$(id);if(p)return p;p=document.createElement('div');p.id=id;p.className='page hidden life211-page';document.body.insertBefore(p,document.body.querySelector('script')||null);return p;}
  function hideAll(){document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));}
  function showOnly(id){hideAll();let p=$(id);if(p)p.classList.remove('hidden');}
  function enforceOne(id){if(enforcing)return;enforcing=true;try{document.querySelectorAll('.page').forEach(p=>{if(p.id!==id)p.classList.add('hidden');});let p=$(id);if(p)p.classList.remove('hidden');}finally{enforcing=false;}}
  function nav(a){return `<nav class="life211-nav">${[['home','🏠','ホーム'],['record','📝','記録'],['calendar','📅','予定'],['project','🗂️','PJ'],['assets','📁','素材']].map(x=>`<button class="${a===x[0]?'on':''}" onclick="showOutbaseLifePageV211('${x[0]}')"><span>${x[1]}</span>${x[2]}</button>`).join('')}</nav>`;}
  async function safeRecords(){try{return typeof getRecords==='function'?await getRecords():[]}catch(e){return[]}}
  async function safeStore(n){try{return typeof getOutbaseStoreAll==='function'?await getOutbaseStoreAll(n):[]}catch(e){return[]}}

  async function buildHome(){
    const rs=await safeRecords(); const inbox=await safeStore('inbox_items');
    const latest=rs.sort((a,b)=>new Date(b.date||0)-new Date(a.date||0))[0];
    const cnt=inbox.filter(x=>!['linked','deleted','done'].includes(x.status)).length;
    const active=activeWalk()||activeState();
    return `<div id="${ROOT}" class="life211-wrap">
      <section class="life211-card life211-hero"><div class="life211-k">OUTBASE LIFE OS</div><div class="life211-title">今日を整理して、<br>大事なことだけ知らせる。</div><div class="life211-sub">家族・ペット・予定・記録・素材・思い出をつなぐ入口。</div></section>
      ${active?`<section class="life211-card life211-active"><div class="life211-value">🐕 コタ散歩が継続中</div><div class="life211-note">ホームでは確認だけ。記録操作は散歩モードへ戻って行います。</div><div style="height:10px"></div><button class="life211-btn life211-primary" onclick="returnToActiveWalkV211()">散歩へ戻る</button></section>`:''}
      <section class="life211-card"><b>🌿 チャッピー：次回キャンプを確認できます</b><div class="life211-note">天気・買い物・ギア・当日メモをPJ側にまとめます。</div></section>
      <section class="life211-card"><b>すぐ使う</b><div class="life211-grid4" style="margin-top:10px"><button class="life211-btn" onclick="startWalk&&startWalk()"><span>🐕</span>コタ散歩</button><button class="life211-btn" onclick="showOutbaseLifePageV211('record')"><span>📝</span>記録</button><button class="life211-btn" onclick="showOutbaseLifePageV211('calendar')"><span>📅</span>予定</button><button class="life211-btn" onclick="showOutbaseLifePageV211('assets')"><span>📁</span>素材</button></div></section>
      <section class="life211-card"><b>提案・注意</b><div class="life211-grid3" style="margin-top:10px"><div class="life211-mini"><div class="life211-label">未整理</div><div class="life211-value">${cnt}件</div><div class="life211-note">多い時だけ整理提案</div></div><div class="life211-mini"><div class="life211-label">次回キャンプ</div><div class="life211-value">赤城山</div><div class="life211-note">準備はPJへ集約</div></div><div class="life211-mini"><div class="life211-label">直近</div><div class="life211-value">${esc(latest?.title||'記録なし')}</div><div class="life211-note">${esc(latest?.date||'')}</div></div></div></section>${nav('home')}</div>`;
  }
  function simplePage(k){
    const d={record:['RECORD','写真・音声・メモを迷わず残す。','通常記録はここ。散歩中は散歩専用UIだけ使います。','＋ 記録入力を開く','showAssetCapturePage&&showAssetCapturePage()'],calendar:['CALENDAR','予定から準備と注意につなげる。','Googleカレンダー連携前提。今は骨格確認。','予定の骨格確認','return false'],project:['PROJECT','予定を準備・記録・レビューへ。','キャンプから始めて旅行/通院/車/家にも広げる。','キャンプPJを開く/作る','openOutbaseCampPrep&&openOutbaseCampPrep()'],assets:['ASSETS','素材を確認して思い出と記録につなげる。','写真・動画・音声・メモ・未整理インボックス。','素材一覧を開く','showAssetInboxPage&&showAssetInboxPage()']}[k];
    return `<div class="life211-wrap"><section class="life211-card life211-hero"><div class="life211-k">${d[0]}</div><div class="life211-title">${d[1]}</div><div class="life211-sub">${d[2]}</div></section><section class="life211-card"><button class="life211-btn life211-primary" onclick="${d[4]}">${d[3]}</button></section>${nav(k)}</div>`;
  }
  async function showLife(k='home'){
    addStyle(); route=k; if(k==='home'){const h=$('homePage'); if(h){h.innerHTML=await buildHome(); showOnly('homePage');}}
    else{const p=ensure(PAGES[k]); p.innerHTML=simplePage(k); showOnly(PAGES[k]);}
    ready(); window.scrollTo(0,0);
  }

  function prepareInputs(){
    const ph=$('photoInput'); if(ph){ph.setAttribute('accept','image/*'); ph.setAttribute('capture','environment');}
    if(!$(VIDEO_INPUT)){const v=document.createElement('input');v.type='file';v.id=VIDEO_INPUT;v.accept='video/*';v.setAttribute('capture','environment');v.style.display='none';v.onchange=addVideo;document.body.appendChild(v);}
  }
  function hideLegacyWalkCards(){
    const w=$('walkPage'); if(!w)return;
    w.querySelectorAll(':scope>.card').forEach((c,i)=>{ if(i===0||c.id===WALK_PANEL)return; c.classList.add('walk211-hide'); });
    w.querySelectorAll('.life211-nav').forEach(n=>n.remove());
  }
  function applyWalk(){
    addStyle(); prepareInputs(); route='walk'; showOnly('walkPage');
    const w=$('walkPage'); if(!w)return; hideLegacyWalkCards();
    const first=w.querySelector(':scope>.card'); if(first){const h=first.querySelector('h1'); if(h)h.innerHTML='🐕 散歩中';}
    let card=$(WALK_PANEL); if(!card){card=document.createElement('div');card.id=WALK_PANEL;card.className='card walk211-card';card.innerHTML=walkPanelHtml();bindWalk(card);} if(first&&first.nextSibling!==card)first.insertAdjacentElement('afterend',card);
    updateWalkStatus(); enforceOne('walkPage'); ready(); window.scrollTo(0,0);
  }
  function walkPanelHtml(){return `<div class="walk211-head"><div><b style="font-size:22px">散歩で使うものだけ</b><div class="walk211-status">取込・更新・文字追加・下ナビは出しません。</div></div><span class="walk211-badge">現地用</span></div><div class="walk211-grid"><button class="walk211-btn" data-a="photo"><span>📷</span>写真</button><button class="walk211-btn" data-a="video"><span>🎥</span>動画</button><button class="walk211-btn walk211-primary" data-a="voice"><span>🎤</span>長押し音声</button><button class="walk211-btn" data-a="memo"><span>📝</span>メモ</button><button class="walk211-btn" data-a="friend"><span>🐶</span>犬友</button><button class="walk211-btn" data-a="spot"><span>📍</span>スポット</button></div><button class="walk211-btn walk211-end" data-a="finish"><span>■</span>散歩終了</button><details class="walk211-detail"><summary>詳しい記録を開く</summary><div class="walk211-grid" style="margin-top:10px"><button class="walk211-btn" data-a="poop">💩 うんち</button><button class="walk211-btn" data-a="pee">💧 おしっこ</button><button class="walk211-btn" data-a="rest">休憩</button><button class="walk211-btn" data-a="carry">抱っこ</button><button class="walk211-btn" data-a="danger">危険</button><button class="walk211-btn" data-a="water">水分</button></div></details><button class="walk211-home" data-a="home">ホームへ戻る（散歩は継続）</button><div id="walk211Status" class="walk211-status">音声は長押し、離すと保存。</div><div id="walk211Recent" class="walk211-status"></div>`;}
  function bindWalk(card){
    card.addEventListener('click',async e=>{const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a;if(a==='photo')return $('photoInput')?.click();if(a==='video')return $(VIDEO_INPUT)?.click();if(a==='memo')return addMemo();if(a==='friend')return addQuick('friend_dog','犬友');if(a==='spot')return addQuick('spot','スポット');if(['poop','pee','rest','carry','danger','water'].includes(a))return addQuick(a,b.textContent.trim());if(a==='finish')return finishWalk&&finishWalk();if(a==='home')return showLife('home');});
    const v=card.querySelector('[data-a="voice"]'); if(v){v.onpointerdown=e=>{e.preventDefault();startVoice();};v.onpointerup=e=>{e.preventDefault();stopVoice();};v.onpointercancel=stopVoice;v.oncontextmenu=e=>e.preventDefault();}
  }
  function events(){window.outbaseWalkEventsV211=window.outbaseWalkEventsV211||[];return window.outbaseWalkEventsV211;}
  function videos(){window.outbaseWalkVideosV211=window.outbaseWalkVideosV211||[];return window.outbaseWalkVideosV211;}
  function addQuick(type,label){const memo=['friend_dog','spot'].includes(type)?prompt(label+'メモ（空でも保存）',''):'';const ev={id:createId(),type,label,memo:memo||'',time:now(),created_at:new Date().toISOString()};events().push(ev);saveWalkActiveSession?.('event');setStatus(label+'を記録しました');updateWalkStatus();}
  function addMemo(){const text=prompt('散歩メモ','');if(!text||!text.trim())return;const note={id:createId(),text:text.trim(),time:now(),created_at:new Date().toISOString()};notes.push(note);saveWalkActiveSession?.('note');setStatus('メモを保存しました');updateWalkStatus();}
  function addVideo(){const input=$(VIDEO_INPUT);const f=input?.files?.[0];if(!f)return;const reader=new FileReader();reader.onload=e=>{videos().push({id:createId(),name:f.name,type:f.type,data:e.target.result,time:now(),created_at:new Date().toISOString()});saveWalkActiveSession?.('video');setStatus('動画を保存しました');updateWalkStatus();input.value='';};reader.readAsDataURL(f);}
  function updateWalkStatus(){const r=$('walk211Recent');if(!r)return;const ev=events();const v=videos().length;let msg=`写真 ${photos?.length||0} / 動画 ${v} / 音声 ${audioRecords?.length||0} / メモ ${notes?.length||0}`;if(ev.length)msg+=' / 犬友・スポット等 '+ev.length+'件';r.textContent=msg;}
  function setStatus(t){const s=$('walk211Status');if(s)s.textContent=t;}
  async function startVoice(){if(voiceRecorder)return;try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});voiceChunks=[];voiceRecorder=new MediaRecorder(stream);voiceRecorder.ondataavailable=e=>{if(e.data&&e.data.size)voiceChunks.push(e.data)};voiceRecorder.start();setStatus('録音中。離すと保存します。');}catch(e){console.error(e);setStatus('音声メモを開始できません');}}
  function stopVoice(){if(!voiceRecorder)return;const rec=voiceRecorder;voiceRecorder=null;rec.onstop=()=>{const blob=new Blob(voiceChunks,{type:rec.mimeType||'audio/webm'});const reader=new FileReader();reader.onload=e=>{audioRecords.push({id:createId(),name:'walk_audio_'+Date.now()+'.webm',type:blob.type,data:e.target.result,time:now(),created_at:new Date().toISOString(),transcript:''});saveWalkActiveSession?.('audio');setStatus('音声メモを保存しました');updateWalkStatus();rec.stream.getTracks().forEach(x=>x.stop());};reader.readAsDataURL(blob);};rec.stop();}

  async function finishToResult(){
    try{
      if(!activeWalk()){alert('進行中の散歩が見つかりません');return;}
      if(!confirm('散歩を終了して保存しますか？'))return;
      updateWalkTimer?.(); if(typeof timerInterval!=='undefined'&&timerInterval)clearInterval(timerInterval); stopAutoSave?.(); if(typeof gpsWatcher!=='undefined'&&gpsWatcher)clearInterval(gpsWatcher);
      const finalize=async gps=>{endGps=gps||'未取得'; addGpsHistory?.('end',endGps); distanceKm=typeof calcTrackDistance==='function'?calcTrackDistance(gpsHistory):'0.00km'; updateWalkTimer?.(); const wt=formatTime?.(seconds||0)||'00:00:00'; const avg=typeof calcAverageSpeed==='function'?calcAverageSpeed(distanceKm,wt):'0.00km/h'; currentSession.endTime=now(); currentSession.status=EVENT_STATUS.CLOSED; const ev=events(); const recd={id:createId(),title:'散歩記録',tags:[],recordType:'walk',session:currentSession,date:now(),walk:{time:wt,distanceKm,avgSpeed:avg},gps:{start:startGps,end:endGps,history:gpsHistory},photos,audio:audioRecords,notes,videos:videos(),quickEvents:ev,friendDogEvents:ev.filter(x=>x.type==='friend_dog'),spotEvents:ev.filter(x=>x.type==='spot'),behaviorEvents:ev.filter(x=>!['friend_dog','spot'].includes(x.type)),summary:{photoCount:photos.length,videoCount:videos().length,audioCount:audioRecords.length,noteCount:notes.length,gpsPointCount:gpsHistory.length,validGpsPointCount:typeof getValidGpsCount==='function'?getValidGpsCount(gpsHistory):gpsHistory.length,quickEventCount:ev.length,friendDogCount:ev.filter(x=>x.type==='friend_dog').length,spotCount:ev.filter(x=>x.type==='spot').length}}; await saveRecord(recd); if(currentSession?.id)await deleteActiveSession?.(currentSession.id); clearAppState?.(); currentSession=null; window.outbaseWalkEventsV211=[]; window.outbaseWalkVideosV211=[]; showResult(recd);};
      if(typeof getGps==='function')getGps(finalize); else finalize('未取得');
    }catch(e){console.error(e);alert('散歩終了に失敗しました');}
  }
  function showResult(r){addStyle();route='result';const p=ensure(RESULT);p.className='page';p.innerHTML=`<section class="life211-card life211-hero"><div class="life211-k">WALK RESULT</div><div class="life211-title">コタ散歩を保存しました</div><div class="life211-sub">結果はここ、散歩履歴、詳細から確認できます。</div></section><section class="life211-card result211-grid"><div class="result211-mini"><div class="result211-label">時間</div><div class="result211-value">${esc(r.walk.time)}</div></div><div class="result211-mini"><div class="result211-label">距離</div><div class="result211-value">${esc(r.walk.distanceKm)}</div></div><div class="result211-mini"><div class="result211-label">GPS</div><div class="result211-value">${r.summary.validGpsPointCount}件</div></div><div class="result211-mini"><div class="result211-label">写真/動画/音声/メモ</div><div class="result211-value">${r.summary.photoCount}/${r.summary.videoCount}/${r.summary.audioCount}/${r.summary.noteCount}</div></div></section><section class="life211-card result211-actions"><button class="result211-btn result211-primary" onclick="showDetail&&showDetail('${esc(r.id)}')">詳細を見る</button><button class="result211-btn" onclick="showWalkHistoryPage&&showWalkHistoryPage()">散歩履歴を開く</button><button class="result211-btn" onclick="showOutbaseLifePageV211('home')">ホームへ戻る</button></section>`;showOnly(RESULT);ready();window.scrollTo(0,0);}

  function patch(){
    if(typeof startWalk==='function'&&!startWalk.__v211){const o=startWalk;window.startWalk=function(){window.outbaseWalkEventsV211=[];window.outbaseWalkVideosV211=[];const r=o.apply(this,arguments);setTimeout(applyWalk,80);setTimeout(applyWalk,400);return r;};window.startWalk.__v211=true;}
    if(typeof restoreWalkSession==='function'&&!restoreWalkSession.__v21
