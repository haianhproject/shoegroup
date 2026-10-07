const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');
const net = require('node:net');
const root = path.resolve(__dirname, '../..');
const children = [];
let stopping = false;
const springPort = Number(process.env.SPRING_PORT || 5000);
const legacyPort = Number(process.env.LEGACY_PORT || 5001);
const webPort = Number(process.env.WEB_PORT || 3000);

function available(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(port, () => server.close(resolve));
  });
}
function start(command, args, env) {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } });
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
async function main() {
  if (new Set([springPort, legacyPort, webPort]).size !== 3) throw new Error('Spring, legacy and web ports must differ.');
  for (const port of [springPort, legacyPort, webPort]) {
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid server port.');
    await available(port);
  }
  console.log(`Vue: http://localhost:${webPort} | Spring: http://localhost:${springPort} | Express transition: 127.0.0.1:${legacyPort}`);
  start(process.execPath, ['--watch', 'backend/server.js'], { PORT: String(legacyPort), MIGRATION_BRIDGE: 'true', AUTH_MODE: 'enforce' });
  start('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'backend-spring/scripts/maven.ps1', 'spring-boot:run'], {
    SPRING_PORT: String(springPort), LEGACY_API_URL: `http://127.0.0.1:${legacyPort}`,
  });
  start(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(webPort), '--strictPort'], { VITE_API_BASE_URL: `http://localhost:${springPort}/api` });
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
main().catch(error => { console.error(error.message); stop(1); });
