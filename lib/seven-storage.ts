import 'server-only';
import { createClient } from '@supabase/supabase-js';
export const BUCKET = 'seven-tour-360';
export function database() {
  const url = process.env.SUPABASE_URL || 'https://usyzbhycrvrdiicrsolu.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Conexão Supabase ainda não configurada.');
  return createClient(url, key, {auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,options)=>fetch(url,{...options,cache:'no-store'})}});
}
export function storage() { return database().storage.from(BUCKET); }
export async function readTour(id:string) {
  const {data,error}=await database().from('seven_tours').select('data,revision').eq('id',id).maybeSingle();
  if(error)throw error;
  return data;
}
// Adapter preserves the tour validator while replacing R2 with Postgres + Storage.
export function bucket() {
 return {
  async get(key:string):Promise<any>{
   if(!key.startsWith('tours/'))throw new Error('Chave inválida');
   const row=await readTour(key.slice(6));
   return row?{etag:row.revision,json:async()=>row.data}:null;
  },
  async head(key:string):Promise<any>{
   const {data,error}=await storage().info(key);
   if(error||!data)return null;
   const parts=key.split('/');
   if(parts.length!==4||parts[0]!=='images')return null;
   if(!data.size||data.size>20*1024*1024||!['image/jpeg','image/png','image/webp'].includes(data.contentType||''))return null;
   return {customMetadata:{tourId:parts[2]}};
  },
  async put(key:string,value:string,options?:any):Promise<any>{
   if(key.startsWith('users/'))return {ok:true}; // Index is derived from the same atomic row.
   if(!key.startsWith('tours/'))throw new Error('Chave inválida');
   const data=JSON.parse(value),row={id:data.id,owner:data.owner,revision:data.revision,data};
   const expected=options?.onlyIf?.etagMatches;
   const result=expected
    ?await database().from('seven_tours').update(row).eq('id',data.id).eq('revision',expected).select('id')
    :await database().from('seven_tours').insert(row).select('id');
   if(result.error?.code==='23505')return null;
   if(result.error)throw result.error;
   return result.data?.length?{etag:data.revision}:null;
  },
  async list({prefix}: {prefix:string,cursor?:string}):Promise<any>{
   if(prefix.startsWith('users/')) {
    const owner=prefix.split('/')[1];
    const {data,error}=await database().from('seven_tours').select('id').eq('owner',owner).order('id');
    if(error)throw error;
    return {objects:(data||[]).map(row=>({key:'tours/'+row.id})),truncated:false};
   }
   const folder=prefix.replace(/\/$/,'');
   const {data,error}=await storage().list(folder,{limit:1000});
   if(error)throw error;
   return {objects:(data||[]).filter(x=>x.id).map(x=>({key:folder+'/'+x.name})),truncated:(data||[]).length===1000,cursor:'more'};
  },
  async delete(input:string|string[]) {
   const keys=Array.isArray(input)?input:[input];
   const ids=keys.filter(k=>k.startsWith('tours/')).map(k=>k.slice(6));
   if(ids.length){const {error}=await database().from('seven_tours').delete().in('id',ids);if(error)throw error;}
   const images=keys.filter(k=>k.startsWith('images/'));
   if(images.length){const {error}=await storage().remove(images);if(error)throw error;}
  }
 };
}
export function unavailable(){return Response.json({error:'Serviço indisponível. Confira a configuração do projeto.'},{status:503,headers:{'Cache-Control':'no-store'}});}
