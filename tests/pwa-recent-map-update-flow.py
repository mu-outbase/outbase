"""Upgrade the actual audio-era SW to the GPS-era SW in a disposable browser.
Runs a temporary loopback server; requires git history, Playwright and Chromium.
No user browser profile or existing server is used.
"""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit, unquote
import subprocess
import re
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OLD='75de3edb70bb5a7dc67004eaf0e41e4c9af70f05'
CHANGED=['service-worker.js','src/config/module-manifest.js','src/shell/execution-route-v19.js','src/domain/activity/activity-detail-domain.js','src/runtime/startup-loader.js','src/config/version.js','index.html','src/domain/activity/location-recorder.js']
old_files={name:subprocess.check_output(['git','show',f'{OLD}:{name}'],cwd=ROOT) for name in CHANGED}
new_files={name:(ROOT/name).read_bytes() for name in CHANGED+['src/domain/activity/location-recorder.js']}
CURRENT_CACHE=re.search(rb"const CACHE_NAME='([^']+)'",new_files['service-worker.js']).group(1).decode()
class Handler(SimpleHTTPRequestHandler):
 current=False
 second_update=False
 def log_message(self,*args):pass
 def do_GET(self):
  name=unquote(urlsplit(self.path).path).lstrip('/') or 'index.html'
  if name in new_files:
   files=new_files if Handler.current else old_files
   if name not in files:self.send_error(404);return
   body=files[name]
   if name=='service-worker.js' and Handler.second_update:body+=b'\n// Disposable second-update fixture.\n'
   self.send_response(200);self.send_header('Content-Type','text/html' if name=='index.html' else 'application/javascript');self.send_header('Cache-Control','no-store' if name=='service-worker.js' else 'public, max-age=86400');self.end_headers();self.wfile.write(body);return
  super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);c=b.new_context(viewport={'width':393,'height':852});page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  c.add_init_script("sessionStorage.setItem('pwaLoads',String(Number(sessionStorage.getItem('pwaLoads')||0)+1))")
  base=f'http://127.0.0.1:{server.server_port}/'
  page.goto(base+'?shell=1&view=home');page.wait_for_function('!!window.OUTBASE_REPOSITORIES_V160');page.evaluate('async()=>{await navigator.serviceWorker.ready}')
  page.wait_for_function('!!navigator.serviceWorker.controller && !!window.OUTBASE_REPOSITORIES_V160');page.wait_for_timeout(700);page.wait_for_function('!!window.OUTBASE_REPOSITORIES_V160')
  assert page.evaluate('OUTBASE_VERSION.shell')=='outbase-r1-gate2-contract-boundary-v1-shell'
  assert page.evaluate('async()=> (await caches.keys()).includes("outbase-kota-screen-awake-v1")')
  saved=page.evaluate('''async()=>{
   const r=OUTBASE_REPOSITORIES_V160;
   const activity=await r.activities.save({title:'更新で残る活動',type:'walk',state:'planned',visibility:'private'});
   const record=await r.records.save({activity_id:activity.id,type:'note',payload:{text:'更新で残るメモ'},visibility:'private'});
   const media=await r.media.save({activity_id:activity.id,record_id:record.id,media_type:'photo',blob:new Blob([new Uint8Array([0,1,2,253,254,255])],{type:'image/png'}),mime_type:'image/png',size:6});
   localStorage.setItem('outbase-pwa-update-sentinel','更新前の値');
   return {activity,record,mediaId:media.id,databases:(await indexedDB.databases()).map(d=>({name:d.name,version:d.version})).sort((a,b)=>a.name.localeCompare(b.name))};
  }''')
  print('Previous SW active; activity, memo, Blob and localStorage saved: PASS',flush=True)
  Handler.current=True
  page.evaluate('''async()=>{
   sessionStorage.removeItem('pwaChanged');navigator.serviceWorker.addEventListener('controllerchange',()=>sessionStorage.setItem('pwaChanged','yes'),{once:true});
   const reg=await navigator.serviceWorker.getRegistration();await reg.update();
  }''')
  try:page.wait_for_function("sessionStorage.getItem('pwaChanged')==='yes' && window.OUTBASE_VERSION?.shell==='outbase-gear-meal-link-20261115-v1'",timeout=60000)
  except Exception:
   print(page.evaluate("async()=>({marker:sessionStorage.getItem('pwaChanged'),gps:typeof OUTBASE_LOCATION_RECORDER,caches:await caches.keys(),sw:(await navigator.serviceWorker.getRegistration())?.active?.scriptURL})"),errors,flush=True)
   raise
  page.wait_for_function('async name=> (await caches.keys()).includes(name)',arg=CURRENT_CACHE)
  assert page.evaluate('async()=> (await caches.keys()).includes("outbase-kota-screen-awake-v1")') is False
  page.wait_for_function('!!window.OUTBASE_LOCATION_RECORDER')
  after=page.evaluate('''async saved=>{
   const r=OUTBASE_REPOSITORIES_V160,media=await r.media.get(saved.mediaId);
   return {activity:await r.activities.get(saved.activity.id),record:await r.records.get(saved.record.id),bytes:Array.from(new Uint8Array(await media.blob.arrayBuffer())),local:localStorage.getItem('outbase-pwa-update-sentinel'),databases:(await indexedDB.databases()).map(d=>({name:d.name,version:d.version})).sort((a,b)=>a.name.localeCompare(b.name))};
  }''',saved)
  assert after['activity']==saved['activity'];assert after['record']==saved['record'];assert after['bytes']==[0,1,2,253,254,255];assert after['local']=='更新前の値';assert after['databases']==saved['databases']
  print('SW upgrades and removes old cache without changing records, Blob or database schema: PASS',flush=True)
  before=page.evaluate("Number(sessionStorage.getItem('pwaLoads'))")
  Handler.second_update=True
  page.evaluate('async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update()}')
  page.wait_for_function("before=>Number(sessionStorage.getItem('pwaLoads'))===before+1 && !!window.OUTBASE_LOCATION_RECORDER",arg=before)
  page.wait_for_timeout(700);assert page.evaluate("Number(sessionStorage.getItem('pwaLoads'))")==before+1
  print('Another update in the same tab reloads exactly once: PASS',flush=True)
  c.set_offline(True);page.goto(base+'?shell=1&view=record&activityId='+saved['activity']['id']);page.locator('[data-ob19-control]').wait_for();page.wait_for_function('!!window.OUTBASE_LOCATION_RECORDER');page.locator('[data-ob19-control]').click();page.get_by_role('button',name='一時停止',exact=True).wait_for()
  assert page.evaluate('async id=>(await OUTBASE_REPOSITORIES_V160.activities.get(id)).state',saved['activity']['id'])=='active'
  page.locator('[data-walk-map]').wait_for();assert page.locator('[data-walk-map-empty]').count()==1
  print('Updated PWA opens execution offline and persists activity start: PASS',flush=True)
  assert not errors,errors;c.close();b.close()
finally:
 server.shutdown();server.server_close()
