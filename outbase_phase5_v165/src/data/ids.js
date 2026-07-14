(() => {
  'use strict';

  const ENCODING='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let lastTime=-1;
  let lastRandom=new Uint8Array(10);

  function randomBytes(length){
    const bytes=new Uint8Array(length);
    if(globalThis.crypto?.getRandomValues){
      globalThis.crypto.getRandomValues(bytes);
      return bytes;
    }
    for(let i=0;i<length;i++)bytes[i]=Math.floor(Math.random()*256);
    return bytes;
  }

  function encodeTime(time){
    let value=Math.max(0,Math.floor(Number(time)||Date.now()));
    let output='';
    for(let i=0;i<10;i++){
      output=ENCODING[value%32]+output;
      value=Math.floor(value/32);
    }
    return output;
  }

  function encodeRandom(bytes){
    let buffer=0;
    let bits=0;
    let output='';
    for(const byte of bytes){
      buffer=(buffer<<8)|byte;
      bits+=8;
      while(bits>=5){
        bits-=5;
        output+=ENCODING[(buffer>>bits)&31];
      }
    }
    if(bits>0)output+=ENCODING[(buffer<<(5-bits))&31];
    return output.slice(0,16).padEnd(16,'0');
  }

  function increment(bytes){
    const next=new Uint8Array(bytes);
    for(let i=next.length-1;i>=0;i--){
      next[i]=(next[i]+1)&255;
      if(next[i]!==0)return next;
    }
    return randomBytes(10);
  }

  function ulid(time=Date.now()){
    const timestamp=Math.max(0,Math.floor(Number(time)||Date.now()));
    if(timestamp===lastTime)lastRandom=increment(lastRandom);
    else{
      lastTime=timestamp;
      lastRandom=randomBytes(10);
    }
    return `${encodeTime(timestamp)}${encodeRandom(lastRandom)}`;
  }

  function isUlid(value){
    return /^[0-9A-HJKMNP-TV-Z]{26}$/.test(String(value||''));
  }

  function nowIso(){return new Date().toISOString();}

  globalThis.OUTBASE_IDS=Object.freeze({ulid,isUlid,nowIso});
})();
