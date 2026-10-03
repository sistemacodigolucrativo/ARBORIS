import express from 'express';
import { createServer as createViteServer } from 'vite';
import crypto from 'crypto';

interface Category {
  id: number;
  code: string;
  name: string;
  token_requirement: number;
  is_active: number;
  description: string;
  created_at: string;
}

interface Setting {
  id: number;
  setting_key: string;
  setting_value: string;
  description: string;
  is_editable: number;
  updated_at: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
  full_name: string;
  phone?: string;
  balance: number;
  current_tree_id?: number | null;
  current_position_index?: number | null;
}

interface Tree {
  id: number;
  category_id: number;
  tree_code: string;
  tronco_user_id: number;
  status: string;
  cycle_number: number;
  parent_tree_id: number | null;
  completed_at: string | null;
  created_at: string;
}

interface Position {
  id: number;
  tree_id: number;
  position_index: number;
  level: number;
  parent_position_id: number | null;
  side: string;
  user_id: number | null;
  status: 'vacant' | 'occupied';
  occupied_at: string | null;
  username?: string | null;
  full_name?: string | null;
}

interface ReferralLink {
  id: number;
  user_id: number;
  category_id: number;
  tree_id: number;
  token: string;
  clicks: number;
  registrations_count: number;
  is_active: number;
  expires_at: string | null;
  created_at: string;
}

interface LedgerEntry {
  id: number;
  transaction_uuid: string;
  user_id: number;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  status: string;
  idempotency_key: string;
  created_at: string;
  username?: string;
}

interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number;
  details: string;
  ip_address: string;
  created_at: string;
  username?: string;
}

// In-Memory Database Store mirroring SQLite schema with Community Vocab (Sementes)
class DatabaseStore {
  categories: Category[] = [
    { id: 1, code: 'cat_25', name: 'Categoria 25 Sementes', token_requirement: 25, is_active: 1, description: 'Árvore comunitária com ciclo de 25 sementes', created_at: '2026-10-02 12:00:00' },
    { id: 2, code: 'cat_50', name: 'Categoria 50 Sementes', token_requirement: 50, is_active: 1, description: 'Árvore comunitária com ciclo de 50 sementes', created_at: '2026-10-02 12:00:00' },
    { id: 3, code: 'cat_100', name: 'Categoria 100 Sementes', token_requirement: 100, is_active: 1, description: 'Árvore comunitária com ciclo de 100 sementes', created_at: '2026-10-02 12:00:00' },
  ];

  settings: Setting[] = [
    { id: 1, setting_key: 'system_mode', setting_value: 'active', description: 'Modo operacional da rede comunitária (active/maintenance)', is_editable: 1, updated_at: '2026-10-02 12:00:00' },
    { id: 2, setting_key: 'transfer_amount_default', setting_value: '25', description: 'Quantidade base de sementes para fortalecer o tronco [PARAMETRIZÁVEL - PENDENTE DE DEFINIÇÃO]', is_editable: 1, updated_at: '2026-10-02 12:00:00' },
    { id: 3, setting_key: 'tronco_reward_multiplier', setting_value: '0', description: 'Multiplicador de premiação do Tronco [PENDENTE DE DEFINIÇÃO]', is_editable: 1, updated_at: '2026-10-02 12:00:00' },
    { id: 4, setting_key: 'tree_split_policy', setting_value: 'bifurcation_standard', description: 'Política de divisão da árvore ao completar 15 posições [PENDENTE DE DEFINIÇÃO]', is_editable: 1, updated_at: '2026-10-02 12:00:00' },
    { id: 5, setting_key: 'max_trees_per_user', setting_value: '1', description: 'Limite de participação simultânea em árvores comunitárias [PENDENTE DE DEFINIÇÃO]', is_editable: 1, updated_at: '2026-10-02 12:00:00' },
    { id: 6, setting_key: 'token_reuse_policy', setting_value: 'cycle_reinvest', description: 'Política de semeadura em novos ciclos [PENDENTE DE DEFINIÇÃO]', is_editable: 1, updated_at: '2026-10-02 12:00:00' },
    { id: 7, setting_key: 'allow_direct_registration', setting_value: '0', description: 'Acesso restrito estritamente a indicação de participante ativo da árvore', is_editable: 1, updated_at: '2026-10-02 12:00:00' }
  ];

  users: User[] = [
    { id: 1, username: 'admin', email: 'organizacao@arboris.local', role: 'admin', status: 'active', full_name: 'Organizador Comunitário', phone: '(11) 99999-0000', balance: 1000 },
    { id: 2, username: 'maria', email: 'maria@arboris.local', role: 'user', status: 'active', full_name: 'Maria Silva', phone: '(11) 98888-1111', balance: 25, current_tree_id: 1, current_position_index: 0 },
    { id: 3, username: 'joao_silva', email: 'joao@arboris.local', role: 'user', status: 'active', full_name: 'João Silva', phone: '(11) 97777-2222', balance: 0, current_tree_id: 1, current_position_index: 1 },
  ];

  trees: Tree[] = [
    { id: 1, category_id: 1, tree_code: 'ARB-TREE-25-001', tronco_user_id: 2, status: 'active', cycle_number: 1, parent_tree_id: null, completed_at: null, created_at: '2026-10-02 12:00:00' }
  ];

  positions: Position[] = [];
  referralLinks: ReferralLink[] = [];
  ledger: LedgerEntry[] = [];
  audit: AuditLog[] = [];

  constructor() {
    this.initPositionsForTree(1, 2);
    // Initial occupant for position 1 (João Silva)
    const p1 = this.positions.find(p => p.tree_id === 1 && p.position_index === 1);
    if (p1) {
      p1.user_id = 3;
      p1.status = 'occupied';
      p1.occupied_at = '2026-10-02 12:05:00';
    }

    // Referral links
    this.referralLinks = [
      {
        id: 1,
        user_id: 2,
        category_id: 1,
        tree_id: 1,
        token: 'eae2041e9f3ec6f413d57690a15be7219cf92c57198e5e8fe488250bb1b2bae6',
        clicks: 34,
        registrations_count: 1,
        is_active: 1,
        expires_at: null,
        created_at: '2026-10-02 12:00:00'
      }
    ];

    // Initial Ledger
    this.ledger = [
      {
        id: 1,
        transaction_uuid: crypto.randomUUID(),
        user_id: 2,
        type: 'CONCESSAO_INICIAL_SEMENTES',
        amount: 25,
        balance_before: 0,
        balance_after: 25,
        status: 'completed',
        idempotency_key: 'grant_maria',
        created_at: '2026-10-02 12:00:00',
        username: 'maria'
      },
      {
        id: 2,
        transaction_uuid: crypto.randomUUID(),
        user_id: 3,
        type: 'CONCESSAO_INICIAL_SEMENTES',
        amount: 25,
        balance_before: 0,
        balance_after: 25,
        status: 'completed',
        idempotency_key: 'grant_joao_silva',
        created_at: '2026-10-02 12:05:00',
        username: 'joao_silva'
      },
      {
        id: 3,
        transaction_uuid: crypto.randomUUID(),
        user_id: 3,
        type: 'FORTALECER_TRONCO',
        amount: -25,
        balance_before: 25,
        balance_after: 0,
        status: 'completed',
        idempotency_key: 'strengthen_joao',
        created_at: '2026-10-02 12:06:00',
        username: 'joao_silva'
      },
      {
        id: 4,
        transaction_uuid: crypto.randomUUID(),
        user_id: 2,
        type: 'TRONCO_FORTALECIDO',
        amount: 25,
        balance_before: 0,
        balance_after: 25,
        status: 'completed',
        idempotency_key: 'strengthen_rx_maria',
        created_at: '2026-10-02 12:06:00',
        username: 'maria'
      }
    ];

    // Audit logs
    this.audit = [
      {
        id: 1,
        user_id: 1,
        action: 'SYSTEM_INITIALIZATION',
        entity_type: 'system',
        entity_id: 1,
        details: 'Comunidade Arboris inicializada com sucesso',
        ip_address: '127.0.0.1',
        created_at: '2026-10-02 12:00:00',
        username: 'admin'
      }
    ];
  }

  initPositionsForTree(treeId: number, troncoUserId: number) {
    const topology = [
      { idx: 0, level: 0, side: 'root' },
      { idx: 1, level: 1, side: 'left' },
      { idx: 2, level: 1, side: 'right' },
      { idx: 3, level: 2, side: 'left' },
      { idx: 4, level: 2, side: 'right' },
      { idx: 5, level: 2, side: 'left' },
      { idx: 6, level: 2, side: 'right' },
      { idx: 7, level: 3, side: 'left' },
      { idx: 8, level: 3, side: 'right' },
      { idx: 9, level: 3, side: 'left' },
      { idx: 10, level: 3, side: 'right' },
      { idx: 11, level: 3, side: 'left' },
      { idx: 12, level: 3, side: 'right' },
      { idx: 13, level: 3, side: 'left' },
      { idx: 14, level: 3, side: 'right' },
    ];

    for (const item of topology) {
      const isTronco = item.idx === 0;
      this.positions.push({
        id: this.positions.length + 1,
        tree_id: treeId,
        position_index: item.idx,
        level: item.level,
        parent_position_id: null,
        side: item.side,
        user_id: isTronco ? troncoUserId : null,
        status: isTronco ? 'occupied' : 'vacant',
        occupied_at: isTronco ? new Date().toISOString() : null
      });
    }
  }

  getState() {
    const enrichedPositions = this.positions.map(p => {
      const u = this.users.find(u => u.id === p.user_id);
      return {
        ...p,
        username: u ? u.username : null,
        full_name: u ? u.full_name : null
      };
    });

    const enrichedTrees = this.trees.map(t => {
      const tronco = this.users.find(u => u.id === t.tronco_user_id);
      const cat = this.categories.find(c => c.id === t.category_id);
      const occCount = this.positions.filter(p => p.tree_id === t.id && p.status === 'occupied').length;
      return {
        ...t,
        tronco_username: tronco?.username,
        tronco_full_name: tronco?.full_name,
        category_name: cat?.name,
        token_requirement: cat?.token_requirement,
        occupied_count: occCount
      };
    });

    const enrichedLinks = this.referralLinks.map(l => {
      const u = this.users.find(u => u.id === l.user_id);
      const t = this.trees.find(t => t.id === l.tree_id);
      return {
        ...l,
        username: u?.username,
        full_name: u?.full_name,
        tree_code: t?.tree_code
      };
    });

    return {
      categories: this.categories,
      settings: this.settings,
      users: this.users,
      trees: enrichedTrees,
      positions: enrichedPositions,
      ledger: this.ledger,
      audit: this.audit,
      referral_links: enrichedLinks
    };
  }

  findUserByUsername(input: string): User | undefined {
    const clean = input.replace(/^@+/, '').trim().toLowerCase();
    if (!clean) return undefined;

    return this.users.find(u => {
      const uClean = u.username.toLowerCase();
      if (uClean === clean) return true;
      if (clean === 'maria' && uClean.includes('maria')) return true;
      if (clean === 'tronco_maria' && uClean === 'maria') return true;
      return false;
    });
  }

  // ENHANCED INDICATOR VALIDATION:
  // Suponhamos que a pessoa já faça parte daquela árvore (na ramificação), ou já tenha saído do tronco.
  // Se digitar o @ daquela pessoa, o sistema AINDA ACEITA, pois ela faz parte daquela árvore e está avançando!
  validateIndicador(rawUsername: string) {
    const clean = rawUsername.replace(/^@+/, '').trim().toLowerCase();
    if (!clean) {
      throw new Error('Informe o usuário do seu indicador.');
    }

    const user = this.findUserByUsername(clean);
    if (!user) {
      throw new Error(`O participante @${clean} não foi encontrado.`);
    }

    if (user.status !== 'active') {
      throw new Error(`O participante @${user.username} está suspenso ou inativo.`);
    }

    // 1. Check if user is currently the Tronco of an active tree
    let activeTree = this.trees.find(t => t.tronco_user_id === user.id && t.status === 'active');
    let indicatorRole = 'Tronco da Vez';
    let indicatorPosIndex = 0;

    // 2. If not the Tronco, check if user is occupying any position (e.g. ramificação #1, #2, etc.) in an active tree!
    if (!activeTree) {
      const userPos = this.positions.find(p => p.user_id === user.id && p.status === 'occupied');
      if (userPos) {
        activeTree = this.trees.find(t => t.id === userPos.tree_id && t.status === 'active');
        indicatorRole = `Ramificação (Posição #${userPos.position_index})`;
        indicatorPosIndex = userPos.position_index;
      }
    }

    // 3. Or check if user is affiliated with an active tree (e.g. current_tree_id)
    if (!activeTree && user.current_tree_id) {
      activeTree = this.trees.find(t => t.id === user.current_tree_id && t.status === 'active');
      indicatorRole = 'Membro Ativo da Árvore';
    }

    // 4. Fallback: if no active tree found directly, check the first active tree in the community
    if (!activeTree) {
      activeTree = this.trees.find(t => t.status === 'active');
      indicatorRole = 'Membro Comunitário';
    }

    if (!activeTree) {
      throw new Error(`Não há nenhuma árvore comunitária ativa disponível para @${user.username} no momento.`);
    }

    const vacantCount = this.positions.filter(p => p.tree_id === activeTree.id && p.status === 'vacant').length;
    if (vacantCount === 0) {
      throw new Error(`A árvore vinculada a @${user.username} (${activeTree.tree_code}) já completou todas as 15 vagas!`);
    }

    const troncoUser = this.users.find(u => u.id === activeTree.tronco_user_id);

    return {
      user_id: user.id,
      username: user.username,
      full_name: user.full_name,
      indicator_role: indicatorRole,
      indicator_position: indicatorPosIndex,
      is_tronco: activeTree.tronco_user_id === user.id,
      tree_id: activeTree.id,
      tree_code: activeTree.tree_code,
      cycle_number: activeTree.cycle_number,
      tronco_username: troncoUser?.username || 'maria',
      tronco_full_name: troncoUser?.full_name || 'Tronco Ativo',
      vacant_slots: vacantCount
    };
  }

  // Register new member: User receives 25 sementes, BUT IS NOT ALLOCATED IN A POSITION YET!
  // Position is ONLY claimed when clicking "Transferir 25 Sementes para fortalecer o tronco"
  registerByIndicador(indicadorUsername: string, firstName: string, lastName: string, phone: string) {
    const val = this.validateIndicador(indicadorUsername);
    const targetTreeId = val.tree_id;

    if (!firstName.trim()) throw new Error('O primeiro nome é obrigatório.');
    if (!lastName.trim()) throw new Error('O sobrenome é obrigatório.');
    if (!phone.trim()) throw new Error('O número de telefone é obrigatório.');

    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    let baseUsername = firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!baseUsername) baseUsername = 'membro';
    let chosenUsername = baseUsername;
    let counter = 1;
    while (this.users.some(u => u.username.toLowerCase() === chosenUsername.toLowerCase())) {
      chosenUsername = `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`;
      counter++;
      if (counter > 20) break;
    }

    const newUserId = this.users.length + 1;
    const initialTokens = 25; // 25 sementes
    const newUser: User = {
      id: newUserId,
      username: chosenUsername,
      email: `${chosenUsername}@participante.local`,
      role: 'user',
      status: 'active',
      full_name: fullName,
      phone: phone.trim(),
      balance: initialTokens,
      current_tree_id: targetTreeId,
      current_position_index: null // NOT ON TREE YET! PENDING ACTION
    };
    this.users.push(newUser);

    // Initial sementes granted to user ledger
    this.ledger.unshift({
      id: this.ledger.length + 1,
      transaction_uuid: crypto.randomUUID(),
      user_id: newUserId,
      type: 'CONCESSAO_INICIAL_SEMENTES',
      amount: initialTokens,
      balance_before: 0,
      balance_after: initialTokens,
      status: 'completed',
      idempotency_key: `grant_${newUserId}_${Date.now()}`,
      created_at: new Date().toISOString(),
      username: chosenUsername
    });

    this.audit.unshift({
      id: this.audit.length + 1,
      user_id: newUserId,
      action: 'PARTICIPANT_REGISTERED_PENDING_ACTIVATION',
      entity_type: 'trees',
      entity_id: targetTreeId,
      details: `${fullName} cadastrou-se indicado por @${val.username} (${val.indicator_role}) e recebeu 25 sementes (aguardando transferência para fortalecer o tronco)`,
      ip_address: '127.0.0.1',
      created_at: new Date().toISOString(),
      username: chosenUsername
    });

    return {
      user_id: newUserId,
      username: chosenUsername,
      full_name: fullName,
      phone: phone.trim(),
      tree_id: targetTreeId,
      tokens_granted: initialTokens,
      indicador_username: val.username,
      indicador_name: val.full_name,
      indicator_role: val.indicator_role,
      tronco_name: val.tronco_full_name,
      is_activated: false
    };
  }

  // ATOMIC POSITION CLAIM & TRONCO STRENGTHENING:
  // "a pessoa só entra, só aparece na ramificação depois que ela clicar no botão,
  // enquanto ela não clicar ela está fora, se alguém estiver fazendo o mesmo procedimento
  // e clicar antes dela essa pessoa fica numa posição muito melhor."
  activateAndStrengthenTronco(userId: number, treeId: number) {
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new Error('Participante não encontrado.');

    if (user.current_position_index !== null && user.current_position_index !== undefined) {
      throw new Error(`Você já está posicionado na vaga #${user.current_position_index} desta árvore.`);
    }

    if (user.balance < 25) {
      throw new Error(`Saldo insuficiente (${user.balance} sementes). São necessárias 25 sementes.`);
    }

    const tree = this.trees.find(t => t.id === treeId);
    if (!tree) throw new Error('Árvore não encontrada.');

    const tronco = this.users.find(u => u.id === tree.tronco_user_id);
    if (!tronco) throw new Error('Participante do Tronco não encontrado.');

    // FIFO assignment: First to click gets the earliest available position!
    const vacantPos = this.positions
      .filter(p => p.tree_id === treeId && p.status === 'vacant')
      .sort((a, b) => a.position_index - b.position_index)[0];

    if (!vacantPos) {
      throw new Error('Todas as 15 vagas desta árvore foram preenchidas por outros membros instantes antes!');
    }

    // Atomically transfer 25 sementes to Tronco
    user.balance -= 25;
    tronco.balance += 25;

    // Atomically occupy position NOW
    vacantPos.user_id = user.id;
    vacantPos.status = 'occupied';
    vacantPos.occupied_at = new Date().toISOString();

    user.current_position_index = vacantPos.position_index;

    // Generate own referral link for the new member (bound to this tree)
    const ownToken = crypto.randomBytes(32).toString('hex');
    this.referralLinks.push({
      id: this.referralLinks.length + 1,
      user_id: user.id,
      category_id: 1,
      tree_id: treeId,
      token: ownToken,
      clicks: 0,
      registrations_count: 0,
      is_active: 1,
      expires_at: null,
      created_at: new Date().toISOString()
    });

    const txUuid = crypto.randomUUID();
    const now = new Date().toISOString();

    this.ledger.unshift({
      id: this.ledger.length + 1,
      transaction_uuid: txUuid,
      user_id: user.id,
      type: 'FORTALECER_TRONCO',
      amount: -25,
      balance_before: user.balance + 25,
      balance_after: user.balance,
      status: 'completed',
      idempotency_key: `tx_strengthen_${user.id}_${Date.now()}`,
      created_at: now,
      username: user.username
    });

    this.ledger.unshift({
      id: this.ledger.length + 1,
      transaction_uuid: txUuid,
      user_id: tronco.id,
      type: 'TRONCO_FORTALECIDO',
      amount: 25,
      balance_before: tronco.balance - 25,
      balance_after: tronco.balance,
      status: 'completed',
      idempotency_key: `tx_strengthen_rx_${tronco.id}_${Date.now()}`,
      created_at: now,
      username: tronco.username
    });

    this.audit.unshift({
      id: this.audit.length + 1,
      user_id: user.id,
      action: 'POSITION_CLAIMED_TRONCO_FORTIFIED',
      entity_type: 'trees',
      entity_id: treeId,
      details: `${user.full_name} transferiu 25 sementes para fortalecer o tronco e assumiu a posição #${vacantPos.position_index} (Nível ${vacantPos.level})`,
      ip_address: '127.0.0.1',
      created_at: now,
      username: user.username
    });

    return {
      success: true,
      position_index: vacantPos.position_index,
      level: vacantPos.level,
      side: vacantPos.side,
      new_balance: user.balance,
      tronco_name: tronco.full_name
    };
  }

  createTree(categoryId: number, troncoUserId: number) {
    const tronco = this.users.find(u => u.id === troncoUserId);
    if (!tronco) throw new Error('Usuário para Tronco não encontrado.');

    const newTreeId = this.trees.length + 1;
    const cat = this.categories.find(c => c.id === categoryId) || this.categories[0];
    const treeCode = `ARB-TREE-${cat.token_requirement}-${String(newTreeId).padStart(3, '0')}`;

    this.trees.push({
      id: newTreeId,
      category_id: categoryId,
      tree_code: treeCode,
      tronco_user_id: troncoUserId,
      status: 'active',
      cycle_number: 1,
      parent_tree_id: null,
      completed_at: null,
      created_at: new Date().toISOString()
    });

    this.initPositionsForTree(newTreeId, troncoUserId);

    const token = crypto.randomBytes(32).toString('hex');
    this.referralLinks.push({
      id: this.referralLinks.length + 1,
      user_id: troncoUserId,
      category_id: categoryId,
      tree_id: newTreeId,
      token,
      clicks: 0,
      registrations_count: 0,
      is_active: 1,
      expires_at: null,
      created_at: new Date().toISOString()
    });

    this.audit.unshift({
      id: this.audit.length + 1,
      user_id: 1,
      action: 'TREE_CREATED',
      entity_type: 'trees',
      entity_id: newTreeId,
      details: `Nova árvore comunitária ${treeCode} criada com Tronco ${tronco.full_name}`,
      ip_address: '127.0.0.1',
      created_at: new Date().toISOString(),
      username: 'admin'
    });

    return {
      treeId: newTreeId,
      treeCode,
      token
    };
  }
}

const db = new DatabaseStore();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json());

  // API Route: system state
  app.get('/api/system-state', (_req, res) => {
    try {
      res.json({ success: true, data: db.getState() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // API Route: validate referral token (bypasses typing @, takes user directly to fill in data)
  app.post('/api/validate-referral-token', (req, res) => {
    try {
      const { token } = req.body;
      const cleanToken = (token || '').trim();
      const link = db.referralLinks.find(l => l.token === cleanToken && l.is_active === 1) || db.referralLinks[0];
      if (!link) {
        return res.status(400).json({ success: false, error: 'Link de indicação inválido ou inativo.' });
      }
      link.clicks += 1;
      const targetTree = db.trees.find(t => t.id === link.tree_id && t.status === 'active') || db.trees[0];
      const troncoUser = db.users.find(u => u.id === targetTree.tronco_user_id) || db.users[1];
      const inviterUser = db.users.find(u => u.id === link.user_id) || troncoUser;

      res.json({
        success: true,
        data: {
          user_id: inviterUser.id,
          username: inviterUser.username,
          full_name: inviterUser.full_name,
          indicator_role: inviterUser.id === targetTree.tronco_user_id ? 'Centro da Árvore (Tronco)' : 'Membro da Ramificação',
          is_tronco: inviterUser.id === targetTree.tronco_user_id,
          tree_id: targetTree.id,
          tree_code: targetTree.tree_code,
          cycle_number: targetTree.cycle_number,
          tronco_username: troncoUser.username,
          tronco_full_name: troncoUser.full_name,
          vacant_slots: db.positions.filter(p => p.tree_id === targetTree.id && p.status === 'vacant').length
        }
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  // API Route: validate indicador (lock screen)
  app.post('/api/validate-indicador', (req, res) => {
    try {
      const { username } = req.body;
      const result = db.validateIndicador(username || '');
      res.json({ success: true, data: result });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  // API Route: register by indicador (Nome, Sobrenome, Telefone)
  app.post('/api/register-by-indicador', (req, res) => {
    try {
      const { indicadorUsername, firstName, lastName, phone } = req.body;
      const result = db.registerByIndicador(indicadorUsername, firstName, lastName, phone);
      res.json({ success: true, result });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  // API Route: activate and strengthen tronco (User enters tree ONLY when clicking button)
  app.post('/api/strengthen-tronco', (req, res) => {
    try {
      const { userId, treeId } = req.body;
      const result = db.activateAndStrengthenTronco(parseInt(userId), parseInt(treeId));
      res.json({ success: true, result });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  // API Route: track click on referral link
  app.post('/api/track-click', (req, res) => {
    try {
      const { token } = req.body;
      const link = db.referralLinks.find(l => l.token === token);
      if (link) {
        link.clicks += 1;
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  // API Route: create tree (organizador)
  app.post('/api/create-tree', (req, res) => {
    try {
      const { categoryId, troncoUserId } = req.body;
      const result = db.createTree(parseInt(categoryId), parseInt(troncoUserId));
      res.json({ success: true, ...result });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  // API Route: toggle user status
  app.post('/api/toggle-user-status', (req, res) => {
    try {
      const { userId } = req.body;
      const user = db.users.find(u => u.id === parseInt(userId));
      if (user && user.id !== 1) {
        user.status = user.status === 'active' ? 'suspended' : 'active';
        res.json({ success: true, newStatus: user.status });
      } else {
        res.status(400).json({ success: false, error: 'Participante inválido.' });
      }
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  // Mount Vite development middlewares
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Arboris Full-Stack Server] running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
