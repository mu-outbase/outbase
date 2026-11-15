(() => {
  'use strict';
  const SOURCE='meal-consultation-v1',SLOT_SOURCE='meal-slot-v1';
  const KINDS=Object.freeze({unplanned:'未定',cook:'自炊',convenience:'コンビニ',pastry:'菓子パン',cupnoodle:'カップ麺',restaurant:'外食'});
  const LABELS=Object.freeze({breakfast:'朝',lunch:'昼',dinner:'夜'});
  const GOODS=new Set(['convenience','pastry','cupnoodle']);
  const DEFAULTS={convenience:['コンビニで買う食事','食'],pastry:['菓子パン','個'],cupnoodle:['カップ麺','食']};
  const repo=()=>globalThis.OUTBASE_REPOSITORIES_V160;
  const clean=v=>String(v??'').normalize('NFKC').trim();
  const key=(date,slot)=>date+'|'+slot;
  const dateKey=v=>{if(!v||!Number.isFinite(Date.parse(v)))return '';return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(v));};
  function context(meals=[]){
    const live=meals.filter(m=>m&&!m.deleted_at),plans=new Map();for(const m of live.filter(m=>m.source===SLOT_SOURCE).sort((a,b)=>String(a.updated_at).localeCompare(String(b.updated_at))))plans.set(key(m.date,m.slot),m);
    const recipes=live.filter(m=>m.source===SOURCE),activeRecipes=recipes.filter(m=>!plans.has(key(m.date,m.slot))||plans.get(key(m.date,m.slot)).payload?.kind==='cook');
    const all=new Map(live.map(m=>[m.id,m])),active=new Set(activeRecipes.map(m=>m.id));
    const relatedActive=row=>{const p=row.payload||{};if(p.manual)return true;const meal=all.get(p.meal_id);if(!meal)return !p.meal_id;if(meal.source===SOURCE)return active.has(meal.id);if(meal.source===SLOT_SOURCE){const plan=plans.get(key(meal.date,meal.slot));if(plan?.id!==meal.id)return false;if(p.slot_utility)return plan.payload?.kind===p.slot_utility;return GOODS.has(plan.payload?.kind)&&p.slot_signature===plan.payload?.shopping_signature;}return true;};
    return {plans,recipes,activeRecipes,relatedActive};
  }
  function preparationFor(meals,rows){
    const c=context(meals);return rows.filter(r=>{if(r.deleted_at)return false;if(r.source!==SOURCE)return true;if(r.status==='completed'||r.completed_at)return true;if(c.relatedActive(r))return true;const p=r.payload||{};
      if(r.category==='gear'&&p.asset_id)return c.activeRecipes.some(m=>(m.payload?.asset_ids||[]).includes(p.asset_id));
      if(r.category==='gear'&&p.tool)return c.activeRecipes.some(m=>(m.payload?.tools||[]).some(t=>globalThis.OUTBASE_MEAL_CONSULTATION.canonicalTool(t)===globalThis.OUTBASE_MEAL_CONSULTATION.canonicalTool(p.tool)));
      if(r.category==='gear'&&p.cooking_supply)return c.activeRecipes.some(m=>(m.payload?.supplies||[]).includes(r.title));return false;
    });
  }
  function schedule(startDate,endDate,meals=[]){
    const c=context(meals),days=[];if(dateKey(String(startDate)+'T12:00:00+09:00')!==startDate||dateKey(String(endDate)+'T12:00:00+09:00')!==endDate||!/^20\d{2}-\d{2}-\d{2}$/.test(startDate||'')||!/^20\d{2}-\d{2}-\d{2}$/.test(endDate||'')||endDate<startDate)return {days,limited:false};
    let cursor=new Date(startDate+'T00:00:00Z');for(let i=0;i<366&&cursor.toISOString().slice(0,10)<=endDate;i++,cursor=new Date(cursor.getTime()+86400000)){const date=cursor.toISOString().slice(0,10);days.push({date,dayNumber:i+1,slots:Object.entries(LABELS).map(([slot,label])=>{const plan=c.plans.get(key(date,slot)),recipes=c.recipes.filter(m=>m.date===date&&m.slot===slot);return {slot,label,plan:plan||null,kind:plan?.payload?.kind||(recipes.length?'cook':'unplanned'),recipes};}),extras:c.recipes.filter(m=>m.date===date&&m.slot==='side')});}
    return {days,limited:cursor.toISOString().slice(0,10)<=endDate};
  }
  function shoppingView(meals,rows){
    const c=context(meals),groups=new Map(),history=[];for(const row of rows.filter(r=>r&&!r.deleted_at&&r.source===SOURCE)){
      const active=c.relatedActive(row);if(!active){if(row.status==='purchased')history.push(row);continue;}const name=clean(row.name||row.title||'買う物'),unit=clean(row.unit||''),k=JSON.stringify([name,unit]);if(!groups.has(k))groups.set(k,{key:k,name,unit,ids:[],manualIds:[],quantity:0,purchasedQuantity:0,pendingQuantity:0,uses:[]});const g=groups.get(k),q=Number.isFinite(Number(row.quantity))&&Number(row.quantity)>0?Number(row.quantity):1;g.ids.push(row.id);if(row.payload?.manual)g.manualIds.push(row.id);g.quantity+=q;if(row.status==='purchased')g.purchasedQuantity+=q;else g.pendingQuantity+=q;if(row.payload?.date)g.uses.push(`${row.payload.date} ${LABELS[row.payload.slot]||''}`);
    }
    const all=[...groups.values()].map(g=>({...g,quantity:Number(g.quantity.toFixed(3)),purchasedQuantity:Number(g.purchasedQuantity.toFixed(3)),pendingQuantity:Number(g.pendingQuantity.toFixed(3)),done:g.pendingQuantity===0,uses:[...new Set(g.uses)]})).sort((a,b)=>a.name.localeCompare(b.name,'ja'));
    return {removedManual:rows.filter(r=>r&&r.source===SOURCE&&r.deleted_at&&r.payload?.manual),pending:all.filter(g=>!g.done),purchased:all.filter(g=>g.done),history};
  }
  function put(tx,store,row){globalThis.OUTBASE_VALIDATION.assertEntity(store,row);tx.objectStore(store).put(row);}
  async function withCamp({activityId,nativeEventId},stores,action){
    let result,failure;try{await globalThis.OUTBASE_DB_V160.transaction([...new Set(['activities',...stores])],'readwrite',tx=>{
      const fail=e=>{failure=e;tx.abort();},req=nativeEventId?tx.objectStore('activities').getAll():tx.objectStore('activities').get(activityId);
      req.onsuccess=()=>{try{let activity,min,max;if(nativeEventId){const rows=JSON.parse(localStorage.getItem('outbase_calendar_complete_v3_events')||'[]'),event=Array.isArray(rows)?rows.find(e=>e.id===nativeEventId&&!e.deleted_at&&e.calendarId==='camp'):null;if(!event)throw Error('meal_calendar_missing');activity=req.result.find(a=>!a.deleted_at&&a.source==='camp-exploration-context-v1'&&a.metadata?.calendar_event_id===nativeEventId)||repo().activities.normalize({type:'camp',title:event.title,state:'planned',start_at:event.start,end_at:event.end,visibility:'private',source:'camp-exploration-context-v1',metadata:{location:event.place||event.title,calendar_event_id:nativeEventId,calendar_month:String(event.start||'').slice(0,7)}});min=dateKey(event.start);max=dateKey(event.end);}else{activity=req.result;min=dateKey(activity?.start_at);max=dateKey(activity?.end_at);}if(!activity||activity.deleted_at||activity.type!=='camp')throw Error('meal_camp_missing');action(tx,activity,{min,max},v=>{result=v;},fail);}catch(e){fail(e);}};
    });}catch(e){throw failure||e;}return result;
  }
  async function saveSlot({activityId,displayActivityId,nativeEventId=null,requestId,expectedRequestId='',date,slot,kind,title='',note='',quantity=1,unit='',buy=true,guard=()=>true}){
    if(activityId!==displayActivityId||!globalThis.OUTBASE_IDS.isUlid(requestId)||!Object.hasOwn(LABELS,slot)||!Object.hasOwn(KINDS,kind)||!/^20\d{2}-\d{2}-\d{2}$/.test(date)||dateKey(date+'T12:00:00+09:00')!==date)throw Error('meal_slot_invalid');title=clean(title)||DEFAULTS[kind]?.[0]||KINDS[kind];note=String(note||'').trim();unit=GOODS.has(kind)?clean(unit)||DEFAULTS[kind]?.[1]||'':'';quantity=GOODS.has(kind)?Number(quantity):0;buy=GOODS.has(kind)&&!!buy;
    if(title.length>120||note.length>2000||unit.length>20||(GOODS.has(kind)&&(!Number.isInteger(quantity)||quantity<1||quantity>1000)))throw Error('meal_slot_invalid');
    const signature=JSON.stringify({kind,title,note,quantity,unit,buy}),shoppingSignature=JSON.stringify({kind,title,quantity,unit,buy});
    return withCamp({activityId,nativeEventId},['meals','shopping_lists','shopping_items','preparation_items'],(tx,a,bounds,done,fail)=>{
      if((bounds.min&&date<bounds.min)||(bounds.max&&date>bounds.max)){fail(Error('meal_date_outside'));return;}
      const reads=[tx.objectStore('meals').index('activity_id').getAll(a.id),tx.objectStore('meals').get(requestId),tx.objectStore('shopping_lists').index('activity_id').getAll(a.id),tx.objectStore('shopping_items').index('activity_id').getAll(a.id),tx.objectStore('preparation_items').index('activity_id').getAll(a.id)];let loaded=0;for(const r of reads)r.onsuccess=()=>{if(++loaded!==reads.length)return;try{
        if(!guard())throw Error('meal_cancelled');const [meals,used,lists,shopping,prep]=reads.map(r=>r.result),previous=context(meals).plans.get(key(date,slot));
        if(previous?.payload?.request_id===requestId){if(previous.payload.signature!==signature)throw Error('meal_request_conflict');done(previous);return;}
        if(used&&used.id!==previous?.id)throw Error('meal_request_conflict');if((previous?.payload?.request_id||'')!==expectedRequestId)throw Error('meal_slot_changed');
        const history=[...(previous?.payload?.history||[]),...(previous?[{kind:previous.payload.kind,title:previous.name,note:previous.payload.note,quantity:previous.payload.quantity,unit:previous.payload.unit,buy:previous.payload.buy,at:previous.updated_at}]:[])];
        const row=repo().meals.normalize({...previous,id:previous?.id||requestId,activity_id:a.id,title:`${date} ${LABELS[slot]}：${title}`,name:title,date,slot,status:'planned',source:SLOT_SOURCE,updated_at:globalThis.OUTBASE_IDS.nowIso(),payload:{kind,note,quantity,unit,buy,request_id:requestId,signature,shopping_signature:shoppingSignature,history}});put(tx,'activities',a);put(tx,'meals',row);
        const makePrep=(category,name,payload)=>repo().preparationItems.normalize({activity_id:a.id,category,title:name,status:'pending',origin:'meal',source:SOURCE,payload:{meal_id:row.id,...payload}});
        if(GOODS.has(kind)&&!shopping.some(s=>!s.deleted_at&&s.payload?.meal_id===row.id&&s.payload?.slot_signature===shoppingSignature)&&!prep.some(p=>!p.deleted_at&&p.payload?.meal_id===row.id&&p.payload?.slot_signature===shoppingSignature)){
          if(buy){const list=lists.find(l=>!l.deleted_at&&l.source===SOURCE)||repo().shoppingLists.normalize({activity_id:a.id,title:'キャンプの買い物',source:SOURCE}),item=repo().shoppingItems.normalize({activity_id:a.id,shopping_list_id:list.id,name:title,quantity,unit,status:'pending',source:SOURCE,payload:{meal_id:row.id,slot_signature:shoppingSignature,date,slot}});put(tx,'shopping_lists',list);put(tx,'shopping_items',item);put(tx,'preparation_items',makePrep('shopping',`${title} ${quantity}${unit}（${date} ${LABELS[slot]}）`,{shopping_item_id:item.id,slot_signature:shoppingSignature}));}
          else put(tx,'preparation_items',makePrep('gear',`持参：${title} ${quantity}${unit}（${date} ${LABELS[slot]}）`,{slot_signature:shoppingSignature}));
        }
        if(kind==='cupnoodle')for(const name of ['カップ麺のお湯・給湯方法を確認','箸・食後のごみ袋'])if(!prep.some(p=>!p.deleted_at&&p.payload?.meal_id===row.id&&p.title===name))put(tx,'preparation_items',makePrep('gear',name,{slot_utility:'cupnoodle'}));done(row);
      }catch(e){fail(e);}};
    });
  }
  function resumeCookSlot(tx,meals,date,slot){const previous=context(meals).plans.get(key(date,slot));if(!previous||previous.payload.kind==='cook')return;const value={kind:'cook',title:'自炊',note:'',quantity:0,unit:'',buy:false},row=repo().meals.normalize({...previous,name:'自炊',title:`${date} ${LABELS[slot]||slot}：自炊`,updated_at:globalThis.OUTBASE_IDS.nowIso(),payload:{...previous.payload,...value,request_id:globalThis.OUTBASE_IDS.ulid(),signature:JSON.stringify(value),shopping_signature:'',history:[...(previous.payload.history||[]),{kind:previous.payload.kind,title:previous.name,note:previous.payload.note,quantity:previous.payload.quantity,unit:previous.payload.unit,buy:previous.payload.buy,at:previous.updated_at}]}});put(tx,'meals',row);}
  async function addShopping({activityId,displayActivityId,nativeEventId=null,requestId,name,quantity,unit='',note='',guard=()=>true}){
    name=clean(name);unit=clean(unit);note=String(note||'').trim();quantity=Number(quantity);if(activityId!==displayActivityId||!globalThis.OUTBASE_IDS.isUlid(requestId)||!name||name.length>120||unit.length>20||note.length>500||!Number.isFinite(quantity)||quantity<=0||quantity>1000000)throw Error('shopping_invalid');const signature=JSON.stringify({name,quantity,unit,note});
    return withCamp({activityId,nativeEventId},['shopping_lists','shopping_items','preparation_items'],(tx,a,bounds,done,fail)=>{
      const requests=[tx.objectStore('shopping_items').get(requestId),tx.objectStore('shopping_lists').index('activity_id').getAll(a.id)];let loaded=0;for(const req of requests)req.onsuccess=()=>{if(++loaded!==2)return;try{if(!guard())throw Error('meal_cancelled');const [prior,lists]=requests.map(r=>r.result);if(prior){if(prior.activity_id!==a.id||prior.deleted_at||prior.payload?.manual_signature!==signature)throw Error('shopping_request_conflict');done(prior);return;}const list=lists.find(l=>!l.deleted_at&&l.source===SOURCE)||repo().shoppingLists.normalize({activity_id:a.id,title:'キャンプの買い物',source:SOURCE}),item=repo().shoppingItems.normalize({id:requestId,activity_id:a.id,shopping_list_id:list.id,name,quantity,unit,status:'pending',source:SOURCE,payload:{manual:true,manual_signature:signature,note}}),prep=repo().preparationItems.normalize({activity_id:a.id,category:'shopping',title:`${name} ${quantity}${unit}`,status:'pending',origin:'meal',source:SOURCE,payload:{manual:true,shopping_item_id:item.id}});put(tx,'activities',a);put(tx,'shopping_lists',list);put(tx,'shopping_items',item);put(tx,'preparation_items',prep);done(item);}catch(e){fail(e);}};
    });
  }
  async function toggleGroup({activityId,itemIds,done}){
    if(!Array.isArray(itemIds)||!itemIds.length||itemIds.length>300||typeof done!=='boolean')throw Error('shopping_group_invalid');
    return withCamp({activityId},['meals','shopping_items','preparation_items'],(tx,a,bounds,finish,fail)=>{
      const requests=[tx.objectStore('meals').index('activity_id').getAll(a.id),tx.objectStore('shopping_items').index('activity_id').getAll(a.id),tx.objectStore('preparation_items').index('activity_id').getAll(a.id)];let loaded=0;for(const r of requests)r.onsuccess=()=>{if(++loaded!==3)return;try{const [meals,shopping,prep]=requests.map(r=>r.result),c=context(meals),ids=new Set(itemIds),rows=shopping.filter(s=>ids.has(s.id));if(rows.length!==ids.size||rows.some(s=>s.deleted_at||s.source!==SOURCE||!c.relatedActive(s)))throw Error('shopping_plan_changed');for(const row of rows)put(tx,'shopping_items',repo().shoppingItems.normalize({...row,status:done?'purchased':'pending',updated_at:globalThis.OUTBASE_IDS.nowIso()}));for(const row of prep.filter(p=>!p.deleted_at&&ids.has(p.payload?.shopping_item_id)))put(tx,'preparation_items',repo().preparationItems.normalize({...row,status:done?'completed':'pending',completed_at:done?globalThis.OUTBASE_IDS.nowIso():null,updated_at:globalThis.OUTBASE_IDS.nowIso()}));finish({activity_id:a.id});}catch(e){fail(e);}};
    });
  }
  async function setManualDeleted({activityId,itemIds,deleted}){
    if(!Array.isArray(itemIds)||!itemIds.length||itemIds.length>300||typeof deleted!=='boolean')throw Error('shopping_manual_invalid');
    return withCamp({activityId},['shopping_items','preparation_items'],(tx,a,bounds,finish,fail)=>{
      const requests=[tx.objectStore('shopping_items').index('activity_id').getAll(a.id),tx.objectStore('preparation_items').index('activity_id').getAll(a.id)];let loaded=0;for(const r of requests)r.onsuccess=()=>{if(++loaded!==2)return;try{const [shopping,prep]=requests.map(r=>r.result),ids=new Set(itemIds),items=shopping.filter(s=>ids.has(s.id));if(items.length!==ids.size||items.some(s=>s.source!==SOURCE||!s.payload?.manual))throw Error('shopping_manual_invalid');const now=globalThis.OUTBASE_IDS.nowIso();for(const row of items)put(tx,'shopping_items',repo().shoppingItems.normalize({...row,deleted_at:deleted?now:null,updated_at:now}));for(const row of prep.filter(p=>ids.has(p.payload?.shopping_item_id)&&p.payload?.manual))put(tx,'preparation_items',repo().preparationItems.normalize({...row,deleted_at:deleted?now:null,updated_at:now}));finish({activity_id:a.id});}catch(e){fail(e);}};
    });
  }
  globalThis.OUTBASE_MEAL_DAY_PLAN=Object.freeze({KINDS,LABELS,SLOT_SOURCE,context,preparationFor,schedule,shoppingView,saveSlot,resumeCookSlot,addShopping,toggleGroup,setManualDeleted});
})();
