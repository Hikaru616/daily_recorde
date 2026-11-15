import {weight,type Entry,type Category} from './model.ts';
export const UNCATEGORIZED={id:'',name:'未分類',color:'#8896b4'};
export function categoryFor(e:Entry,categories:Category[]){return categories.find(c=>c.id===e.categoryId)??UNCATEGORIZED}
/** Fix hue/saturation within a category; only lightness decreases with points. */
export function pointColor(base:string,points:number){
  const [r,g,b]=[1,3,5].map(i=>parseInt(base.slice(i,i+2),16)/255);
  const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
  const light=(max+min)/2;
  let hue=0;if(delta){if(max===r)hue=((g-b)/delta)%6;else if(max===g)hue=(b-r)/delta+2;else hue=(r-g)/delta+4;hue=(hue*60+360)%360}
  const saturation=delta===0?0:delta/(1-Math.abs(2*light-1))*100;
  const intensity=Math.max(0,Math.min(1,(points-1)/3.9));
  const l=82-intensity*42;
  return {fill:`hsl(${hue.toFixed(1)} ${saturation.toFixed(1)}% ${l.toFixed(1)}%)`,glow:`hsl(${hue.toFixed(1)} ${saturation.toFixed(1)}% 72%)`,lightness:l};
}
export function entryColor(e:Entry,categories:Category[]){const category=categoryFor(e,categories);return {...pointColor(category.color,weight(e)),category}}
