import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import mongoose, { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';
import {catalog, type Product} from './catalog.js';

export type Preferences={diet:'any'|'vegetarian'|'vegan';household:number;budget:'value'|'balanced'|'premium';upcomingFestival:string};
export type User={id:string;name:string;email:string;passwordHash:string;address:string;preferences:Preferences;createdAt:string};
export type OrderStatus='placed'|'picking'|'packed'|'out_for_delivery'|'delivered'|'cancelled';
export type OrderLine={productId:string;name:string;emoji:string;unit:string;quantity:number;unitPrice:number};
export type Order={id:string;userId:string;clientOrderId:string;lines:OrderLine[];total:number;deliveryFee:number;status:OrderStatus;paymentMethod:'COD';address:string;createdAt:string;updatedAt:string;zap:boolean;etaMinutes:number};

const productSchema=new Schema<Product>({id:{type:String,unique:true,index:true},name:{type:String,index:true},baseName:String,brand:String,category:{type:String,index:true},price:Number,mrp:Number,unit:String,emoji:String,stock:Number,tags:[String],featured:Boolean,rating:Number},{versionKey:false});
productSchema.index({name:'text',baseName:'text',tags:'text'});
const userSchema=new Schema<User>({id:{type:String,unique:true,index:true},name:String,email:{type:String,unique:true,index:true},passwordHash:String,address:String,preferences:{diet:String,household:Number,budget:String,upcomingFestival:String},createdAt:String},{versionKey:false});
const orderSchema=new Schema<Order>({id:{type:String,unique:true,index:true},userId:{type:String,index:true},clientOrderId:String,lines:[{productId:String,name:String,emoji:String,unit:String,quantity:Number,unitPrice:Number}],total:Number,deliveryFee:Number,status:String,paymentMethod:String,address:String,createdAt:String,updatedAt:String,zap:Boolean,etaMinutes:Number},{versionKey:false});
orderSchema.index({userId:1,clientOrderId:1},{unique:true});
const ProductModel=model<Product>('Product',productSchema);
const UserModel=model<User>('User',userSchema);
const OrderModel=model<Order>('Order',orderSchema);
const storagePath=process.env.LOCAL_STORE_FILE?path.resolve(process.env.LOCAL_STORE_FILE):path.join(process.cwd(),'.data','local-store.json');
let dbMode:'mongodb'|'local'='local';
let local:{users:User[];orders:Order[]}={users:[],orders:[]};
let products:Product[]=catalog;
function saveLocal(){if(dbMode==='mongodb')return;fs.mkdirSync(path.dirname(storagePath),{recursive:true});const tmp=storagePath+'.tmp';fs.writeFileSync(tmp,JSON.stringify(local,null,2));fs.renameSync(tmp,storagePath);}
export const publicUser=(u:User)=>({id:u.id,name:u.name,email:u.email,address:u.address,preferences:u.preferences});
export function currentMode(){return dbMode;}
export async function initializeStore(){
 if(process.env.MONGO_URI){await mongoose.connect(process.env.MONGO_URI,{serverSelectionTimeoutMS:8000});dbMode='mongodb';
  const count=await ProductModel.countDocuments();if(count===0){await ProductModel.insertMany(catalog);console.log(`Seeded MongoDB with ${catalog.length} products`);}
  products=(await ProductModel.find({}).lean()).map(({_id,...p})=>p as Product);
 }else{
  if(fs.existsSync(storagePath)){try{local=JSON.parse(fs.readFileSync(storagePath,'utf8'));}catch{console.error('Could not parse local-store.json; using empty local store');}}
  if(!local.users.some(u=>u.email==='demo@instakart.local')){
   local.users.push({id:'demo-user',name:'Demo Shopper',email:'demo@instakart.local',passwordHash:await bcrypt.hash('Demo@12345',10),address:'Demo address — replace before checkout',preferences:{diet:'vegetarian',household:3,budget:'balanced',upcomingFestival:''},createdAt:new Date().toISOString()});saveLocal();
  }
  console.log(`Local demo mode (${catalog.length} generated catalog products); data saved in backend/.data/local-store.json`);
 }
}
export function getProducts(){return products;}
export async function findUserByEmail(email:string){return dbMode==='mongodb'?await UserModel.findOne({email}).lean() as User|null:local.users.find(u=>u.email===email)||null;}
export async function findUser(id:string){return dbMode==='mongodb'?await UserModel.findOne({id}).lean() as User|null:local.users.find(u=>u.id===id)||null;}
export async function createUser(data:Omit<User,'id'|'createdAt'>){
 const u:User={...data,id:crypto.randomUUID(),createdAt:new Date().toISOString()};
 if(dbMode==='mongodb')await UserModel.create(u);else{local.users.push(u);saveLocal();}return u;
}
export async function updateUser(id:string,patch:Partial<Pick<User,'name'|'address'|'preferences'>>){
 if(dbMode==='mongodb')return await UserModel.findOneAndUpdate({id},{$set:patch},{new:true}).lean() as User|null;
 const u=local.users.find(x=>x.id===id);if(!u)return null;Object.assign(u,patch);saveLocal();return u;
}
export async function getOrders(userId:string){const list=dbMode==='mongodb'?await OrderModel.find({userId}).sort({createdAt:-1}).lean() as Order[]:local.orders.filter(o=>o.userId===userId);return list.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
export async function getOrder(id:string){return dbMode==='mongodb'?await OrderModel.findOne({id}).lean() as Order|null:local.orders.find(x=>x.id===id)||null;}
export async function findByClientOrderId(userId:string,clientOrderId:string){return dbMode==='mongodb'?await OrderModel.findOne({userId,clientOrderId}).lean() as Order|null:local.orders.find(x=>x.userId===userId&&x.clientOrderId===clientOrderId)||null;}
export async function saveOrder(o:Order){if(dbMode==='mongodb'){await OrderModel.create(o);}else{local.orders.push(o);saveLocal();}return o;}
export async function releaseProducts(lines:{productId:string;quantity:number}[]){
 for(const l of lines){
  if(dbMode==='mongodb')await ProductModel.updateOne({id:l.productId},{$inc:{stock:l.quantity}});
  const localProduct=products.find(p=>p.id===l.productId);if(localProduct)localProduct.stock+=l.quantity;
 }
}
export async function reserveProducts(lines:{productId:string;quantity:number}[]):Promise<boolean>{
 const reserved:{productId:string;quantity:number}[]=[];
 try{
  for(const l of lines){
   const p=products.find(x=>x.id===l.productId);
   if(!p||p.stock<l.quantity){await releaseProducts(reserved);return false;}
   if(dbMode==='mongodb'){
    const result=await ProductModel.updateOne({id:l.productId,stock:{$gte:l.quantity}},{$inc:{stock:-l.quantity}});
    if(!result.modifiedCount){await releaseProducts(reserved);return false;}
   }
   p.stock-=l.quantity;reserved.push(l);
  }
  return true;
 }catch(e){await releaseProducts(reserved);throw e;}
}
export async function setOrderStatus(id:string,status:OrderStatus){
 const updatedAt=new Date().toISOString();
 if(dbMode==='mongodb')return await OrderModel.findOneAndUpdate({id,...(status==='cancelled'?{status:'placed'}:{status:{$nin:['cancelled','delivered']}})},{$set:{status,updatedAt}},{new:true}).lean() as Order|null;
 const o=local.orders.find(x=>x.id===id);if(!o||o.status==='cancelled'||o.status==='delivered'||(status==='cancelled'&&o.status!=='placed'))return null;o.status=status;o.updatedAt=updatedAt;saveLocal();return o;
}
