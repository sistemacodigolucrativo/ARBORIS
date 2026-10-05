(() => {
  const STYLE_ID = 'arboris-leaf-node-visuals';
  const scriptUrl = document.currentScript?.src || document.baseURI;
  const leafUrl = new URL('arboris-leaf-node.png', scriptUrl).href;

  const sizeByLevel = {
    lg: { px: 96, nameClass: 'arboris-leaf-name-lg', old: 56 },
    md: { px: 82, nameClass: 'arboris-leaf-name-md', old: 44 },
    sm: { px: 72, nameClass: 'arboris-leaf-name-sm', old: 32 },
  };

  const levelForPosition = (pos) => {
    if (pos <= 2) return 'lg';
    if (pos <= 6) return 'md';
    return 'sm';
  };

  const variantForPosition = (pos) => {
    if ([1, 3, 4, 7, 8, 13, 14].includes(pos)) return 'left';
    if ([2, 5, 6, 9, 10, 11, 12].includes(pos)) return 'right';
    return pos % 2 === 0 ? 'bottom' : 'top';
  };

  const injectStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .arboris-leaf-node {
        background: transparent !important;
        background-color: transparent !important;
        border: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        overflow: visible !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
        padding: 0 !important;
      }
      .arboris-leaf-node::before {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 0;
        background-image: var(--arboris-leaf-url);
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        transform: var(--arboris-leaf-transform, rotate(0deg));
        transform-origin: center center;
        pointer-events: none;
        filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.45));
      }
      .arboris-leaf-node.arboris-leaf-current::before {
        filter: drop-shadow(0 0 11px rgba(52, 211, 153, 0.95)) drop-shadow(0 7px 8px rgba(0, 0, 0, 0.45));
      }
      .arboris-leaf-node.arboris-leaf-reserved::before {
        filter: drop-shadow(0 0 10px rgba(244, 63, 94, 0.9)) drop-shadow(0 7px 8px rgba(0, 0, 0, 0.45));
      }
      .arboris-leaf-label {
        position: relative;
        z-index: 2;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 72%;
        min-width: 0;
        transform: translateY(2px);
        pointer-events: none;
      }
      .arboris-leaf-index,
      .arboris-leaf-name {
        color: #fff !important;
        font-weight: 900 !important;
        letter-spacing: -0.02em;
        text-align: center;
        line-height: 1.02;
        text-shadow:
          0 1px 0 rgba(0,0,0,1),
          0 -1px 0 rgba(0,0,0,0.9),
          1px 0 0 rgba(0,0,0,0.9),
          -1px 0 0 rgba(0,0,0,0.9),
          0 0 8px rgba(0,0,0,0.95),
          0 0 13px rgba(0,0,0,0.85);
        -webkit-text-stroke: 0.35px rgba(0,0,0,0.92);
      }
      .arboris-leaf-index {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        font-size: 12px;
      }
      .arboris-leaf-name {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .arboris-leaf-name-lg { font-size: 11px; max-width: 70px; }
      .arboris-leaf-name-md { font-size: 10px; max-width: 60px; }
      .arboris-leaf-name-sm { font-size: 9px; max-width: 52px; }
      .arboris-leaf-you {
        margin-top: 2px;
        border-radius: 999px;
        padding: 1px 5px;
        background: rgba(52, 211, 153, 0.96);
        color: #052e16 !important;
        font-size: 8px;
        font-weight: 950;
        line-height: 1;
        text-shadow: none;
      }
    `;
    document.head.appendChild(style);
  };

  const parsePx = (value) => {
    if (!value || !value.endsWith('px')) return null;
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
  };

  const shiftCssValue = (value, delta) => {
    const px = parsePx(value);
    if (px === null) return value;
    return `${px - delta}px`;
  };

  const extractPosition = (node) => {
    const title = node.getAttribute('title') || '';
    const text = node.textContent || '';
    const match = `${title} ${text}`.match(/#(1[0-4]|[1-9])\b/);
    return match ? Number(match[1]) : null;
  };

  const extractOriginalName = (node, pos) => {
    const title = node.getAttribute('title') || '';
    const titleMatch = title.match(/:\s*(.+)$/);
    if (titleMatch) return titleMatch[1].trim();

    const text = (node.textContent || '')
      .replace(new RegExp(`#${pos}\\b`, 'g'), ' ')
      .replace(/VOCÊ/gi, ' ')
      .replace(/Vaga\s+Livre/gi, 'Vaga Livre')
      .replace(/\s+/g, ' ')
      .trim();
    return text;
  };

  const tokenizeName = (raw) => {
    const clean = String(raw || '')
      .replace(/^@/, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean || /^(livre|vaga|vaga livre)$/i.test(clean)) {
      return { first: 'Livre', surnameInitial: '', isVacant: true };
    }

    const parts = clean.split(/[\s._-]+/).filter(Boolean);
    const first = parts[0] || clean;
    const last = parts.length > 1 ? parts[parts.length - 1] : '';
    return {
      first,
      surnameInitial: last ? `${last.charAt(0).toUpperCase()}.` : '',
      isVacant: false,
    };
  };

  const buildLabels = (nodes) => {
    const parsed = nodes.map((node) => {
      const pos = extractPosition(node);
      const raw = extractOriginalName(node, pos);
      const name = tokenizeName(raw);
      return { node, pos, raw, ...name };
    }).filter(item => item.pos !== null);

    const counts = new Map();
    parsed.forEach((item) => {
      if (item.isVacant) return;
      const key = item.first.toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    const labels = new Map();
    parsed.forEach((item) => {
      if (item.isVacant) {
        labels.set(item.pos, 'Livre');
        return;
      }
      const repeated = (counts.get(item.first.toLowerCase()) || 0) > 1;
      labels.set(item.pos, `${item.first}${repeated && item.surnameInitial ? ` ${item.surnameInitial}` : ''}`.trim());
    });
    return labels;
  };

  const preserveAndResize = (node, pos) => {
    const level = levelForPosition(pos);
    const size = sizeByLevel[level];
    const delta = (size.px - size.old) / 2;

    if (!node.dataset.arborisOriginalPosition) {
      node.dataset.arborisOriginalPosition = JSON.stringify({
        left: node.style.left,
        right: node.style.right,
        top: node.style.top,
        bottom: node.style.bottom,
      });
    }

    let original;
    try {
      original = JSON.parse(node.dataset.arborisOriginalPosition || '{}');
    } catch {
      original = {};
    }

    node.style.width = `${size.px}px`;
    node.style.height = `${size.px}px`;

    if (original.left) node.style.left = shiftCssValue(original.left, delta);
    if (original.right) node.style.right = shiftCssValue(original.right, delta);
    if (original.top) node.style.top = shiftCssValue(original.top, delta);
    if (original.bottom) node.style.bottom = shiftCssValue(original.bottom, delta);

    return size;
  };

  const applyLeafNode = (node, labels) => {
    const pos = extractPosition(node);
    if (!pos) return;

    const level = levelForPosition(pos);
    const size = preserveAndResize(node, pos);
    const variant = variantForPosition(pos);
    const originalText = node.textContent || '';
    const wasCurrentUser = /VOCÊ/i.test(originalText);
    const wasReserved = String(node.className || '').includes('rose');
    const label = labels.get(pos) || 'Livre';

    const transform = variant === 'left'
      ? 'rotate(-7deg)'
      : variant === 'right'
      ? 'scaleX(-1) rotate(-7deg)'
      : variant === 'bottom'
      ? 'rotate(4deg)'
      : 'rotate(-1deg)';

    node.classList.add('arboris-leaf-node');
    node.classList.toggle('arboris-leaf-current', wasCurrentUser);
    node.classList.toggle('arboris-leaf-reserved', wasReserved);
    node.style.setProperty('--arboris-leaf-url', `url("${leafUrl}")`);
    node.style.setProperty('--arboris-leaf-transform', transform);
    node.setAttribute('title', `Posição #${pos}: ${label === 'Livre' ? 'Vaga Livre' : label}`);
    node.innerHTML = `
      <span class="arboris-leaf-label">
        <span class="arboris-leaf-index">#${pos}</span>
        <span class="arboris-leaf-name ${size.nameClass}">${label}</span>
        ${wasCurrentUser ? '<span class="arboris-leaf-you">VOCÊ</span>' : ''}
      </span>
    `;
  };

  const findRadialCanvases = () => Array.from(document.querySelectorAll('div'))
    .filter((el) => {
      const className = String(el.className || '');
      return className.includes('w-[330px]') && className.includes('h-[330px]');
    });

  const applyAll = () => {
    injectStyle();
    findRadialCanvases().forEach((canvas) => {
      const nodes = Array.from(canvas.children)
        .filter((child) => child instanceof HTMLElement)
        .filter((child) => {
          const pos = extractPosition(child);
          if (!pos) return false;
          const text = child.textContent || '';
          return !/TRONCO/i.test(text);
        });
      if (!nodes.length) return;
      const labels = buildLabels(nodes);
      nodes.forEach((node) => applyLeafNode(node, labels));
    });
  };

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applyAll();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
