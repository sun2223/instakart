import type {User,Order,Product,Category,AIItem,Recommendation} from './types';
export class ApiError extends Error{constructor(message:string,public status:number){super(message);}}
export async function api<T>(path:string,options:RequestInit={},token?:string|null):Promise<T>{
 const headers:Record<string,string>={'Content-Type':'application/json',...(options.headers as Record<string,string>||{})};if(token)headers.Authorization=`Bearer ${token}`;
 let response:Response;
 try{response=await fetch(`/api${path}`,{...options,headers});}catch{throw new ApiError('Cannot reach backend. Is npm run dev running?',0);}
 const json=await response.json().catch(()=>({error:'Invalid server response'}));
 if(!response.ok)throw new ApiError((json as {error?:string}).error||'Request failed',response.status);
 return json as T;
}
export const post=<T>(url:string,data:unknown,token?:string|null)=>api<T>(url,{method:'POST',body:JSON.stringify(data)},token);
export const patch=<T>(url:string,data:unknown,token?:string|null)=>api<T>(url,{method:'PATCH',body:JSON.stringify(data)},token);
export type AuthResponse={token:string;user:User};
export type BuildCartResponse={items:AIItem[];missingItems:string[];extracted:string[];mode:'groq'|'demo'|'fallback';warning:string};
export type RecsResponse={recommendations:Recommendation[];mode:'rules'|'groq';context:{hour:number;festival:string|null}};
export type ProductsResponse={products:Product[];total:number};
export type CategoriesResponse={categories:Category[]};
export type OrdersResponse={orders:Order[]};
