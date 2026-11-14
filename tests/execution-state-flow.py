"""Execution persistence regression in disposable browser contexts.
Requires Python Playwright, system Chromium and a local OUTBASE static server.
Run: OUTBASE_TEST_URL=http://127.0.0.1:8765/ python tests/execution-state-flow.py
"""
import os
from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);c=b.new_context(viewport={'width':393,'height':852},timezone_id='Asia/Tokyo');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 base=os.environ.get('OUTBASE_TEST_URL','http://127.0.0.1:8765/').rstrip('/')+'/'
 page.goto(base+'?shell=1&view=plan-editor&returnShell=home');form=page.locator('[data-ob22-plan-form]');form.wait_for();page.wait_for_timeout(1200);form.locator('[name=title]').fill('状態保存検証');form.locator('button[type=submit]').click();page.wait_for_url('**view=activity**');aid=page.evaluate('OUTBASE_ROUTER.current().activityId')
 record=base+'?shell=1&view=record&activityId='+aid
 page.goto(record);page.locator('[data-ob19-control]').wait_for();page.wait_for_timeout(500)
 async_state='async id=>(await OUTBASE_REPOSITORIES_V160.activities.get(id)).state'
 def wait_state(value):page.wait_for_function('async ({id,state})=>(await OUTBASE_REPOSITORIES_V160.activities.get(id)).state===state',arg={'id':aid,'state':value});page.wait_for_timeout(200)
 page.locator('[data-ob19-control]').click();wait_state('active');assert '一時停止' in page.locator('[data-ob19-control]').inner_text();print('Start persisted: PASS',flush=True)
 page.wait_for_timeout(1200);page.reload();page.get_by_role('button',name='一時停止',exact=True).wait_for();assert page.evaluate(async_state,aid)=='active';print('Active state restored after reload: PASS',flush=True)
 page.locator('[data-ob19-control]').click();wait_state('paused');saved=page.evaluate('async id=>(await OUTBASE_REPOSITORIES_V160.activities.get(id)).metadata.execution_session_v1.elapsed_ms',aid);assert saved>=1000
 other=c.new_page();other.goto(record);other.get_by_role('button',name='再開',exact=True).wait_for();assert '一時停止中' in other.locator('.ob19-session').inner_text();print('Paused state restored in another tab: PASS',flush=True);other.close();c.set_offline(True)
 page.locator('[data-ob19-control]').click();wait_state('active');print('Offline resume persisted: PASS',flush=True);c.set_offline(False)
 page.evaluate('()=>{OUTBASE_REPOSITORIES_V160.activities.save=async()=>{throw new DOMException("test quota","QuotaExceededError")}}')
 page.locator('[data-ob19-control]').click();page.get_by_text('活動状態を保存できませんでした。操作前の状態を保っています。もう一度お試しください。',exact=True).wait_for();assert page.evaluate(async_state,aid)=='active';assert '一時停止' in page.locator('[data-ob19-control]').inner_text();print('Save failure visible; persisted state unchanged: PASS',flush=True)
 page.evaluate('()=>{delete OUTBASE_REPOSITORIES_V160.activities.save}')
 page.locator('[data-ob19-end]').click();wait_state('organizing');assert page.locator('[data-ob19-control]').is_disabled();print('End persisted as organizing; restart disabled: PASS',flush=True)
 page.reload();page.get_by_text('終了・整理待ち',exact=True).first.wait_for();assert page.locator('[data-ob19-control]').is_disabled();ended=page.evaluate('async id=>(await OUTBASE_REPOSITORIES_V160.activities.get(id)).metadata.execution_session_v1',aid);assert ended['elapsed_ms']>=saved;print('Ended state and elapsed time restored: PASS',flush=True)
 print('Saved session',json.dumps(ended),flush=True)
 page.get_by_role('button',name='保管庫',exact=True).click();page.get_by_text('状態保存検証',exact=True).first.wait_for();print('Ended activity visible in vault: PASS',flush=True)
 assert not errors,errors;print('Page errors: NONE',flush=True)
 c.close();b.close()
