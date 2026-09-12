'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileSpreadsheet, Loader2, Search, UploadCloud } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { normalizeProductPackage } from '@/lib/catalog/product-package';

type Row = {
  id:string; selected:boolean; source:string; relation:string; parentSku:string; productType:string;
  title:string; sourceTitle:string; description:string; sourceBrand:string; brand:string; category:string;
  sku:string; asin:string; size:string; color:string; stock:string; mrp:string; price:string;
  hsn:string; gst:string; weight:string; length:string; width:string; height:string; image:string;
  seoTitle:string; seoDescription:string;
};
type Filter = 'all'|'ready'|'review'|'missing';

const clean = (v:unknown) => String(v ?? '').replace(/\s+/g,' ').trim();
const k = (v:string) => v.toLowerCase().trim().replace(/[_\s]+/g,'-');
const number = (v:unknown) => clean(v).replace(/,/g,'').match(/\d+(?:\.\d+)?/)?.[0] || '';
const bannedMarketplace = /\bamazon(?:\.in|\.com)?\b/gi;
function storefrontText(v:string){ return clean(v.replace(bannedMarketplace,'').replace(/\s{2,}/g,' ')); }
function titleCase(v:string){ return v.replace(/[_-]+/g,' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()).trim(); }
function autoDescription(title:string, productType:string, color:string, size:string){
  const bits=[productType && titleCase(productType),color && `Color: ${color}`,size && `Size: ${size}`].filter(Boolean).join('. ');
  return storefrontText(`${title}. ${bits}${bits ? '.' : ''} Carefully review product specifications, size and package details before publishing.`).slice(0,700);
}
function seo(title:string){ return storefrontText(`${title} | ADHYEY BROTHERS`).slice(0,60); }
function seoDesc(title:string, description:string){ return storefrontText(description || `Shop ${title} from ADHYEY BROTHERS.`).slice(0,155); }
function validUrl(v:string){ try { const u=new URL(v); return ['http:','https:'].includes(u.protocol); } catch { return false; } }
function normalizeUnit(v:string,u:string,kind:'weight'|'length'){
  const n=Number(number(v)); if(!n) return '';
  const unit=clean(u).toLowerCase();
  if(kind==='weight') { if(unit.includes('kg')||unit.includes('kilogram')) return String(Math.round(n*1000*100)/100); if(unit.includes('lb')||unit.includes('pound')) return String(Math.round(n*453.592*100)/100); return String(n); }
  if(unit.includes('mm')||unit.includes('millimet')) return String(Math.round(n/10*100)/100);
  if(unit.includes('inch')) return String(Math.round(n*2.54*100)/100); return String(n);
}
function smartCategory(productType:string,title:string,categories:string[]){
  const words=new Set(`${productType} ${title}`.toLowerCase().replace(/[_-]/g,' ').split(/\W+/).filter(x=>x.length>2));
  let best='',score=0;
  for(const c of categories){ const cw=c.toLowerCase().split(/\W+/).filter(x=>x.length>2); const s=cw.filter(x=>words.has(x)).length; if(s>score){score=s;best=c;} }
  return score ? best : '';
}

export default function CatalogAutomationPreview(){
  const [rows,setRows]=useState<Row[]>([]); const [files,setFiles]=useState<string[]>([]); const [categories,setCategories]=useState<string[]>([]);
  const [parsing,setParsing]=useState(false); const [error,setError]=useState(''); const [filter,setFilter]=useState<Filter>('all'); const [query,setQuery]=useState('');
  useEffect(()=>{ supabase.from('categories').select('name').eq('is_active',true).order('display_order').then(({data})=>setCategories(data?.map(x=>x.name)||[])); },[]);

  function issue(r:Row){
    if(!r.title) return 'Product name required'; if(!r.category) return 'Category needs review';
    if(r.sourceBrand && k(r.sourceBrand)!==k('ADHYEY BROTHERS') && !r.brand) return 'Brand conflict needs review';
    if(!(Number(r.price)>0)) return 'Selling price required'; if(Number(r.mrp||r.price)<Number(r.price)) return 'MRP must be ≥ price';
    if(!/^\d{4,8}$/.test(r.hsn)) return 'Verified numeric HSN required'; if(r.gst===''||Number.isNaN(Number(r.gst))) return 'Verified GST required';
    if(!validUrl(r.image)) return 'Image required';
    try { normalizeProductPackage({net_weight_grams:r.weight,package_length_cm:r.length,package_width_cm:r.width,package_height_cm:r.height}); } catch { return 'Weight + L/W/H required'; }
    return '';
  }
  const ready=useMemo(()=>rows.filter(r=>!issue(r)).length,[rows]);
  const review=rows.length-ready;
  const shown=useMemo(()=>rows.filter(r=>{ const i=issue(r); const q=query.toLowerCase(); const matches=!q||`${r.title} ${r.sku} ${r.asin} ${r.parentSku} ${r.category}`.toLowerCase().includes(q); return matches && (filter==='all'||filter==='ready'&&!i||filter==='review'&&!!i||filter==='missing'&&!!i); }),[rows,filter,query]);
  const groups=useMemo(()=>{ const m=new Map<string,Row[]>(); shown.forEach(r=>{ const key=`${r.category||'Needs Category Review'} • ${titleCase(r.productType||'Unclassified')}`; m.set(key,[...(m.get(key)||[]),r]); }); return [...m.entries()]; },[shown]);
  const update=(id:string,field:keyof Row,value:string|boolean)=>setRows(p=>p.map(r=>r.id===id?{...r,[field]:value}:r));

  async function parseFiles(list:FileList|null){
    if(!list?.length)return; setParsing(true); setError('');
    try{
      const XLSX=await import('xlsx'); const next:Row[]=[];
      for(const file of Array.from(list)){
        const wb=XLSX.read(await file.arrayBuffer(),{type:'array'}); const templateName=wb.SheetNames.find(n=>k(n)==='template');
        if(templateName){
          const matrix=XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[templateName],{header:1,defval:'',raw:false});
          const hi=matrix.findIndex(r=>{ const keys=(r||[]).map(x=>k(clean(x))); return keys.includes('title')&&keys.includes('sku'); });
          if(hi<0) throw new Error(`${file.name}: listing headers not found.`);
          const h=(matrix[hi]||[]).map(x=>clean(x)); const ix=(...names:string[])=>h.findIndex(x=>names.map(k).includes(k(x))); const at=(r:unknown[],...names:string[])=>{const i=ix(...names);return i>=0?clean(r[i]):''};
          for(let ri=hi+3;ri<matrix.length;ri++){
            const r=matrix[ri]||[]; const sourceTitle=at(r,'Title','Item Name'); const sku=at(r,'SKU'); if(!sourceTitle&&!sku)continue;
            const productType=at(r,'Product Type'); const relation=at(r,'Parentage Level')||'Standalone'; const parentSku=at(r,'Parent SKU');
            const sourceBrand=at(r,'Brand Name'); const title=storefrontText(sourceTitle||sku).slice(0,180); const color=at(r,'Color','Color Name'); const size=at(r,'Size','Size Name');
            const price=number(at(r,'Your Price INR','Your Price','Price')); const mrp=number(at(r,'Maximum Retail Price','MRP','List Price'))||price;
            const weight=normalizeUnit(at(r,'Package Weight','Item Package Weight'),at(r,'Package Weight Unit','Item Package Weight Unit'),'weight');
            const length=normalizeUnit(at(r,'Item Package Length','Package Length'),at(r,'Package Length Unit'),'length'); const width=normalizeUnit(at(r,'Item Package Width','Package Width'),at(r,'Package Width Unit'),'length'); const height=normalizeUnit(at(r,'Item Package Height','Package Height'),at(r,'Package Height Unit'),'length');
            const desc=autoDescription(title,productType,color,size);
            next.push({id:`${file.name}-${ri}-${sku}`,selected:true,source:file.name,relation,parentSku,productType,title,sourceTitle,description:desc,sourceBrand,brand:sourceBrand&&k(sourceBrand)!==k('ADHYEY BROTHERS')?'':'ADHYEY BROTHERS',category:smartCategory(productType,title,categories),sku,asin:at(r,'Product Id','ASIN'),size,color,stock:number(at(r,'Quantity','Stock'))||'0',mrp,price,hsn:'',gst:'',weight,length,width,height,image:at(r,'Main Image URL','Image URL'),seoTitle:seo(title),seoDescription:seoDesc(title,desc)});
          }
        } else {
          const sheet=wb.Sheets[wb.SheetNames[0]]; const raw=XLSX.utils.sheet_to_json<Record<string,unknown>>(sheet,{defval:''});
          for(let ri=0;ri<raw.length;ri++){ const rec=raw[ri]; const map=new Map(Object.entries(rec).map(([a,b])=>[k(a),clean(b)])); const pick=(...a:string[])=>a.map(k).map(x=>map.get(x)).find(Boolean)||''; const sourceTitle=pick('item-name','title','product-name'); const sku=pick('seller-sku','sku'); if(!sourceTitle&&!sku)continue; const title=storefrontText(sourceTitle||sku).slice(0,180); const desc=autoDescription(title,'',pick('color'),pick('size-name','size')); const price=number(pick('price','your-price')); next.push({id:`${file.name}-${ri}-${sku}`,selected:true,source:file.name,relation:'Standalone',parentSku:'',productType:'',title,sourceTitle,description:desc,sourceBrand:pick('brand-name','brand'),brand:pick('brand-name','brand')?'':'ADHYEY BROTHERS',category:smartCategory('',title,categories),sku,asin:pick('asin1','asin'),size:pick('size-name','size'),color:pick('color'),stock:number(pick('quantity','stock'))||'0',mrp:number(pick('mrp','maximum-retail-price','list-price'))||price,price,hsn:'',gst:'',weight:'',length:'',width:'',height:'',image:pick('image-url','main-image-url'),seoTitle:seo(title),seoDescription:seoDesc(title,desc)}); }
        }
      }
      setRows(next); setFiles(Array.from(list).map(f=>f.name));
    }catch(e:any){setError(e?.message||'Could not read report files.');}finally{setParsing(false);}
  }

  const input='w-full rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-none';
  const required='w-full rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-gray-900 focus:border-amber-500 focus:outline-none';
  return <main className="min-h-screen bg-[#F8F9FB] px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto max-w-[1600px] space-y-5">
    <div className="flex items-center gap-3"><Link href="/admin/add-product" className="flex h-10 w-10 items-center justify-center rounded-xl border bg-white"><ArrowLeft size={18}/></Link><div><h1 className="text-2xl font-black text-indigo-950">Catalog Automation Preview</h1><p className="text-sm text-gray-500">Upload → clean → group → review exceptions → validate. Preview branch only: database save is disabled.</p></div></div>
    <section className="rounded-3xl border bg-white p-6 shadow-sm"><div className="mb-4 flex items-center gap-3"><FileSpreadsheet className="text-indigo-800"/><div><b>Upload source reports</b><p className="text-xs text-gray-500">You can select both .xlsm and .xlsx files together. Marketplace wording is removed from storefront content.</p></div></div><label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-gray-50"><UploadCloud className="mb-2 text-indigo-800"/><b>{parsing?'Reading files…':files.length?`${files.length} files loaded`:'Choose report files'}</b><input type="file" multiple accept=".xlsx,.xlsm" className="hidden" onChange={e=>parseFiles(e.target.files)}/></label>{error&&<p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}</section>
    {rows.length>0&&<><section className="grid gap-3 sm:grid-cols-4"><div className="rounded-2xl border bg-white p-4"><p className="text-xs text-gray-500">Source rows</p><b className="text-2xl">{rows.length}</b></div><div className="rounded-2xl border border-green-200 bg-green-50 p-4"><p className="text-xs text-green-700">Ready</p><b className="text-2xl text-green-800">{ready}</b></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs text-amber-700">Needs review</p><b className="text-2xl text-amber-800">{review}</b></div><div className="rounded-2xl border bg-white p-4"><p className="text-xs text-gray-500">Baskets</p><b className="text-2xl">{groups.length}</b></div></section>
    <section className="rounded-3xl border bg-white p-4 shadow-sm"><div className="flex flex-wrap gap-2"><div className="relative min-w-64 flex-1"><Search size={15} className="absolute left-3 top-3 text-gray-400"/><input className="w-full rounded-xl border py-2 pl-9 pr-3 text-sm" placeholder="Search product, SKU, ASIN, parent SKU…" value={query} onChange={e=>setQuery(e.target.value)}/></div>{(['all','ready','review','missing'] as Filter[]).map(f=><button key={f} onClick={()=>setFilter(f)} className={`rounded-xl px-3 py-2 text-xs font-black ${filter===f?'bg-indigo-950 text-white':'bg-gray-100 text-gray-700'}`}>{f==='all'?'All':f==='ready'?'Ready':f==='review'?'Needs Review':'Missing Fields'}</button>)}</div></section>
    {groups.map(([name,items])=><section key={name} className="overflow-hidden rounded-3xl border bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2 border-b bg-slate-50 p-4"><div><h2 className="font-black text-slate-900">{name}</h2><p className="text-xs text-gray-500">{items.length} rows • Basket HSN/GST can be applied after verified master rules are connected.</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Tax review protected</span></div><div className="overflow-x-auto"><table className="min-w-[2350px] w-full text-left text-xs"><thead className="bg-gray-50"><tr>{['Use','Structure','Product / Description / SEO','Brand','Category','Variant','Stock','MRP','Price','HSN','GST %','Weight g','L cm','W cm','H cm','Image / Storage','Status'].map(x=><th key={x} className="px-3 py-3 font-black">{x}</th>)}</tr></thead><tbody className="divide-y">{items.slice(0,100).map(r=>{const problem=issue(r);return <tr key={r.id} className="align-top"><td className="p-3"><input type="checkbox" checked={r.selected} onChange={e=>update(r.id,'selected',e.target.checked)}/></td><td className="p-3 w-48"><b>{r.relation}</b><p className="mt-1 text-gray-500">Parent: {r.parentSku||'—'}<br/>SKU: {r.sku||'—'}</p></td><td className="p-3 w-[430px]"><input className={input} value={r.title} onChange={e=>update(r.id,'title',storefrontText(e.target.value))}/><textarea className={`${input} mt-2 min-h-20`} value={r.description} onChange={e=>update(r.id,'description',storefrontText(e.target.value))}/><p className="mt-2 text-[10px] text-indigo-700"><b>Auto SEO:</b> {r.seoTitle}<br/>{r.seoDescription}</p></td><td className="p-3 w-44"><p className="mb-1 text-[10px] text-gray-500">Source: {r.sourceBrand||'—'}</p><input className={r.sourceBrand&&k(r.sourceBrand)!==k('ADHYEY BROTHERS')&&!r.brand?required:input} value={r.brand} placeholder="Confirm brand" onChange={e=>update(r.id,'brand',e.target.value)}/></td><td className="p-3 w-56"><select className={r.category?input:required} value={r.category} onChange={e=>update(r.id,'category',e.target.value)}><option value="">Select / review</option>{categories.map(c=><option key={c}>{c}</option>)}</select></td><td className="p-3 w-40"><input className={input} placeholder="Size" value={r.size} onChange={e=>update(r.id,'size',e.target.value)}/><input className={`${input} mt-2`} placeholder="Color" value={r.color} onChange={e=>update(r.id,'color',e.target.value)}/></td>{(['stock','mrp','price'] as const).map(f=><td key={f} className="p-3"><input className={`${input} w-24`} value={r[f]} onChange={e=>update(r.id,f,e.target.value)}/></td>)}{(['hsn','gst','weight','length','width','height'] as const).map(f=><td key={f} className="p-3"><input className={`${required} w-24`} value={r[f]} onChange={e=>update(r.id,f,e.target.value)}/></td>)}<td className="p-3 w-72"><input className={r.image?input:required} value={r.image} placeholder="Source image URL" onChange={e=>update(r.id,'image',e.target.value)}/><p className="mt-2 text-[10px] text-gray-500">Final flow: download → mild auto-light/white-balance → optimize → Supabase Storage. Product colour must remain accurate.</p></td><td className="p-3 w-48">{problem?<span className="font-bold text-amber-700">⚠ {problem}</span>:<span className="font-bold text-green-700">✓ Ready</span>}</td></tr>})}</tbody></table></div>{items.length>100&&<p className="border-t p-3 text-xs text-gray-500">Showing first 100 rows in this basket for preview performance.</p>}</section>)}
    <section className="rounded-3xl border border-indigo-200 bg-indigo-50 p-5"><b className="text-indigo-950">Preview safety</b><p className="mt-1 text-sm text-indigo-800">No products, categories, tax rules or images are written to the database from this preview. Final image storage, verified HSN/GST master, duplicate merge and transactional save will be enabled only after you approve this UI/flow.</p></section></>}
  </div></main>;
}
