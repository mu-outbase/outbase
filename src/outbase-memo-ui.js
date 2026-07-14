(() => {
  'use strict';

  const SHEET_ID='outbasePrepMemoSheet';
  const EDITOR_ID='outbasePrepMemoEditor';
  const PLAN_STATE_KEY='outbase_memo_ui_plan_states_v1';
  const LAST_DESTINATION_KEY='outbase_memo_ui_last_destination';
  const TABS={
    buy:{label:'買う物',icon:'🛒',kind:'buy'},
    improvement:{label:'改善',icon:'💡',kind:'improvement'},
    plan:{label:'予定候補',icon:'📅',kind:'plan-candidate'}
  };

  let currentTab='buy';
  let currentFocusId='';
  let lastDestinationCandidateId='';

  const core=()=>globalThis.OUTBASE_CORE||null;
  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const readJson=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');return value??fallback;}catch(_e){return fallback;}};
  const writeJson=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const snapshot=()=>{try{return core()?.snapshot?.()||{};}catch(_e){return {};}};
  const activePlanId=()=>{const id=localStorage.getItem('outbase_active_plan_id')||'';return id&&id!=='none'?id:'';};
  const now=()=>new Date().toISOString();
  const uid=prefix=>`${prefix}_${globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2,9)}`}`;

  function candidateType(candidate={}){
    const type=String(candidate.candidateType||candidate.type||'').toLowerCase();
    if(type.includes('plan')||type.includes('schedule')||type.includes('予定'))return'plan';
    if(type.includes('buy')||type.includes('shopping')||type.includes('買'))return'buy';
    if(type.includes('improvement')||type.includes('改善'))return'improvement';
    return'proposal';
  }

  function candidateText(candidate={}){
    const payload=candidate.payload;
    if(typeof payload==='string')return payload;
    return payload?.text||payload?.title||candidate.reason||'';
  }

  function planStates(){return readJson(PLAN_STATE_KEY,{});}
  function setPlanState(id,patch){const states=planStates();states[id]={...(states[id]||{}),...patch,updatedAt:now()};writeJson(PLAN_STATE_KEY,states);}

  function memoRows(kind){
    return (snapshot().memos||[])
      .filter(m=>m.kind===kind&&m.status!=='deleted')
      .map(m=>({
        id:m.memoId,source:'memo',kind,text:m.text||'',completed:Boolean(m.completed),
        planIds:Array.isArray(m.planIds)?m.planIds:[],createdAt:m.createdAt||m.observedAt||'',updatedAt:m.updatedAt||'',origin:m.source||'manual',raw:m
      }));
  }

  function planRows(){
    const states=planStates();
    const ai=(snapshot().candidates||[])
      .filter(c=>c.state==='accepted'&&candidateType(c)==='plan')
      .map(c=>({
        id:c.candidateId,source:'candidate',kind:'plan-candidate',text:candidateText(c),completed:Boolean(states[c.candidateId]?.completed),
        planIds:Array.isArray(c.planIds)?c.planIds:[],createdAt:c.decidedAt||c.createdAt||'',updatedAt:states[c.candidateId]?.updatedAt||c.decidedAt||'',origin:'chappy',raw:c
      }));
    return [...memoRows('plan-candidate'),...ai];
  }

  function rowsFor(tab=currentTab){
    const rows=tab==='plan'?planRows():memoRows(TABS[tab].kind);
    return rows.sort((a,b)=>Number(a.completed)-Number(b.completed)||new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt));
  }

  function counts(){
    return Object.fromEntries(Object.keys(TABS).map(tab=>[tab,rowsFor(tab).filter(row=>!row.completed).length]));
  }

  function entryMarkup(){
    const c=counts();
    return `<button type="button" class="prepMemoEntry" data-prep-memo-open="buy">
      <div class="prepMemoEntryHead"><div><small>PREPARATION MEMO</small><b>準備メモ</b></div><strong>›</strong></div>
      <div class="prepMemoEntryCounts"><span>🛒 買う物 <b>${c.buy}</b></span><span>💡 改善 <b>${c.improvement}</b></span><span>📅 予定候補 <b>${c.plan}</b></span></div>
    </button>`;
  }

  function injectPrepEntry(){
    const page=document.getElementById('page-prep');
    if(!page||page.querySelector('[data-prep-memo-open]'))return;
    const anchor=page.querySelector('.prepSectionHead');
    const wrap=document.createElement('div');
    wrap.className='prepMemoEntryWrap';
    wrap.innerHTML=entryMarkup();
    if(anchor)anchor.before(wrap);else page.appendChild(wrap);
  }

  function refreshEntry(){
    document.querySelector('.prepMemoEntryWrap')?.remove();
    injectPrepEntry();
  }

  function rowMarkup(row){
    const tabMeta=TABS[currentTab];
    const source=row.origin==='chappy'?'Chappy採用':'手動';
    const planLabel=row.planIds?.length?`プラン ${row.planIds.length}件`:'プラン未指定';
    return `<article class="prepMemoRow ${row.completed?'completed':''}" data-prep-memo-row="${esc(row.id)}">
      <button type="button" class="prepMemoCheck" data-prep-memo-toggle="${esc(row.id)}" aria-label="${row.completed?'未完了へ戻す':'完了にする'}">${row.completed?'✓':''}</button>
      <div class="prepMemoRowBody">
        <div class="prepMemoRowMeta"><span>${esc(source)}</span><span>${esc(planLabel)}</span></div>
        <h4>${esc(row.text||'内容未入力')}</h4>
        <small>${row.createdAt?new Date(row.createdAt).toLocaleString('ja-JP'):tabMeta.label}</small>
      </div>
      <button type="button" class="prepMemoMore" data-prep-memo-edit="${esc(row.id)}" aria-label="編集">⋯</button>
    </article>`;
  }

  function renderSheet(){
    const sheet=document.getElementById(SHEET_ID);
    if(!sheet)return;
    const rows=rowsFor();
    const c=counts();
    sheet.innerHTML=`<section class="prepMemoSheet" role="dialog" aria-modal="true" aria-label="準備メモ">
      <header class="prepMemoHead"><div><small>PREPARATION MEMO</small><h2>準備メモ</h2><p>買う物・改善・予定候補をまとめて管理</p></div><button type="button" data-prep-memo-close>×</button></header>
      <nav class="prepMemoTabs">${Object.entries(TABS).map(([key,meta])=>`<button type="button" class="${currentTab===key?'active':''}" data-prep-memo-tab="${key}"><span>${meta.icon}</span>${meta.label}<b>${c[key]}</b></button>`).join('')}</nav>
      <div class="prepMemoToolbar"><button type="button" data-prep-memo-add>＋ ${esc(TABS[currentTab].label)}を追加</button><span>未完了 ${rows.filter(r=>!r.completed).length}件</span></div>
      <div class="prepMemoList">${rows.length?rows.map(rowMarkup).join(''):`<div class="prepMemoEmpty"><span>${TABS[currentTab].icon}</span><b>${TABS[currentTab].label}はありません</b><p>手動追加またはChappyの提案採用でここに表示されます。</p></div>`}</div>
      ${currentTab==='plan'?'<p class="prepMemoSafety"><b>予定は自動登録しません。</b>「予定へ進む」で内容を保持したまま予定画面へ移動します。</p>':''}
    </section>`;
    requestAnimationFrame(()=>{
      const target=currentFocusId&&sheet.querySelector(`[data-prep-memo-row="${CSS.escape(currentFocusId)}"]`);
      target?.scrollIntoView({block:'center'});target?.classList.add('focused');currentFocusId='';
    });
  }

  function open(tab='buy',focusId=''){
    currentTab=TABS[tab]?tab:'buy';currentFocusId=focusId||'';
    document.getElementById(SHEET_ID)?.remove();
    const backdrop=document.createElement('div');backdrop.id=SHEET_ID;backdrop.className='prepMemoBackdrop';
    document.body.appendChild(backdrop);document.body.classList.add('prepMemoOpen');renderSheet();
  }

  function close(){document.getElementById(SHEET_ID)?.remove();document.getElementById(EDITOR_ID)?.remove();document.body.classList.remove('prepMemoOpen');refreshEntry();}

  function findRow(id){return rowsFor().find(row=>row.id===id)||Object.keys(TABS).flatMap(tab=>rowsFor(tab)).find(row=>row.id===id);}

  function saveMemo(existing,text,planLinked){
    const api=core();if(!api?.addMemo)throw new Error('Coreメモ基盤を読み込めませんでした');
    const planId=activePlanId();
    return api.addMemo({
      ...(existing?.raw||{}),memoId:existing?.id||uid('memo'),kind:TABS[currentTab].kind,text:text.trim(),source:existing?.origin==='chappy'?'chappy':'manual',
      planIds:planLinked&&planId?[planId]:[],activityIds:existing?.raw?.activityIds||[],status:'active',completed:Boolean(existing?.completed),createdAt:existing?.raw?.createdAt||now(),updatedAt:now()
    });
  }

  function openEditor(id=''){
    const row=id?findRow(id):null;
    if(row?.source==='candidate'){
      const actions=currentTab==='plan'?`<button type="button" data-prep-plan-go="${esc(row.id)}">予定へ進む</button>`:'';
      showReadOnly(row,actions);return;
    }
    document.getElementById(EDITOR_ID)?.remove();
    const editor=document.createElement('div');editor.id=EDITOR_ID;editor.className='prepMemoEditorBackdrop';
    const linked=Boolean(row?.planIds?.length);
    editor.innerHTML=`<section class="prepMemoEditor"><header><div><small>${row?'EDIT':'NEW'} ${esc(TABS[currentTab].label)}</small><h3>${row?'内容を編集':'新しく追加'}</h3></div><button type="button" data-prep-editor-close>×</button></header>
      <textarea data-prep-editor-text placeholder="内容を入力">${esc(row?.text||'')}</textarea>
      <label class="prepMemoPlanLink"><input type="checkbox" data-prep-editor-plan ${linked?'checked':''} ${activePlanId()?'':'disabled'}><span>現在のプランに紐付ける</span></label>
      ${activePlanId()?'':'<p class="prepMemoEditorHint">現在のプランが未選択のため、共通メモとして保存します。</p>'}
      <div class="prepMemoEditorActions">${row?'<button type="button" class="danger" data-prep-memo-delete>削除</button>':''}<button type="button" data-prep-editor-save>保存</button></div>
    </section>`;
    editor.dataset.editId=id;document.body.appendChild(editor);
  }

  function showReadOnly(row,actions=''){
    document.getElementById(EDITOR_ID)?.remove();
    const editor=document.createElement('div');editor.id=EDITOR_ID;editor.className='prepMemoEditorBackdrop';
    editor.innerHTML=`<section class="prepMemoEditor"><header><div><small>CHAPPY ACCEPTED</small><h3>${esc(TABS[currentTab].label)}</h3></div><button type="button" data-prep-editor-close>×</button></header>
      <div class="prepMemoReadonly"><p>${esc(row.text)}</p><small>Chappyで採用した内容です。元の提案履歴を保つため本文は変更しません。</small></div>
      <div class="prepMemoEditorActions">${actions}<button type="button" class="secondary" data-prep-editor-close>閉じる</button></div>
    </section>`;
    document.body.appendChild(editor);
  }

  function toggle(id){
    const row=findRow(id);if(!row)return;
    if(row.source==='candidate')setPlanState(row.id,{completed:!row.completed});
    else core()?.addMemo?.({...row.raw,completed:!row.completed,updatedAt:now()});
    renderSheet();refreshEntry();
  }

  function removeMemo(id){
    const row=findRow(id);if(!row||row.source!=='memo')return;
    if(!confirm('このメモを削除しますか？'))return;
    core()?.addMemo?.({...row.raw,status:'deleted',updatedAt:now()});
    document.getElementById(EDITOR_ID)?.remove();renderSheet();refreshEntry();
  }

  function goToPlan(id){
    const row=findRow(id);if(!row)return;
    localStorage.setItem('outbase_plan_candidate_draft',JSON.stringify({sourceId:row.id,text:row.text,createdAt:now()}));
    if(!confirm('候補内容を保持して予定画面へ移動します。予定は自動作成されません。'))return;
    close();location.hash='plan';location.search='?tab=plan';
  }

  function injectDestinationAction(){
    const card=document.querySelector('.chappyDestinationCard');
    if(!card||card.querySelector('[data-open-normal-memo]'))return;
    const actions=card.querySelector('.chappyDestinationActions');if(!actions)return;
    const candidateId=lastDestinationCandidateId||localStorage.getItem(LAST_DESTINATION_KEY)||'';
    if(!candidateId)return;
    const candidate=(snapshot().candidates||[]).find(c=>c.candidateId===candidateId);
    const tab=candidateType(candidate);
    if(!TABS[tab])return;
    const button=document.createElement('button');button.type='button';button.className='secondary';button.dataset.openNormalMemo=candidateId;button.dataset.memoTab=tab;button.textContent='通常画面で管理';
    actions.prepend(button);
  }

  document.addEventListener('pointerdown',event=>{
    const button=event.target.closest?.('[data-open-destination]');if(!button)return;
    lastDestinationCandidateId=button.dataset.openDestination||'';localStorage.setItem(LAST_DESTINATION_KEY,lastDestinationCandidateId);
  },true);

  document.addEventListener('click',event=>{
    const openButton=event.target.closest?.('[data-prep-memo-open]');if(openButton){open(openButton.dataset.prepMemoOpen||'buy');return;}
    if(event.target===document.getElementById(SHEET_ID)||event.target.closest?.('[data-prep-memo-close]')){close();return;}
    const tab=event.target.closest?.('[data-prep-memo-tab]');if(tab){currentTab=tab.dataset.prepMemoTab;renderSheet();return;}
    if(event.target.closest?.('[data-prep-memo-add]')){openEditor();return;}
    const edit=event.target.closest?.('[data-prep-memo-edit]');if(edit){openEditor(edit.dataset.prepMemoEdit);return;}
    const toggleButton=event.target.closest?.('[data-prep-memo-toggle]');if(toggleButton){toggle(toggleButton.dataset.prepMemoToggle);return;}
    if(event.target.closest?.('[data-prep-editor-close]')){document.getElementById(EDITOR_ID)?.remove();return;}
    const save=event.target.closest?.('[data-prep-editor-save]');if(save){
      const editor=document.getElementById(EDITOR_ID),text=editor?.querySelector('[data-prep-editor-text]')?.value||'';
      if(!text.trim()){alert('内容を入力してください。');return;}
      const existing=editor?.dataset.editId?findRow(editor.dataset.editId):null;
      try{saveMemo(existing,text,Boolean(editor?.querySelector('[data-prep-editor-plan]')?.checked));editor.remove();renderSheet();refreshEntry();}catch(error){alert(error.message||String(error));}
      return;
    }
    if(event.target.closest?.('[data-prep-memo-delete]')){removeMemo(document.getElementById(EDITOR_ID)?.dataset.editId||'');return;}
    const planGo=event.target.closest?.('[data-prep-plan-go]');if(planGo){goToPlan(planGo.dataset.prepPlanGo);return;}
    const normal=event.target.closest?.('[data-open-normal-memo]');if(normal){
      document.getElementById('outbaseChappyDestinationSheet')?.remove();document.getElementById('outbaseChappySheet')?.remove();
      open(normal.dataset.memoTab||'buy',normal.dataset.openNormalMemo||'');return;
    }
  },true);

  const observer=new MutationObserver(()=>{injectPrepEntry();injectDestinationAction();});
  observer.observe(document.documentElement,{subtree:true,childList:true});
  globalThis.addEventListener('outbase:entry-refresh',()=>{refreshEntry();if(document.getElementById(SHEET_ID))renderSheet();});
  globalThis.addEventListener('outbase:chappy-stats',refreshEntry);
  globalThis.OUTBASE_MEMO_UI={open,close,refresh:()=>{refreshEntry();if(document.getElementById(SHEET_ID))renderSheet();}};
  injectPrepEntry();
})();
