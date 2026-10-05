import fs from 'node:fs';

const appPath = 'src/App.tsx';
let source = fs.readFileSync(appPath, 'utf8');

const leafHelper = String.raw`
  const renderLeafNode = (
    p: Position,
    currentUserId: number | undefined,
    wrapperStyle: React.CSSProperties,
    size: 'sm' | 'md' | 'lg',
    variant: 'left' | 'right' | 'top' | 'bottom' = 'top',
    label?: string
  ) => {
    const isUser = p.user_id === currentUserId;
    const isOcc = p.status === 'occupied';
    const isReserved = isOcc && p.activation_status === 'reserved';
    const sizeMap = {
      lg: { width: 96, height: 96, numSize: 'text-[15px]', nameSize: 'text-[11px]', maxWidth: 'max-w-[70px]' },
      md: { width: 82, height: 82, numSize: 'text-[13px]', nameSize: 'text-[10px]', maxWidth: 'max-w-[60px]' },
      sm: { width: 72, height: 72, numSize: 'text-[12px]', nameSize: 'text-[9px]', maxWidth: 'max-w-[52px]' },
    }[size];

    const transformMap = {
      left: 'rotate(-7deg)',
      right: 'scaleX(-1) rotate(-7deg)',
      top: 'rotate(-1deg)',
      bottom: 'rotate(4deg)',
    } as const;

    const glowClass = isUser
      ? 'drop-shadow-[0_0_12px_rgba(16,185,129,0.95)]'
      : isReserved
      ? 'drop-shadow-[0_0_10px_rgba(244,63,94,0.85)]'
      : isOcc
      ? 'drop-shadow-[0_0_9px_rgba(52,211,153,0.65)]'
      : 'opacity-65 grayscale-[0.15]';

    const displayName = isOcc ? (label || p.full_name || p.username || '') : 'Vaga Livre';

    return (
      <button
        key={p.position_index}
        type="button"
        onClick={() => setSelectedNode(p)}
        style={{ ...wrapperStyle, width: sizeMap.width + 'px', height: sizeMap.height + 'px' }}
        className="absolute z-10 cursor-pointer transition hover:scale-[1.03] focus:outline-none"
        title={'Posição #' + p.position_index + ': ' + (isOcc ? displayName : 'Vaga Livre')}
      >
        <div
          className={'absolute inset-0 bg-center bg-contain bg-no-repeat ' + glowClass}
          style={{
            backgroundImage: "url('/ARBORIS/assets/arboris-leaf-node.png')",
            transform: transformMap[variant],
            transformOrigin: 'center center',
          }}
        />
        <div className="absolute inset-[16%] flex flex-col items-center justify-center text-center px-1.5 pt-1">
          <span
            className={'font-mono font-black ' + sizeMap.numSize + ' tracking-tight text-white'}
            style={{ textShadow: '0 1px 0 rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.85)', WebkitTextStroke: '0.45px rgba(0,0,0,0.9)' }}
          >
            #{p.position_index}
          </span>
          <span
            className={sizeMap.nameSize + ' ' + sizeMap.maxWidth + ' text-center font-bold leading-tight text-white'}
            style={{ textShadow: '0 1px 0 rgba(0,0,0,0.98), 0 0 10px rgba(0,0,0,0.85)', WebkitTextStroke: '0.35px rgba(0,0,0,0.88)' }}
          >
            {displayName}
          </span>
          {isUser && (
            <span className="mt-0.5 rounded-full bg-emerald-500/90 px-1.5 py-[1px] text-[8px] font-black uppercase tracking-wide text-slate-950 shadow">
              VOCÊ
            </span>
          )}
        </div>
      </button>
    );
  };

  const buildTreeDisplayLabels = (positionsToRender: Position[]) => {
    const occupied = positionsToRender.filter(pos => pos.status === 'occupied' && (pos.full_name || pos.username));
    const firstNameCounts = new Map<string, number>();

    const normalized = occupied.map((pos) => {
      const source = (pos.full_name || pos.username || '').trim();
      const parts = source.split(/\s+/).filter(Boolean);
      const firstName = (parts[0] || source).trim();
      const surname = parts.length > 1 ? parts[parts.length - 1].trim() : '';
      const firstKey = firstName.toLowerCase();
      firstNameCounts.set(firstKey, (firstNameCounts.get(firstKey) || 0) + 1);
      return { pos, firstName, surname, firstKey };
    });

    const labels = new Map<number, string>();
    normalized.forEach(({ pos, firstName, surname, firstKey }) => {
      const duplicate = (firstNameCounts.get(firstKey) || 0) > 1;
      const surnameInitial = surname ? ' ' + surname.charAt(0).toUpperCase() + '.' : '';
      labels.set(pos.position_index, (firstName + (duplicate ? surnameInitial : '')).trim());
    });

    return labels;
  };
`;

if (!source.includes('const renderLeafNode = (')) {
  const anchor = '  const renderModel1Radial = (positionsToRender: Position[], currentUserId?: number) => {';
  if (!source.includes(anchor)) throw new Error('renderModel1Radial anchor not found.');
  source = source.replace(anchor, leafHelper + '\n\n' + anchor);
}

if (!source.includes('const treeLabels = buildTreeDisplayLabels(positionsToRender);')) {
  const anchor = '    const n3 = positionsToRender.filter(p => p.position_index >= 7 && p.position_index <= 14);\n';
  if (!source.includes(anchor)) throw new Error('n3 anchor not found.');
  source = source.replace(anchor, anchor + '    const treeLabels = buildTreeDisplayLabels(positionsToRender);\n');
}

function replaceBetween(src, start, end, replacement) {
  const startIndex = src.indexOf(start);
  if (startIndex === -1) throw new Error('Start marker not found: ' + start);
  const endIndex = src.indexOf(end, startIndex + start.length);
  if (endIndex === -1) throw new Error('End marker not found after: ' + start);
  return src.slice(0, startIndex) + replacement + '\n\n' + src.slice(endIndex);
}

const ring1Start = '          {/* RING 1: RAMOS PRINCIPAIS (#1 ESQ e #2 DIR) */}';
const ring2Start = '          {/* RING 2: SUB-RAMOS (#3, #4, #5, #6) */}';
const ring3Start = '          {/* RING 3: 8 VAGAS DE ENTRADA (#7 a #14) */}';
const ringEnd = '        </div>\n\n        {/* Legend */}';

const ring1Replacement = String.raw`          {/* RING 1: RAMOS PRINCIPAIS (#1 ESQ e #2 DIR) */}
          {n1.map((p) => {
            const isLeft = p.position_index === 1;
            const style = isLeft ? { left: '42px', top: '116px' } : { right: '42px', top: '116px' };
            return renderLeafNode(p, currentUserId, style, 'lg', isLeft ? 'left' : 'right', treeLabels.get(p.position_index));
          })}`;

const ring2Replacement = String.raw`          {/* RING 2: SUB-RAMOS (#3, #4, #5, #6) */}
          {n2.map((p) => {
            let posStyle: React.CSSProperties = {};
            let variant: 'left' | 'right' | 'top' | 'bottom' = 'top';
            if (p.position_index === 3) { posStyle = { left: '10px', top: '62px' }; variant = 'left'; }
            if (p.position_index === 4) { posStyle = { left: '10px', bottom: '62px' }; variant = 'left'; }
            if (p.position_index === 5) { posStyle = { right: '10px', top: '62px' }; variant = 'right'; }
            if (p.position_index === 6) { posStyle = { right: '10px', bottom: '62px' }; variant = 'right'; }
            return renderLeafNode(p, currentUserId, posStyle, 'md', variant, treeLabels.get(p.position_index));
          })}`;

const ring3Replacement = String.raw`          {/* RING 3: 8 VAGAS DE ENTRADA (#7 a #14) */}
          {n3.map((p, i) => {
            const angles = [-150, -118, -62, -28, 28, 62, 118, 150];
            const angleRad = (angles[i] * Math.PI) / 180;
            const x = 165 + 140 * Math.cos(angleRad) - 36;
            const y = 165 + 140 * Math.sin(angleRad) - 36;
            const isLeftSide = x < 134;
            const variant = angles[i] < -100 || angles[i] > 100 ? (isLeftSide ? 'left' : 'right') : angles[i] < 0 ? 'top' : 'bottom';
            return renderLeafNode(p, currentUserId, { left: x + 'px', top: y + 'px' }, 'sm', variant, treeLabels.get(p.position_index));
          })}`;

source = replaceBetween(source, ring1Start, ring2Start, ring1Replacement);
source = replaceBetween(source, ring2Start, ring3Start, ring2Replacement);
source = replaceBetween(source, ring3Start, ringEnd, ring3Replacement);

fs.writeFileSync(appPath, source);
console.log('Applied Arboris leaf node visual patch.');
