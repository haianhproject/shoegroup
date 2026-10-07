const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const frontendRequire = require('node:module').createRequire(path.join(root, 'frontend/package.json'));
const { parse } = frontendRequire('@babel/parser');
const { parse: parseVue } = frontendRequire('@vue/compiler-sfc');
const source = path.join(root, 'frontend/src');
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(?:js|vue|css)$/.test(file)) files.push(file);
  }
}
walk(source);
const graph = new Map();
const missing = [];
function resolve(from, specifier) {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return null;
  const base = specifier.startsWith('@/') ? path.resolve(source, specifier.slice(2).split('?')[0]) : path.resolve(path.dirname(from), specifier.split('?')[0]);
  const resolved = [base, base + '.js', base + '.vue', path.join(base, 'index.js')].find(file => fs.existsSync(file) && fs.statSync(file).isFile());
  if (!resolved) missing.push({ from: path.relative(root, from), import: specifier });
  return resolved;
}
function visit(node, from, edges) {
  if (!node || typeof node !== 'object') return;
  let specifier;
  if (['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type)) specifier = node.source?.value;
  if (node.type === 'CallExpression' && node.callee.type === 'Import') specifier = node.arguments[0]?.value;
  if (typeof specifier === 'string') {
    const target = resolve(from, specifier); if (target) edges.add(target);
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => visit(child, from, edges));
    else if (value?.type) visit(value, from, edges);
  }
}
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8'); const edges = new Set(); graph.set(file, edges);
  let scripts = [text];
  if (file.endsWith('.vue')) {
    const { descriptor, errors } = parseVue(text, { filename: file });
    if (errors.length) throw new Error(`Cannot parse ${file}`);
    scripts = [descriptor.script, descriptor.scriptSetup].filter(Boolean).map(script => script.content);
    for (const style of descriptor.styles) if (style.src) { const target = resolve(file, style.src); if (target) edges.add(target); }
  }
  if (file.endsWith('.css')) {
    for (const match of text.matchAll(/@import\s+['"]([^'"]+)['"]/g)) { const target = resolve(file, match[1]); if (target) edges.add(target); }
  } else for (const script of scripts) visit(parse(script, { sourceType: 'module' }), file, edges);
}
const used = new Set();
function mark(file) { if (used.has(file)) return; used.add(file); for (const edge of graph.get(file) || []) mark(edge); }
mark(path.join(source, 'main.js'));
console.log(JSON.stringify({ scanned: files.length, missing, unreachable: files.filter(file => !used.has(file)).map(file => path.relative(root, file).replaceAll('\\', '/')) }, null, 2));
process.exitCode = missing.length ? 1 : 0;
