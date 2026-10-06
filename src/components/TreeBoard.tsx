import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Crown, RefreshCw, Save, Trees, X } from 'lucide-react';
import treeScene from '../assets/arboris-tree-scene.webp';
import { assignPositionDirect } from '../services/directAdminActions';
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

type PendingMove = {
  treeId: number;
  fromIndex: number;
  positionIndex: number;
  userId: number;
};

// Visual matrix derived from the Arboris 1 → 2 → 4 → 8 hierarchy.
// The coordinate order is not merely numeric: each child is placed under its parent.
const layout = [
  { x: 50, y: 27, size: 21 },
  { x: 32, y: 43, size: 16 }, { x: 68, y: 43, size: 16 },
  { x: 20, y: 58, size: 12 }, { x: 44, y: 58, size: 12 },
  { x: 56, y: 58, size: 12 }, { x: 80, y: 58, size: 12 },
  { x: 10, y: 73, size: 11 }, { x: 22, y: 73, size: 11 },
  { x: 34, y: 73, size: 11 }, { x: 46, y: 73, size: 11 },
  { x: 54, y: 73, size: 11 }, { x: 66, y: 73, size: 11 },
  { x: 78, y: 73, size: 11 }, { x: 90, y: 73, size: 11 },
];

const connections = [
  [0, 1], [0, 2],
  [1, 3], [1, 4], [2, 5], [2, 6],
  [3, 7], [3, 8], [4, 9], [4, 10],
  [5, 11], [5, 12], [6, 13], [6, 14]
];

const ARBORIS_UI_STATE_KEY = 'arboris_ui_state_v1';

function isCoordinatorTreeContext() {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(ARBORIS_UI_STATE_KEY);
    if (!raw) return false;
    const state = JSON.parse(raw);
    return state?.currentView === 'admin' && state?.adminTab === 'global_trees';
  } catch {
    return false;
  }
}

function getPositionAtPointer(positions: BoardPosition[], clientX: number, clientY: number) {
  if (typeof document === 'undefined') return null;
  const element = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
  const node = element?.closest<HTMLElement>('[data-arboris-position]');
  const rawIndex = node?.dataset.position;
  if (!rawIndex) return null;
  const positionIndex = Number(rawIndex);
  if (!Number.isInteger(positionIndex)) return null;
  return positions.find(position => position.position_index === positionIndex) || null;
}

export function TreeBoard({ positions, currentUserId, treeCode, treeLabel, onSelect }: {
  positions: BoardPosition[];
  currentUserId?: number;
  treeCode?: string;
  treeLabel?: string;
  onSelect: (position: BoardPosition) => void;
}) {
  const dragSourceRef = useRef<BoardPosition | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragMovedRef = useRef(false);
  const suppressNextClickRef = useRef(false);
  const moveMessageTimerRef = useRef<number | null>(null);
  const [boardPositions, setBoardPositions] = useState<BoardPosition[]>(positions);
  const [pendingMoves, setPendingMoves] = useState<PendingMove[]>([]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [savingMoves, setSavingMoves] = useState(false);
  const [moveMessage, setMoveMessage] = useState<string | null>(null);
  const canReorder = isCoordinatorTreeContext();

  useEffect(() => {
    if (pendingMoves.length === 0) setBoardPositions(positions);
  }, [positions, pendingMoves.length]);

  const notifyMove = (message: string) => {
    setMoveMessage(message);
    if (typeof window === 'undefined') return;
    if (moveMessageTimerRef.current) window.clearTimeout(moveMessageTimerRef.current);
    moveMessageTimerRef.current = window.setTimeout(() => setMoveMessage(null), 4200);
  };

  const clearDragState = () => {
    dragSourceRef.current = null;
    dragStartRef.current = null;
    dragMovedRef.current = false;
    setDraggingIndex(null);
    setDropTargetIndex(null);
  };

  const moveParticipant = (source: BoardPosition, target: BoardPosition) => {
    if (source.tree_id !== target.tree_id) {
      notifyMove('Movimento inválido: origem e destino pertencem a árvores diferentes.');
      return;
    }
    if (source.position_index === 0 || !source.user_id) {
      notifyMove('O tronco não pode ser movido por drag-and-drop.');
      return;
    }
    if (target.position_index === 0) {
      notifyMove('Não solte participante sobre o tronco. Use criação de árvore para trocar o tronco.');
      return;
    }
    if (target.status === 'occupied' && target.user_id !== source.user_id) {
      notifyMove('Destino ocupado. Libere a posição antes de mover para ela.');
      return;
    }

    setBoardPositions(current => current.map(position => {
      if (position.tree_id !== source.tree_id) return position;
      if (position.user_id === source.user_id && position.status === 'occupied') {
        return { ...position, user_id: null, status: 'vacant', activation_status: null, username: undefined, full_name: undefined };
      }
      if (position.position_index === target.position_index) {
        return {
          ...position,
          user_id: source.user_id,
          status: 'occupied',
          activation_status: source.activation_status || 'active',
          username: source.username,
          full_name: source.full_name
        };
      }
      return position;
    }));

    setPendingMoves(current => [...current, {
      treeId: source.tree_id,
      fromIndex: source.position_index,
      positionIndex: target.position_index,
      userId: source.user_id!
    }]);
    notifyMove(`Movimento pendente: posição #${source.position_index} → #${target.position_index}. Clique em Salvar alterações para persistir.`);
  };

  const savePendingMoves = async () => {
    if (!pendingMoves.length || savingMoves) return;
    setSavingMoves(true);
    notifyMove('Salvando reposicionamentos...');
    try {
      for (const move of pendingMoves) {
        const result = await assignPositionDirect({
          treeId: move.treeId,
          positionIndex: move.positionIndex,
          userId: move.userId
        });
        if (result?.success === false) {
          throw new Error(result.error || `A API recusou a posição #${move.positionIndex}.`);
        }
      }
      setPendingMoves([]);
      notifyMove('Reposicionamentos salvos. Atualizando árvore...');
      if (typeof window !== 'undefined') window.setTimeout(() => window.location.reload(), 450);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha desconhecida.';
      notifyMove(`Erro ao salvar reposicionamentos: ${message}`);
    } finally {
      setSavingMoves(false);
    }
  };

  const discardPendingMoves = () => {
    if (savingMoves) return;
    setBoardPositions(positions);
    setPendingMoves([]);
    notifyMove('Alterações pendentes descartadas.');
  };

  const handleNodePointerDown = (event: ReactPointerEvent<HTMLButtonElement>, position: BoardPosition) => {
    if (!canReorder || savingMoves) return;
    if (position.position_index === 0 || position.status !== 'occupied' || !position.user_id) return;

    dragSourceRef.current = position;
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    dragMovedRef.current = false;
    setDraggingIndex(position.position_index);
    setDropTargetIndex(position.position_index);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleNodePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragSourceRef.current) return;
    event.preventDefault();

    const start = dragStartRef.current;
    if (start && !dragMovedRef.current) {
      const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
      if (distance > 6) dragMovedRef.current = true;
    }

    const hoveredPosition = getPositionAtPointer(boardPositions, event.clientX, event.clientY);
    setDropTargetIndex(hoveredPosition?.position_index ?? null);
  };

  const handleNodePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const source = dragSourceRef.current;
    if (!source) return;

    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const wasDragged = dragMovedRef.current;
    const target = getPositionAtPointer(boardPositions, event.clientX, event.clientY);
    if (wasDragged) {
      suppressNextClickRef.current = true;
      if (typeof window !== 'undefined') {
        window.setTimeout(() => {
          suppressNextClickRef.current = false;
        }, 0);
      }
    }

    clearDragState();
    if (wasDragged && target && target.position_index !== source.position_index) {
      moveParticipant(source, target);
    }
  };

  const handleNodePointerCancel = () => {
    clearDragState();
  };

  return (
    <section
      className="arboris-tree-board"
      aria-label={`Visualização da árvore ${treeCode || ''}`}
    >
      <img className="arboris-tree-art" src={treeScene} width="1024" height="1536" alt="" decoding="async" draggable={false} />
      <div className="arboris-tree-brand"><span><Trees aria-hidden="true" /></span><strong>ARBORIS</strong></div>
      <svg className="arboris-tree-connections" viewBox="0 0 1000 1500" aria-hidden="true">
        {connections.map(([from, to]) => {
          const a = layout[from], b = layout[to];
          const controlY = Math.min(a.y, b.y) * 15 + Math.abs(a.x - b.x) * 1.6;
          const path = `M ${a.x * 10} ${a.y * 15} Q ${(a.x + b.x) * 5} ${controlY} ${b.x * 10} ${b.y * 15}`;
          return <g key={`${from}-${to}`}><path className="arboris-branch-glow" d={path} /><path className="arboris-branch-core" d={path} /></g>;
        })}
      </svg>
      {boardPositions.map(position => {
        const point = layout[position.position_index];
        if (!point) return null;
        const root = position.position_index === 0;
        const leafDirection = point.x < 50 ? 'left' : 'right';
        const occupied = position.status === 'occupied';
        const reserved = occupied && position.activation_status === 'reserved';
        const state = reserved ? 'reserved' : occupied ? 'active' : 'vacant';
        const statusLabel = reserved ? 'Reservado' : occupied ? 'Ativado' : 'Vaga aberta';
        const name = occupied ? position.full_name || position.username || 'Participante' : 'Livre';
        const mine = currentUserId !== undefined && position.user_id === currentUserId;
        const draggableNode = canReorder && occupied && !root && position.user_id !== null && !savingMoves;
        const isDragging = draggingIndex === position.position_index;
        const isDropTarget = dropTargetIndex === position.position_index && draggingIndex !== null;
        return (
          <button key={position.position_index} type="button"
            className={`arboris-tree-node arboris-tree-node--${state}${root ? ' arboris-tree-node--root' : ` arboris-tree-node--leaf arboris-tree-node--leaf-${leafDirection}`}${mine ? ' arboris-tree-node--mine' : ''}${draggableNode ? ' arboris-tree-node--draggable' : ''}${isDragging ? ' arboris-tree-node--dragging' : ''}${isDropTarget ? ' arboris-tree-node--drop-target' : ''}${savingMoves ? ' arboris-tree-node--locked' : ''}`}
            style={{ left: `${point.x}%`, top: `${point.y}%`, width: `${point.size}%` }}
            data-position={position.position_index}
            data-arboris-position="true"
            data-state={state}
            data-arboris-user-id={position.user_id ?? ''}
            aria-grabbed={isDragging || undefined}
            aria-label={`${root ? 'Tronco' : 'Posição'} #${position.position_index}: ${name}. ${statusLabel}${mine ? '. Você' : ''}${draggableNode ? '. Arraste para reorganizar.' : ''}`}
            title={`${name} · ${statusLabel}${draggableNode ? ' · arraste para mover' : ''}`}
            onPointerDown={(event) => handleNodePointerDown(event, position)}
            onPointerMove={handleNodePointerMove}
            onPointerUp={handleNodePointerUp}
            onPointerCancel={handleNodePointerCancel}
            onClick={(event) => {
              if (suppressNextClickRef.current) {
                event.preventDefault();
                event.stopPropagation();
                return;
              }
              onSelect(position);
            }}>
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
      {canReorder && pendingMoves.length === 0 && (
        <div className="arboris-tree-reorder-hint" aria-hidden="true">
          Arraste um participante ocupado para reorganizar a árvore.
        </div>
      )}
      {pendingMoves.length > 0 && (
        <div className="arboris-tree-savebar" role="status">
          <span>{pendingMoves.length} alteração(ões) pendente(s)</span>
          <button type="button" onClick={discardPendingMoves} disabled={savingMoves}>
            <X aria-hidden="true" />
            Descartar
          </button>
          <button type="button" onClick={savePendingMoves} disabled={savingMoves} className="arboris-tree-savebar-primary">
            {savingMoves ? <RefreshCw aria-hidden="true" /> : <Save aria-hidden="true" />}
            Salvar alterações
          </button>
        </div>
      )}
      {moveMessage && <div className="arboris-tree-toast" role="status">{moveMessage}</div>}
      <div className="arboris-tree-legend" aria-label="Legenda da árvore">
        <span><i className="arboris-key--root" />Centro: Tronco</span>
        <span><i className="arboris-key--active" />Ativado</span>
        <span><i className="arboris-key--reserved" />Reservado</span>
        <span><i className="arboris-key--vacant" />Vaga Aberta</span>
      </div>
    </section>
  );
}
