/* =========================================================
   OUTBASE lifeOSBase.js
   UI v204: 散歩中管理ボタン撤去・LifeOS基盤維持
   - v198/v199の途中欠落エラーを避けるため、短い新規ファイルに切替
   - 旧 lifeOSUI.js は読み込まない
   - app.js / homeUI.js / assetUI.js 本体は触らない
   - 散歩中の管理ボタンは不要と判断し、walkManageOverlay.js は読み込まない
========================================================= */
(function(){
  'use strict';

  const ROOT_ID = 'outbaseLifeOSV204';
  const STYLE_ID = 'outbaseLifeOSV204Style';
  const SHEET_ID = 'outbaseLifeOSManageV204';
  const PAGES = {
    home: 'homePage',
    record: 'outbaseRecordPageV204',
    calendar: 'outbaseCalendarPageV204',
    project: 'outbaseProjectPageV204',
    assets: 'outbaseAssetsPageV204'
  };

  let isRenderingHome = false;

  function esc(value){
    const text = String(value ?? '');
    return text
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#039;');
  }

  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      :root{--obg:#1f6f3a;--obd:#123d25;--obs:#edf6ee;--obc:#fbfaf5;--obt:#243127;--obm:#6b766c;--obl:#e5ebe4;}
      #homePage,.life-v200-page{background:linear-gradient(180deg,#f4f8f2 0%,#fbfaf5 100%);padding-bottom:84px;}
      #${ROOT_ID},.life-v200-inner{display:flex;flex-direction:column;gap:14px;}
      .life-card{background:#fff;border:1px solid rgba(31,111,58,.08);border-radius:24px;padding:16px;box-shadow:0 10px 24px rgba(20,81,45,.08);color:var(--obt);}
      .life-hero{background:linear-gradient(135deg,#1f6f3a,#4f8f5b);color:#fff;min-height:132px;position:relative;overflow:hidden;}
      .life-hero:after{content:'';position:absolute;right:22px;top:18px;width:58px;height:58px;border-radius:50%;background:rgba(255,255,255,.38);}
      .life-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;position:relative;z-index:1;}
      .life-kicker{font-size:12px;letter-spacing:.08em;opacity:.9;margin-bottom:4px;}
      .life-title{font-size:24px;font-weight:850;line-height:1.25;}
      .life-sub{font-size:13px;line-height:1.55;opacity:.92;margin-top:8px;max-width:78%;}
      .life-manage{border:1px solid rgba(255,255,255,.38);background:rgba(255,255,255,.18);color:#fff;border-radius:999px;padding:8px 10px;min-height:36px;font-weight:850;white-space:nowrap;}
      .life-priority{background:var(--obs);border-left:5px solid var(--obg);border-radius:18px;padding:13px;line-height:1.58;}
      .life-priority strong{display:block;color:var(--obd);font-size:15px;margin-bottom:4px;}
      .life-section-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:10px;}
      .life-section-title{font-size:18px;font-weight:850;}
      .life-note{font-size:12px;color:var(--obm);line-height:1.45;}
      .life-grid-4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;}
      .life-grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}
      .life-grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
      .life-btn,.life-mini{border:1px solid var(--obl);background:#fff;border-radius:18px;color:var(--obd);font-weight:850;text-align:center;}
      .life-btn{min-height:72px;padding:10px 4px;font-size:12px;}
      .life-btn span{display:block;font-size:22px;margin-bottom:4px;}
      .life-mini{padding:12px;text-align:left;min-height:88px;}
      .life-label{font-size:12px;color:var(--obm);margin-bottom:5px;}
      .life-value{font-size:17px;font-weight:850;line-height:1.35;color:var(--obt);}
      .life-list{display:flex;flex-direction:column;gap:10px;}
      .life-row{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--obl);border-radius:18px;padding:12px;background:#fff;}
      .life-row-icon{font-size:24px;width:32px;flex:0 0 32px;text-align:center;}
      .life-row-title{font-weight:850;margin-bottom:3px;}
      .life-row-meta{font-size:13px;color:var(--obm);line-height:1.5;}
      .life-primary{width:100%;border:0;border-radius:18px;background:linear-gradient(180deg,var(--obg),var(--obd));color:#fff;padding:14px 10px;min-height:54px;font-size:16px;font-weight:850;}
      .life-secondary{width:100%;border:1px solid var(--obl);border-radius:16px;background:#fff;color:var(--obd);padding:12px 10px;min-height:48px;font-size:14px;font-weight:850;}
      .life-nav{position:fixed;left:50%;transform:translateX(-50%);bottom:10px;width:min(680px,calc(100vw - 20px));display:grid;grid-template-columns:repeat(5,1fr);gap:2px;background:rgba(255,255,255,.96);border:1px solid rgba(31,111,58,.1);border-radius:22px;box-shadow:0 10px 22px rgba(20,81,45,.12);backdrop-filter:blur(10px);padding:8px;z-index:50;}
      .life-nav button{border:0;background:transparent;color:var(--obm);font-size:11px;font-weight:850;min-height:48px;padding:3px 0;}
      .life-nav button.is-active{color:var(--obd);}
      .life-nav span{display:block;font-size:20px;margin-bottom:2px;}
      .life-sheet{position:fixed;inset:0;background:rgba(15,23,42,.56);z-index:9999;display:flex;align-items:flex-end;justify-content:center;padding:16px;}
      .life-sheet-card{width:min(680px,100%);background:#fff;border-radius:24px;padding:16px;box-shadow:0 20px 40px rgba(0,0,0,.2);}
      .life-sheet-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px;}
      .life-close{border:0;border-radius:14px;background:#b91c1c;color:#fff;padding:9px 12px;font-weight:850;}
      @media(max-width:520px){#homePage,.life-v200-page{padding-left:14px;padding-right:14px}.life-card{border-radius:22px;padding:15px}.life-title{font-size:22px}.life-grid-4{gap:7px}.life-btn{min-height:68px;font-size:11px;padding:9px 2px}.life-btn span{font-size:21px}}
    `;
    document.head.appendChild(style);
  }

  async function getRecordsSafe(){
    try{ if(typeof getRecords === 'function') return await getRecords(); }
    catch(error){ console.warn('v200 records skip', error); }
    return [];
  }

  async function getStoreSafe(name){
    try{ if(typeof getOutbaseStoreAll === 'function') return await getOutbaseStoreAll(name); }
    catch(error){ console.warn('v200 store skip', name, error); }
    return [];
  }

  function readProjects(){
    try{
      const raw = localStorage.getItem('outbase_camp_projects_v1');
      return raw ? JSON.parse(raw) : [];
    }catch(error){ return []; }
  }

  function currentProject(){
    const list = readProjects();
    const id = localStorage.getItem('outbase_current_camp_project_id') || '';
    return list.find(item => item.id === id) || list[0] || null;
  }

  function latestRecord(list){
    return (list || []).slice().sort((a,b)=>{
      return new Date(b.date || b.createdAt || b.created_at || 0) - new Date(a.date || a.createdAt || a.created_at || 0);
    })[0] || null;
  }

  function recordTitle(record){
    if(!record) return 'まだ記録なし';
    if(typeof getRecordTitle === 'function') return getRecordTitle(record);
    return record.title || record.recordType || '記録';
  }

  async function collect(){
    const records = await getRecordsSafe();
    const inbox = await getStoreSafe('inbox_items');
    const active = await getStoreSafe('activeSessions');
    const project = currentProject();
    const inboxCount = inbox.filter(item => item.status !== 'linked' && item.status !== 'deleted' && item.status !== 'done').length;
    const activeCount = active.filter(item => item.eventStatus === 'active' || item.status === 'active').length;
    return {records, inboxCount, activeCount, project, latest: latestRecord(records)};
  }

  function priority(data){
    if(data.activeCount > 0) return ['復旧','未終了の記録があります','先に復旧して、今日の記録を守ります。'];
    if(data.project) return ['予定','次回キャンプを確認できます','天気・買い物・ギア・当日メモをPJ側にまとめます。'];
    if(data.inboxCount > 0) return ['整理','未整理素材があります','急がなくて大丈夫。必要な時に素材画面で見返せます。'];
    return ['通常','よく使うものはすぐ押せます','コタ散歩は毎日提案しない。必要な時だけ注意として出します。'];
  }

  function nav(active){
    const items = [['home','🏠','ホーム'],['record','📝','記録'],['calendar','📅','予定'],['project','🗂️','PJ'],['assets','📁','素材']];
    return '<nav class="life-nav">' + items.map(item => {
      const cls = active === item[0] ? 'is-active' : '';
      return `<button class="${cls}" onclick="showOutbaseLifePageV200('${item[0]}')"><span>${item[1]}</span>${item[2]}</button>`;
    }).join('') + '</nav>';
  }

  function hero(kicker,title,sub,manage){
    return `<section class="life-card life-hero"><div class="life-head"><div><div class="life-kicker">${esc(kicker)}</div><div class="life-title">${title}</div><div class="life-sub">${esc(sub)}</div></div>${manage ? '<button class="life-manage" onclick="showOutbaseManageMenuV200()">管理</button>' : ''}</div></section>`;
  }

  function buildHome(data){
    const p = priority(data);
    const projectName = data.project?.campgroundName || data.project?.title || '未設定';
    const latest = data.latest;
    const latestMeta = latest ? (latest.date || latest.createdAt || '記録あり') : '散歩や素材を残すとここに表示';
    return `<div id="${ROOT_ID}">
      ${hero('OUTBASE LIFE OS','今日を整理して、<br>大事なことだけ知らせる。','家族・ペット・予定・記録・素材・思い出をつなぐ入口。',true)}
      <section class="life-card"><div class="life-priority"><strong>🌿 チャッピー：${esc(p[1])}</strong>${esc(p[2])}</div></section>
      <section class="life-card"><div class="life-section-head"><div class="life-section-title">すぐ使う</div><div class="life-note">毎日使うものは提案ではなく常設</div></div><div class="life-grid-4">
        <button class="life-btn" onclick="startWalk && startWalk()"><span>🐕</span>コタ散歩</button>
        <button class="life-btn" onclick="showOutbaseLifePageV200('record')"><span>📝</span>記録</button>
        <button class="life-btn" onclick="showOutbaseLifePageV200('calendar')"><span>📅</span>予定</button>
        <button class="life-btn" onclick="showOutbaseLifePageV200('assets')"><span>📁</span>素材</button>
      </div></section>
      <section class="life-card"><div class="life-section-head"><div class="life-section-title">提案・注意</div><div class="life-note">忘れそう/危険/期限だけ強く出す</div></div><div class="life-grid-3">
        <div class="life-mini"><div class="life-label">未整理</div><div class="life-value">${data.inboxCount}件</div><div class="life-note">多い時だけ整理提案</div></div>
        <div class="life-mini"><div class="life-label">次回キャンプ</div><div class="life-value">${esc(projectName)}</div><div class="life-note">準備はPJへ集約</div></div>
        <div class="life-mini"><div class="life-label">直近</div><div class="life-value">${esc(recordTitle(latest))}</div><div class="life-note">${esc(latestMeta)}</div></div>
      </div></section>${nav('home')}</div>`;
  }

  function ensurePage(id){
    let page = document.getElementById(id);
    if(page) return page;
    page = document.createElement('div');
    page.id = id;
    page.className = 'page hidden life-v200-page';
    const firstScript = document.body.querySelector('script');
    document.body.insertBefore(page, firstScript || null);
    return page;
  }

  function hideAll(){ document.querySelectorAll('.page').forEach(page => page.classList.add('hidden')); }
  function top(){ try{ window.scrollTo({top:0,behavior:'smooth'}); }catch(error){ window.scrollTo(0,0); } }
  function btn(text,fn,primary){ return `<button class="${primary ? 'life-primary' : 'life-secondary'}" onclick="${fn}">${text}</button>`; }

  async function renderHome(){
    if(isRenderingHome) return;
    isRenderingHome = true;
    addStyle();
    try{
      const home = document.getElementById('homePage');
      if(!home) return;
      home.innerHTML = buildHome(await collect());
      home.classList.remove('hidden');
    }finally{ isRenderingHome = false; }
  }

  async function renderRecord(){
    const page = ensurePage(PAGES.record);
    page.innerHTML = `<div class="life-v200-inner">${hero('RECORD','写真・音声・メモを<br>迷わず残す。','記録入力はここに集約。ホームには増やさない。',false)}
      <section class="life-card"><div class="life-grid-2">${btn('＋ 記録入力を開く','showAssetCapturePage && showAssetCapturePage()',true)}${btn('コタ散歩を開始','startWalk && startWalk()',false)}</div></section>
      <section class="life-card"><div class="life-list">
        <div class="life-row"><div class="life-row-icon">📷</div><div><div class="life-row-title">撮影・取込</div><div class="life-row-meta">写真/動画/ファイルは記録入力から保存。</div></div></div>
        <div class="life-row"><div class="life-row-icon">🎤</div><div><div class="life-row-title">音声メモ</div><div class="life-row-meta">録音・文字起こし・手動追記を同じ場所に集約。</div></div></div>
        <div class="life-row"><div class="life-row-icon">📝</div><div><div class="life-row-title">手入力メモ</div><div class="life-row-meta">散歩・キャンプ・予定に後から紐付けする前提。</div></div></div>
      </div></section>${nav('record')}</div>`;
  }

  async function renderCalendar(){
    const page = ensurePage(PAGES.calendar);
    page.innerHTML = `<div class="life-v200-inner">${hero('CALENDAR','予定から、準備と注意に<br>つなげる。','Googleカレンダー連携前提。今は骨格確認。',false)}
      <section class="life-card"><div class="life-list">
        <div class="life-row"><div class="life-row-icon">🐕</div><div><div class="life-row-title">毎日：コタ散歩</div><div class="life-row-meta">提案しすぎない。ショートカット常設だけ。</div></div></div>
        <div class="life-row"><div class="life-row-icon">⛺</div><div><div class="life-row-title">近日：次回キャンプ</div><div class="life-row-meta">天気/買い物/ギア/ルートをPJに接続。</div></div></div>
        <div class="life-row"><div class="life-row-icon">🎂</div><div><div class="life-row-title">年1回：記念日・誕生日</div><div class="life-row-meta">早めに控えめ表示。期限が近い時だけ強く。</div></div></div>
        <div class="life-row"><div class="life-row-icon">🚗</div><div><div class="life-row-title">数年：車検・保険・家</div><div class="life-row-meta">忘れると困るものは注意喚起対象。</div></div></div>
      </div></section>${nav('calendar')}</div>`;
  }

  async function renderProject(){
    const data = await collect();
    const projectName = data.project?.campgroundName || data.project?.title || '次回キャンプ未設定';
    const page = ensurePage(PAGES.project);
    page.innerHTML = `<div class="life-v200-inner">${hero('PROJECT','予定を、準備・記録・レビューへ。','キャンプから始めて、旅行/通院/車/家にも広げる。',false)}
      <section class="life-card"><div class="life-label">現在の主プロジェクト</div><div class="life-value">${esc(projectName)}</div><div class="life-note">キャンプ準備は「キャンプPJ」として扱う。</div><div style="height:10px"></div>${btn('キャンプPJを開く/作る','openOutbaseCampPrep && openOutbaseCampPrep()',true)}</section>
      <section class="life-card"><div class="life-grid-2"><div class="life-mini"><div class="life-label">準備</div><div class="life-value">天気 / ギア / 買い物</div></div><div class="life-mini"><div class="life-label">当日</div><div class="life-value">写真 / 音声 / メモ</div></div><div class="life-mini"><div class="life-label">レビュー</div><div class="life-value">次回改善</div></div><div class="life-mini"><div class="life-label">将来</div><div class="life-value">家・車・通院</div></div></div></section>${nav('project')}</div>`;
  }

  async function renderAssets(){
    const data = await collect();
    const page = ensurePage(PAGES.assets);
    page.innerHTML = `<div class="life-v200-inner">${hero('ASSETS','素材を確認して、<br>思い出と記録につなげる。','写真・音声・メモ・未整理インボックスをここへ集約。',false)}
      <section class="life-card"><div class="life-grid-2">${btn('素材一覧を開く','showAssetInboxPage && showAssetInboxPage()',true)}${btn('記録入力を開く','showAssetCapturePage && showAssetCapturePage()',false)}</div></section>
      <section class="life-card"><div class="life-mini"><div class="life-label">未整理素材</div><div class="life-value">${data.inboxCount}件</div><div class="life-note">未整理は素材一覧で確認。ホームに長い一覧は出さない。</div></div></section>${nav('assets')}</div>`;
  }

  async function showPage(key){
    addStyle();
    hideAll();
    if(key === 'home'){ await renderHome(); top(); return; }
    const id = PAGES[key];
    if(key === 'record') await renderRecord();
    if(key === 'calendar') await renderCalendar();
    if(key === 'project') await renderProject();
    if(key === 'assets') await renderAssets();
    const page = document.getElementById(id);
    if(page) page.classList.remove('hidden');
    top();
  }

  function showManage(){
    addStyle();
    const old = document.getElementById(SHEET_ID);
    if(old) old.remove();
    const sheet = document.createElement('div');
    sheet.id = SHEET_ID;
    sheet.className = 'life-sheet';
    sheet.onclick = event => { if(event.target === sheet) closeManage(); };
    sheet.innerHTML = `<div class="life-sheet-card"><div class="life-sheet-head"><strong>管理メニュー</strong><button class="life-close" onclick="closeOutbaseManageMenuV200()">閉じる</button></div><div class="life-list">
      <button class="life-secondary" onclick="showGearPage && showGearPage()">ギア管理</button>
      <button class="life-secondary" onclick="showCampgroundPage && showCampgroundPage()">キャンプ場管理</button>
      <button class="life-secondary" onclick="showCampRecordPage && showCampRecordPage()">キャンプ実績</button>
      <button class="life-secondary" onclick="showWalkHistoryPage && showWalkHistoryPage()">散歩履歴</button>
    </div></div>`;
    document.body.appendChild(sheet);
  }
  function closeManage(){ const sheet = document.getElementById(SHEET_ID); if(sheet) sheet.remove(); }

  function patchEntrances(){
    if(typeof window.showPage === 'function' && !window.showPage.__lifeV200Patched){
      const original = window.showPage;
      window.showPage = function(pageId){
        if(pageId === 'homePage'){ showPage('home'); return; }
        return original.apply(this, arguments);
      };
      window.showPage.__lifeV200Patched = true;
    }
    if(typeof window.backToHome === 'function' && !window.backToHome.__lifeV200Patched){
      const originalBack = window.backToHome;
      window.backToHome = function(){
        const result = originalBack.apply(this, arguments);
        setTimeout(()=>showPage('home'),80);
        return result;
      };
      window.backToHome.__lifeV200Patched = true;
    }
  }

  function observeHome(){
    const home = document.getElementById('homePage');
    if(!home || home.__lifeV200Observed) return;
    const observer = new MutationObserver(()=>{
      if(isRenderingHome) return;
      if(!home.classList.contains('hidden') && !document.getElementById(ROOT_ID)) setTimeout(renderHome,120);
    });
    observer.observe(home,{childList:true,subtree:false});
    home.__lifeV200Observed = true;
  }

  async function setup(){
    addStyle();
    Object.values(PAGES).filter(id => id !== 'homePage').forEach(ensurePage);
    patchEntrances();
    observeHome();
    await renderHome();
  }

  window.showOutbaseLifePageV204 = showPage;
  window.renderOutbaseLifeHomeV204 = renderHome;
  window.showOutbaseManageMenuV204 = showManage;
  window.closeOutbaseManageMenuV204 = closeManage;
  window.showOutbaseLifePageV202 = showPage;
  window.renderOutbaseLifeHomeV202 = renderHome;
  window.showOutbaseManageMenuV202 = showManage;
  window.closeOutbaseManageMenuV202 = closeManage;
  window.showOutbaseLifePageV200 = showPage;
  window.renderOutbaseLifeHomeV200 = renderHome;
  window.showOutbaseManageMenuV200 = showManage;
  window.closeOutbaseManageMenuV200 = closeManage;
  window.showOutbaseLifePage = showPage;
  window.renderOutbaseLifeHome = renderHome;
  window.showOutbaseManageMenu = showManage;
  window.closeOutbaseManageMenu = closeManage;

  if(document.readyState === 'loading') window.addEventListener('DOMContentLoaded',setup);
  else setup();
  window.addEventListener('load',()=>{ setTimeout(setup,300); setTimeout(renderHome,1500); });
})();
