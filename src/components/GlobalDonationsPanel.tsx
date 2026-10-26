import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, HeartHandshake, RefreshCw, Users } from 'lucide-react';
import { apiRequest } from '../services/api';

interface DonationRecord {
  id: number;
  donor: string;
  recipient: string;
  amount: number;
  createdAt: string;
}

interface DonationFeedResponse {
  success: boolean;
  items: DonationRecord[];
  total: number;
  page: number;
  pageSize: number;
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function formatDateTime(raw: string) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return 'Horário indisponível';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(date);
}

export function GlobalDonationsPanel({ onBack }: { onBack: () => void }) {
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [feed, setFeed] = useState<DonationFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    apiRequest<DonationFeedResponse>(`/global-donations?page=${page}`)
      .then(response => {
        if (active) setFeed(response);
      })
      .catch((failure: unknown) => {
        if (active) {
          setFeed(null);
          setError(failure instanceof Error ? failure.message : 'Falha ao consultar as doações.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [page, reload]);

  return (
    <section className="member-global-donations space-y-4 animate-in fade-in duration-150" aria-labelledby="global-donations-heading">
      <div className="rounded-2xl border border-emerald-900/60 bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-900 p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </button>
          <button
            type="button"
            onClick={() => setReload(value => value + 1)}
            disabled={loading}
            title="Atualizar lista de doações"
            aria-label="Atualizar lista de doações"
            className="flex shrink-0 items-center gap-1 rounded-lg border border-emerald-700/60 bg-emerald-950/60 px-3 py-2 text-xs text-emerald-200 transition hover:bg-emerald-900/70 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Atualizar
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-700/40 bg-emerald-500/10 text-emerald-300">
            <HeartHandshake className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id="global-donations-heading" className="text-lg font-black text-slate-100">Doações Globais</h2>
            <p className="text-[11px] leading-relaxed text-slate-400">Ativações confirmadas pela comunidade</p>
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-300">
          Exibimos somente ativações aprovadas pelo tronco e registradas no histórico interno.
          Os nomes aparecem parcialmente ocultos para preservar a privacidade.
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
          <Users className="h-4 w-4" aria-hidden="true" />
          Histórico comunitário
        </span>
        {feed && <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-mono text-slate-400">{feed.total} {feed.total === 1 ? 'registro' : 'registros'}</span>}
      </div>

      {loading ? (
        <div role="status" aria-live="polite" className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-center text-xs text-slate-300">
          Carregando doações confirmadas…
        </div>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-rose-800/70 bg-rose-950/30 p-4 space-y-3">
          <p className="text-xs leading-relaxed text-rose-200">{error}</p>
          <button type="button" onClick={() => setReload(value => value + 1)}
            className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">
            Tentar novamente
          </button>
        </div>
      ) : feed?.items.length ? (
        <div className="space-y-2.5" aria-live="polite">
          {feed.items.map(entry => (
            <article key={entry.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5 sm:p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    Ativação aprovada
                  </div>
                  <p className="break-words text-xs leading-relaxed text-slate-100">
                    <strong>{entry.donor}</strong> doou para <strong>{entry.recipient}</strong>
                  </p>
                  <p className="text-[10px] text-slate-400">{formatDateTime(entry.createdAt)}</p>
                </div>
                <span className="shrink-0 rounded-xl border border-emerald-800/60 bg-emerald-950/60 px-2.5 py-2 text-xs font-black text-emerald-300 tabular-nums">
                  {currency.format(entry.amount)}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-center text-xs leading-relaxed text-slate-400">
          Nenhuma doação confirmada foi encontrada {page > 1 ? 'nesta página.' : 'até o momento.'}
        </div>
      )}

      {feed && feed.total > feed.pageSize && !error && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
          <button type="button" disabled={loading || page === 1} onClick={() => setPage(value => Math.max(1, value - 1))}
            className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-40">
            Anterior
          </button>
          <span className="text-[10px] font-mono text-slate-400">Página {page} de {Math.max(1, Math.ceil(feed.total / feed.pageSize))}</span>
          <button type="button" disabled={loading || page * feed.pageSize >= feed.total} onClick={() => setPage(value => value + 1)}
            className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-40">
            Próxima
          </button>
        </div>
      )}

      <p className="px-1 text-center text-[10px] leading-relaxed text-slate-500">
        Os valores representam as doações Pix declaradas como recebidas e aprovadas pelo tronco.
        O sistema não realiza verificação bancária independente e os registros não são garantia de recebimentos futuros.
      </p>
    </section>
  );
}
