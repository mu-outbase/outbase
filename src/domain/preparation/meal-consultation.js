(() => {
  'use strict';
  const SOURCE='meal-consultation-v1';
  const TOOLS=Object.freeze({stove:'バーナー・コンロ',pan:'フライパン',pot:'鍋',knife:'包丁',board:'まな板',plate:'皿・ボウル',hotsand:'ホットサンドメーカー'});
  const SLOTS=Object.freeze({breakfast:'朝食',lunch:'昼食',dinner:'夕食',side:'追加の一品'});
  const recipes=[
    {id:'caprese',name:'トマトとチーズのカプレーゼ',minutes:10,fire:false,tools:['knife','board','plate'],ingredients:[['トマト',1,'個'],['モッツァレラチーズ',50,'g'],['オリーブオイル',5,'ml'],['塩',.5,'g']],steps:['トマトとチーズを切って皿に並べる。','オリーブオイルと塩をかける。']},
    {id:'cucumber',name:'たたききゅうり',minutes:10,fire:false,tools:['knife','board','plate'],ingredients:[['きゅうり',1,'本'],['ごま油',5,'ml'],['塩',.5,'g']],steps:['きゅうりをたたいて食べやすく切る。','ごま油と塩で和える。']},
    {id:'tuna-salad',name:'ツナと豆のサラダ',minutes:5,fire:false,tools:['plate'],ingredients:[['ツナ缶',.5,'缶'],['ミックスビーンズ',50,'g'],['ドレッシング',15,'ml']],steps:['ツナ缶の汁を切る。','豆とツナを皿で混ぜ、ドレッシングで和える。']},
    {id:'hotsand',name:'ハムチーズのホットサンド',minutes:15,fire:true,tools:['stove','hotsand'],ingredients:[['食パン',2,'枚'],['ハム',2,'枚'],['スライスチーズ',1,'枚'],['バター',5,'g']],steps:['パンにハムとチーズを挟み、外側にバターを塗る。','ホットサンドメーカーで両面を焼き、焼き具合を確認する。']},
    {id:'pasta',name:'ワンポット・トマトパスタ',minutes:25,fire:true,tools:['stove','pot'],ingredients:[['パスタ',100,'g'],['カットトマト缶',100,'g'],['水',250,'ml'],['コンソメ',3,'g'],['オリーブオイル',5,'ml']],steps:['鍋で水とトマト・コンソメを沸かす。','パスタを加え、袋のゆで時間を目安に混ぜながら加熱する。','水分や塩味を確認し、オリーブオイルで仕上げる。']},
    {id:'soup',name:'ソーセージとキャベツのスープ',minutes:20,fire:true,tools:['stove','pot','knife','board'],ingredients:[['ソーセージ',2,'本'],['キャベツ',100,'g'],['水',250,'ml'],['コンソメ',3,'g']],steps:['具材を食べやすく切る。','水とコンソメ、具材を鍋に入れ、火が通るまで煮る。']},
    {id:'friedrice',name:'ツナとコーンのチャーハン',minutes:15,fire:true,tools:['stove','pan'],ingredients:[['ご飯',200,'g'],['ツナ缶',.5,'缶'],['コーン缶',50,'g'],['しょうゆ',10,'ml'],['油',5,'ml']],steps:['フライパンに油を熱し、ツナとコーンを炒める。','ご飯を加えてほぐしながら炒め、しょうゆで味を調える。']}
  ].map(r=>Object.freeze({...r,tools:Object.freeze(r.tools),ingredients:Object.freeze(r.ingredients.map(([name,quantity,unit])=>Object.freeze({name,quantity,unit}))),steps:Object.freeze(r.steps)}));
  const repo=()=>globalThis.OUTBASE_REPOSITORIES_V160;
  const clean=v=>String(v??'').normalize('NFKC').trim();
  const tokens=v=>clean(v).split(/[\n、,]+/).map(clean).filter(Boolean);
  const match=(a,b)=>clean(a).toLowerCase().includes(clean(b).toLowerCase());
  const dateKey=v=>{if(!v||!Number.isFinite(Date.parse(v)))return '';return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(v));};
  function normalize(input={}){
    const people=Number(input.people),minutes=Number(input.minutes);
    if(!Number.isInteger(people)||people<1||people>20||!Number.isFinite(minutes)||minutes<5||minutes>180||String(input.stock||'').length>2000||String(input.exclude||'').length>1000)throw Error('meal_conditions_invalid');
    return {people,minutes,noFire:!!input.noFire,tools:[...new Set((input.tools||[]).filter(k=>Object.hasOwn(TOOLS,k)))].sort(),stock:clean(input.stock),exclude:clean(input.exclude)};
  }
  function suggest(input){
    const c=normalize(input),stock=tokens(c.stock),exclude=tokens(c.exclude);
    return recipes.filter(r=>r.minutes<=c.minutes&&(!c.noFire||!r.fire)&&r.tools.every(k=>c.tools.includes(k))&&!r.ingredients.some(i=>exclude.some(x=>match(i.name,x)))).map(r=>({...r,people:c.people,ingredients:r.ingredients.map(i=>({...i,quantity:Math.round(i.quantity*c.people*10)/10,stockMatch:stock.some(x=>match(x,i.name)||match(i.name,x))})),stockMatches:r.ingredients.filter(i=>stock.some(x=>match(x,i.name)||match(i.name,x))).length})).sort((a,b)=>b.stockMatches-a.stockMatches||a.minutes-b.minutes);
  }
  function inferredTools(assets){
    const patterns={stove:/バーナー|コンロ|ストーブ|フラットバーナー/,pan:/フライパン|スキレット/,pot:/鍋|クッカー/,knife:/包丁|ナイフ/,board:/まな板|カッティングボード/,plate:/皿|ボウル|シェラカップ/,hotsand:/ホットサンド/};
    return Object.keys(TOOLS).filter(k=>(assets||[]).some(a=>!a.deleted_at&&Number(a.payload?.quantity??a.quantity??1)>0&&patterns[k].test(a.name||'')));
  }
  async function load({activityId,nativeEventId=null}){
    const parent=nativeEventId?await globalThis.OUTBASE_CAMP_EXPLORATION.loadCalendar(nativeEventId):null;
    let activity=parent?.activity||await repo().activities.get(activityId);
    if(nativeEventId){const events=JSON.parse(localStorage.getItem('outbase_calendar_complete_v3_events')||'[]');const event=Array.isArray(events)?events.find(e=>e.id===nativeEventId&&!e.deleted_at&&e.calendarId==='camp'):null;if(event)activity={...activity,title:event.title,start_at:event.start,end_at:event.end};}
    if(!activity||activity.deleted_at||activity.type!=='camp')throw Error('meal_camp_missing');
    const isReal=globalThis.OUTBASE_IDS.isUlid(activity.id);
    const [meals,assets,preparation]=await Promise.all([isReal?repo().meals.byIndex('activity_id',activity.id):[],repo().assets.all(),isReal?repo().preparationItems.byIndex('activity_id',activity.id):[]]);
    return {status:'ready',activity,nativeEventId,nativeMonth:parent?.nativeMonth||'',meals:meals.filter(m=>!m.deleted_at&&m.source===SOURCE).sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.slot).localeCompare(String(b.slot))),assets:assets.filter(a=>!a.deleted_at),preparation:preparation.filter(r=>!r.deleted_at),tools:inferredTools(assets),startDate:dateKey(activity.start_at),endDate:dateKey(activity.end_at)};
  }
  async function approve({activityId,displayActivityId,nativeEventId=null,requestId,recipeId,date,slot,conditions,ingredients,guard=()=>true}){
    if(activityId!==displayActivityId||!globalThis.OUTBASE_IDS.isUlid(requestId)||!Object.hasOwn(SLOTS,slot)||!/^20\d{2}-\d{2}-\d{2}$/.test(date)||dateKey(date+'T12:00:00+09:00')!==date)throw Error('meal_invalid');
    const normalized=normalize(conditions),candidate=suggest(normalized).find(r=>r.id===recipeId);
    if(!candidate||!Array.isArray(ingredients)||ingredients.length!==candidate.ingredients.length)throw Error('meal_candidate_changed');
    const items=ingredients.map((row,index)=>{const expected=candidate.ingredients[index];if(row.name!==expected.name||row.unit!==expected.unit||!Number.isFinite(row.quantity)||row.quantity<=0||row.quantity>100000||typeof row.buy!=='boolean')throw Error('meal_ingredient_invalid');return {name:row.name,unit:row.unit,quantity:row.quantity,buy:row.buy};});
    const signature=JSON.stringify({recipeId,date,slot,conditions:normalized,ingredients:items});
    const stores=['activities','meals','meal_items','shopping_lists','shopping_items','preparation_items'];let result,failure;
    try{await globalThis.OUTBASE_DB_V160.transaction(stores,'readwrite',tx=>{
      const fail=error=>{failure=error;tx.abort();};
      const a=tx.objectStore('activities');const req=nativeEventId?a.getAll():a.get(activityId);
      req.onsuccess=()=>{try{
        if(!guard())throw Error('meal_cancelled');
        let activity,sourceEvent=null;
        if(nativeEventId){
          const events=JSON.parse(localStorage.getItem('outbase_calendar_complete_v3_events')||'[]');const event=Array.isArray(events)?events.find(e=>e.id===nativeEventId&&!e.deleted_at&&e.calendarId==='camp'):null;if(!event)throw Error('meal_calendar_missing');sourceEvent=event;
          activity=req.result.find(r=>!r.deleted_at&&r.source==='camp-exploration-context-v1'&&r.metadata?.calendar_event_id===nativeEventId);
          if(!activity)activity=repo().activities.normalize({type:'camp',title:event.title,state:'planned',start_at:event.start,end_at:event.end,visibility:'private',source:'camp-exploration-context-v1',metadata:{location:event.place||event.title,calendar_event_id:nativeEventId,calendar_month:String(event.start||'').slice(0,7)}});
        }else activity=req.result;
        if(!activity||activity.deleted_at||activity.type!=='camp')throw Error('meal_camp_missing');
        const min=dateKey(sourceEvent?.start||activity.start_at),max=dateKey(sourceEvent?.end||activity.end_at);if((min&&date<min)||(max&&date>max))throw Error('meal_date_outside');
        const reads=[tx.objectStore('meals').get(requestId),tx.objectStore('shopping_lists').index('activity_id').getAll(activity.id),tx.objectStore('preparation_items').index('activity_id').getAll(activity.id)];let loaded=0;
        for(const r of reads)r.onsuccess=()=>{if(++loaded!==3)return;try{
          if(!guard())throw Error('meal_cancelled');const [previous,lists,prep]=reads.map(r=>r.result);
          if(previous){if(previous.deleted_at||previous.activity_id!==activity.id||previous.payload?.signature!==signature)throw Error('meal_request_conflict');result=previous;return;}
          const put=(store,row)=>{globalThis.OUTBASE_VALIDATION.assertEntity(store,row);tx.objectStore(store).put(row);};
          const title=`${date} ${SLOTS[slot]}：${candidate.name}`;
          const meal=repo().meals.normalize({id:requestId,activity_id:activity.id,title,name:candidate.name,date,slot,people:normalized.people,status:'planned',source:SOURCE,payload:{recipe_id:recipeId,signature,conditions:normalized,ingredients:items,steps:candidate.steps,tools:candidate.tools}});
          const makePrep=(category,title,payload={})=>repo().preparationItems.normalize({activity_id:activity.id,category,title,status:'pending',origin:'meal',sort_order:999,source:SOURCE,payload:{meal_id:meal.id,...payload}});
          const list=lists.find(l=>!l.deleted_at&&l.source===SOURCE)||repo().shoppingLists.normalize({activity_id:activity.id,title:'キャンプ料理の買い物',source:SOURCE});
          put('activities',activity);put('meals',meal);if(items.some(i=>i.buy))put('shopping_lists',list);
          put('preparation_items',makePrep('meal',title));
          for(const item of items){
            put('meal_items',repo().mealItems.normalize({meal_id:meal.id,...item,source:SOURCE}));
            const amount=`${item.name} ${item.quantity}${item.unit}`;
            if(item.buy){const shopping=repo().shoppingItems.normalize({activity_id:activity.id,shopping_list_id:list.id,name:item.name,quantity:item.quantity,unit:item.unit,status:'pending',source:SOURCE,payload:{meal_id:meal.id,date,slot}});put('shopping_items',shopping);put('preparation_items',makePrep('shopping',`${amount}（${date} ${SLOTS[slot]}）`,{shopping_item_id:shopping.id}));}
            else put('preparation_items',makePrep('gear',`持参：${amount}（${date} ${SLOTS[slot]}）`));
          }
          for(const tool of candidate.tools){const name=TOOLS[tool];if(!prep.some(p=>!p.deleted_at&&p.category==='gear'&&p.title===name))put('preparation_items',makePrep('gear',name,{tool}));}
          result=meal;
        }catch(error){fail(error);}};
      }catch(error){fail(error);}};
    });}catch(error){throw failure||error;}return result;
  }
  async function toggleShopping(preparationId,displayActivityId){
    let failure;
    try{await globalThis.OUTBASE_DB_V160.transaction(['preparation_items','shopping_items'],'readwrite',tx=>{
      const req=tx.objectStore('preparation_items').get(preparationId);req.onsuccess=()=>{try{const prep=req.result;if(!prep||prep.deleted_at||prep.source!==SOURCE||prep.activity_id!==displayActivityId||!prep.payload?.shopping_item_id)throw Error('meal_shopping_missing');
        const check=tx.objectStore('shopping_items').get(prep.payload.shopping_item_id);check.onsuccess=()=>{try{const item=check.result;if(!item||item.deleted_at||item.source!==SOURCE||item.activity_id!==prep.activity_id||item.payload?.meal_id!==prep.payload.meal_id)throw Error('meal_shopping_mismatch');const done=prep.status!=='completed';const updated=repo().preparationItems.normalize({...prep,updated_at:globalThis.OUTBASE_IDS.nowIso(),status:done?'completed':'pending',completed_at:done?globalThis.OUTBASE_IDS.nowIso():null}),shopping=repo().shoppingItems.normalize({...item,updated_at:globalThis.OUTBASE_IDS.nowIso(),status:done?'purchased':'pending'});globalThis.OUTBASE_VALIDATION.assertEntity('preparation_items',updated);globalThis.OUTBASE_VALIDATION.assertEntity('shopping_items',shopping);tx.objectStore('preparation_items').put(updated);tx.objectStore('shopping_items').put(shopping);}catch(error){failure=error;tx.abort();}};
      }catch(error){failure=error;tx.abort();}};
    });}catch(error){throw failure||error;}
  }
  globalThis.OUTBASE_MEAL_CONSULTATION=Object.freeze({TOOLS,SLOTS,normalize,suggest,inferredTools,load,approve,toggleShopping});
})();
