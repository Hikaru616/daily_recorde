import {validate,type Data} from './model';

const API_URL='/api/data';
const LEGACY_KEY='main';
let legacyDatabase:Promise<IDBDatabase>|undefined;

function openLegacyDatabase(){
  return legacyDatabase??=new Promise<IDBDatabase>((resolve,reject)=>{
    const request=indexedDB.open('strata-v1',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('data');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(Error('以前のブラウザ保存データを読み込めませんでした。'));
  });
}

async function loadLegacyData():Promise<Data|null>{
  if(!('indexedDB' in globalThis))return null;
  const db=await openLegacyDatabase();
  return new Promise((resolve,reject)=>{
    const request=db.transaction('data').objectStore('data').get(LEGACY_KEY);
    request.onsuccess=()=>{
      try{resolve(request.result?validate(request.result):null)}catch(error){reject(error)}
    };
    request.onerror=()=>reject(request.error);
  });
}

async function apiError(response:Response){
  try{
    const body=await response.json() as {error?:string};
    return body.error||`サーバーエラーが発生しました（${response.status}）。`;
  }catch{return `サーバーエラーが発生しました（${response.status}）。`}
}

async function saveToApi(data:Data){
  const valid=validate(data);
  let response:Response;
  try{
    response=await fetch(API_URL,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(valid)});
  }catch{throw Error('保存サーバーに接続できません。MySQLとAPIの起動状態をご確認ください。')}
  if(!response.ok)throw Error(await apiError(response));
}

export const repository={
  async load():Promise<Data|null>{
    let response:Response;
    try{response=await fetch(API_URL)}catch{throw Error('保存サーバーに接続できません。MySQLとAPIの起動状態をご確認ください。')}
    if(response.status===204){
      const legacy=await loadLegacyData();
      if(legacy)await saveToApi(legacy);
      return legacy;
    }
    if(!response.ok)throw Error(await apiError(response));
    return validate(await response.json());
  },
  save:saveToApi,
};
