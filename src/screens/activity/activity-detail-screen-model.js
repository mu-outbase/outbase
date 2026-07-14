(() => {
  'use strict';
  async function build(activityId,options={}){
    const value=await globalThis.OUTBASE_ACTIVITY_DETAIL_DOMAIN_V165.build(activityId,options);
    return Object.freeze({...value,version:'v165-integrated'});
  }
  globalThis.OUTBASE_ACTIVITY_DETAIL_SCREEN_MODEL_V165=Object.freeze({build});
})();
