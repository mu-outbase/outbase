const fs=require('fs');
const css=fs.readFileSync('style-design-system.css','utf8');
const version=fs.readFileSync('src/config/version.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const checks=[
 ['v1666 lock',css.includes('OUTBASE v166.6 — magazine canvas')],
 ['full bleed next',css.includes('.ob9-next-hero{')&&css.includes('margin:0 -22px!important')],
 ['flat nav',css.includes('Navigation is a system bar')&&css.includes('border-radius:0!important')],
 ['flat story rows',css.includes('newspaper index')],
 ['vault cover',css.includes('one cover image')],
 ['cache bust',index.includes('outbase-v1666-magazine')],
 ['version',version.includes('v166.6-magazine-canvas-lock')]
];
for(const [name,ok] of checks){if(!ok)throw new Error(name);console.log('PASS',name)}
