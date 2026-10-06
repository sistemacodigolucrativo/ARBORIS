export {};

const LOGIN_TIMEOUT_MS = 12000;
let loginTimeoutPatched = false;

const isBrowser = typeof window !== 'undefined';

function getUrl(input: RequestInfo | URL) {
  return input instanceof Request ? input.url : String(input);
}

function getMethod(input: RequestInfo | URL, init?: RequestInit) {
  return String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
}

function shouldGuardLoginRequest(input: RequestInfo | URL, init?: RequestInit) {
  const url = getUrl(input);
  const method = getMethod(input, init);
  return (
    (method === 'POST' && /\/(?:api|arboris-api)\/auth\/login(?:\?|$)/.test(url)) ||
    (method === 'GET' && /\/(?:api|arboris-api)\/state(?:\?|$)/.test(url))
  );
}

if (isBrowser && !loginTimeoutPatched) {
  loginTimeoutPatched = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!shouldGuardLoginRequest(input, init)) return originalFetch(input, init);

    return new Promise<Response>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        reject(new Error('Tempo esgotado. Verifique sua conexão e tente novamente.'));
      }, LOGIN_TIMEOUT_MS);

      originalFetch(input, init).then(
        response => {
          window.clearTimeout(timer);
          resolve(response);
        },
        error => {
          window.clearTimeout(timer);
          reject(error instanceof Error ? error : new Error('Falha na comunicação com o servidor.'));
        }
      );
    });
  };
}
