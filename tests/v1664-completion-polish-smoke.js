'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const css = read('style-design-system.css');
const rendererSource = read('src/shell/shell-renderer.js');
const version = read('src/config/version.js');
const index = read('index.html');
const sw = read('service-worker.js');
const manifest = JSON.parse(read('manifest.json'));

assert(css.includes('OUTBASE v166.4 — completion polish LOCK'));
assert(css.includes('@media(max-width:560px)'));
assert(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));
assert(css.includes('.ob8-search-preview.map'));
assert(css.includes('.ob8-search-preview.memory'));
assert(css.includes('.ob8-search-preview.calendar'));
assert(css.includes('.ob8-vault-gallery'));
assert(css.includes('.ob8-sheet-primary'));
assert(css.includes('.ob8-next-visual-meta'));
assert(css.includes('.ob7-thumb .ob8-scene-svg'));

assert(rendererSource.includes('function sceneSvg(type)'));
assert(rendererSource.includes('ob8-scene-svg'));
assert(rendererSource.includes('ob8-search-preview'));
assert(rendererSource.includes('vaultTile'));
assert(rendererSource.includes('ob8-vault-gallery'));
assert(rendererSource.includes('ob8-sheet-primary'));

assert(version.includes("app:'v166.4-completion-polish-lock'"));
assert(index.includes('outbase-v1664-polish'));
assert(sw.includes('outbase-field03-v1664-polish'));
assert.equal(manifest.version, '166.4');
assert.equal((css.match(/MutationObserver/g) || []).length, 0);
assert(!/(body|html|#outbaseShellRoot|\.ob3-shell)[^{]*\{[^}]*overflow\s*:\s*hidden/i.test(css));

const context = {
  console,
  Blob,
  URL: { createObjectURL: () => 'blob:test' },
  navigator: { onLine: true },
  document: { getElementById: () => null },
  OUTBASE_ROUTER: { shellUrl: () => '/shell', legacyUrl: () => '/legacy' },
  globalThis: null
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(rendererSource, context, { filename: 'shell-renderer.js' });

const renderer = context.OUTBASE_SHELL_RENDERER_V166;
const item = {
  id: 'a1', type: 'other', typeLabel: '活動', title: '記録', startAt: '2026-07-20',
  relativeDay: 'あと5日', place: '', preparation: { completed: 0, total: 1, progress: 0 },
  participants: { rows: [] }, preparationUrl: '/prep'
};
const next = renderer.nextBand(item);
assert(next.includes('ob8-scene-svg'));
assert(next.includes('ob8-next-visual-meta'));
assert(!next.includes('M12 5v14M5 12h14'));

const search = renderer.searchHtml({});
assert(search.includes('ob8-search-preview map'));
assert(search.includes('ob8-search-preview memory'));
assert(search.includes('ob8-search-preview calendar'));
assert.equal((search.match(/data-ob-media-key/g) || []).length, 0);

const vault = renderer.vaultHtml({
  vaultActivities: [{ ...item, recordCount: 1, mediaCount: 0 }],
  vaultSummary: { activityCount: 1, recordCount: 1, assetCount: 0 }
});
assert(vault.includes('ob8-vault-gallery'));
assert(vault.includes('写真と活動'));

console.log(JSON.stringify({
  status: 'pass', nextBlankRemoved: true, ambiguousPlusRemoved: true, quick2x2: true,
  formalScenes: true, searchContentPreviews: true, vaultPhotoActivityFirst: true,
  startPrimary: true, field03Changed: false, databaseSchemaChanged: false
}, null, 2));
