import OpenAI from 'openai';
import {z} from 'zod';
import {canonical,parseDemoIntent,matchIngredients,rankProducts,contextCategories,normalize} from './matching.js';
import {getProducts,type User,type Order} from './store.js';
import type {Product} from './catalog.js';

const getClient=()=>process.env.GROQ_API_KEY?new OpenAI({apiKey:process.env.GROQ_API_KEY,baseURL:'https://api.groq.com/openai/v1',timeout:10000,maxRetries:1}):null;
const itemSchema=z.object({items:z.array(z.string().trim().min(1).max(70)).max(8)});
const MODEL=()=>process.env.GROQ_MODEL||'llama-3.1-8b-instant';
const systemPrompt=`You are InstaKart's grocery item extractor. Return valid JSON only: {"items":["ingredient",...]}. Max 8 distinct concise generic purchasable ingredients. Understand English, Hindi transliteration and Hinglish. When the request is a meal, infer 4-6 essential ingredients. When the request is a product (e.g. "onion hair oil"), return exactly that product rather than cooking onions. Never invent prices, brands, IDs or stock. No surrounding Markdown. For medicine or health symptoms, do not suggest treatments. For unrelated tasks, return {"items":[]}.`;
export async function buildCartAI(query:string){
 let extracted:string[]=[],mode:'groq'|'demo'|'fallback'='demo';let warning='';
 const client=getClient();
 if(client){try{
  const result=await client.chat.completions.create({model:MODEL(),temperature:0,max_tokens:350,response_format:{type:'json_object'},messages:[{role:'system',content:systemPrompt},{role:'user',content:query.slice(0,600)}]});
  const raw=JSON.parse(result.choices[0]?.message?.content||'{}');extracted=itemSchema.parse(raw).items.map(canonical);mode='groq';
 }catch(e){mode='fallback';warning='Groq did not respond. Used deterministic demo interpretation instead.';console.warn('Groq cart-builder fallback:',e instanceof Error?e.message:e);}}
 if(mode!=='groq')extracted=parseDemoIntent(query);
 const unique=[...new Set(extracted)].slice(0,8);
 const matched=matchIngredients(unique,getProducts(),query);
 return {...matched,extracted:unique,mode,warning};
}
export async function smartSearch(query:string){
 const q=normalize(query);const all=getProducts();
 let products=rankProducts(q,all,contextCategories(q),30);
 if(!products.length){
  const list=parseDemoIntent(query);
  products=list.flatMap(x=>rankProducts(x,all,contextCategories(query),6));
 }
 return {products:[...new Map(products.map(x=>[x.id,x])).values()].slice(0,30),interpretation:q,mode:'catalog'};
}
export type Recommendation={product:Product;reason:string;kind:'replenishment'|'basket'|'discovery'|'occasion';urgency:number};
export async function getRecommendations(user:User|null,orders:Order[],cartIds:string[]=[]){
 const all=getProducts();const purchased=new Map<string,{quantity:number;date:string}>();
 for(const o of orders.filter(o=>o.status!=='cancelled'))for(const l of o.lines){const p=purchased.get(l.productId);if(!p||p.date<o.createdAt)purchased.set(l.productId,{quantity:l.quantity,date:o.createdAt});}
 const hr=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',hour:'numeric',hour12:false}).format(new Date()));
 const morning=hr<11,evening=hr>=16;
 const preference=user?.preferences;
 const cart=cartIds.map(id=>all.find(p=>p.id===id)).filter((p):p is Product=>!!p);
 const candidates=all.filter(p=>p.stock>0&&!cartIds.includes(p.id)&&p.category!=='personal'&&p.category!=='home');
 // Deterministic, auditable candidate shortlist; optional Groq reranks the shortlist below.
 const scored=candidates.map(p=>{
  let score=p.featured?8:2,kind:Recommendation['kind']='discovery',reason='A popular pick in this category';
  const past=purchased.get(p.id);
  if(past){const days=Math.max(0,(Date.now()-new Date(past.date).getTime())/86400000);score+=35+Math.min(days*2,55);kind='replenishment';reason=`Previously ordered · ${Math.round(days)} days ago`;}
  if(cart.some(x=>x.category===p.category)){score+=26;if(!past){kind='basket';reason='Pairs well with items already in your cart';}}
  if(morning&&['breakfast','dairy'].includes(p.category)){score+=19;if(!past){kind='occasion';reason='Great for your morning routine';}}
  if(evening&&['snacks','beverages'].includes(p.category)){score+=19;if(!past){kind='occasion';reason='A good evening pick';}}
  if(preference?.upcomingFestival&&['spices','snacks','staples'].includes(p.category)){score+=12;if(!past){kind='occasion';reason=`For ${preference.upcomingFestival}`;}}
  if(preference?.budget==='value')score+=Math.max(0,200-p.price)/25;
  if(preference?.diet==='vegan'&&p.category==='dairy')score-=200;
  if(preference?.diet==='vegetarian'&&p.baseName.toLowerCase().includes('eggs'))score-=200;
  return {product:p,reason,kind,urgency:Math.round(score)};
 }).filter(x=>x.urgency>=0).sort((a,b)=>b.urgency-a.urgency||a.product.price-b.product.price);
 const unique:Recommendation[]=[];const seen=new Set<string>();
 for(const entry of scored){if(seen.has(entry.product.baseName))continue;seen.add(entry.product.baseName);unique.push(entry);if(unique.length>=24)break;}
 let recommendations=unique.slice(0,12);let mode:'rules'|'groq'='rules';const client=getClient();
 if(client&&unique.length){try{
  const answer=await client.chat.completions.create({model:MODEL(),temperature:0.2,max_tokens:250,response_format:{type:'json_object'},messages:[
   {role:'system',content:'You rerank grocery candidates. Output JSON {"ids":["id",...]} with up to 10 unique IDs ONLY from candidates. Consider purchase history, cart, diet, time, occasion. Never invent IDs or recommend medications.'},
   {role:'user',content:JSON.stringify({hour:hr,preferences:preference,cart:cart.map(p=>p.name),previousOrders:orders.length,products:unique.slice(0,20).map(x=>({id:x.product.id,name:x.product.name,kind:x.kind,urgency:x.urgency}))})}
  ]});
  const parsed=z.object({ids:z.array(z.string()).max(10)}).parse(JSON.parse(answer.choices[0]?.message?.content||'{}'));
  const byId=new Map(unique.map(x=>[x.product.id,x]));const selected=parsed.ids.map(id=>byId.get(id)).filter((x):x is Recommendation=>!!x);
  if(selected.length) {recommendations=selected;mode='groq';}
 }catch(e){console.warn('Recommendation rerank fallback:',e instanceof Error?e.message:e);}}
 return {recommendations,mode,context:{hour:hr,festival:preference?.upcomingFestival||null}};
}
export function reorderSuggestions(orders:Order[],products:Product[]=getProducts()){
 const occurrences=new Map<string,{last:number;count:number;quantity:number}>();
 for(const o of orders.filter(o=>o.status!=='cancelled'))for(const l of o.lines){
  const ts=new Date(o.createdAt).getTime();const found=occurrences.get(l.productId)||{last:0,count:0,quantity:0};
  occurrences.set(l.productId,{last:Math.max(found.last,ts),count:found.count+1,quantity:found.quantity+l.quantity});
 }
 return [...occurrences.entries()].map(([id,entry])=>{
  const product=products.find(p=>p.id===id);const days=Math.max(0,Math.floor((Date.now()-entry.last)/86400000));
  return {product,daysSince:days,purchases:entry.count,urgency:Math.min(100,Math.round(days*5+entry.count*9))};
 }).filter((x):x is {product:Product;daysSince:number;purchases:number;urgency:number}=>!!x.product).sort((a,b)=>b.urgency-a.urgency).slice(0,12);
}
