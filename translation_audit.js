const fs = require('fs');
const path = require('path');
const root = process.cwd();
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
const files = walk(root).filter(f => /(\.jsx|\.js|\.ts|\.tsx|\.json)$/.test(f));
const keyRegex = /t\(\s*['"`]+([^'"`]+?)['"`]+/g;
const used = new Set();
for (const f of files) {
  if (/node_modules/.test(f)) continue;
  if (/\.json$/.test(f) && /locales/.test(f)) continue;
  const content = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = keyRegex.exec(content))) {
    used.add(m[1]);
  }
}
const localeFiles = ['src/locales/en.json', 'src/locales/ar.json'];
const localeData = {};
const flatten = (obj, prefix = '') => Object.entries(obj).flatMap(([k, v]) => typeof v === 'object' && v !== null && !Array.isArray(v) ? flatten(v, prefix ? prefix + '.' + k : k) : [[prefix ? prefix + '.' + k : k, v]]);
for (const lf of localeFiles) {
  const json = JSON.parse(fs.readFileSync(path.join(root, lf), 'utf8'));
  localeData[lf] = Object.fromEntries(flatten(json));
}
console.log('used count', used.size);
for (const lf of localeFiles) {
  const missing = [...used].filter(k => !(k in localeData[lf])).sort();
  console.log(`\nmissing in ${lf}: ${missing.length}`);
  missing.forEach(k => console.log(k));
}
for (const lf of localeFiles) {
  const unused = Object.keys(localeData[lf]).filter(k => !used.has(k)).sort();
  console.log(`\nunused in ${lf}: ${unused.length}`);
  unused.forEach(k => console.log(k));
}
