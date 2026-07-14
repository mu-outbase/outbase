(() => {
  'use strict';
  function session(){
    const state=localStorage.getItem('outbase_record_session_state')||'idle';
    return Object.freeze({
      state:['active','paused'].includes(state)?state:'idle',
      activityId:localStorage.getItem('outbase_core_activity_id')||localStorage.getItem('outbase_primary_activity_id_v2')||null,
      planId:localStorage.getItem('outbase_active_plan_id')||null,
      target:localStorage.getItem('outbase_record_target')||'記録'
    });
  }
  function shellSafe(){return session().state==='idle';}
  function openRoute(route,params={}){location.assign(globalThis.OUTBASE_ROUTER.legacyUrl(route,params));}
  function openCalendar(planId=null){openRoute('calendar',{planId});}
  function openPreparation(activityId,planId=null){openRoute('activity',{activityId,planId});}
  function openRecord(activityId=null,planId=null){const value=session();openRoute('record',{activityId:activityId||value.activityId,planId:planId||value.planId});}
  function openPlanAdd(){location.assign(`${location.pathname}?tab=plan&planSheet=add`);}
  function openStart(){location.assign(`${location.pathname}?tab=record&sheet=start`);}
  function openMemo(){location.assign(`${location.pathname}?tab=record&sheet=memo`);}
  function openSearch(){openRoute('search');}
  function openVault(){openRoute('vault');}
  function openLegacyHome(){openRoute('home');}
  const api=Object.freeze({session,shellSafe,openRoute,openCalendar,openPreparation,openRecord,openPlanAdd,openStart,openMemo,openSearch,openVault,openLegacyHome});
  globalThis.OUTBASE_LEGACY_UI_V165=api;
  globalThis.OUTBASE_LEGACY_UI_V164=api;
})();
