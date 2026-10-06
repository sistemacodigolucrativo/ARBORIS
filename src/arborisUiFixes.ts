export {};

const RECOVERY_PIN_STORAGE_KEY = 'arboris_next_recovery_pin_v1';
let patchedFetch = false;
let modalReady = false;
let cachedUserIds = new Set<number>();
let cachedOrphanUserIds = new Set<number>();

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function elementText(element: HTMLElement) {
  return normalizeText(element.textContent || '');
}

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
    .arboris-reserved-card-consolidated {
      order: -1 !important;
      margin: .25rem 0 .85rem !important;
      box-shadow: 0 16px 40px rgb(127 29 29 / .32) !important;
    }
    .arboris-reserved-card-consolidated .arboris-reserved-extra {
      margin-top: .65rem; padding-top: .65rem; border-top: 1px solid rgb(251 113 133 / .35);
      display: grid; gap: .5rem;
    }
    .arboris-reserved-card-consolidated .arboris-reserved-extra-line {
      margin: 0; color: rgb(255 228 230); font-weight: 700; line-height: 1.35;
    }
    .arboris-reserved-card-consolidated .arboris-reserved-extra button {
      width: 100%; border: 1px solid rgb(52 211 153) !important; border-radius: .9rem !important;
      background: rgb(16 185 129) !important; color: rgb(5 46 22) !important;
      font-weight: 900 !important; padding: .78rem .9rem !important;
    }
    .arboris-position-select-filtered option[hidden] { display: none !important; }
  `;
  document.head.appendChild(style);
}

function updateCachedState(payload: any) {
  try {
    const state = payload?.state || payload?.data?.state;
    const users = Array.isArray(state?.users) ? state.users : [];
    const trees = Array.isArray(state?.trees) ? state.trees : [];
    const positioned = new Set<number>();
    for (const tree of trees) {
      for (const position of tree.positions || []) {
        const userId = Number(position.userId ?? position.user_id);
        if (Number.isInteger(userId) && userId > 0 && position.status === 'occupied') positioned.add(userId);
      }
    }
    cachedUserIds = new Set(users.map((user: any) => Number(user.id)).filter((id: number) => Number.isInteger(id) && id > 0));
    cachedOrphanUserIds = new Set(users
      .filter((user: any) => user.role !== 'admin' && user.status === 'active' && !positioned.has(Number(user.id)))
      .map((user: any) => Number(user.id)));
  } catch {
    // UI filtering is progressive; do not block state loading.
  }
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
      const response = await originalFetch(input, init);
      if (method === 'GET' && /\/api\/state(?:\?|$)/.test(rawUrl)) {
        response.clone().json().then(updateCachedState).catch(() => null);
      }
      return response;
    } catch {
      return originalFetch(input, init);
    }
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
  return normalizeText(form.textContent || '');
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
        const label = normalizeText(item.textContent || '');
        return label.includes('arvore') || label.includes('minha arvore');
      });
      candidates[0]?.click();
      if (!candidates.length && history.length > 1) history.back();
    });
    container.insertBefore(button, container.firstChild);
  }
}

function findCardContainer(source: HTMLElement, requiredTexts: string[]) {
  let current: HTMLElement | null = source;
  for (let i = 0; current && i < 9; i += 1) {
    const text = elementText(current);
    const className = String(current.className || '');
    const looksLikeCard = className.includes('rounded') || className.includes('border') || className.includes('bg-') || current.tagName === 'SECTION';
    if (requiredTexts.every(item => text.includes(item)) && looksLikeCard) return current;
    current = current.parentElement;
  }
  return source.closest<HTMLElement>('div');
}

function hideRedundantActiveCard() {
  document.querySelectorAll<HTMLElement>('div').forEach(el => {
    const text = elementText(el);
    if (!text.includes('vaga ativada') || !text.includes('arvore')) return;
    const card = findCardContainer(el, ['vaga ativada', 'arvore']);
    if (card) card.style.display = 'none';
  });
}

function getSmallestElementByText(querySelector: string, matcher: (text: string) => boolean) {
  return Array.from(document.querySelectorAll<HTMLElement>(querySelector))
    .filter(el => matcher(elementText(el)))
    .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)[0] || null;
}

function ensureReservedExtra(reservedCard: HTMLElement, sourceCard: HTMLElement | null) {
  let extra = reservedCard.querySelector<HTMLElement>('.arboris-reserved-extra');
  if (!extra) {
    extra = document.createElement('div');
    extra.className = 'arboris-reserved-extra';
    reservedCard.appendChild(extra);
  }

  const currentText = elementText(reservedCard);
  if (!currentText.includes('sua vaga na arvore esta reservada')) {
    const line = document.createElement('p');
    line.className = 'arboris-reserved-extra-line';
    line.textContent = 'Sua vaga na árvore está reservada. Envie a solicitação Pix para ativar.';
    extra.appendChild(line);
  }
  if (!currentText.includes('saldo disponivel')) {
    const line = document.createElement('p');
    line.className = 'arboris-reserved-extra-line';
    line.textContent = 'Saldo disponível: 25 sementes.';
    extra.appendChild(line);
  }

  if (!extra.querySelector('button') && sourceCard) {
    const actionButton = Array.from(sourceCard.querySelectorAll<HTMLButtonElement>('button')).find(button => {
      const label = normalizeText(button.textContent || '');
      return label.includes('ativar') || label.includes('pix') || label.includes('solicitacao');
    });
    if (actionButton) extra.appendChild(actionButton);
  }
}

function consolidateReservedCard() {
  const treeBoard = document.querySelector<HTMLElement>('.arboris-tree-board');
  if (!treeBoard?.parentElement) return;

  const reservedMarker = getSmallestElementByText('div,section,article,span', text => {
    return text.includes('vaga reservada') && text.includes('arvore');
  });
  if (!reservedMarker) return;

  const reservedCard = findCardContainer(reservedMarker, ['vaga reservada', 'arvore']);
  if (!reservedCard || reservedCard.contains(treeBoard)) return;

  reservedCard.classList.add('arboris-reserved-card-consolidated');
  reservedCard.style.display = '';
  treeBoard.parentElement.insertBefore(reservedCard, treeBoard);

  const instructionMarker = getSmallestElementByText('div,section,article,p,span', text => {
    if (text.includes('vaga reservada') && text.includes('arvore')) return false;
    return text.includes('solicitacao pix') || text.includes('saldo disponivel') || text.includes('ativar 25') || (text.includes('sua vaga') && text.includes('reservada'));
  });
  const sourceCard = instructionMarker ? findCardContainer(instructionMarker, []) || instructionMarker : null;

  ensureReservedExtra(reservedCard, sourceCard && sourceCard !== reservedCard ? sourceCard : null);

  if (sourceCard && sourceCard !== reservedCard && !reservedCard.contains(sourceCard)) {
    sourceCard.dataset.arborisMergedIntoReserved = 'true';
    sourceCard.style.display = 'none';
  }
}

function filterPositionDropdowns() {
  if (!cachedUserIds.size) return;
  const orphanIds = cachedOrphanUserIds;
  for (const select of Array.from(document.querySelectorAll<HTMLSelectElement>('select'))) {
    const options = Array.from(select.options);
    const userOptionCount = options.filter(option => cachedUserIds.has(Number(option.value))).length;
    if (userOptionCount < 2) continue;
    const context = normalizeText(select.closest<HTMLElement>('form,details,.space-y-2,.space-y-3,.space-y-4,div')?.textContent || '');
    const looksLikePositionControl = context.includes('posicao') || context.includes('atribuir') || context.includes('membro') || context.includes('arvore');
    if (!looksLikePositionControl) continue;

    select.classList.add('arboris-position-select-filtered');
    let visibleSelected = false;
    for (const option of options) {
      const userId = Number(option.value);
      if (!cachedUserIds.has(userId)) continue;
      const isOrphan = orphanIds.has(userId);
      option.hidden = !isOrphan;
      option.disabled = !isOrphan;
      if (option.selected && isOrphan) visibleSelected = true;
    }
    if (!visibleSelected) {
      const next = options.find(option => !option.disabled && !option.hidden && cachedUserIds.has(Number(option.value)));
      if (next && select.value !== next.value) {
        select.value = next.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }
}

function centerNotificationCards() {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('div')).filter(el => {
    if (el.classList.contains('arboris-centered-notification')) return false;
    const text = normalizeText(el.textContent || '');
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
  consolidateReservedCard();
  filterPositionDropdowns();
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
