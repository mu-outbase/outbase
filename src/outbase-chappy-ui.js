(() => {
'use strict';
const ID='outbaseChappySheet', LAST='outbase_chappy_last_request_id';
const chappy=()=>globalThis.OUTBASE_CHAPPY||null;
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const instruction=()=>document.querySelector('[data-chappy-instruction]')?.value.trim()||'最近の記録とメモを整理し、次に役立つ提案を3件以内で返してください。';
function status(msg,type='info'){const n=document.querySelector('[data-chappy-status]');if(!n)return;n.className=`chappyStatus ${type}`;n.textContent=msg;n.hidden=false;}
function busy(flag){document.querySelectorAll(`#${ID} button`).forEach(b=>{if(!b.hasAttribute('data-chappy-close'))b.disabled=flag;});}
function open(){
 document.getElementById(ID)?.remove();
 const active=(localStorage.getItem('outbase_record_session_state')||'idle')==='active';
 const el=document.createElement('div');el.id=ID;el.className='chappySheet';
 el.innerHTML=`<div class="chappyCard">
  <div class="chappyHead"><div><small>OUTBASE × CHAPPY</small><h3>Chappyへ相談</h3></div><button data-chappy-close>×</button></div>
  <section class="chappyStep"><div class="chappyStepTitle"><span>1</span><b>相談内容</b></div>
   <textarea data-chappy-instruction>${esc(active?'現在の活動と最近の記録を整理し、今役立つ提案を3件以内で返してください。':'最近の記録とメモを整理し、次に役立つ提案を3件以内で返してください。')}</textarea>
   <div class="chappyActions two"><button class="secondary" data-chappy-copy>プロンプトをコピー</button><button data-chappy-share>共有して開く</button></div>
   <p class="chappyHint">ChatGPTへ貼り付けると、OUTBASE取込用JSONで回答します。</p>
  </section>
  <section class="chappyStep"><div class="chappyStepTitle"><span>2</span><b>回答JSONを戻す</b></div>
   <textarea data-chappy-response placeholder="ChatGPTのJSON回答をここへ貼り付ける"></textarea>
   <button class="chappyImport" data-chappy-import>OUTBASEへ取り込む</button>
  </section>
  <div class="chappyStatus" data-chappy-status hidden></div><section class="chappyResult" data-chappy-result hidden></section>
  <div class="chappySafety"><b>AIは提案のみ</b><span>事実は直接変更せず、CandidateとRelationとして保存します。</span></div>
 </div>`;
 document.body.appendChild(el);
}
async function copyPrompt(){
 const api=chappy();if(!api){status('Chappy基盤を読み込めませんでした。','error');return;}busy(true);
 try{const req=api.generatePrompt({purpose:'outbase-consult',instruction:instruction()});localStorage.setItem(LAST,req.requestId);
  if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(req.prompt);else{const t=document.createElement('textarea');t.value=req.prompt;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();}
  status('プロンプトをコピーしました。ChatGPTへ貼り付けてください。','success');
 }catch(e){status(`コピーできませんでした：${e.message||e}`,'error');}finally{busy(false);}
}
async function sharePrompt(){
 const api=chappy();if(!api){status('Chappy基盤を読み込めませんでした。','error');return;}busy(true);
 try{const req=api.generatePrompt({purpose:'outbase-consult',instruction:instruction()});localStorage.setItem(LAST,req.requestId);
  if(navigator.share){await navigator.share({title:'OUTBASEからChappyへ相談',text:req.prompt});status('共有しました。','success');}
  else{await navigator.clipboard?.writeText(req.prompt);status('共有機能がないためコピーしました。','success');}
 }catch(e){status(e?.name==='AbortError'?'共有をキャンセルしました。':`共有できませんでした：${e.message||e}`,e?.name==='AbortError'?'info':'error');}finally{busy(false);}
}
function render(result){
 const n=result.normalized,node=document.querySelector('[data-chappy-result]');if(!node)return;node.hidden=false;
 node.innerHTML=`<div class="chappyResultHead"><small>IMPORT COMPLETE</small><h4>${esc(n.summary||'Chappyの回答を取り込みました')}</h4></div>
 ${n.message?`<p>${esc(n.message)}</p>`:''}<div class="chappyCounts"><div><b>${n.candidates.length}</b><span>提案候補</span></div><div><b>${n.relations.length}</b><span>関連情報</span></div><div><b>${n.warnings.length}</b><span>注意</span></div></div>
 ${n.candidates.length?`<div class="chappyCandidateList">${n.candidates.slice(0,3).map(i=>`<article><b>${esc(i.candidateType)}</b><p>${esc(i.reason||String(i.value??''))}</p>${i.confidence!=null?`<small>確信度 ${Math.round(i.confidence*100)}%</small>`:''}</article>`).join('')}</div>`:''}
 ${n.warnings.length?`<div class="chappyWarnings">${n.warnings.map(w=>`<p>⚠ ${esc(w)}</p>`).join('')}</div>`:''}<p class="chappySaved">OUTBASEへ保存済み。事実データは変更していません。</p>`;
}
function importJson(){
 const api=chappy();if(!api){status('Chappy基盤を読み込めませんでした。','error');return;}
 const raw=document.querySelector('[data-chappy-response]')?.value.trim()||'';if(!raw){status('ChatGPTのJSON回答を貼り付けてください。','error');return;}busy(true);
 try{const result=api.importResponse(raw,{requestId:localStorage.getItem(LAST)||null});render(result);status('回答を取り込みました。','success');document.querySelector('[data-chappy-response]').value='';globalThis.dispatchEvent(new CustomEvent('outbase:entry-refresh'));}
 catch(e){status(`取り込めませんでした：${e.message||e}`,'error');}finally{busy(false);}
}
document.addEventListener('click',e=>{if(e.target.closest?.('[data-chappy-close]')){document.getElementById(ID)?.remove();return;}if(e.target.closest?.('[data-chappy-copy]')){copyPrompt();return;}if(e.target.closest?.('[data-chappy-share]')){sharePrompt();return;}if(e.target.closest?.('[data-chappy-import]')){importJson();return;}if(e.target.id===ID)document.getElementById(ID)?.remove();});
globalThis.addEventListener('outbase:open-chappy',open);
})();