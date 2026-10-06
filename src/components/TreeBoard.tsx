import { useEffect, useRef, useState } from 'react';
import type {
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent
} from 'react';
import { Crown, Trees } from 'lucide-react';
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
const ARBORIS_UI_STATE_KEY = 'arboris_ui_state_v1';
const TREE_OVERLAY_SELECTOR = '.arboris-tree-brand, .arboris-tree-heading, .arboris-tree-legend, .arboris-tree-reorder-hint, .arboris-tree-toast';

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

function shouldLockTreeScroll(eventTarget: EventTarget | null) {
  if (typeof Element === 'undefined' || !(eventTarget instanceof Element)) return false;
  if (eventTarget.closest('[data-arboris-position]')) return true;
  if (eventTarget.closest(TREE_OVERLAY_SELECTOR)) return false;
  return Boolean(eventTarget.closest('.arboris-tree-board'));
}

export function TreeBoard({ positions, currentUserId, treeCode, treeLabel, onSelect }: {
  positions: BoardPosition[];
  currentUserId?: number;
  treeCode?: string;
  treeLabel?: string;
  onSelect: (position: BoardPosition) => void;
}) {
  const boardRef = useRef<HTMLElement | null>(null);
  const dragSourceRef = useRef<BoardPosition | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragMovedRef = useRef(false);
  const suppressNextClickRef = useRef(false);
  const moveMessageTimerRef = useRef<number | null>(null);
  const scrollLockedRef = useRef(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [moving, setMoving] = useState(false);
  const [moveMessage, setMoveMessage] = useState<string | null>(null);
  const [treeScrollLocked, setTreeScrollLocked] = useState(false);
  const canReorder = isCoordinatorTreeContext();

  const lockTreeScroll = () => {
    if (!canReorder) return;
    scrollLockedRef.current = true;
    setTreeScrollLocked(true);
  };

  const unlockTreeScroll = () => {
    scrollLockedRef.current = false;
    setTreeScrollLocked(false);
  };

  useEffect(() => {
    if (!canReorder || typeof document === 'undefined' || typeof window === 'undefined') {
      return undefined;
    }

    const releaseLock = () => unlockTreeScroll();
    const releaseWhenPointerStartsOutsideBoard = (event: PointerEvent) => {
      const board = boardRef.current;
      const target = event.target;
      if (!board || !(target instanceof Node) || !board.contains(target)) {
        unlockTreeScroll();
      }
    };
    const blockScrollWhileLocked = (event: TouchEvent) => {
      if (scrollLockedRef.current) event.preventDefault();
    };

    document.addEventListener('pointerdown', releaseWhenPointerStartsOutsideBoard, true);
    document.addEventListener('touchmove', blockScrollWhileLocked, { passive: false, capture: true });
    window.addEventListener('pointerup', releaseLock, true);
    window.addEventListener('pointercancel', releaseLock, true);
    window.addEventListener('touchend', releaseLock, true);
    window.addEventListener('touchcancel', releaseLock, true);
    window.addEventListener('blur', releaseLock);

    return () => {
      document.removeEventListener('pointerdown', releaseWhenPointerStartsOutsideBoard, true);
      document.removeEventListener('touchmove', blockScrollWhileLocked, true);
      window.removeEventListener('pointerup', releaseLock, true);
      window.removeEventListener('pointercancel', releaseLock, true);
      window.removeEventListener('touchend', releaseLock, true);
      window.removeEventListener('touchcancel', releaseLock, true);
      window.removeEventListener('blur', releaseLock);
    };
  }, [canReorder]);

  const notifyMove = (message: string) => {
    setMoveMessage(message);
    if (typeof window === 'undefined') return;
    if (moveMessageTimerRef.current) window.clearTimeout(moveMessageTimerRef.current);
    moveMessageTimerRef.current = window.setTimeout(() => setMoveMessage(null), 3200);
  };

  const clearDragState = () => {
    dragSourceRef.current = null;
    dragStartRef.current = null;
    dragMovedRef.current = false;
    setDraggingIndex(null);
    setDropTargetIndex(null);
  };

  const moveParticipant = async (source: BoardPosition, target: BoardPosition) => {
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

    setMoving(true);
    notifyMove(`Movendo participante da posição #${source.position_index} para #${target.position_index}...`);
    try {
      const result = await assignPositionDirect({
        treeId: source.tree_id,
        positionIndex: target.position_index,
        userId: source.user_id
      });
      if (result?.success === false) {
        throw new Error(result.error || 'A API recusou a movimentação.');
      }
      notifyMove(`Participante movido para a posição #${target.position_index}. Atualizando árvore...`);
      if (typeof window !== 'undefined') {
        window.setTimeout(() => window.location.reload(), 450);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha desconhecida.';
      notifyMove(`Erro ao mover participante: ${message}`);
    } finally {
      setMoving(false);
    }
  };

  const handleTreePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!canReorder) return;
    if (shouldLockTreeScroll(event.target)) {
      lockTreeScroll();
      return;
    }
    unlockTreeScroll();
  };

  const handleTreeWheel = (event: ReactWheelEvent<HTMLElement>) => {
    if (canReorder && scrollLockedRef.current) {
      event.preventDefault();
    }
  };

  const handleNodePointerDown = (event: ReactPointerEvent<HTMLButtonElement>, position: BoardPosition) => {
    if (!canReorder || moving) return;
    if (position.position_index === 0 || position.status !== 'occupied' || !position.user_id) return;

    lockTreeScroll();
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

    const hoveredPosition = getPositionAtPointer(positions, event.clientX, event.clientY);
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
    const target = getPositionAtPointer(positions, event.clientX, event.clientY);
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
      void moveParticipant(source, target);
    }
  };

  const handleNodePointerCancel = () => {
    clearDragState();
    unlockTreeScroll();
  };

  return (
    <section
      ref={boardRef}
      className={`arboris-tree-board${canReorder && treeScrollLocked ? ' arboris-tree-board--scroll-locked' : ''}`}
      aria-label={`Explorador da árvore ${treeCode || ''}`}
      onPointerDown={handleTreePointerDown}
      onWheel={handleTreeWheel}
    >
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
        const draggableNode = canReorder && occupied && !root && position.user_id !== null && !moving;
        const isDragging = draggingIndex === position.position_index;
        const isDropTarget = dropTargetIndex === position.position_index && draggingIndex !== null;
        return (
          <button key={position.position_index} type="button"
            className={`arboris-tree-node arboris-tree-node--${state}${root ? ' arboris-tree-node--root' : ` arboris-tree-node--leaf arboris-tree-node--leaf-${leafDirection}`}${mine ? ' arboris-tree-node--mine' : ''}${draggableNode ? ' arboris-tree-node--draggable' : ''}${isDragging ? ' arboris-tree-node--dragging' : ''}${isDropTarget ? ' arboris-tree-node--drop-target' : ''}${moving ? ' arboris-tree-node--locked' : ''}`}
            style={{ left: `${point.x}%`, top: `${point.y}%`, width: `${point.size}%` }}
            data-position={position.position_index}
            data-arboris-position="true"
            data-state={state}
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
      {canReorder && (
        <div className="arboris-tree-reorder-hint" aria-hidden="true">
          Arraste um participante ocupado para reorganizar a árvore.
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