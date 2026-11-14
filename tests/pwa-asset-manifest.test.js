import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('PWA precaches every actual runtime URL without duplicate requests',()=>{
 const root=new URL('../',import.meta.url),context=vm.createContext({});
 for(const name of ['src/config/version.js','src/config/module-manifest.js'])vm.runInContext(fs.readFileSync(new URL(name,root),'utf8'),context);
 const source=fs.readFileSync(new URL('service-worker.js',root),'utf8');
 const assets=vm.runInNewContext(source.slice(0,source.indexOf('self.addEventListener'))+'CORE_ASSETS');
 assert.equal(assets.length,new Set(assets).size);
 for(const path of context.OUTBASE_MODULE_MANIFEST.all)assert.ok(assets.includes('./'+path),'Missing runtime URL: '+path);
 const html=fs.readFileSync(new URL('index.html',root),'utf8');
 const entry=html.match(/src="(src\/runtime\/startup-loader.js[^\"]+)"/)[1];
 assert.ok(assets.includes('./'+entry),'Missing startup loader URL');
});
