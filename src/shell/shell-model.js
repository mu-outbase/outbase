(() => {
  'use strict';
  const NAV=Object.freeze([
    {id:'home',label:'ホーム'},{id:'search',label:'探す'},{id:'central',label:'追加'},{id:'vault',label:'保管庫'}
  ]);
  async function build(){
    const route=globalThis.OUTBASE_ROUTER.current();
    const legacy=(globalThis.OUTBASE_LEGACY_UI_V165||globalThis.OUTBASE_LEGACY_UI_V164).session();
    const [home,vault,detail,calendar]=await Promise.all([
      globalThis.OUTBASE_HOME_SCREEN_MODEL_V164.build(),
      globalThis.OUTBASE_VAULT_SCREEN_MODEL_V162.build({activityLimit:12,recordLimit:8,assetLimit:8}),
      route.name==='activity'?globalThis.OUTBASE_ACTIVITY_DETAIL_SCREEN_MODEL_V165.build(route.activityId):Promise.resolve(null),
      route.name==='calendar'?globalThis.OUTBASE_CALENDAR_SCREEN_MODEL_V165.build({month:route.month,selected:route.people}):Promise.resolve(null)
    ]);
    return Object.freeze({
      version:'v166-formal-design-lock',route,legacy,online:navigator.onLine,nav:NAV,home,detail,calendar,
      now:home.current,next:home.next,quick:home.quick,recent:home.recent,family:home.family,
      calendarUrl:globalThis.OUTBASE_ROUTER.shellUrl('calendar'),vaultSummary:vault.summary,
      vaultActivities:vault.activities.slice(0,12),assets:vault.assets.slice(0,5),generatedAt:new Date().toISOString()
    });
  }
  const api=Object.freeze({build,NAV});
  globalThis.OUTBASE_SHELL_MODEL_V165=api;
  globalThis.OUTBASE_SHELL_MODEL_V164=api;
})();
