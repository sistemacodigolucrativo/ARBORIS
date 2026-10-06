type Replacement = readonly [RegExp, string];

type SanitizableRoot = Node & ParentNode;

const replacements: Replacement[] = [
  [
    /✨\s*100%\s*GRATUITO:\s*Você ganha 25 sementes virtuais logo no cadastro para fortalecer o tronco e entrar no jogo\.\s*❌\s*Sem taxas obrigatórias, sem depósitos no sistema e sem promessa financeira\./gi,
    '🌱 Participação comunitária: o ARBORIS organiza convites, registros e acompanhamento da árvore. 🤝 Doações ou transferências, quando ocorrerem, são feitas diretamente entre participantes, sem intermediação do ARBORIS.'
  ],
  [
    /100%\s*GRATUITO:\s*Você ganha 25 sementes virtuais logo no cadastro para fortalecer o tronco e entrar no jogo\./gi,
    'Participação comunitária: o ARBORIS organiza convites, registros e acompanhamento da árvore.'
  ],
  [
    /100%\s*Gratuito\s*&\s*Recreativo:/gi,
    'Participação comunitária responsável:'
  ],
  [
    /Todo participante recebe suas sementes gratuitamente no cadastro para participar das rodadas\./gi,
    'As sementes organizam a participação e os registros internos da árvore.'
  ],
  [
    /O Arboris é um ecossistema recreativo comunitário de rotação matemática em árvore binária de 15 posições, com progressão gerada exclusivamente por bifurcação e sustentada por sementes virtuais gratuitas\./gi,
    'O ARBORIS é uma iniciativa comunitária de arborização e ajuda mútua, organizada em árvore de 15 posições, com regras próprias de participação e registro.'
  ],
  [
    /Sem dinheiro real:\s*Não existem depósitos, transferências PIX, saques, mensalidades ou qualquer promessa de rendimento financeiro\. As sementes são pontos virtuais internos\./gi,
    'Sem intermediação financeira: o ARBORIS não recebe, coleta, custodia, intermedeia ou administra valores. Eventuais doações ou transferências acontecem diretamente entre participantes.'
  ],
  [
    /Você recebeu gratuitamente\s*25 sementes/gi,
    'Você recebeu 25 sementes de participação'
  ],
  [
    /ecossistema comunitário gratuito Arboris/gi,
    'ecossistema comunitário ARBORIS'
  ],
  [
    /100% comunitário · Sem valor financeiro fiduciário/gi,
    'Comunidade · Sem valor financeiro fiduciário'
  ]
];

const sanitizeText = (value: string) =>
  replacements.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), value);

const sanitizeUrlValue = (value: string) => {
  let nextValue = sanitizeText(value);

  try {
    const url = new URL(nextValue, window.location.href);
    const text = url.searchParams.get('text');
    if (text) {
      const sanitizedText = sanitizeText(text);
      if (sanitizedText !== text) {
        url.searchParams.set('text', sanitizedText);
        nextValue = url.toString();
      }
    }
  } catch {
    // Attribute is not a URL; plain text sanitization above is enough.
  }

  return nextValue;
};

const sanitizeTextNode = (node: Text) => {
  const current = node.nodeValue || '';
  const sanitized = sanitizeText(current);
  if (sanitized !== current) node.nodeValue = sanitized;
};

const sanitizeElement = (element: Element) => {
  for (const attribute of ['href', 'title', 'aria-label', 'placeholder']) {
    const current = element.getAttribute(attribute);
    if (!current) continue;
    const sanitized = attribute === 'href' ? sanitizeUrlValue(current) : sanitizeText(current);
    if (sanitized !== current) element.setAttribute(attribute, sanitized);
  }
};

const sanitizeSubtree = (root: SanitizableRoot) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    sanitizeTextNode(node as Text);
    node = walker.nextNode();
  }

  if (root instanceof Element) sanitizeElement(root);
  root.querySelectorAll('[href], [title], [aria-label], [placeholder]').forEach(sanitizeElement);
};

const patchClipboard = () => {
  const clipboard = navigator.clipboard as (Clipboard & { __arborisCommunicationSanitized?: boolean }) | undefined;
  if (!clipboard?.writeText || clipboard.__arborisCommunicationSanitized) return;

  const originalWriteText = clipboard.writeText.bind(clipboard);
  Object.defineProperty(clipboard, 'writeText', {
    configurable: true,
    value: (text: string) => originalWriteText(sanitizeText(String(text)))
  });
  clipboard.__arborisCommunicationSanitized = true;
};

const patchWindowOpen = () => {
  const win = window as typeof window & { __arborisWindowOpenSanitized?: boolean };
  if (win.__arborisWindowOpenSanitized) return;

  const originalOpen = window.open.bind(window);
  window.open = ((url?: string | URL, target?: string, features?: string) => {
    const sanitizedUrl = typeof url === 'string' ? sanitizeUrlValue(url) : url;
    return originalOpen(sanitizedUrl, target, features);
  }) as typeof window.open;
  win.__arborisWindowOpenSanitized = true;
};

const installCommunicationSanitizer = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  patchClipboard();
  patchWindowOpen();

  const start = () => {
    if (!document.body) return;
    sanitizeSubtree(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) sanitizeTextNode(node as Text);
          if (node instanceof Element) sanitizeSubtree(node);
        });

        if (mutation.type === 'attributes' && mutation.target instanceof Element) {
          sanitizeElement(mutation.target);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href', 'title', 'aria-label', 'placeholder']
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
};

installCommunicationSanitizer();
