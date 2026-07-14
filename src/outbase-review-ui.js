(() => {
  'use strict';
  const REVIEW_KEY='outbase_phase13_reviews_v1';
  const RECORD_KEY='outbase_record_saved_records';
  const DISMISSED_KEY='outbase_phase13_dismissed_v1';
  const core=()=>globalThis.OUTBASE_CORE||null;
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f;}catch(_e){return f;}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const now=()=>new Date().toISOString();
  const uid=p=>`${p}_${globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2,9)}`}`;
  const activePlanId=()=>{const id=localStorage.getItem('outbase_active_plan_id')||'';return id&&id!=='none'?id:'';};

  function records(){return read(RECORD_KEY,[]).filter(r=>r&&r.text);}
  function dismissed(){return new Set(read(DISMISSED_KEY,[]));}
  function reviews(){return read(REVIEW_KEY,{});}
  function markDismissed(id){const set=dismissed();set.add(id);write(DISMISSED_KEY,[...set]);}
  function reviewFor(id){return reviews()[id]||{};}
  function saveReview(id,patch){const all=reviews();all[id]={...(all[id]||{}),...patch,updatedAt:now()};write(REVIEW_KEY,all);}
  function inferType(text=''){
    const t=String(text);
    if(/買|購入|不足|忘れ|持って|必要|充電|電池|ケーブル|食材|消耗/.test(t))return'buy';
    if(/次回|改善|失敗|困|迷|遅|面倒|確認|対策|直す|忘れない/.test(t))return'improvement';
    return'improvement';
  }
  function titleFor(type){return type==='buy'?'買う物候補':'改善候補';}
  function recentCandidates(){
    const ds=dismissed();
    return records().slice(0,20).filter(r=>!ds.has(r.id)).map(r=>({record:r,type:reviewFor(r.id).type||inferType(r.text),note:reviewFor(r.id).note||r.text}));
  }
  function addMemo(type,text,record){
    const api=core();
    if(!api?.addMemo)throw new Error('Coreメモ基盤を読み込めませんでした');
    const planId=activePlanId();
    api.addMemo({memoId:uid('memo'),kind:type==='buy'?'buy':'improvement',text:text.trim(),source:'phase13-review',planIds:planId?[planId]:[],activityIds:record?.sessionId?[record.sessionId]:[],status:'active',completed:false,createdAt:now(),updatedAt:now(),originRecordId:record?.id||''});
  }
  function candidateMarkup(item){
    const r=item.record;
    return `<article class="phase13Candidate" data-phase13-record="${esc(r.id)}"><div class="phase13CandidateTop"><span>${item.type==='buy'?'🛒':'💡'} ${titleFor(item.type)}</span><small>${r.createdAt?new Date(r.createdAt).toLocaleString('ja-JP'):''}</small></div><p>${esc(item.note)}</p><div class="phase13CandidateActions"><button type="button" data-phase13-adopt="${esc(r.id)}" data-phase13-type="${item.type}">${item.type==='buy'?'買う物へ追加':'改善へ追加'}</button><button type="button" class="secondary" data-phase13-switch="${esc(r.id)}" data-phase13-type="${item.type==='buy'?'improvement':'buy'}">${item.type==='buy'?'改善候補に変更':'買う物候補に変更'}</button><button type="button" class="ghost" data-phase13-dismiss="${esc(r.id)}">今回は使わない</button></div></article>`;
  }
  function inject(){
    const page=document.getElementById('page-memory');
    if(!page||page.querySelector('.phase13ReviewPanel'))return;
    const items=recentCandidates();
    const panel=document.createElement('section');
    panel.className='phase13ReviewPanel';
    panel.innerHTML=`<header><div><small>PHASE13 RECORD → REVIEW</small><h2>記録を次回へつなぐ</h2><p>保存済み記録から、買う物・改善候補を確認して採用します。</p></div><span>${items.length}件</span></header><div class="phase13ReviewList">${items.length?items.map(candidateMarkup).join(''):'<div class="phase13Empty"><b>整理待ちの記録はありません</b><p>新しい記録を残すと、ここに候補が表示されます。</p></div>'}</div><p class="phase13Safety">候補は自動採用されません。追加した内容だけが準備メモへ保存されます。</p>`;
    const anchor=page.querySelector('.memoryHero,.memorySummary,.sectionHead')||page.firstElementChild;
    anchor?anchor.after(panel):page.prepend(panel);
  }
  function refresh(){document.querySelector('.phase13ReviewPanel')?.remove();inject();}
  function findRecord(id){return records().find(r=>String(r.id)===String(id));}
  document.addEventListener('click',e=>{
    const adopt=e.target.closest?.('[data-phase13-adopt]');
    if(adopt){
      const r=findRecord(adopt.dataset.phase13Adopt);if(!r)return;
      try{addMemo(adopt.dataset.phase13Type,r.text,r);markDismissed(r.id);refresh();globalThis.dispatchEvent(new CustomEvent('outbase:entry-refresh'));alert(`${titleFor(adopt.dataset.phase13Type)}として準備メモへ追加しました。`);}catch(err){alert(err.message||String(err));}
      return;
    }
    const sw=e.target.closest?.('[data-phase13-switch]');
    if(sw){saveReview(sw.dataset.phase13Switch,{type:sw.dataset.phase13Type});refresh();return;}
    const dis=e.target.closest?.('[data-phase13-dismiss]');
    if(dis){markDismissed(dis.dataset.phase13Dismiss);refresh();return;}
  },true);
  const observer=new MutationObserver(inject);observer.observe(document.documentElement,{subtree:true,childList:true});
  globalThis.addEventListener('outbase:entry-refresh',refresh);
  globalThis.OUTBASE_REVIEW_UI={refresh};
  inject();
})();
