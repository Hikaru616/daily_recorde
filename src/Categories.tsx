import {useState} from 'react';
import {Plus,Pencil,Trash2,Check,Tag} from 'lucide-react';
import {type Category} from './model';
import {pointColor} from './colors';
const PRESETS=['#8b7cf8','#66cbb9','#ef99bd','#6bb4f2','#eaba73','#cf86ed','#83c887','#e78c80'];
export function Categories({categories,busy,onSave,onDelete,onBack}:{categories:Category[];busy:boolean;onSave:(category:Category)=>Promise<boolean>;onDelete:(category:Category)=>Promise<void>;onBack?:()=>void}){
 const [editing,setEditing]=useState('');const [name,setName]=useState('');const [color,setColor]=useState(PRESETS[0]);
 return <><div className="eyebrow">YOUR CATEGORIES</div><h2>カテゴリー</h2><p className="modal-intro">色はカテゴリーごと。ポイントが高いほど濃く表示します。</p>
 <div className="category-list">{categories.length?categories.map(c=><div className="category-row" key={c.id}><i style={{background:c.color}}/><b>{c.name}</b><button className="icon-button" aria-label={`${c.name}を編集`} onClick={()=>{setEditing(c.id);setName(c.name);setColor(c.color)}}><Pencil size={14}/></button><button disabled={busy} className="icon-button" aria-label={`${c.name}を削除`} onClick={()=>onDelete(c)}><Trash2 size={14}/></button></div>):<div className="category-empty"><Tag size={18}/><span>最初のカテゴリーを作成しましょう。</span></div>}</div>
 <form className="category-form" onSubmit={async e=>{e.preventDefault();if(!name.trim())return;const saved=await onSave({id:editing||crypto.randomUUID(),name:name.trim(),color});if(saved){setName('');setEditing('');setColor(PRESETS[(categories.length+1)%PRESETS.length])}}}>
 <label>カテゴリー名<input autoFocus required maxLength={40} value={name} onChange={e=>setName(e.target.value)} placeholder="例：研究、筋トレ、英語"/></label>
 <label>カテゴリーの色</label><div className="category-swatches">{PRESETS.map(c=><button key={c} type="button" aria-label={`色 ${c}`} aria-pressed={c.toLowerCase()===color.toLowerCase()} className={c.toLowerCase()===color.toLowerCase()?'chosen':''} style={{background:c}} onClick={()=>setColor(c)}>{c.toLowerCase()===color.toLowerCase()&&<Check size={15}/>}</button>)}<label className="custom-color">自由な色<input type="color" aria-label="自由な色" value={color} onChange={e=>setColor(e.target.value)}/></label></div>
 <div className="category-preview"><span>薄い / 1 pt</span><div>{[1,2.3,3.4,4.9].map(p=><i key={p} style={{background:pointColor(color,p).fill}}/>)}</div><span>4.9 pt / 濃い</span></div>
 <div className="category-form-actions">{editing&&<button type="button" className="secondary" onClick={()=>{setEditing('');setName('')}}>編集をやめる</button>}<button className="primary" disabled={busy||!name.trim()}><Plus size={15}/>{editing?'カテゴリーを更新':'カテゴリーを作成'}</button></div>
 </form>{onBack&&<button className="secondary category-back" onClick={onBack}>記録の入力に戻る</button>}</>;
}
