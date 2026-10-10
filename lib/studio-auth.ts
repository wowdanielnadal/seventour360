import {database} from './seven-storage';
const env = process.env;
import { createHmac, createHash, timingSafeEqual, scryptSync, randomBytes } from 'node:crypto';

export const COOKIE='__Host-seven_studio';
export const SESSION_AGE=60*60*24*7;
type Config={email:string;salt:string;hash:string;sessionSecret:string};
export async function config():Promise<Config> {const raw=env.STUDIO_AUTH;if(raw)return JSON.parse(raw);const {data,error}=await database().from('seven_settings').select('value').eq('key','studio_auth').single();if(error||!data)throw new Error('Acesso ainda não configurado.');return data.value as Config;}
export function response(data:unknown,status=200,headers:Record<string,string>={}) {return Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}})}
export function sameOrigin(r:Request){return r.headers.get('origin')===new URL(r.url).origin;}
export function sessionCookie(value:string,age=SESSION_AGE){return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`}
export async function issueSession(){const c=await config();const payload=Buffer.from(JSON.stringify({exp:Date.now()+SESSION_AGE*1000,nonce:randomBytes(16).toString('hex')})).toString('base64url');const signature=createHmac('sha256',c.sessionSecret).update(payload).digest('base64url');return `${payload}.${signature}`;}
export async function identity(r:Request):Promise<{id:string,email:string,source:string}|null>{
 const cookie=r.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
 if(cookie){try{const c=await config();const parts=cookie.split('.');if(parts.length===2&&parts[0].length<500){const expected=createHmac('sha256',c.sessionSecret).update(parts[0]).digest();const actual=Buffer.from(parts[1],'base64url');if(actual.length===expected.length&&timingSafeEqual(actual,expected)){const data=JSON.parse(Buffer.from(parts[0],'base64url').toString());if(Number.isFinite(data.exp)&&data.exp>Date.now())return {id:'studio-admin',email:c.email,source:'password'};}}}catch{}}
 // Vercel does not authenticate ChatGPT Sites headers; never trust client-supplied identity.
 return null;
}
export async function verifyPassword(email:string,password:string){const c=await config();const hash=scryptSync(password,Buffer.from(c.salt,'hex'),32,{N:32768,r:8,p:3,maxmem:48*1024*1024});const wanted=Buffer.from(c.hash,'hex');return wanted.length===hash.length&&timingSafeEqual(hash,wanted)&&email.toLowerCase().trim()===c.email.toLowerCase();}
export async function allowLogin(r:Request){
 const window=Math.floor(Date.now()/900000);
 const ip=r.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim()||'unknown';
 const key=createHash('sha256').update(ip).digest('hex')+':'+window;
 const {data,error}=await database().rpc('seven_login_attempt',{attempt_key:key,expires_at:(window+2)*900000});
 if(error)throw error;
 return Number(data)<=12;
}
