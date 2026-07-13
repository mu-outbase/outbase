(() => {
  'use strict';

  const ROOT_ID='outbaseFlowRoot';
  const STORAGE_PREFIX='outbase_flow_v1_';
  const ACTIVE_PLAN_KEYS=['outbase_active_plan_id','outbase_active_plan_id_v1'];

  const defaultState=()=>({
    prep:[
      {key:'買い物',note:'料理から必要なものを確認します',status:'未完了'},
      {key:'料理',note:'日程・人数・量を見ながら決めます',status:'仮決定'},
      {key:'ギア',note:'持つもの、使った結果、乾燥まで残します',status:'確認中'},
      {key:'コタ',note:'フード・水・暑さ寒さ対策を確認します',status:'未確認'},
      {key:'天気',note:'雨・風・気温を当日運転席に反映します',status:'要確認'},
      {key:'ルート',note:'出発・経由地・買い出し・帰路を確認します',status:'要確認'}
    ],
    shopping:[],
    meals:[
      {slot:'1日目 昼',menu:'',caution:''},
      {slot:'1日目 夜',menu:'',caution:''},
      {slot:'2日目 朝',menu:'',caution:''},
      {slot:'2日目 昼',menu:'',caution:''}
    ],
    daySteps:[
      {title:'出発前',note:'忘れ物・コタ用品・天気を確認',state:'次'},
      {title:'往路',note:'運転中は操作しない。停車中に記録。',state:'待ち'},
      {title:'買い出し / 給油',note:'買い物リストとルートに紐づけ',state:'待ち'},
      {title:'到着 / 受付',note:'チェックイン・サイト番号を残す',state:'待ち'},
      {title:'サイト確認',note:'地面・風・トイレ距離・コタ向きを記録',state:'待ち'},
      {title:'設営',note:'手順・写真・声メモを残す',state:'待ち'},
      {title:'料理',note:'味・量・余り・失敗を当日中に残す',state:'待ち'},
      {title:'コタ散歩',note:'タイミングと様子を残す',state:'待ち'},
      {title:'キャンプ場散歩',note:'場内地図・場所カードへ',state:'待ち'},
      {title:'撤収',note:'濡れ物・乾燥・忘れ物を確認',state:'待ち'},
      {title:'帰路',note:'寄り道・帰宅時間・片付けへ',state:'待ち'}
    ],
    inbox:[],
    improvements:[],
    updatedAt:Date.now()
  });

  let screen='prep';
  let state=loadState();

  function activePlanId(){
    for(const key of ACTIVE_PLAN_KEYS){
      const value=localStorage.getItem(key);
      if(value)return value;
    }
    return 'no-plan';
  }

  function storageKey(){return `${STORAGE_PREFIX}${activePlanId()}`;}

  function loadState(){
    try{
      const raw=localStorage.getItem(storageKey());
      if(!raw)return defaultState();
      const parsed=JSON.parse(raw);
      return {...defaultState(),...parsed};
    }catch(_error){
      return defaultState();
    }
  }

  function saveState(){
    state.updatedAt=Date.now();
    localStorage.setItem(storageKey(),JSON.stringify(state));
  }

  function esc(value){
    return String(value??'')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#039;');
  }

  function planLabel(){
    try{
      const plans=JSON.parse(localStorage.getItem('outbase_plans_v1')||'[]');
      const id=activePlanId();
      const plan=Array.isArray(plans)?plans.find(x=>x?.id===id):null;
      return plan?.title||plan?.name||'主役プラン未選択';
    }catch(_error){return '主役プラン未選択';}
  }

  function openFlow(target='prep'){
    screen=target;
    state=loadState();
    render();
  }

  function closeFlow(){
    document.getElementById(ROOT_ID)?.remove();
  }

  function nav(){
    const items=[
      ['prep','準備'],['shopping','買い物'],['meals','料理'],
      ['cockpit','当日'],['inbox','未確認'],['improvements','改善']
    ];
    return `<nav class="flowNav">${items.map(([id,label])=>`<button data-flow-screen="${id}" class="${screen===id?'active':''}">${label}</button>`).join('')}</nav>`;
  }

  function shell(content){
    return `<div class="flowBackdrop">
      <section class="flowApp" role="dialog" aria-modal="true" aria-label="OUTBASE一本線">
        <header class="flowHeader">
          <button class="flowBack" data-flow-close aria-label="閉じる">×</button>
          <div><small>OUTBASE FLOW</small><b>${esc(planLabel())}</b></div>
          <button class="flowSave" data-flow-save>保存</button>
        </header>
        ${nav()}
        <main class="flowMain">${content}</main>
      </section>
    </div>`;
  }

  function prepScreen(){
    return `<section class="flowHero"><small>PREPARATION</small><h1>準備</h1><p>予定から当日まで、必要なことを一本で確認します。</p></section>
      <div class="flowGrid">${state.prep.map((item,index)=>`
        <article class="flowCard">
          <div><small>${esc(item.status)}</small><h2>${esc(item.key)}</h2><p>${esc(item.note)}</p></div>
          <button data-flow-open="${mapPrep(item.key)}">開く</button>
          <button class="flowMini" data-flow-prep-status="${index}">状態変更</button>
        </article>`).join('')}</div>`;
  }

  function mapPrep(key){
    return ({買い物:'shopping',料理:'meals',ギア:'close',コタ:'cockpit',天気:'cockpit',ルート:'cockpit'})[key]||'prep';
  }

  function shoppingScreen(){
    return `<section class="flowHero"><small>SHOPPING</small><h1>買い物</h1><p>料理と準備から必要品をまとめます。</p></section>
      <form class="flowInlineForm" data-flow-add-shopping>
        <input name="name" placeholder="品名" required>
        <select name="group"><option>食材</option><option>調味料</option><option>日用品</option><option>今回は買わないもの</option></select>
        <input name="detail" placeholder="量・代替・メモ">
        <button>追加</button>
      </form>
      <div class="flowList">${state.shopping.length?state.shopping.map((item,index)=>`
        <article class="flowRow ${item.state==='購入済み'?'done':''}">
          <div><small>${esc(item.group)}</small><b>${esc(item.name)}</b><p>${esc(item.detail||'')}</p></div>
          <button data-flow-shopping-toggle="${index}">${esc(item.state||'未購入')}</button>
          <button class="danger" data-flow-shopping-delete="${index}">削除</button>
        </article>`).join(''):'<div class="flowEmpty">買い物はまだありません。</div>'}</div>
      <button class="flowWide" data-flow-copy-shopping>LINE用にコピー</button>`;
  }

  function mealsScreen(){
    return `<section class="flowHero"><small>MEALS</small><h1>料理</h1><p>食事枠ごとにメニューと注意点を保存します。</p></section>
      <div class="flowList">${state.meals.map((meal,index)=>`
        <article class="flowMeal">
          <label>${esc(meal.slot)}<input data-flow-meal-menu="${index}" value="${esc(meal.menu)}" placeholder="メニュー"></label>
          <label>注意・量<input data-flow-meal-caution="${index}" value="${esc(meal.caution)}" placeholder="量、時間、代替"></label>
        </article>`).join('')}</div>`;
  }

  function cockpitScreen(){
    return `<section class="flowHero"><small>DAY COCKPIT</small><h1>当日運転席</h1><p>出発前から帰宅まで、今やることを順番に進めます。</p></section>
      <div class="flowTimeline">${state.daySteps.map((step,index)=>`
        <article class="flowStep ${step.state==='完了'?'done':step.state==='進行中'?'active':''}">
          <i>${index+1}</i><div><small>${esc(step.state)}</small><b>${esc(step.title)}</b><p>${esc(step.note)}</p></div>
          <button data-flow-step="${index}">進める</button>
          ${(step.title.includes('散歩')||step.title==='設営'||step.title==='撤収')?`<button class="flowMini" data-flow-record="${esc(step.title)}">記録へ</button>`:''}
        </article>`).join('')}</div>`;
  }

  function inboxScreen(){
    return `<section class="flowHero"><small>INBOX</small><h1>未確認箱</h1><p>保存先を決めるまで、記録を消さずに保留します。</p></section>
      <form class="flowInlineForm" data-flow-add-inbox>
        <select name="type"><option>メモ</option><option>写真</option><option>声</option></select>
        <input name="text" placeholder="内容" required>
        <input name="target" placeholder="保存先候補">
        <button>追加</button>
      </form>
      <div class="flowList">${state.inbox.length?state.inbox.map((item,index)=>`
        <article class="flowRow ${item.status==='削除候補'?'warn':''}">
          <div><small>${esc(item.type)} / ${esc(item.target||'未確認箱')}</small><b>${esc(item.text)}</b><p>${esc(item.status||'未確認')}</p></div>
          ${item.status==='削除候補'
            ?`<button data-flow-inbox-restore="${index}">元に戻す</button>`
            :`<button data-flow-inbox-confirm="${index}">確定</button><button data-flow-inbox-move="${index}">移動</button><button class="danger" data-flow-inbox-delete="${index}">削除候補</button>`}
        </article>`).join(''):'<div class="flowEmpty">未確認の記録はありません。</div>'}</div>`;
  }

  function improvementsScreen(){
    return `<section class="flowHero"><small>NEXT IMPROVEMENT</small><h1>次回改善</h1><p>今回の気づきを次の準備へ戻します。</p></section>
      <form class="flowInlineForm" data-flow-add-improvement>
        <input name="text" placeholder="改善内容" required>
        <select name="target"><option>次の準備</option><option>買い物</option><option>料理</option><option>ギア</option><option>ルート</option><option>コタ</option></select>
        <button>追加</button>
      </form>
      <div class="flowList">${state.improvements.length?state.improvements.map((item,index)=>`
        <article class="flowRow ${item.done?'done':''}">
          <div><small>${esc(item.target)}</small><b>${esc(item.text)}</b></div>
          <button data-flow-improvement-toggle="${index}">${item.done?'未完了へ':'完了'}</button>
          <button class="danger" data-flow-improvement-delete="${index}">削除</button>
        </article>`).join(''):'<div class="flowEmpty">次回改善はまだありません。</div>'}</div>`;
  }

  function render(){
    let root=document.getElementById(ROOT_ID);
    if(!root){
      root=document.createElement('div');
      root.id=ROOT_ID;
      document.body.appendChild(root);
    }
    const content={
      prep:prepScreen,
      shopping:shoppingScreen,
      meals:mealsScreen,
      cockpit:cockpitScreen,
      inbox:inboxScreen,
      improvements:improvementsScreen
    }[screen]?.()||prepScreen();
    root.innerHTML=shell(content);
  }

  function toast(message){
    const old=document.getElementById('outbaseFlowToast');
    old?.remove();
    const el=document.createElement('div');
    el.id='outbaseFlowToast';
    el.className='flowToast';
    el.textContent=message;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),1800);
  }

  function copyShopping(){
    const text=state.shopping.map(item=>`${item.state==='購入済み'?'✅':'□'} ${item.name}${item.detail?`（${item.detail}）`:''}`).join('\n');
    navigator.clipboard?.writeText(text).then(()=>toast('買い物リストをコピーしました')).catch(()=>prompt('コピーしてください',text));
  }

  function openRecord(target){
    closeFlow();
    localStorage.setItem('outbase_record_target',target);
    location.hash='record';
    location.search='?tab=record';
  }

  document.addEventListener('click',event=>{
    const target=event.target.closest?.('[data-flow-launch]');
    if(target){openFlow(target.dataset.flowLaunch||'prep');return;}

    if(!event.target.closest?.(`#${ROOT_ID}`))return;
    const button=event.target.closest('button');
    if(!button)return;

    if(button.matches('[data-flow-close]')){closeFlow();return;}
    if(button.matches('[data-flow-save]')){saveState();toast('一本線を保存しました');return;}
    if(button.dataset.flowScreen){screen=button.dataset.flowScreen;render();return;}
    if(button.dataset.flowOpen){
      if(button.dataset.flowOpen==='close'){closeFlow();location.hash='prep';return;}
      screen=button.dataset.flowOpen;render();return;
    }

    if(button.dataset.flowPrepStatus!==undefined){
      const item=state.prep[Number(button.dataset.flowPrepStatus)];
      const states=['未確認','未完了','確認中','仮決定','要確認','確認済み','完了'];
      item.status=states[(states.indexOf(item.status)+1)%states.length];
      saveState();render();return;
    }

    if(button.dataset.flowShoppingToggle!==undefined){
      const item=state.shopping[Number(button.dataset.flowShoppingToggle)];
      item.state=item.state==='購入済み'?'未購入':'購入済み';
      saveState();render();return;
    }
    if(button.dataset.flowShoppingDelete!==undefined){
      state.shopping.splice(Number(button.dataset.flowShoppingDelete),1);
      saveState();render();return;
    }
    if(button.matches('[data-flow-copy-shopping]')){copyShopping();return;}

    if(button.dataset.flowStep!==undefined){
      const index=Number(button.dataset.flowStep);
      state.daySteps.forEach((step,i)=>{
        if(i<index)step.state='完了';
        else if(i===index)step.state=step.state==='進行中'?'完了':'進行中';
        else if(step.state!=='完了')step.state='待ち';
      });
      saveState();render();return;
    }
    if(button.dataset.flowRecord){openRecord(button.dataset.flowRecord);return;}

    if(button.dataset.flowInboxConfirm!==undefined){
      state.inbox[Number(button.dataset.flowInboxConfirm)].status='確定';
      saveState();render();return;
    }
    if(button.dataset.flowInboxMove!==undefined){
      const item=state.inbox[Number(button.dataset.flowInboxMove)];
      const targets=['未確認箱','設営','料理','コタ散歩','キャンプ場散歩','次回改善'];
      item.target=targets[(targets.indexOf(item.target)+1+targets.length)%targets.length];
      saveState();render();return;
    }
    if(button.dataset.flowInboxDelete!==undefined){
      state.inbox[Number(button.dataset.flowInboxDelete)].status='削除候補';
      saveState();render();return;
    }
    if(button.dataset.flowInboxRestore!==undefined){
      state.inbox[Number(button.dataset.flowInboxRestore)].status='未確認';
      saveState();render();return;
    }

    if(button.dataset.flowImprovementToggle!==undefined){
      const item=state.improvements[Number(button.dataset.flowImprovementToggle)];
      item.done=!item.done;saveState();render();return;
    }
    if(button.dataset.flowImprovementDelete!==undefined){
      state.improvements.splice(Number(button.dataset.flowImprovementDelete),1);
      saveState();render();
    }
  });

  document.addEventListener('submit',event=>{
    if(!event.target.closest?.(`#${ROOT_ID}`))return;
    event.preventDefault();
    const form=event.target;
    const data=Object.fromEntries(new FormData(form));

    if(form.matches('[data-flow-add-shopping]')){
      state.shopping.unshift({name:data.name,group:data.group,detail:data.detail,state:'未購入'});
    }else if(form.matches('[data-flow-add-inbox]')){
      state.inbox.unshift({type:data.type,text:data.text,target:data.target||'未確認箱',status:'未確認',time:new Date().toLocaleString('ja-JP')});
    }else if(form.matches('[data-flow-add-improvement]')){
      state.improvements.unshift({text:data.text,target:data.target,done:false});
    }
    saveState();render();
  });

  document.addEventListener('input',event=>{
    if(!event.target.closest?.(`#${ROOT_ID}`))return;
    const menu=event.target.dataset.flowMealMenu;
    const caution=event.target.dataset.flowMealCaution;
    if(menu!==undefined){state.meals[Number(menu)].menu=event.target.value;saveState();}
    if(caution!==undefined){state.meals[Number(caution)].caution=event.target.value;saveState();}
  });

  function installLauncher(){
    if(document.getElementById('outbaseFlowLauncher'))return;
    const button=document.createElement('button');
    button.id='outbaseFlowLauncher';
    button.className='outbaseFlowLauncher';
    button.dataset.flowLaunch='prep';
    button.innerHTML='<span>一本線</span><b>準備→当日→改善</b>';
    document.body.appendChild(button);
  }

  window.addEventListener('DOMContentLoaded',installLauncher);
  window.OUTBASE_FLOW={open:openFlow,close:closeFlow,reload:()=>{state=loadState();render();}};
})();
