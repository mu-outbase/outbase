(() => {
  'use strict';

  const repos=()=>globalThis.OUTBASE_REPOSITORIES_V160;
  const utils=()=>globalThis.OUTBASE_DOMAIN_UTILS_V162;

  async function sourceRows(){
    const [activities,calendarEntries,participants]=await Promise.all([
      repos().activities.all(),repos().calendarEntries.all(),repos().activityParticipants.all()
    ]);
    return {activities,calendarEntries,participants};
  }

  function calendarForActivity(activityId,groups){
    return (groups.get(activityId)||[])
      .filter(row=>!row.deleted_at)
      .sort((a,b)=>utils().compareDate(a,b,'start_at'))
      .map(row=>Object.freeze({
        id:row.id,activityId:row.activity_id,startAt:utils().iso(row.start_at),endAt:utils().iso(row.end_at),
        allDay:Boolean(row.all_day),timezone:utils().text(row.timezone,'Asia/Tokyo'),
        recurrence:row.recurrence??null,reminders:Array.isArray(row.reminders)?row.reminders:[]
      }));
  }

  function participantRefs(activityId,groups){
    return (groups.get(activityId)||[]).filter(row=>!row.deleted_at).map(row=>Object.freeze({
      id:row.participant_id,type:row.participant_type,role:row.role||'participant'
    }));
  }

  function withinRange(item,from,to){
    const start=utils().asDate(item.startAt||item.calendar?.[0]?.startAt);
    if(!start)return !from&&!to;
    if(from&&start<utils().asDate(from))return false;
    if(to&&start>utils().asDate(to))return false;
    return true;
  }

  async function list(options={}){
    const {activities,calendarEntries,participants}=await sourceRows();
    const calendarGroups=utils().groupBy(calendarEntries,'activity_id');
    const participantGroups=utils().groupBy(participants,'activity_id');
    const stateSet=options.states?.length?new Set(options.states):null;
    const rows=activities
      .filter(row=>options.includeDeleted||!row.deleted_at)
      .filter(row=>!stateSet||stateSet.has(row.state))
      .map(row=>{
        const activity=utils().publicActivity(row);
        const calendar=calendarForActivity(row.id,calendarGroups);
        return Object.freeze({...activity,calendar,participants:participantRefs(row.id,participantGroups)});
      })
      .filter(row=>withinRange(row,options.from,options.to))
      .sort((a,b)=>{
        const aDate=utils().asDate(a.startAt||a.calendar?.[0]?.startAt);
        const bDate=utils().asDate(b.startAt||b.calendar?.[0]?.startAt);
        if(!aDate&&!bDate)return String(b.updatedAt||'').localeCompare(String(a.updatedAt||''));
        if(!aDate)return 1;
        if(!bDate)return -1;
        return aDate-bDate;
      });
    return utils().limit(rows,options.limit||300);
  }

  async function get(activityId){
    if(!activityId)return null;
    const rows=await list({includeDeleted:true,limit:10000});
    return rows.find(row=>row.id===activityId)||null;
  }

  async function byLegacyPlanId(planId){
    if(!planId)return null;
    const row=await repos().activities.byLegacyRef(`plan:${planId}`);
    return row?get(row.id):null;
  }

  async function current(){
    const context=await repos().runtimeContext();
    const id=context?.current_activity_id||utils().activeActivityId();
    return id?get(id):null;
  }

  async function now(){return list({states:utils().ACTIVE_STATES,limit:20});}
  async function upcoming({from=new Date(),days=120,limit=50}={}){
    const start=utils().asDate(from)||new Date();
    const end=new Date(start.getTime()+Number(days||120)*86400000);
    return list({states:utils().FUTURE_STATES,from:start,to:end,limit});
  }

  function legacyUrl(activity,surface='detail'){
    const router=globalThis.OUTBASE_ROUTER;
    const planId=activity?.legacyPlanId||utils().legacyPlanId(activity||{});
    if(surface==='calendar')return router?.legacyUrl?.('calendar',{planId})||`?tab=plan${planId?`&planId=${encodeURIComponent(planId)}`:''}`;
    if(surface==='preparation')return router?.legacyUrl?.('activity',{activityId:activity?.id,planId})||'?tab=prep';
    return router?.legacyUrl?.('home',{activityId:activity?.id,planId})||'?tab=plan';
  }

  globalThis.OUTBASE_PLAN_DOMAIN_V162=Object.freeze({list,get,byLegacyPlanId,current,now,upcoming,legacyUrl});
})();
