from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'src' / 'App.tsx'
DATA_STORE = ROOT / 'src' / 'services' / 'dataStore.ts'
WORKFLOW = ROOT / '.github' / 'workflows' / 'process-game-dispatch.yml'
WORKER = ROOT / 'docs' / 'cloudflare-worker-arboris-dispatcher.js'
DOC = ROOT / 'docs' / 'ACTION_DISPATCHER.md'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'Pattern not found: {label}')
    return text.replace(old, new, 1)


def regex_replace_once(text: str, pattern: str, repl: str, label: str) -> str:
    text2, count = re.subn(pattern, repl, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'Regex pattern not found: {label}')
    return text2

store = DATA_STORE.read_text()

store = replace_once(
    store,
    "const ISSUE_URL = `https://github.com/${REPOSITORY}/issues/new`;\n",
    "const ISSUE_URL = `https://github.com/${REPOSITORY}/issues/new`;\nconst ACTION_DISPATCHER_URL = (import.meta.env.VITE_ARBORIS_ACTION_DISPATCHER_URL || '').trim();\nconst ADMIN_EXECUTION_KEY_STORAGE = 'arboris_admin_execution_key_v1';\n",
    'dispatcher constants',
)

store = replace_once(
    store,
    "  private createGameActionIssueUrl(payload: OnlineActionPayload): string {\n",
    "  private getAdminExecutionKey(): string | null {\n    if (typeof window === 'undefined') return null;\n\n    const cached = window.localStorage.getItem(ADMIN_EXECUTION_KEY_STORAGE);\n    if (cached) return cached;\n\n    const typed = window.prompt('Digite a chave de execução administrativa do Arboris para disparar o workflow automaticamente.');\n    const key = typed?.trim();\n    if (!key) return null;\n\n    window.localStorage.setItem(ADMIN_EXECUTION_KEY_STORAGE, key);\n    return key;\n  }\n\n  private async dispatchActionThroughWorkflow(payload: OnlineActionPayload) {\n    if (!ACTION_DISPATCHER_URL) {\n      return {\n        success: false,\n        error: 'Executor automático não configurado. Configure VITE_ARBORIS_ACTION_DISPATCHER_URL com um proxy seguro; o GitHub Pages não pode disparar workflow com token direto no navegador.'\n      };\n    }\n\n    const adminKey = this.getAdminExecutionKey();\n    if (!adminKey) {\n      return {\n        success: false,\n        error: 'Chave de execução administrativa não informada.'\n      };\n    }\n\n    try {\n      const response = await fetch(ACTION_DISPATCHER_URL, {\n        method: 'POST',\n        headers: {\n          'Content-Type': 'application/json',\n          'X-Arboris-Admin-Key': adminKey\n        },\n        body: JSON.stringify({ payload })\n      });\n\n      const text = await response.text();\n      let data: any = {};\n      try {\n        data = text ? JSON.parse(text) : {};\n      } catch {\n        data = { message: text };\n      }\n\n      if (!response.ok) {\n        if (response.status === 401 || response.status === 403) {\n          window.localStorage.removeItem(ADMIN_EXECUTION_KEY_STORAGE);\n        }\n        return {\n          success: false,\n          error: data.error || data.message || `Executor automático recusou a ação (${response.status}).`\n        };\n      }\n\n      return {\n        success: true,\n        result: {\n          dispatched: true,\n          run_url: data.run_url || data.html_url || null,\n          idempotency_key: payload.idempotencyKey,\n          message: data.message || 'Workflow automático disparado.'\n        }\n      };\n    } catch (error: any) {\n      return {\n        success: false,\n        error: `Falha ao acionar executor automático: ${error.message}`\n      };\n    }\n  }\n\n  private createGameActionIssueUrl(payload: OnlineActionPayload): string {\n",
    'dispatcher method insertion',
)

create_tree_new = """  /**
   * Admin: creates a new tree through the automatic workflow dispatcher.
   */
  async createTreeAction(categoryId: number, troncoUserId: number) {
    if (!this.state) await this.loadState();
    const tronco = this.state!.users.find(u => u.id === troncoUserId && u.status === 'active');
    if (!tronco) return { success: false, error: 'Tronco não encontrado ou inativo.' };
    if (tronco.role === 'admin') return { success: false, error: 'O coordenador não pode ser usado como tronco inicial de uma nova árvore.' };
    const category = this.state!.config.categories.find(c => c.id === categoryId && c.isActive);
    if (!category) return { success: false, error: 'Categoria não encontrada ou inativa.' };
    const payload: OnlineActionPayload = {
      action: 'create_tree',
      params: { categoryId, troncoUserId },
      idempotencyKey: this.createIdempotencyKey(`admin_create_tree_${categoryId}_${troncoUserId}`)
    };

    return this.dispatchActionThroughWorkflow(payload);
  }
"""

store = regex_replace_once(
    store,
    r"  /\*\*\n   \* Admin: creates a new tree.*?\n  async createTreeAction\(categoryId: number, troncoUserId: number\) \{.*?\n  \}\n\n  async archiveTreeAction",
    create_tree_new + "\n  async archiveTreeAction",
    'createTreeAction automatic dispatch',
)
DATA_STORE.write_text(store)

app = APP.read_text()
handle_create_new = """  const handleCreateTree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.role !== 'admin') {
      showToast('Erro: somente o coordenador pode criar árvore pelo painel administrativo.');
      return;
    }
    if (currentView !== 'admin' || adminTab !== 'global_trees') {
      showToast('Erro: a criação de árvore deve ser feita em Organização > Árvores.');
      return;
    }

    setAdminActionMessage(null);
    try {
      const res = await dataStore.createTreeAction(newTreeCatId, newTreeTroncoId);
      if (res.success && res.result?.dispatched) {
        setShowCreateTreeModal(false);
        setAdminActionMessage('Workflow automático disparado. Aguarde a Action gravar os JSONs e o GitHub Pages publicar a atualização. Depois use Recarregar JSON.');
        showToast('Workflow automático iniciado para criar a árvore.');
      } else {
        showToast('Erro: ' + (res.error || 'Não foi possível disparar o workflow de criação da árvore.'));
      }
    } catch (e: any) {
      showToast('Erro: ' + e.message);
    }
  };
"""

app = regex_replace_once(
    app,
    r"  const handleCreateTree = async \(e: React\.FormEvent\) => \{.*?\n  \};\n\n  const openAdminOnlineAction",
    handle_create_new + "\n  const openAdminOnlineAction",
    'handleCreateTree UI automatic dispatch',
)
APP.write_text(app)

WORKFLOW.write_text("""name: Process Game Dispatch

on:
  workflow_dispatch:
    inputs:
      payload:
        description: JSON payload da ação Arboris
        required: true
        type: string
      actor:
        description: Conta GitHub autorizada que originou a ação
        required: true
        default: sistemacodigolucrativo
        type: string

permissions:
  contents: write

concurrency:
  group: game-json-write
  cancel-in-progress: false

jobs:
  process-game-dispatch:
    name: Processar ação automática do jogo
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          fetch-depth: 1

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci || npm install

      - name: Validate dispatch payload
        env:
          ACTION_PAYLOAD: ${{ inputs.payload }}
        run: |
          node <<'NODE'
          const fs = require('fs');
          const payload = JSON.parse(process.env.ACTION_PAYLOAD || '{}');
          const allowed = new Set(['create_tree']);

          if (!allowed.has(payload.action)) {
            throw new Error(`Ação não permitida pelo dispatcher automático: ${payload.action}`);
          }

          if (!payload.idempotencyKey || typeof payload.idempotencyKey !== 'string') {
            throw new Error('idempotencyKey obrigatória.');
          }

          fs.writeFileSync('.github-action-payload.json', JSON.stringify(payload), 'utf8');
          NODE

      - name: Validate and update JSON database
        id: run_engine
        env:
          GITHUB_REQUEST_ACTOR: ${{ inputs.actor }}
          ARBORIS_ADMIN_GITHUB_ACTORS: ${{ vars.ARBORIS_ADMIN_GITHUB_ACTORS }}
        run: |
          GAME_ACTION_PAYLOAD="$(cat .github-action-payload.json)" npx tsx scripts/process-game-action.ts

      - name: Commit JSON database changes
        id: commit_data
        run: |
          git config --global user.name "Arboris Bot"
          git config --global user.email "bot@arboris.local"
          git add data/ public/data/
          if git diff --staged --quiet; then
            echo "committed=false" >> "$GITHUB_OUTPUT"
          else
            COMMIT_MSG="${{ steps.run_engine.outputs.commit_message || '[game-data] atualizar dados do jogo' }}"
            git commit -m "$COMMIT_MSG"
            git push origin HEAD
            echo "committed=true" >> "$GITHUB_OUTPUT"
          fi
""")

WORKER.parent.mkdir(parents=True, exist_ok=True)
WORKER.write_text("""export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowedOrigin = env.ALLOWED_ORIGIN || 'https://sistemacodigolucrativo.github.io';
    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Arboris-Admin-Key',
      'Vary': 'Origin'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return Response.json({ error: 'Método não permitido.' }, { status: 405, headers: corsHeaders });
    }

    if (origin !== allowedOrigin) {
      return Response.json({ error: 'Origem não autorizada.' }, { status: 403, headers: corsHeaders });
    }

    const adminKey = request.headers.get('X-Arboris-Admin-Key') || '';
    if (!env.ARBORIS_ADMIN_EXECUTION_KEY || adminKey !== env.ARBORIS_ADMIN_EXECUTION_KEY) {
      return Response.json({ error: 'Chave administrativa inválida.' }, { status: 401, headers: corsHeaders });
    }

    const body = await request.json().catch(() => null);
    const payload = body?.payload;
    if (!payload || payload.action !== 'create_tree') {
      return Response.json({ error: 'Payload inválido ou ação não permitida.' }, { status: 400, headers: corsHeaders });
    }

    const repo = env.GITHUB_REPOSITORY || 'sistemacodigolucrativo/ARBORIS';
    const workflow = env.GITHUB_WORKFLOW || 'process-game-dispatch.yml';
    const ref = env.GITHUB_REF || 'main';
    const actor = env.GITHUB_ACTOR_LOGIN || 'sistemacodigolucrativo';

    const githubResponse = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'arboris-action-dispatcher'
      },
      body: JSON.stringify({
        ref,
        inputs: {
          payload: JSON.stringify(payload),
          actor
        }
      })
    });

    if (!githubResponse.ok && githubResponse.status !== 204) {
      const errorText = await githubResponse.text();
      return Response.json({ error: 'GitHub recusou workflow_dispatch.', details: errorText }, { status: 502, headers: corsHeaders });
    }

    return Response.json({
      ok: true,
      message: 'workflow_dispatch enviado ao GitHub Actions.',
      idempotencyKey: payload.idempotencyKey
    }, { headers: corsHeaders });
  }
};
""")

DOC.write_text("""# Executor automático de ações Arboris

O GitHub Pages é estático. Ele não deve guardar token GitHub no JavaScript do navegador.

A criação automática de árvore pelo botão `Nova Árvore` usa este fluxo seguro:

1. O painel chama `VITE_ARBORIS_ACTION_DISPATCHER_URL`.
2. Um proxy seguro, como Cloudflare Worker, valida a chave administrativa.
3. O proxy chama a API GitHub `workflow_dispatch`.
4. O workflow `process-game-dispatch.yml` executa `scripts/process-game-action.ts`.
5. Os arquivos `data/*.json` e `public/data/*.json` são gravados no repositório.
6. O deploy do GitHub Pages publica os novos JSONs.

## Variáveis necessárias no build do site

```env
VITE_ARBORIS_ACTION_DISPATCHER_URL=https://SEU_WORKER.workers.dev
```

## Secrets/variáveis necessárias no Worker

```txt
GITHUB_TOKEN=token fino com Actions: write no repositório ARBORIS
ARBORIS_ADMIN_EXECUTION_KEY=chave secreta digitada pelo coordenador no painel
ALLOWED_ORIGIN=https://sistemacodigolucrativo.github.io
GITHUB_REPOSITORY=sistemacodigolucrativo/ARBORIS
GITHUB_WORKFLOW=process-game-dispatch.yml
GITHUB_REF=main
GITHUB_ACTOR_LOGIN=sistemacodigolucrativo
```

Nunca coloque `GITHUB_TOKEN` dentro do frontend React/Vite.
""")

print('Automatic workflow dispatcher fix applied.')
