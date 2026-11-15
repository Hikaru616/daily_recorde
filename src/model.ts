export type Entry={id:string;date:string;title:string;depth:number;progress:number;note:string;quantity?:number;unit:string;projectId:string;categoryId?:string;createdAt:number};
export type Project={id:string;name:string};
export type Category={id:string;name:string;color:string};
export type Data={version:2;entries:Entry[];projects:Project[];categories:Category[]};
export const WEIGHT={base:1,depth:0.8,progress:0.5};
export const weight=(e:Pick<Entry,'depth'|'progress'>)=>Math.round((WEIGHT.base+WEIGHT.depth*(e.depth-1)+WEIGHT.progress*e.progress)*10)/10;
export const sum=(es:Entry[])=>Math.round(es.reduce((n,e)=>n+weight(e),0)*10)/10;
export const localDate=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(new Date());
export const emptyData=():Data=>({version:2,entries:[],projects:[],categories:[]});
export function validate(input:unknown):Data {
  const d=input as Data;const version=(input as {version?:number})?.version;
  if(!d||![1,2].includes(version??0)||!Array.isArray(d.entries)||!Array.isArray(d.projects))throw Error('対応しているSTRATAのJSONではありません。');
  const categories:Category[]=version===1?[]:d.categories;
  if(!Array.isArray(categories))throw Error('カテゴリー情報が不正です。');
  const categoryIds=new Set<string>();
  for(const c of categories){if(!c||typeof c.id!=='string'||!c.id||categoryIds.has(c.id)||typeof c.name!=='string'||!c.name.trim()||c.name.length>40||typeof c.color!=='string'||!/^#[0-9a-f]{6}$/i.test(c.color))throw Error('カテゴリー情報が不正です。');categoryIds.add(c.id)}
  const ids=new Set<string>();
  for(const p of d.projects){if(!p||typeof p.id!=='string'||typeof p.name!=='string'||!p.name.trim()||ids.has(p.id))throw Error('プロジェクト情報が不正です。');ids.add(p.id)}
  const ei=new Set<string>();
  for(const e of d.entries){if(!e||typeof e.id!=='string'||ei.has(e.id)||typeof e.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||Number.isNaN(Date.parse(e.date))||new Date(e.date).toISOString().slice(0,10)!==e.date||typeof e.title!=='string'||!e.title.trim()||e.title.length>120||!Number.isInteger(e.depth)||e.depth<1||e.depth>4||!Number.isInteger(e.progress)||e.progress<0||e.progress>3||typeof e.note!=='string'||typeof e.unit!=='string'||typeof e.projectId!=='string'||(e.projectId&&!ids.has(e.projectId))||!Number.isFinite(e.createdAt)||(e.quantity!==undefined&&(!Number.isFinite(e.quantity)||e.quantity<0))||(version===2&&e.categoryId!==undefined&&(typeof e.categoryId!=='string'||(e.categoryId&&!categoryIds.has(e.categoryId)))))throw Error('記録データの形式が不正です。');ei.add(e.id)}
  return {version:2,entries:d.entries.map(e=>({...e,categoryId:version===1?'':e.categoryId??''})),projects:d.projects,categories};
}
export function sample(month:string):Data{
  const projects=[{id:'research',name:'研究テーマを育てる'},{id:'career',name:'納得できるキャリアへ'},{id:'learn',name:'学びの習慣'}];
  const categories=[{id:'research',name:'研究',color:'#8b7cf8'},{id:'career',name:'就活',color:'#ef99bd'},{id:'learn',name:'学習',color:'#66cbb9'}];
  const titles=[['論文の仮説を読み解く','研究の問いを整理'],['自己PRの構成を見直す','面接の振り返り'],['線形代数の復習','Rubyで問題を解く'],['研究ノートを整理'],['難しい問いと向き合う','改善の糸口を発見','次の一歩をメモ']];
  const entries:Entry[]=[];
  for(let day=1;day<=14;day++){if([3,8].includes(day))continue;const ts=titles[(day-1)%titles.length];ts.forEach((title,i)=>entries.push({id:`demo-${day}-${i}`,date:`${month}-${String(day).padStart(2,'0')}`,title,depth:(day+i)%3+2,progress:(day+i)%4,note:'考えたことを言葉にすると、次に向き合うべき問いが少し明確になった。完成していなくても、今日の発見を残しておく。',unit:'',projectId:projects[(day-1)%3].id,categoryId:categories[(day-1)%3].id,createdAt:day*100+i}))}
  return {version:2,entries,projects,categories};
}
