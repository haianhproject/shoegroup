// Exercises the real startup scheduler and two independent Express processes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { connection, api, admin, DATABASE } = require('./helpers/audit-db.cjs');
const { fixture, order, bodyFor, stockOf, rows, check, results, setPool } = require('./audit.integration.cjs');
let pool, worker;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function startWorker() {
  worker = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'), windowsHide: true,
    env: { ...process.env, DB_NAME: DATABASE, PORT: '5102', EMAIL_USER: '', EMAIL_PASS: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  worker.stdout.on('data', () => {}); worker.stderr.on('data', () => {});
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try { if ((await api('/health', { port: 5102 })).status === 200) return; } catch {}
    await pause(200);
  }
  throw new Error('Audit worker did not become healthy');
}
async function stopWorker() {
  if (!worker || worker.exitCode !== null) return;
  const child = worker;
  await new Promise(resolve => { child.once('exit', resolve); child.kill(); });
  worker = null;
}
async function main() {
  pool = await connection().connect(); setPool(pool);
  assert.match((await rows('SELECT DB_NAME() AS db'))[0].db, /^ShoegroupAudit_/);
  const unpaid = await fixture(), paid = await fixture(), declared = await fixture(), cod = await fixture();
  const u = await order(unpaid, { extra: { paymentMethod: 'BANK' } });
  const p = await order(paid, { extra: { paymentMethod: 'BANK' } });
  const d = await order(declared, { extra: { paymentMethod: 'BANK' } });
  const c = await order(cod);
  for (const response of [u,p,d,c]) assert.equal(response.status, 200, JSON.stringify(response));
  const ids = [u,p,d,c].map(r => r.data.orderId);
  await api(`/orders/${ids[1]}/payment`, { method: 'PUT', user: admin, body: { payment_status: 'Đã thanh toán' } });
  await api(`/orders/${ids[2]}/payment`, { method: 'PUT', body: { payment_status: 'Đã thanh toán' } });
  await rows(`UPDATE Orders SET PaymentDueAt=DATEADD(minute,-1,GETDATE()),AutoCancelDeadline=DATEADD(day,6,GETDATE()) WHERE OrderID IN (${ids.slice(0,3)});
    UPDATE Orders SET AutoCancelDeadline=DATEADD(minute,-1,GETDATE()) WHERE OrderID=${ids[3]}`);
  const revenueItem = await fixture();
  const revenue = await order({...revenueItem,price:500000}, {user:admin,extra:{addressId:null,status:'Đã nhận hàng',payment_status:'Đã thanh toán',total:500000}});
  assert.equal(revenue.status,200,JSON.stringify(revenue));
  await rows(`UPDATE Orders SET RevenueEligibleDate=DATEADD(minute,-1,GETDATE()),IsCountedAsRevenue=0 WHERE OrderID=${revenue.data.orderId}`);
  try {
    await startWorker();
    const deadline = Date.now()+15000;
    while(Date.now()<deadline) {
      const r=await rows(`SELECT Status FROM Orders WHERE OrderID IN (${ids[0]},${ids[3]})`);
      if(r.length===2 && r.every(x=>x.Status==='Đã hủy')) break;
      await pause(200);
    }
    await check('J01','Real scheduler releases expired bank hold and overdue COD','both cancelled; inventory restored once',async()=>{
      const state=await rows(`SELECT OrderID,Status FROM Orders WHERE OrderID IN (${ids[0]},${ids[3]})`);
      assert.ok(state.every(x=>x.Status==='Đã hủy'),JSON.stringify(state));assert.equal(await stockOf(unpaid),10);assert.equal(await stockOf(cod),10);return state;
    });
    await check('J02','Expired payment deadline with confirmed/declaration payment','paid and declared orders retained until general deadline',async()=>{
      const state=await rows(`SELECT OrderID,Status,PaymentStatus FROM Orders WHERE OrderID IN (${ids[1]},${ids[2]})`);
      assert.ok(state.every(x=>x.Status!=='Đã hủy'),JSON.stringify(state));assert.equal(await stockOf(paid),9);assert.equal(await stockOf(declared),9);return state;
    });
    await check('J03','Real scheduler recognizes eligible paid received order','IsCountedAsRevenue becomes true',async()=>{
      const until=Date.now()+3000;let r;
      do {r=(await rows(`SELECT IsCountedAsRevenue FROM Orders WHERE OrderID=${revenue.data.orderId}`))[0];if(r.IsCountedAsRevenue)break;await pause(100);}while(Date.now()<until);
      assert.equal(r.IsCountedAsRevenue,true);return r;
    });
    await check('J04','Same checkout key across two server instances','one order and one stock deduction',async()=>{
      const item=await fixture();const key=`multi-process-${Date.now()}`;
      const responses=await Promise.all([5100,5102].map(port=>api('/orders',{port,method:'POST',body:bodyFor(item),headers:{'Idempotency-Key':key}})));
      assert.ok(responses.every(x=>x.status===200),JSON.stringify(responses));assert.equal(responses[0].data.orderId,responses[1].data.orderId);assert.equal(await stockOf(item),9);return responses.map(x=>x.data.orderId);
    });
    await stopWorker(); await startWorker();
    // Wait for the second real startup tick, then verify it cannot restock again.
    await pause(5500);
    await check('J05','Repeated scheduler invocation','no duplicate restock or cancellation history',async()=>{
      assert.equal(await stockOf(unpaid),10);assert.equal(await stockOf(cod),10);
      const r=await rows(`SELECT COUNT(*) AS n FROM OrderStatusHistory WHERE OrderID=${ids[0]} AND NewStatus=N'Đã hủy'`);assert.equal(r[0].n,1);return r;
    });
  } finally { await stopWorker(); }
  await pool.close();
  fs.writeFileSync(path.resolve(__dirname,'../../docs/audit/jobs-results.json'),JSON.stringify({database:DATABASE,time:new Date().toISOString(),results},null,2));
  console.log(JSON.stringify({passed:results.filter(x=>x.result==='PASS').length,failed:results.filter(x=>x.result==='FAIL').length}));
  if(results.some(x=>x.result==='FAIL'))process.exitCode=1;
}
main().catch(async e=>{console.error(e);await stopWorker();await pool?.close();process.exitCode=1;});
