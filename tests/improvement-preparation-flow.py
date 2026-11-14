"""Core04: explicit classification and atomic transfer in disposable storage."""
import os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);c=b.new_context(viewport={'width':393,'height':852});page=c.new_page();errors=[];page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE ERROR:',page.url,e,flush=True)))
 base=os.environ.get('OUTBASE_TEST_URL','http://127.0.0.1:8766/').rstrip('/')+'/'
 page.goto(base+'?shell=1&view=plan-editor&returnShell=home');form=page.locator('[data-ob22-plan-form]');form.wait_for();page.wait_for_timeout(1100);form.locator('[name=title]').fill('振り返る活動');form.locator('button[type=submit]').click();page.wait_for_url('**view=activity**');aid=page.evaluate('OUTBASE_ROUTER.current().activityId')
 cases=[('shopping','食材の買い過ぎを減らす'),('gear','予備タオルを持参'),('pet','コタの水を準備'),('note','出発を30分早める')];ids=[]
 for category,text in cases:
  page.goto(base+'?shell=1&view=memo&target=improvement&activityId='+aid);form=page.locator('[data-ob22-memo-form]');form.wait_for();page.wait_for_timeout(400);form.locator('[name=body]').fill(text);form.locator('[type=submit]').click();page.wait_for_url('**view=activity**');page.locator('[data-ob16-transfer]').first.wait_for(state='attached')
 page.get_by_text('追加先の予定がありません。先に次の活動の予定を作成してください。',exact=True).wait_for()
 assert page.evaluate('async()=> (await OUTBASE_REPOSITORIES_V160.preparationItems.all()).length')==0;print('Improvement memos do not create preparation rows before explicit transfer: PASS',flush=True)
 target=page.evaluate('async()=> (await OUTBASE_REPOSITORIES_V160.activities.save({title:"次回キャンプ",type:"camp",state:"planned",visibility:"private"})).id')
 rows=page.evaluate('async()=>OUTBASE_REPOSITORIES_V160.improvementItems.all()');ids=[next(r['id'] for r in rows if r['summary']==text) for _,text in cases]
 page.reload();page.wait_for_function('document.querySelector("[data-ob16-transfer] button[type=submit]:not([disabled])")');page.locator('[data-ob16-improvement="'+ids[0]+'"] > summary').click();first=page.locator('[data-ob16-transfer="'+ids[0]+'"]');first.locator('[type=submit]:enabled').wait_for();first.locator('[name=destination]').select_option(target);first.locator('[name=category]').select_option('shopping')
 outcome=page.evaluate('async args=>{try{await OUTBASE_IMPROVEMENT_PREPARATION.apply(args);return "unexpected"}catch(e){return e.message}}',{'improvementId':ids[0],'displayActivityId':target,'targetActivityId':aid,'category':'shopping','title':cases[0][1]});assert outcome=='improvement_missing'
 page.evaluate('async id=>{const a=await OUTBASE_REPOSITORIES_V160.activities.get(id);await OUTBASE_REPOSITORIES_V160.activities.save({...a,state:"active"})}',target)
 first.locator('[type=submit]').click();first.locator('[role=status]').filter(has_text='保存できませんでした').wait_for();assert page.evaluate('async()=> (await OUTBASE_REPOSITORIES_V160.preparationItems.all()).length')==0
 page.evaluate('async id=>{const a=await OUTBASE_REPOSITORIES_V160.activities.get(id);await OUTBASE_REPOSITORIES_V160.activities.save({...a,state:"planned"})}',target);print('Wrong source and target that has already started reject without writes: PASS',flush=True)
 page.evaluate('''()=>{window.originalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='improvement_items')throw new DOMException('test','QuotaExceededError');return originalPut.apply(this,args)}}''');first.locator('[type=submit]').click();first.locator('[role=status]').filter(has_text='保存できませんでした').wait_for()
 assert page.evaluate('async()=> (await OUTBASE_REPOSITORIES_V160.preparationItems.all()).length')==0;assert all(r['status']=='open' for r in page.evaluate('async()=>OUTBASE_REPOSITORIES_V160.improvementItems.all()'));page.evaluate('()=>{IDBObjectStore.prototype.put=originalPut}');print('Failure after preparation put rolls back both preparation and improvement: PASS',flush=True)
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'horizontal overflow'
 page.screenshot(path='/tmp/outbase-improvement.png',full_page=True)
 c.set_offline(True)
 for (category,text),iid in zip(cases,ids):
  detail=page.locator('[data-ob16-improvement="'+iid+'"]');
  if detail.get_attribute('open') is None:detail.locator('summary').click()
  form=page.locator('[data-ob16-transfer="'+iid+'"]');form.locator('[name=destination]').select_option(target);form.locator('[name=category]').select_option(category);form.evaluate('(f)=>{f.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));f.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));}');form.get_by_role('button',name='追加済み',exact=True).wait_for()
 prep=page.evaluate('async()=>OUTBASE_REPOSITORIES_V160.preparationItems.all()');assert len(prep)==4;assert {r['category'] for r in prep}=={'shopping','gear','pet','note'};assert all(r['activity_id']==target for r in prep)
 originals=page.evaluate('async()=>OUTBASE_REPOSITORIES_V160.improvementItems.all()');assert all(r['status']=='completed' and r['payload']['preparation_transfer']['activity_id']==target for r in originals);assert {r['summary'] for r in originals}=={text for _,text in cases};print('Four categories transfer exactly once and preserve original improvements: PASS',flush=True)
 retry=page.evaluate('async args=>OUTBASE_IMPROVEMENT_PREPARATION.apply(args)',{'improvementId':ids[0],'displayActivityId':aid,'targetActivityId':target,'category':'shopping','title':cases[0][1]});assert retry['deduplicated'];assert len(page.evaluate('async()=>OUTBASE_REPOSITORIES_V160.preparationItems.all()'))==4
 page.locator('a',has_text='追加先の準備を見る').first.click();page.wait_for_url('**view=preparation-detail**');page.locator('[data-ob22-prep-toggle]').first.wait_for();assert page.locator('[data-ob22-prep-toggle]').count()==4
 for _,text in cases:assert text in page.locator('.ob22-prep-detail').inner_text()
 page.locator('[data-ob22-prep-toggle]').first.click();page.wait_for_function('document.querySelector("[data-ob22-prep-toggle].done")!==null');page.reload();page.locator('[data-ob22-prep-toggle].done').wait_for();print('Transferred preparation is visible, checkable and restored after reload: PASS',flush=True)
 page.goto(base+'?shell=1&view=activity&activityId='+aid);page.locator('.ob16-activity').wait_for();page.wait_for_timeout(500);assert page.locator('[data-ob16-transfer]').count()==0
 page.get_by_text('次回準備へ追加済み',exact=True).click();page.locator('a',has_text='追加先の準備を見る').first.click();page.wait_for_url('**view=preparation-detail**');page.locator('[data-ob22-prep-toggle]').first.wait_for()
 assert not errors,errors;print('Offline transfer, reload and applied-history link work without JavaScript errors: PASS',flush=True)
 c.close();b.close()
