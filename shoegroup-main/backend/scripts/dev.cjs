// Mục đích: Khởi động Spring + Vue, chờ SQL Server sẵn sàng và dừng các tiến trình cùng nhau.
const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');
const net = require('node:net');
const root = path.resolve(__dirname, '../..');
const children = [];
let stopping = false;
const springPort = Number(process.env.SPRING_PORT || 5000);
const webPort = Number(process.env.WEB_PORT || 3000);

function available(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', error => reject(error.code === 'EADDRINUSE'
      ? new Error(`Cong ${port} dang duoc su dung. Neu ShoeGroup da chay, mo http://localhost:${webPort}; neu can khoi dong lai, dung phien cu bang Ctrl+C truoc.`)
      : error));
    server.listen(port, () => server.close(resolve));
  });
}
function start(command, args, env, cwd = root) {
  const child = spawn(command, args, { cwd, stdio: 'inherit', env: { ...process.env, ...env } });
  children.push(child);
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => { if (!stopping) stop(code || 1); });
}
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.pid) continue;
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    else child.kill('SIGTERM');
  }
  process.exitCode = code;
}
async function ready(port, name) {
  const deadline = Date.now() + 120000;
  while (!stopping && Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(3000) });
      const result = await response.json();
      if (response.ok && result.success && result.db === 'connected') {
        console.log(`${name} ready with SQL Server.`); return;
      }
    } catch { /* Startup may still be applying schema migrations. */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`${name} did not become healthy; Vue was not started.`);
}
async function main() {
  if (springPort === webPort) throw new Error('Spring and web ports must differ.');
  for (const port of [springPort, webPort]) {
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid server port.');
    await available(port);
  }
  console.log(`Vue: http://localhost:${webPort} | Spring: http://localhost:${springPort}`);
  start('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'backend/scripts/maven.ps1', 'spring-boot:run'], {
    SPRING_PORT: String(springPort),
  });
  await ready(springPort, 'Spring');
  start(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(webPort), '--strictPort'], { VITE_API_BASE_URL: `http://localhost:${springPort}/api` }, path.join(root, 'frontend'));
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
main().catch(error => { console.error(error.message); stop(1); });
