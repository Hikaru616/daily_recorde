export class ValidationError extends Error{}

const fail=message=>{throw new ValidationError(message)};
const validId=(value)=>typeof value==='string'&&value.length>0&&value.length<=191;

export function validateData(data){
  if(!data||typeof data!=='object'||data.version!==2||!Array.isArray(data.entries)||!Array.isArray(data.projects)||!Array.isArray(data.categories)){
    fail('保存データの形式が正しくありません。');
  }

  const projectIds=new Set();
  for(const project of data.projects){
    if(!project||!validId(project.id)||typeof project.name!=='string'||!project.name.trim()||projectIds.has(project.id))fail('プロジェクト情報が不正です。');
    projectIds.add(project.id);
  }

  const categoryIds=new Set();
  for(const category of data.categories){
    if(!category||!validId(category.id)||typeof category.name!=='string'||!category.name.trim()||category.name.length>40||typeof category.color!=='string'||!/^#[0-9a-f]{6}$/i.test(category.color)||categoryIds.has(category.id))fail('カテゴリー情報が不正です。');
    categoryIds.add(category.id);
  }

  const entryIds=new Set();
  for(const entry of data.entries){
    const validDate=typeof entry?.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(entry.date)&&!Number.isNaN(Date.parse(`${entry.date}T00:00:00Z`))&&new Date(`${entry.date}T00:00:00Z`).toISOString().slice(0,10)===entry.date;
    const validProject=typeof entry?.projectId==='string'&&(!entry.projectId||projectIds.has(entry.projectId));
    const validCategory=typeof entry?.categoryId==='string'&&(!entry.categoryId||categoryIds.has(entry.categoryId));
    const validQuantity=entry?.quantity===undefined||(Number.isFinite(entry.quantity)&&entry.quantity>=0);
    if(!entry||!validId(entry.id)||entryIds.has(entry.id)||!validDate||typeof entry.title!=='string'||!entry.title.trim()||entry.title.length>120||!Number.isInteger(entry.depth)||entry.depth<1||entry.depth>4||!Number.isInteger(entry.progress)||entry.progress<0||entry.progress>3||typeof entry.note!=='string'||typeof entry.unit!=='string'||!validProject||!validCategory||!Number.isSafeInteger(entry.createdAt)||!validQuantity){
      fail('記録データの形式が不正です。');
    }
    entryIds.add(entry.id);
  }

  return data;
}
