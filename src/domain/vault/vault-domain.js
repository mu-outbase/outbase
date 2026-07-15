(() => {
  'use strict';

  const repos=()=>globalThis.OUTBASE_REPOSITORIES_V160;
  const utils=()=>globalThis.OUTBASE_DOMAIN_UTILS_V162;
  const plans=()=>globalThis.OUTBASE_PLAN_DOMAIN_V162;

  function previewMedia(rows=[]){
    const row=(rows||[]).find(item=>item?.media_type==='photo'&&item?.local_ref?.key);
    if(!row)return null;
    return Object.freeze({key:String(row.local_ref.key),type:'photo',mimeType:String(row.mime_type||''),size:Number(row.size||0)});
  }

  async function activityRows(options={}){
    const states=options.states||utils().MEMORY_STATES;
    const [activities,records,media,reviews,improvements]=await Promise.all([
      plans().list({states,includeDeleted:false,limit:options.scanLimit||2000}),
      repos().records.all(),repos().media.all(),repos().reviews.all(),repos().improvementItems.all()
    ]);
    const recordGroups=utils().groupBy(records.filter(row=>!row.deleted_at),'activity_id');
    const mediaGroups=utils().groupBy(media.filter(row=>!row.deleted_at),'activity_id');
    const reviewGroups=utils().groupBy(reviews.filter(row=>!row.deleted_at),'activity_id');
    const improvementGroups=utils().groupBy(improvements.filter(row=>!row.deleted_at),'activity_id');
    const rows=activities.map(activity=>Object.freeze({
      ...activity,
      recordCount:(recordGroups.get(activity.id)||[]).length,
      mediaCount:(mediaGroups.get(activity.id)||[]).length,
      previewMedia:previewMedia(mediaGroups.get(activity.id)||[]),
      reviewCount:(reviewGroups.get(activity.id)||[]).length,
      openImprovementCount:(improvementGroups.get(activity.id)||[]).filter(row=>row.status!=='completed').length,
      legacyUrl:plans().legacyUrl(activity,'detail')
    })).sort((a,b)=>String(b.endAt||b.updatedAt||'').localeCompare(String(a.endAt||a.updatedAt||'')));
    return utils().limit(rows,options.limit||100);
  }

  async function recentRecords({limit=40,activityId=null}={}){
    let rows=activityId?await repos().records.forActivity(activityId):await repos().records.all();
    return utils().limit(rows.filter(row=>!row.deleted_at).sort((a,b)=>String(b.occurred_at||'').localeCompare(String(a.occurred_at||''))).map(row=>Object.freeze({
      id:row.id,activityId:row.activity_id,type:row.type,occurredAt:utils().iso(row.occurred_at),
      visibility:row.visibility||'private',payload:row.payload??null,legacyRef:row.legacy_ref||null
    })),limit);
  }

  async function assets({type=null,query='',limit=100}={}){
    const needle=utils().text(query).toLowerCase();
    const rows=await repos().assets.all();
    return utils().limit(rows.filter(row=>!row.deleted_at)
      .filter(row=>!type||row.asset_type===type)
      .filter(row=>!needle||`${row.name||''} ${JSON.stringify(row.payload||{})}`.toLowerCase().includes(needle))
      .sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ja'))
      .map(row=>Object.freeze({id:row.id,type:row.asset_type||'asset',name:row.name||'名称未設定',status:row.status||'active',payload:row.payload??null})),limit);
  }

  async function summary(){
    const [activities,records,assetsRows,reviews,improvements]=await Promise.all([
      activityRows({limit:10000,scanLimit:10000}),recentRecords({limit:10000}),assets({limit:10000}),repos().reviews.all(),repos().improvementItems.all()
    ]);
    return Object.freeze({
      activityCount:activities.length,recordCount:records.length,assetCount:assetsRows.length,
      reviewCount:reviews.filter(row=>!row.deleted_at).length,
      openImprovementCount:improvements.filter(row=>!row.deleted_at&&row.status!=='completed').length,
      latestActivity:activities[0]||null,latestRecord:records[0]||null
    });
  }

  globalThis.OUTBASE_VAULT_DOMAIN_V162=Object.freeze({activityRows,recentRecords,assets,summary,previewMedia});
})();
