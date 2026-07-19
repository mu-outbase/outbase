(() => {
  'use strict';

  if(globalThis.OUTBASE_PLAN_SWITCH_V18)return;

  const contextApi=()=>globalThis.OUTBASE_ACTIVITY_CONTEXT_V18||globalThis.OUTBASE_ACTIVITY_CONTEXT;
  const router=globalThis.OUTBASE_ROUTER;
  const modals=globalThis.OUTBASE_MODAL_STACK_V164;
  const modalId='outbasePlanSwitchV18';
  const state={rows:[],opening:false,loaded:false};

  const esc=value=>String(value??'')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  const typeLabels=Object.freeze({camp:'キャンプ',walk:'散歩',drive:'ドライブ',shopping:'ショッピング',event:'イベント',other:'活動'});
  const stateOrder=Object.freeze({active:0,paused:1,preparing:2,planned:3,candidate:4,organizing:5,completed:6,archived:7});

  function shortDate(value){
    const date=new Date(value||'');
    if(Number.isNaN(date.getTime()))return '日付未設定';
    return `${date.getMonth()+1}/${date.getDate()}（${'日月火水木金土'[date.getDay()]}）`;
  }
  function typeLabel(item){return item?.typeLabel||typeLabels[item?.type]||item?.type||'活動';}
  function currentContext(){return contextApi()?.current?.()||{};}

  function updateChip(context=currentContext()){
    const title=context.activityTitle||'予定を選ぶ';
    const type=context.activityTypeLabel||contextApi()?.typeLabel?.(context.activityType)||'主役プラン';
    const meta=[type,context.startAt?shortDate(context.startAt):''].filter(Boolean).join('・')||'現在の予定';
    const switchable=!state.loaded||state.rows.length>1;
    document.querySelectorAll('[data-ob18-plan-switch]').forEach(button=>{
      const titleNode=button.querySelector('[data-ob18-plan-title]');
      const metaNode=button.querySelector('[data-ob18-plan-meta]');
      const affordance=button.querySelector('i');
      if(titleNode&&titleNode.textContent!==title)titleNode.textContent=title;
      if(metaNode&&metaNode.textContent!==meta)metaNode.textContent=meta;
      if(affordance)affordance.textContent=switchable?'切替':'';
      button.classList.toggle('is-empty',!context.activityId);
      button.classList.toggle('is-single',Boolean(context.activityId)&&state.loaded&&!switchable);
      button.disabled=Boolean(context.activityId)&&state.loaded&&!switchable;
      const label=!context.activityId?'主役プランを選ぶ':switchable?`${title}から別の予定へ切り替える`:`現在の主役プランは${title}`;
      if(button.getAttribute('aria-label')!==label)button.setAttribute('aria-label',label);
    });
  }

  function host(){
    let node=document.getElementById(modalId);
    if(node)return node;
    node=document.createElement('div');
    node.id=modalId;
    node.className='ob18-plan-switch-backdrop';
    node.hidden=true;
    document.body.appendChild(node);
    return node;
  }

  function hide(){
    const node=host();
    node.hidden=true;
    node.innerHTML='';
    document.body.classList.remove('ob18-plan-switch-open');
  }

  function close({historyBack=true}={}){
    hide();
    if(modals?.top?.()?.id===modalId)modals.close({historyBack});
  }

  function rowMarkup(item,currentId){
    const current=String(item.id)===String(currentId||'');
    const date=[shortDate(item.startAt||item.calendar?.[0]?.startAt),item.endAt&&String(item.endAt).slice(0,10)!==String(item.startAt||'').slice(0,10)?shortDate(item.endAt):''].filter(Boolean).join('〜');
    return `<button type="button" class="ob18-plan-row ${current?'current':''}" data-ob18-plan-id="${esc(item.id)}">
      <span class="ob18-plan-dot type-${esc(item.type||'other')}"></span>
      <span class="ob18-plan-row-copy"><b>${esc(item.title||'名称未設定')}</b><small>${esc(typeLabel(item))}・${esc(date)}</small></span>
      <em>${current?'選択中':'切替'}</em>
    </button>`;
  }

  function render(rows){
    const node=host();
    const current=currentContext();
    node.innerHTML=`<section class="ob18-plan-switch-sheet" role="dialog" aria-modal="true" aria-label="主役プラン切替">
      <div class="ob18-plan-switch-grab"></div>
      <header><div><small>CURRENT PLAN</small><h2>主役プランを切り替える</h2><p>準備・予定詳細・記録の対象を同じ予定に揃えます。</p></div><button type="button" data-ob18-plan-close aria-label="閉じる">×</button></header>
      <div class="ob18-plan-switch-list">${rows.length?rows.map(item=>rowMarkup(item,current.activityId)).join(''):'<div class="ob18-plan-empty"><b>切り替えられる予定がありません</b><span>カレンダーから予定を追加してください。</span></div>'}</div>
    </section>`;
    node.hidden=false;
    document.body.classList.add('ob18-plan-switch-open');
  }

  async function loadRows(){
    const domain=globalThis.OUTBASE_PLAN_DOMAIN_V162;
    if(!domain?.list)return [];
    const currentId=String(currentContext().activityId||'');
    const rows=await domain.list({includeDeleted:false,limit:200});
    return [...rows]
      .filter(item=>String(item?.id||'')===currentId||!['completed','archived'].includes(String(item?.state||'')))
      .sort((a,b)=>{
        const stateDiff=(stateOrder[a.state]??99)-(stateOrder[b.state]??99);
        if(stateDiff)return stateDiff;
        const aTime=new Date(a.startAt||a.calendar?.[0]?.startAt||8640000000000000).getTime();
        const bTime=new Date(b.startAt||b.calendar?.[0]?.startAt||8640000000000000).getTime();
        return aTime-bTime;
      });
  }

  async function refreshAvailability(){
    try{state.rows=await loadRows();state.loaded=true;}
    catch(_error){state.rows=[];state.loaded=true;}
    updateChip();
    return state.rows;
  }

  async function open(){
    if(state.opening)return;
    state.opening=true;
    const node=host();
    node.hidden=false;
    node.innerHTML='<section class="ob18-plan-switch-sheet loading"><div class="ob18-plan-switch-grab"></div><p>予定を読み込んでいます。</p></section>';
    document.body.classList.add('ob18-plan-switch-open');
    try{
      state.rows=await loadRows();
      state.loaded=true;
      render(state.rows);
      updateChip();
      if(modals?.top?.()?.id!==modalId)modals?.open?.(modalId);
    }catch(_error){
      state.rows=[];
      state.loaded=true;
      render([]);
      updateChip();
    }finally{state.opening=false;}
  }

  async function choose(id){
    const item=state.rows.find(row=>String(row.id)===String(id));
    if(!item)return;
    const api=contextApi();
    const activation=api?.activate?.(item,{source:'plan-switch-v18'})||null;
    if(activation?.persisted)void activation.persisted;
    globalThis.OUTBASE_SHELL_MODEL_V166?.invalidate?.();
    globalThis.OUTBASE_SHELL_MODEL_V165?.invalidate?.();
    globalThis.OUTBASE_PREPARATION_ROUTE_V17?.invalidate?.(item.id);
    const context=activation?.context||api?.fromActivity?.(item)||{activityId:item.id,planId:item.legacyPlanId||null};
    updateChip(context);
    const route=router?.current?.()||{};
    if(route.name==='activity'||route.name==='preparation'){
      const values=api?.params?.(context)||{activityId:item.id,planId:item.legacyPlanId||null};
      if(modals?.top?.()?.id===modalId){
        addEventListener('popstate',()=>router.navigate(route.name,values,{replace:true,transition:false,skipTransition:true}),{once:true});
        close({historyBack:true});
      }else{
        close({historyBack:false});
        router.navigate(route.name,values,{replace:true,transition:false,skipTransition:true});
      }
    }else close({historyBack:true});
  }

  document.addEventListener('click',event=>{
    const trigger=event.target.closest?.('[data-ob18-plan-switch]');
    if(trigger){event.preventDefault();if(trigger.disabled||trigger.classList.contains('is-single'))return;open();return;}
    const closeButton=event.target.closest?.('[data-ob18-plan-close]');
    if(closeButton){close({historyBack:true});return;}
    const row=event.target.closest?.('[data-ob18-plan-id]');
    if(row){row.disabled=true;choose(row.dataset.ob18PlanId).catch(()=>{row.disabled=false;});return;}
    const node=document.getElementById(modalId);
    if(node&&!node.hidden&&event.target===node)close({historyBack:true});
  });

  modals?.subscribe?.((stack,reason)=>{
    if(reason==='back'&&!stack.some(item=>item.id===modalId))hide();
  });
  addEventListener('outbase:context-changed',event=>updateChip(event.detail?.context||currentContext()));
  addEventListener('outbase:navigation',()=>requestAnimationFrame(()=>updateChip()));
  addEventListener('outbase:app-ready',()=>requestAnimationFrame(()=>updateChip()));

  const observer=new MutationObserver(()=>updateChip());
  const start=()=>{
    const app=document.getElementById('app');
    if(app)observer.observe(app,{childList:true,subtree:true});
    updateChip();
    if(typeof requestIdleCallback==='function')requestIdleCallback(()=>refreshAvailability(),{timeout:1200});
    else setTimeout(()=>refreshAvailability(),300);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  globalThis.OUTBASE_PLAN_SWITCH_V18=Object.freeze({open,close,choose,loadRows,refreshAvailability,updateChip});
})();
