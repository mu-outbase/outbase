import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/domain/activity/audio-recorder.js',import.meta.url),'utf8');
function fixture(options={}){
 const listeners=new Map(),docListeners=new Map(),timers=[],tracks=[],recorders=[];
 const events=(name,callback)=>{const rows=listeners.get(name)||[];rows.push(callback);listeners.set(name,rows);};
 const fire=(name,event={})=>(listeners.get(name)||[]).forEach(fn=>fn(event));
 let requests=0,route={name:'record',activityId:'a'};
 const stream=()=>{const track={readyState:'live',stop(){this.readyState='ended';}};tracks.push(track);return {getTracks:()=>[track]};};
 class Recorder{
  static isTypeSupported(){return options.supported!==false;}
  constructor(_stream,{mimeType}){this.mimeType=mimeType;this.state='inactive';recorders.push(this);}
  start(){this.state='recording';}
  stop(){if(options.stopThrows)throw Error('stop failed');this.state='inactive';queueMicrotask(()=>{this.ondataavailable?.({data:new Blob(['recording'],{type:this.mimeType})});this.onstop?.();});}
 }
 const doc={visibilityState:'visible',addEventListener:(name,fn)=>docListeners.set(name,fn)};
 const context=vm.createContext({Blob,File,Date,MediaRecorder:Recorder,
  navigator:{mediaDevices:{getUserMedia:async()=>{requests++;return options.getStream?options.getStream(stream):stream();}}},
  document:doc,addEventListener:events,dispatchEvent:event=>fire(event.type,event),CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail;}},
  setTimeout:(fn,ms)=>{const timer={fn,ms,cleared:false};timers.push(timer);return timer;},clearTimeout:timer=>{if(timer)timer.cleared=true;},
  OUTBASE_IDS:{ulid:()=> '01J00000000000000000000001'},OUTBASE_ROUTER:{current:()=>route}});
 vm.runInContext(source,context);
 return {api:context.OUTBASE_AUDIO_RECORDER,tracks,recorders,timers,get requests(){return requests;},fire,hide:()=>{doc.visibilityState='hidden';docListeners.get('visibilitychange')();},leave:()=>{route={name:'home'};fire('outbase:navigation');}};
}
const flush=()=>new Promise(resolve=>queueMicrotask(resolve));
test('records only on explicit start, stops tracks and retains a File for review',async()=>{
 const f=fixture();assert.equal(f.requests,0);await f.api.start('a');assert.equal(f.api.snapshot('a').status,'recording');assert.equal(f.requests,1);
 f.api.stop('a');await flush();const draft=f.api.snapshot('a');assert.equal(draft.status,'ready');assert.ok(draft.file instanceof File);assert.ok(draft.file.size);assert.equal(f.tracks[0].readyState,'ended');
});
test('permission denial is visible and unsupported formats do not request a microphone',async()=>{
 const denied=fixture({getStream:()=>Promise.reject(Object.assign(Error('denied'),{name:'NotAllowedError'}))});await denied.api.start('a');assert.equal(denied.api.snapshot('a').status,'error');assert.match(denied.api.snapshot('a').notice,/許可/);
 const unsupported=fixture({supported:false});await unsupported.api.start('a');assert.equal(unsupported.requests,0);assert.equal(unsupported.api.snapshot('a').status,'error');
});
test('late permission after cancellation cannot leave a microphone running',async()=>{
 let resolve;const f=fixture({getStream:stream=>new Promise(done=>{resolve=()=>done(stream());})});const pending=f.api.start('a');f.api.cancel('a');resolve();await pending;
 assert.equal(f.tracks[0].readyState,'ended');assert.equal(f.recorders.length,0);assert.equal(f.api.snapshot('a').status,'idle');
});
test('navigation and backgrounding stop recording while keeping the unsaved clip',async()=>{
 for(const action of ['leave','hide']){const f=fixture();await f.api.start('a');f[action]();await flush();assert.equal(f.tracks[0].readyState,'ended');assert.equal(f.api.snapshot('a').status,'ready');}
});
test('rapid cancel and restart cannot be overwritten by the old stop callback',async()=>{
 const f=fixture();await f.api.start('a');f.api.cancel('a');await f.api.start('a');assert.equal(f.api.snapshot('a').status,'recording');f.api.cancel('a');await flush();assert.equal(f.api.snapshot('a').status,'idle');
});
test('five-minute automatic stop releases the mic and duplicate starts do not request it twice',async()=>{
 const f=fixture();await f.api.start('a');await f.api.start('a');assert.equal(f.requests,1);const timer=f.timers.find(x=>x.ms===5*60*1000);assert.ok(timer);timer.fn();await flush();assert.equal(f.api.snapshot('a').status,'ready');assert.equal(f.tracks[0].readyState,'ended');
});

test('raw audio is a distinct valid record type without fabricated transcript text',()=>{
 const id='01J00000000000000000000001';const context=vm.createContext({OUTBASE_IDS:{ulid:()=>id,nowIso:()=>new Date().toISOString(),isUlid:value=>value===id}});
 vm.runInContext(readFileSync(new URL('../src/data/validation.js',import.meta.url),'utf8'),context);
 const row=context.OUTBASE_VALIDATION.record({activity_id:id,type:'audio',payload:{title:'録音',media_id:id}});
 assert.doesNotThrow(()=>context.OUTBASE_VALIDATION.assertEntity('records',row));assert.equal(row.type,'audio');assert.equal(row.payload.text,undefined);
 assert.ok(context.OUTBASE_VALIDATION.RECORD_TYPES.includes('audio_transcript'));
});

test('stop failures still release the microphone and expose an error',async()=>{
 const f=fixture({stopThrows:true});await f.api.start('a');assert.doesNotThrow(()=>f.api.stop('a'));assert.equal(f.tracks[0].readyState,'ended');assert.equal(f.api.snapshot('a').status,'error');
});
test('oversized recording stops the microphone and cannot become a saved clip',async()=>{
 const f=fixture();await f.api.start('a');class TooBig extends Blob{get size(){return 20*1024*1024+1;}}
 f.recorders[0].ondataavailable({data:new TooBig(['x'],{type:'audio/webm'})});await flush();assert.equal(f.tracks[0].readyState,'ended');assert.equal(f.api.snapshot('a').status,'error');assert.equal(f.api.snapshot('a').file,null);
});

test('cancel after stop cannot resurrect a discarded clip when onstop arrives',async()=>{
 const f=fixture();await f.api.start('a');f.api.stop('a');f.api.cancel('a');await flush();assert.equal(f.api.snapshot('a').status,'idle');assert.equal(f.api.snapshot('a').file,null);assert.equal(f.tracks[0].readyState,'ended');
});
