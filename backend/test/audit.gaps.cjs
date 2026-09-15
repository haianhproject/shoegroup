// Known production gaps: these tests intentionally remain red until the
// documented business decisions/provider integrations are implemented.
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {connection,api,users,admin,DATABASE}=require('./helpers/audit-db.cjs');
const {fixture,order,rows,check,results,setPool}=require('./audit.integration.cjs');
let pool;
async function main(){pool=await connection().connect();setPool(pool);
  await check('G01','Active variant promotion actually affects checkout','apply 10% promotion or explicitly reject unsupported promotion',async()=>{
    const item=await fixture();const promo=await api('/variantDiscounts',{method:'POST',user:admin,body:{variant_id:item.productVariantId,product_id:item.productId,discount_type:'percent',value:10,quantity:10,start_date:new Date(Date.now()-3600000).toISOString(),end_date:new Date(Date.now()+3600000).toISOString(),active:true}});
    assert.equal(promo.status,201,JSON.stringify(promo));const created=await order(item);assert.equal(created.status,200,JSON.stringify(created));
    const data=(await rows(`SELECT UnitPrice FROM OrderDetails WHERE OrderID=${created.data.orderId}`))[0];
    assert.equal(data.UnitPrice,450000,`Promotion created (${promo.status}); checkout UnitPrice=${data.UnitPrice}, expected 450000`);return data;
  });
  await check('G02','Order address moves from HCMC to Hanoi','reject price-changing move or update fee consistently',async()=>{
    const item=await fixture();const old=await order(item);assert.equal(old.status,200);
    const address=(await rows(`INSERT UserAddresses(UserID,RecipientName,Phone,Province,District,Ward,AddressLine,FullAddress,Latitude,Longitude,IsVerified,IsDefault)
      OUTPUT INSERTED.AddressID VALUES(${users[0].id},N'Audit Customer 1','0900000001',N'Thành phố Hà Nội',N'Quận Hai Bà Trưng',N'Phường Bách Khoa',N'2 Audit Street',N'2 Audit Street, Phường Bách Khoa, Quận Hai Bà Trưng, Thành phố Hà Nội',21.005,105.846,1,0)`))[0].AddressID;
    const change=await api(`/orders/${old.data.orderId}/address`,{method:'PUT',body:{addressId:address}});
    if(change.status===409)return change;
    assert.equal(change.status,200,JSON.stringify(change));const fresh=await order(item,{extra:{addressId:address}});assert.equal(fresh.status,200);
    const saved=(await rows(`SELECT ShippingFee FROM Orders WHERE OrderID=${old.data.orderId}`))[0];
    assert.equal(saved.ShippingFee,fresh.data.shippingFee,`Changed address retained fee=${saved.ShippingFee}; same new address quotes ${fresh.data.shippingFee}`);return saved;
  });
  await check('G03','Wallet withdrawal with no payout integration','fail before holding balance if no executor exists',async()=>{
    const r=await api('/wallet/withdrawals',{method:'POST',body:{method:'MOMO',amount:1,destination:'0900000001'}});
    assert.equal(r.status,503,`No payout implementation; endpoint returned ${r.status} ${JSON.stringify(r.data)}`);return r;
  });
  await check('G04','Visa test destination storage','store a provider token instead of raw PAN',async()=>{
    const testCard='4111111111111111';const r=await api('/wallet/withdrawals',{method:'POST',body:{method:'VISA',amount:1,destination:testCard,holder_name:'AUDIT ONLY'}});assert.equal(r.status,201,JSON.stringify(r));
    const saved=(await rows(`SELECT Destination FROM ShoeGroupWalletWithdrawals WHERE WithdrawalID=${r.data.withdrawal_id}`))[0];
    assert.ok(saved.Destination!==testCard,'Synthetic Visa PAN persisted verbatim in Destination');return {storedRaw:false};
  });
  await pool.close();fs.writeFileSync(path.resolve(__dirname,'../../docs/audit/known-gaps-results.json'),JSON.stringify({database:DATABASE,time:new Date().toISOString(),results},null,2));
  console.log(JSON.stringify({passed:results.filter(x=>x.result==='PASS').length,failed:results.filter(x=>x.result==='FAIL').length}));if(results.some(x=>x.result==='FAIL'))process.exitCode=1;
}
main().catch(async e=>{console.error(e);await pool?.close();process.exitCode=1;});
