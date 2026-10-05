from pathlib import Path

ROOT = Path('.')


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding='utf-8')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'{label}: expected block not found')
    return text.replace(old, new, 1)


def ensure_file(path: str, content: str) -> None:
    file = ROOT / path
    if not file.exists():
        file.write_text(content, encoding='utf-8')


# 1. Migration incremental: posição reservada/ativa + solicitações de ativação Pix.
ensure_file('server/migrations/004_pix_activation_flow.sql', """ALTER TABLE tree_positions ADD COLUMN IF NOT EXISTS activationStatus ENUM('reserved','active') NULL AFTER status;
UPDATE tree_positions SET activationStatus = 'active' WHERE status = 'occupied' AND activationStatus IS NULL;

CREATE TABLE IF NOT EXISTS activation_requests (
 id INT PRIMARY KEY,
 requesterUserId INT NOT NULL,
 troncoUserId INT NOT NULL,
 treeId INT NOT NULL,
 positionIndex INT NOT NULL,
 amount INT NOT NULL CHECK (amount >= 0),
 status ENUM('pending','approved','rejected') NOT NULL,
 requesterUsername VARCHAR(100) NOT NULL,
 troncoUsername VARCHAR(100) NOT NULL,
 whatsappMessage TEXT NULL,
 createdAt VARCHAR(30) NOT NULL,
 decidedAt VARCHAR(30) NULL,
 decisionNote TEXT NULL,
 INDEX (troncoUserId, status),
 INDEX (requesterUserId, status),
 FOREIGN KEY (requesterUserId) REFERENCES users(id),
 FOREIGN KEY (troncoUserId) REFERENCES users(id),
 FOREIGN KEY (treeId) REFERENCES trees(id)
) ENGINE=InnoDB;
""")

# 2. Types.
path = 'src/types/game.ts'
text = read(path)
if "export type PositionActivationStatus" not in text:
    text = replace_once(text,
"export type PositionSide = 'root' | 'left' | 'right';\nexport type LedgerEntryType = 'CONCESSAO_INICIAL_SEMENTES' | 'FORTALECIMENTO_TRONCO' | 'RESERVA_VAGA' | 'AJUSTE_ADMINISTRATIVO';",
"export type PositionSide = 'root' | 'left' | 'right';\nexport type PositionActivationStatus = 'reserved' | 'active';\nexport type ActivationRequestStatus = 'pending' | 'approved' | 'rejected';\nexport type LedgerEntryType = 'CONCESSAO_INICIAL_SEMENTES' | 'FORTALECIMENTO_TRONCO' | 'RESERVA_VAGA' | 'AJUSTE_ADMINISTRATIVO';",
    'types status aliases')
if "activationStatus?: PositionActivationStatus" not in text:
    text = replace_once(text,
"  status: 'vacant' | 'occupied';\n  occupiedAt: string | null;",
"  status: 'vacant' | 'occupied';\n  activationStatus?: PositionActivationStatus | null;\n  occupiedAt: string | null;",
    'types tree position activation')
if "export interface ActivationRequest" not in text:
    text = replace_once(text,
"export interface AuditLogEntry {\n  id: number;\n  actorUserId: number;\n  action: string;\n  entity: string;\n  entityId: number | string;\n  metadata: Record<string, any>;\n  createdAt: string;\n  actorUsername?: string;\n}\n\nexport interface GameDatabaseState {",
"export interface AuditLogEntry {\n  id: number;\n  actorUserId: number;\n  action: string;\n  entity: string;\n  entityId: number | string;\n  metadata: Record<string, any>;\n  createdAt: string;\n  actorUsername?: string;\n}\n\nexport interface ActivationRequest {\n  id: number;\n  requesterUserId: number;\n  troncoUserId: number;\n  treeId: number;\n  positionIndex: number;\n  amount: number;\n  status: ActivationRequestStatus;\n  requesterUsername: string;\n  troncoUsername: string;\n  whatsappMessage?: string | null;\n  createdAt: string;\n  decidedAt?: string | null;\n  decisionNote?: string | null;\n}\n\nexport interface GameDatabaseState {",
    'types activation request interface')
if "activationRequests?: ActivationRequest[];" not in text:
    text = replace_once(text,
"  referrals: Referral[];\n  ledger: LedgerEntry[];\n  auditLog: AuditLogEntry[];",
"  referrals: Referral[];\n  ledger: LedgerEntry[];\n  auditLog: AuditLogEntry[];\n  activationRequests?: ActivationRequest[];",
    'types state activation requests')
write(path, text)

# 3. Database mapper.
path = 'server/db.ts'
text = read(path)
if "activation_requests" not in text.split('const descriptors =', 1)[1].split('] as const;', 1)[0]:
    text = replace_once(text,
"  ['auditLog','audit_log','id','id actorUserId action entity entityId metadata createdAt actorUsername']\n] as const;",
"  ['auditLog','audit_log','id','id actorUserId action entity entityId metadata createdAt actorUsername'],\n  ['activationRequests','activation_requests','id','id requesterUserId troncoUserId treeId positionIndex amount status requesterUsername troncoUsername whatsappMessage createdAt decidedAt decisionNote']\n] as const;",
    'db descriptors activation_requests')
if "activationStatus" not in text.split("SELECT * FROM tree_positions", 1)[1].split("return state;", 1)[0]:
    # No explicit mapping block is needed because SELECT * returns the new field.
    pass
text = text.replace(
"await executeForIds(db, 'DELETE FROM referrals WHERE treeId IN', removedTreeIds);\n    await executeForIds(db, 'DELETE FROM ledger WHERE treeId IN', removedTreeIds);",
"await executeForIds(db, 'DELETE FROM referrals WHERE treeId IN', removedTreeIds);\n    await executeForIds(db, 'DELETE FROM activation_requests WHERE treeId IN', removedTreeIds);\n    await executeForIds(db, 'DELETE FROM ledger WHERE treeId IN', removedTreeIds);")
text = text.replace(
"await executeForIds(db, 'DELETE FROM wallets WHERE userId IN', removedUserIds);\n    const placeholders = removedUserIds.map(() => '?').join(',');",
"await executeForIds(db, 'DELETE FROM wallets WHERE userId IN', removedUserIds);\n    const placeholders = removedUserIds.map(() => '?').join(',');\n    await db.execute(`DELETE FROM activation_requests WHERE requesterUserId IN (${placeholders}) OR troncoUserId IN (${placeholders})`, [...removedUserIds, ...removedUserIds]);")
text = text.replace(
"UPDATE tree_positions SET userId=NULL,status='vacant',occupiedAt=NULL,username=NULL,name=NULL WHERE userId IN",
"UPDATE tree_positions SET userId=NULL,status='vacant',activationStatus=NULL,occupiedAt=NULL,username=NULL,name=NULL WHERE userId IN")
text = text.replace(
"const before = new Map((previous?.[key] as any[] || []).map(r => [r[primary], r]));\n    for (const row of state[key] as any[]) {",
"const before = new Map(((previous?.[key] as any[]) || []).map(r => [r[primary], r]));\n    for (const row of (((state as any)[key] || []) as any[])) {")
text = text.replace(
"'treeId index level side userId status occupiedAt username name'.split(' '), { treeId: row.id, ...position });",
"'treeId index level side userId status activationStatus occupiedAt username name'.split(' '), { treeId: row.id, ...position });")
write(path, text)

# 4. Admin engine: mark manual/admin positions as active and clear activation on vacancy.
path = 'src/services/adminGameEngine.ts'
text = read(path)
text = text.replace(
"status: topo.index === 0 ? 'occupied' : 'vacant',\n    occupiedAt: topo.index === 0 ? createdAt : null,",
"status: topo.index === 0 ? 'occupied' : 'vacant',\n    activationStatus: topo.index === 0 ? 'active' : null,\n    occupiedAt: topo.index === 0 ? createdAt : null,")
text = text.replace(
"position.status = 'vacant';\n        position.occupiedAt = null;",
"position.status = 'vacant';\n        position.activationStatus = null;\n        position.occupiedAt = null;")
text = text.replace(
"currentPosition.status = 'vacant';\n    currentPosition.occupiedAt = null;",
"currentPosition.status = 'vacant';\n    currentPosition.activationStatus = null;\n    currentPosition.occupiedAt = null;")
text = text.replace(
"targetPosition.status = 'occupied';\n  targetPosition.occupiedAt = now;",
"targetPosition.status = 'occupied';\n  targetPosition.activationStatus = 'active';\n  targetPosition.occupiedAt = now;")
text = text.replace(
"position.status = 'vacant';\n  position.occupiedAt = null;",
"position.status = 'vacant';\n  position.activationStatus = null;\n  position.occupiedAt = null;")
write(path, text)

# 5. Game engine: reserved vs active positions.
path = 'src/services/gameEngine.ts'
text = read(path)
if "function isActivatedPosition" not in text:
    text = replace_once(text,
"function nowIso(): string {\n  return new Date().toISOString();\n}\n",
"function nowIso(): string {\n  return new Date().toISOString();\n}\n\nfunction isActivatedPosition(position: TreePosition): boolean {\n  return position.status === 'occupied' && (position.activationStatus ?? 'active') === 'active';\n}\n",
    'game helper isActivatedPosition')
text = text.replace(
"targetPos.status = 'occupied';\n  targetPos.userId = user.id;",
"targetPos.status = 'occupied';\n  targetPos.activationStatus = 'reserved';\n  targetPos.userId = user.id;", 1)
# In strengthenTronco: mark existing reserved position active after approved/legacy strengthening.
if "existingPosition.activationStatus = 'active';" not in text:
    text = replace_once(text,
"  if (alreadyInTree && existingPosition) {\n    const nextAuditId = Math.max(0, ...state.auditLog.map(a => a.id)) + 1;",
"  if (alreadyInTree && existingPosition) {\n    existingPosition.activationStatus = 'active';\n    const activeCount = tree.positions.filter(isActivatedPosition).length;\n    if (activeCount === 15) {\n      const splitRes = splitTreeIfComplete(state, tree.id);\n      if (splitRes.success) {\n        return { success: true, state: splitRes.state, result: { positionIndex: existingPosition.index, bifurcated: true, newTrees: splitRes.result?.newTrees || [] } };\n      }\n    }\n    const nextAuditId = Math.max(0, ...state.auditLog.map(a => a.id)) + 1;",
    'game strengthen existing active')
# In strengthenTronco direct path, force active.
text = text.replace(
"targetPos.status = 'occupied';\n  targetPos.userId = user.id;",
"targetPos.status = 'occupied';\n  targetPos.activationStatus = 'active';\n  targetPos.userId = user.id;", 1)
text = text.replace(
"const occupiedCount = tree.positions.filter(p => p.status === 'occupied').length;",
"const occupiedCount = tree.positions.filter(isActivatedPosition).length;")
text = text.replace(
"const occupiedCount = mother.positions.filter(p => p.status === 'occupied').length;",
"const occupiedCount = mother.positions.filter(isActivatedPosition).length;")
text = text.replace(
"status: 'occupied',\n            occupiedAt: now,",
"status: 'occupied',\n            activationStatus: 'active',\n            occupiedAt: now,")
text = text.replace(
"status: 'vacant',\n        occupiedAt: null,",
"status: 'vacant',\n        activationStatus: null,\n        occupiedAt: null,")
write(path, text)

# 6. Backend actions: request/approve/reject activation.
path = 'server/actions.ts'
text = read(path)
text = text.replace(
"import { ActionResult, createParticipant, reserveTreeEntry, strengthenTronco, transferSeeds, validateReferral } from '../src/services/gameEngine';",
"import { ActionResult, createParticipant, reserveTreeEntry, strengthenTronco, transferSeeds, validateReferral, splitTreeIfComplete } from '../src/services/gameEngine';")
if "approve_activation_request" not in text:
    text = replace_once(text,
"  z.object({ action: z.literal('update_pix'), params: z.object({ holderName: pixHolderSchema, keyType: pixKeyTypeSchema, key: pixKeySchema }).strict() }),\n  z.object({ action: z.literal('clear_pix'), params: z.object({}).strict() }),",
"  z.object({ action: z.literal('update_pix'), params: z.object({ holderName: pixHolderSchema, keyType: pixKeyTypeSchema, key: pixKeySchema }).strict() }),\n  z.object({ action: z.literal('clear_pix'), params: z.object({}).strict() }),\n  z.object({ action: z.literal('request_activation'), params: z.object({ treeId: id }).strict() }),\n  z.object({ action: z.literal('approve_activation_request'), params: z.object({ requestId: id }).strict() }),\n  z.object({ action: z.literal('reject_activation_request'), params: z.object({ requestId: id, reason: z.string().trim().max(300).optional() }).strict() }),",
    'actions schema activation')
if "function nextLocalId" not in text:
    helper = r'''
function nextLocalId(items: Array<{ id: number }> | undefined): number {
  return Math.max(0, ...(items || []).map(item => item.id)) + 1;
}

function pixTypeLabel(type: string | null | undefined): string {
  if (type === 'phone') return 'Telefone';
  if (type === 'email') return 'E-mail';
  return 'Aleatória';
}

function ensureActivationRequests(state: GameDatabaseState) {
  return (state.activationRequests ??= []);
}
'''
    text = replace_once(text, "export function applyAction(state: GameDatabaseState, user: User, input: z.infer<typeof actionSchema>, key: string): ActionResult {", helper + "\nexport function applyAction(state: GameDatabaseState, user: User, input: z.infer<typeof actionSchema>, key: string): ActionResult {", 'actions helper insert')
text = text.replace(
"if (!['reserve_tree_entry', 'strengthen_tronco', 'transfer_seeds', 'update_pix', 'clear_pix'].includes(input.action) && user.role !== 'admin')",
"if (!['reserve_tree_entry', 'strengthen_tronco', 'transfer_seeds', 'update_pix', 'clear_pix', 'request_activation', 'approve_activation_request', 'reject_activation_request'].includes(input.action) && user.role !== 'admin')")
if "case 'request_activation':" not in text:
    activation_cases = r'''    case 'request_activation': {
      if (user.role === 'admin') throw new HttpError(403, 'Coordenador não participa deste fluxo.');
      const next = structuredClone(state);
      const requests = ensureActivationRequests(next);
      const tree = next.trees.find(t => t.id === input.params.treeId && t.status === 'active');
      if (!tree) return { success: false, state, error: 'Árvore ativa não encontrada.' };
      const position = tree.positions.find(p => p.userId === user.id && p.status === 'occupied');
      if (!position) return { success: false, state, error: 'Reserve sua vaga antes de solicitar ativação.' };
      if ((position.activationStatus ?? 'active') === 'active') return { success: false, state, error: 'Sua vaga já está ativada.' };
      const requester = next.users.find(u => u.id === user.id && u.status === 'active');
      const tronco = next.users.find(u => u.id === tree.troncoUserId && u.status === 'active');
      if (!requester || !tronco) return { success: false, state, error: 'Participante ou tronco não encontrado.' };
      if (!tronco.pixHolderName || !tronco.pixKeyType || !tronco.pixKey) {
        return { success: false, state, error: 'O tronco ainda não cadastrou uma chave Pix para ativação.' };
      }
      const pending = requests.find(r => r.requesterUserId === requester.id && r.treeId === tree.id && r.status === 'pending');
      if (pending) return { success: true, state: next, result: { request: pending, alreadyPending: true } };
      const category = next.config.categories.find(c => c.id === tree.categoryId);
      const amount = category?.tokenRequirement || next.config.transferAmount || 25;
      const message = `Eu, @${requester.username}, acabei de fazer a minha doação para você e preciso da minha ativação.`;
      const request = {
        id: nextLocalId(requests),
        requesterUserId: requester.id,
        troncoUserId: tronco.id,
        treeId: tree.id,
        positionIndex: position.index,
        amount,
        status: 'pending' as const,
        requesterUsername: requester.username,
        troncoUsername: tronco.username,
        whatsappMessage: message,
        createdAt: new Date().toISOString(),
        decidedAt: null,
        decisionNote: null
      };
      requests.push(request);
      next.auditLog.push({
        id: nextLocalId(next.auditLog),
        actorUserId: requester.id,
        actorUsername: requester.username,
        action: 'PIX_ACTIVATION_REQUESTED',
        entity: 'activation_request',
        entityId: request.id,
        metadata: { idempotencyKey: key, treeId: tree.id, positionIndex: position.index, troncoUserId: tronco.id, amount },
        createdAt: request.createdAt
      });
      return { success: true, state: next, result: { request, troncoPix: { holderName: tronco.pixHolderName, keyType: tronco.pixKeyType, key: tronco.pixKey, keyTypeLabel: pixTypeLabel(tronco.pixKeyType) }, whatsappMessage: message } };
    }
    case 'approve_activation_request': {
      const next = structuredClone(state);
      const requests = ensureActivationRequests(next);
      const request = requests.find(r => r.id === input.params.requestId);
      if (!request || request.status !== 'pending') return { success: false, state, error: 'Solicitação pendente não encontrada.' };
      if (user.role !== 'admin' && request.troncoUserId !== user.id) throw new HttpError(403, 'Somente o tronco desta árvore pode aprovar a ativação.');
      const tree = next.trees.find(t => t.id === request.treeId && t.status === 'active');
      const requester = next.users.find(u => u.id === request.requesterUserId && u.status === 'active');
      const tronco = next.users.find(u => u.id === request.troncoUserId && u.status === 'active');
      if (!tree || !requester || !tronco) return { success: false, state, error: 'Árvore, participante ou tronco não encontrado.' };
      const position = tree.positions.find(p => p.index === request.positionIndex && p.userId === requester.id && p.status === 'occupied');
      if (!position) return { success: false, state, error: 'A posição reservada não foi encontrada.' };
      if ((position.activationStatus ?? 'active') === 'active') return { success: false, state, error: 'Esta posição já está ativada.' };
      const fromWallet = next.wallets.find(w => w.userId === requester.id);
      const toWallet = next.wallets.find(w => w.userId === tronco.id);
      if (!fromWallet || fromWallet.balance < request.amount) return { success: false, state, error: 'Saldo de sementes insuficiente para ativação.' };
      if (!toWallet) return { success: false, state, error: 'Carteira do tronco não encontrada.' };
      const now = new Date().toISOString();
      fromWallet.balance -= request.amount;
      fromWallet.updatedAt = now;
      toWallet.balance += request.amount;
      toWallet.updatedAt = now;
      position.activationStatus = 'active';
      requester.updatedAt = now;
      request.status = 'approved';
      request.decidedAt = now;
      request.decisionNote = 'Ativação aprovada pelo tronco.';
      next.ledger.push({
        id: nextLocalId(next.ledger),
        type: 'FORTALECIMENTO_TRONCO',
        fromUserId: requester.id,
        toUserId: tronco.id,
        treeId: tree.id,
        amount: request.amount,
        reason: `Ativação Pix confirmada pelo tronco: posição #${position.index} na Árvore ${tree.treeCode}`,
        idempotencyKey: key,
        fromUsername: requester.username,
        toUsername: tronco.username,
        createdAt: now
      });
      next.auditLog.push({
        id: nextLocalId(next.auditLog),
        actorUserId: user.id,
        actorUsername: user.username,
        action: 'PIX_ACTIVATION_APPROVED',
        entity: 'activation_request',
        entityId: request.id,
        metadata: { idempotencyKey: key, treeId: tree.id, requesterUserId: requester.id, troncoUserId: tronco.id, amount: request.amount },
        createdAt: now
      });
      const activeCount = tree.positions.filter(p => p.status === 'occupied' && (p.activationStatus ?? 'active') === 'active').length;
      if (activeCount === 15) {
        const split = splitTreeIfComplete(next, tree.id);
        if (split.success) return { success: true, state: split.state, result: { requestId: request.id, status: 'approved', bifurcated: true, newTrees: split.result?.newTrees || [] } };
      }
      return { success: true, state: next, result: { requestId: request.id, status: 'approved', bifurcated: false } };
    }
    case 'reject_activation_request': {
      const next = structuredClone(state);
      const requests = ensureActivationRequests(next);
      const request = requests.find(r => r.id === input.params.requestId);
      if (!request || request.status !== 'pending') return { success: false, state, error: 'Solicitação pendente não encontrada.' };
      if (user.role !== 'admin' && request.troncoUserId !== user.id) throw new HttpError(403, 'Somente o tronco desta árvore pode recusar a ativação.');
      const now = new Date().toISOString();
      request.status = 'rejected';
      request.decidedAt = now;
      request.decisionNote = input.params.reason || 'Ativação recusada pelo tronco.';
      next.auditLog.push({
        id: nextLocalId(next.auditLog),
        actorUserId: user.id,
        actorUsername: user.username,
        action: 'PIX_ACTIVATION_REJECTED',
        entity: 'activation_request',
        entityId: request.id,
        metadata: { idempotencyKey: key, treeId: request.treeId, requesterUserId: request.requesterUserId, reason: request.decisionNote },
        createdAt: now
      });
      return { success: true, state: next, result: { requestId: request.id, status: 'rejected' } };
    }
'''
    text = replace_once(text,
"    case 'assign_tree_position': return assignTreePositionByAdmin(state, { ...input.params, actor, idempotencyKey: key });",
activation_cases + "    case 'assign_tree_position': return assignTreePositionByAdmin(state, { ...input.params, actor, idempotencyKey: key });",
    'actions activation cases')
text = text.replace(
"users: user ? state.users.filter(u => ids.has(u.id)).map(({ githubActor, ...u }) => u) : [],\n    wallets: state.wallets.filter(w => w.userId === user?.id),\n    referrals: state.referrals.filter(r => r.referrerUserId === user?.id),\n    ledger: state.ledger.filter(l => l.toUserId === user?.id || l.fromUserId === user?.id), auditLog: [] };",
"users: user ? state.users.filter(u => ids.has(u.id)).map(({ githubActor, ...u }) => u) : [],\n    wallets: state.wallets.filter(w => w.userId === user?.id),\n    referrals: state.referrals.filter(r => r.referrerUserId === user?.id),\n    ledger: state.ledger.filter(l => l.toUserId === user?.id || l.fromUserId === user?.id),\n    activationRequests: state.activationRequests?.filter(r => r.requesterUserId === user?.id || r.troncoUserId === user?.id) || [],\n    auditLog: [] };")
write(path, text)

# 7. Frontend data store.
path = 'src/services/dataStore.ts'
text = read(path)
if "requestActivationAction" not in text:
    text = replace_once(text,
"  async strengthenTroncoAction(_userId: number, treeId: number) {\n    return apiMutation('/actions', { action: 'strengthen_tronco', params: { treeId } });\n  }",
"  async strengthenTroncoAction(_userId: number, treeId: number) {\n    return apiMutation('/actions', { action: 'strengthen_tronco', params: { treeId } });\n  }\n  async requestActivationAction(treeId: number) {\n    return apiMutation('/actions', { action: 'request_activation', params: { treeId } });\n  }\n  async approveActivationRequestAction(requestId: number) {\n    return apiMutation('/actions', { action: 'approve_activation_request', params: { requestId } });\n  }\n  async rejectActivationRequestAction(requestId: number, reason?: string) {\n    return apiMutation('/actions', { action: 'reject_activation_request', params: { requestId, reason } });\n  }",
    'dataStore activation methods')
text = text.replace(
"status: p.status,\n        occupied_at: p.occupiedAt,",
"status: p.status,\n        activation_status: p.activationStatus || (p.status === 'occupied' ? 'active' : null),\n        occupied_at: p.occupiedAt,")
if "activation_requests" not in text:
    text = replace_once(text,
"      audit: formattedAudit,\n      categories: this.state.config.categories.map(c => ({",
"      audit: formattedAudit,\n      activation_requests: (this.state.activationRequests || []).map(r => ({\n        id: r.id,\n        requester_user_id: r.requesterUserId,\n        tronco_user_id: r.troncoUserId,\n        tree_id: r.treeId,\n        position_index: r.positionIndex,\n        amount: r.amount,\n        status: r.status,\n        requester_username: r.requesterUsername,\n        tronco_username: r.troncoUsername,\n        whatsapp_message: r.whatsappMessage,\n        created_at: r.createdAt,\n        decided_at: r.decidedAt,\n        decision_note: r.decisionNote\n      })),\n      categories: this.state.config.categories.map(c => ({",
    'dataStore activation view')
write(path, text)

# 8. App UI.
path = 'src/App.tsx'
text = read(path)
if "activation_status" not in text.split('interface Position', 1)[1].split('interface User', 1)[0]:
    text = replace_once(text,
"  status: 'vacant' | 'occupied';\n  username?: string;",
"  status: 'vacant' | 'occupied';\n  activation_status?: 'reserved' | 'active' | null;\n  username?: string;",
    'App position activation status')
if "interface ActivationRequest" not in text:
    text = replace_once(text,
"interface Setting {\n  id: number;\n  setting_key: string;\n  setting_value: string;\n  description: string;\n}\n",
"interface Setting {\n  id: number;\n  setting_key: string;\n  setting_value: string;\n  description: string;\n}\n\ninterface ActivationRequest {\n  id: number;\n  requester_user_id: number;\n  tronco_user_id: number;\n  tree_id: number;\n  position_index: number;\n  amount: number;\n  status: 'pending' | 'approved' | 'rejected';\n  requester_username: string;\n  tronco_username: string;\n  whatsapp_message?: string | null;\n  created_at: string;\n  decided_at?: string | null;\n  decision_note?: string | null;\n}\n",
    'App activation request interface')
if "activationModalData" not in text:
    text = replace_once(text,
"  const [pixKey, setPixKey] = useState<string>('');\n  const [pixSaving, setPixSaving] = useState<boolean>(false);",
"  const [pixKey, setPixKey] = useState<string>('');\n  const [pixSaving, setPixSaving] = useState<boolean>(false);\n  const [activationModalData, setActivationModalData] = useState<any | null>(null);\n  const [activationRequestLoading, setActivationRequestLoading] = useState<boolean>(false);",
    'App activation modal states')
if "handleOpenActivationModal" not in text:
    helper = r'''
  const pixTypeLabel = (type?: string | null) => {
    if (type === 'phone') return 'Telefone';
    if (type === 'email') return 'E-mail';
    return 'Aleatória';
  };

  const buildWhatsappUrl = (rawPhone: string | null | undefined, message: string) => {
    const digits = String(rawPhone || '').replace(/\D/g, '');
    if (!digits) return null;
    const phone = digits.length <= 11 ? `55${digits}` : digits;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const handleOpenActivationModal = () => {
    if (!currentUser || !memberTree) return;
    const tronco = allUsers.find(u => u.id === memberTree.tronco_user_id);
    if (!tronco) {
      showToast('Tronco não encontrado nesta árvore.');
      return;
    }
    if (!tronco.pixHolderName || !tronco.pixKey || !tronco.pixKeyType) {
      showToast('O tronco ainda não cadastrou uma chave Pix para ativação.');
      return;
    }
    const amount = memberTree.token_requirement || 25;
    const message = `Eu, @${currentUser.username}, acabei de fazer a minha doação para você e preciso da minha ativação.`;
    setActivationModalData({
      treeId: memberTree.id,
      amount,
      tronco,
      message,
      whatsappUrl: tronco.pixKeyType === 'phone' ? buildWhatsappUrl(tronco.pixKey, message) : null
    });
  };

  const handleConfirmPixDonation = async () => {
    if (!activationModalData) return;
    setActivationRequestLoading(true);
    try {
      const res = await dataStore.requestActivationAction(activationModalData.treeId);
      if (res.success) {
        await fetchState(true);
        showToast('Solicitação de ativação enviada ao tronco.');
        const url = activationModalData.whatsappUrl;
        setActivationModalData(null);
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        showToast('Erro: ' + (res.error || 'Não foi possível solicitar ativação.'));
      }
    } catch (e: any) {
      showToast('Erro: ' + e.message);
    } finally {
      setActivationRequestLoading(false);
    }
  };

  const handleApproveActivationRequest = async (requestId: number) => {
    setActivationRequestLoading(true);
    try {
      const res = await dataStore.approveActivationRequestAction(requestId);
      if (res.success) {
        await fetchState(true);
        showToast('Ativação aprovada. A posição ficou verde.');
      } else {
        showToast('Erro: ' + (res.error || 'Não foi possível aprovar.'));
      }
    } catch (e: any) {
      showToast('Erro: ' + e.message);
    } finally {
      setActivationRequestLoading(false);
    }
  };

  const handleRejectActivationRequest = async (requestId: number) => {
    setActivationRequestLoading(true);
    try {
      const res = await dataStore.rejectActivationRequestAction(requestId, 'Ativação recusada pelo tronco.');
      if (res.success) {
        await fetchState(true);
        showToast('Solicitação recusada.');
      } else {
        showToast('Erro: ' + (res.error || 'Não foi possível recusar.'));
      }
    } catch (e: any) {
      showToast('Erro: ' + e.message);
    } finally {
      setActivationRequestLoading(false);
    }
  };
'''
    text = replace_once(text,
"  const handleCreateTree = async (e: React.FormEvent) => {",
helper + "\nconst handleCreateTree = async (e: React.FormEvent) => {",
    'App activation handlers')
# Make old strengthen button open the Pix activation modal instead of direct legacy transfer.
text = replace_once(text,
"  const handleStrengthenTronco = async (userId: number, treeId: number) => {\n    if (currentUser?.role === 'admin') {\n      showToast('Ação bloqueada: o coordenador não deve fortalecer tronco pelo painel de membro. Use Organização > Árvores > Nova Árvore.');\n      return;\n    }\n\n    setActivatingTronco(true);\n    try {\n      const res = await dataStore.strengthenTroncoAction(userId, treeId);\n      if (res.success && res.result) {\n        await fetchState(true);\n        showToast('25 sementes enviadas ao tronco.');\n      } else {\n        showToast('Falha: ' + (res.error || 'Não foi possível completar o fortalecimento.'));\n      }\n    } catch (e: any) {\n      showToast('Erro: ' + e.message);\n    } finally {\n      setActivatingTronco(false);\n    }\n  };",
"  const handleStrengthenTronco = async (_userId: number, _treeId: number) => {\n    if (currentUser?.role === 'admin') {\n      showToast('Ação bloqueada: coordenador não participa deste fluxo.');\n      return;\n    }\n    handleOpenActivationModal();\n  };",
    'App replace strengthen handler')
if "allActivationRequests" not in text:
    text = replace_once(text,
"  const allLinks: ReferralLink[] = systemState?.referral_links || [];",
"  const allLinks: ReferralLink[] = systemState?.referral_links || [];\n  const allActivationRequests: ActivationRequest[] = systemState?.activation_requests || [];",
    'App allActivationRequests helper')
if "pendingTroncoRequests" not in text:
    text = replace_once(text,
"  const isUserPositioned = currentUser && currentUser.current_position_index !== null && currentUser.current_position_index !== undefined;",
"  const isUserPositioned = currentUser && currentUser.current_position_index !== null && currentUser.current_position_index !== undefined;\n  const currentUserTreePosition = currentUser ? memberPositions.find(p => p.user_id === currentUser.id && p.status === 'occupied') : null;\n  const isCurrentUserReserved = Boolean(currentUserTreePosition && currentUserTreePosition.activation_status === 'reserved');\n  const isCurrentUserActivated = Boolean(currentUserTreePosition && currentUserTreePosition.activation_status !== 'reserved');\n  const myPendingActivationRequest = currentUser ? allActivationRequests.find(r => r.requester_user_id === currentUser.id && r.tree_id === memberTreeId && r.status === 'pending') : null;\n  const pendingTroncoRequests = currentUser ? allActivationRequests.filter(r => r.tronco_user_id === currentUser.id && r.status === 'pending') : [];",
    'App activation request derived helpers')
# Model 1 colors: introduce isReserved and distinguish red/green.
text = text.replace("const isOcc = p.status === 'occupied';\n            const style =", "const isOcc = p.status === 'occupied';\n            const isReserved = isOcc && p.activation_status === 'reserved';\n            const style =", 1)
text = text.replace(
"isUser\n                    ? 'bg-rose-950 border-2 border-rose-400 text-white ring-2 ring-rose-500/50'\n                    : isOcc\n                    ? 'bg-slate-900 border border-emerald-500/60 text-slate-100'",
"isUser\n                    ? isReserved ? 'bg-rose-950 border-2 border-rose-400 text-white ring-2 ring-rose-500/50' : 'bg-emerald-950 border-2 border-emerald-400 text-white ring-2 ring-emerald-500/50'\n                    : isReserved\n                    ? 'bg-rose-950 border border-rose-500/70 text-rose-200'\n                    : isOcc\n                    ? 'bg-slate-900 border border-emerald-500/60 text-slate-100'", 1)
text = text.replace("const isOcc = p.status === 'occupied';\n            let posStyle", "const isOcc = p.status === 'occupied';\n            const isReserved = isOcc && p.activation_status === 'reserved';\n            let posStyle", 1)
text = text.replace(
"isUser\n                    ? 'bg-emerald-950 border-2 border-emerald-400 text-emerald-200'\n                    : isOcc\n                    ? 'bg-slate-900 border border-slate-700 text-slate-200'",
"isUser\n                    ? isReserved ? 'bg-rose-950 border-2 border-rose-400 text-rose-100' : 'bg-emerald-950 border-2 border-emerald-400 text-emerald-200'\n                    : isReserved\n                    ? 'bg-rose-950 border border-rose-700 text-rose-200'\n                    : isOcc\n                    ? 'bg-slate-900 border border-slate-700 text-slate-200'", 1)
text = text.replace("const isOcc = p.status === 'occupied';\n            const angles", "const isOcc = p.status === 'occupied';\n            const isReserved = isOcc && p.activation_status === 'reserved';\n            const angles", 1)
text = text.replace(
"isUser\n                    ? 'bg-emerald-900 border-2 border-emerald-400 text-white font-bold'\n                    : isOcc\n                    ? 'bg-slate-900 border border-emerald-500/50 text-emerald-300'",
"isUser\n                    ? isReserved ? 'bg-rose-900 border-2 border-rose-400 text-white font-bold' : 'bg-emerald-900 border-2 border-emerald-400 text-white font-bold'\n                    : isReserved\n                    ? 'bg-rose-950 border border-rose-500/70 text-rose-200'\n                    : isOcc\n                    ? 'bg-slate-900 border border-emerald-500/50 text-emerald-300'", 1)
text = text.replace(
"<span>Ocupado</span>\n          </div>\n          <div className=\"flex items-center gap-1.5\">",
"<span>Ativado</span>\n          </div>\n          <div className=\"flex items-center gap-1.5\">\n            <span className=\"w-2.5 h-2.5 rounded-full bg-rose-500\"></span>\n            <span>Reservado</span>\n          </div>\n          <div className=\"flex items-center gap-1.5\">", 1)
# Insert tronco notification card in member tree tab after tree overview card.
if "pendingTroncoRequests.map" not in text:
    notification = r'''

                  {pendingTroncoRequests.length > 0 && (
                    <div className="bg-amber-950/40 border border-amber-500/50 rounded-2xl p-3.5 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-300 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4" />
                          <span>Solicitações de ativação</span>
                        </span>
                        <span className="text-[10px] font-mono text-amber-200">{pendingTroncoRequests.length} pendente(s)</span>
                      </div>
                      <div className="space-y-2">
                        {pendingTroncoRequests.map(request => (
                          <div key={request.id} className="p-3 bg-slate-950 border border-amber-900/70 rounded-xl space-y-2">
                            <div className="text-slate-200 leading-relaxed">
                              Você recebeu uma solicitação de ativação de <strong>@{request.requester_username}</strong>.
                            </div>
                            <div className="text-[11px] text-slate-400">
                              @{request.requester_username} informou que realizou a doação. Deseja ativar?
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                disabled={activationRequestLoading}
                                onClick={() => handleApproveActivationRequest(request.id)}
                                className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold"
                              >
                                Sim, ativar
                              </button>
                              <button
                                type="button"
                                disabled={activationRequestLoading}
                                onClick={() => handleRejectActivationRequest(request.id)}
                                className="py-2 rounded-xl bg-rose-950 hover:bg-rose-900 disabled:opacity-50 border border-rose-800 text-rose-200 font-bold"
                              >
                                Não, recusar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
'''
    text = replace_once(text,
"                  {/* CRUCIAL GAME MECHANIC CARD:",
notification + "\n                  {/* CRUCIAL GAME MECHANIC CARD:",
    'App insert tronco notifications')
# Update positioned status panel wording and pending request notice.
text = text.replace("<span className=\"font-bold text-rose-300\">Vaga reservada na árvore:</span>", "<span className={`font-bold ${isCurrentUserReserved ? 'text-rose-300' : 'text-emerald-300'}`}>{isCurrentUserReserved ? 'Vaga reservada na árvore:' : 'Vaga ativada na árvore:'}</span>")
text = text.replace("RESERVADA\n                        </span>", "{isCurrentUserReserved ? 'RESERVADA' : 'ATIVADA'}\n                        </span>", 1)
text = text.replace("<div className=\"font-bold text-rose-300\">− 25 Sementes</div>\n                        <div className=\"text-slate-300\">Sua vaga na árvore está reservada.</div>", "<div className={`font-bold ${isCurrentUserReserved ? 'text-rose-300' : 'text-emerald-300'}`}>{isCurrentUserReserved ? '− 25 Sementes' : '✓ Ativado'}</div>\n                        <div className=\"text-slate-300\">{isCurrentUserReserved ? 'Sua vaga na árvore está reservada. Envie a solicitação Pix para ativar.' : 'Sua vaga está ativada no projeto.'}</div>")
text = text.replace("{currentUser.balance >= 25 && (\n                          <button", "{isCurrentUserReserved && !myPendingActivationRequest && currentUser.balance >= 25 && (\n                          <button", 1)
text = text.replace("<span>Enviar 25 sementes ao tronco</span>", "<span>Ativar 25 sementes via Pix</span>", 1)
if "myPendingActivationRequest" in text and "Aguardando confirmação do tronco" not in text:
    text = text.replace("                        {isCurrentUserReserved && !myPendingActivationRequest && currentUser.balance >= 25 && (", "                        {myPendingActivationRequest && (\n                          <div className=\"p-2 bg-amber-950/30 border border-amber-800 rounded-xl text-[11px] text-amber-200\">\n                            Aguardando confirmação do tronco para ativar sua posição.\n                          </div>\n                        )}\n                        {isCurrentUserReserved && !myPendingActivationRequest && currentUser.balance >= 25 && (", 1)
# Add activation modal near toast under main app header region before Dynamic View Content.
if "activationModalData &&" not in text:
    modal = r'''
        {activationModalData && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 space-y-4 shadow-2xl text-sm">
              <div className="space-y-1">
                <div className="text-lg font-black text-emerald-300">Ative suas 25 sementes</div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Para sua vaga florescer em definitivo no Arboris, faça a doação Pix ao tronco da sua árvore. Depois confirme para que o tronco libere sua ativação.
                </p>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 text-xs">
                <div><span className="text-slate-500">Tronco:</span> <strong className="text-slate-100">@{activationModalData.tronco.username}</strong></div>
                <div><span className="text-slate-500">Titular:</span> <strong className="text-slate-100">{activationModalData.tronco.pixHolderName}</strong></div>
                <div><span className="text-slate-500">Tipo:</span> <strong className="text-slate-100">{pixTypeLabel(activationModalData.tronco.pixKeyType)}</strong></div>
                <div className="space-y-1">
                  <span className="text-slate-500">Chave Pix:</span>
                  <div className="flex items-center gap-2">
                    <input readOnly value={activationModalData.tronco.pixKey} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs" />
                    <button type="button" onClick={() => navigator.clipboard.writeText(activationModalData.tronco.pixKey)} className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold">
                      Copiar
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-2xl text-xs text-emerald-200 leading-relaxed">
                Ao clicar em “Já realizei minha doação”, uma solicitação será enviada ao tronco. Sua posição permanecerá vermelha até ele confirmar; depois ficará verde.
              </div>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  disabled={activationRequestLoading}
                  onClick={handleConfirmPixDonation}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black"
                >
                  Já realizei minha doação
                </button>
                <button type="button" onClick={() => setActivationModalData(null)} className="w-full py-2 rounded-xl bg-slate-800 text-slate-300 font-bold">
                  Voltar
                </button>
              </div>
            </div>
          </div>
        )}
'''
    text = replace_once(text,
"        {/* Dynamic View Content */}",
modal + "\n        {/* Dynamic View Content */}",
    'App activation modal insert')
write(path, text)

print('Pix activation flow patch applied.')
