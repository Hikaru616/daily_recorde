import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkDatabase,closeDatabase,initializeDatabase,loadData,saveData} from './database.js';
import {ValidationError,validateData} from './validation.js';

const app=express();
const port=Number(process.env.PORT||3000);
const directory=path.dirname(fileURLToPath(import.meta.url));
const distDirectory=path.resolve(directory,'../dist');

app.disable('x-powered-by');
app.use(express.json({limit:'5mb'}));

app.get('/api/health',async(_request,response,next)=>{
  try{
    await checkDatabase();
    response.json({status:'ok',database:'mysql'});
  }catch(error){next(error)}
});

app.get('/api/data',async(_request,response,next)=>{
  try{
    const data=await loadData();
    response.set('Cache-Control','no-store');
    if(data===null)return response.status(204).end();
    response.json(data);
  }catch(error){next(error)}
});

app.put('/api/data',async(request,response,next)=>{
  try{
    const data=validateData(request.body);
    await saveData(data);
    response.status(204).end();
  }catch(error){next(error)}
});

app.use('/api',(_request,response)=>response.status(404).json({error:'APIが見つかりません。'}));

app.use(express.static(distDirectory,{index:false}));
app.use((request,response,next)=>{
  if(request.method!=='GET'||!request.accepts('html'))return next();
  response.sendFile(path.join(distDirectory,'index.html'),error=>{if(error)next(error)});
});

app.use((error,_request,response,_next)=>{
  if(error?.type==='entity.too.large')return response.status(413).json({error:'保存データは5MB以下にしてください。'});
  if(error instanceof ValidationError||error instanceof SyntaxError&&'body' in error){
    return response.status(400).json({error:error.message});
  }
  console.error(error);
  response.status(500).json({error:'サーバーで保存処理に失敗しました。時間をおいてもう一度お試しください。'});
});

await initializeDatabase();
const server=app.listen(port,'0.0.0.0',()=>console.log(`STRATA server: http://localhost:${port}`));

async function shutdown(){
  server.close(async()=>{
    await closeDatabase();
    process.exit(0);
  });
}

process.on('SIGTERM',shutdown);
process.on('SIGINT',shutdown);
