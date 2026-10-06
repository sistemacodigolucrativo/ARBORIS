export {};

const RECOVERY_PIN_STORAGE_KEY = 'arboris_next_recovery_pin_v1';
let patchedFetch = false;
let modalReady = false;

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

function ensureStyles() {
  if (!isBrowser || document.getElementById('arboris-ui-fixes-style')) return;
  const style = document.createElement('style');
  style.id = 'arboris-ui-fixes-style';
  style.textContent = `
    .arboris-password-host { position: relative !important; display: block; }
    .arboris-password-host input[type="password"],
    .arboris-password-host input[data-arboris-visible-password="true"] { padding-right: 3rem !important; }
    .arboris-password-toggle {
      position: absolute; right: .55rem; bottom: .42rem; z-index: 5;
      width: 2.2rem; height: 2.2rem; border-radius: .75rem;
      border: 1px solid rgb(51 65 85); background: rgb(15 23 42 / .96);
      color: rgb(226 232 240); display: inline-flex; align-items: center; justify-content: center;
      font-size: .9rem; line-height: 1; cursor: pointer;
    }
    .arboris-recovery-trigger {
      width: 100%; border: 1px solid rgb(51 65 85); border-radius: .85rem;
      background: rgb(2 6 23); color: rgb(110 231 183); font-weight: 700;
      padding: .78rem .9rem; font-size: .82rem; cursor: pointer;
    }
    .arboris-recovery-pin-field { display: block; font-size: .75rem; color: rgb(203 213 225); }
    .arboris-recovery-pin-field input {
      display: block; width: 100%; margin-top: .35rem; border-radius: .85rem;
      border: 1px solid rgb(51 65 85); background: rgb(2 6 23); color: rgb(241 245 249);
      padding: .72rem .85rem; outline: none;
    }
    .arboris-recovery-backdrop {
      position: fixed; inset: 0; z-index: 9998; background: rgb(2 6 23 / .78);
      display: none; align-items: center; justify-content: center; padding: 1rem;
    }
    .arboris-recovery-backdrop[data-open="true"] { display: flex; }
    .arboris-recovery-modal {
      width: min(94vw, 420px); border: 1px solid rgb(51 65 85); border-radius: 1.1rem;
      background: rgb(15 23 42); color: rgb(241 245 249); padding: 1rem; box-shadow: 0 24px 80px rgb(0 0 0 / .45);
    }
    .arboris-recovery-modal h2 { margin: 0 0 .35rem; font-size: 1rem; font-weight: 800; }
    .arboris-recovery-modal p { margin: 0 0 .85rem; color: rgb(148 163 184); font-size: .78rem; line-height: 1.45; }
    .arboris-recovery-modal label { display: block; margin-top: .7rem; font-size: .75rem; color: rgb(203 213 225); }
    .arboris-recovery-modal input {
      width: 100%; margin-top: .35rem; border-radius: .85rem; border: 1px solid rgb(51 65 85);
      background: rgb(2 6 23); color: rgb(241 245 249); padding: .76rem .85rem; outline: none;
    }
    .arboris-recovery-actions { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; margin-top: .9rem; }
    .arboris-recovery-actions button { border-radius: .85rem; border: 1px solid rgb(51 65 85); padding: .75rem; font-weight: 800; cursor: pointer; }
    .arboris-recovery-actions button[type="submit"] { background: rgb(16 185 129); color: rgb(5 46 22); border-color: rgb(52 211 153); }
    .arboris-recovery-actions button[type="button"] { background: rgb(30 41 59); color: rgb(226 232 240); }
    .arboris-recovery-status { min-height: 1.2rem; margin-top: .65rem; font-size: .75rem; color: rgb(252 211 77); }
    .arboris-back-button {
      display: inline-flex; align-items: center; gap: .4rem; margin-bottom: .75rem;
      border: 1px solid rgb(51 65 85); border-radius: .85rem; background: rgb(15 23 42);
      color: rgb(226 232 240); padding: .6rem .85rem; font-size: .78rem; font-weight: 800; cursor: pointer;
    }
    .arboris-centered-notification {
      position: fixed !important; left: 50% !important; top: 50% !important; right: auto !important; bottom: auto !important;
      transform: translate(-50%, -50%) !important; z-index: 9997 !important; width: min(92vw, 420px) !important;
      max-height: 76vh !important; overflow: auto !important;
    }
  `;
  document.head.appendChild(style);
}

function patchFetch() {
  if (!isBrowser || patchedFetch) return;
  patchedFetch = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const rawUrl = input instanceof Request ? input.url : String(input);
      const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
      const shouldPatchRegistration = method === 'POST' && (/\/api\/register$/.test(rawUrl) || /\/api\/admin\/users$/.test(rawUrl));
      if (shouldPatchRegistration && init?.body && typeof init.body === 'string') {
        const recoveryPin = window.sessionStorage.getItem(RECOVERY_PIN_STORAGE_KEY);
        if (recoveryPin) {
          const body = JSON.parse(init.body);
          if (!body.recoveryPin) body.recoveryPin = recoveryPin;
          init = { ...init, body: JSON.stringify(body) };
        }
      }
    } catch {
      // Keep original request if parsing fails.
    }
    return originalFetch(input, init);
  };
}

function ensureRecoveryModal() {
  if (!isBrowser || modalReady) return;
  modalReady = true;
  const backdrop = document.createElement('div');
  backdrop.className = 'arboris-recovery-backdrop';
  backdrop.innerHTML = `
    <form class="arboris-recovery-modal" data-arboris-recovery-form="true">
      <h2>Recuperar senha</h2>
      <p>Use o PIN de recuperação criado no cadastro para definir uma nova senha.</p>
      <label>Usuário
        <input name="username" required autocomplete="username" />
      </label>
      <label>PIN de recuperação
        <input name="recoveryPin" required inputmode="numeric" pattern="\\d{4,12}" minlength="4" maxlength="12" autocomplete="one-time-code" />
      </label>
      <label>Nova senha
        <input name="newPassword" required type="password" minlength="12" maxlength="128" autocomplete="new-password" />
      </label>
      <div class="arboris-recovery-actions">
        <button type="button" data-recovery-close="true">Cancelar</button>
        <button type="submit">Salvar senha</button>
      </div>
      <div class="arboris-recovery-status" role="status"></div>
    </form>
  `;
  document.body.appendChild(backdrop);
  const close = () => backdrop.removeAttribute('data-open');
  backdrop.addEventListener('click', event => {
    if (event.target === backdrop || (event.target as HTMLElement).closest('[data-recovery-close]')) close();
  });
  const form = backdrop.querySelector<HTMLFormElement>('form')!;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const status = form.querySelector<HTMLElement>('.arboris-recovery-status')!;
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    const data = new FormData(form);
    status.textContent = 'Atualizando senha...';
    submit.disabled = true;
    try {
      const response = await fetch('/api/auth/recover', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Arboris-Client': 'web' },
        body: JSON.stringify({
          username: String(data.get('username') || '').trim(),
          recoveryPin: String(data.get('recoveryPin') || '').trim(),
          newPassword: String(data.get('newPassword') || '')
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Não foi possível recuperar a senha.');
      status.textContent = 'Senha atualizada. Entre com a nova senha.';
      setTimeout(close, 1200);
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Erro ao recuperar senha.';
    } finally {
      submit.disabled = false;
    }
  });
}

function openRecoveryModal(prefillUsername = '') {
  ensureRecoveryModal();
  const backdrop = document.querySelector<HTMLElement>('.arboris-recovery-backdrop');
  if (!backdrop) return;
  const username = backdrop.querySelector<HTMLInputElement>('input[name="username"]');
  if (username && prefillUsername) username.value = prefillUsername;
  backdrop.setAttribute('data-open', 'true');
  username?.focus();
}

function enhancePasswordInputs(root: ParentNode = document) {
  root.querySelectorAll<HTMLInputElement>('input[type="password"], input[data-arboris-visible-password="true"]').forEach(input => {
    if (input.closest('[data-arboris-recovery-form]')) return;
    const host = input.parentElement;
    if (!host || host.querySelector('.arboris-password-toggle')) return;
    host.classList.add('arboris-password-host');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'arboris-password-toggle';
    button.setAttribute('aria-label', 'Mostrar senha');
    button.textContent = '👁';
    button.addEventListener('click', () => {
      const visible = input.type === 'text';
      input.type = visible ? 'password' : 'text';
      input.dataset.arborisVisiblePassword = visible ? 'false' : 'true';
      button.setAttribute('aria-label', visible ? 'Mostrar senha' : 'Ocultar senha');
      button.textContent = visible ? '👁' : '🙈';
      input.focus();
    });
    host.appendChild(button);
  });
}

function formText(form: HTMLFormElement) {
  return (form.textContent || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function enhanceLoginRecovery(root: ParentNode = document) {
  root.querySelectorAll<HTMLFormElement>('form').forEach(form => {
    const text = formText(form);
    if (!text.includes('entrar') || !text.includes('usuario') || !form.querySelector('input[type="password"], input[data-arboris-visible-password="true"]')) return;
    if (form.querySelector('.arboris-recovery-trigger')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'arboris-recovery-trigger';
    button.textContent = 'Esqueci minha senha';
    button.addEventListener('click', () => {
      const candidate = form.querySelector<HTMLInputElement>('input[autocomplete="username"], input[type="text"], input:not([type])');
      openRecoveryModal(candidate?.value || '');
    });
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"], button:not([type])');
    submit?.insertAdjacentElement('afterend', button);
  });
}

function enhanceRegistrationPin(root: ParentNode = document) {
  root.querySelectorAll<HTMLFormElement>('form').forEach(form => {
    const text = formText(form);
    const isRegistration = (text.includes('nome') && text.includes('sobrenome') && text.includes('senha')) || text.includes('criar membro');
    if (!isRegistration || form.querySelector('[data-arboris-recovery-pin]')) return;
    const passwordInput = form.querySelector<HTMLInputElement>('input[autocomplete="new-password"], input[type="password"]');
    if (!passwordInput) return;
    const label = document.createElement('label');
    label.className = 'arboris-recovery-pin-field';
    label.dataset.arborisRecoveryPin = 'true';
    label.innerHTML = `PIN de recuperação da senha
      <input required name="recoveryPin" inputmode="numeric" pattern="\\d{4,12}" minlength="4" maxlength="12" autocomplete="one-time-code" placeholder="4 a 12 números" />`;
    const pinInput = label.querySelector<HTMLInputElement>('input')!;
    pinInput.addEventListener('input', () => {
      window.sessionStorage.setItem(RECOVERY_PIN_STORAGE_KEY, pinInput.value.trim());
    });
    const passwordHost = passwordInput.closest('label') || passwordInput.parentElement;
    passwordHost?.insertAdjacentElement('afterend', label);
  });
}

function addBackButtons(root: ParentNode = document) {
  const text = document.body.textContent || '';
  if (!text.includes('Manual Oficial da Comunidade')) return;
  const headings = Array.from(root.querySelectorAll<HTMLElement>('h1,h2,div,span')).filter(el => (el.textContent || '').includes('Manual Oficial da Comunidade'));
  for (const heading of headings) {
    const container = heading.closest<HTMLElement>('.space-y-4, .space-y-3, main, section, div');
    if (!container || container.querySelector('.arboris-back-button')) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'arboris-back-button';
    button.textContent = '← Voltar';
    button.addEventListener('click', () => {
      const candidates = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).filter(item => {
        const label = (item.textContent || '').toLowerCase();
        return label.includes('árvore') || label.includes('arvore') || label.includes('minha árvore') || label.includes('minha arvore');
      });
      candidates[0]?.click();
      if (!candidates.length && history.length > 1) history.back();
    });
    container.insertBefore(button, container.firstChild);
  }
}

function hideRedundantActiveCard() {
  document.querySelectorAll<HTMLElement>('div').forEach(el => {
    const text = el.textContent || '';
    if (!text.includes('Vaga ativada na árvore:')) return;
    const card = el.closest<HTMLElement>('.bg-rose-950\/40, .border-rose-500\/40, div');
    const host = card && (card.className || '').includes('rose') ? card : el.closest<HTMLElement>('div');
    if (host) host.style.display = 'none';
  });
}

function centerNotificationCards() {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('div')).filter(el => {
    if (el.classList.contains('arboris-centered-notification')) return false;
    const text = (el.textContent || '').toLowerCase();
    const style = getComputedStyle(el);
    const positioned = style.position === 'absolute' || style.position === 'fixed';
    if (!positioned) return false;
    return text.includes('notifica') || text.includes('sino') || text.includes('alerta') || text.includes('plantio');
  });
  candidates.forEach(card => {
    card.classList.add('arboris-centered-notification');
    const closeOnOutside = (event: PointerEvent) => {
      if (!card.isConnected) {
        document.removeEventListener('pointerdown', closeOnOutside, true);
        return;
      }
      if (!card.contains(event.target as Node)) {
        card.style.display = 'none';
        document.removeEventListener('pointerdown', closeOnOutside, true);
      }
    };
    setTimeout(() => document.addEventListener('pointerdown', closeOnOutside, true), 0);
  });
}

function runEnhancements(root: ParentNode = document) {
  ensureStyles();
  ensureRecoveryModal();
  enhancePasswordInputs(root);
  enhanceLoginRecovery(root);
  enhanceRegistrationPin(root);
  addBackButtons(root);
  hideRedundantActiveCard();
  centerNotificationCards();
}

if (isBrowser) {
  patchFetch();
  runEnhancements();
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'childList') {
        record.addedNodes.forEach(node => {
          if (node instanceof HTMLElement) runEnhancements(node);
        });
      }
    }
    runEnhancements();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
