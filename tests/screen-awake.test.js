import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/domain/activity/screen-awake.js',import.meta.url),'utf8');
function fixture(){
 const events={},docEvents={},locks=[];let requests=0,row={state:'active'},route={name:'record',activityId:'a'},request;
 function lock(){const listeners={};const value={released:false,addEventListener:(name,fn)=>listeners[name]=fn,release(){this.released=true;listeners.release?.();return Promise.resolve();},systemRelease(){this.released=true;listeners.release?.();}};locks.push(value);return value;}
 request=async()=>lock();
 const document={hidden:false,addEventListener:(name,fn)=>docEvents[name]=fn};
 const c=vm.createContext({document,navigator:{wakeLock:{request:()=>{requests++;return request();}}},CustomEvent:class{},addEventListener:(name,fn)=>events[name]=fn,dispatchEvent(){},OUTBASE_ROUTER:{current:()=>route},OUTBASE_REPOSITORIES_V160:{activities:{get:async()=>row}}});vm.runInContext(source,c);
 return {api:c.OUTBASE_SCREEN_AWAKE,c,document,locks,events,docEvents,lock,get requests(){return requests;},setRequest:fn=>request=fn,setRow:value=>row=value,setRoute:value=>route=value};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('does not request a screen lock until explicit toggle; toggle again releases',async()=>{const f=fixture();assert.equal(f.requests,0);await f.api.toggle('a');assert.equal(f.api.snapshot('a').held,true);await f.api.toggle('a');assert.equal(f.locks[0].released,true);assert.equal(f.api.snapshot('a').enabled,false);});
test('permission rejection and unsupported API leave a usable off state',async()=>{const f=fixture();f.setRequest(async()=>{throw Error('denied');});await f.api.toggle('a');assert.equal(f.api.snapshot('a').enabled,false);assert.match(f.api.snapshot('a').notice,/許可されません/);f.c.navigator.wakeLock=undefined;await f.api.toggle('a');assert.match(f.api.snapshot('a').notice,/利用できません/);});
test('navigation and pagehide release a held lock',async()=>{for(const event of ['outbase:navigation','pagehide']){const f=fixture();await f.api.toggle('a');f.setRoute({name:'home'});f.events[event]();assert.equal(f.locks[0].released,true);assert.equal(f.api.snapshot('a').enabled,false);}});
test('late request result after cancellation is released',async()=>{const f=fixture();let finish;f.setRequest(()=>new Promise(resolve=>finish=resolve));const pending=f.api.toggle('a');await flush();f.api.disable();const lock=f.lock();finish(lock);await pending;assert.equal(lock.released,true);assert.equal(f.api.snapshot('a').held,false);});
test('hide releases; foreground reacquires only while the opted-in activity is active',async()=>{const f=fixture();await f.api.toggle('a');f.document.hidden=true;f.docEvents.visibilitychange();assert.equal(f.locks[0].released,true);assert.equal(f.api.snapshot('a').enabled,true);f.document.hidden=false;f.docEvents.visibilitychange();await flush();assert.equal(f.requests,2);assert.equal(f.api.snapshot('a').held,true);f.document.hidden=true;f.docEvents.visibilitychange();f.setRow({state:'organizing'});f.document.hidden=false;f.docEvents.visibilitychange();await flush();assert.equal(f.requests,2);assert.equal(f.api.snapshot('a').enabled,false);});
test('a system release does not start an automatic retry loop',async()=>{const f=fixture();await f.api.toggle('a');f.locks[0].systemRelease();await flush();assert.equal(f.requests,1);assert.equal(f.api.snapshot('a').enabled,false);assert.match(f.api.snapshot('a').notice,/端末により/);});
test('an activity that ends while permission is pending cannot retain a lock',async()=>{const f=fixture();let finish;f.setRequest(()=>new Promise(resolve=>finish=resolve));const pending=f.api.toggle('a');await flush();f.setRow({state:'organizing'});const lock=f.lock();finish(lock);await pending;assert.equal(lock.released,true);assert.equal(f.api.snapshot('a').enabled,false);});
test('failed revalidation after grant releases the resource',async()=>{const f=fixture();f.setRequest(async()=>{f.c.OUTBASE_REPOSITORIES_V160.activities.get=async()=>{throw Error('read failed')};return f.lock();});await f.api.toggle('a');assert.equal(f.locks[0].released,true);assert.equal(f.api.snapshot('a').enabled,false);});
