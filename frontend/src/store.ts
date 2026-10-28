import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import type {Product,User} from './types';
type CartItem={product:Product;quantity:number};
type Store={token:string|null;user:User|null;cart:CartItem[];setAuth:(token:string,user:User)=>void;logout:()=>void;updateUser:(user:User)=>void;add:(p:Product,n?:number)=>void;decrement:(id:string)=>void;remove:(id:string)=>void;clear:()=>void};
export const useShop=create<Store>()(persist((set)=>({
 token:null,user:null,cart:[],
 setAuth:(token,user)=>set({token,user}),logout:()=>set({token:null,user:null}),updateUser:user=>set({user}),
 add:(product,n=1)=>set(s=>({cart:s.cart.some(x=>x.product.id===product.id)?s.cart.map(x=>x.product.id===product.id?{...x,quantity:Math.min(15,x.quantity+n)}:x):[...s.cart,{product,quantity:Math.min(15,n)}]})),
 decrement:id=>set(s=>({cart:s.cart.map(x=>x.product.id===id?{...x,quantity:x.quantity-1}:x).filter(x=>x.quantity>0)})),
 remove:id=>set(s=>({cart:s.cart.filter(x=>x.product.id!==id)})),clear:()=>set({cart:[]})
}),{name:'instakart-shop',partialize:s=>({token:s.token,user:s.user,cart:s.cart})}));
