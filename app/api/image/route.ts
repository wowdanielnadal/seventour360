import {identity,response,sameOrigin} from '../../../lib/studio-auth';
import {storage,readTour,unavailable} from '../../../lib/seven-storage';
export const runtime='nodejs';
export async function GET(r:Request){try{
 const key=new URL(r.url).searchParams.get('key');
 if(!key||!/^images\/[^/]+\/[a-f0-9-]{36}\/[a-f0-9-]{36}$/.test(key))return new Response('Not found',{status:404});
 const t=(await readTour(key.split('/')[2]))?.data;
 if(!t||(!t.published&&t.owner!==(await identity(r))?.id))return new Response('Not found',{status:404});
 const used=t.scenes.some((s:any)=>[s.image,s.thumbnail].some((url:string)=>{try{return new URL(url,'https://local').searchParams.get('key')===key}catch{return false}}));
 if(!used)return new Response('Not found',{status:404});
 const {data,error}=await storage().createSignedUrl(key,60);
 if(error||!data)return new Response('Not found',{status:404});
 return new Response(null,{status:302,headers:{Location:data.signedUrl,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}catch{return unavailable()}}
export async function POST(r:Request){try{
 const user=await identity(r);if(!user)return response({error:'Login necessário'},401);
 if(!sameOrigin(r))return response({error:'Origem inválida'},403);
 const url=new URL(r.url),tourId=url.searchParams.get('tour');
 if(!tourId||!/^[a-f0-9-]{36}$/.test(tourId))return response({error:'Tour inválido'},400);
 const t=(await readTour(tourId))?.data;
 if(!t||t.owner!==user.id)return response({error:'Acesso negado'},403);
 if(Number(r.headers.get('content-length'))>4096)return response({error:'Dados inválidos'},400);
 const b=await r.json(),limit=url.searchParams.get('kind')==='thumb'?512*1024:20*1024*1024;
 if(!['image/jpeg','image/png','image/webp'].includes(b.contentType)||!Number.isInteger(b.size)||b.size<1||b.size>limit)return response({error:'Use JPG, PNG ou WebP de até 20 MB.'},400);
 const key=`images/${user.id}/${tourId}/${crypto.randomUUID()}`;
 const {data,error}=await storage().createSignedUploadUrl(key,{upsert:false});
 if(error||!data)throw error;
 return response({uploadUrl:data.signedUrl,url:'/api/image?key='+encodeURIComponent(key)});
}catch{return unavailable()}}
