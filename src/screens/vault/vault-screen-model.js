(() => {
  'use strict';

  async function build({activityLimit=30,recordLimit=30,assetLimit=30}={}){
    const domain=globalThis.OUTBASE_VAULT_DOMAIN_V162;
    const [summary,activities,records,assets]=await Promise.all([
      domain.summary(),domain.activityRows({limit:activityLimit}),domain.recentRecords({limit:recordLimit}),domain.assets({limit:assetLimit})
    ]);
    return Object.freeze({summary,activities,records,assets,generatedAt:new Date().toISOString()});
  }

  globalThis.OUTBASE_VAULT_SCREEN_MODEL_V162=Object.freeze({build});
})();
