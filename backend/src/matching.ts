import {catalog, type Product, type CategoryId} from './catalog.js';

export const synonyms: Record<string,string>={
 'dahi':'curd','yoghurt':'curd','yogurt':'curd','paneer':'paneer','doodh':'milk','chawal':'rice','basmati chawal':'basmati rice',
 'pyaz':'onion','pyaaz':'onion','kanda':'onion','tamatar':'tomato','aloo':'potato','adrak':'ginger','lahsun':'garlic',
 'dhaniya':'coriander','pudina':'mint','nimbu':'lemon','mirchi':'chilli','aata':'atta','roti atta':'wheat flour',
 'moongfali':'peanuts','groundnuts':'peanuts','flattened rice':'poha','chivda':'poha','chiwda':'poha',
 'rai':'mustard seeds','jeera':'cumin seeds','haldi':'turmeric powder','red chilli':'red chilli powder',
 'macaroni':'pasta','penne':'pasta','tomato puree':'pasta sauce','onion oil':'onion hair oil',
 'onion hair serum':'onion hair oil','onion hair oil':'onion hair oil','hair shampoo':'shampoo','cold drink':'cola'
};
export const recipes:Record<string,string[]>={
 'biryani':['basmati rice','biryani masala','curd','onion','mint leaves','coriander leaves'],
 'pasta':['pasta','pasta sauce','mozzarella cheese','garlic','oregano','capsicum'],
 'poha':['poha','peanuts','onion','mustard seeds','green chilli','lemon'],
 'pizza':['pizza base','mozzarella cheese','pasta sauce','capsicum','oregano'],
 'sandwich':['whole wheat bread','cheese slices','tomato','cucumber','butter'],
 'omelette':['eggs','onion','tomato','green chilli','butter'],
 'chai':['black tea','toned milk','sugar','ginger'],
 'tea':['black tea','toned milk','sugar','ginger'],
 'breakfast':['rolled oats','toned milk','banana','whole wheat bread','peanut butter'],
 'dal chawal':['basmati rice','toor dal','turmeric powder','cumin seeds'],
 'maggi':['instant noodles','onion','tomato','green chilli'],
 'burger':['burger buns','cheese slices','tomato','onion'],
 'salad':['cucumber','tomato','onion','lemon','carrot'],
 'movie night':['popcorn','salted chips','cola','chocolate cookies'],
 'snacks':['salted chips','roasted makhana','namkeen mix','cola'],
 'party':['popcorn','salted chips','cola','orange juice'],
 'weeknight dinner':['pasta','pasta sauce','mozzarella cheese','garlic']
};
export const foodCategories:CategoryId[]=['produce','dairy','staples','spices','snacks','beverages','breakfast','frozen'];
const personalWords=/\b(hair|shampoo|lotion|face wash|serum|soap|toothpaste|deodorant|body wash|skincare)\b/i;
const homeWords=/\b(detergent|laundry|dish wash|floor cleaner|bathroom cleaner|mosquito|garbage|tissue|scrub|disinfectant)\b/i;
export function normalize(s:string){return s.toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();}
export function canonical(q:string){const x=normalize(q);return synonyms[x]??x;}
export function contextCategories(query:string):CategoryId[]|undefined{
 const q=normalize(query);
 if(personalWords.test(q))return ['personal'];
 if(homeWords.test(q))return ['home'];
 if(/\b(cook|make|recipe|ingredients|bana|banana hai|saman|saaman|dinner|lunch|khana|biryani|pasta|poha|pizza|chawal|sabzi)\b/.test(q))return foodCategories;
 return undefined;
}
const escapeRegex=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function rankProducts(query:string, products:Product[]=catalog, allowed?:CategoryId[], limit=6):Product[]{
 const q=canonical(query);if(!q)return [];
 const words=q.split(' ').filter(x=>x.length>1);
 const scored=products.filter(p=>p.stock>0&&(!allowed||allowed.includes(p.category))).map(p=>{
  const n=normalize(p.name),base=normalize(p.baseName),tags=p.tags.map(normalize);
  let score=0;
  if(base===q)score=120;
  else if(n===q)score=118;
  else if(base.startsWith(q+' '))score=105;
  else if(new RegExp('\\b'+escapeRegex(q)+'\\b','i').test(base))score=95;
  else if(n.includes(q))score=82;
  else if(tags.includes(q))score=74;
  else if(words.length>0&&words.every(w=>new RegExp('\\b'+escapeRegex(w)+'\\b','i').test(n+' '+tags.join(' '))))score=60;
  else if(words.length>0&&words.some(w=>w.length>3&&new RegExp('\\b'+escapeRegex(w)+'\\b','i').test(base)))score=16;
  // Do not let single-word matches outrank unrelated but very similar product types.
  if(personalWords.test(q)&&p.category!=='personal')score=0;
  if(homeWords.test(q)&&p.category!=='home')score=0;
  if(/\bonion\b/.test(q)&&!personalWords.test(q)&&p.category==='personal')score=0;
  return {p,score};
 }).filter(x=>x.score>=40).sort((a,b)=>b.score-a.score||a.p.price-b.p.price);
 return scored.slice(0,Math.max(0,limit)).map(x=>x.p);
}
export function parseDemoIntent(input:string):string[]{
 const q=normalize(input);if(!q)return [];
 // Explicit personal/home queries take precedence over ingredient/recipe recognition.
 if(personalWords.test(q)||homeWords.test(q)){
  const direct=Object.keys(synonyms).filter(k=>q.includes(k)).sort((a,b)=>b.length-a.length)[0];
  return [canonical(direct||q.replace(/^(i need|show me|find|buy|search for)\s+/,'').trim())].filter(Boolean);
 }
 const dish=Object.keys(recipes).sort((a,b)=>b.length-a.length).find(k=>new RegExp('\\b'+escapeRegex(k)+'\\b').test(q));
 if(dish)return recipes[dish];
 const chunks=q.replace(/\b(i need|i want|give me|please|add|get|buy|for|my|the|some|saman|saaman|ka|ki|ke|mujhe|chahiye|cart|ingredients|items|and|aur)\b/g,' ').split(/,|\+|\s+or\s+/).map(s=>s.trim()).filter(Boolean);
 const matches=chunks.length===1?chunks:chunks;
 return matches.length?matches.slice(0,8).map(canonical):[q];
}
export function matchIngredients(ingredients:string[],products:Product[]=catalog,ctx=''){
 const allowed=contextCategories(ctx);
 const used=new Set<string>();
 const items: {ingredient:string;product:Product;alternatives:Product[]}[]=[];
 const missingItems:string[]=[];
 for(const ingredient of ingredients.slice(0,8)){
  const scope=contextCategories(ingredient)||allowed;
  const candidates=rankProducts(ingredient,products,scope,6).filter(p=>!used.has(p.baseName.toLowerCase()));
  if(!candidates.length){missingItems.push(ingredient);continue;}
  const preferred=candidates[0];used.add(preferred.baseName.toLowerCase());
  items.push({ingredient,product:preferred,alternatives:candidates.filter(p=>p.baseName===preferred.baseName&&p.id!==preferred.id).slice(0,2)});
 }
 return {items,missingItems};
}
