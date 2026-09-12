'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, FileSpreadsheet, Loader2, UploadCloud } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { normalizeProductPackage } from '@/lib/catalog/product-package';

type Row = {
  id: string; selected: boolean; title: string; sourceTitle: string; description: string;
  brand: string; category: string; sku: string; size: string; stock: string;
  mrp: string; price: string; hsn: string; gst: string; weight: string;
  length: string; width: string; height: string; image: string; asin: string;
  seoTitle: string; seoDescription: string;
};

const aliases: Record<string, string[]> = {
  title: ['item-name','product-name','title','item_name'], description: ['product-description','description','product_description'],
  brand: ['brand-name','brand','brand_name'], sku: ['seller-sku','sku','seller_sku'], size: ['size-name','size','size_name'],
  stock: ['quantity','stock','fulfillable-quantity','fulfillable_quantity'], price: ['price','standard-price','standard_price','your-price'],
  mrp: ['mrp','list-price','list_price','maximum-retail-price'], image: ['main-image-url','main_image_url','image-url','image_url'],
  asin: ['asin','asin1','external-product-id','external_product_id'], category: ['category','product-type','product_type','item-type','item_type'],
  weight: ['item-weight','item_weight','package-weight','package_weight'], length: ['package-length','package_length'],
  width: ['package-width','package_width'], height: ['package-height','package_height']
};

function norm(v: unknown) { return String(v ?? '').trim(); }
function key(v: string) { return v.toLowerCase().trim().replace(/\s+/g, '-'); }
function pick(record: Record<string, unknown>, field: string) {
  const map = new Map(Object.entries(record).map(([k, v]) => [key(k), v]));
  for (const a of aliases[field] || []) if (map.has(a)) return norm(map.get(a));
  return '';
}
function cleanTitle(value: string) {
  return value.replace(/\s+/g, ' ').replace(/\s*[|,-]\s*Amazon\s*$/i, '').trim().slice(0, 180);
}
function seoDescription(title: string, description: string) {
  const base = description.replace(/\s+/g, ' ').trim() || `Shop ${title} from ADHYEY BROTHERS.`;
  return base.slice(0, 155);
}
function numeric(value: string) {
  const match = value.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return match?.[0] || '';
}
function validHttp(value: string) {
  try { const u = new URL(value); return u.protocol === 'https:' || u.protocol === 'http:'; } catch { return false; }
}

export default function AmazonExcelImportPage() {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [categories, setCategories] = useState<string[]>(['Fashion & Apparel']);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('categories').select('name').eq('is_active', true).order('display_order')
      .then(({ data }) => { if (data?.length) setCategories(data.map(x => x.name)); });
  }, []);

  const selectedCount = useMemo(() => rows.filter(r => r.selected).length, [rows]);
  const update = (id: string, field: keyof Row, value: string | boolean) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));

  async function parseFile(file?: File) {
    if (!file) return;
    setFileName(file.name); setRows([]); setMessage(''); setError(''); setParsing(true);
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      if (!raw.length) throw new Error('No product rows found in this Excel sheet.');
      const fallbackCategory = categories[0] || 'Fashion & Apparel';
      const parsed = raw.map((record, index): Row | null => {
        const sourceTitle = pick(record, 'title');
        const sku = pick(record, 'sku');
        if (!sourceTitle && !sku) return null;
        const title = cleanTitle(sourceTitle || sku);
        const description = pick(record, 'description');
        const sourceCategory = pick(record, 'category');
        const category = categories.find(c => key(c) === key(sourceCategory)) || fallbackCategory;
        const sourcePrice = numeric(pick(record, 'price'));
        const sourceMrp = numeric(pick(record, 'mrp')) || sourcePrice;
        return {
          id: `${index}-${sku || title}`, selected: true, title, sourceTitle, description,
          brand: pick(record, 'brand') || 'ADHYEY BROTHERS', category, sku,
          size: pick(record, 'size') || 'Free Size', stock: numeric(pick(record, 'stock')) || '0',
          mrp: sourceMrp, price: sourcePrice, hsn: '6204', gst: '5',
          weight: numeric(pick(record, 'weight')), length: numeric(pick(record, 'length')),
          width: numeric(pick(record, 'width')), height: numeric(pick(record, 'height')),
          image: pick(record, 'image'), asin: pick(record, 'asin'),
          seoTitle: `${title} | ADHYEY BROTHERS`.slice(0, 60), seoDescription: seoDescription(title, description)
        };
      }).filter((r): r is Row => Boolean(r));
      if (!parsed.length) throw new Error('Could not find product title/SKU columns. Check that this is an Amazon Listings report.');
      setRows(parsed);
      setMessage(`${parsed.length} product rows loaded. Review them before import.`);
    } catch (e: any) { setError(e?.message || 'Could not read this Excel file.'); }
    finally { setParsing(false); }
  }

  function validate(r: Row) {
    if (!r.title.trim()) return 'Title required';
    if (!r.category) return 'Category required';
    const price = Number(r.price), mrp = Number(r.mrp || r.price), stock = Number(r.stock);
    if (!(price > 0)) return 'Selling price required';
    if (mrp < price) return 'MRP must be ≥ price';
    if (!Number.isInteger(stock) || stock < 0) return 'Stock must be 0 or more';
    if (!r.hsn.trim() || !(Number(r.gst) >= 0)) return 'HSN/GST required';
    if (!validHttp(r.image)) return 'Valid image URL required';
    try { normalizeProductPackage({ net_weight_grams: r.weight, package_length_cm: r.length, package_width_cm: r.width, package_height_cm: r.height }); }
    catch (e: any) { return e?.message || 'Package details required'; }
    return '';
  }

  async function importSelected() {
    const selected = rows.filter(r => r.selected);
    if (!selected.length) { setError('Select at least one product.'); return; }
    const invalid = selected.map(r => ({ r, reason: validate(r) })).find(x => x.reason);
    if (invalid) { setError(`${invalid.r.title}: ${invalid.reason}`); return; }
    setImporting(true); setError(''); setMessage('');
    let success = 0; const failures: string[] = [];
    for (const r of selected) {
      try {
        const pkg = normalizeProductPackage({ net_weight_grams: r.weight, package_length_cm: r.length, package_width_cm: r.width, package_height_cm: r.height });
        const { data: product, error: productError } = await supabase.from('products').insert([{
          title: r.title.trim(), description: r.description.trim() || r.seoDescription, category: r.category,
          brand: r.brand.trim() || 'ADHYEY BROTHERS', price: Number(r.price), mrp: Number(r.mrp || r.price),
          stock: Number(r.stock), hsn_code: r.hsn.trim(), gst_rate: Number(r.gst), net_weight_grams: pkg.weight,
          package_length_cm: pkg.length, package_width_cm: pkg.width, package_height_cm: pkg.height,
          images: [r.image.trim()], is_active: true
        }]).select('id').single();
        if (productError || !product) throw productError || new Error('Product insert failed');
        const { error: inventoryError } = await supabase.from('inventory').upsert([{
          product_id: product.id, size: r.size.trim() || 'Free Size', sku: r.sku.trim() || `AMZ-${Date.now()}-${success + 1}`,
          weight_kg: pkg.weight / 1000, available_quantity: Number(r.stock), reserved_quantity: 0,
          sold_quantity: 0, reorder_level: 5
        }], { onConflict: 'product_id,size' });
        if (inventoryError) { await supabase.from('products').delete().eq('id', product.id); throw inventoryError; }
        success++;
      } catch (e: any) { failures.push(`${r.title}: ${e?.message || 'Import failed'}`); }
    }
    setImporting(false);
    if (success) setMessage(`${success} product${success === 1 ? '' : 's'} imported successfully.`);
    if (failures.length) setError(`${failures.length} failed. ${failures.slice(0, 2).join(' | ')}`);
    if (success) setRows(prev => prev.map(r => r.selected && !failures.some(f => f.startsWith(`${r.title}:`)) ? { ...r, selected: false } : r));
  }

  const input = 'w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none';

  return (
    <main className="min-h-screen bg-[#F8F9FB] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/add-product" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm"><ArrowLeft size={18}/></Link>
          <div><h1 className="text-xl font-black text-indigo-950 sm:text-2xl">Amazon Excel Import</h1><p className="mt-1 text-xs text-gray-500 sm:text-sm">Upload → preview → edit → validate → import selected products.</p></div>
        </div>

        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-start gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-800"><FileSpreadsheet size={22}/></div><div><h2 className="text-sm font-black text-gray-900">Amazon Seller Central report</h2><p className="mt-1 text-xs text-gray-500">.xlsx and .xlsm supported. Macros are never executed.</p></div></div>
          <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-5 text-center hover:border-amber-400">
            {parsing ? <Loader2 className="mb-3 animate-spin text-amber-700"/> : <UploadCloud size={30} className="mb-3 text-amber-700"/>}
            <span className="text-sm font-black text-gray-900">{fileName || 'Choose Amazon Excel file'}</span><span className="mt-1 text-xs text-gray-500">Nothing is imported until you press Import Selected</span>
            <input type="file" accept=".xlsx,.xlsm" className="hidden" disabled={parsing || importing} onChange={e => parseFile(e.target.files?.[0])}/>
          </label>
          {message && <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-800">{message}</div>}
          {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</div>}
        </section>

        {rows.length > 0 && <section className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-5"><div><h2 className="font-black text-gray-900">Staging Preview</h2><p className="text-xs text-gray-500">{selectedCount} of {rows.length} selected. Confirm physical package details before import.</p></div><button onClick={importSelected} disabled={importing || !selectedCount} className="inline-flex items-center gap-2 rounded-xl bg-indigo-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{importing ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>} Import Selected</button></div>
          <div className="overflow-x-auto"><table className="min-w-[1800px] w-full text-left text-xs"><thead className="bg-gray-50 text-gray-600"><tr>{['Use','Product / SEO','Category','Size / SKU','Stock','MRP','Sell Price','HSN','GST %','Weight g','L cm','W cm','H cm','Image URL','Status'].map(h => <th key={h} className="px-3 py-3 font-black">{h}</th>)}</tr></thead><tbody className="divide-y">
            {rows.map(r => { const issue = validate(r); return <tr key={r.id} className={r.selected ? 'bg-white' : 'bg-gray-50 opacity-60'}>
              <td className="px-3 py-3 align-top"><input type="checkbox" checked={r.selected} onChange={e => update(r.id,'selected',e.target.checked)}/></td>
              <td className="px-3 py-3 align-top w-80"><input className={input} value={r.title} onChange={e => { update(r.id,'title',e.target.value); }}/><textarea className={`${input} mt-2 min-h-16`} value={r.description} placeholder="Description" onChange={e => update(r.id,'description',e.target.value)}/><div className="mt-2 text-[10px] text-indigo-700"><b>Auto SEO:</b> {r.seoTitle}<br/>{r.seoDescription}</div></td>
              <td className="px-3 py-3 align-top"><select className={input} value={r.category} onChange={e => update(r.id,'category',e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></td>
              <td className="px-3 py-3 align-top w-44"><input className={input} value={r.size} placeholder="Size" onChange={e => update(r.id,'size',e.target.value)}/><input className={`${input} mt-2`} value={r.sku} placeholder="SKU" onChange={e => update(r.id,'sku',e.target.value)}/></td>
              {(['stock','mrp','price','hsn','gst','weight','length','width','height'] as (keyof Row)[]).map(f => <td key={f} className="px-3 py-3 align-top"><input className={`${input} w-24`} value={String(r[f])} onChange={e => update(r.id,f,e.target.value)}/></td>)}
              <td className="px-3 py-3 align-top"><input className={`${input} w-72`} value={r.image} placeholder="https://..." onChange={e => update(r.id,'image',e.target.value)}/></td>
              <td className="px-3 py-3 align-top w-44">{issue ? <span className="font-bold text-red-600">⚠ {issue}</span> : <span className="font-bold text-green-700">✓ Ready</span>}</td>
            </tr>})}
          </tbody></table></div>
        </section>}
      </div>
    </main>
  );
}
