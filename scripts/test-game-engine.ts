import fs from 'fs';
import path from 'path';
import {
  GameDatabaseState,
  GameConfig,
  User,
  Wallet,
  Tree,
  Referral,
  LedgerEntry,
  AuditLogEntry
} from '../src/types/game';
import {
  createParticipant,
  strengthenTronco,
  validateReferral,
  transferSeeds,
  splitTreeIfComplete,
  validateIdempotency,
  recalculateWallet
} from '../src/services/gameEngine';

function loadJsonState(): GameDatabaseState {
  const dataDir = path.resolve(process.cwd(), 'data');
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

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}`);
    failed++;
  }
}

console.log('====================================================');
console.log('  ARBORIS STATIC JSON GAME ENGINE - SUITE DE TESTES');
console.log('====================================================\n');

// TEST 4: Carregamento dos JSONs
console.log('TEST 4: Carregamento e validação dos arquivos JSON');
const initialState = loadJsonState();
assert(initialState.users.length >= 8, 'users.json carregado com participantes iniciais');
assert(initialState.trees.length >= 1, 'trees.json carregado com árvore ativa');
assert(initialState.wallets.length >= 8, 'wallets.json carregado com carteiras');
assert(initialState.config.transferAmount === 25, 'config.json define valor de 25 sementes');
assert(initialState.referrals.length >= 1, 'referrals.json possui link de indicação');

// TEST 5: Validação de indicação e cadastro fictício
console.log('\nTEST 5: Validação de indicação e cadastro fictício');
const refCheck = validateReferral(initialState, 'maria');
assert(refCheck.valid === true, 'Indicador "maria" validado com sucesso');
assert(refCheck.tree?.id === 1, 'Árvore do indicador vinculada corretamente');

const regRes = createParticipant(initialState, {
  username: 'carlos_teste',
  name: 'Carlos Teste',
  indicadorUsername: 'maria',
  idempotencyKey: 'idemp_reg_carlos_1'
});
assert(regRes.success === true, 'Novo participante cadastrado com sucesso');
assert(regRes.result?.user.username === 'carlos_teste', 'Usuário criado com username correto');
assert(regRes.result?.user.currentPositionIndex === null, 'Participante entra fora do tabuleiro até fortalecer');

// TEST 6: Crédito inicial de sementes
console.log('\nTEST 6: Crédito inicial de sementes virtuais');
const stateAfterReg = regRes.state;
const newWallet = stateAfterReg.wallets.find(w => w.userId === regRes.result?.user.id);
assert(newWallet?.balance === 25, 'Participante recebeu 25 sementes virtuais gratuitas');
const initialLedger = stateAfterReg.ledger.find(l => l.toUserId === regRes.result?.user.id);
assert(initialLedger?.type === 'CONCESSAO_INICIAL_SEMENTES', 'Registro de concessão no ledger gravado');

// TEST 7: Débito e transferência de sementes (sem manipulação de amount pelo cliente)
console.log('\nTEST 7: Transferência de sementes');
const txRes = transferSeeds(stateAfterReg, {
  fromUserId: regRes.result!.user.id,
  toUserId: 2, // Maria
  treeId: 1,
  amount: 25,
  reason: 'Transferência teste',
  idempotencyKey: 'tx_teste_seeds_1'
});
assert(txRes.success === true, 'Transferência de 25 sementes executada');
assert(txRes.state.wallets.find(w => w.userId === regRes.result!.user.id)?.balance === 0, 'Saldo de quem enviou foi debitado');
assert(txRes.state.wallets.find(w => w.userId === 2)?.balance === 50, 'Saldo do destinatário foi creditado');

// TEST 8: Ocupação de posição na árvore (Strengthen Tronco)
console.log('\nTEST 8: Ocupação de posição externa na árvore (Posição #7)');
const entrant1 = createParticipant(initialState, {
  username: 'entrant_pos7',
  name: 'Entrante 7',
  indicadorUsername: 'maria',
  idempotencyKey: 'reg_entrant_7'
});
const strengthen1 = strengthenTronco(entrant1.state, {
  userId: entrant1.result!.user.id,
  treeId: 1,
  idempotencyKey: 'strengthen_entrant_7'
});
assert(strengthen1.success === true, 'Fortalecimento do tronco concluído com sucesso');
assert(strengthen1.result?.positionIndex === 7, 'Entrante ocupou a posição externa #7');
const treePos7 = strengthen1.state.trees[0].positions.find(p => p.index === 7);
assert(treePos7?.status === 'occupied' && treePos7.userId === entrant1.result!.user.id, 'Posição #7 está marcada como ocupada');

// TEST 9: Prevenção de operação duplicada (Idempotency)
console.log('\nTEST 9: Prevenção de operação duplicada (Idempotency)');
const duplicateStrengthen = strengthenTronco(strengthen1.state, {
  userId: entrant1.result!.user.id,
  treeId: 1,
  idempotencyKey: 'strengthen_entrant_7' // Mesma chave!
});
assert(duplicateStrengthen.success === false, 'Operação com chave repetida rejeitada');
assert(duplicateStrengthen.error?.includes('já') === true, 'Mensagem clara de duplicidade');

// TEST 10 & 11: Simulação de árvore completa (15/15) e Bifurcação 1-2-4-8
console.log('\nTEST 10 & 11: Preenchimento completo (15/15) e Bifurcação em 2 árvores filhas');
let currState = strengthen1.state;

// Posições 8 a 14 (7 posições restantes para completar 15)
for (let i = 8; i <= 14; i++) {
  const ent = createParticipant(currState, {
    username: `entrant_pos${i}`,
    name: `Entrante ${i}`,
    indicadorUsername: 'maria',
    idempotencyKey: `reg_entrant_${i}`
  });
  const st = strengthenTronco(ent.state, {
    userId: ent.result!.user.id,
    treeId: 1,
    idempotencyKey: `strengthen_entrant_${i}`
  });

  if (i < 14) {
    assert(st.result?.bifurcated === false, `Posição #${i} ocupada, árvore permanece ativa`);
  } else {
    // 8º entrante externo (Posição 14 completa 15/15)
    assert(st.success === true, 'Transferência do 8º entrante executada com sucesso');
    assert(st.result?.bifurcated === true, 'Árvore atingiu 15/15 e disparou bifurcação');
    assert(st.result?.newTrees?.length === 2, 'Exatamente duas novas árvores filhas criadas');
  }
  currState = st.state;
}

// Validar estado pós-bifurcação
const motherTree = currState.trees.find(t => t.id === 1);
assert(motherTree?.status === 'completed', 'Árvore mãe marcada como "completed"');

const oldTroncoUser = currState.users.find(u => u.id === 2); // Maria
assert(oldTroncoUser?.currentTreeId === null, 'Antigo tronco desocupou o tabuleiro da árvore mãe');
assert(currState.wallets.find(w => w.userId === 2)?.balance === 225, 'Tronco recebeu as 8 contribuições de 25 sementes (25 inicial + 200 = 225)');

const leftChild = currState.trees.find(t => t.treeCode === 'ARB-TREE-25-001-L');
const rightChild = currState.trees.find(t => t.treeCode === 'ARB-TREE-25-001-R');
assert(leftChild !== undefined && rightChild !== undefined, 'Árvores ARB-TREE-25-001-L e ARB-TREE-25-001-R existem');
assert(leftChild?.status === 'active' && rightChild?.status === 'active', 'Ambas as filhas estão ativas');

// Validar novos Troncos das filhas (antigos pos 1 e pos 2)
assert(leftChild?.troncoUserId === 3, 'Novo Tronco da Filha Esquerda é João Silva (antiga pos 1)');
assert(rightChild?.troncoUserId === 4, 'Novo Tronco da Filha Direita é Ana Souza (antiga pos 2)');

// Validar vagas externas nas filhas (posições 7 a 14 devem estar vagas)
const vacantCountLeft = leftChild!.positions.filter(p => p.index >= 7 && p.status === 'vacant').length;
const vacantCountRight = rightChild!.positions.filter(p => p.index >= 7 && p.status === 'vacant').length;
assert(vacantCountLeft === 8, 'Filha Esquerda possui exatamente 8 vagas abertas na base');
assert(vacantCountRight === 8, 'Filha Direita possui exatamente 8 vagas abertas na base');

// Validar links criados para os novos troncos
const leftRef = currState.referrals.find(r => r.treeId === leftChild!.id);
const rightRef = currState.referrals.find(r => r.treeId === rightChild!.id);
assert(leftRef !== undefined && rightRef !== undefined, 'Novos links gerados para ambas as árvores filhas');

console.log('\n====================================================');
console.log(`RESULTADO FINAL: ${passed} testes aprovados, ${failed} falhas.`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
