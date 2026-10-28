import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import crypto from 'node:crypto';
import net from 'node:net';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function freePort(){const s=net.createServer();await new Promise(ok=>s.listen(0,'127.0.0.1',ok));const port=s.address().port;await new Promise(ok=>s.close(ok));return port;}
async function http(base,endpoint,options={}){const res=await fetch(base+'/api'+endpoint,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});return {status:res.status,data:await res.json()};}

test('end-to-end auth → AI matching → COD checkout → idempotency', {timeout:30000},async()=>{
 const storeFile=path.join(os.tmpdir(),`instakart-test-${crypto.randomUUID()}.json`);const port=await freePort();const base=`http://localhost:${port}`;
 const child=spawn(process.execPath,['dist/server.js'],{cwd:root,env:{...process.env,PORT:String(port),NODE_ENV:'development',MONGO_URI:'',GROQ_API_KEY:'',LOCAL_STORE_FILE:storeFile,SIMULATE_DELIVERY:'false',JWT_SECRET:'integration-test-only-secret-do-not-use-in-production'},stdio:['ignore','pipe','pipe']});
 let log='';child.stdout.on('data',s=>{log+=s.toString()});child.stderr.on('data',s=>{log+=s.toString()});
 try{
  let ready=false;for(let i=0;i<60;i++){if(child.exitCode!==null)throw Error(`Backend exited early: ${log}`);try{const r=await http(base,'/health');if(r.status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,150));}
  assert.ok(ready,`Backend did not start: ${log}`);
  const health=await http(base,'/health');assert.ok(health.data.catalogCount>=280);assert.equal(health.data.dbMode,'local');
  const email=`smoke-${crypto.randomUUID()}@example.com`;
  const auth=await http(base,'/auth/register',{method:'POST',body:JSON.stringify({name:'Test Shopper',email,password:'StrongTest123!'})});
  assert.equal(auth.status,201);assert.ok(auth.data.token);assert.equal(auth.data.user.email,email);assert.equal(auth.data.user.passwordHash,undefined);
  const hdr={Authorization:`Bearer ${auth.data.token}`};
  const blocked=await http(base,'/orders');assert.equal(blocked.status,401);
  const cart=await http(base,'/ai/build-cart',{method:'POST',body:JSON.stringify({query:'pasta ka saman'})});
  assert.equal(cart.status,200);assert.equal(cart.data.mode,'demo');assert.ok(cart.data.items.length>=4);assert.ok(cart.data.items.every(i=>i.product?.id));
  const lines=cart.data.items.slice(0,3).map(x=>({productId:x.product.id,quantity:1}));const clientOrderId=crypto.randomUUID();const input={clientOrderId,lines,address:'123 Test Lane, Sample City 123456',zap:false};
  const create=await http(base,'/orders',{method:'POST',headers:hdr,body:JSON.stringify(input)});assert.equal(create.status,201);assert.equal(create.data.order.paymentMethod,'COD');assert.ok(create.data.order.total>0);
  const retry=await http(base,'/orders',{method:'POST',headers:hdr,body:JSON.stringify(input)});assert.equal(retry.status,200);assert.equal(retry.data.duplicate,true);assert.equal(retry.data.order.id,create.data.order.id);
  const orders=await http(base,'/orders',{headers:hdr});assert.equal(orders.status,200);assert.ok(orders.data.orders.some(x=>x.id===create.data.order.id));
  const wrongId=await http(base,`/orders/${create.data.order.id}`);assert.equal(wrongId.status,401);
 }finally{child.kill('SIGTERM');await new Promise(resolve=>{if(child.exitCode!==null)resolve();else{child.once('exit',resolve);setTimeout(resolve,2000);}});try{fs.unlinkSync(storeFile);}catch{}}
});
