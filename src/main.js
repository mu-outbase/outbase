const BUILD_ID = 'core05-12-calendar-edit-recurring-20260703';

import { bindNavigation, registerRoute, go } from './core/router.js?v=core05-12-calendar-edit-recurring-20260703';
import { setAppStatus, applyRuntimeTheme } from './ui/components.js?v=core05-12-calendar-edit-recurring-20260703';
import { renderHome } from './modules/home/home.js?v=core05-12-calendar-edit-recurring-20260703';
import { renderSearch } from './modules/search/search.js?v=core05-12-calendar-edit-recurring-20260703';
import { renderPrep } from './modules/prep/prep.js?v=core05-12-calendar-edit-recurring-20260703';
import { renderDay } from './modules/day/day.js?v=core05-12-calendar-edit-recurring-20260703';
import { renderWalk } from './modules/walk/walk.js?v=core05-12-calendar-edit-recurring-20260703';
import { renderMemory } from './modules/memory/memory.js?v=core05-12-calendar-edit-recurring-20260703';
import { registerServiceWorker } from './modules/pwa/pwa.js?v=core05-12-calendar-edit-recurring-20260703';

const runtime = applyRuntimeTheme();
document.body.dataset.build = BUILD_ID;

registerRoute('home', renderHome);
registerRoute('search', renderSearch);
registerRoute('prep', renderPrep);
registerRoute('day', renderDay);
registerRoute('walk', renderWalk);
registerRoute('memory', renderMemory);
registerRoute('review', renderMemory);

bindNavigation();
go('home');

registerServiceWorker().then(() => setAppStatus(runtime.label));
window.setInterval(() => setAppStatus(applyRuntimeTheme().label), 10 * 60 * 1000);
