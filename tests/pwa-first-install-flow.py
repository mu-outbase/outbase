"""First SW claim must preserve an in-progress walk; actual upgrades still reload once."""
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread,Event
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];release=Event()
class Handler(SimpleHTTPRequestHandler):
 updated=False
 def log_message(self,*args):pass
 def do_GET(self):
  name=urlsplit(self.path).path
  if name=='/assets/default-covers/lake.jpg':release.wait(30)
  if name=='/service-worker.js':
   body=(ROOT/'service-worker.js').read_bytes()+(b'\n// Upgrade fixture\n' if Handler.updated else b'')
   self.send_response(200);self.send_header('Content-Type','application/javascript');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body);return
  super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)));Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);c=b.new_context(**p.devices['Pixel 7']);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  c.add_init_script("sessionStorage.setItem('firstInstallLoads',String(Number(sessionStorage.getItem('firstInstallLoads')||0)+1));window.gpsCalls=0;Object.defineProperty(navigator,'geolocation',{value:{watchPosition(ok){gpsCalls++;window.gpsCallback=ok;return 0},clearWatch(){window.gpsCallback=null}}});")
  base=f'http://127.0.0.1:{server.server_port}/';page.goto(base+'?shell=1&view=start');page.locator('[data-kota-start-gps]').check();page.locator('[data-ob22-kota-start]').click();page.get_by_role('button',name='一時停止',exact=True).wait_for();page.wait_for_function('gpsCalls===1');aid=page.evaluate('OUTBASE_ROUTER.current().activityId');page.locator('[data-kota-event=pee]').tap();page.wait_for_function('document.querySelector("[data-kota-event=pee]").textContent.includes("1回")')
  assert page.evaluate('!!navigator.serviceWorker.controller') is False
  page.evaluate('window.walkNode=document.querySelector("[data-kota-walk]")');release.set();page.wait_for_function('!!navigator.serviceWorker.controller',timeout=60000);page.wait_for_timeout(500)
  assert page.evaluate("sessionStorage.getItem('firstInstallLoads')")=='1';assert page.evaluate('OUTBASE_ROUTER.current().activityId')==aid;assert page.evaluate('gpsCalls')==1;assert page.evaluate('!!gpsCallback');assert page.evaluate('walkNode===document.querySelector("[data-kota-walk]")')
  page.locator('[data-kota-event=water]').tap();page.wait_for_function('document.querySelector("[data-kota-event=water]").textContent.includes("1回")');print('First install claims PWA without reloading or interrupting GPS, route, walk DOM and events: PASS',flush=True)
  Handler.updated=True;page.evaluate('async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update()}');page.wait_for_function("sessionStorage.getItem('firstInstallLoads')==='2' && !!window.OUTBASE_KOTA_WALK",timeout=60000);page.locator('[data-kota-walk]').wait_for();page.wait_for_timeout(300)
  assert page.evaluate("sessionStorage.getItem('firstInstallLoads')")=='2';assert page.evaluate('OUTBASE_ROUTER.current().activityId')==aid;assert page.evaluate('gpsCalls')==0;assert '1回' in page.locator('[data-kota-event=pee]').inner_text();assert '1回' in page.locator('[data-kota-event=water]').inner_text();assert not errors,errors
  print('Actual upgrade reloads once, preserves saved walk and events, and does not restart GPS silently: PASS',flush=True);c.close();b.close()
finally:
 release.set();server.shutdown();server.server_close()
