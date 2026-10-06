export {};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        initDataUnsafe?: Record<string, any>;
        ready?: () => void;
        expand?: () => void;
      };
    };
  }
}

const OVERLAY_ID = 'arboris-bot-entry-flow';
const SUPPRESS_KEY = 'arboris_bot_entry_suppressed_v1';
const PARTICIPANT_QUERY_FLAG = 'entry';
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

function normalizeReferralInput(value: string): string {
  return value.trim().replace(/^@+/, '');
}

function hasReferralIntent(): boolean {
  if (!isBrowser) return false;
  const params = new URLSearchParams(window.location.search);
  return Boolean(params.get('ref') || params.get(PARTICIPANT_QUERY_FLAG) === 'tronco');
}

function isLoginScreenVisible(): boolean {
  const bodyText = (document.body.textContent || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return bodyText.includes('entrar na comunidade') && bodyText.includes('usuario') && bodyText.includes('senha');
}

function hasAuthenticatedSurface(): boolean {
  const text = (document.body.textContent || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return text.includes('minha arvore') || text.includes('painel do coordenador') || text.includes('sair');
}

function ensureStyles() {
  if (document.getElementById('arboris-bot-entry-style')) return;
  const style = document.createElement('style');
  style.id = 'arboris-bot-entry-style';
  style.textContent = `
    #${OVERLAY_ID} {
      position: fixed; inset: 0; z-index: 10020;
      display: flex; align-items: center; justify-content: center;
      padding: 1rem; background: radial-gradient(circle at top, rgb(6 78 59 / .40), rgb(2 6 23 / .96) 56%);
      color: rgb(241 245 249); font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .arboris-entry-card {
      width: min(94vw, 430px); border: 1px solid rgb(51 65 85); border-radius: 1.4rem;
      background: linear-gradient(145deg, rgb(15 23 42 / .98), rgb(2 6 23 / .98));
      box-shadow: 0 28px 90px rgb(0 0 0 / .55); padding: 1.2rem;
    }
    .arboris-entry-badge {
      width: 3.2rem; height: 3.2rem; border-radius: 1rem; display: grid; place-items: center;
      background: rgb(16 185 129 / .14); border: 1px solid rgb(16 185 129 / .45); font-size: 1.55rem;
      margin: 0 auto .85rem;
    }
    .arboris-entry-card h1 { margin: 0; text-align: center; font-size: 1.35rem; line-height: 1.2; font-weight: 900; }
    .arboris-entry-card p { margin: .65rem 0 1rem; color: rgb(148 163 184); text-align: center; font-size: .86rem; line-height: 1.45; }
    .arboris-entry-actions { display: grid; gap: .7rem; }
    .arboris-entry-actions button, .arboris-entry-card button {
      border: 0; border-radius: 1rem; padding: .95rem 1rem; font-weight: 900; cursor: pointer; font-size: .95rem;
    }
    .arboris-entry-primary { background: linear-gradient(135deg, rgb(16 185 129), rgb(20 184 166)); color: rgb(2 44 34); }
    .arboris-entry-secondary { background: rgb(30 41 59); color: rgb(226 232 240); border: 1px solid rgb(51 65 85) !important; }
    .arboris-entry-form { display: grid; gap: .75rem; margin-top: .8rem; }
    .arboris-entry-form label { display: grid; gap: .38rem; font-size: .78rem; color: rgb(203 213 225); font-weight: 700; }
    .arboris-entry-form input {
      width: 100%; border-radius: 1rem; border: 1px solid rgb(51 65 85); background: rgb(2 6 23);
      color: rgb(241 245 249); padding: .9rem 1rem; outline: none; font-size: 1rem;
    }
    .arboris-entry-form input:focus { border-color: rgb(52 211 153); box-shadow: 0 0 0 3px rgb(16 185 129 / .16); }
    .arboris-entry-status { min-height: 1.2rem; font-size: .78rem; color: rgb(252 211 77); text-align: center; }
    .arboris-entry-small { margin-top: .85rem; text-align: center; color: rgb(100 116 139); font-size: .72rem; line-height: 1.35; }
  `;
  document.head.appendChild(style);
}

function closeOverlay() {
  document.getElementById(OVERLAY_ID)?.remove();
}

function showChoice() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) return;
  overlay.innerHTML = `
    <div class="arboris-entry-card" role="dialog" aria-modal="true" aria-label="Entrada ARBORIS">
      <div class="arboris-entry-badge">🌳</div>
      <h1>Bem-vindo ao ARBORIS</h1>
      <p>Entre com sua conta ou peça acesso informando o arroba da pessoa que está no tronco da árvore.</p>
      <div class="arboris-entry-actions">
        <button type="button" class="arboris-entry-primary" data-entry-participate>Quero participar</button>
        <button type="button" class="arboris-entry-secondary" data-entry-login>Logar</button>
      </div>
      <div class="arboris-entry-small">A indicação agora acontece pelo bot. O acesso à árvore é confirmado pelo arroba do tronco.</div>
    </div>
  `;
  overlay.querySelector('[data-entry-login]')?.addEventListener('click', () => {
    window.sessionStorage.setItem(SUPPRESS_KEY, 'login');
    closeOverlay();
    const firstInput = document.querySelector<HTMLInputElement>('input[autocomplete="username"], input[type="text"], input:not([type])');
    firstInput?.focus();
  });
  overlay.querySelector('[data-entry-participate]')?.addEventListener('click', showTroncoForm);
}

function showTroncoForm() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) return;
  overlay.innerHTML = `
    <div class="arboris-entry-card" role="dialog" aria-modal="true" aria-label="Acessar árvore pelo tronco">
      <div class="arboris-entry-badge">@</div>
      <h1>Qual é o arroba do tronco?</h1>
      <p>Digite o usuário da pessoa que aparece no meio da árvore para continuar seu cadastro.</p>
      <form class="arboris-entry-form" data-entry-form>
        <label>Arroba do tronco
          <input name="tronco" required autocomplete="off" inputmode="text" placeholder="exemplo: maria" />
        </label>
        <button type="submit" class="arboris-entry-primary">Continuar</button>
        <button type="button" class="arboris-entry-secondary" data-entry-back>Voltar</button>
        <div class="arboris-entry-status" role="status"></div>
      </form>
      <div class="arboris-entry-small">Não precisa de link de afiliado. O sistema valida a árvore pelo arroba informado.</div>
    </div>
  `;
  const input = overlay.querySelector<HTMLInputElement>('input[name="tronco"]');
  input?.focus();
  overlay.querySelector('[data-entry-back]')?.addEventListener('click', showChoice);
  overlay.querySelector<HTMLFormElement>('[data-entry-form]')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const status = form.querySelector<HTMLElement>('.arboris-entry-status')!;
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    const tronco = normalizeReferralInput(new FormData(form).get('tronco') as string || '');
    if (!tronco) {
      status.textContent = 'Informe o arroba do tronco.';
      return;
    }
    submit.disabled = true;
    status.textContent = 'Validando árvore...';
    try {
      const response = await fetch(`${API_BASE}/referrals/validate?value=${encodeURIComponent(tronco)}`, {
        credentials: 'include',
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || 'Não foi possível validar esse arroba.');
      }
      window.sessionStorage.setItem(SUPPRESS_KEY, 'participate');
      const next = new URL(window.location.href);
      next.searchParams.set('ref', tronco);
      next.searchParams.set(PARTICIPANT_QUERY_FLAG, 'tronco');
      window.location.assign(next.toString());
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Erro ao validar arroba.';
    } finally {
      submit.disabled = false;
    }
  });
}

function shouldShowEntryOverlay(): boolean {
  if (!isBrowser) return false;
  if (document.getElementById(OVERLAY_ID)) return false;
  if (window.sessionStorage.getItem(SUPPRESS_KEY)) return false;
  if (hasReferralIntent()) return false;
  if (hasAuthenticatedSurface()) return false;
  // The login form is already visible on the page; do not cover it with the entry modal.
  if (isLoginScreenVisible()) return false;
  return false;
}

function mountOverlayIfNeeded() {
  if (!shouldShowEntryOverlay()) return;
  ensureStyles();
  window.Telegram?.WebApp?.ready?.();
  window.Telegram?.WebApp?.expand?.();
  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  document.body.appendChild(overlay);
  showChoice();
}

function neutralizeAffiliateCopy(root: ParentNode = document) {
  root.querySelectorAll<HTMLInputElement>('input').forEach(input => {
    if (!input.value.includes('?ref=')) return;
    input.value = 'Compartilhe o link do bot no Telegram. O novo participante informará o arroba do tronco.';
    input.setAttribute('readonly', 'true');
  });

  root.querySelectorAll<HTMLElement>('*').forEach(element => {
    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType !== Node.TEXT_NODE || !node.textContent) continue;
      if (node.textContent.includes('Link de Indicação da Sua Árvore') || node.textContent.includes('Link de indicação')) {
        node.textContent = node.textContent.replace(/Link de Indicação da Sua Árvore/g, 'Divulgação pelo bot').replace(/Link de indicação/g, 'Divulgação pelo bot');
      }
    }
  });
}

if (isBrowser) {
  mountOverlayIfNeeded();
  neutralizeAffiliateCopy();
  const observer = new MutationObserver(records => {
    mountOverlayIfNeeded();
    for (const record of records) {
      record.addedNodes.forEach(node => {
        if (node instanceof HTMLElement) neutralizeAffiliateCopy(node);
      });
    }
    neutralizeAffiliateCopy();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
