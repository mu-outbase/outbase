(() => {
  'use strict';
  const api=()=>globalThis.OUTBASE_MEAL_CONSULTATION;
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const states=new WeakMap();
  function markup(value){
    const p=value.routePayload||{};
    if(p.status!=='ready')return `<section class="ob22-page"><h1>料理相談・献立</h1><p>${p.status==='loading'?'献立を読み込んでいます。':'キャンプの予定を選び直してください。'}</p><button type="button" data-ob22-back>戻る</button></section>`;
    return `<section class="ob22-page ob-meals" data-meal-consultation="${esc(p.activity.id)}" data-meal-calendar-id="${esc(p.nativeEventId||'')}">
      <div class="ob22-route-head"><button type="button" data-meal-back>‹ キャンプへ戻る</button><span>料理相談・献立</span></div>
      <section class="ob22-card"><h1>何を作ろう？</h1><h2>${esc(p.activity.title)}</h2><p>人数・手持ち食材・使える器具から、登録レシピの候補を絞ります。候補は確認してから準備へ追加します。</p></section>
      <form class="ob22-card ob22-form" data-meal-conditions-form>
        <label>人数<input type="number" name="people" min="1" max="20" step="1" required value="2"></label><label>調理時間の上限（分）<input type="number" name="minutes" min="5" max="180" required value="30"></label>
        <label>日付<input type="date" name="date" required value="${esc(p.startDate)}" ${p.startDate?`min="${esc(p.startDate)}"`:''} ${p.endDate?`max="${esc(p.endDate)}"`:''}></label><label>いつ食べる？<select name="slot">${Object.entries(api().SLOTS).map(([k,v])=>`<option value="${k}" ${k==='dinner'?'selected':''}>${v}</option>`).join('')}</select></label>
        <label class="wide">手持ちの食材<textarea name="stock" rows="3" maxlength="2000" placeholder="トマト、チーズ、ツナ缶など。候補の優先に使います"></textarea></label>
        <label class="wide">使わない食材<textarea name="exclude" rows="2" maxlength="1000" placeholder="食材名を読点や改行で区切って指定"></textarea></label>
        <label class="ob22-check wide"><input type="checkbox" name="noFire"><span>火を使わない料理にする</span></label>
        <fieldset class="wide"><legend>今回使える器具</legend><p>登録ギアの名前から選択しています。今回持っていく物に直してください。</p>${Object.entries(api().TOOLS).map(([k,v])=>`<label class="ob22-check"><input type="checkbox" name="tools" value="${k}" ${p.tools.includes(k)?'checked':''}><span>${esc(v)}</span></label>`).join('')}</fieldset>
        <div class="ob22-form-actions wide"><button type="submit" class="primary">条件から候補を出す</button></div><p class="wide" role="status" data-meal-conditions-status></p>
      </form>
      <section class="ob22-card" data-meal-candidates hidden><h2>献立の候補</h2><div data-meal-candidate-list></div></section>
      <form class="ob22-card ob22-form" data-meal-approval-form hidden><h2 class="wide" data-meal-selected-title></h2><p class="wide" data-meal-selected-summary></p><div class="wide" data-meal-ingredients></div><div class="wide" data-meal-method></div><p class="wide">「買う」を外した食材は持参リストへ入ります。数量は目安です。手持ちの量を確認して調整してください。器具も持ち物へ追加します。</p><div class="ob22-form-actions wide"><button type="submit" class="primary">この献立を準備に追加</button></div><p class="wide" data-meal-save-status role="status" aria-live="polite"></p></form>
      <section class="ob22-card"><h2>決めた献立</h2><div data-meal-saved></div><button type="button" data-meal-preparation>買い物・持ち物リストを見る</button></section>
    </section>`;
  }
  function renderSaved(root,state){
    root.querySelector('[data-meal-saved]').innerHTML=state.payload.meals.length?state.payload.meals.map(m=>`<details data-meal-saved-id="${esc(m.id)}"><summary>${esc(m.date)} ${esc(api().SLOTS[m.slot]||m.slot)} · ${esc(m.name)}（${Number(m.people)}人分）</summary><ul>${(m.payload?.ingredients||[]).map(i=>`<li>${esc(i.name)} ${Number(i.quantity)}${esc(i.unit)} · ${i.buy?'買う':'持参'}</li>`).join('')}</ul><ol>${(m.payload?.steps||[]).map(step=>`<li>${esc(step)}</li>`).join('')}</ol></details>`).join(''):'<p>献立はまだ決めていません。条件から候補を出してみましょう。</p>';
  }
  async function refresh(container){
    const root=container.matches?.('[data-meal-consultation]')?container:container.querySelector('[data-meal-consultation]');const state=root&&states.get(root);if(!state)return;
    const generation=++state.generation;const payload=await api().load({activityId:state.id,nativeEventId:state.nativeEventId});if(!root.isConnected||generation!==state.generation)return;state.payload=payload;state.id=payload.activity.id;root.dataset.mealConsultation=state.id;renderSaved(root,state);return payload;
  }
  function bind(main,value){
    const root=main.querySelector('[data-meal-consultation]');if(!root||states.has(root))return;
    const state={id:root.dataset.mealConsultation,nativeEventId:root.dataset.mealCalendarId||null,payload:value.routePayload,generation:0,busy:false,selection:null,requestId:null};states.set(root,state);
    const form=root.querySelector('[data-meal-conditions-form]'),approval=root.querySelector('[data-meal-approval-form]'),candidates=root.querySelector('[data-meal-candidates]');
    const live=()=>{const r=globalThis.OUTBASE_ROUTER.current();return root.isConnected&&r.name==='assets'&&r.query.mode==='meal'&&(state.nativeEventId?r.query.calendarEventId===state.nativeEventId:r.activityId===state.id);};
    root.querySelector('[data-meal-back]').onclick=()=>globalThis.OUTBASE_ROUTER.navigate(state.nativeEventId?'calendar':'preparation-detail',state.nativeEventId?{month:state.payload.nativeMonth||''}:{activityId:state.id},{transition:false,skipTransition:true});
    root.querySelector('[data-meal-preparation]').onclick=()=>{if(!globalThis.OUTBASE_IDS.isUlid(state.id)){root.querySelector('[data-meal-conditions-status]').textContent='献立を確認して準備に追加すると、リストを開けます。';return;}globalThis.OUTBASE_ROUTER.navigate('preparation-detail',{activityId:state.id},{transition:false,skipTransition:true});};
    const invalidate=()=>{if(state.busy)return;state.selection=null;approval.hidden=true;candidates.hidden=true;root.querySelector('[data-meal-conditions-status]').textContent='条件を変更しました。候補を出し直してください。';};form.oninput=invalidate;form.onchange=invalidate;
    form.onsubmit=e=>{e.preventDefault();if(state.busy)return;const fd=new FormData(form);try{
      const conditions={people:Number(fd.get('people')),minutes:Number(fd.get('minutes')),noFire:fd.get('noFire')==='on',stock:fd.get('stock'),exclude:fd.get('exclude'),tools:fd.getAll('tools')};const rows=api().suggest(conditions);state.selection=null;approval.hidden=true;candidates.hidden=false;
      root.querySelector('[data-meal-conditions-status]').textContent=rows.length?`${rows.length}件の候補があります。手持ち食材の量は、選んだ後に確認してください。`:'対応する料理がありません。器具・調理時間・食材の条件を見直してください。';
      root.querySelector('[data-meal-candidate-list]').innerHTML=rows.map(r=>`<article><h3>${esc(r.name)}</h3><p>${r.minutes}分 · ${r.fire?'火を使う':'火を使わない'} · 手持ち食材と一致 ${r.stockMatches}品</p><p>器具：${r.tools.map(k=>esc(api().TOOLS[k])).join('・')}</p><button type="button" data-meal-choose="${esc(r.id)}">この料理を確認</button></article>`).join('');
      root.querySelectorAll('[data-meal-choose]').forEach(button=>button.onclick=()=>{const recipe=rows.find(r=>r.id===button.dataset.mealChoose);state.selection={recipe,conditions,date:fd.get('date'),slot:fd.get('slot')};state.requestId=globalThis.OUTBASE_IDS.ulid();approval.hidden=false;
        root.querySelector('[data-meal-selected-title]').textContent=recipe.name;root.querySelector('[data-meal-selected-summary]').textContent=`${fd.get('date')} ${api().SLOTS[fd.get('slot')]} · ${conditions.people}人分`;
        root.querySelector('[data-meal-ingredients]').innerHTML=recipe.ingredients.map((i,index)=>`<div class="ob-meal-ingredient" data-meal-ingredient="${index}"><b>${esc(i.name)}</b><label>数量（${esc(i.unit)}）<input type="number" name="quantity-${index}" min="0.1" max="100000" step="0.1" required value="${i.quantity}"></label><label class="ob22-check"><input type="checkbox" name="buy-${index}" checked><span>買う${i.stockMatch?'（手持ちあり・量を確認）':''}</span></label></div>`).join('');root.querySelector('[data-meal-method]').innerHTML=`<h3>作り方</h3><ol>${recipe.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>`;root.querySelector('[data-meal-save-status]').textContent='まだ保存していません。食材・数量を確認してください。';approval.scrollIntoView({block:'start'});globalThis.scrollBy?.(0,-90);
      });
    }catch{root.querySelector('[data-meal-conditions-status]').textContent='人数・時間・食材の入力を確認してください。';}};
    approval.onsubmit=async e=>{e.preventDefault();if(state.busy||!state.selection)return;const selected=state.selection,fd=new FormData(approval),status=root.querySelector('[data-meal-save-status]');state.busy=true;approval.querySelectorAll('input,button').forEach(n=>n.disabled=true);form.querySelectorAll('input,textarea,select,button').forEach(n=>n.disabled=true);root.querySelectorAll('[data-meal-choose]').forEach(n=>n.disabled=true);let committed=false;
      try{const saved=await api().approve({activityId:state.id,displayActivityId:state.id,nativeEventId:state.nativeEventId,requestId:state.requestId,recipeId:selected.recipe.id,date:selected.date,slot:selected.slot,conditions:selected.conditions,ingredients:selected.recipe.ingredients.map((i,index)=>({name:i.name,unit:i.unit,quantity:Number(fd.get('quantity-'+index)),buy:fd.get('buy-'+index)==='on'})),guard:live});committed=true;state.id=saved.activity_id;root.dataset.mealConsultation=state.id;state.selection=null;approval.hidden=true;candidates.hidden=true;root.querySelector('[data-meal-conditions-status]').textContent='献立と買い物・持ち物を保存しました。別の日や食事も続けて追加できます。';
        globalThis.OUTBASE_ROUTE_UNIFICATION_V22?.clearPayloadCache?.();globalThis.OUTBASE_PREPARATION_ROUTE_V17?.invalidate?.(state.id);globalThis.OUTBASE_ACTIVITY_ROUTE_V16?.invalidate?.(state.id);globalThis.OUTBASE_SHELL_MODEL_V166?.invalidate?.('vault');await refresh(root);
      }catch(error){const message=committed?'保存済みですが一覧を更新できませんでした。開き直すと確認できます。':error.message==='meal_date_outside'?'日程が変わった可能性があります。キャンプ期間内の日付を確認してください。':'保存できませんでした。選んだ料理と数量は残っています。もう一度お試しください。';(committed?root.querySelector('[data-meal-conditions-status]'):status).textContent=message;}finally{state.busy=false;if(root.isConnected){approval.querySelectorAll('input,button').forEach(n=>n.disabled=false);form.querySelectorAll('input,textarea,select,button').forEach(n=>n.disabled=false);root.querySelectorAll('[data-meal-choose]').forEach(n=>n.disabled=false);}}
    };renderSaved(root,state);
  }
  globalThis.OUTBASE_MEAL_CONSULTATION_UI=Object.freeze({markup,bind,refresh});
})();
