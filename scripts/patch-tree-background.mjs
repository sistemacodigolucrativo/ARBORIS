import fs from 'node:fs';

const appPath = 'src/App.tsx';
let source = fs.readFileSync(appPath, 'utf8');

const needle = '      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col items-center relative overflow-hidden">';
const replacement = '      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col items-center relative overflow-hidden bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "linear-gradient(rgba(2, 6, 23, 0.10), rgba(2, 6, 23, 0.18)), url(\\\'/assets/arboris-tree-background.svg\\\')" }}>';

if (!source.includes(needle)) {
  throw new Error('Tree background target container not found.');
}

source = source.replace(needle, replacement);
fs.writeFileSync(appPath, source);
console.log('Applied Arboris tree background to radial tree container.');
