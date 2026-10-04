const REPOSITORY = 'sistemacodigolucrativo/ARBORIS';
const BRANCH = 'main';
const API_VERSION = '2022-11-28';
const API_ROOT = `https://api.github.com/repos/${REPOSITORY}`;
const TOKEN_STORAGE_KEY = 'arboris_github_fine_grained_token_v1';

export type JsonFile<T = unknown> = {
  path: string;
  json: T | null;
  sha: string | null;
  exists: boolean;
};

export type JsonWriteFile = {
  path: string;
  json: unknown;
};

export class GitHubJsonWriterError extends Error {
  status?: number;
  code: 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'RATE_LIMIT' | 'GITHUB_ERROR';

  constructor(message: string, code: GitHubJsonWriterError['code'] = 'GITHUB_ERROR', status?: number) {
    super(message);
    this.name = 'GitHubJsonWriterError';
    this.code = code;
    this.status = status;
  }
}

export function getStoredGithubToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredGithubToken(token: string): void {
  if (typeof window === 'undefined') return;
  const clean = token.trim();
  if (!clean) {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(TOKEN_STORAGE_KEY, clean);
}

export function clearStoredGithubToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function ensureGithubToken(): string {
  const stored = getStoredGithubToken();
  if (stored) return stored;

  if (typeof window !== 'undefined') {
    const typed = window.prompt('Informe o token de escrita do GitHub para salvar alterações nos JSONs.');
    const clean = typed?.trim();
    if (clean) {
      setStoredGithubToken(clean);
      return clean;
    }
  }

  throw new GitHubJsonWriterError(
    'Informe o token de escrita do GitHub para salvar alterações nos JSONs.',
    'TOKEN_MISSING'
  );
}

function encodeUtf8Base64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeUtf8Base64(value: string): string {
  const binary = atob(value.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function formatJson(json: unknown): string {
  return `${JSON.stringify(json, null, 2)}\n`;
}

async function parseGitHubError(response: Response): Promise<GitHubJsonWriterError> {
  let body: any = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }

  const remaining = response.headers.get('x-ratelimit-remaining');
  const reset = response.headers.get('x-ratelimit-reset');
  const message = body.message || `GitHub API recusou a operação (${response.status}).`;

  if (response.status === 401) {
    clearStoredGithubToken();
    return new GitHubJsonWriterError('Token de escrita do GitHub ausente, inválido ou expirado.', 'TOKEN_INVALID', 401);
  }

  if (response.status === 403 && remaining === '0') {
    const resetAt = reset ? new Date(Number(reset) * 1000).toLocaleString() : 'o horário informado pelo GitHub';
    return new GitHubJsonWriterError(`Limite da GitHub API atingido. Tente novamente após ${resetAt}.`, 'RATE_LIMIT', 403);
  }

  if (response.status === 403) {
    return new GitHubJsonWriterError('Token sem permissão Contents: Read and Write para o repositório ARBORIS.', 'FORBIDDEN', 403);
  }

  if (response.status === 404) {
    return new GitHubJsonWriterError(`Arquivo ou repositório não encontrado pela GitHub API: ${message}`, 'NOT_FOUND', 404);
  }

  if (response.status === 409) {
    return new GitHubJsonWriterError('Conflito de SHA ao gravar JSON remoto. Recarregue e tente novamente.', 'CONFLICT', 409);
  }

  return new GitHubJsonWriterError(message, 'GITHUB_ERROR', response.status);
}

async function githubRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = ensureGithubToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': API_VERSION,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {})
    }
  });

  if (!response.ok) throw await parseGitHubError(response);
  return response.json() as Promise<T>;
}

export async function getJsonFile<T = unknown>(path: string): Promise<JsonFile<T>> {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const url = `${API_ROOT}/contents/${encodedPath}?ref=${BRANCH}`;

  try {
    const data: any = await githubRequest(url);
    const raw = decodeUtf8Base64(String(data.content || ''));
    return { path, json: JSON.parse(raw) as T, sha: data.sha, exists: true };
  } catch (error: any) {
    if (error instanceof GitHubJsonWriterError && error.status === 404) {
      return { path, json: null, sha: null, exists: false };
    }
    throw error;
  }
}

export async function updateJsonFile(
  path: string,
  json: unknown,
  sha: string | null,
  message: string
): Promise<{ path: string; sha: string | null; commitSha: string | null }> {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const url = `${API_ROOT}/contents/${encodedPath}`;

  const write = async (currentSha: string | null, retry: boolean) => {
    const payload: Record<string, unknown> = {
      message,
      content: encodeUtf8Base64(formatJson(json)),
      branch: BRANCH
    };
    if (currentSha) payload.sha = currentSha;

    try {
      const result: any = await githubRequest(url, { method: 'PUT', body: JSON.stringify(payload) });
      return { path, sha: result.content?.sha || null, commitSha: result.commit?.sha || null };
    } catch (error: any) {
      if (!retry && error instanceof GitHubJsonWriterError && error.status === 409) {
        const remote = await getJsonFile(path);
        return write(remote.sha, true);
      }
      throw error;
    }
  };

  if (!sha) {
    const remote = await getJsonFile(path);
    return write(remote.sha, false);
  }
  return write(sha, false);
}

export async function commitJsonPair(dataPath: string, publicPath: string, json: unknown, message: string) {
  return commitMultipleJsonFiles([
    { path: dataPath, json },
    { path: publicPath, json }
  ], message);
}

export async function commitMultipleJsonFiles(files: JsonWriteFile[], message: string) {
  const results: Array<{ path: string; sha: string | null; commitSha: string | null }> = [];
  for (const file of files) {
    const remote = await getJsonFile(file.path);
    const result = await updateJsonFile(file.path, file.json, remote.sha, message);
    results.push(result);
  }
  return results;
}
