(() => {
  'use strict';

  const repos=()=>globalThis.OUTBASE_REPOSITORIES_V160;
  const utils=()=>globalThis.OUTBASE_DOMAIN_UTILS_V162;
  const plans=()=>globalThis.OUTBASE_PLAN_DOMAIN_V162;

  const CATEGORY_LABELS=Object.freeze({
    weather:'天気',route:'行き方',gear:'持ち物',meal:'料理',shopping:'買い物',pet:'ペット',
    parking:'駐車',ticket:'予約・チケット',note:'メモ'
  });
  const BASELINES=Object.freeze({
    camp:['weather','route','gear','meal','shopping','pet'],
    walk:['weather','route','pet','gear'],
    drive:['route','weather','pet','parking'],
    shopping:['shopping','route'],
    event:['weather','route','ticket'],
    other:['note']
  });

  function baselineFor(activity){
    const categories=BASELINES[activity?.type]||BASELINES.other;
    return categories.map((category,index)=>Object.freeze({
      category,title:CATEGORY_LABELS[category]||category,status:'pending',sortOrder:index,origin:'baseline'
    }));
  }

  async function items(activityId){
    if(!activityId)return [];
    const rows=await repos().preparationItems.byIndex('activity_id',activityId);
    return rows.filter(row=>!row.deleted_at).sort((a,b)=>{
      if(Boolean(a.completed_at)!==Boolean(b.completed_at))return a.completed_at?1:-1;
      return Number(a.sort_order??999)-Number(b.sort_order??999)||String(a.created_at||'').localeCompare(String(b.created_at||''));
    }).map(row=>Object.freeze({
      id:row.id,activityId:row.activity_id,category:row.category||'note',title:row.title||CATEGORY_LABELS[row.category]||'準備',
      status:row.status||'pending',completedAt:utils().iso(row.completed_at),dueAt:utils().iso(row.due_at),
      sortOrder:Number(row.sort_order??999),origin:row.origin||row.source||'user',payload:row.payload??null
    }));
  }

  async function summary(activityId){
    const [activity,currentItems]=await Promise.all([plans().get(activityId),items(activityId)]);
    if(!activity)return null;
    const effective=currentItems.length?currentItems:baselineFor(activity);
    const completed=effective.filter(item=>item.status==='completed'||item.completedAt).length;
    return Object.freeze({
      activity,items:effective,total:effective.length,completed,
      pending:Math.max(0,effective.length-completed),progress:effective.length?Math.round(completed/effective.length*100):0,
      persisted:currentItems.length>0,legacyUrl:plans().legacyUrl(activity,'preparation')
    });
  }

  async function ensureBaseline(activityId,{actorId=null}={}){
    if(utils().legacySessionActive())return Object.freeze({status:'deferred_active_session',created:0,activityId});
    const activity=await plans().get(activityId);
    if(!activity)return Object.freeze({status:'activity_not_found',created:0,activityId});
    const [context,rawActivity]=await Promise.all([repos().runtimeContext(),repos().activities.get(activityId)]);
    const existing=await items(activityId);
    const existingCategories=new Set(existing.map(item=>item.category));
    const created=[];
    for(const item of baselineFor(activity)){
      if(existingCategories.has(item.category))continue;
      created.push(await repos().preparationItems.upsertByLegacyRef(`prep-baseline:${activityId}:${item.category}`,{
        household_id:rawActivity?.household_id||'',activity_id:activityId,
        category:item.category,title:item.title,status:'pending',sort_order:item.sortOrder,origin:'baseline',
        source:'phase2b-baseline',schema_version:1,created_by:actorId||rawActivity?.created_by||rawActivity?.updated_by||'',updated_by:actorId||rawActivity?.updated_by||rawActivity?.created_by||''
      }));
    }
    return Object.freeze({status:'ready',created:created.length,activityId,items:await items(activityId)});
  }

  globalThis.OUTBASE_PREPARATION_DOMAIN_V162=Object.freeze({CATEGORY_LABELS,BASELINES,baselineFor,items,summary,ensureBaseline});
})();
