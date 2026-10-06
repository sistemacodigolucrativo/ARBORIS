export {};

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
const FINAL_STYLE_ID = 'arboris-member-final-adjustments-style';
const FINAL_TOAST_ID = 'arboris-final-ui-toast';

function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function textOf(element: Element | null) {
  return normalizeText(element?.textContent || '');
}

function ensureStyles() {
  if (!isBrowser || document.getElementById(FINAL_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = FINAL_STYLE_ID;
  style.textContent = `
    .arboris-final-hidden { display: none !important; }
    .arboris-final-tree-promo-button {
      border: 1px solid rgb(16 185 129 / .55);
      border-radius: .75rem;
      background: rgb(6 78 59 / .45);
      color: rgb(110 231 183);
      padding: .35rem .65rem;
      font-size: .68rem;
      font-weight: 900;
      line-height: 1;
      cursor: pointer;
    }
    .arboris-final-tree-promo-button:focus-visible {
      outline: 2px solid rgb(52 211 153);
      outline-offset: 2px;
    }
    .arboris-final-reserved-card {
      margin-top: .75rem !important;
      margin-bottom: .85rem !important;
      border-color: rgb(244 63 94 / .70) !important;
      box-shadow: 0 18px 45px rgb(127 29 29 / .30) !important;
    }
    .arboris-final-activation {
      margin-top: .72rem;
      padding-top: .72rem;
      border-top: 1px solid rgb(251 113 133 / .35);
      display: grid;
      gap: .55rem;
    }
    .arboris-final-activation-message {
      color: rgb(255 228 230);
      font-size: .76rem;
      line-height: 1.35;
      font-weight: 700;
    }
    .arboris-final-activation-balance {
      color: rgb(226 232 240);
      font-size: .72rem;
      line-height: 1.35;
    }
    .arboris-final-activation button {
      width: 100% !important;
      border-radius: .9rem !important;
    }
    #${FINAL_TOAST_ID} {
      position: fixed;
      left: 50%;
      top: 1rem;
      transform: translateX(-50%);
      z-index: 10050;
      width: min(92vw, 420px);
      border: 1px solid rgb(52 211 153 / .75);
      border-radius: 1rem;
      background: rgb(15 23 42 / .98);
      color: rgb(241 245 249);
      padding: .82rem 1rem;
      font-size: .78rem;
      font-weight: 800;
      box-shadow: 0 20px 60px rgb(0 0 0 / .38);
      text-align: center;
    }
  `;
  document.head.appendChild(style);
}

function showToast(message: string) {
  if (!isBrowser) return;
  let toast = document.getElementById(FINAL_TOAST_ID);
  if (!toast) {
    toast = document.createElement('div');
    toast.id = FINAL_TOAST_ID;
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  window.clearTimeout(Number((toast as HTMLElement).dataset.hideTimer || 0));
  const timer = window.setTimeout(() => toast?.remove(), 2200);
  (toast as HTMLElement).dataset.hideTimer = String(timer);
}

function findButtonByText(label: string) {
  const target = normalizeText(label);
  return Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
    .find(button => textOf(button).includes(target));
}

function findSmallestDivContaining(...needles: string[]) {
  const normalizedNeedles = needles.map(normalizeText);
  return Array.from(document.querySelectorAll<HTMLElement>('div'))
    .filter(div => {
      const text = textOf(div);
      return normalizedNeedles.every(needle => text.includes(needle));
    })
    .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)[0] || null;
}

function replacePlainText() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  for (const node of nodes) {
    const value = node.nodeValue || '';
    if (value.includes('Desempenho da Minha Divulgação')) {
      node.nodeValue = value.replace(/Desempenho da Minha Divulgação/g, 'Meu Desempenho');
    }
    if (value.includes('Desempenho da minha divulgação')) {
      node.nodeValue = value.replace(/Desempenho da minha divulgação/g, 'Meu Desempenho');
    }
    if (value.includes('Sem recebimento garantido')) {
      const parent = node.parentElement;
      if (parent && parent.textContent?.trim() === 'Sem recebimento garantido') {
        parent.classList.add('arboris-final-hidden');
      } else {
        node.nodeValue = value.replace(/Sem recebimento garantido/g, '');
      }
    }
  }
}

function rewriteCommunityObjective() {
  const card = findSmallestDivContaining('objetivo comunitario', 'cada amigo convidado');
  if (!card || card.dataset.arborisFinalObjective === 'true') return;
  card.dataset.arborisFinalObjective = 'true';
  card.innerHTML = '💡 <strong>Objetivo Comunitário:</strong> Cada amigo convidado deve informar o <strong>username da pessoa que está no centro da árvore</strong>. Esse username identifica o Tronco atual e direciona a entrada para a base correta da árvore.';
}

function clickMarketingTab() {
  const marketingButton = findButtonByText('Divulgação');
  marketingButton?.click();
}

function integrateMarketingShortcut() {
  const treeStatusLine = Array.from(document.querySelectorAll<HTMLElement>('div, span'))
    .filter(element => {
      const text = textOf(element);
      return text.includes('sementes') && text.includes('ciclo #') && !element.querySelector('button');
    })
    .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)[0];

  if (!treeStatusLine || treeStatusLine.dataset.arborisFinalMarketing === 'true') return;
  treeStatusLine.dataset.arborisFinalMarketing = 'true';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'arboris-final-tree-promo-button';
  button.textContent = 'Divulgação';
  button.addEventListener('click', clickMarketingTab);
  treeStatusLine.textContent = '';
  treeStatusLine.appendChild(button);
}

function findMemberSubNav() {
  return Array.from(document.querySelectorAll<HTMLElement>('div'))
    .filter(div => {
      const text = textOf(div);
      const buttons = div.querySelectorAll('button').length;
      return buttons >= 2 && text.includes('minha arvore') && text.includes('divulgacao');
    })
    .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)[0] || null;
}

function consolidateReservedCard() {
  const reservedCard = findSmallestDivContaining('vaga reservada na arvore', 'voce ocupa');
  const activatedCard = findSmallestDivContaining('vaga ativada na arvore', 'voce ocupa');

  if (activatedCard && !reservedCard) {
    activatedCard.classList.add('arboris-final-hidden');
  }

  if (!reservedCard) return;
  reservedCard.classList.add('arboris-final-reserved-card');

  const nav = findMemberSubNav();
  if (nav && reservedCard.previousElementSibling !== nav) {
    nav.insertAdjacentElement('afterend', reservedCard);
  }

  const activationCard = findSmallestDivContaining('sua vaga na arvore esta reservada', 'saldo disponivel');
  if (!activationCard || activationCard === reservedCard) return;

  let slot = reservedCard.querySelector<HTMLElement>('.arboris-final-activation');
  if (!slot) {
    slot = document.createElement('div');
    slot.className = 'arboris-final-activation';
    reservedCard.appendChild(slot);
  }

  const balanceMatch = (activationCard.textContent || '').match(/Saldo disponível:\s*[^.\n]+\.?/i);
  const activationButton = Array.from(activationCard.querySelectorAll<HTMLButtonElement>('button'))
    .find(button => textOf(button).includes('ativar') && textOf(button).includes('pix'));

  if (!slot.querySelector('.arboris-final-activation-message')) {
    const message = document.createElement('div');
    message.className = 'arboris-final-activation-message';
    message.textContent = 'Sua vaga na árvore está reservada. Envie a solicitação Pix para ativar.';
    slot.appendChild(message);
  }

  let balance = slot.querySelector<HTMLElement>('.arboris-final-activation-balance');
  if (!balance) {
    balance = document.createElement('div');
    balance.className = 'arboris-final-activation-balance';
    slot.appendChild(balance);
  }
  balance.textContent = balanceMatch?.[0] || 'Saldo disponível: confira suas sementes.';

  if (activationButton && activationButton.parentElement !== slot) {
    slot.appendChild(activationButton);
  }

  activationCard.classList.add('arboris-final-hidden');
}

function enhancePixCopyButton() {
  Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
    .filter(button => textOf(button) === 'copiar')
    .forEach(button => {
      if (button.dataset.arborisFinalCopy === 'true') return;
      button.dataset.arborisFinalCopy = 'true';
      button.addEventListener('click', () => {
        const original = button.textContent || 'Copiar';
        button.textContent = 'Copiado!';
        showToast('Chave Pix copiada com sucesso.');
        window.setTimeout(() => { button.textContent = original; }, 1800);
      });
    });
}

function annotateWhatsappAction() {
  Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
    .filter(button => textOf(button).includes('ja realizei minha doacao'))
    .forEach(button => {
      if (button.dataset.arborisFinalWhatsapp === 'true') return;
      button.dataset.arborisFinalWhatsapp = 'true';
      button.title = 'Enviar solicitação e abrir WhatsApp do Tronco quando houver telefone cadastrado.';
    });
}

function applyFinalMemberAdjustments() {
  if (!isBrowser || !document.body) return;
  ensureStyles();
  replacePlainText();
  rewriteCommunityObjective();
  integrateMarketingShortcut();
  consolidateReservedCard();
  enhancePixCopyButton();
  annotateWhatsappAction();
}

if (isBrowser) {
  const run = () => applyFinalMemberAdjustments();
  run();
  window.setTimeout(run, 80);
  window.setTimeout(run, 350);
  const observer = new MutationObserver(() => run());
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
}
