import { VERSION } from './config/version.js';
import { bindNavigation, registerRoute, go } from './core/router.js';
import { setAppStatus } from './ui/components.js';
import { renderHome } from './modules/home/home.js';
import { renderPrep } from './modules/prep/prep.js';
import { renderWalk } from './modules/walk/walk.js';
import { renderReview } from './modules/review/review.js';
import { registerServiceWorker } from './modules/pwa/pwa.js';

registerRoute('home', renderHome);
registerRoute('prep', renderPrep);
registerRoute('walk', renderWalk);
registerRoute('review', renderReview);

bindNavigation();
go('home');

registerServiceWorker().then((message) => setAppStatus(`${VERSION} / ${message}`));
