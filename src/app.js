
(() => {
  'use strict';

  const VERSION = 'restart-43-record-first-lock';
  const STORAGE_KEY = 'outbase_restart_43_state';
  const LEGACY_KEYS = [
    'outbase_restart_42_state',
    'outbase_restart_35_state',
    'outbase_restart_34_state',
    'outbase_restart_33_state',
    'outbase_restart_32_state'
  ];
  const MAX_EMBED_BYTES = 1600000;
  const app = document.getElementById('app');
  let draftType = 'メモ';
  let draftTarget = '未分類';
  let mediaDrafts = [];
  let recorder = null;
  let voiceChunks = [];
  let recognition = null;

  const basePrep = [
    { id:'shopping', group:'買い物', name:'買い物', note:'食材・調味料・消耗品', done:false },
    { id:'cooking', group:'料理', name:'料理', note:'量・メニュー・失敗メモ', done:false },
    { id:'gear', group:'ギア', name:'ギア', note:'使うもの・忘れ物・使用感', done:false },
    { id:'kota', group:'コタ', name:'コタ', note:'フード・水・散歩・暑さ寒さ', done:false },
    { id:'weather', group:'天気', name:'天気', note:'雨・風・気温・乾燥', done:false },
    { id:'route', group:'ルート', name:'ルート', note:'出発・買い出し・帰路', done:false }
  ];

  const defaultState = {
    version: VERSION,
    screen: 'home',
    activeProjectId: 'camp-akagi',
    recordFilter: 'すべて',
    projects: [
      {
        id:'camp-akagi',
        type:'camp',
        title:'スノーピーク赤城山',
        label:'赤城山キャンプ',
        startDate:'2026-06-26',
        endDate:'2026-06-27',
        place:'スノーピーク赤城山キャンプフィールド',
        party:'夫婦＋コタ',
        memo:'キャンプ中の一瞬を逃さず残す。',
        prep: clone(basePrep),
        prepNotes:[]
      }
    ],
    inbox: [],
    memories: [],
    improvements: [],
    deleted: [],
    toast: '',
    savedAt: ''
  };

  let state = loadState();

  function clone(value){ return JSON.parse(JSON.stringify(value)); }
  function escapeHtml(value){
    return String(value ?? '')
      .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
      .replaceAll('"','&quot;').replaceAll("'","&#039;");
  }
  function makeId(prefix){ return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`; }
  function todayISO(){ return new Date().toISOString().slice(0,10); }
  function timeNow(){ return new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}); }
  function typeName(type){ return {camp:'キャンプ',walk:'散歩',campWalk:'キャンプ場散歩',search:'探す',drive:'ドライブ',picnic:'ピクニック',event:'イベント',outing:'外出'}[type] || '記録'; }
  function dateLabel(p){
    if(!p?.startDate) return '日付未定';
    if(p.endDate && p.endDate !== p.startDate) return `${p.startDate} - ${p.endDate}`;
    return p.startDate;
  }
  function activeProject(){ return state.projects.find(p => p.id === state.activeProjectId) || state.projects[0]; }
  function projectById(id){ return state.projects.find(p => p.id === id) || null; }

  function loadState(){
    try{
      const current = localStorage.getItem(STORAGE_KEY);
      if(current) return normalize(JSON.parse(current));
      for(const key of LEGACY_KEYS){
        const raw = localStorage.getItem(key);
        if(raw) return normalize(migrate(JSON.parse(raw)));
      }
    }catch(e){ console.warn(e); }
    return normalize(clone(defaultState));
  }

  function migrate(old){
    const next = clone(defaultState);
    if(Array.isArray(old.projects) && old.projects.length){
      next.projects = old.projects.map(p => ({
        id:p.id || makeId('project'),
        type:p.type || 'camp',
        title:p.title || p.place || p.label || 'キャンプ',
        label:p.label || p.title || p.place || 'キャンプ',
        startDate:p.startDate || '',
        endDate:p.endDate || p.startDate || '',
        place:p.place || p.title || '',
        party:p.party || '',
        memo:p.memo || '',
        prep: normalizePrep(p),
        prepNotes: Array.isArray(p.prepNotes) ? p.prepNotes : (Array.isArray(p.planNotes) ? p.planNotes : [])
      }));
    }
    next.activeProjectId = old.activeProjectId || next.projects[0].id;
    next.inbox = Array.isArray(old.inbox) ? old.inbox.map(migrateRecord) : [];
    next.memories = Array.isArray(old.memories) ? old.memories.map(migrateRecord) : [];
    next.improvements = Array.isArray(old.improvements) ? old.improvements.map(migrateImprove) : [];
    next.deleted = Array.isArray(old.deleted) ? old.deleted : [];
    next.screen = 'home';
    return next;
  }

  function normalizePrep(project){
    const source = Array.isArray(project.prep) ? project.prep : [];
    if(!source.length) return clone(basePrep);
    return source.map(item => ({
      id:item.id || makeId('prep'),
      group:item.group || item.key || item.name || '準備',
      name:item.name || item.key || item.group || '準備',
      note:item.note || item.detail || '',
      done:Boolean(item.done || item.status === '確認済み' || item.state === '買った')
    }));
  }

  function migrateRecord(r){
    return {
      id:r.id || makeId('record'),
      projectId:r.projectId || defaultState.activeProjectId,
      type:r.type || r.recordType || 'メモ',
      target:r.target || r.category || '未分類',
      text:r.text || r.memo || r.note || '',
      date:r.date || todayISO(),
      time:r.time || (r.createdAt ? new Date(r.createdAt).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}) : timeNow()),
      createdAt:r.createdAt || new Date().toISOString(),
      status:r.status || '未確認',
      media:Array.isArray(r.media) ? r.media : [],
      tags:Array.isArray(r.tags) ? r.tags : []
    };
  }

  function migrateImprove(i){
    return {
      id:i.id || makeId('improve'),
      projectId:i.projectId || defaultState.activeProjectId,
      text:i.text || i.note || '改善メモ',
      target:i.target || '次回準備',
      done:Boolean(i.done),
      createdAt:i.createdAt || new Date().toISOString(),
      reflectedAt:i.reflectedAt || ''
    };
  }

  function normalize(s){
    s = {...clone(defaultState), ...s};
    s.projects = Array.isArray(s.projects) && s.projects.length ? s.projects : clone(defaultState.projects);
    s.projects = s.projects.map(p => ({...p, prep: normalizePrep(p), prepNotes:Array.isArray(p.prepNotes)?p.prepNotes:[]}));
    if(!s.projects.some(p => p.id === s.activeProjectId)) s.activeProjectId = s.projects[0].id;
    s.inbox = Array.isArray(s.inbox) ? s.inbox.map(migrateRecord) : [];
    s.memories = Array.isArray(s.memories) ? s.memories.map(migrateRecord) : [];
    s.improvements = Array.isArray(s.improvements) ? s.improvements.map(migrateImprove) : [];
    s.deleted = Array.isArray(s.deleted) ? s.deleted : [];
    s.recordFilter = s.recordFilter || 'すべて';
    s.version = VERSION;
    return s;
  }

  function save(){
    state.version = VERSION;
    state.savedAt = new Date().toISOString();
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify({...state, toast:''})); }
    catch(e){ showToast('保存容量が足りないかも'); }
  }

  function showToast(message){
    state.toast = message;
    render();
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { state.toast=''; render(); }, 1600);
  }

  function go(screen){
    state.screen = screen || 'home';
    save();
    render();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function prepPercent(p){
    const list = p?.prep || [];
    if(!list.length) return 0;
    return Math.round(list.filter(i => i.done).length / list.length * 100);
  }

  function recordCount(projectId){
    return [...state.inbox, ...state.memories].filter(r => r.projectId === projectId).length;
  }

  function layout(content){
    const p = activeProject();
    app.innerHTML = `
      <header class="top">
        <button class="brand" data-action="go" data-screen="home">
          <div class="logo">OB</div>
          <div>
            <strong>OUTBASE</strong>
            <small>${escapeHtml(p.label || p.title)} / ${escapeHtml(dateLabel(p))}</small>
          </div>
        </button>
        <button class="status-pill" data-action="go" data-screen="inbox">${state.inbox.length}件 未確認</button>
      </header>
      ${content}
      ${bottomNav()}
      ${projectSheet()}
      ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ''}
    `;
  }

  function bottomNav(){
    const navs = [
      ['home','⌂','ホーム'],
      ['record','＋','記録'],
      ['inbox','◇','未確認'],
      ['prep','□','準備'],
      ['memories','○','思い出']
    ];
    return `<nav class="bottom-nav">${navs.map(([screen,icon,label]) => `
      <button class="nav-btn ${state.screen === screen ? 'active' : ''}" data-action="go" data-screen="${screen}">
        <b>${icon}</b><span>${label}</span>
      </button>`).join('')}</nav>`;
  }

  function projectSheet(){
    const p = activeProject();
    return `
      <div class="sheet-backdrop" data-sheet-backdrop data-action="closeSheet"></div>
      <section class="sheet" data-project-sheet>
        <div class="sheet-head">
          <strong>保存先</strong>
          <button class="tiny-btn" data-action="closeSheet">閉じる</button>
        </div>
        <div class="list">
          ${state.projects.map(project => `
            <button class="plan-option ${project.id === p.id ? 'active' : ''}" data-action="selectProject" data-project-id="${escapeHtml(project.id)}">
              <span><strong>${escapeHtml(project.label || project.title)}</strong><br><small>${escapeHtml(typeName(project.type))} / ${escapeHtml(dateLabel(project))}</small></span>
              <b>${project.id === p.id ? '現在' : '選択'}</b>
            </button>
          `).join('')}
        </div>
        <button class="btn primary full" data-action="addProject">日付だけ予定を追加</button>
      </section>
    `;
  }

  function renderHome(){
    state.screen = 'home';
    const p = activeProject();
    const percent = prepPercent(p);
    layout(`
      <main class="screen home active">
        <section class="camp-head">
          <div class="kicker">RECORD FIRST</div>
          <h1 class="camp-title">${escapeHtml(p.label || p.title)}</h1>
          <div class="camp-date">${escapeHtml(dateLabel(p))}</div>
          <div class="target-row">
            <span class="chip green">${escapeHtml(typeName(p.type))}</span>
            <button class="tiny-btn" data-action="openSheet">保存先変更</button>
          </div>
        </section>

        <section class="record-core">
          <button class="big-record" data-action="go" data-screen="record" aria-label="今これを残す">
            <b>＋</b>
            <span>今これを残す</span>
            <small>写真・声・メモ</small>
          </button>

          <div class="quick5">
            ${quickButton('📷','写真','写真','写真')}
            ${quickButton('🎙','声','音声','未分類')}
            ${quickButton('✎','メモ','メモ','未分類')}
            ${quickButton('🐶','コタ','コタ','コタ')}
            ${quickButton('📍','場所','場所','スポット')}
          </div>

          <div class="mini-line"><span class="dot active"></span><span class="dot"></span><span class="dot"></span></div>
        </section>

        <section class="home-bottom">
          <button class="soft-panel" data-action="go" data-screen="inbox">
            <strong>未確認 ${state.inbox.length}件</strong>
            <small>あとで分類すればいい</small>
          </button>
          <button class="soft-panel" data-action="go" data-screen="prep">
            <strong>準備 ${percent}%</strong>
            <small>買い物・料理・ギア・コタ</small>
          </button>
          <button class="soft-panel full" data-action="go" data-screen="memories">
            <strong>思い出 ${state.memories.length}件</strong>
            <small>残してよかったものを見る</small>
          </button>
        </section>
      </main>
    `);
  }

  function quickButton(icon,label,type,target){
    return `<button data-action="quickSave" data-type="${escapeHtml(type)}" data-target="${escapeHtml(target)}"><b>${icon}</b><span>${escapeHtml(label)}</span></button>`;
  }

  function renderRecord(){
    const p = activeProject();
    layout(`
      <main class="screen active">
        <div class="page-title">
          <div><h1>記録</h1><p>${escapeHtml(p.label || p.title)} に保存</p></div>
          <button class="back-btn" data-action="openSheet">変更</button>
        </div>

        <section class="record-sheet">
          <div class="type-row">
            ${typeButton('写真','📷')}
            ${typeButton('音声','🎙')}
            ${typeButton('メモ','✎')}
            ${typeButton('コタ','🐶')}
            ${typeButton('場所','📍')}
          </div>
          <textarea data-record-text placeholder="空欄でも保存できる。分類はあとでOK。"></textarea>
          <div class="file-grid">
            <label class="file-label">写真/動画<input type="file" accept="image/*,video/*" multiple data-media-input></label>
            <button class="btn ghost" data-action="startVoice">声を録る</button>
            <button class="btn ghost" data-action="stopVoice">停止</button>
          </div>
          <div class="voice-status" data-voice-status></div>
          <button class="btn primary full" data-action="saveRecord">保存</button>
        </section>
      </main>
    `);
    bindMediaInput();
  }

  function typeButton(type, icon){
    return `<button class="${draftType === type ? 'active' : ''}" data-action="setDraftType" data-type="${escapeHtml(type)}"><b>${icon}</b><span>${escapeHtml(type)}</span></button>`;
  }

  function renderInbox(){
    layout(`
      <main class="screen active">
        <div class="page-title">
          <div><h1>未確認</h1><p>勝手に確定しない。あとで片付ける。</p></div>
          <button class="back-btn" data-action="go" data-screen="record">＋記録</button>
        </div>
        ${state.inbox.length ? `<section class="list">${state.inbox.map(r => recordItem(r,'inbox')).join('')}</section>` : `<div class="empty">未確認はありません。<br>記録するとここに入ります。</div>`}
      </main>
    `);
  }

  function renderMemories(){
    layout(`
      <main class="screen active">
        <div class="page-title">
          <div><h1>思い出</h1><p>確定した記録。改善へ送れる。</p></div>
          <button class="back-btn" data-action="go" data-screen="improve">改善</button>
        </div>
        ${state.memories.length ? `<section class="list">${state.memories.map(r => recordItem(r,'memory')).join('')}</section>` : `<div class="empty">思い出はまだありません。<br>未確認から確定します。</div>`}
      </main>
    `);
  }

  function renderPrep(){
    const p = activeProject();
    const percent = prepPercent(p);
    layout(`
      <main class="screen active">
        <div class="page-title">
          <div><h1>準備</h1><p>${escapeHtml(p.label || p.title)} / ${percent}%</p></div>
          <button class="back-btn" data-action="addPrep">追加</button>
        </div>
        <div class="progress"><span style="width:${percent}%"></span></div>
        <section class="prep-list" style="margin-top:14px">
          ${(p.prep || []).map(item => `
            <div class="prep-row ${item.done ? 'done' : ''}">
              <button class="check" data-action="togglePrep" data-id="${escapeHtml(item.id)}">${item.done ? '✓' : '□'}</button>
              <div class="prep-main"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.group)} / ${escapeHtml(item.note || '')}</small></div>
              <button class="tiny-btn" data-action="prepMemo" data-target="${escapeHtml(item.group || item.name)}">メモ</button>
            </div>
          `).join('')}
        </section>

        ${p.prepNotes?.length ? `<section class="list" style="margin-top:16px">${p.prepNotes.map(note => `
          <div class="record-item"><div class="record-main"><strong>改善反映</strong><small>${escapeHtml(note.text || note)}</small></div></div>
        `).join('')}</section>` : ''}
      </main>
    `);
  }

  function renderImprove(){
    const open = state.improvements.filter(i => !i.done);
    const done = state.improvements.filter(i => i.done);
    layout(`
      <main class="screen active">
        <div class="page-title">
          <div><h1>改善</h1><p>次回準備に戻す。</p></div>
          <button class="back-btn" data-action="addImprove">追加</button>
        </div>
        ${open.length ? `<section class="list">${open.map(improveItem).join('')}</section>` : `<div class="empty">未反映の改善はありません。</div>`}
        ${done.length ? `<div class="page-title" style="margin-top:18px"><div><h1 style="font-size:22px">反映済み</h1></div></div><section class="list">${done.map(improveItem).join('')}</section>` : ''}
      </main>
    `);
  }

  function renderSettings(){
    layout(`
      <main class="screen active">
        <div class="page-title">
          <div><h1>控え</h1><p>データを守る。</p></div>
        </div>
        <section class="list">
          <button class="soft-panel full" data-action="copyBackup"><strong>控えをコピー</strong><small>端末変更・更新前に使う</small></button>
          <button class="soft-panel full" data-action="importBackup"><strong>控えを読み込む</strong><small>貼り付けて復旧</small></button>
          <button class="soft-panel full" data-action="copyStatus"><strong>状態をコピー</strong><small>確認用</small></button>
        </section>
      </main>
    `);
  }

  function recordItem(r, mode){
    const p = projectById(r.projectId) || activeProject();
    return `
      <article class="record-item">
        <div class="record-main">
          <div class="record-item-head">
            <div>
              <strong>${escapeHtml(r.type)} / ${escapeHtml(r.target || '未分類')}</strong>
              <small>${escapeHtml(p.label || p.title)} / ${escapeHtml(r.date)} ${escapeHtml(r.time)}</small>
            </div>
            <span class="chip">${mode === 'inbox' ? '未確認' : '確定'}</span>
          </div>
          ${r.text ? `<div class="record-text">${escapeHtml(r.text)}</div>` : ''}
          ${mediaMarkup(r.media)}
        </div>
        <div class="item-actions">
          ${mode === 'inbox' ? `
            <button class="btn primary" data-action="confirmRecord" data-id="${escapeHtml(r.id)}">確定</button>
            <button class="btn ghost" data-action="toImprove" data-id="${escapeHtml(r.id)}">改善</button>
            <button class="btn ghost" data-action="changeCategory" data-id="${escapeHtml(r.id)}">分類</button>
            <button class="btn danger" data-action="deleteRecord" data-id="${escapeHtml(r.id)}">削除</button>
          ` : `
            <button class="btn ghost" data-action="memoryImprove" data-id="${escapeHtml(r.id)}">改善</button>
            <button class="btn ghost" data-action="backToInbox" data-id="${escapeHtml(r.id)}">未確認へ</button>
          `}
        </div>
      </article>
    `;
  }

  function mediaMarkup(media=[]){
    if(!media.length) return '';
    return `<div class="media-row">${media.map(m => {
      if(m.kind === 'image' && m.dataUrl) return `<img src="${m.dataUrl}" alt="${escapeHtml(m.name || '画像')}">`;
      if(m.kind === 'video' && m.dataUrl) return `<video src="${m.dataUrl}" controls></video>`;
      if(m.kind === 'audio' && m.dataUrl) return `<audio src="${m.dataUrl}" controls></audio>`;
      return `<span class="chip">${escapeHtml(m.name || m.kind || 'メディア')}</span>`;
    }).join('')}</div>`;
  }

  function improveItem(item){
    const p = projectById(item.projectId) || activeProject();
    return `
      <article class="record-item">
        <div class="record-main">
          <strong>${escapeHtml(item.target || '次回準備')}</strong>
          <small>${escapeHtml(p.label || p.title)} / ${item.done ? '反映済み' : '未反映'}</small>
          <div class="record-text">${escapeHtml(item.text)}</div>
        </div>
        <div class="item-actions">
          ${item.done ? `<button class="btn ghost" data-action="reopenImprove" data-id="${escapeHtml(item.id)}">戻す</button>` : `<button class="btn primary" data-action="reflectImprove" data-id="${escapeHtml(item.id)}">準備へ</button>`}
          <button class="btn danger" data-action="deleteImprove" data-id="${escapeHtml(item.id)}">削除</button>
        </div>
      </article>
    `;
  }

  function render(){
    state = normalize(state);
    if(state.screen === 'record') return renderRecord();
    if(state.screen === 'inbox') return renderInbox();
    if(state.screen === 'prep') return renderPrep();
    if(state.screen === 'memories') return renderMemories();
    if(state.screen === 'improve') return renderImprove();
    if(state.screen === 'settings') return renderSettings();
    return renderHome();
  }

  function bindMediaInput(){
    const input = document.querySelector('[data-media-input]');
    if(!input) return;
    input.addEventListener('change', async () => {
      const files = Array.from(input.files || []).slice(0,4);
      mediaDrafts = [];
      for(const file of files){
        const kind = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
        if(file.size <= MAX_EMBED_BYTES && kind !== 'file'){
          mediaDrafts.push({kind,name:file.name,type:file.type,size:file.size,dataUrl:await fileToDataUrl(file)});
        }else{
          mediaDrafts.push({kind,name:file.name,type:file.type,size:file.size,note:'大きいので名前だけ保存'});
        }
      }
      showToast(`${mediaDrafts.length}件選択`);
    });
  }

  function fileToDataUrl(file){
    return new Promise((resolve,reject)=>{
      const reader = new FileReader();
      reader.onload=()=>resolve(String(reader.result || ''));
      reader.onerror=reject;
      reader.readAsDataURL(file);
    });
  }
  function blobToDataUrl(blob){
    return new Promise(resolve=>{
      const reader = new FileReader();
      reader.onload=()=>resolve(String(reader.result || ''));
      reader.readAsDataURL(blob);
    });
  }

  function saveRecord({type=draftType,target=draftTarget,text='',media=mediaDrafts}={}){
    const p = activeProject();
    state.inbox.unshift({
      id:makeId('record'),
      projectId:p.id,
      type,
      target,
      text,
      date:todayISO(),
      time:timeNow(),
      createdAt:new Date().toISOString(),
      status:'未確認',
      media:media.slice(0,5),
      tags:[]
    });
    mediaDrafts = [];
    save();
    state.screen = 'home';
    showToast('未確認に保存');
  }

  function saveFormRecord(){
    const text = document.querySelector('[data-record-text]')?.value || '';
    saveRecord({type:draftType,target:draftTarget,text,media:mediaDrafts});
  }

  async function startVoice(){
    const status = document.querySelector('[data-voice-status]');
    if(recorder && recorder.state === 'recording') return;
    try{
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      voiceChunks = [];
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = e => { if(e.data?.size) voiceChunks.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(voiceChunks,{type:'audio/webm'});
        mediaDrafts.push({kind:'audio',name:`voice-${Date.now()}.webm`,type:'audio/webm',size:blob.size,dataUrl:await blobToDataUrl(blob)});
        stream.getTracks().forEach(t => t.stop());
        showToast('声を追加');
      };
      recorder.start();
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if(SpeechRecognition){
        recognition = new SpeechRecognition();
        recognition.lang = 'ja-JP';
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.onresult = e => {
          const text = Array.from(e.results).map(r => r[0]?.transcript || '').join('');
          const area = document.querySelector('[data-record-text]');
          if(area && text) area.value = text;
        };
        recognition.start();
      }
      if(status) status.textContent = '録音中';
    }catch(e){
      if(status) status.textContent = '音声が使えません';
      showToast('音声権限を確認');
    }
  }

  function stopVoice(){
    try{
      if(recognition) recognition.stop();
      recognition = null;
      if(recorder && recorder.state === 'recording') recorder.stop();
      const status = document.querySelector('[data-voice-status]');
      if(status) status.textContent = '停止';
    }catch(e){ showToast('停止できませんでした'); }
  }

  function findInbox(id){
    const index = state.inbox.findIndex(r => r.id === id);
    return {index, record:index >= 0 ? state.inbox[index] : null};
  }

  function confirmRecord(id){
    const {index,record} = findInbox(id);
    if(!record) return;
    record.status = '確定';
    state.inbox.splice(index,1);
    state.memories.unshift(record);
    save();
    showToast('思い出に確定');
  }

  function addImprove(text=null, projectId=null, target='次回準備'){
    const value = text || prompt('改善メモ','次回に活かす');
    if(!value) return;
    state.improvements.unshift({id:makeId('improve'),projectId:projectId || activeProject().id,text:value,target,done:false,createdAt:new Date().toISOString(),reflectedAt:''});
    save();
    showToast('改善に追加');
  }

  function recordToImprove(record){
    addImprove(record.text || `${record.type} / ${record.target}`, record.projectId, record.target || '次回準備');
  }

  function openSheet(){
    document.querySelector('[data-sheet-backdrop]')?.classList.add('show');
    document.querySelector('[data-project-sheet]')?.classList.add('show');
  }
  function closeSheet(){
    document.querySelector('[data-sheet-backdrop]')?.classList.remove('show');
    document.querySelector('[data-project-sheet]')?.classList.remove('show');
  }

  function addProject(){
    const title = prompt('予定名','新しいキャンプ');
    if(!title) return;
    const date = prompt('日付 空欄可', todayISO()) || '';
    const p = {id:makeId('project'),type:'camp',title,label:title,startDate:date,endDate:date,place:title,party:'夫婦＋コタ',memo:'日付だけ予定',prep:clone(basePrep),prepNotes:[]};
    state.projects.unshift(p);
    state.activeProjectId = p.id;
    save();
    closeSheet();
    showToast('予定を追加');
  }

  function backupText(){ return JSON.stringify({...state,toast:''}, null, 2); }
  async function copyText(text,msg='コピーしました'){
    try{ await navigator.clipboard.writeText(text); showToast(msg); }
    catch(e){ prompt('コピーしてください',text); }
  }

  function statusText(){
    const p = activeProject();
    return [
      'OUTBASE Restart-43',
      `現在：${p.label || p.title}`,
      `未確認：${state.inbox.length}`,
      `思い出：${state.memories.length}`,
      `改善：${state.improvements.filter(i=>!i.done).length}`,
      `準備：${prepPercent(p)}%`
    ].join('\n');
  }

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if(!el) return;
    const action = el.dataset.action;

    if(action === 'go') return go(el.dataset.screen);
    if(action === 'openSheet') return openSheet();
    if(action === 'closeSheet') return closeSheet();
    if(action === 'selectProject'){
      if(projectById(el.dataset.projectId)) state.activeProjectId = el.dataset.projectId;
      save(); closeSheet(); return render();
    }
    if(action === 'addProject') return addProject();

    if(action === 'quickSave') return saveRecord({type:el.dataset.type || 'メモ', target:el.dataset.target || '未分類', text:el.dataset.type || ''});
    if(action === 'setDraftType'){
      draftType = el.dataset.type || 'メモ';
      draftTarget = draftType === 'コタ' ? 'コタ' : draftType === '場所' ? 'スポット' : '未分類';
      return renderRecord();
    }
    if(action === 'saveRecord') return saveFormRecord();
    if(action === 'startVoice') return startVoice();
    if(action === 'stopVoice') return stopVoice();

    if(action === 'confirmRecord') return confirmRecord(el.dataset.id);
    if(action === 'deleteRecord'){
      const {index,record} = findInbox(el.dataset.id);
      if(!record) return;
      state.deleted.unshift(record);
      state.inbox.splice(index,1);
      save(); return showToast('削除控えへ');
    }
    if(action === 'toImprove'){
      const {record} = findInbox(el.dataset.id);
      if(record) recordToImprove(record);
      return;
    }
    if(action === 'changeCategory'){
      const {record} = findInbox(el.dataset.id);
      if(!record) return;
      const value = prompt('分類', record.target || '未分類');
      if(value !== null){ record.target = value || '未分類'; save(); showToast('分類を変更'); }
      return;
    }
    if(action === 'memoryImprove'){
      const r = state.memories.find(x => x.id === el.dataset.id);
      if(r) recordToImprove(r);
      return;
    }
    if(action === 'backToInbox'){
      const index = state.memories.findIndex(x => x.id === el.dataset.id);
      if(index < 0) return;
      const r = state.memories[index];
      r.status = '未確認';
      state.memories.splice(index,1);
      state.inbox.unshift(r);
      save(); return showToast('未確認へ戻した');
    }

    if(action === 'togglePrep'){
      const p = activeProject();
      const item = (p.prep || []).find(x => x.id === el.dataset.id);
      if(item){ item.done = !item.done; save(); renderPrep(); }
      return;
    }
    if(action === 'addPrep'){
      const name = prompt('準備候補','追加候補');
      if(!name) return;
      const group = prompt('分類','準備') || '準備';
      activeProject().prep.push({id:makeId('prep'),group,name,note:'追加',done:false});
      save(); return renderPrep();
    }
    if(action === 'prepMemo'){
      draftType = 'メモ';
      draftTarget = el.dataset.target || '準備';
      state.screen = 'record';
      save(); renderRecord();
      const area = document.querySelector('[data-record-text]');
      if(area) area.value = `${draftTarget}メモ：`;
      return;
    }

    if(action === 'addImprove') return addImprove();
    if(action === 'reflectImprove'){
      const item = state.improvements.find(x => x.id === el.dataset.id);
      if(!item) return;
      const p = projectById(item.projectId) || activeProject();
      p.prepNotes = Array.isArray(p.prepNotes) ? p.prepNotes : [];
      p.prepNotes.unshift({text:item.text,target:item.target,at:new Date().toISOString()});
      item.done = true;
      item.reflectedAt = new Date().toISOString();
      state.activeProjectId = p.id;
      state.screen = 'prep';
      save(); return showToast('準備へ戻した');
    }
    if(action === 'reopenImprove'){
      const item = state.improvements.find(x => x.id === el.dataset.id);
      if(item){ item.done = false; item.reflectedAt = ''; save(); renderImprove(); }
      return;
    }
    if(action === 'deleteImprove'){
      state.improvements = state.improvements.filter(x => x.id !== el.dataset.id);
      save(); return showToast('改善を削除');
    }

    if(action === 'copyBackup') return copyText(backupText(),'控えをコピー');
    if(action === 'importBackup'){
      const text = prompt('控えを貼り付け');
      if(!text) return;
      try{ state = normalize(JSON.parse(text)); save(); showToast('読み込みました'); }
      catch(err){ showToast('読み込めません'); }
      return;
    }
    if(action === 'copyStatus') return copyText(statusText(),'状態をコピー');
  });

  render();
})();
