import {useId,useState,type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import {motion,AnimatePresence,useReducedMotion} from 'motion/react';
import {weight,sum,type Entry,type Category} from './model';import{entryColor}from'./colors';

export const COLORS=['#70d8f3','#429de9','#5556bd','#69419d'];

/** Proportional, unlabelled blocks share one width scale across the month. */
export function Tower({entries,large=false,active,onLayer,replay=0,scale=12,categories=[],rowIndex=0}:{entries:Entry[];large?:boolean;active?:string;onLayer?:(e:Entry)=>void;replay?:number;scale?:number;categories?:Category[];rowIndex?:number}) {
  const reduced=useReducedMotion();
  const id=useId();
  const [tip,setTip]=useState<{entry:Entry;x:number;y:number;below:boolean}|null>(null);
  const denominator=large?Math.max(scale,sum(entries)):scale;
  let elapsed=0;const starts=entries.map(e=>{const start=elapsed;elapsed+=weight(e);return start});
  function show(e:Entry,target:HTMLElement){const r=target.getBoundingClientRect();const below=r.top<100;setTip({entry:e,x:Math.max(12,Math.min(r.left+r.width/2-130,window.innerWidth-272)),y:below?r.bottom+10:r.top-10,below})}
  return <div className={`tower block-train ${large?'large':''}`}>
    <div className="strata-stack">
      {entries.map((e,i)=><motion.button
        key={`${e.id}-${replay}`}
        type="button"
        className={`progress-block depth-${e.depth} ${active===e.id?'active-block':''}`}
        aria-label={`${e.title}、${entryColor(e,categories).category.name}、深さ${e.depth}、進捗${e.progress}、${weight(e)}ポイント`}
        aria-describedby={tip?.entry.id===e.id?id:undefined}
        onMouseEnter={event=>show(e,event.currentTarget)}
        onMouseLeave={()=>setTip(null)}
        onFocus={event=>show(e,event.currentTarget)}
        onBlur={()=>setTip(null)}
        onKeyDown={event=>{if(event.key==='Escape')setTip(null)}}
        onClick={event=>{event.stopPropagation();onLayer?.(e);show(e,event.currentTarget)}}
        initial={reduced?false:{opacity:0,scaleX:0,scaleY:.75}}
        animate={{opacity:1,scaleX:1,scaleY:1}}
        transition={{duration:reduced?0:replay?1.5:.95,ease:[.22,.65,.25,1],delay:replay&&!reduced?rowIndex*.035+starts[i]/Math.max(elapsed,1)*1.8:0}}
        data-category={e.categoryId??''} data-points={weight(e)} style={{width:`${weight(e)/denominator*100}%`,backgroundColor:entryColor(e,categories).fill,'--block-glow':entryColor(e,categories).glow,'--glow-delay':`${-(i*.73+rowIndex*.31)}s`} as CSSProperties}
      />)}
      {!entries.length&&<span className="empty-track" aria-hidden="true"/>}
    </div>
    {createPortal(<AnimatePresence>{tip&&<motion.div key={tip.entry.id} id={id} role="tooltip" className="block-tooltip" initial={reduced?false:{opacity:0,y:tip.below?-4:4}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:reduced?0:.16}} style={{left:tip.x,top:tip.below?tip.y:undefined,bottom:tip.below?undefined:window.innerHeight-tip.y}}><b>{tip.entry.title}</b><em className="tooltip-category"><i style={{background:entryColor(tip.entry,categories).category.color}}/>{entryColor(tip.entry,categories).category.name}</em><span>深さ Lv.{tip.entry.depth} <i/> 進捗 {tip.entry.progress} <i/> {weight(tip.entry)} pt</span></motion.div>}</AnimatePresence>,document.body)}
  </div>;
}
