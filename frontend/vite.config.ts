import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
 plugins:[react(), VitePWA({registerType:'autoUpdate',includeAssets:['favicon.svg'],manifest:{name:'InstaKart AI Grocery',short_name:'InstaKart',description:'AI-powered local grocery demo',theme_color:'#172d20',background_color:'#f8f9f4',display:'standalone',icons:[{src:'/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'}]}})],
 server:{port:5173,proxy:{'/api':'http://localhost:3001','/socket.io':{target:'http://localhost:3001',ws:true}}}
});
