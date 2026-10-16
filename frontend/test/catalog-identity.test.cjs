// Muc dich: Bao ve gio cu, khoa chong trung don va phuc hoi viec doi ID tren trinh duyet.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {transformSync}=require('esbuild');
function storage() {
  const values=new Map();return {get length(){return values.size;},key:i=>[...values.keys()][i],getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
}
function load(globals={}) {
  const source=fs.readFileSync(path.join(__dirname,'../src/services/catalogIdentity.js'),'utf8');
  const module={exports:{}};vm.runInNewContext(transformSync(source,{format:'cjs',target:'node22'}).code,{module,exports:module.exports,console,AbortSignal,...globals});return module.exports;
}
const metadata={revision:'catalog-v1',maps:{Products:[[2,1],[3,2]],ProductVariants:[[20,1],[21,2]],Sizes:[[22,11]],Colors:[[4,4]]}};
test('browser migration preserves cart owners, money, SKU, quantities and updates every catalog reference once',()=>{
  const local=storage(),m=load();
  local.setItem('shoegroup_carts_v4',JSON.stringify({user_9:[{id_product:3,variant_id:21,id_product_detail:'3_variant_21',quantity:4,unitPrice:123456,product:{id_product:3,product_name:'Shoe',sku:'SKU-3'},size_id:22}],__guest__:[{id_product:2,variant_id:20,quantity:1}]}));
  local.setItem('shoegroup_orders_v2',JSON.stringify([{id:99,customer_id:9,total:123456,items:[{product_id:3,product_variant_id:21,sku:'OLD-SKU'}]}]));
  m.migrateCatalogStorage(local,metadata,'local');m.migrateCatalogStorage(local,metadata,'local');
  const cart=JSON.parse(local.getItem('shoegroup_carts_v4'));
  assert.equal(cart.user_9[0].id_product,2);assert.equal(cart.user_9[0].variant_id,2);assert.equal(cart.user_9[0].id_product_detail,'2_variant_2');
  assert.equal(cart.user_9[0].quantity,4);assert.equal(cart.user_9[0].unitPrice,123456);assert.equal(cart.user_9[0].product.sku,'SKU-3');assert.equal(cart.user_9[0].size_id,11);
  assert.equal(cart.__guest__[0].id_product,1);
  const order=JSON.parse(local.getItem('shoegroup_orders_v2'))[0];assert.equal(order.id,99);assert.equal(order.customer_id,9);assert.equal(order.items[0].product_id,2);assert.equal(order.items[0].sku,'OLD-SKU');
});
test('each session migrates POS tabs and its pending checkout fingerprint while retaining the idempotency key',()=>{
  const session=storage(),m=load();
  session.setItem('shoegroup_checkout_attempt_v1',JSON.stringify({key:'checkout-keep-this-key',fingerprint:JSON.stringify({items:[{productId:3,productVariantId:21,quantity:2}],total:200000})}));
  session.setItem('shoegroup_pos_drafts_9',JSON.stringify({day:'2026-10-16',drafts:[['5',{cash_given:300000,customer_name:'Test',cart:[{key:21,product_id:3,variant_id:21,quantity:2,price:100000}]}]]}));
  m.migrateCatalogStorage(session,metadata,'session');m.migrateCatalogStorage(session,metadata,'session');
  const attempt=JSON.parse(session.getItem('shoegroup_checkout_attempt_v1'));assert.equal(attempt.key,'checkout-keep-this-key');assert.equal(JSON.parse(attempt.fingerprint).items[0].productId,2);
  const draft=JSON.parse(session.getItem('shoegroup_pos_drafts_9')).drafts[0];assert.equal(draft[0],'5');assert.equal(draft[1].cash_given,300000);assert.equal(draft[1].cart[0].key,2);assert.equal(draft[1].cart[0].variant_id,2);
});
test('interrupted storage writes recover from the journal without applying an overlapping ID map twice',()=>{
  const local=storage(),m=load(),set=local.setItem;
  local.setItem('shoegroup_carts_v4',JSON.stringify({user_9:[{id_product:3}]}));local.setItem('shoegroup_orders_v2','[]');
  let fail=true;local.setItem=(k,v)=>{if(k==='shoegroup_orders_v2'&&fail){fail=false;throw Error('storage interrupted');}set(k,v);};
  assert.throws(()=>m.migrateCatalogStorage(local,metadata,'local'),/interrupted/);
  m.migrateCatalogStorage(local,metadata,'local');assert.equal(JSON.parse(local.getItem('shoegroup_carts_v4')).user_9[0].id_product,2);
});
test('bootstrap completes storage migration before exposing the revision for API writes',async()=>{
  const localStorage=storage(),sessionStorage=storage();localStorage.setItem('shoegroup_carts_v4',JSON.stringify({__guest__:[{id_product:3}]}));
  const m=load({localStorage,sessionStorage,fetch:async()=>({ok:true,json:async()=>({catalogIdentity:metadata})})});
  assert.equal(m.catalogIdentityRevision(),'');await m.initializeCatalogIdentity('http://localhost:5000/api');assert.equal(m.catalogIdentityRevision(),'catalog-v1');
  assert.equal(JSON.parse(localStorage.getItem('shoegroup_carts_v4')).__guest__[0].id_product,2);
});
