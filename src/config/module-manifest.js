(() => {
  'use strict';
  const version=globalThis.OUTBASE_VERSION;
  if(!version)throw new Error('OUTBASE_VERSION is not ready');
  const withVersion=(path,value)=>`${path}?v=${encodeURIComponent(value)}`;
  const contextModule=withVersion('src/context/activity-context-v18.js',version.shell);
  const legacy=[
    contextModule,
    ...[
      'src/app.js','src/outbase-core.js','src/outbase-chappy.js','src/outbase-chappy-ui.js',
      'src/outbase-import.js','src/outbase-memo-ui.js','src/outbase-review-ui.js','src/outbase-flow.js',
      'src/outbase-entry.js','src/outbase-activity.js','src/outbase-navigation-guard.js','src/outbase-scenarios.js',
      'src/outbase-activity-title-guard.js','src/outbase-compact-ui.js'
    ].map(path=>withVersion(path,version.legacy)),
    withVersion('src/legacy/return-bridge-v18.js',version.shell)
  ];
  const data=[
    'src/data/ids.js','src/data/validation.js','src/data/database.js','src/data/repositories.js',
    'src/data/legacy-adapter.js','src/data/migrations.js','src/data/bootstrap.js'
  ].map(path=>withVersion(path,version.data));
  const domain=[
    'src/domain/shared/read-utils.js','src/domain/plans/plan-domain.js','src/domain/preparation/preparation-domain.js',
    'src/domain/vault/vault-domain.js','src/screens/plan/plan-screen-model.js',
    'src/screens/preparation/preparation-screen-model.js','src/screens/vault/vault-screen-model.js','src/domain/bootstrap.js',
    'src/domain/home/home-domain.js','src/screens/home/home-screen-model.js','src/screens/home/home-real-data-only-v18.js',
    'src/domain/filters/family-filter-domain.js','src/domain/calendar/calendar-domain.js',
    'src/screens/calendar/calendar-screen-model.js','src/domain/activity/activity-detail-domain.js',
    'src/screens/activity/activity-detail-screen-model.js'
  ].map(path=>withVersion(path,version.domain));
  const shell=[
    contextModule,
    ...[
      'src/shell/legacy-adapter.js','src/shell/modal-stack.js','src/shell/shell-model.js',
      'src/shell/shell-renderer.js','src/shell/shell-renderer-direct-fix.js','src/shell/search-route-v11.js','src/shell/add-menu-v12.js','src/shell/vault-route-v13.js','src/shell/activity-route-v16.js','src/shell/preparation-route-v17.js','src/shell/plan-switch-v18.js','src/shell/navigation-audit-v17.js','src/shell/bootstrap.js'
    ].map(path=>withVersion(path,version.shell))
  ];
  globalThis.OUTBASE_MODULE_MANIFEST=Object.freeze({
    legacy:Object.freeze(legacy),data:Object.freeze(data),domain:Object.freeze(domain),shell:Object.freeze(shell),
    all:Object.freeze([...legacy,...data,...domain,...shell])
  });
})();
