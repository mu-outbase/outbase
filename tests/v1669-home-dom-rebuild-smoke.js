const fs=require('fs');
const renderer=fs.readFileSync('src/shell/shell-renderer.js','utf8');
const css=fs.readFileSync('style-v1669-home.css','utf8');
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const checks=[
  ['new home DOM',renderer.includes('ob10-dashboard')&&renderer.includes('ob10-command')&&renderer.includes('ob10-recent-row')],
  ['old home hero removed from home return',!renderer.includes('return `<section class="ob6-home-hero ob7-home-hero ob9-home-hero"')],
  ['home CSS linked',index.includes('style-v1669-home.css?v=outbase-v1669-home')],
  ['service worker cache',sw.includes('style-v1669-home.css?v=outbase-v1669-home')],
  ['home route scoped',css.includes('[data-ob6-route="home"] .ob3-main')],
  ['protected app excluded',!fs.existsSync('src/app.js')],
];
for(const [name,ok] of checks){if(!ok)throw new Error('FAIL: '+name);console.log('PASS:',name)}
