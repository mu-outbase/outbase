(() => {
  'use strict';

  const repos=()=>globalThis.OUTBASE_REPOSITORIES_V160;
  const plans=()=>globalThis.OUTBASE_PLAN_DOMAIN_V162;
  const home=()=>globalThis.OUTBASE_HOME_DOMAIN_V164;
  const prep=()=>globalThis.OUTBASE_PREPARATION_SCREEN_MODEL_V162;
  const utils=()=>globalThis.OUTBASE_DOMAIN_UTILS_V162;

  const clean=rows=>(rows||[]).filter(row=>row&&!row.deleted_at);
  const sortDesc=(rows,key)=>[...rows].sort((a,b)=>String(b?.[key]||'').localeCompare(String(a?.[key]||'')));

  function location(activity){
    const meta=activity?.metadata||{};const plan=meta.legacy_plan||{};const core=meta.legacy_core_activity||{};
    return String(plan.location||plan.placeName||core.location||meta.location||'').trim();
  }

  function recordView(row){
    return Object.freeze({
      id:row.id,activityId:row.activity_id,type:row.type||'note',occurredAt:utils().iso(row.occurred_at),
      actorId:row.actor_id||null,visibility:row.visibility||'private',payload:row.payload??null,legacyRef:row.legacy_ref||null
    });
  }

  function previewMedia(rows){
    const row=clean(rows).find(item=>item?.media_type==='photo'&&item?.local_ref?.key);
    if(!row)return null;
    return Object.freeze({key:String(row.local_ref.key),type:'photo',mimeType:String(row.mime_type||''),size:Number(row.size||0)});
  }

  function mediaSummary(rows){
    const types={photo:0,video:0,audio:0,other:0};
    for(const row of clean(rows)){const type=['photo','video','audio'].includes(row.media_type)?row.media_type:'other';types[type]+=1;}
    return Object.freeze({count:Object.values(types).reduce((sum,value)=>sum+value,0),types:Object.freeze(types)});
  }

  async function build(activityId,{recordLimit=40}={}){
    if(!activityId)return Object.freeze({status:'missing_activity_id',activity:null,blobReads:0});
    const activity=await plans().get(activityId);
    if(!activity)return Object.freeze({status:'not_found',activityId,activity:null,blobReads:0});

    const [book,preparation,records,media,reviews,improvements,activityAssets,assets,meals,shoppingLists]=await Promise.all([
      home().directory(),prep().build(activityId).catch(()=>null),repos().records.forActivity(activityId),
      repos().media.byIndex('activity_id',activityId),repos().reviews.byIndex('activity_id',activityId),
      repos().improvementItems.byIndex('activity_id',activityId),repos().activityAssets.byIndex('activity_id',activityId),
      repos().assets.all(),repos().meals.byIndex('activity_id',activityId),repos().shoppingLists.byIndex('activity_id',activityId)
    ]);

    const assetById=new Map(clean(assets).map(row=>[row.id,row]));
    const linkedAssets=clean(activityAssets).map(link=>assetById.get(link.asset_id)).filter(Boolean).map(row=>Object.freeze({id:row.id,type:row.asset_type||'asset',name:row.name||'名称未設定',status:row.status||'active'}));
    const people=home().participants(activity,book);
    const reviewRows=sortDesc(clean(reviews),'updated_at');
    const improvementRows=sortDesc(clean(improvements),'updated_at');
    const recordRows=sortDesc(clean(records),'occurred_at').slice(0,Math.max(1,Number(recordLimit)||40)).map(recordView);
    const mediaInfo=mediaSummary(media);

    const view=Object.freeze({
      ...activity,
      typeLabel:home().TYPE_LABELS[activity.type]||home().TYPE_LABELS.other,
      stateLabel:home().STATE_LABELS[activity.state]||'活動',
      visibilityLabel:home().VISIBILITY_LABELS[activity.visibility]||home().VISIBILITY_LABELS.private,
      place:location(activity),participants:people,
      startAt:utils().iso(activity.startAt||activity.calendar?.[0]?.startAt),
      endAt:utils().iso(activity.endAt||activity.calendar?.[0]?.endAt),
      calendar:Object.freeze(activity.calendar||[]),
      preparation,
      records:Object.freeze(recordRows),recordCount:clean(records).length,
      media:mediaInfo,previewMedia:previewMedia(media),
      organization:Object.freeze({
        reviewCount:reviewRows.length,reviews:Object.freeze(reviewRows.slice(0,5)),
        improvementCount:improvementRows.length,openImprovementCount:improvementRows.filter(row=>row.status!=='completed').length,
        improvements:Object.freeze(improvementRows.slice(0,8))
      }),
      assets:Object.freeze(linkedAssets),mealCount:clean(meals).length,shoppingListCount:clean(shoppingLists).length,
      homeUrl:globalThis.OUTBASE_ROUTER.shellUrl('home'),
      calendarUrl:globalThis.OUTBASE_ROUTER.shellUrl('calendar',{month:(utils().iso(activity.startAt)||'').slice(0,7)}),
      preparationUrl:plans().legacyUrl(activity,'preparation'),
      recordUrl:globalThis.OUTBASE_ROUTER.legacyUrl('record',{activityId:activity.id,planId:activity.legacyPlanId||null}),
      legacyDetailUrl:plans().legacyUrl(activity,'detail')
    });

    return Object.freeze({status:'ready',activity:view,blobReads:0,generatedAt:new Date().toISOString()});
  }

  globalThis.OUTBASE_ACTIVITY_DETAIL_DOMAIN_V165=Object.freeze({build,mediaSummary,previewMedia});
})();
