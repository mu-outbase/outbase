(() => {
  'use strict';
  const REVIEW_KEY='outbase_phase14_reviews_v1';
  const CANDIDATE_KEY='outbase_phase14_candidates_v1';
  const RECORD_KEY='outbase_record_saved_records';
  const core=()=>globalThis.OUTBASE_CORE||null;
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f;}catch(_e){return f;}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const now=()=>new Date().toISOString();
  const uid=p=>`${p}_${globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2,9)}`}`;
  const activePlanId=()=>{const id=localStorage.getItem('outbase_active_plan_id')||'';return id&&id!=='none'?id:'';};
  function records(){return read(RECORD_KEY,[]).filter(r=>r&&r.text);}
  function reviews(){return read(REVIEW_KEY,[]);}
  function candidates(){return read(CANDIDATE_KEY,[]);}
  function saveCandidates(rows){write(CANDIDATE_KEY,rows);}
  function latestRecordText(){return records().slice(0,8).map(r=>r.text).join('\n');}
  function generateCandidates(review){
    const rows=[];
    const push=(type,text,source)=>{const t=String(text||'').trim();if(!t)return;rows.push({id:uid('candidate'),type,text:t,source,status:'open',createdAt:now()});};
    push('improvement',review.trouble,'困ったこと');
    push('buy',review.forgot,'忘れ物・不足');
    push('improvement',review.improve,'次回改善');
    if(review.revisit==='yes')push('plan',review.place||'また行きたい場所','また行きたい');
    return rows;
  }
  function addMemo(type,text){
    const api=core();if(!api?.addMemo)throw new Error('Coreメモ基盤を読み込めませんでした');
    const planId=activePlanId();
    api.addMemo({memoId:uid('memo'),kind:type==='buy'?'buy':type==='plan'?'plan-candidate':'improvement',text:text.trim(),source:'phase14-review',planIds:planId?[planId]:[],activityIds:[],status:'active',completed:false,createdAt:now(),updatedAt:now()});
  }
  function typeLabel(type){return type==='buy'?'買う物':type==='plan'?'予定候補':'改善';}
  function icon(type){return type==='buy'?'🛒':type==='plan'?'📅':'💡';}
  function candidateMarkup(c){return `<article class="phase14Candidate"><div class="phase14CandidateMain"><span>${icon(c.type)}</span><div><b>${typeLabel(c.type)}</b><p>${esc(c.text)}</p><small>${esc(c.source||'レビュー')}</small></div></div><div class="phase14CandidateActions"><button type="button" data-phase14-adopt="${esc(c.id)}">${typeLabel(c.type)}へ追加</button><button type="button" class="ghost" data-phase14-hold="${esc(c.id)}">保留</button></div></article>`;}
  function reviewSummary(){const rs=reviews();if(!rs.length)return'';const r=rs[0];return `<div class="phase14Summary"><div><small>LAST REVIEW</small><b>今回の評価 ${'★'.repeat(Number(r.rating||0))}${'☆'.repeat(5-Number(r.rating||0))}</b></div><button type="button" data-phase14-open>レビューを編集</button></div>`;}
  function inject(){
    const page=document.getElementById('page-memory');if(!page||page.querySelector('.phase14Panel'))return;
    const open=candidates().filter(c=>c.status==='open');
    const panel=document.createElement('section');panel.className='phase14Panel';
    panel.innerHTML=`<header><div><small>PHASE14 REVIEW → NEXT</small><h2>今回を振り返る</h2><p>振り返りから、次回に必要な候補だけを整理します。</p></div><button type="button" data-phase14-open>レビューする</button></header>${reviewSummary()}<div class="phase14CandidateList">${open.length?open.map(candidateMarkup).join(''):'<div class="phase14Empty"><b>整理待ちの候補はありません</b><p>レビューを保存すると、買う物・改善・予定候補がここに並びます。</p></div>'}</div><p class="phase14Safety">候補は自動保存されません。追加した項目だけが準備メモへ入ります。</p>`;
    const anchor=page.querySelector('.memoryHero,.memorySummary,.sectionHead')||page.firstElementChild;anchor?anchor.after(panel):page.prepend(panel);
  }
  function refresh(){document.querySelector('.phase14Panel')?.remove();inject();}
  function openReview(){
    document.querySelector('.phase14ReviewBackdrop')?.remove();const last=reviews()[0]||{};
    const b=document.createElement('div');b.className='phase14ReviewBackdrop';
    b.innerHTML=`<section class="phase14ReviewSheet"><header><div><small>CAMP REVIEW</small><h2>今回どうだった？</h2></div><button type="button" data-phase14-close>×</button></header><div class="phase14Rating" data-phase14-rating="${Number(last.rating||0)}">${[1,2,3,4,5].map(n=>`<button type="button" data-phase14-star="${n}" class="${n<=Number(last.rating||0)?'active':''}">★</button>`).join('')}</div><label>良かったこと<textarea data-phase14-good>${esc(last.good||'')}</textarea></label><label>困ったこと<textarea data-phase14-trouble>${esc(last.trouble||'')}</textarea></label><label>忘れ物・不足<textarea data-phase14-forgot>${esc(last.forgot||'')}</textarea></label><label>次回改善したいこと<textarea data-phase14-improve>${esc(last.improve||'')}</textarea></label><div class="phase14Revisit"><span>また行きたい？</span><button type="button" data-phase14-revisit="yes" class="${last.revisit==='yes'?'active':''}">行きたい</button><button type="button" data-phase14-revisit="no" class="${last.revisit==='no'?'active':''}">今回はいい</button></div><label>場所・予定候補<input data-phase14-place value="${esc(last.place||'')}" placeholder="例：また赤城山へ行きたい"></label><details><summary>今回の保存済み記録を見る</summary><pre>${esc(latestRecordText()||'保存済み記録はありません')}</pre></details><button type="button" class="phase14Save" data-phase14-save>レビューを保存して候補を作る</button></section>`;
    document.body.appendChild(b);
  }
  function closeReview(){document.querySelector('.phase14ReviewBackdrop')?.remove();}
  document.addEventListener('click',e=>{
    if(e.target.closest?.('[data-phase14-open]')){openReview();return;}
    if(e.target===document.querySelector('.phase14ReviewBackdrop')||e.target.closest?.('[data-phase14-close]')){closeReview();return;}
    const star=e.target.closest?.('[data-phase14-star]');if(star){const box=star.closest('.phase14Rating'),n=Number(star.dataset.phase14Star);box.dataset.phase14Rating=String(n);box.querySelectorAll('button').forEach(x=>x.classList.toggle('active',Number(x.dataset.phase14Star)<=n));return;}
    const rev=e.target.closest?.('[data-phase14-revisit]');if(rev){const wrap=rev.closest('.phase14Revisit');wrap.dataset.value=rev.dataset.phase14Revisit;wrap.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===rev));return;}
    if(e.target.closest?.('[data-phase14-save]')){const s=document.querySelector('.phase14ReviewSheet');const review={id:uid('review'),rating:Number(s.querySelector('.phase14Rating').dataset.phase14Rating||0),good:s.querySelector('[data-phase14-good]').value.trim(),trouble:s.querySelector('[data-phase14-trouble]').value.trim(),forgot:s.querySelector('[data-phase14-forgot]').value.trim(),improve:s.querySelector('[data-phase14-improve]').value.trim(),revisit:s.querySelector('.phase14Revisit').dataset.value||'',place:s.querySelector('[data-phase14-place]').value.trim(),createdAt:now()};write(REVIEW_KEY,[review,...reviews()].slice(0,30));const existing=candidates().filter(c=>c.status==='open');saveCandidates([...generateCandidates(review),...existing]);closeReview();refresh();return;}
    const adopt=e.target.closest?.('[data-phase14-adopt]');if(adopt){const all=candidates(),c=all.find(x=>x.id===adopt.dataset.phase14Adopt);if(!c)return;try{addMemo(c.type,c.text);c.status='adopted';c.updatedAt=now();saveCandidates(all);refresh();globalThis.dispatchEvent(new CustomEvent('outbase:entry-refresh'));alert(`${typeLabel(c.type)}へ追加しました。`);}catch(err){alert(err.message||String(err));}return;}
    const hold=e.target.closest?.('[data-phase14-hold]');if(hold){const all=candidates(),c=all.find(x=>x.id===hold.dataset.phase14Hold);if(c){c.status='held';c.updatedAt=now();saveCandidates(all);refresh();}return;}
  },true);
  const observer=new MutationObserver(inject);observer.observe(document.documentElement,{subtree:true,childList:true});
  globalThis.addEventListener('outbase:entry-refresh',refresh);globalThis.OUTBASE_REVIEW_UI={refresh,open:openReview};inject();
})();
