import 'dotenv/config';
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import express, {type Request,type Response,type NextFunction} from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {Server} from 'socket.io';
import {z,ZodError} from 'zod';
import {categories} from './catalog.js';
import {rankProducts} from './matching.js';
import {buildCartAI,smartSearch,getRecommendations,reorderSuggestions} from './ai.js';
import {initializeStore,currentMode,getProducts,findUserByEmail,findUser,createUser,updateUser,publicUser,getOrders,getOrder,findByClientOrderId,saveOrder,setOrderStatus,reserveProducts,releaseProducts,type User,type Order,type OrderStatus} from './store.js';

const app=express();const server=http.createServer(app);
const origins=(process.env.FRONTEND_URL||'http://localhost:5173').split(',').map(x=>x.trim());
const io=new Server(server,{cors:{origin:origins,methods:['GET','POST']}});
if(process.env.NODE_ENV==='production'&&!process.env.JWT_SECRET)throw Error('JWT_SECRET is required in production');
const secret=process.env.JWT_SECRET||crypto.randomBytes(32).toString('hex');
if(!process.env.JWT_SECRET)console.warn('Development: JWT_SECRET generated for this process; sessions expire after backend restart.');
app.use(helmet({contentSecurityPolicy:false}));app.use(cors({origin:origins}));app.use(express.json({limit:'32kb'}));
app.disable('x-powered-by');
const limiter=rateLimit({windowMs:15*60*1000,limit:120,standardHeaders:'draft-7',legacyHeaders:false});
const authLimiter=rateLimit({windowMs:15*60*1000,limit:20,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Too many attempts. Try again later.'}});
const aiLimiter=rateLimit({windowMs:15*60*1000,limit:30,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'AI rate limit reached. Try again later.'}});
app.use('/api',limiter);
function tokenFor(u:User){return jwt.sign({sub:u.id},secret,{expiresIn:'7d'});}
function userIdFromToken(token:string){try{const data=jwt.verify(token,secret) as jwt.JwtPayload;return typeof data.sub==='string'?data.sub:null;}catch{return null;}}
async function optionalAuth(req:Request,_res:Response,next:NextFunction){const raw=req.headers.authorization?.replace(/^Bearer\s+/i,'');(req as Request&{userId?:string}).userId=raw?userIdFromToken(raw)||undefined:undefined;next();}
function requireAuth(req:Request,res:Response,next:NextFunction){const raw=req.headers.authorization?.replace(/^Bearer\s+/i,'');const id=raw?userIdFromToken(raw):null;if(!id){res.status(401).json({error:'Sign in to continue.'});return;}(req as Request&{userId?:string}).userId=id;next();}
const uid=(r:Request)=>(r as Request&{userId?:string}).userId!;
const asyncRoute=(fn:(req:Request,res:Response)=>Promise<unknown>)=>(req:Request,res:Response,next:NextFunction)=>{Promise.resolve(fn(req,res)).catch(next);};

app.get('/api/health',(_req,res)=>res.json({ok:true,name:'InstaKart API',catalogCount:getProducts().length,dbMode:currentMode(),aiMode:process.env.GROQ_API_KEY?'groq':'demo',delivery:'simulation'}));
app.get('/api/categories',(_req,res)=>res.json({categories}));
app.get('/api/products',(req,res)=>{
 const query=String(req.query.q||'').trim().slice(0,120),category=String(req.query.category||'');const limit=Math.min(Number(req.query.limit)||36,100);
 let items=getProducts().filter(p=>p.stock>0&&(!category||p.category===category));
 if(query)items=rankProducts(query,items,undefined,limit);
 else items=[...items].sort((a,b)=>Number(b.featured)-Number(a.featured)||a.price-b.price).slice(0,limit);
 res.json({products:items,total:items.length});
});
app.get('/api/products/:id',(req,res)=>{const p=getProducts().find(x=>x.id===req.params.id);if(!p){res.status(404).json({error:'Product not found'});return;}res.json({product:p});});
const registerSchema=z.object({name:z.string().trim().min(2).max(60),email:z.string().email().max(160).transform(x=>x.toLowerCase()),password:z.string().min(8).max(100)});
const loginSchema=z.object({email:z.string().email().transform(x=>x.toLowerCase()),password:z.string().min(1)});
app.post('/api/auth/register',authLimiter,asyncRoute(async(req,res)=>{
 const body=registerSchema.parse(req.body);if(await findUserByEmail(body.email)){res.status(409).json({error:'An account with this email already exists.'});return;}
 const user=await createUser({name:body.name,email:body.email,passwordHash:await bcrypt.hash(body.password,12),address:'',preferences:{diet:'any',household:2,budget:'balanced',upcomingFestival:''}});
 res.status(201).json({token:tokenFor(user),user:publicUser(user)});
}));
app.post('/api/auth/login',authLimiter,asyncRoute(async(req,res)=>{
 const body=loginSchema.parse(req.body),user=await findUserByEmail(body.email);
 if(!user||!await bcrypt.compare(body.password,user.passwordHash)){res.status(401).json({error:'Invalid email or password.'});return;}
 res.json({token:tokenFor(user),user:publicUser(user)});
}));
app.post('/api/auth/demo',authLimiter,asyncRoute(async(_req,res)=>{
 if(currentMode()!=='local'||process.env.NODE_ENV==='production'){res.status(403).json({error:'Demo sign-in is only available in local development.'});return;}
 const user=await findUserByEmail('demo@instakart.local');if(!user){res.status(404).json({error:'Demo account not found'});return;}
 res.json({token:tokenFor(user),user:publicUser(user)});
}));
app.get('/api/auth/me',requireAuth,asyncRoute(async(req,res)=>{
 const user=await findUser(uid(req));if(!user){res.status(401).json({error:'User no longer exists'});return;}res.json({user:publicUser(user)});
}));
const profileSchema=z.object({name:z.string().min(2).max(60).optional(),address:z.string().max(200).optional(),preferences:z.object({diet:z.enum(['any','vegetarian','vegan']),household:z.number().int().min(1).max(15),budget:z.enum(['value','balanced','premium']),upcomingFestival:z.string().max(50)}).optional()});
app.patch('/api/auth/me',requireAuth,asyncRoute(async(req,res)=>{const user=await updateUser(uid(req),profileSchema.parse(req.body));if(!user){res.status(404).json({error:'Account not found'});return;}res.json({user:publicUser(user)});}));
app.post('/api/ai/build-cart',aiLimiter,asyncRoute(async(req,res)=>{const {query}=z.object({query:z.string().trim().min(2).max(500)}).parse(req.body);res.json(await buildCartAI(query));}));
app.get('/api/ai/search',aiLimiter,asyncRoute(async(req,res)=>{const {q}=z.object({q:z.string().trim().min(2).max(200)}).parse(req.query);res.json(await smartSearch(q));}));
app.post('/api/ai/recommendations',aiLimiter,optionalAuth,asyncRoute(async(req,res)=>{
 const parsed=z.object({cartIds:z.array(z.string()).max(100).default([])}).parse(req.body||{});
 const id=(req as Request&{userId?:string}).userId,user=id?await findUser(id):null,orders=id?await getOrders(id):[];
 res.json(await getRecommendations(user,orders,parsed.cartIds));
}));
app.get('/api/ai/reorder',requireAuth,asyncRoute(async(req,res)=>{res.json({suggestions:reorderSuggestions(await getOrders(uid(req)))});}));

const checkoutSchema=z.object({clientOrderId:z.string().uuid(),lines:z.array(z.object({productId:z.string(),quantity:z.number().int().min(1).max(15)})).min(1).max(40),address:z.string().trim().min(8).max(200),zap:z.boolean().default(false)});
function scheduleDelivery(order:Order){
 if(process.env.SIMULATE_DELIVERY==='false')return;
 const phases:{after:number;status:OrderStatus}[]=[{after:8000,status:'picking'},{after:17000,status:'packed'},{after:28000,status:'out_for_delivery'},{after:45000,status:'delivered'}];
 for(const phase of phases)setTimeout(async()=>{try{
  const latest=await getOrder(order.id);if(!latest||latest.status==='cancelled'||latest.status==='delivered')return;
  const updated=await setOrderStatus(order.id,phase.status);if(updated)io.to(`user:${order.userId}`).emit('order:updated',updated);
 }catch(e){console.error('Demo delivery transition failed',e);}},phase.after).unref();
}
app.post('/api/orders',requireAuth,asyncRoute(async(req,res)=>{
 const data=checkoutSchema.parse(req.body),id=uid(req);
 const previous=await findByClientOrderId(id,data.clientOrderId);if(previous){res.json({order:previous,duplicate:true});return;}
 const distinct=new Map<string,number>();for(const line of data.lines)distinct.set(line.productId,Math.min(15,(distinct.get(line.productId)||0)+line.quantity));
 const lines=[];for(const [productId,quantity] of distinct){const p=getProducts().find(x=>x.id===productId);if(!p||p.stock<quantity){res.status(409).json({error:`Product ${productId} is unavailable or has insufficient stock.`});return;}
  lines.push({productId,name:p.name,emoji:p.emoji,unit:p.unit,quantity,unitPrice:p.price});}
 const subtotal=lines.reduce((n,l)=>n+l.quantity*l.unitPrice,0),deliveryFee=subtotal>=299?0:25,stamp=new Date().toISOString();
 const order:Order={id:crypto.randomUUID(),userId:id,clientOrderId:data.clientOrderId,lines,total:subtotal+deliveryFee,deliveryFee,status:'placed',paymentMethod:'COD',address:data.address,createdAt:stamp,updatedAt:stamp,zap:data.zap,etaMinutes:9};
 if(!await reserveProducts(lines)){res.status(409).json({error:'Some items went out of stock during checkout. Refresh the cart and try again.'});return;}
 try{await saveOrder(order);}catch(e){await releaseProducts(lines);const existing=await findByClientOrderId(id,data.clientOrderId);if(existing){res.json({order:existing,duplicate:true});return;}throw e;}
 io.to(`user:${id}`).emit('order:updated',order);scheduleDelivery(order);res.status(201).json({order,duplicate:false});
}));
app.get('/api/orders',requireAuth,asyncRoute(async(req,res)=>res.json({orders:await getOrders(uid(req))})));
app.get('/api/orders/:id',requireAuth,asyncRoute(async(req,res)=>{const order=await getOrder(req.params.id);if(!order||order.userId!==uid(req)){res.status(404).json({error:'Order not found'});return;}res.json({order});}));
app.post('/api/orders/:id/cancel',requireAuth,asyncRoute(async(req,res)=>{
 const order=await getOrder(req.params.id);if(!order||order.userId!==uid(req)){res.status(404).json({error:'Order not found'});return;}
 if(order.status!=='placed'||Date.now()-new Date(order.createdAt).getTime()>8000){res.status(409).json({error:'Order can only be cancelled during the first 8 seconds while still placed.'});return;}
 const updated=await setOrderStatus(order.id,'cancelled');if(!updated){res.status(409).json({error:'Order is no longer cancellable.'});return;}await releaseProducts(order.lines);io.to(`user:${uid(req)}`).emit('order:updated',updated);res.json({order:updated});
}));
io.use((socket,next)=>{const token=String(socket.handshake.auth?.token||'');const id=userIdFromToken(token);if(!id){next(new Error('Authentication required'));return;}socket.data.userId=id;next();});
io.on('connection',socket=>{socket.join(`user:${socket.data.userId}`);socket.emit('connected',{ok:true});});
app.use('/api',(_req,res)=>res.status(404).json({error:'API endpoint not found'}));
const frontend=path.resolve(process.cwd(),'../frontend/dist');
if(fs.existsSync(path.join(frontend,'index.html'))){
 app.use(express.static(frontend));
 app.get('*',(_req,res)=>res.sendFile(path.join(frontend,'index.html')));
}
app.use((err:unknown,_req:Request,res:Response,_next:NextFunction)=>{
 if(err instanceof ZodError){res.status(400).json({error:'Invalid request',details:err.issues.map(x=>`${x.path.join('.')}: ${x.message}`)});return;}
 if(err instanceof Error&&err.message.includes('E11000')){res.status(409).json({error:'Duplicate record'});return;}
 console.error('Request error:',err);res.status(500).json({error:'Unexpected server error. Please try again.'});
});
const port=Number(process.env.PORT||3001);
initializeStore().then(()=>server.listen(port,()=>console.log(`InstaKart API running on http://localhost:${port} (${currentMode()})`))).catch(e=>{console.error('Startup failed:',e);process.exit(1);});
