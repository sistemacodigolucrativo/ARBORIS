import { Crown, Trees } from 'lucide-react';
import treeScene from '../assets/arboris-tree-scene.webp';
import './TreeBoard.css';

export interface BoardPosition {
  id: number;
  tree_id: number;
  position_index: number;
  level: number;
  side: string;
  user_id: number | null;
  status: 'vacant' | 'occupied';
  activation_status?: 'reserved' | 'active' | null;
  username?: string;
  full_name?: string;
}

// One coordinate system for artwork, connections and all 15 interactive positions.
// Percentages keep the full crown and roots visible at every viewport width.
const layout = [
  { x: 50, y: 45, size: 26 },
  { x: 25, y: 45, size: 18 }, { x: 75, y: 45, size: 18 },
  { x: 39, y: 31, size: 12 }, { x: 36, y: 58, size: 12 },
  { x: 61, y: 31, size: 12 }, { x: 64, y: 58, size: 12 },
  { x: 14, y: 33, size: 14 }, { x: 31, y: 21, size: 14 },
  { x: 69, y: 21, size: 14 }, { x: 86, y: 33, size: 14 },
  { x: 87, y: 57, size: 14 }, { x: 73, y: 70, size: 14 },
  { x: 27, y: 70, size: 14 }, { x: 13, y: 57, size: 14 },
];
const connections = [[0,1],[0,2],[1,3],[1,4],[2,5],[2,6],[3,7],[3,8],[4,13],[4,14],[5,9],[5,10],[6,11],[6,12]];

export function TreeBoard({ positions, currentUserId, treeCode, treeLabel, onSelect }: {
  positions: BoardPosition[];
  currentUserId?: number;
  treeCode?: string;
  treeLabel?: string;
  onSelect: (position: BoardPosition) => void;
}) {
  return (
    <section className="arboris-tree-board" aria-label={`Explorador da árvore ${treeCode || ''}`}>
      <img className="arboris-tree-art" src={treeScene} width="1024" height="1536" alt="" decoding="async" draggable={false} />
      <div className="arboris-tree-brand"><span><Trees aria-hidden="true" /></span><strong>ARBORIS</strong></div>
      <header className="arboris-tree-heading">
        <h3>Explorador da Árvore: <strong>{treeCode || 'Árvore comunitária'}</strong>{treeLabel && <> · {treeLabel}</>}</h3>
        <span>15<br />Posições</span>
      </header>
      <svg className="arboris-tree-connections" viewBox="0 0 1000 1500" aria-hidden="true">
        {connections.map(([from, to]) => {
          const a = layout[from], b = layout[to];
          const path = `M ${a.x * 10} ${a.y * 15} Q ${(a.x + b.x) * 5} ${a.y * 15} ${b.x * 10} ${b.y * 15}`;
          return <g key={`${from}-${to}`}><path className="arboris-branch-glow" d={path} /><path className="arboris-branch-core" d={path} /></g>;
        })}
      </svg>
      {positions.map(position => {
        const point = layout[position.position_index];
        if (!point) return null;
        const root = position.position_index === 0;
        // Direction follows the visible side of the tree, including positions 13–14.
        const leafDirection = point.x < 50 ? 'left' : 'right';
        const occupied = position.status === 'occupied';
        const reserved = occupied && position.activation_status === 'reserved';
        const state = reserved ? 'reserved' : occupied ? 'active' : 'vacant';
        const statusLabel = reserved ? 'Reservado' : occupied ? 'Ativado' : 'Vaga aberta';
        const name = occupied ? position.full_name || position.username || 'Participante' : 'Livre';
        const mine = currentUserId !== undefined && position.user_id === currentUserId;
        return (
          <button key={position.position_index} type="button"
            className={`arboris-tree-node arboris-tree-node--${state}${root ? ' arboris-tree-node--root' : ` arboris-tree-node--leaf arboris-tree-node--leaf-${leafDirection}`}${mine ? ' arboris-tree-node--mine' : ''}`}
            style={{ left: `${point.x}%`, top: `${point.y}%`, width: `${point.size}%` }}
            data-position={position.position_index} data-state={state}
            aria-label={`${root ? 'Tronco' : 'Posição'} #${position.position_index}: ${name}. ${statusLabel}${mine ? '. Você' : ''}`}
            title={`${name} · ${statusLabel}`} onClick={() => onSelect(position)}>
            {!root && <svg className="arboris-leaf-veins" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
              <path d="M 9 9 Q 44 43 86 86 M 32 33 Q 43 24 58 23 M 48 49 Q 62 39 76 41 M 33 34 Q 24 43 24 57 M 49 50 Q 39 62 42 76" />
            </svg>}
            {root && <Crown aria-hidden="true" />}
            <span className="arboris-tree-node-index">{root ? 'TRONCO #0' : `#${position.position_index}`}</span>
            {(root || occupied) && <span className="arboris-tree-node-name">{name}</span>}
            {mine && <span className="arboris-tree-node-you">VOCÊ</span>}
          </button>
        );
      })}
      <div className="arboris-tree-legend" aria-label="Legenda da árvore">
        <span><i className="arboris-key--root" />Centro: Tronco</span>
        <span><i className="arboris-key--active" />Ativado</span>
        <span><i className="arboris-key--reserved" />Reservado</span>
        <span><i className="arboris-key--vacant" />Vaga Aberta</span>
      </div>
    </section>
  );
}
