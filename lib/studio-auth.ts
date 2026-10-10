const env = process.env;
import { createHmac, createHash, timingSafeEqual, scryptSync, randomBytes } from 'node:crypto';

export const COOKIE='__Host-seven_studio';
export const SESSION_AGE=60*60*24*7;
type Config={email:string;salt:string;hash:string;sessionSecret:string};
export function config():Config {const raw=(env as any).STUDIO_AUTH;if(!raw)throw new Error('Acesso por senha ainda não configurado.');return JSON.parse(raw)}
export function response(data:unknown,status=200,headers:Record<string,string>={}) {return Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}})}
export function sameOrigin(r:Request){return r.headers.get('origin')===new URL(r.url).origin;}
export function sessionCookie(value:string,age=SESSION_AGE){return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`}
export function issueSession(){const c=config();const payload=Buffer.from(JSON.stringify({exp:Date.now()+SESSION_AGE*1000,nonce:randomBytes(16).toString('hex')})).toString('base64url');const signature=createHmac('sha256',c.sessionSecret).update(payload).digest('base64url');return `${payload}.${signature}`;}
export async function identity(r:Request):Promise<{id:string,email:string,source:string}|null>{
 const cookie=r.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
 if(cookie){try{const c=config();const parts=cookie.split('.');if(parts.length===2&&parts[0].length<500){const expected=createHmac('sha256',c.sessionSecret).update(parts[0]).digest();const actual=Buffer.from(parts[1],'base64url');if(actual.length===expected.length&&timingSafeEqual(actual,expected)){const data=JSON.parse(Buffer.from(parts[0],'base64url').toString());if(Number.isFinite(data.exp)&&data.exp>Date.now())return {id:'studio-admin',email:c.email,source:'password'};}}}catch{}}
 // Vercel does not authenticate ChatGPT Sites headers; never trust client-supplied identity.
 return null;
}
export function verifyPassword(email:string,password:string){const c=config();const hash=scryptSync(password,Buffer.from(c.salt,'hex'),32,{N:32768,r:8,p:3,maxmem:48*1024*1024});const wanted=Buffer.from(c.hash,'hex');return wanted.length===hash.length&&timingSafeEqual(hash,wanted)&&email.toLowerCase().trim()===c.email.toLowerCase();}
export async function allowLogin(r:Request){const db=(env as any).DB;if(!db)throw new Error('Proteção de login indisponível.');const window=Math.floor(Date.now()/900000);const ip=r.headers.get('cf-connecting-ip')||'unknown';const key=createHash('sha256').update(ip).digest('hex')+':'+window;const row=await db.prepare('INSERT INTO login_limits (key, attempts, expires) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1 RETURNING attempts').bind(key,(window+2)*900000).first();if(Math.random()<.02)await db.prepare('DELETE FROM login_limits WHERE expires < ?').bind(Date.now()).run();return row.attempts<=12;}
