(() => {
'use strict';
const ID='outbaseChappySheet', LAST='outbase_chappy_last_request_id', LAST_INSTRUCTION='outbase_chappy_last_instruction';
const core=()=>globalThis.OUTBASE_CORE||null, chappy=()=>globalThis.OUTBASE_CHAPPY||null;
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const activeContext=()=>({
  activityIds:localStorage.getItem('outbase_core_activity_id')?[localStorage.getItem('outbase_core_activity_id')]:[],
  planIds:(()=>{const p=localStorage.getItem('outbase_active_plan_id');return p&&p!=='none'?[p]:[]})()
});
function instruction(){return document.querySelector('[data-chappy-instruction]')?.value.trim()||'最近の記録とメモを整理し、次に役立つ提案を3件以内で返してください。';}
function status(msg,type='info'){const n=document.querySelector('[data-chappy-status]');if(!n)return;n.className=`chappyStatus ${type}`;n.textContent=msg;n.hidden=false;}
function busy(flag){document.querySelectorAll(`#${ID} button`).forEach(b=>{if(!b.hasAttribute('data-chappy-close'))b.disabled=flag;});}

function snapshot(){
  try{core()?.migrateLegacyChappyData?.();core()?.backfillChappyInstructions?.();return core()?.snapshot()||{};}catch(_e){return {};}
}
function pendingCandidates(){
  return (snapshot().candidates||[]).filter(c=>['pending','held'].includes(c.state)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
}
function recentResponses(){
  return (snapshot().aiResponses||[]).slice().sort((a,b)=>new Date(b.importedAt)-new Date(a.importedAt)).slice(0,5);
}
function candidateText(c){
 const p=c.payload;if(typeof p==='string')return p;
 return p?.text||p?.title||c.reason||JSON.stringify(p??'');
}
function candidateMeta(c){
 const t=String(c.candidateType||'').toLowerCase();
 if(t.includes('plan')||t.includes('schedule')||t.includes('予定'))return{label:'予定候補',icon:'📅',cls:'plan',dest:'予定候補として保持（自動登録しません）'};
 if(t.includes('buy')||t.includes('shopping')||t.includes('買'))return{label:'買い物候補',icon:'🛒',cls:'buy',dest:'買う物メモへ追加'};
 if(t.includes('improvement')||t.includes('改善'))return{label:'改善提案',icon:'💡',cls:'improvement',dest:'改善メモへ追加'};
 return{label:'提案',icon:'✨',cls:'proposal',dest:'提案メモへ追加'};
}
function stateMeta(s){
 if(s==='accepted')return{label:'採用済み',cls:'accepted'};
 if(s==='held')return{label:'保留中',cls:'held'};
 if(s==='rejected')return{label:'却下済み',cls:'rejected'};
 return{label:'判断待ち',cls:'pending'};
}
function allCandidates(){return(snapshot().candidates||[]).slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));}
function currentFilter(){return document.querySelector('[data-candidate-filter].active')?.dataset.candidateFilter||'pending';}
function filteredCandidates(filter=currentFilter()){
 const rows=allCandidates();if(filter==='all')return rows;if(filter==='pending')return rows.filter(c=>c.state==='pending');return rows.filter(c=>c.state===filter);
}
function candidateCards(filter='pending'){
 const items=filteredCandidates(filter);if(!items.length)return'<div class="chappyEmpty">該当する提案はありません。</div>';
 return`<div class="chappyCandidateManage">${items.map(c=>{const m=candidateMeta(c),st=stateMeta(c.state),disabled=!['pending','held'].includes(c.state);return`
 <article class="candidateCard ${m.cls} ${st.cls}" data-candidate-card="${esc(c.candidateId)}">
  <div class="candidateTop"><div class="candidateType"><span>${m.icon}</span><b>${m.label}</b></div><div class="candidateBadges">${c.confidence!=null?`<small>${Math.round(c.confidence*100)}%</small>`:''}<em>${st.label}</em></div></div>
  <h4>${esc(candidateText(c))}</h4>
  ${c.reason?`<div class="candidateReason"><b>理由</b><p>${esc(c.reason)}</p></div>`:''}
  <div class="candidateDestination"><b>採用すると</b><span>→ ${esc(m.dest)}</span></div>
  ${c.appliedTo?`<div class="candidateApplied"><span>✓ ${esc(c.appliedTo.kind||c.appliedTo.type||'OUTBASE')}へ追加しました</span><button data-open-destination="${esc(c.candidateId)}">見る</button></div>`:''}
  <div class="candidateActions"><button class="accept" data-candidate-decision="accept" data-candidate-id="${esc(c.candidateId)}" ${disabled?'disabled':''}>${c.state==='accepted'?'採用済み':'採用'}</button><button class="hold" data-candidate-decision="hold" data-candidate-id="${esc(c.candidateId)}" ${disabled?'disabled':''}>${c.state==='held'?'保留中':'保留'}</button><button class="reject" data-candidate-decision="reject" data-candidate-id="${esc(c.candidateId)}" ${disabled?'disabled':''}>${c.state==='rejected'?'却下済み':'却下'}</button></div>
 </article>`;}).join('')}</div>`;
}
function filterBar(){
 const count=allCandidates().reduce((a,c)=>(a[c.state]=(a[c.state]||0)+1,a),{});
 return`<div class="candidateFilters"><button class="active" data-candidate-filter="pending">判断待ち ${count.pending||0}</button><button data-candidate-filter="held">保留 ${count.held||0}</button><button data-candidate-filter="accepted">採用済み ${count.accepted||0}</button><button data-candidate-filter="rejected">却下済み ${count.rejected||0}</button><button data-candidate-filter="all">すべて ${allCandidates().length}</button></div>`;
}
function historyHtml(){
  const rows=recentResponses(), candidates=allCandidates();
  if(!rows.length)return'<div class="chappyEmpty">再相談できる履歴がありません。</div>';
  return`<div class="chappyHistory">${rows.map(r=>{
    const related=candidates.filter(c=>c.responseId===r.responseId||c.importId===r.responseId);
    const accepted=related.filter(c=>c.state==='accepted').length;
    const held=related.filter(c=>c.state==='held').length;
    const rejected=related.filter(c=>c.state==='rejected').length;
    const pending=related.filter(c=>c.state==='pending').length;
    return`<article class="historyCard">
      <div class="historyMain">
        <b>${esc(r.normalized?.summary||'Chappy相談')}</b>
        <small>${new Date(r.importedAt).toLocaleString('ja-JP')}</small>
      </div>
      <div class="historyCounts">
        <span>採用 ${accepted}</span><span>保留 ${held}</span><span>却下 ${rejected}</span><span>判断待ち ${pending}</span>
      </div>
      <div class="historyActions">
        <button class="historyDetail" type="button" data-history-detail="${esc(r.responseId)}">詳細を見る</button>
        <button class="historyReconsult" type="button" data-history-reconsult="${esc(r.responseId)}" ${historyInstruction(r.responseId)?"":"disabled"}>この内容で再相談</button>
      </div>
    </article>`;
  }).join('')}</div>`;
}
function open(){
 document.getElementById(ID)?.remove();
 const active=(localStorage.getItem('outbase_record_session_state')||'idle')==='active';
 const el=document.createElement('div');el.id=ID;el.className='chappySheet';
 el.innerHTML=`<div class="chappyCard">
  <div class="chappyHead"><div><small>OUTBASE × CHAPPY</small><h3>Chappyへ相談</h3></div><button data-chappy-close>×</button></div>
  <section class="chappyStep"><div class="chappyStepTitle"><span>1</span><b>相談内容</b></div>
   <textarea data-chappy-instruction>${esc(active?'現在の活動と最近の記録を整理し、今役立つ提案を3件以内で返してください。':'最近の記録とメモを整理し、次に役立つ提案を3件以内で返してください。')}</textarea>
   <div class="chappyTemplates">
    <button data-chappy-template="prepare">準備を整理</button><button data-chappy-template="record">記録を整理</button><button data-chappy-template="improve">次回改善</button>
   </div>
   <div class="chappyActions two"><button class="secondary" data-chappy-copy>プロンプトをコピー</button><button data-chappy-share>共有して開く</button></div>
   <p class="chappyHint">ChatGPTへ貼り付けると、OUTBASE取込用JSONで回答します。</p>
  </section>
  <section class="chappyStep"><div class="chappyStepTitle"><span>2</span><b>回答JSONを戻す</b></div>
   <textarea data-chappy-response placeholder="ChatGPTのJSON回答をここへ貼り付ける"></textarea>
   <button class="chappyImport" data-chappy-import>OUTBASEへ取り込む</button>
  </section>
  <div class="chappyStatus" data-chappy-status hidden></div><section class="chappyResult" data-chappy-result hidden></section>
  <section class="chappyStep"><div class="chappyStepTitle"><span>3</span><b>提案を整理</b></div>${filterBar()}<div data-candidate-list>${candidateCards("pending")}</div></section>
  <section class="chappyStep"><div class="chappyStepTitle"><span>4</span><b>相談履歴</b></div><div data-chappy-history>${historyHtml()}</div><button class="chappyReconsult" data-chappy-reconsult ${recentResponses().length?"":"disabled"}>前回の内容で再相談</button></section>
  <div class="chappySafety"><b>AIは提案のみ</b><span>採用した時だけユーザー判断として反映します。予定候補は自動登録しません。</span></div>
 </div>`;
 document.body.appendChild(el);
 const migration=core()?.migrateLegacyChappyData?.();
 if(migration?.migrated&&(migration.migratedResponses||migration.migratedCandidates)){
   status(`過去の相談履歴を復元しました（履歴${migration.migratedResponses||0}件・候補${migration.migratedCandidates||0}件）。`,'success');
   refreshManaged();
 }
 publishCandidateStats();
}
function refreshManaged(){
 const f=currentFilter(),old=document.querySelector('.candidateFilters');
 if(old){const w=document.createElement('div');w.innerHTML=filterBar();old.replaceWith(w.firstElementChild);document.querySelectorAll('[data-candidate-filter]').forEach(b=>b.classList.toggle('active',b.dataset.candidateFilter===f));}
 const list=document.querySelector('[data-candidate-list]');if(list)list.innerHTML=candidateCards(f);
 const hist=document.querySelector('[data-chappy-history]');if(hist)hist.innerHTML=historyHtml();
}
function lastConsultInstruction(){
 const data=snapshot();
 const responses=(data.aiResponses||[]).slice().sort((a,b)=>new Date(b.importedAt)-new Date(a.importedAt));
 for(const response of responses){
  const req=(data.aiRequests||[]).find(r=>r.requestId===response.requestId);
  const fromRequest=req?.context?.instruction||req?.instruction||'';
  if(fromRequest)return fromRequest;
  const fallback=response?.normalized?.instruction||response?.normalized?.question||'';
  if(fallback)return fallback;
 }
 const saved=localStorage.getItem(LAST_INSTRUCTION)||'';
 if(saved)return saved;
 const current=document.querySelector('[data-chappy-instruction]')?.value.trim()||'';
 return current;
}
async function makeRequest(mode,explicitInstruction=''){
 const api=chappy();if(!api){status('Chappy基盤を読み込めませんでした。','error');return false;}
 busy(true);
 try{
  const currentInstruction=(explicitInstruction||instruction()).trim();
  if(!currentInstruction){status('相談内容がありません。','error');return false;}
  localStorage.setItem(LAST_INSTRUCTION,currentInstruction);
  const req=api.generatePrompt({purpose:'outbase-consult',instruction:currentInstruction});
  localStorage.setItem(LAST,req.requestId);

  if(mode==='share'){
   if(navigator.share){
    await navigator.share({title:'OUTBASEからChappyへ相談',text:req.prompt});
    status('前回の内容を共有しました。ChatGPTで回答してください。','success');
    return true;
   }
   if(navigator.clipboard?.writeText){
    await navigator.clipboard.writeText(req.prompt);
    status('共有機能が使えないため、プロンプトをコピーしました。','success');
    return true;
   }
   const t=document.createElement('textarea');
   t.value=req.prompt;t.style.position='fixed';t.style.opacity='0';
   document.body.appendChild(t);t.select();
   const copied=document.execCommand('copy');t.remove();
   status(copied?'プロンプトをコピーしました。':'共有もコピーもできませんでした。',copied?'success':'error');
   return copied;
  }

  if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(req.prompt);
  else{
   const t=document.createElement('textarea');t.value=req.prompt;t.style.position='fixed';t.style.opacity='0';
   document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();
  }
  status('プロンプトをコピーしました。','success');
  return true;
 }catch(e){
  if(e?.name==='AbortError'){
   status('共有をキャンセルしました。','info');
   return false;
  }
  status(`共有できませんでした：${e.message||e}`,'error');
  return false;
 }finally{busy(false);}
}
function render(result){
 const n=result.normalized,node=document.querySelector('[data-chappy-result]');if(!node)return;node.hidden=false;
 node.innerHTML=`<div class="chappyResultHead"><small>IMPORT COMPLETE</small><h4>${esc(n.summary||'Chappyの回答を取り込みました')}</h4></div>
 ${n.message?`<p>${esc(n.message)}</p>`:''}<div class="chappyCounts"><div><b>${n.candidates.length}</b><span>提案候補</span></div><div><b>${n.relations.length}</b><span>関連情報</span></div><div><b>${n.warnings.length}</b><span>注意</span></div></div>
 <p class="chappySaved">候補と関連を保存しました。事実データは変更していません。</p>`;
}
function importJson(){
 const api=chappy();if(!api){status('Chappy基盤を読み込めませんでした。','error');return;}
 const raw=document.querySelector('[data-chappy-response]')?.value.trim()||'';if(!raw){status('ChatGPTのJSON回答を貼り付けてください。','error');return;}busy(true);
 try{const requestId=localStorage.getItem(LAST)||null;const result=api.importResponse(raw,{requestId});try{
       const responseId=result?.saved?.responseId||result?.responseId||null;
       const instructionText=localStorage.getItem(LAST_INSTRUCTION)||instruction();
       if(responseId&&core()?.saveAiResponse){
         const existing=(snapshot().aiResponses||[]).find(r=>r.responseId===responseId);
         if(existing)core().saveAiResponse({...existing,originalInstruction:instructionText});
       }
      }catch(_e){}
      render(result);status('回答を取り込みました。','success');document.querySelector('[data-chappy-response]').value='';refreshManaged();publishCandidateStats();globalThis.dispatchEvent(new CustomEvent('outbase:entry-refresh'));}
 catch(e){status(`取り込めませんでした：${e.message||e}`,'error');}finally{busy(false);}
}
function decide(id,decision){
 const api=core();if(!api){status('Coreを読み込めませんでした。','error');return;}
 try{
  const result=api.decideCandidate(id,decision,{...activeContext(),decidedBy:'user'});
  const meta=candidateMeta(result);
  let msg='';
  if(decision==='accept'){
    msg=result.appliedTo?.type==='plan_candidate'
      ?'予定候補として保持しました。自動登録はしていません。'
      :`${meta.destination.replace('へ追加','')}へ追加しました。`;
  }else if(decision==='hold')msg='保留しました。';
  else msg='却下しました。';
  status(msg,'success');
  refreshManaged();
  const target=decision==='accept'?'accepted':decision==='hold'?'held':'rejected';
  document.querySelector(`[data-candidate-filter="${target}"]`)?.click();
  globalThis.dispatchEvent(new CustomEvent('outbase:entry-refresh'));
 }catch(e){status(`候補を更新できませんでした：${e.message||e}`,'error');}
}
function publishCandidateStats(){
 const stats=core()?.candidateStats?.()||{};
 localStorage.setItem('outbase_chappy_candidate_stats',JSON.stringify(stats));
 globalThis.dispatchEvent(new CustomEvent('outbase:chappy-stats',{detail:stats}));
}
function historyInstruction(responseId){
 const data=snapshot();
 const response=(data.aiResponses||[]).find(r=>r.responseId===responseId);
 if(!response)return'';
 if(response.originalInstruction)return response.originalInstruction;
 const req=(data.aiRequests||[]).find(r=>r.requestId===response.requestId);
 const requestText=req?.context?.instruction||req?.instruction||'';
 if(requestText)return requestText;
 const normalized=response?.normalized?.instruction||response?.normalized?.question||'';
 if(normalized)return normalized;
 return localStorage.getItem(LAST_INSTRUCTION)||'';
}
function openHistory(responseId){
 const data=snapshot(),response=(data.aiResponses||[]).find(r=>r.responseId===responseId);
 if(!response)return;
 const candidates=(data.candidates||[]).filter(c=>c.responseId===responseId||c.importId===responseId);
 const result=document.querySelector('[data-chappy-result]');
 if(result){
  result.hidden=false;
  result.innerHTML=`<div class="chappyResultHead"><small>HISTORY DETAIL</small><h4>${esc(response.normalized?.summary||'Chappy相談')}</h4></div>
   ${response.normalized?.message?`<p>${esc(response.normalized.message)}</p>`:''}
   <div class="chappyCounts"><div><b>${candidates.length}</b><span>候補</span></div><div><b>${candidates.filter(c=>c.state==='accepted').length}</b><span>採用</span></div><div><b>${candidates.filter(c=>c.state==='held').length}</b><span>保留</span></div></div>
   <p class="chappySaved">${new Date(response.importedAt).toLocaleString('ja-JP')}</p>`;
  result.scrollIntoView({behavior:'smooth',block:'center'});
 }
 const req=(data.aiRequests||[]).find(r=>r.requestId===response.requestId);
 if(req?.context?.instruction){
  const box=document.querySelector('[data-chappy-instruction]');
  if(box)box.value=req.context.instruction;
 }
}
function openDestination(candidateId){
 const candidate=allCandidates().find(c=>c.candidateId===candidateId);
 if(!candidate)return;
 const meta=candidateMeta(candidate);
 document.getElementById(ID)?.remove();
 if(meta.cls==='buy'){
   localStorage.setItem('outbase_highlight_memo_id',candidate.appliedTo?.id||'');
   location.href='?tab=plan';
   setTimeout(()=>globalThis.dispatchEvent(new CustomEvent('outbase:entry-refresh')),50);
   return;
 }
 if(meta.cls==='improvement'){
   localStorage.setItem('outbase_highlight_memo_id',candidate.appliedTo?.id||'');
   location.href='?tab=memory';
   return;
 }
 if(meta.cls==='plan'){
   location.href='?tab=plan';
   return;
 }
 location.href='?tab=memory';
}
function applyTemplate(type){
 const map={
  prepare:'今後の準備に必要なことを、買い物・料理・当日準備に分けて3件以内で提案してください。',
  record:'最近の活動記録を整理し、重要な出来事・場所・メモを3件以内でまとめてください。',
  improve:'最近の記録から、次回改善と買い足し候補を3件以内で提案してください。'
 };
 const n=document.querySelector('[data-chappy-instruction]');if(n)n.value=map[type]||n.value;
}

document.addEventListener('pointerdown',e=>{
 const button=e.target.closest?.('[data-history-detail],[data-history-reconsult]');
 if(button)e.stopPropagation();
},{capture:true});
document.addEventListener('touchstart',e=>{
 const button=e.target.closest?.('[data-history-detail],[data-history-reconsult]');
 if(button)e.stopPropagation();
},{capture:true,passive:true});

document.addEventListener('click',e=>{
 if(e.target.closest?.('[data-chappy-close]')){document.getElementById(ID)?.remove();return;}
 if(e.target.closest?.('[data-chappy-copy]')){makeRequest('copy');return;}
 if(e.target.closest?.('[data-chappy-share]')){makeRequest('share');return;}
 if(e.target.closest?.('[data-chappy-import]')){importJson();return;}
 const decision=e.target.closest?.('[data-candidate-decision]');if(decision){decide(decision.dataset.candidateId,decision.dataset.candidateDecision);return;}
 const filter=e.target.closest?.('[data-candidate-filter]');if(filter){document.querySelectorAll('[data-candidate-filter]').forEach(b=>b.classList.toggle('active',b===filter));const list=document.querySelector('[data-candidate-list]');if(list)list.innerHTML=candidateCards(filter.dataset.candidateFilter);return;}
 const destination=e.target.closest?.('[data-open-destination]');if(destination){openDestination(destination.dataset.openDestination);return;}
 const historyReconsult=e.target.closest?.('[data-history-reconsult]');if(historyReconsult){e.preventDefault();e.stopPropagation();
   const text=historyInstruction(historyReconsult.dataset.historyReconsult);
   if(!text){status('この履歴には再相談できる内容がありません。','info');return;}
   status('この履歴の相談内容を準備しました。共有を開きます。','info');
   const box=document.querySelector('[data-chappy-instruction]');if(box)box.value=text;
   makeRequest('share',text);
   return;
 }
 const historyDetail=e.target.closest?.('[data-history-detail]');if(historyDetail){
   e.preventDefault();e.stopPropagation();
   openHistory(historyDetail.dataset.historyDetail);
   return;
 }
 const template=e.target.closest?.('[data-chappy-template]');if(template){applyTemplate(template.dataset.chappyTemplate);return;}
 if(e.target.closest?.('[data-chappy-reconsult]')){
 const button=e.target.closest('[data-chappy-reconsult]');
 if(button.dataset.running==='1')return;
 const last=lastConsultInstruction();
 if(!last){
  status('再相談できる履歴がありません。','info');
  return;
 }
 const box=document.querySelector('[data-chappy-instruction]');
 if(box)box.value=last;
 button.dataset.running='1';
 button.textContent='共有を開いています…';
 makeRequest('share',last).finally(()=>{
  button.dataset.running='0';
  button.textContent='前回の内容で再相談';
 });
 return;
}
 if(e.target.id===ID)document.getElementById(ID)?.remove();
});
globalThis.addEventListener('outbase:open-chappy',open);
})();