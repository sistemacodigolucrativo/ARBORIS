import fs from 'node:fs';

const file = 'src/App.tsx';
let source = fs.readFileSync(file, 'utf8');

const replacements = [
  [
    '<line x1="165" y1="165" x2="95" y2="165" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.6" />',
    '<line x1="165" y1="165" x2="88" y2="163" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.6" />'
  ],
  [
    '<line x1="165" y1="165" x2="235" y2="165" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.6" />',
    '<line x1="165" y1="165" x2="242" y2="163" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.6" />'
  ],
  [
    '<path d="M 95 165 Q 65 140 45 110" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.7" />',
    '<path d="M 88 163 Q 90 125 94 94" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.7" />'
  ],
  [
    '<path d="M 95 165 Q 65 190 45 220" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.7" />',
    '<path d="M 88 163 Q 90 202 94 236" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.7" />'
  ],
  [
    '<path d="M 235 165 Q 265 140 285 110" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.7" />',
    '<path d="M 242 163 Q 240 125 236 94" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.7" />'
  ],
  [
    '<path d="M 235 165 Q 265 190 285 220" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.7" />',
    '<path d="M 242 163 Q 240 202 236 236" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.7" />'
  ],
  [
    "if (p.position_index === 3) posStyle = { left: '25px', top: '80px' };",
    "if (p.position_index === 3) posStyle = { left: '72px', top: '72px' };"
  ],
  [
    "if (p.position_index === 4) posStyle = { left: '25px', bottom: '80px' };",
    "if (p.position_index === 4) posStyle = { left: '72px', bottom: '72px' };"
  ],
  [
    "if (p.position_index === 5) posStyle = { right: '25px', top: '80px' };",
    "if (p.position_index === 5) posStyle = { right: '72px', top: '72px' };"
  ],
  [
    "if (p.position_index === 6) posStyle = { right: '25px', bottom: '80px' };",
    "if (p.position_index === 6) posStyle = { right: '72px', bottom: '72px' };"
  ]
];

for (const [before, after] of replacements) {
  if (!source.includes(before)) {
    throw new Error(`Expected source fragment not found: ${before}`);
  }
  source = source.replace(before, after);
}

fs.writeFileSync(file, source);
console.log('Tree radial positions #3-#6 moved to the middle ring without overlap; connection lines aligned.');
