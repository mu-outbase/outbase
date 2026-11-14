"""Browser regression: requires Python Playwright, system Chromium and a local static server.
Run: OUTBASE_TEST_URL=http://127.0.0.1:8765/ python tests/story-calendar-flow.py
All application data is confined to disposable browser contexts.
"""
import os
from playwright.sync_api import sync_playwright
import json
from datetime import datetime,timedelta
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);c=b.new_context(viewport={'width':393,'height':852},timezone_id='Asia/Tokyo');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
 base=os.environ.get('OUTBASE_TEST_URL','http://127.0.0.1:8765/').rstrip('/')+'/'
 page.goto(base+'?shell=1&view=calendar');f=page.frame_locator('#outbaseIntegratedCalendar');f.locator('body[data-story-calendar-status=ready]').wait_for();assert not page.evaluate('indexedDB.databases()');print('Empty calendar does not create DB: PASS',flush=True)
 day=(datetime.now()+timedelta(days=1)).strftime('%Y-%m-%d')
 page.goto(base+'?shell=1&view=plan-editor&returnShell=home');form=page.locator('[data-ob22-plan-form]');form.wait_for();page.wait_for_timeout(1500)
 form.locator('[name=title]').fill('活動連動確認');form.locator('[name=startDate]').fill(day);form.locator('[name=endDate]').fill(day);form.locator('button[type=submit]').click();page.wait_for_url('**view=activity**')
 activity_id=page.evaluate('OUTBASE_ROUTER.current().activityId')
 initial=page.evaluate('async()=>({activities:await OUTBASE_REPOSITORIES_V160.activities.all(),entries:await OUTBASE_REPOSITORIES_V160.calendarEntries.all()})')
 page.get_by_role('button',name='カレンダー',exact=True).click();f.locator('[data-view=list]').click();f.get_by_text('活動連動確認',exact=True).wait_for();print('Activity shown in calendar: PASS',flush=True)
 after=page.evaluate('async()=>({activities:await OUTBASE_REPOSITORIES_V160.activities.all(),entries:await OUTBASE_REPOSITORIES_V160.calendarEntries.all()})');assert initial==after;print('Calendar display leaves activity DB unchanged: PASS',flush=True)
 # Native calendar save must not copy Story rows into legacy localStorage.
 f.locator('#addEventBtn').click();f.locator('[name=title]').fill('従来予定確認');f.locator('#eventForm button[type=submit]').click();page.wait_for_timeout(300)
 rows=page.evaluate('JSON.parse(localStorage.getItem("outbase_calendar_complete_v3_events"))');assert all('storyActivityId' not in x for x in rows);assert any(x['title']=='従来予定確認' for x in rows);print('Native save does not copy activity data: PASS',flush=True)
 f.get_by_text('活動連動確認',exact=True).first.click();page.wait_for_url('**view=activity**');assert page.evaluate('OUTBASE_ROUTER.current().activityId')==activity_id;print('Calendar card opens source activity: PASS',flush=True)
 page.goto(base+'?shell=1&view=plan-editor&activityId='+activity_id);form.wait_for();page.wait_for_timeout(600);form.locator('[name=title]').fill('活動編集確認');form.locator('button[type=submit]').click();page.wait_for_url('**view=activity**')
 page.get_by_role('button',name='カレンダー',exact=True).click();f.locator('[data-view=list]').click();f.get_by_text('活動編集確認',exact=True).wait_for();print('Activity edit reflected in calendar: PASS',flush=True)
 page.reload();f.locator('[data-view=list]').click();f.get_by_text('活動編集確認',exact=True).wait_for();print('Activity survives reload: PASS',flush=True)
 page.goto(base+'?shell=1&view=plan-editor&activityId='+activity_id);page.locator('[data-ob22-plan-delete]').wait_for();page.wait_for_timeout(600);page.locator('[data-ob22-plan-delete]').click();page.wait_for_url('**view=home**')
 page.get_by_role('button',name='カレンダー',exact=True).click();f.locator('[data-view=list]').click();f.locator('body[data-story-calendar-status=ready]').wait_for();assert f.get_by_text('活動編集確認',exact=True).count()==0;assert f.get_by_text('従来予定確認',exact=True).count()>0;print('Activity deletion reflected; native event preserved: PASS',flush=True)
 page.goto(base+'calendar-formal-v44.html');page.locator('body[data-story-calendar-status=ready]').wait_for();print('Standalone calendar read: PASS',flush=True)
 assert not errors,errors;print('JavaScript errors: NONE',flush=True)
 c.close();c=b.new_context();page=c.new_page();page.goto(base+'tests/r1-gate2-contracts.test.html');page.wait_for_function('globalThis.OUTBASE_R1_GATE2_TEST_RESULT !== undefined',timeout=60000);r=page.evaluate('OUTBASE_R1_GATE2_TEST_RESULT');assert r['ok'];print('Gate2:',r['passed'],'/',r['total'],flush=True);c.close();b.close()
