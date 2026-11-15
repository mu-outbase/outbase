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
  c.add_init_script("if(window===top)sessionStorage.setItem('firstInstallLoads',String(Number(sessionStorage.getItem('firstInstallLoads')||0)+1));window.gpsCalls=0;Object.defineProperty(navigator,'geolocation',{value:{watchPosition(ok){gpsCalls++;window.gpsCallback=ok;return 0},clearWatch(){window.gpsCallback=null}}});")
  release.set();base=f'http://127.0.0.1:{server.server_port}/';page.goto(base+'?shell=1&view=calendar');page.wait_for_function('!!navigator.serviceWorker.controller',timeout=60000);f=page.frame_locator('#outbaseIntegratedCalendar');f.locator('body[data-story-calendar-status=ready]').wait_for();f.locator('#addEventBtn').click();f.locator('#eventForm [name=title]').fill('更新中の入力');f.locator('#eventForm [name=memo]').fill('保存まで残す')
  Handler.updated=True;page.evaluate('async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update()}');page.wait_for_function('!!window.OUTBASE_PWA_UPDATE_PENDING',timeout=60000);assert page.evaluate("sessionStorage.getItem('firstInstallLoads')")=='1';assert f.locator('[name=title]').input_value()=='更新中の入力'
  page.dispatch_event('body','focus');assert f.locator('[name=memo]').input_value()=='保存まで残す';print('Real PWA upgrade defers reload while calendar draft is open: PASS',flush=True)
  f.locator('#eventForm [type=submit]').click();page.wait_for_function("sessionStorage.getItem('firstInstallLoads')==='2' && !!window.OUTBASE_KOTA_WALK",timeout=60000);rows=page.evaluate("JSON.parse(localStorage.getItem('outbase_calendar_complete_v3_events')||'[]')");saved=[r for r in rows if r['title']=='更新中の入力'];assert len(saved)==1;assert saved[0]['memo']=='保存まで残す';assert not errors,errors
  print('Save then close triggers one upgrade reload and preserves submitted event: PASS',flush=True);c.close();b.close()
finally:
 release.set();server.shutdown();server.server_close()
