// Muc dich: Chuyen ID trong du lieu trinh duyet truoc khi nap store, giu gio va khoa checkout.
const MARKER='shoegroup_catalog_identity_v1';
const JOURNAL=MARKER+'_journal';
const fields={
  productId:'Products',product_id:'Products',id_product:'Products',ProductID:'Products',
  productVariantId:'ProductVariants',product_variant_id:'ProductVariants',variant_id:'ProductVariants',ProductVariantID:'ProductVariants',
  category_id:'Categories',CategoryID:'Categories',brand_id:'Brands',BrandID:'Brands',material_id:'Materials',MaterialID:'Materials',
  color_id:'Colors',ColorID:'Colors',size_id:'Sizes',SizeID:'Sizes',
};
let revision='';
export const catalogIdentityRevision=()=>revision;
export function remapCatalogValue(value,metadata) {
  const maps=Object.fromEntries(Object.entries(metadata.maps || {}).map(([table,pairs])=>[table,new Map(pairs.map(([old,id])=>[String(old),id]))]));
  const id=(table,value)=>{const next=maps[table]?.get(String(value));return next==null?value:typeof value==='string'?String(next):next;};
  const visit=node=>{
    if(Array.isArray(node)) return node.map(visit);
    if(!node || typeof node!=='object') return node;
    const result={};
    for(const [key,item] of Object.entries(node)) {
      if(fields[key]) result[key]=id(fields[key],item);
      else if(key==='id_product_detail' && typeof item==='string') result[key]=item.replace(/^(\d+)_variant_(\d+)$/,(_,p,v)=>`${id('Products',p)}_variant_${id('ProductVariants',v)}`);
      else result[key]=visit(item);
    }
    if(node.variant_id!=null && String(node.key)===String(node.variant_id)) result.key=id('ProductVariants',node.key);
    return result;
  };
  return visit(value);
}
export function migrateCatalogStorage(store,metadata,kind) {
  if(!metadata.revision || !store) return;
  const pending=store.getItem(JOURNAL);
  if(pending) {
    const journal=JSON.parse(pending);
    for(const entry of journal.entries) store.setItem(entry.key,entry.after);
    store.setItem(MARKER,journal.revision);store.removeItem(JOURNAL);
  }
  if(store.getItem(MARKER)===metadata.revision) return;
  const keys=kind==='local'?['shoegroup_carts_v4','shoegroup_orders_v2']:
    ['shoegroup_checkout_attempt_v1',...Array.from({length:store.length},(_,i)=>store.key(i)).filter(key=>key?.startsWith('shoegroup_pos_drafts_'))];
  const entries=[];
  for(const key of keys) {
    const before=store.getItem(key);if(before==null) continue;
    const value=JSON.parse(before),next=remapCatalogValue(value,metadata);
    if(key==='shoegroup_checkout_attempt_v1' && typeof value?.fingerprint==='string')
      next.fingerprint=JSON.stringify(remapCatalogValue(JSON.parse(value.fingerprint),metadata));
    entries.push({key,before,after:JSON.stringify(next)});
  }
  store.setItem(JOURNAL,JSON.stringify({revision:metadata.revision,entries}));
  for(const entry of entries) store.setItem(entry.key,entry.after);
  store.setItem(MARKER,metadata.revision);store.removeItem(JOURNAL);
}
export async function initializeCatalogIdentity(base) {
  try {
    // Dùng AbortSignal.timeout nếu browser hỗ trợ (Chrome 103+), fallback về setTimeout
    let signal;
    try { signal = AbortSignal.timeout(12000); } catch { /* browser cũ không hỗ trợ */ }
    const response = await fetch(base + '/health', { cache: 'no-store', ...(signal ? { signal } : {}) });
    if (!response.ok) {
      console.warn('[CatalogIdentity] /health trả về', response.status, '– bỏ qua migration, app vẫn chạy.');
      return;
    }
    const metadata = (await response.json()).catalogIdentity || {};
    if (metadata.revision) {
      try { migrateCatalogStorage(localStorage, metadata, 'local'); } catch (e) { console.warn('[CatalogIdentity] Lỗi migrate localStorage:', e); }
      try { migrateCatalogStorage(sessionStorage, metadata, 'session'); } catch (e) { console.warn('[CatalogIdentity] Lỗi migrate sessionStorage:', e); }
    }
    revision = metadata.revision || '';
  } catch (e) {
    // Mạng lỗi, backend chưa sẵn sàng, hay AbortError – KHÔNG crash app
    console.warn('[CatalogIdentity] Không thể kết nối /health, bỏ qua migration:', e.message || e);
  }
}
