"""Mobile emulation and PWA manifest routing; does not replace Android hardware testing."""
import os,json
from playwright.sync_api import sync_playwright
base=os.environ.get('OUTBASE_TEST_URL','http://127.0.0.1:8766/').rstrip('/')+'/'
with sync_playwright() as p:
 args=['--no-sandbox']
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=args);c=b.new_context(**p.devices['Pixel 7'],timezone_id='Asia/Tokyo');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'?shell=1&view=plan-editor&returnShell=home');form=page.locator('[data-ob22-plan-form]');form.wait_for();page.wait_for_timeout(1200);form.locator('[name=title]').fill('モバイル導線検証');form.locator('[type=submit]').click();page.wait_for_url('**view=activity**');aid=page.evaluate('OUTBASE_ROUTER.current().activityId');page.wait_for_timeout(500)
 source=page.evaluate('async id=>await OUTBASE_REPOSITORIES_V160.activities.get(id)',aid)
 def check_width():assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),page.url
 check_width();page.locator('[data-ob17-context=preparation]').first.tap();page.locator('[data-ob17-start]').wait_for();check_width();prep_url=page.url
 page.evaluate('OUTBASE_ROUTER.applyScrollY(350)');page.wait_for_timeout(200);scroll=page.evaluate('OUTBASE_ROUTER.viewportScrollY()');page.locator('[data-ob17-start]').tap();page.locator('[data-ob19-control]').wait_for();check_width();page.locator('[data-ob19-back]').tap();page.wait_for_url('**view=preparation**');page.wait_for_timeout(400);assert page.url==prep_url
 assert abs(page.evaluate('OUTBASE_ROUTER.viewportScrollY()')-scroll)<100,(scroll,page.evaluate('OUTBASE_ROUTER.viewportScrollY()'))
 print('Pixel 7 touch: detail → preparation → execution → Back once; scroll restored: PASS',flush=True)
 page.go_back();page.wait_for_url('**view=activity**');page.wait_for_timeout(400);assert page.evaluate('OUTBASE_ROUTER.current().activityId')==aid
 assert page.evaluate('async id=>await OUTBASE_REPOSITORIES_V160.activities.get(id)',aid)==source;print('Browser Back returns to the same activity without mutating saved rows: PASS',flush=True)
 page.goto(base+'?shell=1&view=home');page.wait_for_function('!!navigator.serviceWorker.controller && document.documentElement.classList.contains("outbaseShellReady")');page.wait_for_timeout(700);c.set_offline(True);page.reload();page.wait_for_function('!!window.OUTBASE_IMPROVEMENT_PREPARATION && document.documentElement.classList.contains("outbaseShellReady")');check_width();c.set_offline(False);print('Pixel 7 offline HOME startup and no horizontal overflow: PASS',flush=True)
 manifest=page.evaluate('async()=>await (await fetch("manifest.json?v=outbase-v1663-visual")).json()');print('PWA shortcuts:',json.dumps(manifest['shortcuts'],ensure_ascii=False),flush=True)
 page.goto(base+manifest['shortcuts'][0]['url'].removeprefix('./'));page.locator('[data-ob22-quick-start]').wait_for();assert page.evaluate('OUTBASE_ROUTER.current().name')=='start'
 assert page.evaluate('async()=> (await OUTBASE_REPOSITORIES_V160.activities.all()).length')==1
 page.locator('[data-ob22-start-plan="'+aid+'"]').tap();page.locator('[data-ob19-control]').wait_for();assert page.evaluate('OUTBASE_ROUTER.current().activityId')==aid
 assert page.evaluate('async id=>await OUTBASE_REPOSITORIES_V160.activities.get(id)',aid)==source
 print('PWA start shortcut opens current start screen and selects the existing activity without writes: PASS',flush=True)
 page.go_back();page.wait_for_url('**view=start**');page.locator('[data-ob22-quick-start]').wait_for();print('Browser Back from shortcut execution returns to activity selection once: PASS',flush=True)
 assert not errors,errors;print('Page errors: NONE',flush=True);c.close();b.close()
