export default {
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
