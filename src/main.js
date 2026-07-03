const BUILD_ID = 'core05-3-visual-ux-20260703';

import { bindNavigation, registerRoute, go } from './core/router.js?v=core05-3-visual-ux-20260703';
import { setAppStatus } from './ui/components.js?v=core05-3-visual-ux-20260703';
import { renderHome } from './modules/home/home.js?v=core05-3-visual-ux-20260703';
import { renderPrep } from './modules/prep/prep.js?v=core05-3-visual-ux-20260703';
import { renderWalk } from './modules/walk/walk.js?v=core05-3-visual-ux-20260703';
import { renderReview } from './modules/review/review.js?v=core05-3-visual-ux-20260703';
import { registerServiceWorker } from './modules/pwa/pwa.js?v=core05-3-visual-ux-20260703';

registerRoute('home', renderHome);
registerRoute('prep', renderPrep);
registerRoute('walk', renderWalk);
registerRoute('review', renderReview);

bindNavigation();
go('home');

registerServiceWorker().then(() => setAppStatus('β'));
