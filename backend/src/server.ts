import { createApp } from './app.js';
import { pool } from './db.js';
if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const app=createApp();
await app.listen({port:Number(process.env.PORT||8080),host:process.env.AUTH_MODE==='demo'?'127.0.0.1':'0.0.0.0'});
for(const signal of ['SIGTERM','SIGINT']) process.on(signal,async()=>{await app.close();await pool.end();process.exit(0);});
