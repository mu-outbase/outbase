const fs=require('fs');
const renderer=fs.readFileSync('src/shell/shell-renderer.js','utf8');
const css=fs.readFileSync('style-design-system.css','utf8');
const checks=[
  ['editorial home',renderer.includes('ob9-home-hero')&&renderer.includes('ob9-recent-rail')],
  ['flat quick actions',renderer.includes('ob9-quick-primary')&&renderer.includes('ob9-quick-secondary')],
  ['search horizontal rail',renderer.includes('ob9-search-rail')&&renderer.includes('ob9-search-panel')],
  ['vault bento',renderer.includes('ob9-vault-bento')&&renderer.includes('ob9-bento-main')],
  ['flat add sheet',renderer.includes('ob9-sheet-line')],
  ['display type correction',renderer.includes('displayTypeKey')],
  ['no field03 edit',!fs.existsSync('src/app.js')],
  ['css editorial lock',css.includes('OUTBASE v166.5 — editorial layout')],
  ['horizontal recent',css.includes('scroll-snap-type:x mandatory')],
  ['no external assets',!css.includes('@import')&&!renderer.includes('http://')&&!renderer.includes('https://')]
];
for(const [name,ok] of checks){if(!ok)throw new Error(`FAIL ${name}`);console.log(`PASS ${name}`);}
