(() => {
'use strict';
const ID='outbaseChappySheet', LAST='outbase_chappy_last_request_id';
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
  try{return core()?.snapshot()||{};}catch(_e){return {};}
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
  <div class="candidateDestination"><b>採用時</b><span>${esc(m.dest)}</span></div>
  ${c.appliedTo?`<div class="candidateApplied">反映済み：${esc(c.appliedTo.kind||c.appliedTo.type||'OUTBASE')}</div>`:''}
  <div class="candidateActions"><button data-candidate-decision="accept" data-candidate-id="${esc(c.candidateId)}" ${disabled?'disabled':''}>${c.state==='accepted'?'採用済み':'採用'}</button><button class="hold" data-candidate-decision="hold" data-candidate-id="${esc(c.candidateId)}" ${disabled?'disabled':''}>${c.state==='held'?'保留中':'保留'}</button><button class="reject" data-candidate-decision="reject" data-candidate-id="${esc(c.candidateId)}" ${disabled?'disabled':''}>${c.state==='rejected'?'却下済み':'却下'}</button></div>
 </article>`;}).join('')}</div>`;
}
function filterBar(){
 const count=allCandidates().reduce((a,c)=>(a[c.state]=(a[c.state]||0)+1,a),{});
 return`<div class="candidateFilters"><button class="active" data-candidate-filter="pending">判断待ち ${count.pending||0}</button><button data-candidate-filter="held">保留 ${count.held||0}</button><button data-candidate-filter="accepted">採用済み ${count.accepted||0}</button><button data-candidate-filter="rejected">却下済み ${count.rejected||0}</button><button data-candidate-filter="all">すべて ${allCandidates().length}</button></div>`;
}
function historyHtml(){
  const rows=recentResponses();
  if(!rows.length)return '<div class="chappyEmpty">相談履歴はまだありません。</div>';
  return `<div class="chappyHistory">${rows.map(r=>`
    <article><b>${esc(r.normalized?.summary||'Chappy相談')}</b><small>${new Date(r.importedAt).toLocaleString('ja-JP')}</small>
    <span>候補 ${r.normalized?.candidates?.length||0}件・関連 ${r.normalized?.relations?.length||0}件</span></article>`).join('')}</div>`;
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
  <section class="chappyStep"><div class="chappyStepTitle"><span>4</span><b>相談履歴</b></div><div data-chappy-history>${historyHtml()}</div><button class="chappyReconsult" data-chappy-reconsult>同じ内容でもう一度相談</button></section>
  <div class="chappySafety"><b>AIは提案のみ</b><span>採用した時だけユーザー判断として反映します。予定候補は自動登録しません。</span></div>
 </div>`;
 document.body.appendChild(el);
}
function refreshManaged(){
 const f=currentFilter(),old=document.querySelector('.candidateFilters');
 if(old){const w=document.createElement('div');w.innerHTML=filterBar();old.replaceWith(w.firstElementChild);document.querySelectorAll('[data-candidate-filter]').forEach(b=>b.classList.toggle('active',b.dataset.candidateFilter===f));}
 const list=document.querySelector('[data-candidate-list]');if(list)list.innerHTML=candidateCards(f);
 const hist=document.querySelector('[data-chappy-history]');if(hist)hist.innerHTML=historyHtml();
}
async function makeRequest(mode){
 const api=chappy();if(!api){status('Chappy基盤を読み込めませんでした。','error');return;}busy(true);
 try{
  const req=api.generatePrompt({purpose:'outbase-consult',instruction:instruction()});localStorage.setItem(LAST,req.requestId);
  if(mode==='share'&&navigator.share){await navigator.share({title:'OUTBASEからChappyへ相談',text:req.prompt});status('共有しました。','success');}
  else{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(req.prompt);else{const t=document.createElement('textarea');t.value=req.prompt;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();}status(mode==='share'?'共有機能がないためコピーしました。':'プロンプトをコピーしました。','success');}
 }catch(e){status(e?.name==='AbortError'?'共有をキャンセルしました。':`${mode==='share'?'共有':'コピー'}できませんでした：${e.message||e}`,e?.name==='AbortError'?'info':'error');}
 finally{busy(false);}
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
 try{const result=api.importResponse(raw,{requestId:localStorage.getItem(LAST)||null});render(result);status('回答を取り込みました。','success');document.querySelector('[data-chappy-response]').value='';refreshManaged();globalThis.dispatchEvent(new CustomEvent('outbase:entry-refresh'));}
 catch(e){status(`取り込めませんでした：${e.message||e}`,'error');}finally{busy(false);}
}
function decide(id,decision){
 const api=core();if(!api){status('Coreを読み込めませんでした。','error');return;}
 try{
  const result=api.decideCandidate(id,decision,{...activeContext(),decidedBy:'user'});
  const msg=decision==='accept'
    ?(result.appliedTo?.type==='plan_candidate'?'予定候補として保持しました。':'採用してOUTBASEへ反映しました。')
    :decision==='hold'?'保留しました。':'却下しました。';
  status(msg,'success');refreshManaged();globalThis.dispatchEvent(new CustomEvent('outbase:entry-refresh'));
 }catch(e){status(`候補を更新できませんでした：${e.message||e}`,'error');}
}
function applyTemplate(type){
 const map={
  prepare:'今後の準備に必要なことを、買い物・料理・当日準備に分けて3件以内で提案してください。',
  record:'最近の活動記録を整理し、重要な出来事・場所・メモを3件以内でまとめてください。',
  improve:'最近の記録から、次回改善と買い足し候補を3件以内で提案してください。'
 };
 const n=document.querySelector('[data-chappy-instruction]');if(n)n.value=map[type]||n.value;
}
document.addEventListener('click',e=>{
 if(e.target.closest?.('[data-chappy-close]')){document.getElementById(ID)?.remove();return;}
 if(e.target.closest?.('[data-chappy-copy]')){makeRequest('copy');return;}
 if(e.target.closest?.('[data-chappy-share]')){makeRequest('share');return;}
 if(e.target.closest?.('[data-chappy-import]')){importJson();return;}
 const decision=e.target.closest?.('[data-candidate-decision]');if(decision){decide(decision.dataset.candidateId,decision.dataset.candidateDecision);return;}
 const filter=e.target.closest?.('[data-candidate-filter]');if(filter){document.querySelectorAll('[data-candidate-filter]').forEach(b=>b.classList.toggle('active',b===filter));const list=document.querySelector('[data-candidate-list]');if(list)list.innerHTML=candidateCards(filter.dataset.candidateFilter);return;}
 const template=e.target.closest?.('[data-chappy-template]');if(template){applyTemplate(template.dataset.chappyTemplate);return;}
 if(e.target.closest?.('[data-chappy-reconsult]')){makeRequest('share');return;}
 if(e.target.id===ID)document.getElementById(ID)?.remove();
});
globalThis.addEventListener('outbase:open-chappy',open);
})();