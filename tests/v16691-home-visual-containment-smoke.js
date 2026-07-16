const fs=require('fs');
const css=fs.readFileSync('style-v1669-home.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const required=[
  '.ob10-next-thumb{position:relative;isolation:isolate;contain:paint;',
  '.ob10-recent-thumb{position:relative;isolation:isolate;contain:paint;',
  '.ob10-next-thumb>.ob7-visual-fallback',
  '.ob10-recent-thumb>.ob7-visual-fallback',
  'position:absolute!important;inset:0!important;',
];
for(const token of required){if(!css.includes(token))throw new Error(`missing containment: ${token}`);}
if(!html.includes('outbase-v16691-homefix'))throw new Error('index cache-bust missing');
if(!sw.includes("outbase-field03-v16691-homefix"))throw new Error('service worker cache missing');
if(!sw.includes('style-v1669-home.css?v=outbase-v16691-homefix'))throw new Error('home CSS precache missing');
console.log('v166.9.1 home visual containment smoke: PASS');
