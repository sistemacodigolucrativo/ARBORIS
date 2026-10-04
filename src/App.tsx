import React, { useState, useEffect } from 'react';
import {
  Trees,
  Sprout,
  Crown,
  Copy,
  Check,
  RefreshCw,
  PlusCircle,
  Shield,
  BookOpen,
  ArrowRight,
  Sparkles,
  Layers,
  Share2,
  ExternalLink,
  MessageCircle,
  Send,
  Users,
  QrCode,
  UserCheck,
  Lock,
  Unlock,
  ChevronRight,
  TrendingUp,
  MousePointerClick,
  Award,
  Filter,
  Eye,
  Activity,
  Palette,
  CircleDot,
  Network,
  Compass,
  CheckCircle2,
  User as UserIcon,
  AlertCircle,
  Zap,
  RotateCcw
} from 'lucide-react';
import { dataStore } from './services/dataStore';
import { PublicLandingPage } from './components/PublicLandingPage';

interface Position {
  id: number;
  tree_id: number;
  position_index: number;
  level: number;
  side: string;
  user_id: number | null;
  status: 'vacant' | 'occupied';
  username?: string;
  full_name?: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'participant';
  status: 'active' | 'suspended' | 'blocked';
  full_name: string;
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
  tronco_username?: string;
  tronco_full_name?: string;
  category_name?: string;
  token_requirement?: number;
  occupied_count?: number;
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
  username?: string;
  full_name?: string;
  tree_code?: string;
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
  action: string;
  entity_type: string;
  entity_id: number;
  username?: string;
  details: string;
  created_at: string;
}

interface Setting {
  id: number;
  setting_key: string;
  setting_value: string;
  description: string;
}

type StoredUiState = {
  showLandingPage?: boolean;
  isLocked?: boolean;
  currentView?: 'member' | 'public' | 'admin';
  selectedTreeModel?: number;
  memberTab?: 'my_tree' | 'marketing' | 'wallet';
  adminTab?: 'global_trees' | 'create_user' | 'members' | 'settings' | 'audit';
  selectedAdminTreeId?: number;
  currentUser?: User | null;
};

const ARBORIS_UI_STATE_KEY = 'arboris_ui_state_v1';

const readStoredUiState = (): StoredUiState => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(ARBORIS_UI_STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const persistStoredUiState = (state: StoredUiState) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ARBORIS_UI_STATE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be unavailable in private browsing; ignore gracefully.
  }
};

export default function App() {
  const initialUiState = readStoredUiState();
  // Public landing page is the default entry point!
  const [showLandingPage, setShowLandingPage] = useState<boolean>(() => initialUiState.showLandingPage ?? true);
  const [isLocked, setIsLocked] = useState<boolean>(() => initialUiState.isLocked ?? false);
  
  // Lock Screen state
  const [indicadorInput, setIndicadorInput] = useState<string>('');
  const [validatingIndicador, setValidatingIndicador] = useState<boolean>(false);
  const [validatedIndicadorData, setValidatedIndicadorData] = useState<any | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);

  // Lock Screen registration fields
  const [formFirstName, setFormFirstName] = useState<string>('');
  const [formLastName, setFormLastName] = useState<string>('');
  const [submittingAccess, setSubmittingAccess] = useState<boolean>(false);

  // Activation & Strengthening Loading state
  const [activatingTronco, setActivatingTronco] = useState<boolean>(false);

  // Navigation: member, public, admin
  const [currentView, setCurrentView] = useState<'member' | 'public' | 'admin'>(() => {
    const stored = initialUiState.currentView;
    return stored === 'member' || stored === 'public' || stored === 'admin' ? stored : 'member';
  });
  
  // Selected tree visual model: Default is Model 1 (Árvore Radial Orgânica)
  const [selectedTreeModel, setSelectedTreeModel] = useState<number>(() => initialUiState.selectedTreeModel ?? 1);

  // Member sub-tabs: tree, marketing, wallet
  const [memberTab, setMemberTab] = useState<'my_tree' | 'marketing' | 'wallet'>(() => {
    const stored = initialUiState.memberTab;
    return stored === 'my_tree' || stored === 'marketing' || stored === 'wallet' ? stored : 'my_tree';
  });
  
  // Admin sub-tabs: global_trees, members, settings, audit
  const [adminTab, setAdminTab] = useState<'global_trees' | 'create_user' | 'members' | 'settings' | 'audit'>(() => {
    const stored = initialUiState.adminTab;
    return stored === 'global_trees' || stored === 'create_user' || stored === 'members' || stored === 'settings' || stored === 'audit' ? stored : 'global_trees';
  });
  
  // Simulated logged-in user
  const [currentUser, setCurrentUser] = useState<User | null>(() => initialUiState.currentUser ?? null);

  // System state from API
  const [systemState, setSystemState] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Link copy feedback
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedPitch, setCopiedPitch] = useState<boolean>(false);

  // Inspector & modal states
  const [selectedNode, setSelectedNode] = useState<Position | null>(null);
  const [selectedAdminTreeId, setSelectedAdminTreeId] = useState<number>(() => initialUiState.selectedAdminTreeId ?? 1);
  const [showCreateTreeModal, setShowCreateTreeModal] = useState<boolean>(false);
  const [showDirectLoginModal, setShowDirectLoginModal] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  // Create tree form (organizador)
  const [newTreeCatId, setNewTreeCatId] = useState<number>(1);
  const [newTreeTroncoId, setNewTreeTroncoId] = useState<number>(2);

  // Admin create-user flow: same validation and registration path as public entry
  const [adminIndicadorInput, setAdminIndicadorInput] = useState<string>('');
  const [adminValidatedIndicadorData, setAdminValidatedIndicadorData] = useState<any | null>(null);
  const [adminCreateFirstName, setAdminCreateFirstName] = useState<string>('');
  const [adminCreateLastName, setAdminCreateLastName] = useState<string>('');
  const [adminCreateUserLoading, setAdminCreateUserLoading] = useState<boolean>(false);
  const [adminCreateUserError, setAdminCreateUserError] = useState<string | null>(null);
  const [adminSelectedUserId, setAdminSelectedUserId] = useState<number>(2);
  const [adminActionLoading, setAdminActionLoading] = useState<boolean>(false);
  const [adminActionMessage, setAdminActionMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const openActionRequest = (url: string) => {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.location.assign(url);
    }
  };

  const fetchState = async (forceReloadFromJson = false) => {
    try {
      setLoading(true);
      await dataStore.loadState(forceReloadFromJson);
      const stateView = dataStore.getSystemStateView();
      if (stateView) {
        setSystemState(stateView);
        if (currentUser) {
          const fresh = stateView.users.find((u: User) => u.id === currentUser.id);
          if (fresh) setCurrentUser(fresh);
        }
      }
    } catch (e) {
      console.error('Error fetching state', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    persistStoredUiState({
      showLandingPage,
      isLocked,
      currentView,
      selectedTreeModel,
      memberTab,
      adminTab,
      selectedAdminTreeId,
      currentUser
    });
  }, [showLandingPage, isLocked, currentView, selectedTreeModel, memberTab, adminTab, selectedAdminTreeId, currentUser]);

  useEffect(() => {
    fetchState();

    // Check if user accessed via referral link (query param ?ref=... or /ref/...)
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref') || (window.location.pathname.includes('/ref/') ? window.location.pathname.split('/ref/')[1] : null);
    if (refParam) {
      dataStore.loadState().then(() => {
        const val = dataStore.validateIndicador(refParam);
        if (val.success && val.data) {
          setValidatedIndicadorData(val.data);
          setShowLandingPage(false);
          setIsLocked(true); // Direct to step 2 (fill in data)
          showToast(`✓ Link de indicação aceito! Preencha seus dados para entrar.`);
        }
      });
    }
  }, []);

  // Enter via referral link (passes directly to data entry without typing @)
  const handleEnterViaReferralLink = async (tokenToUse?: string) => {
    const token = tokenToUse || activeReferralToken;
    setValidatingIndicador(true);
    setLockError(null);
    try {
      const val = dataStore.validateIndicador(token);
      if (val.success && val.data) {
        setValidatedIndicadorData(val.data);
        showToast(`✓ Link de indicação validado! Preencha seus dados.`);
      } else {
        setLockError(val.error || 'Link de indicação inválido.');
      }
    } catch (err: any) {
      setLockError('Erro ao validar indicador: ' + err.message);
    } finally {
      setValidatingIndicador(false);
    }
  };

  // Validate indicador in Lock Screen
  const handleValidateIndicador = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!indicadorInput.trim()) {
      setLockError('Por favor, informe o usuário de referência da árvore (pessoa no centro/tronco da árvore).');
      return;
    }

    setValidatingIndicador(true);
    setLockError(null);
    try {
      const val = dataStore.validateIndicador(indicadorInput.trim());
      if (val.success && val.data) {
        setValidatedIndicadorData(val.data);
        setLockError(null);
      } else {
        setValidatedIndicadorData(null);
        setLockError(val.error || 'Indicador inválido.');
      }
    } catch (err: any) {
      setLockError('Erro ao validar indicador: ' + err.message);
    } finally {
      setValidatingIndicador(false);
    }
  };

  // Submit registration in Lock Screen (Nome, Sobrenome, Telefone)
  // User enters community with 25 initial sementes, but position is only secured upon strengthening tronco!
  const handleUnlockAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatedIndicadorData) {
      setLockError('Por favor, valide o indicador primeiro.');
      return;
    }
    if (!formFirstName.trim() || !formLastName.trim()) {
      setLockError('Preencha seu nome e sobrenome.');
      return;
    }

    setSubmittingAccess(true);
    setLockError(null);
    try {
      const res = await dataStore.registerParticipant({
        indicadorUsername: validatedIndicadorData.username,
        firstName: formFirstName.trim(),
        lastName: formLastName.trim()
      });
      if (res.success && res.result) {
        openActionRequest(res.result.request_url);
        setLockError('Solicitação online aberta no GitHub. Envie a issue para a Action validar e gravar o cadastro nos JSONs.');
        showToast(`Solicitação de cadastro criada para ${res.result.full_name}.`);
      } else {
        setLockError(res.error || 'Falha ao registrar novo participante.');
      }
    } catch (err: any) {
      setLockError('Erro ao registrar: ' + err.message);
    } finally {
      setSubmittingAccess(false);
    }
  };

  const handleAdminValidateIndicador = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminIndicadorInput.trim()) {
      setAdminCreateUserError('Informe o usuário indicador antes de continuar.');
      return;
    }

    setAdminCreateUserLoading(true);
    setAdminCreateUserError(null);
    try {
      const val = dataStore.validateIndicador(adminIndicadorInput.trim());
      if (val.success && val.data) {
        setAdminValidatedIndicadorData(val.data);
        showToast(`✓ Indicador validado: @${val.data.username}`);
      } else {
        setAdminValidatedIndicadorData(null);
        setAdminCreateUserError(val.error || 'Indicador inválido.');
      }
    } catch (err: any) {
      setAdminValidatedIndicadorData(null);
      setAdminCreateUserError('Erro ao validar indicador: ' + err.message);
    } finally {
      setAdminCreateUserLoading(false);
    }
  };

  const handleAdminCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminValidatedIndicadorData) {
      setAdminCreateUserError('Valide o indicador antes de criar o usuário.');
      return;
    }
    if (!adminCreateFirstName.trim() || !adminCreateLastName.trim()) {
      setAdminCreateUserError('Preencha nome e sobrenome do novo usuário.');
      return;
    }

    setAdminCreateUserLoading(true);
    setAdminCreateUserError(null);
    try {
      const res = await dataStore.registerParticipant({
        indicadorUsername: adminValidatedIndicadorData.username,
        firstName: adminCreateFirstName.trim(),
        lastName: adminCreateLastName.trim()
      });

      if (res.success && res.result) {
        openActionRequest(res.result.request_url);
        showToast(`Solicitação de criação aberta para ${res.result.full_name}.`);
        setAdminCreateUserError('Solicitação online aberta no GitHub. Envie a issue para a Action validar e gravar o cadastro nos JSONs.');
        setAdminCreateFirstName('');
        setAdminCreateLastName('');
      } else {
        setAdminCreateUserError(res.error || 'Falha ao criar usuário pelo painel administrativo.');
      }
    } catch (err: any) {
      setAdminCreateUserError('Erro ao criar usuário: ' + err.message);
    } finally {
      setAdminCreateUserLoading(false);
    }
  };

  // ATOMIC POSITION CLAIM & STRENGTHENING:
  // "Transferir 25 Sementes para fortalecer o tronco"
  // The member enters and appears in the tree ONLY AFTER clicking this button!
  const handleStrengthenTronco = async (userId: number, treeId: number) => {
    setActivatingTronco(true);
    try {
      const res = await dataStore.strengthenTroncoAction(userId, treeId);
      if (res.success && res.result) {
        openActionRequest(res.result.request_url);
        showToast('Solicitação de fortalecimento aberta no GitHub. Envie a issue para gravar nos JSONs.');
      } else {
        showToast('Falha: ' + (res.error || 'Não foi possível completar o fortalecimento.'));
      }
    } catch (e: any) {
      showToast('Erro: ' + e.message);
    } finally {
      setActivatingTronco(false);
    }
  };

  const handleCreateTree = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await dataStore.createTreeAction(newTreeCatId, newTreeTroncoId);
      if (res.success && res.result?.request_url) {
        openActionRequest(res.result.request_url);
        setShowCreateTreeModal(false);
        showToast('Solicitação de criação de árvore aberta no GitHub. Envie a issue para a Action validar e gravar nos JSONs.');
      } else {
        showToast('Erro: ' + (res.error || 'Não foi possível criar a solicitação da árvore.'));
      }
    } catch (e: any) {
      showToast('Erro: ' + e.message);
    }
  };

  const openAdminOnlineAction = (res: any, successMessage: string) => {
    if (res.success && res.result?.request_url) {
      openActionRequest(res.result.request_url);
      setAdminActionMessage('Solicitação online aberta no GitHub. Envie a issue para a Action validar e gravar a alteração nos JSONs.');
      showToast(successMessage);
      return;
    }

    const error = res.error || 'Não foi possível criar a solicitação administrativa.';
    setAdminActionMessage(error);
    showToast('Erro: ' + error);
  };

  const handleArchiveSelectedTree = async () => {
    if (!adminTree) return;
    if (adminTree.status !== 'active') {
      showToast('Somente árvores ativas podem ser arquivadas.');
      return;
    }
    if (!window.confirm(`Arquivar a árvore ${adminTree.tree_code}? O histórico será preservado.`)) return;

    setAdminActionLoading(true);
    setAdminActionMessage(null);
    try {
      const res = await dataStore.archiveTreeAction(adminTree.id, 'Arquivamento administrativo pelo painel');
      openAdminOnlineAction(res, 'Solicitação de arquivamento aberta.');
    } catch (e: any) {
      setAdminActionMessage('Erro ao arquivar árvore: ' + e.message);
      showToast('Erro: ' + e.message);
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleAssignSelectedNode = async () => {
    if (!adminTree || !selectedNode) return;
    if (selectedNode.position_index === 0) {
      showToast('O tronco não deve ser alterado por este atalho. Crie uma nova árvore com o tronco correto.');
      return;
    }

    setAdminActionLoading(true);
    setAdminActionMessage(null);
    try {
      const res = await dataStore.assignTreePositionAction(adminTree.id, selectedNode.position_index, adminSelectedUserId);
      openAdminOnlineAction(res, `Solicitação para atribuir/mover membro à posição #${selectedNode.position_index} aberta.`);
    } catch (e: any) {
      setAdminActionMessage('Erro ao atribuir membro: ' + e.message);
      showToast('Erro: ' + e.message);
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleClearSelectedNode = async () => {
    if (!adminTree || !selectedNode) return;
    if (selectedNode.position_index === 0) {
      showToast('O tronco não pode ser liberado por este atalho.');
      return;
    }
    if (selectedNode.status !== 'occupied') {
      showToast('Esta posição já está vaga.');
      return;
    }
    if (!window.confirm(`Liberar a posição #${selectedNode.position_index}?`)) return;

    setAdminActionLoading(true);
    setAdminActionMessage(null);
    try {
      const res = await dataStore.clearTreePositionAction(adminTree.id, selectedNode.position_index);
      openAdminOnlineAction(res, `Solicitação para liberar a posição #${selectedNode.position_index} aberta.`);
    } catch (e: any) {
      setAdminActionMessage('Erro ao liberar posição: ' + e.message);
      showToast('Erro: ' + e.message);
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: number) => {
    try {
      const res = await dataStore.toggleUserStatusAction(userId);
      if (res.success) {
        showToast(`✓ Status atualizado para: ${res.newStatus}`);
        await fetchState();
      } else {
        showToast('Erro: ' + res.error);
      }
    } catch (e: any) {
      showToast('Erro: ' + e.message);
    }
  };

  // Helper collections
  const allTrees: Tree[] = systemState?.trees || [];
  const allPositions: Position[] = systemState?.positions || [];
  const allUsers: User[] = systemState?.users || [];
  const activeAssignableUsers = allUsers.filter(u => u.status === 'active' && u.role !== 'admin');
  const allLinks: ReferralLink[] = systemState?.referral_links || [];

  // Active member's tree
  const memberTreeId = currentUser?.current_tree_id || (allTrees[0]?.id ?? 1);
  const memberTree = allTrees.find(t => t.id === memberTreeId) || allTrees[0];
  const memberPositions = allPositions.filter(p => p.tree_id === memberTreeId);

  // Link for member's tree
  const memberLink = allLinks.find(l => l.tree_id === memberTreeId && (l.user_id === currentUser?.id || l.user_id === memberTree?.tronco_user_id)) || allLinks.find(l => l.tree_id === memberTreeId) || allLinks[0];
  const activeReferralToken = memberLink?.token || 'eae2041e9f3ec6f413d57690a15be7219cf92c57198e5e8fe488250bb1b2bae6';
  const referralUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?ref=${activeReferralToken}`
    : `https://arboris.local/?ref=${activeReferralToken}`;

  // Marketing metrics
  const memberClicks = memberLink?.clicks ?? 0;
  const memberRegistrations = memberLink?.registrations_count ?? 0;
  const conversionRate = memberClicks > 0 ? Math.round((memberRegistrations / memberClicks) * 100) : 0;
  const treeOccupancy = memberTree?.occupied_count ?? 0;
  const slotsRemaining = 15 - treeOccupancy;

  // Has the current user entered and secured their spot in the branch yet?
  const isUserPositioned = currentUser && currentUser.current_position_index !== null && currentUser.current_position_index !== undefined;

  // Selected tree for admin explorer
  const adminTree = allTrees.find(t => t.id === selectedAdminTreeId) || allTrees[0];
  const adminTreePositions = allPositions.filter(p => p.tree_id === selectedAdminTreeId);

  // Pre-formatted copy pitch (Sementes)
  const marketingPitch = `🌱 Olá! Estou participando do ecossistema comunitário independente Arboris!\n\n🌳 Nosso tabuleiro de 15 posições segue a dinâmica clássica 1–2–4–8 da Árvore:\n• 1 Tronco Central\n• 2 Guardiões Primários\n• 4 Sub-ramos\n• 8 Vagas Externas de Entrada (Nível 3)\n\nAtualmente estamos no Ciclo #${memberTree?.cycle_number || 1} e restam apenas ${slotsRemaining} vagas externas para fechar a árvore e gerar a bifurcação!\n\n✨ 100% GRATUITO: Você ganha 25 sementes virtuais logo no cadastro para fortalecer o tronco e entrar no jogo.\n❌ Sem dinheiro real, sem PIX e sem depósitos.\n\n👉 Acesse pelo meu link de convite exclusivo:\n${referralUrl}`;

  // ==========================================
  // TREE VISUALIZATION RENDERERS (MODELS 1 TO 4)
  // ==========================================

  // MODEL 1: ÁRVORE RADIAL ORGÂNICA (Mind Map Circular 360°)
  const renderModel1Radial = (positionsToRender: Position[], currentUserId?: number) => {
    const tronco = positionsToRender.find(p => p.position_index === 0);
    const n1 = positionsToRender.filter(p => p.position_index >= 1 && p.position_index <= 2);
    const n2 = positionsToRender.filter(p => p.position_index >= 3 && p.position_index <= 6);
    const n3 = positionsToRender.filter(p => p.position_index >= 7 && p.position_index <= 14);

    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col items-center relative overflow-hidden">
        {/* Radial SVG Connections Canvas */}
        <div className="w-[330px] h-[330px] relative flex items-center justify-center my-2 select-none">
          <div className="absolute inset-0 rounded-full border border-slate-800/40 pointer-events-none scale-100"></div>
          <div className="absolute inset-8 rounded-full border border-dashed border-slate-800/60 pointer-events-none"></div>
          <div className="absolute inset-20 rounded-full border border-slate-800/80 pointer-events-none"></div>

          {/* SVG Connection Lines from Center to Levels */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 330 330">
            <line x1="165" y1="165" x2="95" y2="165" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.6" />
            <line x1="165" y1="165" x2="235" y2="165" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.6" />

            <path d="M 95 165 Q 65 140 45 110" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.7" />
            <path d="M 95 165 Q 65 190 45 220" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.7" />

            <path d="M 235 165 Q 265 140 285 110" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.7" />
            <path d="M 235 165 Q 265 190 285 220" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.7" />
          </svg>

          {/* CENTER: O TRONCO (#0) */}
          <div
            onClick={() => tronco && setSelectedNode(tronco)}
            className="absolute z-20 w-24 h-24 rounded-full bg-gradient-to-br from-amber-950 via-slate-900 to-amber-900 border-2 border-amber-400 p-2 flex flex-col items-center justify-center text-center cursor-pointer shadow-xl hover:scale-105 transition"
          >
            <Crown className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-[9px] font-bold text-amber-300 font-mono tracking-wider mt-0.5">TRONCO #0</span>
            <span className="text-[10px] font-bold text-slate-100 truncate max-w-[80px]">
              {tronco?.full_name || tronco?.username || 'Tronco'}
            </span>
            {tronco?.user_id === currentUserId && (
              <span className="text-[8px] bg-amber-400 text-slate-950 font-bold px-1 rounded-full mt-0.5">VOCÊ</span>
            )}
          </div>

          {/* RING 1: RAMOS PRINCIPAIS (#1 ESQ e #2 DIR) */}
          {n1.map((p) => {
            const isLeft = p.position_index === 1;
            const isUser = p.user_id === currentUserId;
            const isOcc = p.status === 'occupied';
            const style = isLeft ? { left: '60px', top: '135px' } : { right: '60px', top: '135px' };
            return (
              <div
                key={p.position_index}
                onClick={() => setSelectedNode(p)}
                style={style}
                className={`absolute z-10 w-14 h-14 rounded-full flex flex-col items-center justify-center text-center cursor-pointer transition shadow-md ${
                  isUser
                    ? 'bg-emerald-950 border-2 border-emerald-400 text-white ring-2 ring-emerald-500/50'
                    : isOcc
                    ? 'bg-slate-900 border border-emerald-500/60 text-slate-100'
                    : 'bg-slate-950 border border-dashed border-slate-700 text-slate-500'
                }`}
              >
                <span className="text-[9px] font-mono font-bold">#{p.position_index}</span>
                <span className="text-[8px] truncate max-w-[45px] font-medium leading-none">
                  {isOcc ? p.username : 'Livre'}
                </span>
                {isUser && <span className="text-[7px] text-emerald-400 font-bold">VOCÊ</span>}
              </div>
            );
          })}

          {/* RING 2: SUB-RAMOS (#3, #4, #5, #6) */}
          {n2.map((p) => {
            const isUser = p.user_id === currentUserId;
            const isOcc = p.status === 'occupied';
            let posStyle: React.CSSProperties = {};
            if (p.position_index === 3) posStyle = { left: '25px', top: '80px' };
            if (p.position_index === 4) posStyle = { left: '25px', bottom: '80px' };
            if (p.position_index === 5) posStyle = { right: '25px', top: '80px' };
            if (p.position_index === 6) posStyle = { right: '25px', bottom: '80px' };

            return (
              <div
                key={p.position_index}
                onClick={() => setSelectedNode(p)}
                style={posStyle}
                className={`absolute z-10 w-11 h-11 rounded-full flex flex-col items-center justify-center text-center cursor-pointer transition ${
                  isUser
                    ? 'bg-emerald-950 border-2 border-emerald-400 text-emerald-200'
                    : isOcc
                    ? 'bg-slate-900 border border-slate-700 text-slate-200'
                    : 'bg-slate-950 border border-dashed border-slate-800 text-slate-600'
                }`}
              >
                <span className="text-[8px] font-mono font-bold">#{p.position_index}</span>
                <span className="text-[7px] truncate max-w-[36px]">{isOcc ? p.username : 'Livre'}</span>
              </div>
            );
          })}

          {/* RING 3: 8 VAGAS DE ENTRADA (#7 a #14) */}
          {n3.map((p, i) => {
            const isUser = p.user_id === currentUserId;
            const isOcc = p.status === 'occupied';
            const angles = [-150, -120, -60, -30, 30, 60, 120, 150];
            const angleRad = (angles[i] * Math.PI) / 180;
            const x = 165 + 140 * Math.cos(angleRad) - 16;
            const y = 165 + 140 * Math.sin(angleRad) - 16;

            return (
              <div
                key={p.position_index}
                onClick={() => setSelectedNode(p)}
                style={{ left: `${x}px`, top: `${y}px` }}
                className={`absolute z-10 w-8 h-8 rounded-full flex flex-col items-center justify-center text-center cursor-pointer text-[8px] font-mono transition ${
                  isUser
                    ? 'bg-emerald-900 border-2 border-emerald-400 text-white font-bold'
                    : isOcc
                    ? 'bg-slate-900 border border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-950 border border-dashed border-slate-800 text-slate-600'
                }`}
                title={`Posição #${p.position_index}: ${isOcc ? p.username : 'Vaga Livre'}`}
              >
                #{p.position_index}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="w-full flex items-center justify-around pt-3 border-t border-slate-800 text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span>Centro: Tronco</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Ocupado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-dashed border-slate-600"></span>
            <span>Vaga Aberta</span>
          </div>
        </div>
      </div>
    );
  };

  // MODEL 2: MAPA MENTAL BI-LATERAL
  const renderModel2MindMap = (positionsToRender: Position[], currentUserId?: number) => {
    const tronco = positionsToRender.find(p => p.position_index === 0);

    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex justify-center">
          <div
            onClick={() => tronco && setSelectedNode(tronco)}
            className="w-full max-w-xs bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-2 border-amber-400 rounded-2xl p-3.5 text-center cursor-pointer shadow-lg hover:border-amber-300 transition"
          >
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-amber-400 uppercase tracking-widest">
              <Crown className="w-3.5 h-3.5" />
              <span>NÚCLEO CENTRAL DA ÁRVORE (TRONCO #0)</span>
            </div>
            <div className="text-sm font-bold text-slate-100 mt-1">
              {tronco?.full_name || tronco?.username || 'Tronco'}
            </div>
            <div className="text-[11px] text-slate-400">@{tronco?.username} · Participante da Vez</div>
            {tronco?.user_id === currentUserId && (
              <span className="inline-block mt-1 text-[9px] bg-amber-400 text-slate-950 font-bold px-2 py-0.2 rounded-full">
                VOCÊ ESTÁ NO TRONCO
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-500">
          <span>◀ Ramo Esquerdo (7 vagas)</span>
          <span className="text-amber-400">◆</span>
          <span>Ramo Direito (7 vagas) ▶</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* Left Wing */}
          <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-2.5 space-y-2">
            <div className="text-[10px] font-bold text-emerald-400 font-mono uppercase pb-1 border-b border-slate-800 flex items-center justify-between">
              <span>Ramo Esquerdo (#1)</span>
              <span>Guard.</span>
            </div>

            {positionsToRender.filter(p => p.position_index === 1).map(p => (
              <div
                key={p.position_index}
                onClick={() => setSelectedNode(p)}
                className={`p-2 rounded-lg border cursor-pointer transition ${
                  p.user_id === currentUserId
                    ? 'bg-emerald-950 border-emerald-400 text-white font-bold'
                    : p.status === 'occupied'
                    ? 'bg-slate-900 border-slate-700 text-slate-200'
                    : 'bg-slate-950 border-dashed border-slate-800 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between text-[9px] font-mono">
                  <span>#1 Primário</span>
                  {p.user_id === currentUserId && <span className="text-emerald-400">VOCÊ</span>}
                </div>
                <div className="truncate font-semibold mt-0.5">{p.status === 'occupied' ? p.username : 'Vaga livre'}</div>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-1 text-[10px]">
              {positionsToRender.filter(p => p.position_index === 3 || p.position_index === 4).map(p => (
                <div
                  key={p.position_index}
                  onClick={() => setSelectedNode(p)}
                  className={`p-1.5 rounded border truncate cursor-pointer ${
                    p.user_id === currentUserId
                      ? 'bg-emerald-950 border-emerald-400 text-white'
                      : p.status === 'occupied'
                      ? 'bg-slate-900 border-slate-800 text-slate-300'
                      : 'border-dashed border-slate-800 text-slate-600'
                  }`}
                >
                  <div className="font-mono text-[8px]">#{p.position_index}</div>
                  <div className="truncate">{p.status === 'occupied' ? p.username : 'Livre'}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-1 text-[9px] font-mono text-center">
              {positionsToRender.filter(p => p.position_index >= 7 && p.position_index <= 10).map(p => (
                <div
                  key={p.position_index}
                  onClick={() => setSelectedNode(p)}
                  className={`p-1 rounded border cursor-pointer ${
                    p.user_id === currentUserId
                      ? 'bg-emerald-950 border-emerald-400 text-emerald-200 font-bold'
                      : p.status === 'occupied'
                      ? 'bg-slate-900 border-emerald-900/60 text-slate-300'
                      : 'border-dashed border-slate-800 text-slate-600'
                  }`}
                >
                  #{p.position_index} {p.status === 'occupied' ? '●' : '○'}
                </div>
              ))}
            </div>
          </div>

          {/* Right Wing */}
          <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-2.5 space-y-2">
            <div className="text-[10px] font-bold text-emerald-400 font-mono uppercase pb-1 border-b border-slate-800 flex items-center justify-between">
              <span>Ramo Direito (#2)</span>
              <span>Guard.</span>
            </div>

            {positionsToRender.filter(p => p.position_index === 2).map(p => (
              <div
                key={p.position_index}
                onClick={() => setSelectedNode(p)}
                className={`p-2 rounded-lg border cursor-pointer transition ${
                  p.user_id === currentUserId
                    ? 'bg-emerald-950 border-emerald-400 text-white font-bold'
                    : p.status === 'occupied'
                    ? 'bg-slate-900 border-slate-700 text-slate-200'
                    : 'bg-slate-950 border-dashed border-slate-800 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between text-[9px] font-mono">
                  <span>#2 Primário</span>
                  {p.user_id === currentUserId && <span className="text-emerald-400">VOCÊ</span>}
                </div>
                <div className="truncate font-semibold mt-0.5">{p.status === 'occupied' ? p.username : 'Vaga livre'}</div>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-1 text-[10px]">
              {positionsToRender.filter(p => p.position_index === 5 || p.position_index === 6).map(p => (
                <div
                  key={p.position_index}
                  onClick={() => setSelectedNode(p)}
                  className={`p-1.5 rounded border truncate cursor-pointer ${
                    p.user_id === currentUserId
                      ? 'bg-emerald-950 border-emerald-400 text-white'
                      : p.status === 'occupied'
                      ? 'bg-slate-900 border-slate-800 text-slate-300'
                      : 'border-dashed border-slate-800 text-slate-600'
                  }`}
                >
                  <div className="font-mono text-[8px]">#{p.position_index}</div>
                  <div className="truncate">{p.status === 'occupied' ? p.username : 'Livre'}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-1 text-[9px] font-mono text-center">
              {positionsToRender.filter(p => p.position_index >= 11 && p.position_index <= 14).map(p => (
                <div
                  key={p.position_index}
                  onClick={() => setSelectedNode(p)}
                  className={`p-1 rounded border cursor-pointer ${
                    p.user_id === currentUserId
                      ? 'bg-emerald-950 border-emerald-400 text-emerald-200 font-bold'
                      : p.status === 'occupied'
                      ? 'bg-slate-900 border-emerald-900/60 text-slate-300'
                      : 'border-dashed border-slate-800 text-slate-600'
                  }`}
                >
                  #{p.position_index} {p.status === 'occupied' ? '●' : '○'}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // MODEL 3: ÁRVORE BOTÂNICA VISUAL
  const renderModel3Botanical = (positionsToRender: Position[], currentUserId?: number) => {
    const tronco = positionsToRender.find(p => p.position_index === 0);

    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="text-center">
          <span className="text-[10px] text-emerald-400 uppercase font-mono tracking-wider">
            Estrutura Arbórea Orgânica
          </span>
          <h4 className="text-xs font-bold text-slate-100">Copa & Tronco Vivo</h4>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 relative">
          <div className="text-[10px] font-mono text-slate-400 text-center mb-2">
            🍃 Folhas e Ramificações da Copa (Posições #1 a #14)
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            {positionsToRender.filter(p => p.position_index > 0).map(pos => {
              const isUser = pos.user_id === currentUserId;
              const isOcc = pos.status === 'occupied';
              return (
                <div
                  key={pos.position_index}
                  onClick={() => setSelectedNode(pos)}
                  className={`p-2 rounded-xl border cursor-pointer transition ${
                    isUser
                      ? 'bg-emerald-950 border-2 border-emerald-400 text-white font-bold shadow-md'
                      : isOcc
                      ? 'bg-slate-900 border-emerald-600/40 text-emerald-200'
                      : 'bg-slate-950 border-dashed border-slate-800 text-slate-600'
                  }`}
                >
                  <div className="text-[9px] font-mono">#{pos.position_index}</div>
                  <div className="text-[10px] truncate mt-0.5 font-medium">
                    {isOcc ? pos.username : 'Vaga'}
                  </div>
                  {isUser && <span className="text-[8px] text-emerald-400 block font-bold">VOCÊ</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center">
          <div
            onClick={() => tronco && setSelectedNode(tronco)}
            className="w-full max-w-sm bg-gradient-to-t from-amber-950 via-slate-900 to-amber-900 border-2 border-amber-400 rounded-2xl p-4 flex items-center justify-between cursor-pointer shadow-xl hover:border-amber-300 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 text-xl font-bold">
                🌳
              </div>
              <div className="text-left">
                <div className="text-[10px] text-amber-400 font-mono uppercase font-bold">TRONCO VIVO #0</div>
                <div className="text-sm font-bold text-slate-100">{tronco?.full_name}</div>
                <div className="text-xs text-slate-400">@{tronco?.username} · Centro Nutritivo</div>
              </div>
            </div>
            {tronco?.user_id === currentUserId && (
              <span className="text-[9px] bg-amber-400 text-slate-950 font-bold px-2 py-1 rounded-full">VOCÊ</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // MODEL 4: ÓRBITA EM FLOR DE LÓTUS
  const renderModel4LotusOrbit = (positionsToRender: Position[], currentUserId?: number) => {
    const tronco = positionsToRender.find(p => p.position_index === 0);

    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-center">
          <div
            onClick={() => tronco && setSelectedNode(tronco)}
            className="w-48 h-48 rounded-full bg-gradient-to-br from-amber-950 via-slate-900 to-amber-900 border-4 border-amber-400/80 p-3 flex flex-col items-center justify-center text-center cursor-pointer shadow-2xl hover:scale-105 transition"
          >
            <Crown className="w-6 h-6 text-amber-400 animate-bounce" />
            <span className="text-[10px] font-mono font-bold text-amber-300 mt-1">TRONCO SOLAR #0</span>
            <span className="text-xs font-bold text-slate-100 truncate max-w-[140px] mt-0.5">
              {tronco?.full_name}
            </span>
            <span className="text-[10px] text-slate-400">@{tronco?.username}</span>
            <span className="text-[9px] text-amber-400 font-mono mt-1">Participante da Vez</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
            <span>Satélites em Órbita (14 Participantes)</span>
            <span className="text-[10px] text-slate-400 font-mono">Radial</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {positionsToRender.filter(p => p.position_index > 0).map(pos => {
              const isUser = pos.user_id === currentUserId;
              const isOcc = pos.status === 'occupied';
              return (
                <div
                  key={pos.position_index}
                  onClick={() => setSelectedNode(pos)}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
                    isUser
                      ? 'bg-emerald-950 border-2 border-emerald-400 text-white font-bold'
                      : isOcc
                      ? 'bg-slate-950 border-slate-800 text-slate-200'
                      : 'bg-slate-950/40 border-dashed border-slate-800 text-slate-600'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-mono shrink-0 ${
                    isOcc ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {pos.position_index}
                  </span>
                  <div className="truncate text-[11px]">
                    {isOcc ? pos.username : 'Vaga'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderActiveModel = (positionsToRender: Position[], currentUserId?: number) => {
    switch (selectedTreeModel) {
      case 2:
        return renderModel2MindMap(positionsToRender, currentUserId);
      case 3:
        return renderModel3Botanical(positionsToRender, currentUserId);
      case 4:
        return renderModel4LotusOrbit(positionsToRender, currentUserId);
      case 1:
      default:
        return renderModel1Radial(positionsToRender, currentUserId);
    }
  };

  // ==========================================
  // RENDER: GUIA OFICIAL DE REGRAS & TOPOLOGIA 1-2-4-8
  // ==========================================
  const renderRulesContent = () => (
    <div className="space-y-4 text-xs">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
          <BookOpen className="w-4 h-4" />
          <span>Manual Oficial da Comunidade</span>
        </div>
        <h2 className="text-base font-bold text-slate-100 text-balance">
          Dinâmica Estrutural 1–2–4–8 da Árvore Arboris
        </h2>
        <p className="text-slate-300 leading-relaxed text-[11px] text-balance">
          O Arboris é um ecossistema recreativo comunitário de rotação matemática em árvore binária de 15 posições, com progressão gerada exclusivamente por bifurcação e sustentada por sementes virtuais gratuitas.
        </p>
      </div>

      {/* Identidade do Projeto & Nomenclatura */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-amber-400 font-bold">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="uppercase tracking-wider text-[11px]">Nomenclatura e Princípios Oficiais</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400 block">Comunidade</span>
            <strong className="text-emerald-400 text-xs">Árvore</strong>
          </div>
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400 block">Centro</span>
            <strong className="text-amber-400 text-xs">Tronco</strong>
          </div>
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400 block">Unidade Interna</span>
            <strong className="text-teal-400 text-xs">Sementes</strong>
          </div>
        </div>

        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-[11px]">
          <div className="flex items-start gap-2 text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="text-balance">
              <strong>100% Gratuito & Recreativo:</strong> Todo participante recebe suas sementes gratuitamente no cadastro para participar das rodadas.
            </span>
          </div>
          <div className="flex items-start gap-2 text-rose-300">
            <span className="font-bold shrink-0">❌</span>
            <span className="text-balance">
              <strong>Sem dinheiro real:</strong> Não existem depósitos, transferências PIX, saques, mensalidades ou qualquer promessa de rendimento financeiro. As sementes são pontos virtuais internos.
            </span>
          </div>
        </div>
      </div>

      {/* A Geometria dos 4 Níveis (15 Vagas) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Topologia dos 4 Níveis (15 Posições Exatas)</span>
          </span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
            1 – 2 – 4 – 8
          </span>
        </div>

        {/* ASCII Diagram Card */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[10px] text-center text-slate-300 overflow-x-auto leading-tight select-none">
          <div className="text-amber-400 font-bold">[0] TRONCO (Centro)</div>
          <div className="text-slate-600">/ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; \</div>
          <div className="text-sky-300 font-semibold">[1] &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; [2] (N1: 2 Guardiões)</div>
          <div className="text-slate-600">/ &nbsp; \ &nbsp; &nbsp; &nbsp; &nbsp; / &nbsp; \</div>
          <div className="text-indigo-300">[3] &nbsp; [4] &nbsp; &nbsp; [5] &nbsp; [6] (N2: 4 Ramos)</div>
          <div className="text-slate-600">/ \ &nbsp; / \ &nbsp; &nbsp; / \ &nbsp; / \</div>
          <div className="text-emerald-400 font-bold">[7][8] [9][10] [11][12] [13][14] (N3: 8 Entrantes)</div>
        </div>

        <div className="space-y-2">
          <div className="p-2.5 bg-amber-950/40 border border-amber-500/40 rounded-xl flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0">
              0
            </div>
            <div>
              <div className="font-bold text-amber-200 text-xs">Nível 0 · 1 Tronco Central (Posição 0)</div>
              <div className="text-[11px] text-slate-300 mt-0.5 leading-relaxed text-balance">
                O <em>Participante da Vez</em> que recebe as sementes da rodada. Ao completar as 8 vagas externas, conclui seu ciclo vitorioso.
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-sky-950/40 border border-sky-500/40 rounded-xl flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-sky-500 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <div className="font-bold text-sky-200 text-xs">Nível 1 · 2 Guardiões Primários (Posições 1 e 2)</div>
              <div className="text-[11px] text-slate-300 mt-0.5 leading-relaxed text-balance">
                Na divisão da árvore, a posição #1 torna-se o novo Tronco da filha esquerda e a posição #2 torna-se o novo Tronco da filha direita.
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-indigo-950/40 border border-indigo-500/40 rounded-xl flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-indigo-500 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0">
              4
            </div>
            <div>
              <div className="font-bold text-indigo-200 text-xs">Nível 2 · 4 Sub-ramos (Posições 3, 4, 5 e 6)</div>
              <div className="text-[11px] text-slate-300 mt-0.5 leading-relaxed text-balance">
                Participantes em avanço que sobem para o Nível 1 (Guardiões) na próxima bifurcação da árvore.
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-emerald-950/50 border border-emerald-500/50 rounded-xl flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0">
              8
            </div>
            <div>
              <div className="font-bold text-emerald-300 text-xs">Nível 3 · 8 Vagas Externas de Entrada (Posições 7 a 14)</div>
              <div className="text-[11px] text-slate-300 mt-0.5 leading-relaxed text-balance">
                <strong>O ponto de entrada exclusivo:</strong> Todas as pessoas recém-chegadas entram aqui ao transferir suas 25 sementes.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Regra de Ouro: Princípio Fundamental de Entrada */}
      <div className="bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-900 border-2 border-amber-500/60 rounded-2xl p-4 space-y-2.5 shadow-xl">
        <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="uppercase tracking-wider">Regra Fundamental: Entrada Somente no Nível 3</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed text-balance">
          Uma árvore em ciclo normal <strong>NÃO recebe novos participantes nas posições 1 a 6</strong>.
        </p>
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1.5">
          <p className="text-balance">
            • <strong>Posições 1–6 são de PROGRESSÃO</strong> conquistadas exclusivamente através da divisão de árvores.
          </p>
          <p className="text-balance">
            • Novos participantes entram <strong>EXCLUSIVAMENTE nas 8 posições externas: 7, 8, 9, 10, 11, 12, 13 e 14</strong>.
          </p>
          <p className="text-balance text-amber-300 font-medium">
            • Quem confirma a transferência de sementes antes garante a menor vaga disponível (da esquerda para a direita).
          </p>
        </div>
      </div>

      {/* Fechamento do Ciclo e Mapeamento da Bifurcação */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
            <Network className="w-4 h-4 text-emerald-400" />
            <span>Fechamento do Ciclo & Bifurcação em 2 Árvores</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Divisão Atômica</span>
        </div>

        <p className="text-[11px] text-slate-300 leading-relaxed text-balance">
          Quando a 14ª vaga externa é ocupada (totalizando 15 participantes), o ciclo da árvore mãe termina imediatamente e ela <strong>bifurca em duas novas árvores completas</strong>:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Filha Esquerda */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
              <strong className="text-sky-300">Árvore Filha Esquerda</strong>
              <span className="text-[9px] font-mono text-slate-500">7 Promovidos</span>
            </div>
            <ul className="text-[10px] space-y-1 text-slate-300">
              <li>• <strong>Novo Tronco [0]:</strong> Antigo #1</li>
              <li>• <strong>Novo Nível 1 [1, 2]:</strong> Antigos #3 e #4</li>
              <li>• <strong>Novo Nível 2 [3..6]:</strong> Antigos #7, #8, #9 e #10</li>
              <li className="text-emerald-400 font-bold">• <strong>Novas Posições 7..14:</strong> 100% VAZIAS</li>
            </ul>
          </div>

          {/* Filha Direita */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
              <strong className="text-emerald-300">Árvore Filha Direita</strong>
              <span className="text-[9px] font-mono text-slate-500">7 Promovidos</span>
            </div>
            <ul className="text-[10px] space-y-1 text-slate-300">
              <li>• <strong>Novo Tronco [0]:</strong> Antigo #2</li>
              <li>• <strong>Novo Nível 1 [1, 2]:</strong> Antigos #5 e #6</li>
              <li>• <strong>Novo Nível 2 [3..6]:</strong> Antigos #11, #12, #13 e #14</li>
              <li className="text-emerald-400 font-bold">• <strong>Novas Posições 7..14:</strong> 100% VAZIAS</li>
            </ul>
          </div>
        </div>

        <div className="p-2.5 bg-amber-950/30 border border-amber-500/30 rounded-xl text-[11px] text-amber-200 text-balance leading-relaxed">
          👑 <strong>Conclusão do Tronco:</strong> O antigo Tronco (posição 0) conclui com louvor seu ciclo completo e não é inserido em nenhuma das duas filhas. A árvore original passa ao status de <em>concluída</em>.
        </div>
      </div>

      {/* A Jornada de Progressão do Membro */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>A Jornada de Progressão (Passo a Passo)</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3 p-2 bg-slate-950 rounded-xl border border-slate-800 text-[11px]">
            <span className="w-6 h-6 rounded-full bg-emerald-600/30 text-emerald-400 font-bold flex items-center justify-center shrink-0">
              1
            </span>
            <span className="text-slate-300 text-balance">
              <strong>Entrada no Nível 3:</strong> Você entra numa das 8 vagas externas (7 a 14) e fortalece o tronco.
            </span>
          </div>

          <div className="flex items-center gap-3 p-2 bg-slate-950 rounded-xl border border-slate-800 text-[11px]">
            <span className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 font-bold flex items-center justify-center shrink-0">
              2
            </span>
            <span className="text-slate-300 text-balance">
              <strong>1ª Divisão da Árvore:</strong> Com a árvore cheia, ela bifurca e você sobe automaticamente para o <strong>Nível 2</strong>.
            </span>
          </div>

          <div className="flex items-center gap-3 p-2 bg-slate-950 rounded-xl border border-slate-800 text-[11px]">
            <span className="w-6 h-6 rounded-full bg-sky-600/30 text-sky-400 font-bold flex items-center justify-center shrink-0">
              3
            </span>
            <span className="text-slate-300 text-balance">
              <strong>2ª Divisão da Árvore:</strong> A nova árvore atinge 15 e bifurca novamente; você sobe para o <strong>Nível 1 (Guardião)</strong>.
            </span>
          </div>

          <div className="flex items-center gap-3 p-2 bg-slate-950 rounded-xl border border-slate-800 text-[11px]">
            <span className="w-6 h-6 rounded-full bg-amber-500/30 text-amber-400 font-bold flex items-center justify-center shrink-0">
              4
            </span>
            <span className="text-slate-300 text-balance">
              <strong>3ª Divisão da Árvore:</strong> Você assume o <strong>Tronco Central (posição 0)</strong> da sua própria árvore filha!
            </span>
          </div>

          <div className="flex items-center gap-3 p-2 bg-slate-950 rounded-xl border border-slate-800 text-[11px]">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center shrink-0">
              ✓
            </span>
            <span className="text-slate-300 text-balance">
              <strong>Conclusão do Ciclo:</strong> Sua árvore como Tronco recebe as 8 contribuições externas e conclui o ciclo vitorioso!
            </span>
          </div>
        </div>
      </div>

      {/* FAQ Comunitário */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <span>Perguntas Frequentes (FAQ)</span>
        </div>

        <div className="space-y-2 text-[11px]">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <strong className="text-slate-100 block">Preciso pagar algum valor ou taxa?</strong>
            <span className="text-slate-400 text-balance block leading-relaxed">
              Não. O Arboris é um jogo comunitário e recreativo. Não aceita dinheiro, depósitos bancários, PIX ou saques. Todas as sementes são pontos virtuais internos.
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <strong className="text-slate-100 block">Como funciona o link de indicação?</strong>
            <span className="text-slate-400 text-balance block leading-relaxed">
              Cada participante possui um link criptográfico exclusivo. Ao convidar amigos, eles são direcionados para a mesma árvore ativa em que você estiver posicionado.
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <strong className="text-slate-100 block">O que acontece quando o Tronco conclui?</strong>
            <span className="text-slate-400 text-balance block leading-relaxed">
              O participante celebra a conclusão vitoriosa daquele ciclo. A árvore se divide em duas e ele pode, se desejar, iniciar um novo ciclo em outra árvore do sistema.
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // 0. PÁGINA PÚBLICA PRINCIPAL (LANDING EXPLICATIVA)
  // ==========================================
  if (showLandingPage) {
    return (
      <PublicLandingPage
        onOpenEntry={() => {
          setShowLandingPage(false);
          setIsLocked(true);
        }}
        onOpenDemoTree={() => {
          setShowLandingPage(false);
          setIsLocked(false);
          setCurrentView('public');
        }}
        onOpenDirectLogin={() => {
          setShowLandingPage(false);
          setIsLocked(false);
          setShowDirectLoginModal(true);
        }}
        referralData={validatedIndicadorData ? {
          username: validatedIndicadorData.username,
          full_name: validatedIndicadorData.full_name,
          tree_code: validatedIndicadorData.tree_code
        } : null}
      />
    );
  }

  // ==========================================
  // 1. TELA DE BLOQUEIO DE ENTRADA (LOCK SCREEN)
  // ==========================================
  if (isLocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans antialiased">
        {toastMessage && (
          <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[92%] bg-slate-900 border border-emerald-500/80 text-slate-100 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs animate-in fade-in slide-in-from-top-2">
            <span className="text-emerald-400 font-bold shrink-0">✓</span>
            <span className="leading-snug break-words">{toastMessage}</span>
          </div>
        )}

        <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 relative overflow-hidden">
            {/* Ambient Glow */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

            {/* Header / Brand */}
            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowLandingPage(true);
                  setIsLocked(false);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 font-medium transition py-1 px-2.5 rounded-lg hover:bg-slate-800/60 mb-1"
              >
                ← Voltar para a Página Explicativa
              </button>

              <div className="w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-2xl mx-auto shadow-inner text-emerald-400">
                🌲
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-100">
                ARBORIS
              </h1>
              <div className="text-[11px] text-slate-400 uppercase tracking-widest font-mono">
                Comunidade Independente
              </div>
            </div>

            {/* Error Message if any */}
            {lockError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-200 flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-snug break-words">{lockError}</span>
              </div>
            )}

            {/* STEP 1: DIGITAR USUÁRIO DO INDICADOR (APENAS QUANDO AINDA NÃO TEM INDICADOR) */}
            {!validatedIndicadorData ? (
              <div className="space-y-4">
                {/* Centered Responsive Instruction box */}
                <div className="p-4 sm:p-5 bg-slate-950/80 border border-slate-800 rounded-2xl text-center space-y-2.5 w-full">
                  <div className="flex flex-col items-center justify-center gap-2 text-center w-full">
                    <Lock className="w-5 h-5 text-amber-400 shrink-0" />
                    <p className="text-xs sm:text-sm font-bold text-amber-300 text-center leading-normal break-words max-w-full text-balance px-1">
                      Para continuar digite o usuário que aparece no meio da árvore ao qual você faz parte lá no grupo.
                    </p>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-400 text-center leading-relaxed break-words max-w-full text-balance px-1">
                    (o indicador representa a árvore: digite o usuário da pessoa que está no centro da árvore ativa)
                  </p>
                </div>

                <form onSubmit={handleValidateIndicador} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Identificador da Árvore (Pessoa no Centro da Árvore):
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">
                        @
                      </span>
                      <input
                        type="text"
                        autoFocus
                        required
                        autoCapitalize="none"
                        autoComplete="off"
                        placeholder="usuario"
                        value={indicadorInput}
                        onChange={(e) => setIndicadorInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-400 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={validatingIndicador}
                    className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg text-balance"
                  >
                    {validatingIndicador ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <Unlock className="w-4 h-4 text-slate-950" />
                    )}
                    <span>{validatingIndicador ? 'Validando Indicador...' : 'Validar Indicador e Continuar'}</span>
                  </button>
                </form>

                {/* Direct Login for already registered community members ONLY on Step 1 */}
                <div className="pt-3 border-t border-slate-800 text-center space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowDirectLoginModal(true)}
                    className="text-[11px] text-slate-400 hover:text-emerald-400 transition text-balance block w-full"
                  >
                    Já faz parte da comunidade? <strong className="underline text-slate-200">Clique para acessar sua conta</strong>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRulesModal(true)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-medium transition flex items-center justify-center gap-1.5 mx-auto py-1"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Conhecer Regras e Dinâmica 1–2–4–8</span>
                  </button>
                </div>
              </div>
            ) : (
              /* STEP 2: PREENCHER NOME, SOBRENOME E NÚMERO DE TELEFONE COM MÁSCARA */
              <form onSubmit={handleUnlockAndRegister} className="space-y-3.5 animate-in fade-in slide-in-from-bottom-2">
                {/* Clean Indicator Banner without duplicated text and WITHOUT button 'Trocar' */}
                <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/50 rounded-2xl text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-300 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Indicador Confirmado na Árvore</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-200">
                    {validatedIndicadorData.full_name} (@{validatedIndicadorData.username})
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Centro da Árvore: <strong>{validatedIndicadorData.tronco_full_name}</strong> · {validatedIndicadorData.tree_code}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">Nome</label>
                    <input
                      type="text"
                      required
                      autoCapitalize="words"
                      autoComplete="given-name"
                      placeholder="ex: Carlos"
                      value={formFirstName}
                      onChange={(e) => setFormFirstName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">Sobrenome</label>
                    <input
                      type="text"
                      required
                      autoCapitalize="words"
                      autoComplete="family-name"
                      placeholder="ex: Ferreira"
                      value={formLastName}
                      onChange={(e) => setFormLastName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Sementes box 100% centered */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[10px] text-slate-300 text-center leading-relaxed">
                  🌱 Você receberá <strong>25 sementes gratuitas</strong> no cadastro para fortalecer o tronco e garantir sua posição na ramificação.
                </div>

                <button
                  type="submit"
                  disabled={submittingAccess}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg text-balance"
                >
                  {submittingAccess ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Check className="w-4 h-4 text-white" />
                  )}
                  <span>{submittingAccess ? 'Liberando Acesso...' : 'Confirmar e Ingressar na Comunidade'}</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Modal: Direct Login for Existing Members */}
        {showDirectLoginModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Acesso de Membro da Comunidade</span>
                </h3>
                <button
                  onClick={() => setShowDirectLoginModal(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-[11px] text-slate-400 text-balance leading-relaxed">
                  Selecione sua conta cadastrada para acessar diretamente sua árvore:
                </p>

                {allUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setCurrentUser(u);
                      setIsLocked(false);
                      setShowLandingPage(false);
                      setCurrentView(u.role === 'admin' ? 'admin' : 'member');
                      setShowDirectLoginModal(false);
                      showToast(`✓ Acesso autorizado: ${u.full_name}`);
                    }}
                    className="w-full p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center justify-between transition"
                  >
                    <div>
                      <div className="font-bold text-slate-100">{u.full_name}</div>
                      <div className="text-[10px] text-slate-400">@{u.username}</div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">{u.balance} sementes</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Regras e Como Funciona na Tela de Bloqueio */}
        {showRulesModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    📖
                  </div>
                  <h3 className="text-sm font-bold text-slate-100">Regras Oficiais & Dinâmica 1–2–4–8</h3>
                </div>
                <button
                  onClick={() => setShowRulesModal(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 overflow-y-auto space-y-4">
                {renderRulesContent()}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // 2. APLICAÇÃO DESBLOQUEADA (ÁREA DO MEMBRO / ADMIN / PÚBLICA)
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[92%] bg-slate-900 border border-emerald-500/80 text-slate-100 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs animate-in fade-in slide-in-from-top-2">
          <span className="text-emerald-400 font-bold shrink-0">✓</span>
          <span className="leading-snug break-words">{toastMessage}</span>
        </div>
      )}

      {/* Main App Container */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col bg-slate-950 border-x border-slate-900 shadow-2xl relative pb-20">
        
        {/* Top App Bar & Navigation */}
        <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-sm shadow-sm">
                🌲
              </div>
              <div>
                <span className="font-bold text-slate-100 text-sm tracking-wide block leading-none">ARBORIS</span>
                <span className="text-[10px] text-slate-400 leading-tight">Comunidade de 15 Posições & Sementes</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Lock screen / Exit button */}
              <button
                onClick={() => {
                  setIsLocked(true);
                  showToast('Tela de bloqueio ativada.');
                }}
                title="Bloquear Acesso / Tela Inicial"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs flex items-center gap-1 transition"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="text-[10px]">Bloquear</span>
              </button>

              <button
                onClick={() => fetchState(false)}
                title="Recarregar dados"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => {
                  fetchState(true);
                  showToast('✓ Dados recarregados diretamente dos arquivos JSON estáticos!');
                }}
                title="Restaurar dados originais dos arquivos JSON do repositório"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[10px]">Reset JSON</span>
              </button>

              <button
                onClick={() => setShowLandingPage(true)}
                title="Página pública explicativa sobre as regras e dinâmica do jogo"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs flex items-center gap-1 transition"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[10px]">Como Funciona</span>
              </button>
            </div>
          </div>

          {/* Contextual Role & View Switcher */}
          <div className="hidden">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full">
              <button
                onClick={() => setCurrentView('member')}
                className={`flex-1 py-1 rounded-lg font-medium transition text-center flex items-center justify-center gap-1 ${
                  currentView === 'member'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3 h-3" />
                <span>Membro</span>
              </button>

              <button
                onClick={() => setCurrentView('public')}
                className={`flex-1 py-1 rounded-lg font-medium transition text-center flex items-center justify-center gap-1 ${
                  currentView === 'public'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                <span>Regras</span>
              </button>

              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => setCurrentView('admin')}
                  className={`flex-1 py-1 rounded-lg font-medium transition text-center flex items-center justify-center gap-1 ${
                    currentView === 'admin'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Shield className="w-3 h-3" />
                  <span>Organização</span>
                </button>
              )}
            </div>
          </div>

          {/* Member Profile Banner without dropdown */}
          {currentView === 'member' && currentUser && (
            <div className="flex items-center justify-between bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-[10px]">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-emerald-400 font-bold">Membro:</span>
                <span className="text-slate-200 font-medium truncate">{currentUser.full_name || currentUser.username}</span>
                <span className="text-slate-500">·</span>
                <span className="text-emerald-400 font-mono font-bold flex items-center gap-0.5">
                  <Sprout className="w-3 h-3" />
                  <span>{currentUser.balance} sementes</span>
                </span>
              </div>
            </div>
          )}
        </header>

        {/* Dynamic View Content */}
        <div className="flex-1 p-4 space-y-4">
          
          {/* ======================================================== */}
          {/* VIEW: PAINEL DO MEMBRO */}
          {/* ======================================================== */}
          {currentView === 'member' && currentUser && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Member Sub-Navigation */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setMemberTab('my_tree')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition text-center flex items-center justify-center gap-1.5 ${
                    memberTab === 'my_tree' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Trees className="w-3.5 h-3.5" />
                  <span>Minha Árvore</span>
                </button>

                <button
                  onClick={() => setMemberTab('marketing')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition text-center flex items-center justify-center gap-1.5 ${
                    memberTab === 'marketing' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Divulgação</span>
                </button>

                <button
                  onClick={() => setMemberTab('wallet')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition text-center flex items-center justify-center gap-1.5 ${
                    memberTab === 'wallet' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sprout className="w-3.5 h-3.5" />
                  <span>Sementes</span>
                </button>
              </div>

              {/* SUB-TAB A: MINHA ÁRVORE */}
              {memberTab === 'my_tree' && (
                <div className="space-y-4">
                  {/* Tree Overview & Status */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono text-emerald-400 font-bold">{memberTree?.tree_code}</div>
                      <div className="text-[10px] text-slate-400">
                        {memberTree?.category_name} · Ciclo #{memberTree?.cycle_number}
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-slate-400 text-[10px]">Ocupação:</div>
                      <span className="font-bold text-emerald-400 text-sm">{treeOccupancy}/15</span>
                    </div>
                  </div>

                  {/* CRUCIAL GAME MECHANIC CARD:
                      A pessoa só entra, só aparece na ramificação depois que ela clicar no botão.
                      Enquanto ela não clicar ela está fora! Quem clicar antes fica numa posição muito melhor! */}
                  {!isUserPositioned && currentUser.balance >= 25 && (
                    <div className="bg-gradient-to-br from-amber-950/70 via-slate-900 to-emerald-950/60 border-2 border-amber-400 rounded-2xl p-4 space-y-3 shadow-2xl relative overflow-hidden animate-in fade-in">
                      <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                        <Zap className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                        <span className="uppercase tracking-wider">Aguardando Sua Ativação na Árvore</span>
                      </div>

                      <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 text-[11px] text-slate-300 leading-relaxed space-y-2">
                        <p className="text-balance">
                          <strong>Atenção:</strong> Você possui <strong>25 sementes</strong> concedidas no cadastro, mas <strong>ainda não está posicionado na ramificação</strong>.
                        </p>
                        <p className="text-emerald-300 font-medium text-balance">
                          ⚡ Você só entra e aparece na árvore no momento em que clicar no botão abaixo. Se outra pessoa estiver fazendo o mesmo procedimento e clicar antes de você, <strong>ela garantirá uma posição muito melhor na árvore</strong>!
                        </p>
                      </div>

                      {/* THE EXACT BUTTON REQUESTED */}
                      <button
                        onClick={() => handleStrengthenTronco(currentUser.id, memberTree.id)}
                        disabled={activatingTronco}
                        className="w-full bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-xl text-balance"
                      >
                        {activatingTronco ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        ) : (
                          <Sprout className="w-4 h-4 text-slate-950" />
                        )}
                        <span>Transferir 25 Sementes para fortalecer o tronco</span>
                      </button>

                      <div className="text-[10px] text-center text-slate-400">
                        Destinatário do tronco atual: <strong>{memberTree?.tronco_full_name} (@{memberTree?.tronco_username})</strong>
                      </div>
                    </div>
                  )}

                  {/* RENDER MODEL (Árvore Radial) */}
                  {renderActiveModel(memberPositions, currentUser.id)}

                  {/* If user is already positioned in tree */}
                  {isUserPositioned && (
                    <div className="space-y-2">
                      <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div>
                            <span className="font-bold text-emerald-300">Posição Ativa na Árvore:</span>
                            <span className="text-slate-300 ml-1">
                              Você ocupa a <strong>vaga #{currentUser.current_position_index}</strong> ({
                                currentUser.current_position_index === 0
                                  ? 'Nível 0 · Tronco'
                                  : currentUser.current_position_index! <= 2
                                  ? 'Nível 1 · Guardião'
                                  : currentUser.current_position_index! <= 6
                                  ? 'Nível 2 · Sub-ramo'
                                  : 'Nível 3 · Folha Externa'
                              }).
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 shrink-0">
                          CONFIRMADO
                        </span>
                      </div>

                      {/* Contextual Progression Card */}
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200 flex items-center gap-1.5 text-[11px]">
                            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                            <span>Sua Progressão na Dinâmica 1–2–4–8</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            Faltam {slotsRemaining} vagas externas
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 leading-relaxed">
                          {currentUser.current_position_index === 0 && (
                            <span>
                              👑 <strong>Você é o Tronco da Vez:</strong> Quando todas as 8 vagas externas (7 a 14) forem preenchidas, você concluirá vitoriosamente seu ciclo e a árvore se dividirá em duas!
                            </span>
                          )}
                          {(currentUser.current_position_index === 1 || currentUser.current_position_index === 2) && (
                            <span>
                              🛡️ <strong>Você está no Nível 1 (Guardião):</strong> Na próxima divisão desta árvore, você será promovido a <strong>TRONCO (Centro)</strong> da árvore filha {currentUser.current_position_index === 1 ? 'Esquerda' : 'Direita'}!
                            </span>
                          )}
                          {currentUser.current_position_index! >= 3 && currentUser.current_position_index! <= 6 && (
                            <span>
                              🌱 <strong>Você está no Nível 2 (Sub-ramo):</strong> Na próxima divisão desta árvore, você subirá para o <strong>Nível 1 (Guardião)</strong> e ficará a um passo do Tronco!
                            </span>
                          )}
                          {currentUser.current_position_index! >= 7 && currentUser.current_position_index! <= 14 && (
                            <span>
                              🍃 <strong>Você está no Nível 3 (Folha Externa):</strong> Na próxima divisão desta árvore quando as 8 vagas se completarem, você subirá para o <strong>Nível 2</strong>!
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB B: FERRAMENTAS DE MARKETING DIGITAL DO MEMBRO */}
              {memberTab === 'marketing' && (
                <div className="space-y-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        <span>Desempenho da Minha Divulgação</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Sem ganhos financeiros</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                        <div className="text-[10px] text-slate-400">Cliques</div>
                        <div className="text-base font-bold text-slate-100 font-mono mt-0.5">{memberClicks}</div>
                      </div>
                      <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                        <div className="text-[10px] text-slate-400">Cadastros</div>
                        <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">{memberRegistrations}</div>
                      </div>
                      <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                        <div className="text-[10px] text-slate-400">Conversão</div>
                        <div className="text-base font-bold text-amber-400 font-mono mt-0.5">{conversionRate}%</div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-emerald-950/30 rounded-xl border border-emerald-900/40 text-[11px] text-emerald-300 leading-relaxed text-balance">
                      💡 <strong>Objetivo Comunitário:</strong> Cada amigo convidado informa o identificador da árvore (a pessoa no centro) na tela de bloqueio e entra na base da <strong>sua árvore</strong>. O indicador pertence à árvore, não à pessoa individual.
                    </div>
                  </div>

                  {/* Exclusive Referral Link for Member's Tree */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">Link de Indicação da Sua Árvore</span>
                      <span className="text-[10px] font-mono text-emerald-400">{memberTree?.tree_code}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={referralUrl}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-300"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(referralUrl);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition"
                      >
                        {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Social Media Sharing */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <a
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(marketingPitch)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 p-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-400" />
                        <span>WhatsApp</span>
                      </a>

                      <a
                        href={`https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent('Participe da minha árvore no ecossistema comunitário gratuito Arboris!')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 p-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition"
                      >
                        <Send className="w-4 h-4 text-sky-400" />
                        <span>Telegram</span>
                      </a>
                    </div>
                  </div>

                  {/* Marketing Copywriting Kit */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">Texto de Divulgação Pronto (Copy)</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(marketingPitch);
                          setCopiedPitch(true);
                          setTimeout(() => setCopiedPitch(false), 2000);
                        }}
                        className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        {copiedPitch ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedPitch ? 'Copiado!' : 'Copiar Texto'}</span>
                      </button>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto break-words">
                      {marketingPitch}
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB C: CARTEIRA DE SEMENTES */}
              {memberTab === 'wallet' && (
                <div className="space-y-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Saldo de Sementes</div>
                      <div className="text-2xl font-bold text-emerald-400 font-mono mt-0.5 flex items-center gap-1.5">
                        <Sprout className="w-6 h-6 text-emerald-400" />
                        <span>{currentUser.balance}</span>
                        <span className="text-xs text-slate-400 font-normal">sementes</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 leading-relaxed text-balance">
                        100% comunitário · Sem valor financeiro fiduciário
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xl">
                      🌱
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">Extrato Comunitário (Ledger)</span>
                      <span className="text-[10px] text-slate-500 font-mono">Imutável</span>
                    </div>

                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {(systemState?.ledger || [])
                        .filter((entry: LedgerEntry) => entry.user_id === currentUser.id)
                        .map((entry: LedgerEntry) => (
                          <div key={entry.id} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                            <div>
                              <div className="font-mono text-[10px] text-slate-300 font-medium">
                                {entry.type === 'CONCESSAO_INICIAL_SEMENTES' ? 'CONCESSÃO INICIAL DE SEMENTES' : entry.type}
                              </div>
                              <div className="text-[10px] text-slate-500">{entry.created_at}</div>
                            </div>
                            <div className="text-right">
                              <span className={`font-bold font-mono ${entry.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                              </span>
                              <span className="text-[9px] text-slate-500 block">Saldo: {entry.balance_after}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW: GUIA OFICIAL DE REGRAS */}
          {/* ======================================================== */}
          {currentView === 'public' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {renderRulesContent()}
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW: PAINEL DE ORGANIZAÇÃO (GESTÃO COMUNITÁRIA) */}
          {/* ======================================================== */}
          {currentView === 'admin' && currentUser?.role === 'admin' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-100 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>Organização da Rede Comunitária</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Coordenação Global do Sistema Arboris</div>
                </div>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
                  COORDENADOR
                </span>
              </div>

              {/* Admin Sub-Tabs */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setAdminTab('global_trees')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition text-center flex items-center justify-center gap-1 ${
                    adminTab === 'global_trees' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Trees className="w-3.5 h-3.5" />
                  <span>Árvores</span>
                </button>

                <button
                  onClick={() => setAdminTab('create_user')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition text-center flex items-center justify-center gap-1 ${
                    adminTab === 'create_user' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Criar</span>
                </button>

                <button
                  onClick={() => setAdminTab('members')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition text-center flex items-center justify-center gap-1 ${
                    adminTab === 'members' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Membros</span>
                </button>

                <button
                  onClick={() => setAdminTab('settings')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition text-center flex items-center justify-center gap-1 ${
                    adminTab === 'settings' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Regras</span>
                </button>

                <button
                  onClick={() => setAdminTab('audit')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition text-center flex items-center justify-center gap-1 ${
                    adminTab === 'audit' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Auditoria</span>
                </button>
              </div>

              {/* SUB-TAB: ÁRVORES */}
              {adminTab === 'global_trees' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">Árvores Comunitárias ({allTrees.length})</span>
                    <button
                      onClick={() => setShowCreateTreeModal(true)}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Nova Árvore</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {allTrees.map(tree => {
                      const isSelected = tree.id === selectedAdminTreeId;
                      return (
                        <div
                          key={tree.id}
                          onClick={() => setSelectedAdminTreeId(tree.id)}
                          className={`p-3 rounded-2xl border transition cursor-pointer ${
                            isSelected ? 'bg-amber-950/30 border-amber-500/80 shadow-md' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-mono font-bold text-slate-100">{tree.tree_code}</span>
                            <span className="text-[10px] text-amber-400 font-mono bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/80">
                              {tree.category_name}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <div>
                              <span>Tronco: </span>
                              <strong className="text-slate-200">{tree.tronco_full_name || `@${tree.tronco_username}`}</strong>
                            </div>
                            <div className="font-mono">
                              Ocupação: <strong className="text-emerald-400">{tree.occupied_count || 0}/15</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {adminTree && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200">
                          Explorador da Árvore: <span className="text-amber-400 font-mono">{adminTree.tree_code}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">15 Posições</span>
                      </div>

                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 text-xs">
                        <div className="font-bold text-slate-200 flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-amber-400" />
                          <span>Ações administrativas da árvore</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <button
                            type="button"
                            onClick={() => fetchState(true)}
                            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-2 transition"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Recarregar JSON</span>
                          </button>
                          <button
                            type="button"
                            disabled={adminActionLoading || adminTree.status !== 'active'}
                            onClick={handleArchiveSelectedTree}
                            className="w-full py-2 rounded-xl bg-rose-950/70 hover:bg-rose-900 disabled:opacity-50 border border-rose-800 text-rose-200 font-bold flex items-center justify-center gap-2 transition"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>{adminTree.status === 'active' ? 'Arquivar árvore' : `Status: ${adminTree.status}`}</span>
                          </button>
                        </div>
                        {adminActionMessage && (
                          <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-300 leading-relaxed">
                            {adminActionMessage}
                          </div>
                        )}
                      </div>

                      {renderActiveModel(adminTreePositions)}
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB: CRIAR USUÁRIO */}
              {adminTab === 'create_user' && (
                <div className="space-y-3">
                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-amber-400" />
                      <span>Criar usuário pelo painel</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Use o mesmo passo a passo do cadastro comum: valide o usuário indicador, preencha nome e sobrenome e abra a solicitação online para gravar nos JSONs.
                    </p>
                  </div>

                  <form onSubmit={handleAdminValidateIndicador} className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Usuário indicador</label>
                      <input
                        type="text"
                        value={adminIndicadorInput}
                        onChange={(e) => {
                          setAdminIndicadorInput(e.target.value);
                          setAdminValidatedIndicadorData(null);
                        }}
                        placeholder="username do indicador"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={adminCreateUserLoading}
                      className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-slate-100 font-bold text-xs transition flex items-center justify-center gap-2"
                    >
                      {adminCreateUserLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>Validar indicador</span>
                    </button>
                  </form>

                  {adminValidatedIndicadorData && (
                    <form onSubmit={handleAdminCreateUser} className="p-3.5 bg-slate-900 border border-amber-800/60 rounded-2xl space-y-3">
                      <div className="p-2.5 bg-amber-950/30 border border-amber-800/60 rounded-xl text-[11px] text-amber-100">
                        Indicador validado: <strong>@{adminValidatedIndicadorData.username}</strong> · Árvore <strong>{adminValidatedIndicadorData.tree_code}</strong>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Nome</label>
                          <input
                            type="text"
                            value={adminCreateFirstName}
                            onChange={(e) => setAdminCreateFirstName(e.target.value)}
                            placeholder="Nome do usuário"
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Sobrenome</label>
                          <input
                            type="text"
                            value={adminCreateLastName}
                            onChange={(e) => setAdminCreateLastName(e.target.value)}
                            placeholder="Sobrenome do usuário"
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={adminCreateUserLoading}
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2"
                      >
                        {adminCreateUserLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                        <span>Criar solicitação de usuário</span>
                      </button>
                    </form>
                  )}

                  {adminCreateUserError && (
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-300 leading-relaxed">
                      {adminCreateUserError}
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB: MEMBROS */}
              {adminTab === 'members' && (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-200">
                    Membros Cadastrados ({allUsers.length})
                  </div>

                  <div className="space-y-2">
                    {allUsers.map(user => (
                      <div key={user.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-100">{user.full_name || user.username}</div>
                            <div className="text-[10px] text-slate-400">@{user.username}</div>
                          </div>
                          <div className="text-right font-mono">
                            <span className="font-bold text-emerald-400">{user.balance}</span>
                            <span className="text-[9px] text-slate-500 block">sementes</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px]">
                          <span className={`px-2 py-0.5 rounded font-mono ${
                            user.status === 'active' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}>
                            {user.status === 'active' ? 'Ativo' : 'Suspenso'}
                          </span>

                          {user.id !== 1 && (
                            <button
                              onClick={() => handleToggleUserStatus(user.id)}
                              className="text-slate-400 hover:text-white underline"
                            >
                              {user.status === 'active' ? 'Suspender Membro' : 'Ativar Membro'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB-TAB: REGRAS */}
              {adminTab === 'settings' && (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-200">
                    Parâmetros Comunitários (PENDENTE DE DEFINIÇÃO)
                  </div>

                  <div className="space-y-2 text-xs">
                    {(systemState?.settings || []).map((s: Setting) => (
                      <div key={s.setting_key} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                        <div className="flex items-center justify-between font-mono">
                          <span className="text-slate-300 font-semibold">{s.setting_key}</span>
                          <span className="text-amber-300 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            {s.setting_value}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight">
                          {s.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB-TAB: AUDITORIA */}
              {adminTab === 'audit' && (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-200">
                    Logs de Auditoria em Tempo Real
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {(systemState?.audit || []).map((log: AuditLog) => (
                      <div key={log.id} className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-0.5">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-emerald-400 font-bold">{log.action}</span>
                          <span className="text-slate-500">{log.created_at}</span>
                        </div>
                        <div className="text-[11px] text-slate-300">{log.details}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Node Inspector Bottom Sheet */}
        {selectedNode && (
          <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-md bg-slate-900/95 backdrop-blur border-t border-slate-800 p-4 shadow-2xl z-40 space-y-2 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                  #{selectedNode.position_index}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">
                    {selectedNode.position_index === 0 ? 'Tronco da Árvore' : `Posição #${selectedNode.position_index}`}
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Nível {selectedNode.level} · Lado {selectedNode.side}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded text-xs"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">Participante Ocupante:</span>
                <span className="font-semibold text-slate-200">
                  {selectedNode.status === 'occupied'
                    ? `${selectedNode.full_name || selectedNode.username} (@${selectedNode.username})`
                    : 'Vaga Aberta'}
                </span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                selectedNode.status === 'occupied' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
              }`}>
                {selectedNode.status === 'occupied' ? 'Ocupada' : 'Disponível'}
              </span>
            </div>

            {currentView === 'admin' && currentUser?.role === 'admin' && adminTab === 'global_trees' && adminTree && (
              <div className="p-2.5 bg-slate-950 rounded-xl border border-amber-900/60 text-xs space-y-2">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Ações da posição</span>
                </div>

                {selectedNode.position_index === 0 ? (
                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    O tronco não deve ser removido ou movido por este painel. Para alterar tronco, crie uma nova árvore com o membro correto.
                  </div>
                ) : (
                  <>
                    <select
                      value={adminSelectedUserId}
                      onChange={(e) => setAdminSelectedUserId(parseInt(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-amber-500"
                    >
                      {activeAssignableUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.full_name || user.username} (@{user.username})
                        </option>
                      ))}
                    </select>

                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        disabled={adminActionLoading || activeAssignableUsers.length === 0}
                        onClick={handleAssignSelectedNode}
                        className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black transition flex items-center justify-center gap-2"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Escolher / mover para esta posição</span>
                      </button>

                      {selectedNode.status === 'occupied' && (
                        <button
                          type="button"
                          disabled={adminActionLoading}
                          onClick={handleClearSelectedNode}
                          className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold transition flex items-center justify-center gap-2"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Liberar posição</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Persistent Bottom Bar */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-slate-900/95 backdrop-blur border-t border-slate-800 flex items-center justify-around py-2 px-1 z-40">
          <button
            onClick={() => setCurrentView('member')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
              currentView === 'member' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px]">Membro</span>
          </button>

          <button
            onClick={() => setCurrentView('public')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
              currentView === 'public' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px]">Regras</span>
          </button>

          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setCurrentView('admin')}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
                currentView === 'admin' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-5 h-5" />
              <span className="text-[10px]">Organização</span>
            </button>
          )}
        </nav>
      </div>

      {/* Modal: Admin Create New Tree */}
      {showCreateTreeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Trees className="w-4 h-4 text-amber-400" />
                <span>Criar Nova Árvore Comunitária</span>
              </h3>
              <button
                onClick={() => setShowCreateTreeModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTree} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Categoria da Árvore</label>
                <select
                  value={newTreeCatId}
                  onChange={e => setNewTreeCatId(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                >
                  {(systemState?.categories || []).map((cat: any) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.token_requirement} Sementes)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Participante que Iniciará no Tronco</label>
                <select
                  value={newTreeTroncoId}
                  onChange={e => setNewTreeTroncoId(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                >
                  {allUsers.filter(u => u.id !== 1).map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.username} (@{u.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTreeModal(false)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition text-xs shadow-md"
                >
                  Criar Árvore
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
