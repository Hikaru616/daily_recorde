import assert from 'node:assert/strict';
import test from 'node:test';
import {ValidationError,validateData} from './validation.js';

const validData=()=>({
  version:2,
  projects:[{id:'project-1',name:'研究'}],
  categories:[{id:'category-1',name:'学習',color:'#8b7cf8'}],
  entries:[{id:'entry-1',date:'2026-11-18',title:'APIを実装',depth:3,progress:2,note:'',quantity:1,unit:'件',projectId:'project-1',categoryId:'category-1',createdAt:Date.now()}],
});

test('MySQL API accepts valid data',()=>{
  const data=validData();
  assert.equal(validateData(data),data);
});

test('MySQL API rejects broken references',()=>{
  const data=validData();
  data.entries[0].projectId='missing';
  assert.throws(()=>validateData(data),ValidationError);
});

test('MySQL API rejects IDs that do not fit the relational schema',()=>{
  const data=validData();
  data.entries[0].id='x'.repeat(192);
  assert.throws(()=>validateData(data),ValidationError);
});
