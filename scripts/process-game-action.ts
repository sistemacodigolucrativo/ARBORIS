import fs from 'fs';
import path from 'path';
import { GameDatabaseState, User } from '../src/types/game';
import {
  createParticipant,
  strengthenTronco,
  transferSeeds
} from '../src/services/gameEngine';
import {
  archiveTreeByAdmin,
  assignTreePositionByAdmin,
  clearTreePositionByAdmin,
  createTreeByAdmin
} from '../src/services/adminGameEngine';

interface ActionPayload {
  action:
    | 'register_participant'
    | 'strengthen_tronco'
    | 'transfer_seeds'
    | 'create_tree'
    | 'archive_tree'
    | 'assign_tree_position'
    | 'clear_tree_position';
  params: any;
  idempotencyKey: string;
}

const dataDir = path.resolve(process.cwd(), 'data');
const publicDataDir = path.resolve(process.cwd(), 'public/data');

function loadState(): GameDatabaseState {
  return {
    config: JSON.parse(fs.readFileSync(path.join(dataDir, 'config.json'), 'utf8')),
    users: JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf8')),
    wallets: JSON.parse(fs.readFileSync(path.join(dataDir, 'wallets.json'), 'utf8')),
    trees: JSON.parse(fs.readFileSync(path.join(dataDir, 'trees.json'), 'utf8')),
    referrals: JSON.parse(fs.readFileSync(path.join(dataDir, 'referrals.json'), 'utf8')),
    ledger: JSON.parse(fs.readFileSync(path.join(dataDir, 'ledger.json'), 'utf8')),
    auditLog: JSON.parse(fs.readFileSync(path.join(dataDir, 'audit-log.json'), 'utf8'))
  };
}

function saveState(state: GameDatabaseState) {
  const files: Record<string, any> = {
    'config.json': state.config,
    'users.json': state.users,
    'wallets.json': state.wallets,
    'trees.json': state.trees,
    'referrals.json': state.referrals,
    'ledger.json': state.ledger,
    'audit-log.json': state.auditLog
  };

  for (const [file, content] of Object.entries(files)) {
    const formatted = JSON.stringify(content, null, 2) + '\n';
    fs.writeFileSync(path.join(dataDir, file), formatted, 'utf8');
    if (fs.existsSync(publicDataDir)) {
      fs.writeFileSync(path.join(publicDataDir, file), formatted, 'utf8');
    }
  }
}

function parseAllowedAdminActors(): string[] {
  return (process.env.ARBORIS_ADMIN_GITHUB_ACTORS || '')
    .split(',')
    .map(actor => actor.trim().toLowerCase())
    .filter(Boolean);
}

function resolveAdminActor(state: GameDatabaseState, requestActor: string | null): User {
  const allowedActors = parseAllowedAdminActors();
  if (requestActor && allowedActors.length > 0 && !allowedActors.includes(requestActor.toLowerCase())) {
    throw new Error(`Ator GitHub @${requestActor} não está autorizado para ações administrativas.`);
  }

  if (requestActor) {
    const boundAdmin = state.users.find(user =>
      user.role === 'admin'
      && user.status === 'active'
      && user.githubActor?.toLowerCase() === requestActor.toLowerCase()
    );
    if (boundAdmin) return boundAdmin;
  }

  const fallbackAdmin = state.users.find(user => user.role === 'admin' && user.status === 'active');
  if (!fallbackAdmin) {
    throw new Error('Nenhum admin ativo encontrado no JSON de usuários.');
  }

  if (requestActor && allowedActors.length === 0 && !fallbackAdmin.githubActor) {
    throw new Error('Ações administrativas exigem ARBORIS_ADMIN_GITHUB_ACTORS ou githubActor vinculado ao usuário admin.');
  }

  return fallbackAdmin;
}

async function main() {
  const payloadRaw = process.env.GAME_ACTION_PAYLOAD || process.argv[2];
  if (!payloadRaw) {
    console.error('ERRO: Nenhum payload de ação fornecido.');
    process.exit(1);
  }

  let payload: ActionPayload;
  try {
    payload = JSON.parse(payloadRaw);
  } catch (err: any) {
    console.error('ERRO: JSON de payload inválido:', err.message);
    process.exit(1);
  }

  if (!payload.idempotencyKey || typeof payload.idempotencyKey !== 'string') {
    console.error('ERRO: idempotencyKey obrigatória.');
    process.exit(1);
  }

  console.log(`[GitHub Actions Game Processor] Processando ação: ${payload.action}`);
  const state = loadState();
  const requestActor = process.env.GITHUB_REQUEST_ACTOR || process.env.GITHUB_ACTOR || null;

  let resultState: GameDatabaseState;
  let commitMessage = '';

  switch (payload.action) {
    case 'register_participant': {
      const res = createParticipant(state, {
        username: payload.params.username,
        name: payload.params.name,
        indicadorUsername: payload.params.indicadorUsername,
        githubActor: requestActor,
        idempotencyKey: payload.idempotencyKey
      });
      if (!res.success) {
        console.error(`ERRO: Validação falhou para cadastro: ${res.error}`);
        process.exit(1);
      }
      resultState = res.state;
      commitMessage = `[game-data] registrar participante @${res.result!.user.username} (Árvore #${res.result!.treeId})`;
      break;
    }

    case 'strengthen_tronco': {
      const targetUser = state.users.find(user => user.id === Number(payload.params.userId));
      if (targetUser?.githubActor && requestActor && targetUser.githubActor !== requestActor) {
        console.error(`ERRO: A conta GitHub @${requestActor} não pode movimentar o usuário @${targetUser.username}.`);
        process.exit(1);
      }

      const res = strengthenTronco(state, {
        userId: Number(payload.params.userId),
        treeId: Number(payload.params.treeId),
        idempotencyKey: payload.idempotencyKey
      });
      if (!res.success) {
        console.error(`ERRO: Validação falhou para fortalecimento: ${res.error}`);
        process.exit(1);
      }
      resultState = res.state;
      commitMessage = `[game-data] fortalecer tronco na Árvore #${payload.params.treeId} (Posição #${res.result!.positionIndex}${res.result!.bifurcated ? ' - BIFURCAÇÃO OCORRIDA' : ''})`;
      break;
    }

    case 'transfer_seeds': {
      const res = transferSeeds(state, {
        fromUserId: Number(payload.params.fromUserId),
        toUserId: Number(payload.params.toUserId),
        treeId: Number(payload.params.treeId),
        amount: Number(payload.params.amount),
        reason: payload.params.reason || 'Transferência recreativa',
        idempotencyKey: payload.idempotencyKey
      });
      if (!res.success) {
        console.error(`ERRO: Validação falhou para transferência: ${res.error}`);
        process.exit(1);
      }
      resultState = res.state;
      commitMessage = `[game-data] transferência de ${payload.params.amount} sementes entre usuários`;
      break;
    }

    case 'create_tree': {
      const admin = resolveAdminActor(state, requestActor);
      const res = createTreeByAdmin(state, {
        categoryId: Number(payload.params.categoryId),
        troncoUserId: Number(payload.params.troncoUserId),
        actor: { actorUserId: admin.id, actorUsername: admin.username, githubActor: requestActor },
        idempotencyKey: payload.idempotencyKey
      });
      if (!res.success) {
        console.error(`ERRO: Criação administrativa de árvore rejeitada: ${res.error}`);
        process.exit(1);
      }
      resultState = res.state;
      commitMessage = `[game-data] admin criou árvore ${res.result!.tree.treeCode}`;
      break;
    }

    case 'archive_tree': {
      const admin = resolveAdminActor(state, requestActor);
      const res = archiveTreeByAdmin(state, {
        treeId: Number(payload.params.treeId),
        reason: payload.params.reason,
        actor: { actorUserId: admin.id, actorUsername: admin.username, githubActor: requestActor },
        idempotencyKey: payload.idempotencyKey
      });
      if (!res.success) {
        console.error(`ERRO: Arquivamento administrativo rejeitado: ${res.error}`);
        process.exit(1);
      }
      resultState = res.state;
      commitMessage = `[game-data] admin arquivou árvore #${payload.params.treeId}`;
      break;
    }

    case 'assign_tree_position': {
      const admin = resolveAdminActor(state, requestActor);
      const res = assignTreePositionByAdmin(state, {
        treeId: Number(payload.params.treeId),
        positionIndex: Number(payload.params.positionIndex),
        userId: Number(payload.params.userId),
        actor: { actorUserId: admin.id, actorUsername: admin.username, githubActor: requestActor },
        idempotencyKey: payload.idempotencyKey
      });
      if (!res.success) {
        console.error(`ERRO: Atribuição administrativa de posição rejeitada: ${res.error}`);
        process.exit(1);
      }
      resultState = res.state;
      commitMessage = `[game-data] admin atribuiu usuário #${payload.params.userId} à árvore #${payload.params.treeId} posição #${payload.params.positionIndex}`;
      break;
    }

    case 'clear_tree_position': {
      const admin = resolveAdminActor(state, requestActor);
      const res = clearTreePositionByAdmin(state, {
        treeId: Number(payload.params.treeId),
        positionIndex: Number(payload.params.positionIndex),
        actor: { actorUserId: admin.id, actorUsername: admin.username, githubActor: requestActor },
        idempotencyKey: payload.idempotencyKey
      });
      if (!res.success) {
        console.error(`ERRO: Liberação administrativa de posição rejeitada: ${res.error}`);
        process.exit(1);
      }
      resultState = res.state;
      commitMessage = `[game-data] admin liberou árvore #${payload.params.treeId} posição #${payload.params.positionIndex}`;
      break;
    }

    default:
      console.error(`Ação desconhecida: ${(payload as any).action}`);
      process.exit(1);
  }

  saveState(resultState);
  console.log(`✓ Ação concluída com sucesso: ${commitMessage}`);

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `commit_message=${commitMessage}\n`);
  }
}

main().catch(err => {
  console.error('Falha não tratada:', err);
  process.exit(1);
});
