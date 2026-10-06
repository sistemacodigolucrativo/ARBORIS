import React, { useState, useEffect } from 'react';
import {
  Trees,
  Sprout,
  DollarSign,
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
  RotateCcw,
  Bell
} from 'lucide-react';
import { dataStore } from './services/dataStore';
import {
  archiveTreeDirect,
  assignPositionDirect,
  clearPositionDirect,
  createTreeDirect,
  createUserDirect,
  deleteTreeDirect,
  deleteUserDirect,
  updateTreeNicknameDirect,
  adminUpdateMemberDirect
} from './services/directAdminActions';
import { TreeBoard } from './components/TreeBoard';
import { PublicLandingPage } from './components/PublicLandingPage';

interface Position {
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
  pixHolderName?: string | null;
  pixKeyType?: 'random' | 'email' | 'phone' | null;
  pixKey?: string | null;
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
  nickname?: string | null;
  display_name?: string | null;
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

interface ActivationRequest {
  id: number;
  requester_user_id: number;
  tronco_user_id: number;
  tree_id: number;
  position_index: number;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  requester_username: string;
  tronco_username: string;
  whatsapp_message?: string | null;
  created_at: string;
  decided_at?: string | null;
  decision_note?: string | null;
}

interface PlantingAssignment {
  id: number;
  drawId: number;
  userId: number;
  username: string;
  treeId: number;
  status: 'pending';
  createdAt: string;
}

interface PlantingBagView {
  balance: number;
  threshold: number;
  selection_count: number;
  entries: Array<{ id: number; userId: number; treeId: number; amount: number; createdAt: string; username?: string }>;
  draws: Array<{ id: number; threshold: number; amountConsumed: number; selectedUserIds: number[]; selectedTreeIds: number[]; createdAt: string }>;
  assignments: PlantingAssignment[];
  updated_at: string | null;
}

type StoredUiState = {
  showLandingPage?: boolean;
  isLocked?: boolean;
  currentView?: 'member' | 'public' | 'admin';
  selectedTreeModel?: number;
  memberTab?: 'my_tree' | 'marketing' | 'wallet';
  adminTab?: 'global_trees' | 'create_user' | 'members' | 'orphans' | 'settings' | 'audit';
  selectedAdminTreeId?: number;
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
  const [showLandingPage, setShowLandingPage] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(() => initialUiState.isLocked ?? false);
  
  // Lock Screen state
  const [indicadorInput, setIndicadorInput] = useState<string>('');
  const [validatingIndicador, setValidatingIndicador] = useState<boolean>(false);
  const [validatedIndicadorData, setValidatedIndicadorData] = useState<any | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);

  // Lock Screen registration fields
  const [formFirstName, setFormFirstName] = useState<string>('');
  const [formLastName, setFormLastName] = useState<string>('');
  const [formPassword, setFormPassword] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [adminCreatePassword, setAdminCreatePassword] = useState('');
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
  const [adminTab, setAdminTab] = useState<'global_trees' | 'create_user' | 'members' | 'orphans' | 'settings' | 'audit'>(() => {
    const stored = initialUiState.adminTab;
    if (stored === 'members') return 'create_user';
    if (stored === 'audit') return 'global_trees';
    return stored === 'global_trees' || stored === 'create_user' || stored === 'orphans' || stored === 'settings' ? stored : 'global_trees';
  });
  
  // Identity comes exclusively from the authenticated server session.
  const [currentUser, setCurrentUser] = useState<User | null>(null);

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
  const [showDirectLoginModal, setShowDirectLoginModal] = useState<boolean>(true);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  // Create tree form (organizador)
  const [newTreeCatId, setNewTreeCatId] = useState<number>(1);
  const [newTreeSeeds, setNewTreeSeeds] = useState<number>(25);
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
  const [showAdminCreateMemberForm, setShowAdminCreateMemberForm] = useState<boolean>(false);
  const [adminMembersPage, setAdminMembersPage] = useState<number>(1);
  const [adminMembersPageSize, setAdminMembersPageSize] = useState<number>(10);
  const [adminEditingMemberId, setAdminEditingMemberId] = useState<number | null>(null);
  const [adminEditName, setAdminEditName] = useState<string>('');
  const [adminEditUsername, setAdminEditUsername] = useState<string>('');
  const [adminEditPixHolderName, setAdminEditPixHolderName] = useState<string>('');
  const [adminEditPixKeyType, setAdminEditPixKeyType] = useState<'random' | 'email' | 'phone'>('random');
  const [adminEditPixKey, setAdminEditPixKey] = useState<string>('');
  const [pixHolderName, setPixHolderName] = useState<string>('');
  const [pixKeyType, setPixKeyType] = useState<'random' | 'email' | 'phone'>('random');
  const [pixKey, setPixKey] = useState<string>('');
  const [pixSaving, setPixSaving] = useState<boolean>(false);
  const [activationModalData, setActivationModalData] = useState<any | null>(null);
  const [activationRequestLoading, setActivationRequestLoading] = useState<boolean>(false);
  const [showPlantingAlertLog, setShowPlantingAlertLog] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const applyDirectAdminState = async (_res: any) => { await fetchState(true); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginLoading(true); setLoginError('');
    try {
      await dataStore.login(loginUsername.trim(), loginPassword);
      const view = dataStore.getSystemStateView();
      const user = view?.users.find(u => u.id === dataStore.getSessionUser()?.id);
      if (!user) throw new Error('Não foi possível confirmar sua sessão.');
      setCurrentUser(user); setSystemState(view); setLoginPassword('');
      setShowDirectLoginModal(false); setShowLandingPage(false); setIsLocked(false);
      setCurrentView(user.role === 'admin' ? 'admin' : 'member'); setLoadError('');
    } catch (error: any) { setLoginError(error.message); }
    finally { setLoginLoading(false); }
  };
  const handleLogout = async () => {
    try {
      await dataStore.logout(); setCurrentUser(null); setSystemState(null);
      setShowLandingPage(false); setShowDirectLoginModal(true); setIsLocked(false); setCurrentView('member');
    } catch (error: any) { showToast(error.message); }
  };

  const fetchState = async (forceReloadFromJson = false) => {
    try {
      setLoading(true);
      await dataStore.loadState(forceReloadFromJson);
      setLoadError('');
      const stateView = dataStore.getSystemStateView();
      if (stateView) {
        setSystemState(stateView);
        const fresh = stateView.users.find((u: User) => u.id === dataStore.getSessionUser()?.id);
        setCurrentUser(fresh || null);
        if (fresh) setShowDirectLoginModal(false);
        if (!fresh) setCurrentView('public');
      }
    } catch (e: any) {
      setLoadError(e.message);
      setSystemState(null);
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
      selectedAdminTreeId
    });
  }, [showLandingPage, isLocked, currentView, selectedTreeModel, memberTab, adminTab, selectedAdminTreeId, currentUser]);

  useEffect(() => {
    if (currentUser?.role === 'admin' && currentView === 'member') {
      setCurrentView('admin');
    }
  }, [currentUser, currentView]);

  useEffect(() => {
    setPixHolderName(currentUser?.pixHolderName || currentUser?.full_name || '');
    setPixKeyType(currentUser?.pixKeyType || 'random');
    setPixKey(currentUser?.pixKey || '');
  }, [currentUser?.id, currentUser?.pixHolderName, currentUser?.pixKeyType, currentUser?.pixKey, currentUser?.full_name]);

  useEffect(() => {
    try {
      for (const key of ['arboris_game_state_v1', 'arboris_current_user_v1', 'arboris_admin_execution_key_v1', 'arboris_github_fine_grained_token_v1']) localStorage.removeItem(key);
    } catch { /* Storage can be disabled; authentication does not depend on it. */ }
    const expired = () => { setCurrentUser(null); setSystemState(null); setShowDirectLoginModal(true); setCurrentView('member'); };
    window.addEventListener('arboris-session-expired', expired);
    return () => window.removeEventListener('arboris-session-expired', expired);
  }, []);

  useEffect(() => {
    fetchState();

    // Check if user accessed via referral link (query param ?ref=... or /ref/...)
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref') || (window.location.pathname.includes('/ref/') ? window.location.pathname.split('/ref/')[1] : null);
    if (refParam) {
      dataStore.loadState().then(async () => {
        const val = await dataStore.validateIndicador(refParam);
        if (val.success && val.data) {
          setValidatedIndicadorData(val.data);
          setShowLandingPage(false);
          setShowDirectLoginModal(false);
          setIsLocked(true); // Direct to step 2 (fill in data)
          showToast(`✓ Link de indicação aceito! Preencha seus dados para entrar.`);
        }
      }).catch((error: any) => setLockError(error.message));
    }
  }, []);

  // Enter via referral link (passes directly to data entry without typing @)
  const handleEnterViaReferralLink = async (tokenToUse?: string) => {
    const token = tokenToUse || activeReferralToken;
    setValidatingIndicador(true);
    setLockError(null);
    try {
      const val = await dataStore.validateIndicador(token);
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
      const val = await dataStore.validateIndicador(indicadorInput.trim());
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
        lastName: formLastName.trim(),
        password: formPassword
      });
      if (res.success && res.result) {
        setLoginUsername(res.result.user.username);
        setFormPassword(''); setLoginPassword('');
        setLoginError(`Cadastro concluído. Seu usuário é ${res.result.user.username}. Entre com a senha escolhida.`);
        setShowDirectLoginModal(true);
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
      const val = await dataStore.validateIndicador(adminIndicadorInput.trim());
      if (val.success && val.data) {
        setAdminValidatedIndicadorData(val.data);
        showToast(`✓ Indicador validado: @${val.data.username}`);
      } else {
          setAdminCreateUserError(val.error || 'Indicador inválido.');
      }
    } catch (err: any) {
      setAdminCreateUserError('Erro ao validar indicador: ' + err.message);
    } finally {
      setAdminCreateUserLoading(false);
    }
  };


const handleAdminCreateUser = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!adminCreateFirstName.trim() || !adminCreateLastName.trim()) {
    setAdminCreateUserError('Preencha nome e sobrenome do novo usuário.');
    return;
  }
  if (currentUser?.role !== 'admin') {
    setAdminCreateUserError('Somente o coordenador pode criar usuário pelo painel administrativo.');
    return;
  }

  setAdminCreateUserLoading(true);
  setAdminCreateUserError(null);
  try {
    const res = await createUserDirect({
      firstName: adminCreateFirstName.trim(),
      lastName: adminCreateLastName.trim(),
      password: adminCreatePassword,
      actorUserId: currentUser.id,
      actorUsername: currentUser.username
    });

    if (res.success) {
      await applyDirectAdminState(res);
      showToast(`Usuário criado: @${res.result.user.username}.`);
      setAdminCreateUserError(null);
      setAdminCreateFirstName('');
      setAdminCreateLastName('');
      setAdminCreatePassword('');
    } else {
      setAdminCreateUserError(res.error || 'Falha ao criar usuário pelo painel administrativo.');
    }
  } catch (err: any) {
    setAdminCreateUserError('Erro ao criar usuário: ' + err.message);
  } finally {
    setAdminCreateUserLoading(false);
  }
};



const openAdminMemberEditor = (user: User) => {
  setAdminEditingMemberId(user.id);
  setAdminEditName(user.full_name || user.username);
  setAdminEditUsername(user.username);
  setAdminEditPixHolderName(user.pixHolderName || '');
  setAdminEditPixKeyType(user.pixKeyType || 'random');
  setAdminEditPixKey(user.pixKey || '');
  setAdminActionMessage(null);
};

const handleAdminUpdateMember = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!adminEditingMemberId) return;
  if (currentUser?.role !== 'admin') {
    showToast('Erro: somente o coordenador pode editar membros.');
    return;
  }
  if (!adminEditName.trim() || !adminEditUsername.trim()) {
    showToast('Informe nome e arroba do membro.');
    return;
  }

  setAdminActionLoading(true);
  setAdminActionMessage(null);
  try {
    const hasPix = Boolean(adminEditPixHolderName.trim() || adminEditPixKey.trim());
    const res = await adminUpdateMemberDirect({
      userId: adminEditingMemberId,
      name: adminEditName.trim(),
      username: adminEditUsername.trim(),
      pixHolderName: hasPix ? adminEditPixHolderName.trim() : '',
      pixKeyType: hasPix ? adminEditPixKeyType : null,
      pixKey: hasPix ? adminEditPixKey.trim() : '',
      actorUserId: currentUser.id,
      actorUsername: currentUser.username
    });
    if (res.success) {
      await applyDirectAdminState(res);
      setAdminEditingMemberId(null);
      setAdminActionMessage('Dados do membro atualizados.');
      showToast('Dados do membro atualizados.');
    } else {
      const error = res.error || 'Não foi possível atualizar o membro.';
      setAdminActionMessage(error);
      showToast('Erro: ' + error);
    }
  } catch (e: any) {
    setAdminActionMessage('Erro ao atualizar membro: ' + e.message);
    showToast('Erro: ' + e.message);
  } finally {
    setAdminActionLoading(false);
  }
};

  const handleReserveTreeEntry = async (treeId: number) => {
    if (currentUser?.role === 'admin') {
      showToast('Ação bloqueada: coordenador não participa deste fluxo.');
      return;
    }
    setActivatingTronco(true);
    try {
      const res = await dataStore.reserveTreeEntryAction(treeId);
      if (res.success && res.result) {
        await fetchState(true);
        showToast(`− ${res.result.amountConsumed} Sementes. Sua vaga na árvore está reservada.`);
      } else {
        showToast('Falha: ' + (res.error || 'Não foi possível reservar sua vaga.'));
      }
    } catch (e: any) {
      showToast('Erro: ' + e.message);
    } finally {
      setActivatingTronco(false);
    }
  };

  // ATOMIC POSITION CLAIM & STRENGTHENING:
  // "Transferir 25 Sementes para fortalecer o tronco"
  // The member enters and appears in the tree ONLY AFTER clicking this button!
  const handleStrengthenTronco = async (_userId: number, _treeId: number) => {
    if (currentUser?.role === 'admin') {
      showToast('Ação bloqueada: coordenador não participa deste fluxo.');
      return;
    }
    handleOpenActivationModal();
  };



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
    const troncoPosition = memberPositions.find(p => p.position_index === 0 && p.user_id);
    const troncoUserId = troncoPosition?.user_id || memberTree.tronco_user_id;
    const tronco = allUsers.find(u => u.id === troncoUserId);
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

const handleCreateTree = async (e: React.FormEvent) => {
  e.preventDefault();
  if (currentUser?.role !== 'admin') {
    showToast('Erro: somente o coordenador pode criar árvore pelo painel administrativo.');
    return;
  }
  if (currentView !== 'admin' || adminTab !== 'global_trees') {
    showToast('Erro: a criação de árvore deve ser feita em Organização > Árvores.');
    return;
  }

  const treeSeeds = Number(newTreeSeeds);
  if (!Number.isInteger(treeSeeds) || treeSeeds <= 0 || treeSeeds > 1000000) {
    showToast('Informe uma quantidade de sementes válida para a árvore.');
    return;
  }

  const categories = systemState?.categories || [];
  const matchedCategory = categories.find((cat: any) => Number(cat.token_requirement) === treeSeeds);
  const categoryId = matchedCategory?.id || categories[0]?.id || newTreeCatId;

  setAdminActionLoading(true);
  setAdminActionMessage(null);
  try {
    const res = await createTreeDirect({
      categoryId,
      tokenRequirement: treeSeeds,
      troncoUserId: newTreeTroncoId,
      actorUserId: currentUser.id,
      actorUsername: currentUser.username
    });

    if (res.success) {
      await applyDirectAdminState(res);
      const treeId = (res.result as any)?.tree?.id;
      if (treeId) setSelectedAdminTreeId(treeId);
      setShowCreateTreeModal(false);
      setAdminActionMessage(`Árvore de ${treeSeeds} sementes criada e salva no banco de dados.`);
      showToast(`Árvore de ${treeSeeds} sementes criada e salva no banco de dados.`);
    } else {
      const error = res.error || 'Não foi possível criar a árvore no banco de dados.';
      setAdminActionMessage(error);
      showToast('Erro: ' + error);
    }
  } catch (e: any) {
    setAdminActionMessage('Erro ao criar árvore: ' + e.message);
    showToast('Erro: ' + e.message);
  } finally {
    setAdminActionLoading(false);
  }
};

const openAdminOnlineAction = async (res: any, successMessage: string) => {
  if (res.success) {
    await applyDirectAdminState(res);
    setAdminActionMessage(successMessage);
    showToast(successMessage);
    return;
  }

  const error = res.error || 'Não foi possível salvar a ação administrativa no banco de dados.';
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
      const res = await archiveTreeDirect({
        treeId: adminTree.id,
        reason: 'Arquivamento administrativo pelo painel',
        actorUserId: currentUser?.id,
        actorUsername: currentUser?.username
      });
      await openAdminOnlineAction(res, 'Árvore arquivada e salva no banco de dados.');
    } catch (e: any) {
      setAdminActionMessage('Erro ao arquivar árvore: ' + e.message);
      showToast('Erro: ' + e.message);
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleDeleteSelectedTree = async () => {
    if (!adminTree) return;
    const affectedCount = adminTreePositions.filter(pos => pos.status === 'occupied' && pos.user_id !== null).length;
    if (!window.confirm(`Excluir definitivamente a árvore ${adminTree.tree_code}? ${affectedCount} membro(s) ficarão sem posição nesta árvore.`)) return;
    if (!window.confirm('Confirma a exclusão definitiva? Essa ação remove a árvore do banco de dados.')) return;

    setAdminActionLoading(true);
    setAdminActionMessage(null);
    try {
      const res = await deleteTreeDirect({
        treeId: adminTree.id,
        actorUserId: currentUser?.id,
        actorUsername: currentUser?.username
      });
      if (res.success) {
        const nextTreeId = res.result?.nextTreeId;
        await applyDirectAdminState(res);
        setSelectedNode(null);
        if (nextTreeId) setSelectedAdminTreeId(nextTreeId);
        setAdminActionMessage('Árvore excluída definitivamente. Os membros afetados ficaram sem posição nesta árvore.');
        showToast('Árvore excluída definitivamente.');
      } else {
        const error = res.error || 'Não foi possível excluir a árvore.';
        setAdminActionMessage(error);
        showToast('Erro: ' + error);
      }
    } catch (e: any) {
      setAdminActionMessage('Erro ao excluir árvore: ' + e.message);
      showToast('Erro: ' + e.message);
    } finally {
      setAdminActionLoading(false);
    }
  };


  const handleUpdateTreeNickname = async () => {
    if (!adminTree) return;
    const currentNickname = adminTree.nickname || '';
    const nickname = window.prompt('Digite o apelido da árvore. Deixe vazio para remover o apelido.', currentNickname);
    if (nickname === null) return;
    setAdminActionLoading(true);
    setAdminActionMessage(null);
    try {
      const res = await updateTreeNicknameDirect({
        treeId: adminTree.id,
        nickname,
        actorUserId: currentUser?.id,
        actorUsername: currentUser?.username
      });
      await openAdminOnlineAction(res, nickname.trim() ? 'Apelido da árvore atualizado.' : 'Apelido da árvore removido.');
    } catch (e: any) {
      setAdminActionMessage('Erro ao atualizar apelido: ' + e.message);
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
      const res = await assignPositionDirect({
        treeId: adminTree.id,
        positionIndex: selectedNode.position_index,
        userId: adminSelectedUserId,
        actorUserId: currentUser?.id,
        actorUsername: currentUser?.username
      });
      await openAdminOnlineAction(res, `Membro atribuído à posição #${selectedNode.position_index} e salvo no banco de dados.`);
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
      const res = await clearPositionDirect({
        treeId: adminTree.id,
        positionIndex: selectedNode.position_index,
        actorUserId: currentUser?.id,
        actorUsername: currentUser?.username
      });
      await openAdminOnlineAction(res, `Posição #${selectedNode.position_index} liberada e salva no banco de dados.`);
    } catch (e: any) {
      setAdminActionMessage('Erro ao liberar posição: ' + e.message);
      showToast('Erro: ' + e.message);
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number, label: string) => {
    if (!window.confirm(`Excluir definitivamente o membro ${label}?`)) return;
    if (!window.confirm('Confirma a exclusão definitiva? Essa ação remove o membro do banco de dados.')) return;
    setAdminActionLoading(true);
    try {
      const res = await deleteUserDirect({
        userId,
        actorUserId: currentUser?.id,
        actorUsername: currentUser?.username
      });
      if (res.success) {
        await applyDirectAdminState(res);
        setAdminActionMessage('Membro excluído definitivamente.');
        showToast('Membro excluído definitivamente.');
      } else {
        const error = res.error || 'Não foi possível excluir o membro.';
        setAdminActionMessage(error);
        showToast('Erro: ' + error);
      }
    } catch (e: any) {
      setAdminActionMessage('Erro ao excluir membro: ' + e.message);
      showToast('Erro: ' + e.message);
    } finally {
      setAdminActionLoading(false);
    }
  };


  const handleSavePix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pixHolderName.trim() || !pixKey.trim()) {
      showToast('Preencha titular e chave Pix.');
      return;
    }
    setPixSaving(true);
    try {
      const res = await dataStore.updatePixAction({
        holderName: pixHolderName.trim(),
        keyType: pixKeyType,
        key: pixKey.trim()
      });
      if (res.success) {
        await fetchState(true);
        showToast('Chave Pix salva.');
      } else {
        showToast('Erro: ' + (res.error || 'Não foi possível salvar Pix.'));
      }
    } catch (e: any) {
      showToast('Erro: ' + e.message);
    } finally {
      setPixSaving(false);
    }
  };

  const handleClearPix = async () => {
    if (!window.confirm('Remover sua chave Pix cadastrada?')) return;
    setPixSaving(true);
    try {
      const res = await dataStore.clearPixAction();
      if (res.success) {
        await fetchState(true);
        showToast('Chave Pix removida.');
      } else {
        showToast('Erro: ' + (res.error || 'Não foi possível remover Pix.'));
      }
    } catch (e: any) {
      showToast('Erro: ' + e.message);
    } finally {
      setPixSaving(false);
    }
  };

  // Helper collections
  const allTrees: Tree[] = systemState?.trees || [];
  const allPositions: Position[] = systemState?.positions || [];
  const allUsers: User[] = systemState?.users || [];
  const activeAssignableUsers = allUsers.filter(u => u.status === 'active' && u.role !== 'admin');
  const positionedUserIds = new Set(allPositions.filter(p => p.status === 'occupied' && p.user_id !== null).map(p => p.user_id as number));
  const orphanUsers = allUsers.filter(u => u.role !== 'admin' && !positionedUserIds.has(u.id));
  const registeredMembers = allUsers.filter(u => u.role !== 'admin' && positionedUserIds.has(u.id));
  const totalAdminMemberPages = Math.max(1, Math.ceil(registeredMembers.length / adminMembersPageSize));
  const safeAdminMembersPage = Math.min(adminMembersPage, totalAdminMemberPages);
  const paginatedRegisteredMembers = registeredMembers.slice((safeAdminMembersPage - 1) * adminMembersPageSize, safeAdminMembersPage * adminMembersPageSize);
  const allLinks: ReferralLink[] = systemState?.referral_links || [];
  const allActivationRequests: ActivationRequest[] = systemState?.activation_requests || [];
  const plantingBag: PlantingBagView | null = systemState?.planting_bag || null;
  const pendingPlantingAssignments = plantingBag?.assignments.filter(item => item.status === 'pending') || [];

  // Active member's tree
  const memberTreeId = currentUser?.current_tree_id || (allTrees[0]?.id ?? 1);
  const memberTree = allTrees.find(t => t.id === memberTreeId) || allTrees[0];
  const memberPositions = allPositions.filter(p => p.tree_id === memberTreeId);
  const currentUserIsTronco = Boolean(currentUser && memberTree && currentUser.role !== 'admin' && memberTree.tronco_user_id === currentUser.id);
  const currentUserHasPixConfigured = Boolean(currentUser?.pixHolderName && currentUser?.pixKeyType && currentUser?.pixKey);
  const currentUserPixLock = Boolean(currentUserIsTronco && !currentUserHasPixConfigured);

  useEffect(() => {
    if (!currentUserPixLock) return;
    setShowLandingPage(false);
    setIsLocked(false);
    setActivationModalData(null);
    if (currentView !== 'member') setCurrentView('member');
    if (memberTab !== 'wallet') setMemberTab('wallet');
  }, [currentUserPixLock, currentView, memberTab]);

  const enforceTroncoPixLock = () => {
    setCurrentView('member');
    setMemberTab('wallet');
    showToast('Configure sua chave Pix de recebimento para liberar as outras opções.');
  };

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
  const currentUserTreePosition = currentUser ? memberPositions.find(p => p.user_id === currentUser.id && p.status === 'occupied') : null;
  const isCurrentUserReserved = Boolean(currentUserTreePosition && currentUserTreePosition.activation_status === 'reserved');
  const isCurrentUserActivated = Boolean(currentUserTreePosition && currentUserTreePosition.activation_status !== 'reserved');
  const myPendingActivationRequest = currentUser ? allActivationRequests.find(r => r.requester_user_id === currentUser.id && r.tree_id === memberTreeId && r.status === 'pending') : null;
  const pendingTroncoRequests = currentUser ? allActivationRequests.filter(r => r.tronco_user_id === currentUser.id && r.status === 'pending') : [];

  // Selected tree for admin explorer
  const adminTree = allTrees.find(t => t.id === selectedAdminTreeId) || allTrees[0];
  const adminTreePositions = allPositions.filter(p => p.tree_id === selectedAdminTreeId);
  const treeDisplayName = (tree?: Tree | null) => tree?.nickname?.trim() || tree?.display_name || tree?.category_name || (tree?.token_requirement ? `${tree.token_requirement} sementes` : 'Árvore');

  // Pre-formatted copy pitch (Sementes)
  const marketingPitch = `ÁRBORIS — informações sobre minha árvore.\n\nO cadastro é por indicação. A ativação exige doação Pix ao Tronco no valor definido para a árvore, após a reserva da posição. A progressão depende de novas entradas e não há garantia de receber doações.\n\nLeia as condições antes de participar:\n${referralUrl}`;

  // ==========================================
  // TREE VISUALIZATION RENDERERS (MODELS 1 TO 4)
  // ==========================================

  // MODEL 1: ÁRVORE RADIAL ORGÂNICA (Mind Map Circular 360°)
  const renderModel1Radial = (positionsToRender: Position[], currentUserId?: number) => {
    const tree = allTrees.find(item => item.id === positionsToRender[0]?.tree_id);
    return <TreeBoard positions={positionsToRender} currentUserId={currentUserId}
      treeCode={tree?.tree_code} treeLabel={tree ? treeDisplayName(tree) : undefined}
      onSelect={setSelectedNode} />;
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
          O ÁRBORIS organiza participantes em árvores de 15 posições. A ativação exige doação Pix ao Tronco e confirmação manual. A progressão depende de novas entradas e ativações; não há garantia de concluir um ciclo ou receber doações.
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
              <strong>Cadastro e reserva:</strong> O cadastro concede o dobro das sementes exigidas pela árvore. Metade é consumida na reserva; a outra metade é debitada na ativação e creditada ao Tronco como registro interno.
            </span>
          </div>
          <div className="flex items-start gap-2 text-rose-300">
            <span className="font-bold shrink-0">❌</span>
            <span className="text-balance">
              <strong>Doação exigida para ativação:</strong> O Pix é enviado diretamente ao Tronco. Pela regra informada pelo projeto, uma árvore de 25 sementes exige R$ 25. As sementes internas não são saldo bancário nem comprovante de plantio.
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
          <span className="text-[10px] font-mono text-rose-300 bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
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
                O participante que recebe as doações das novas entradas. O fechamento exige as 15 posições ativas, incluindo as 8 Folhas; apenas reservar as vagas não conclui o ciclo.
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
            • A reserva ocupa a primeira Folha disponível, das posições 7 a 14. A ativação é uma etapa posterior, sujeita à confirmação da doação.
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
          Quando as 15 posições estão ativas, o ciclo da árvore mãe termina e ela <strong>se divide em duas novas árvores, cada uma com 7 participantes e 8 vagas</strong>:
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
              <strong>Entrada no Nível 3:</strong> Você reserva uma das 8 Folhas (7 a 14), faz a doação ao Tronco e solicita a ativação.
            </span>
          </div>

          <div className="flex items-center gap-3 p-2 bg-slate-950 rounded-xl border border-slate-800 text-[11px]">
            <span className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 font-bold flex items-center justify-center shrink-0">
              2
            </span>
            <span className="text-slate-300 text-balance">
              <strong>1ª Divisão da Árvore:</strong> Com as 15 posições ativas, a árvore se divide e você sobe automaticamente para o <strong>Nível 2</strong>.
            </span>
          </div>

          <div className="flex items-center gap-3 p-2 bg-slate-950 rounded-xl border border-slate-800 text-[11px]">
            <span className="w-6 h-6 rounded-full bg-sky-600/30 text-sky-400 font-bold flex items-center justify-center shrink-0">
              3
            </span>
            <span className="text-slate-300 text-balance">
              <strong>2ª Divisão da Árvore:</strong> Se a nova árvore atingir 15 posições ativas, ela se divide novamente; você sobe para o <strong>Nível 1 (Guardião)</strong>.
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
              <strong>Conclusão do Ciclo:</strong> O ciclo só conclui com todas as 15 posições ativas. As doações dependem de novas entradas; a árvore pode permanecer incompleta.
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
              Existe doação Pix real, exigida para ativar a posição. Ela é enviada ao Tronco, que confirma manualmente o recebimento. O sistema registra essa aprovação, mas não verifica a transferência bancária. Não há garantia de recebimento futuro.
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <strong className="text-slate-100 block">Como funciona o link de indicação?</strong>
            <span className="text-slate-400 text-balance block leading-relaxed">
              O link de indicação identifica uma árvore ativa. Confira a árvore apresentada antes do cadastro: links de árvores concluídas são desativados.
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <strong className="text-slate-100 block">O que acontece quando o Tronco conclui?</strong>
            <span className="text-slate-400 text-balance block leading-relaxed">
              O Tronco deixa aquela árvore. Os outros 14 participantes formam duas novas árvores, com 7 posições ocupadas e 8 vagas em cada uma. Uma eventual reentrada depende das condições de acesso e reserva; não é automática.
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // 0. LOGIN E APRESENTAÇÃO PÚBLICA
  // ==========================================
  if (showDirectLoginModal) {
    return <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h1 className="font-bold">Entrar na comunidade</h1>
        <label className="block text-sm">Usuário<input required autoComplete="username" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} className="block w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl p-3" /></label>
        <label className="block text-sm">Senha<input required type="password" autoComplete="current-password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="block w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl p-3" /></label>
        {loginError && <p role="alert" className="text-sm text-amber-300">{loginError}</p>}
        <button disabled={loginLoading} className="w-full bg-emerald-600 rounded-xl p-3 font-bold disabled:opacity-50">{loginLoading ? 'Entrando...' : 'Entrar'}</button>
        <button type="button" onClick={() => { setShowDirectLoginModal(false); setLoginPassword(''); setShowLandingPage(true); }} className="w-full text-sm text-slate-400">Conhecer o projeto</button>
      </form>
    </main>;
  }

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

            <p className="text-xs text-amber-200 leading-relaxed rounded-xl border border-amber-500/30 bg-amber-950/30 p-3">
              O cadastro não ativa sua posição. A ativação exige doação Pix ao Tronco no valor da árvore e confirmação manual. Você pode doar e não receber doações futuras. Confira as condições antes de continuar.
            </p>

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

                <label className="block text-xs text-slate-300">Senha (mínimo 12 caracteres)
                  <input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={formPassword} onChange={e => setFormPassword(e.target.value)} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2" />
                </label>
                {/* Sementes box 100% centered */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[10px] text-slate-300 text-center leading-relaxed">
                  🌱 Você receberá <strong>1 pacote com 25 sementes</strong> para reservar sua vaga e mais <strong>25 sementes</strong> disponíveis para envio posterior ao tronco.
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
        
        {loadError && <div role="alert" className="p-4 text-sm text-rose-300">{loadError}<button onClick={() => fetchState(true)} className="block underline">Tentar novamente</button></div>}
        {/* Top App Bar & Navigation */}
        {currentUser && <div className="flex items-center justify-between p-3 text-xs"><span>@{currentUser.username}</span><button onClick={handleLogout} className="underline">Sair</button></div>}
        <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-sm shadow-sm">
                🌲
              </div>
              <div>
                <span className="font-bold text-slate-100 text-sm tracking-wide block leading-none">ARBORIS</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">

              {currentView === 'admin' && (
                <>
                  <div className="relative">
                    <button
                      onClick={() => setShowPlantingAlertLog(value => !value)}
                      title="Sorteios da bag de plantio"
                      className="relative p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs flex items-center gap-1 transition"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      {pendingPlantingAssignments.length > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] leading-4 font-bold text-center">
                          {pendingPlantingAssignments.length}
                        </span>
                      )}
                    </button>
                    {showPlantingAlertLog && (
                      <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-slate-950 border border-amber-800/70 rounded-2xl shadow-2xl p-3 space-y-2 text-xs">
                        <div className="font-bold text-amber-300 flex items-center justify-between">
                          <span>Bag de plantio</span>
                          <span className="font-mono text-[10px] text-slate-400">{plantingBag?.balance ?? 0}/{plantingBag?.threshold ?? 500}</span>
                        </div>
                        <div className="space-y-1.5 max-h-72 overflow-y-auto">
                          {pendingPlantingAssignments.length === 0 ? (
                            <div className="text-[11px] text-slate-500 p-2 bg-slate-900 rounded-xl border border-slate-800">
                              Nenhum sorteio de plantio gerado ainda.
                            </div>
                          ) : pendingPlantingAssignments.map(assignment => (
                            <div key={assignment.id} className="p-2 bg-slate-900 border border-slate-800 rounded-xl">
                              <div className="font-bold text-slate-100">@{assignment.username}</div>
                              <div className="text-[10px] text-slate-500 font-mono">Sorteio #{assignment.drawId} · Árvore #{assignment.treeId}</div>
                            </div>
                          ))}
                        </div>
                        <div className="text-[10px] text-slate-500 leading-relaxed">
                          Entre em contato com os sorteados. Se não fizerem o plantio, remova o cadastro pelo painel de membros.
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      fetchState(true);
                      showToast('Dados atualizados.');
                    }}
                    title="Atualizar dados do servidor"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs flex items-center gap-1 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-[10px]">Atualizar</span>
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  if (currentUserPixLock) {
                    enforceTroncoPixLock();
                    return;
                  }
                  setShowLandingPage(false);
                  setIsLocked(false);
                  setCurrentView('public');
                }}
                title="Regras e dinâmica do jogo"
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


        {activationModalData && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 space-y-4 shadow-2xl text-sm">
              <div className="space-y-1">
                <div className="text-lg font-black text-emerald-300">Ative suas {activationModalData.amount} sementes</div>
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

        {/* Dynamic View Content */}
        <div className="flex-1 p-4 space-y-4">
          
          {/* ======================================================== */}
          {/* VIEW: PAINEL DO MEMBRO */}
          {/* ======================================================== */}
          {currentView === 'member' && currentUser && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {currentUserPixLock && (
                <div className="p-3.5 bg-rose-950/60 border border-rose-500/70 rounded-2xl text-xs text-rose-100 leading-relaxed font-semibold">
                  Agora você está no tronco e precisa configurar sua chave Pix de recebimento. Você não será capaz de sair dessa tela se não fizer essa configuração.
                </div>
              )}
              {/* Member Sub-Navigation */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => {
                    if (currentUserPixLock) {
                      enforceTroncoPixLock();
                      return;
                    }
                    setMemberTab('my_tree');
                  }}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition text-center flex items-center justify-center gap-1.5 ${
                    memberTab === 'my_tree' ? 'bg-slate-800 text-emerald-400 shadow-sm' : currentUserPixLock ? 'text-slate-600 cursor-not-allowed opacity-60' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Trees className="w-3.5 h-3.5" />
                  <span>Minha Árvore</span>
                </button>

                <button
                  onClick={() => {
                    if (currentUserPixLock) {
                      enforceTroncoPixLock();
                      return;
                    }
                    setMemberTab('marketing');
                  }}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition text-center flex items-center justify-center gap-1.5 ${
                    memberTab === 'marketing' ? 'bg-slate-800 text-emerald-400 shadow-sm' : currentUserPixLock ? 'text-slate-600 cursor-not-allowed opacity-60' : 'text-slate-400 hover:text-slate-200'
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
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Doação</span>
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
                        {treeDisplayName(memberTree)} · Ciclo #{memberTree?.cycle_number}
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-slate-400 text-[10px]">Ocupação:</div>
                      <span className="font-bold text-emerald-400 text-sm">{treeOccupancy}/15</span>
                    </div>
                  </div>



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

                  {/* CRUCIAL GAME MECHANIC CARD:
                      A pessoa só entra, só aparece na ramificação depois que ela clicar no botão.
                      Enquanto ela não clicar ela está fora! Quem clicar antes fica numa posição muito melhor! */}
                  {currentUser.role !== 'admin' && !isUserPositioned && currentUser.balance >= 25 && (
                    <div className="bg-gradient-to-br from-amber-950/70 via-slate-900 to-rose-950/60 border-2 border-amber-400 rounded-2xl p-4 space-y-3 shadow-2xl relative overflow-hidden animate-in fade-in">
                      <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                        <Zap className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                        <span className="uppercase tracking-wider">🎁 Parabéns!</span>
                      </div>

                      <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 text-[11px] text-slate-300 leading-relaxed space-y-2">
                        <p className="text-balance">Você está participando do <strong>EcoTerra Arboris</strong>.</p>
                        <p className="text-balance">
                          As sementes do cadastro são registros internos para reserva e ativação. A reserva alimenta a bag de plantio, que seleciona participantes para plantar árvores quando acumula 500 sementes.
                        </p>
                        <p className="text-amber-300 font-medium text-balance">
                          Ao clicar em OK, a quantidade de sementes definida para esta árvore será consumida para reservar sua vaga.
                        </p>
                      </div>

                      <button
                        onClick={() => handleReserveTreeEntry(memberTree.id)}
                        disabled={activatingTronco}
                        className="w-full bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-xl text-balance"
                      >
                        {activatingTronco ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        ) : (
                          <Sprout className="w-4 h-4 text-slate-950" />
                        )}
                        <span>OK</span>
                      </button>
                    </div>
                  )}

                  {/* RENDER MODEL (Árvore Radial) */}
                  {renderActiveModel(memberPositions, currentUser.id)}

                  {/* If user is already positioned in tree */}
                  {isUserPositioned && (
                    <div className="space-y-2">
                      <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-2xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div>
                            <span className={`font-bold ${isCurrentUserReserved ? 'text-rose-300' : 'text-emerald-300'}`}>{isCurrentUserReserved ? 'Vaga reservada na árvore:' : 'Vaga ativada na árvore:'}</span>
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
                        <span className="text-[10px] font-mono text-rose-300 bg-rose-950 px-2 py-0.5 rounded border border-rose-800 shrink-0">
                          {isCurrentUserReserved ? 'RESERVADA' : 'ATIVADA'}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 text-xs">
                        <div className={`font-bold ${isCurrentUserReserved ? 'text-rose-300' : 'text-emerald-300'}`}>{isCurrentUserReserved ? '− 25 Sementes' : '✓ Ativado'}</div>
                        <div className="text-slate-300">{isCurrentUserReserved ? 'Sua vaga na árvore está reservada. Envie a solicitação Pix para ativar.' : 'Sua vaga está ativada no projeto.'}</div>
                        <div className="text-[11px] text-slate-400">Saldo disponível: <strong>{currentUser.balance}</strong> sementes.</div>
                        {myPendingActivationRequest && (
                          <div className="p-2 bg-amber-950/30 border border-amber-800 rounded-xl text-[11px] text-amber-200">
                            Aguardando confirmação do tronco para ativar sua posição.
                          </div>
                        )}
                        {isCurrentUserReserved && !myPendingActivationRequest && currentUser.balance >= 25 && (
                          <button
                            onClick={() => handleStrengthenTronco(currentUser.id, memberTree.id)}
                            disabled={activatingTronco}
                            className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2"
                          >
                            {activatingTronco ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sprout className="w-3.5 h-3.5" />}
                            <span>Ativar 25 sementes via Pix</span>
                          </button>
                        )}
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
                              👑 <strong>Você é o Tronco da Vez:</strong> O ciclo só conclui quando as 15 posições estão ativas, incluindo as 8 Folhas (7 a 14). A divisão depende de novas entradas e ativações.
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
                      <span className="text-[10px] text-slate-400 font-mono">Sem recebimento garantido</span>
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
                        href={`https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent('Conheça as regras da minha árvore no ÁRBORIS. A ativação exige doação Pix ao Tronco, sem garantia de recebimento futuro.')}`}
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
                  {currentUserPixLock && (
                    <div className="p-3.5 bg-rose-950/70 border-2 border-rose-500 rounded-2xl text-xs text-rose-100 leading-relaxed font-semibold shadow-lg">
                      Agora você está no tronco e precisa configurar sua chave Pix de recebimento. Você não será capaz de sair dessa tela se não fizer essa configuração.
                    </div>
                  )}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Saldo de Sementes</div>
                      <div className="text-2xl font-bold text-emerald-400 font-mono mt-0.5 flex items-center gap-1.5">
                        <Sprout className="w-6 h-6 text-emerald-400" />
                        <span>{currentUser.balance}</span>
                        <span className="text-xs text-slate-400 font-normal">sementes</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 leading-relaxed text-balance">
                        Sementes internas · Sem saque bancário
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xl">
                      🌱
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">Minha chave Pix</span>
                      <span className="text-[10px] text-slate-500 font-mono">Cadastro do participante</span>
                    </div>
                    <form onSubmit={handleSavePix} className="space-y-2 text-xs">
                      <label className="block text-slate-300">Titular
                        <input
                          required
                          value={pixHolderName}
                          onChange={(e) => setPixHolderName(e.target.value)}
                          className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                          placeholder="Nome do titular"
                        />
                      </label>
                      <label className="block text-slate-300">Tipo da chave
                        <select
                          value={pixKeyType}
                          onChange={(e) => setPixKeyType(e.target.value as 'random' | 'email' | 'phone')}
                          className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="random">Aleatória</option>
                          <option value="email">E-mail</option>
                          <option value="phone">Telefone</option>
                        </select>
                      </label>
                      <label className="block text-slate-300">Chave Pix
                        <input
                          required
                          value={pixKey}
                          onChange={(e) => setPixKey(e.target.value)}
                          className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                          placeholder={pixKeyType === 'email' ? 'nome@email.com' : pixKeyType === 'phone' ? '+5531999999999' : 'chave aleatória'}
                        />
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          type="submit"
                          disabled={pixSaving}
                          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2"
                        >
                          {pixSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          <span>Salvar chave Pix</span>
                        </button>
                        {currentUser.pixKey && (
                          <button
                            type="button"
                            disabled={pixSaving}
                            onClick={handleClearPix}
                            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold"
                          >
                            Remover chave Pix
                          </button>
                        )}
                      </div>
                    </form>
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
                  <span>Membros</span>
                </button>

                <button
                  onClick={() => setAdminTab('orphans')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition text-center flex items-center justify-center gap-1 ${
                    adminTab === 'orphans' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Órfãos</span>
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
                              {treeDisplayName(tree)}
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
                    <div className={[2, 3, 4].includes(selectedTreeModel) ? 'space-y-3' : 'arboris-explorer'}>
                      {[2, 3, 4].includes(selectedTreeModel) && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-200">
                            Explorador da Árvore: <span className="text-amber-400 font-mono">{adminTree.tree_code}</span> · <span className="text-slate-300">{treeDisplayName(adminTree)}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">15 Posições</span>
                        </div>
                      )}
                      {renderActiveModel(adminTreePositions)}

                      <details className="arboris-tree-actions p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 text-xs">
                        <summary className="font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer select-none">
                          <Shield className="w-3.5 h-3.5 text-amber-400" />
                          <span>Ações administrativas da árvore</span>
                        </summary>
                        <div className="grid grid-cols-1 gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => fetchState(true)}
                            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-2 transition"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Atualizar dados</span>
                          </button>
                          <button
                            type="button"
                            disabled={adminActionLoading}
                            onClick={handleUpdateTreeNickname}
                            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold flex items-center justify-center gap-2 transition"
                          >
                            <Palette className="w-3.5 h-3.5" />
                            <span>Apelidar árvore</span>
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
                          <button
                            type="button"
                            disabled={adminActionLoading}
                            onClick={handleDeleteSelectedTree}
                            className="w-full py-2 rounded-xl bg-red-950/80 hover:bg-red-900 disabled:opacity-50 border border-red-800 text-red-200 font-bold flex items-center justify-center gap-2 transition"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Excluir árvore definitivamente</span>
                          </button>
                        </div>
                        {adminActionMessage && (
                          <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-300 leading-relaxed mt-2">
                            {adminActionMessage}
                          </div>
                        )}
                      </details>
                    </div>
                  )}
                </div>
              )}
              {/* SUB-TAB: MEMBROS */}
              {adminTab === 'create_user' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-amber-400" />
                      <span>Criar usuário pelo painel</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Preencha nome, sobrenome e senha para criar a conta. Não é necessário informar usuário indicador.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAdminCreateMemberForm(value => !value)}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Criar membro</span>
                  </button>

                  {showAdminCreateMemberForm && (
                  <form onSubmit={handleAdminCreateUser} className="p-3.5 bg-slate-900 border border-amber-800/60 rounded-2xl space-y-3">
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

                    <label className="block text-xs text-slate-300">Senha da nova conta (mínimo 12 caracteres)
                      <input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={adminCreatePassword} onChange={e => setAdminCreatePassword(e.target.value)} className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5" />
                    </label>
                    <button
                      type="submit"
                      disabled={adminCreateUserLoading}
                      className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2"
                    >
                      {adminCreateUserLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                      <span>Criar membro</span>
                    </button>
                  </form>
                  )}

                  {adminCreateUserError && (
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-300 leading-relaxed">
                      {adminCreateUserError}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="font-bold text-slate-200">
                        Membros Cadastrados ({registeredMembers.length})
                      </div>
                      <select
                        value={adminMembersPageSize}
                        onChange={(e) => { setAdminMembersPageSize(parseInt(e.target.value)); setAdminMembersPage(1); }}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-[11px]"
                      >
                        {[5, 10, 25, 100].map(size => <option key={size} value={size}>{size}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      {paginatedRegisteredMembers.map(user => (
                        <div key={user.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <button
                                type="button"
                                onClick={() => openAdminMemberEditor(user)}
                                className="font-bold text-slate-100 hover:text-amber-300 underline-offset-2 hover:underline text-left"
                              >
                                {user.full_name || user.username}
                              </button>
                              <div className="text-[10px] text-slate-400">@{user.username}</div>
                            </div>
                            <div className="text-right font-mono">
                              <span className="font-bold text-emerald-400">{user.balance}</span>
                              <span className="text-[9px] text-slate-500 block">sementes</span>
                            </div>
                          </div>

                          {adminEditingMemberId === user.id && (
                            <form onSubmit={handleAdminUpdateMember} className="p-3 bg-slate-950 border border-amber-800/60 rounded-xl space-y-3">
                              <div className="grid grid-cols-1 gap-2">
                                <label className="block text-[10px] text-slate-300 font-bold uppercase tracking-wide">Nome do membro
                                  <input
                                    required
                                    value={adminEditName}
                                    onChange={(e) => setAdminEditName(e.target.value)}
                                    className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-amber-500"
                                  />
                                </label>
                                <label className="block text-[10px] text-slate-300 font-bold uppercase tracking-wide">Arroba / username
                                  <div className="relative mt-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">@</span>
                                    <input
                                      required
                                      value={adminEditUsername}
                                      onChange={(e) => setAdminEditUsername(e.target.value)}
                                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-slate-100 font-mono outline-none focus:border-amber-500"
                                    />
                                  </div>
                                </label>
                                <label className="block text-[10px] text-slate-300 font-bold uppercase tracking-wide">Titular Pix
                                  <input
                                    value={adminEditPixHolderName}
                                    onChange={(e) => setAdminEditPixHolderName(e.target.value)}
                                    placeholder="Nome do titular"
                                    className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-amber-500"
                                  />
                                </label>
                                <label className="block text-[10px] text-slate-300 font-bold uppercase tracking-wide">Tipo da chave Pix
                                  <select
                                    value={adminEditPixKeyType}
                                    onChange={(e) => setAdminEditPixKeyType(e.target.value as 'random' | 'email' | 'phone')}
                                    className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-amber-500"
                                  >
                                    <option value="random">Aleatória</option>
                                    <option value="email">E-mail</option>
                                    <option value="phone">Telefone</option>
                                  </select>
                                </label>
                                <label className="block text-[10px] text-slate-300 font-bold uppercase tracking-wide">Chave Pix
                                  <input
                                    value={adminEditPixKey}
                                    onChange={(e) => setAdminEditPixKey(e.target.value)}
                                    placeholder={adminEditPixKeyType === 'email' ? 'nome@email.com' : adminEditPixKeyType === 'phone' ? '+5531999999999' : 'chave aleatória'}
                                    className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-amber-500"
                                  />
                                </label>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <button type="submit" disabled={adminActionLoading} className="py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black">
                                  Salvar
                                </button>
                                <button type="button" disabled={adminActionLoading} onClick={() => setAdminEditingMemberId(null)} className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold">
                                  Cancelar
                                </button>
                              </div>
                              <div className="text-[10px] text-slate-500 leading-relaxed">
                                Para remover os dados Pix, deixe titular e chave Pix em branco e salve.
                              </div>
                            </form>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px]">
                            <span className={`px-2 py-0.5 rounded font-mono ${
                              user.status === 'active' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}>
                              {user.status === 'active' ? 'Ativo' : 'Suspenso'}
                            </span>

                            {user.id !== 1 && (
                              <button
                                disabled={adminActionLoading}
                                onClick={() => handleDeleteUser(user.id, user.full_name || `@${user.username}`)}
                                className="text-rose-400 hover:text-rose-200 underline disabled:opacity-50"
                              >
                                Excluir definitivamente
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <button
                        type="button"
                        disabled={safeAdminMembersPage <= 1}
                        onClick={() => setAdminMembersPage(page => Math.max(1, page - 1))}
                        className="px-2 py-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-40"
                      >
                        Anterior
                      </button>
                      <span>Página {safeAdminMembersPage} de {totalAdminMemberPages}</span>
                      <button
                        type="button"
                        disabled={safeAdminMembersPage >= totalAdminMemberPages}
                        onClick={() => setAdminMembersPage(page => Math.min(totalAdminMemberPages, page + 1))}
                        className="px-2 py-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-40"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB: ÓRFÃOS */}
              {adminTab === 'orphans' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-amber-400" />
                      <span>Membros órfãos</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Membros sem posição em nenhuma árvore ativa ou cadastrada.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {orphanUsers.length === 0 ? (
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400">
                        Nenhum membro órfão encontrado.
                      </div>
                    ) : orphanUsers.map(user => (
                      <div key={user.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-100">{user.full_name || user.username}</div>
                            <div className="text-[10px] text-slate-400">@{user.username}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded font-mono bg-slate-950 text-amber-300 border border-amber-800 text-[10px]">
                            sem árvore
                          </span>
                        </div>
                        <button
                          disabled={adminActionLoading}
                          onClick={() => handleDeleteUser(user.id, user.full_name || `@${user.username}`)}
                          className="w-full py-2 rounded-xl bg-red-950/70 hover:bg-red-900 disabled:opacity-50 border border-red-800 text-red-200 font-bold transition"
                        >
                          Excluir definitivamente
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB-TAB: REGRAS */}
              {adminTab === 'settings' && (
                <div className="space-y-3">
                  <div className="p-3.5 bg-slate-900 border border-emerald-800/50 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-bold text-slate-100 flex items-center gap-1.5">
                        <Sprout className="w-4 h-4 text-emerald-400" />
                        <span>Bag de plantio</span>
                      </div>
                      <span className="text-[10px] text-emerald-300 font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                        {plantingBag?.balance ?? 0}/{plantingBag?.threshold ?? 500}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                      <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="font-mono text-emerald-400 font-bold">{plantingBag?.entries.length ?? 0}</div>
                        <div className="text-slate-500">entradas</div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="font-mono text-amber-300 font-bold">{plantingBag?.draws.length ?? 0}</div>
                        <div className="text-slate-500">sorteios</div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="font-mono text-rose-300 font-bold">{pendingPlantingAssignments.length}</div>
                        <div className="text-slate-500">avisos</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-slate-300">Sorteados para contato</div>
                      {pendingPlantingAssignments.length === 0 ? (
                        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-500">
                          Nenhum sorteio de plantio gerado ainda.
                        </div>
                      ) : pendingPlantingAssignments.map(assignment => (
                        <div key={assignment.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-100">@{assignment.username}</div>
                            <div className="text-[10px] text-slate-500 font-mono">Sorteio #{assignment.drawId} · Árvore #{assignment.treeId}</div>
                          </div>
                          <span className="text-[10px] text-amber-300 font-mono">contatar</span>
                        </div>
                      ))}
                    </div>
                  </div>

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
                          {user.full_name || user.username}
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
            onClick={() => setCurrentView('public')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
              currentView === 'public' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px]">Manual</span>
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
                <label className="block text-slate-300 mb-1 font-medium">Quantidade de sementes da árvore</label>
                <input
                  type="number"
                  min={1}
                  max={1000000}
                  step={1}
                  value={newTreeSeeds}
                  onChange={e => setNewTreeSeeds(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                  placeholder="Ex: 2, 25, 50, 100"
                />
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  O novo participante receberá automaticamente o dobro: metade para reserva e metade para ativação Pix do tronco.
                </p>
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
                      {u.full_name || u.username}
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
