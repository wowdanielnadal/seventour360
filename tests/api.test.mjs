import fs from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
import {randomBytes,scryptSync} from 'node:crypto';
const items=new Map();let seq=0;
const bucket={
 async get(key){const obj=items.get(key);if(!obj)return null;return {...obj,json:async()=>JSON.parse(typeof obj.body==='string'?obj.body:Buffer.from(obj.body).toString())}},
 async head(key){return items.get(key)||null},
 async put(key,body,options={}){if(options.onlyIf&&items.get(key)?.etag!==options.onlyIf.etagMatches)return null;const o={key,body,etag:String(++seq),...options};items.set(key,o);return o},
 async delete(keys){for(const k of Array.isArray(keys)?keys:[keys])items.delete(k)},
 async list({prefix}){return {objects:[...items.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key})),truncated:false}}
};
const salt=randomBytes(16);const password=randomBytes(18).toString('hex');
const cfg={email:'test@example.test',salt:salt.toString('hex'),hash:scryptSync(password,salt,32,{N:32768,r:8,p:3,maxmem:48*1024*1024}).toString('hex'),sessionSecret:randomBytes(32).toString('hex')};
let attempts=0;
globalThis.__env={STUDIO_AUTH:JSON.stringify(cfg)};
globalThis.__storage={
 bucket:()=>bucket,
 database:()=>({rpc:async()=>({data:++attempts,error:null})}),
 storage:()=>({createSignedUploadUrl:async key=>({data:{signedUrl:'https://storage.test/upload/'+key},error:null}),createSignedUrl:async key=>({data:{signedUrl:'https://storage.test/download/'+key},error:null})}),
 readTour:async id=>{const obj=await bucket.get('tours/'+id);return obj?{data:await obj.json()}:null},
 unavailable:()=>Response.json({error:'Unavailable'},{status:503})
};
const storageUri='data:text/javascript;base64,'+Buffer.from('export const {bucket,database,storage,readTour,unavailable}=globalThis.__storage;').toString('base64');
const uri=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpile(source,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022})).toString('base64');
const authUri=uri(fs.readFileSync('lib/studio-auth.ts','utf8').replace("const env = process.env;",'const env=globalThis.__env;').replace("'./seven-storage'",JSON.stringify(storageUri)));
const load=path=>import(uri(fs.readFileSync(path,'utf8').replace("'../../../lib/studio-auth'",JSON.stringify(authUri)).replace("'../../../lib/seven-storage'",JSON.stringify(storageUri))));
const auth=await load('app/api/auth/route.ts'),tours=await load('app/api/tours/route.ts'),images=await load('app/api/image/route.ts');
const actualAuth=await import(authUri);
assert.equal(await actualAuth.identity(new Request('https://studio.test',{headers:{'oai-authenticated-user-id':'spoofed','oai-authenticated-user-email':'spoofed@example.test'}})),null);
const base='https://studio.test';let cookie='';
function req(path,{method='GET',body,logged=true,headers={}}={}){return new Request(base+path,{method,headers:{origin:base,...(logged&&cookie?{cookie}:{}),...(body&&!(body instanceof Uint8Array)?{'Content-Type':'application/json'}:{}),...headers},body:body===undefined?undefined:body instanceof Uint8Array?body:JSON.stringify(body)})}
assert.equal((await auth.POST(req('/api/auth',{method:'POST',body:{email:cfg.email,password:'incorrect'}}))).status,401);
const login=await auth.POST(req('/api/auth',{method:'POST',body:{email:cfg.email,password}}));assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];assert(login.headers.get('set-cookie').includes('HttpOnly'));assert.equal((await (await auth.GET(req('/api/auth'))).json()).authenticated,true);
assert.equal((await auth.POST(req('/api/auth',{method:'POST',body:{email:cfg.email,password},headers:{origin:'https://foreign.test'}}))).status,403);
assert.equal((await tours.POST(req('/api/tours',{method:'POST',body:{scenes:[]},logged:false}))).status,401);
const created=await (await tours.POST(req('/api/tours',{method:'POST',body:{title:'Validation',scenes:[]}}))).json();let t={...created,title:'Validation',scenes:[],published:false};
const binary=Uint8Array.from([255,216,255,224,0,0]);
for(let i=0;i<100;i++){const upload=await images.POST(req('/api/image?tour='+t.id,{method:'POST',body:{contentType:'image/jpeg',size:binary.length}}));assert.equal(upload.status,200);const {url,uploadUrl}=await upload.json();assert(uploadUrl.startsWith('https://storage.test/'));const key=new URL(url,base).searchParams.get('key');await bucket.put(key,binary,{customMetadata:{tourId:t.id}});t.scenes.push({id:'scene-'+i,name:'Room '+i,image:url,group:i<50?'sports':'poker',initialView:{yaw:.8,pitch:.2,fov:1.1},hotspots:[]});const save=await tours.POST(req('/api/tours',{method:'POST',body:t}));assert.equal(save.status,200);t={...t,...await save.json()};}
assert.equal((await (await tours.GET(req('/api/tours?id='+t.id))).json()).scenes.length,100);
assert.equal((await tours.POST(req('/api/tours',{method:'POST',body:{...t,scenes:[...t.scenes,{...t.scenes[0],id:'extra'}]}}))).status,400);
assert.equal((await images.GET(req(t.scenes[0].image,{logged:false}))).status,404);
assert.equal((await tours.GET(req('/api/tours?id='+t.id,{logged:false}))).status,404);
t.scenes[0].hotspots=[{id:'a',target:'scene-1',yaw:.2,pitch:0},{id:'b',target:'scene-50',yaw:1,pitch:0}];t.scenes[1].hotspots=[{id:'c',target:'scene-0',yaw:-.2,pitch:0}];t.published=true;
const saved=await tours.POST(req('/api/tours',{method:'POST',body:t}));assert.equal(saved.status,200);t={...t,...await saved.json()};
const pub=await (await tours.GET(req('/api/tours?id='+t.id,{logged:false}))).json();assert.equal(pub.scenes.length,100);assert.deepEqual(pub.scenes[0].initialView,{yaw:.8,pitch:.2,fov:1.1});assert.equal(pub.scenes[0].hotspots[0].target,'scene-1');assert.equal(pub.scenes[1].hotspots[0].target,'scene-0');
const subset=await (await tours.GET(req('/api/tours?id='+t.id+'&group=sports',{logged:false}))).json();assert.equal(subset.scenes.length,50);assert.equal(subset.scenes[0].hotspots.length,1);assert.equal((await images.GET(req(t.scenes[0].image,{logged:false}))).status,302);
const old=t.scenes[99].image;t.scenes.pop();const updated=await tours.POST(req('/api/tours',{method:'POST',body:t}));assert.equal(updated.status,200);assert.equal((await images.GET(req(old,{logged:false}))).status,404);
assert.equal((await tours.POST(req('/api/tours',{method:'POST',body:t}))).status,409);
assert.equal((await tours.DELETE(req('/api/tours?id='+t.id,{method:'DELETE',logged:false}))).status,401);
assert.equal((await tours.DELETE(req('/api/tours?id='+t.id,{method:'DELETE'}))).status,200);assert.equal(items.size,0);
assert.equal((await auth.DELETE(req('/api/auth',{method:'DELETE'}))).status,200);
for(let i=attempts;i<12;i++)await auth.POST(req('/api/auth',{method:'POST',body:{email:cfg.email,password:'wrong'}}));
assert.equal((await auth.POST(req('/api/auth',{method:'POST',body:{email:cfg.email,password}}))).status,429);
console.log('PASS: password login, secure cookie, origin protection, rate limit; 100 signed upload authorizations and saves (mock Storage); rejection of 101; camera persistence; round-trip arrows; 50/50 public links; image deletion; stale-write protection; cleanup.');
