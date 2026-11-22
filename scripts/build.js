const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist');

const STATIC_FILES = ['index.html', 'styles.css', 'manifest.json', 'icon.svg'];
const STATIC_DIRS = ['src'];

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const file of STATIC_FILES) {
  const srcFile = path.join(ROOT, file);
  if (!fs.existsSync(srcFile)) {
    throw new Error(`Missing required asset: ${file}`);
  }
  fs.copyFileSync(srcFile, path.join(OUT, file));
}

for (const dir of STATIC_DIRS) {
  const srcDir = path.join(ROOT, dir);
  if (!fs.existsSync(srcDir)) {
    throw new Error(`Missing required directory: ${dir}`);
  }
  copyDir(srcDir, path.join(OUT, dir));
}

console.log('Static build complete -> dist/');
