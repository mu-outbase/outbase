"""Execution memo regression using disposable browser contexts.
Requires Python Playwright, Chromium and a local static server.
Run: OUTBASE_TEST_URL=http://127.0.0.1:8765/ python tests/execution-memo-flow.py
"""
import os
from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);c=b.new_context(viewport={'width':393,'height':852},timezone_id='Asia/Tokyo');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 base=os.environ.get('OUTBASE_TEST_URL','http://127.0.0.1:8765/').rstrip('/')+'/'
 page.goto(base+'?shell=1&view=plan-editor&returnShell=home');form=page.locator('[data-ob22-plan-form]');form.wait_for();page.wait_for_timeout(1100);form.locator('[name=title]').fill('メモ保存先確認');form.locator('button[type=submit]').click();page.wait_for_url('**view=activity**');aid=page.evaluate('OUTBASE_ROUTER.current().activityId')
 # Navigate through preparation so Back after a saved memo has an unambiguous origin.
 page.locator('[data-ob17-context=preparation]').first.click();page.locator('[data-ob17-start]').click();page.locator('[data-ob19-control]').click();page.get_by_role('button',name='一時停止',exact=True).wait_for()
 record_url=page.url;page.locator('[data-ob19-feature=memo]').click();form=page.locator('[data-ob22-memo-form]');form.wait_for();page.wait_for_timeout(400)
 assert form.locator('select[name=activityId]').is_disabled();assert form.locator('input[name=activityId]').input_value()==aid;print('Execution memo destination locked: PASS',flush=True)
 form.locator('[name=title]').fill('検証メモ');body='検証用の気づき\n次回も確認する <script>window.memoInjected=true</script>';form.locator('[name=body]').fill(body)
 other_id=page.evaluate('async()=> (await OUTBASE_REPOSITORIES_V160.activities.save({title:"別の活動",type:"walk",state:"planned",visibility:"private"})).id')
 form.locator('input[name=activityId]').evaluate('(node,id)=>{node.value=id}',other_id)
 form.locator('button[type=submit]').click();form.locator('[data-ob22-memo-status]').filter(has_text='保存できませんでした').wait_for();assert page.evaluate('async()=> (await OUTBASE_REPOSITORIES_V160.records.all()).length')==0
 form.locator('input[name=activityId]').evaluate('(node,id)=>{node.value=id}',aid);print('Mismatched memo destination rejected: PASS',flush=True)
 page.evaluate('()=>{OUTBASE_REPOSITORIES_V160.records.save=async()=>{throw new DOMException("test quota","QuotaExceededError")}}')
 form.locator('button[type=submit]').click();form.locator('[data-ob22-memo-status]').filter(has_text='保存できませんでした').wait_for();assert form.locator('[name=body]').input_value()==body;assert page.evaluate('async()=> (await OUTBASE_REPOSITORIES_V160.records.all()).length')==0;print('Failed save retains input and writes no record: PASS',flush=True)
 page.evaluate('()=>{delete OUTBASE_REPOSITORIES_V160.records.save}');c.set_offline(True)
 form.evaluate('(form)=>{form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));}')
 page.wait_for_url('**view=record**');page.locator('.ob19-saved-notes').wait_for();c.set_offline(False);assert page.url==record_url
 rows=page.evaluate('async()=>OUTBASE_REPOSITORIES_V160.records.all()');assert len(rows)==1;assert rows[0]['activity_id']==aid;assert rows[0]['payload']['text']==body;assert page.evaluate('window.memoInjected===true') is False;print('Single memo saved to source activity; returned to execution: PASS',flush=True)
 page.locator('.ob19-saved-notes summary').click();assert body in page.locator('.ob19-saved-notes').inner_text();print('Saved memo body rendered safely: PASS',flush=True)
 page.reload();page.locator('.ob19-saved-notes summary').wait_for();page.locator('.ob19-saved-notes summary').click();assert body in page.locator('.ob19-saved-notes').inner_text();page.get_by_role('button',name='一時停止',exact=True).wait_for();print('Memo and active state restored after reload: PASS',flush=True)
 page.go_back();page.wait_for_url('**view=preparation**');print('Back after memo returns to preparation in one step: PASS',flush=True)
 # Cancel writes nothing and returns to execution.
 page.locator('[data-ob17-start]').click();page.locator('[data-ob19-feature=memo]').click();form.wait_for();form.locator('[name=body]').fill('保存しない内容');form.get_by_role('button',name='キャンセル',exact=True).click();page.wait_for_url('**view=record**');assert len(page.evaluate('async()=>OUTBASE_REPOSITORIES_V160.records.all()'))==1;print('Cancel returns without saving: PASS',flush=True)
 assert not errors,errors;print('Page errors: NONE',flush=True)
 c.close()
 # Calendar-only projections must not become selectable activity IDs.
 c=b.new_context();page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'?shell=1&view=home');page.wait_for_function('document.documentElement.classList.contains("outbaseShellReady")')
 page.evaluate('()=>localStorage.setItem("outbase_calendar_complete_v3_events",JSON.stringify([{id:"native-only",title:"カレンダーだけの予定",start:"2099-01-01T09:00",end:"2099-01-01T10:00",calendarId:"activity"}]))')
 page.goto(base+'?shell=1&view=memo');form=page.locator('[data-ob22-memo-form]');form.wait_for();page.wait_for_timeout(500)
 assert 'カレンダーだけの予定' not in form.locator('select[name=activityId]').inner_text();print('Calendar projections excluded from writable destinations: PASS',flush=True)
 form.locator('[name=body]').fill('活動なしの検証メモ');form.locator('button[type=submit]').click();page.wait_for_url('**view=home**')
 rows=page.evaluate('async()=>OUTBASE_REPOSITORIES_V160.records.all()');activities=page.evaluate('async()=>OUTBASE_REPOSITORIES_V160.activities.all()');assert len(rows)==1 and rows[0]['activity_id'] is None;assert activities==[];print('Unclassified memo saved without synthetic activity: PASS',flush=True)
 assert not errors,errors;c.close();b.close()
