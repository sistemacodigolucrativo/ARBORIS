import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Eye,
  HeartHandshake,
  Share2,
  Sprout,
  Trees,
  Users
} from 'lucide-react';

interface PublicLandingPageProps {
  onOpenEntry: () => void;
  onOpenDemoTree: () => void;
  onOpenDirectLogin?: () => void;
  referralData?: {
    username: string;
    full_name: string;
    tree_code: string;
  } | null;
}

const highlights = [
  {
    icon: Sprout,
    title: 'Plante árvores',
    text: 'Participe de uma causa ambiental simples, visual e fácil de compartilhar.'
  },
  {
    icon: Users,
    title: 'Entre por convite',
    text: 'Cada árvore tem vagas limitadas e a entrada acontece por indicação.'
  },
  {
    icon: HeartHandshake,
    title: 'Receba apoio',
    text: 'Membros podem fazer doações diretamente uns aos outros.'
  }
];

const responsibilityPoints = [
  'Doações acontecem diretamente entre participantes.',
  'O ARBORIS não recebe, guarda ou intermedeia valores.',
  'Não existe promessa de recebimento, lucro ou retorno garantido.',
  'Cada participante é responsável pelas relações que fizer dentro da comunidade.'
];

const faqs = [
  {
    q: 'Como alguém pode receber doações?',
    a: 'Pela ajuda mútua entre participantes. Membros podem apoiar outros membros diretamente, conforme a participação na comunidade e as regras apresentadas após o convite.'
  },
  {
    q: 'O ARBORIS paga participantes?',
    a: 'Não. O ARBORIS não paga, não recebe dinheiro e não administra doações. Qualquer apoio financeiro acontece diretamente entre os próprios participantes.'
  },
  {
    q: 'Preciso entender tudo antes de entrar?',
    a: 'Não. A página pública mostra o essencial. O convite apresenta a próxima etapa, a árvore disponível e as regras de participação.'
  }
];

export const PublicLandingPage: React.FC<PublicLandingPageProps> = ({
  onOpenEntry,
  onOpenDemoTree,
  onOpenDirectLogin,
  referralData
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[720px] bg-emerald-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-[38%] -left-32 w-[520px] h-[520px] bg-amber-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 -right-32 w-[560px] h-[560px] bg-teal-500/10 rounded-full blur-[130px]" />
      </div>

      <header className="relative z-20 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md sticky top-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner flex-none">
              <Trees className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-base sm:text-lg tracking-wider bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
                ARBORIS
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-mono tracking-widest text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-700/60">
                Plantio · Convite · Ajuda mútua
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {onOpenDirectLogin && (
              <button
                type="button"
                onClick={onOpenDirectLogin}
                className="hidden sm:inline-flex text-xs font-semibold text-slate-300 hover:text-emerald-300 transition-colors px-3 py-2 rounded-lg hover:bg-slate-900"
              >
                Já tenho acesso
              </button>
            )}
            <button
              type="button"
              onClick={onOpenDemoTree}
              className="text-xs sm:text-sm font-medium text-slate-300 hover:text-emerald-400 transition-colors px-3 py-2 rounded-lg hover:bg-slate-900 flex items-center gap-1.5"
            >
              <Eye className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span className="hidden sm:inline">Ver árvore</span>
              <span className="sm:hidden">Árvore</span>
            </button>
            <button
              type="button"
              onClick={onOpenEntry}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 active:scale-[0.98]"
            >
              <Sprout className="w-4 h-4" aria-hidden="true" />
              <span>Entrar</span>
            </button>
          </div>
        </div>
      </header>

      {referralData && (
        <div className="relative z-10 bg-gradient-to-r from-emerald-900/60 via-slate-900 to-amber-900/60 border-b border-emerald-500/30 px-4 py-3 text-center animate-in fade-in slide-in-from-top-4">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>Convite de <strong>@{referralData.username}</strong> para a árvore <strong>{referralData.tree_code}</strong>.</span>
            </div>
            <button
              type="button"
              onClick={onOpenEntry}
              className="px-3 py-1 bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-emerald-400 transition-all shadow"
            >
              Entrar por este convite
            </button>
          </div>
        </div>
      )}

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-12 sm:space-y-16">
        <section className="text-center space-y-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider shadow-inner">
            <HeartHandshake className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Comunidade por convite</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-tight text-slate-100 max-w-4xl mx-auto">
            Receba doações por plantar árvores
          </h1>

          <p className="text-slate-300 text-base sm:text-xl leading-relaxed max-w-3xl mx-auto">
            Entre em uma árvore ativa, participe de uma causa ambiental e receba apoio direto de outros membros da comunidade.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onOpenEntry}
              className="w-full sm:w-auto px-7 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2.5 active:scale-[0.98]"
            >
              <Sprout className="w-5 h-5" aria-hidden="true" />
              <span>Entrar com convite</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onOpenDemoTree}
              className="w-full sm:w-auto px-7 py-4 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 text-slate-200 font-semibold text-sm sm:text-base rounded-2xl shadow-md transition-all flex items-center justify-center gap-2.5"
            >
              <Trees className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              <span>Ver árvore</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-4xl mx-auto text-left pt-4">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <h2 className="font-bold text-slate-100 text-base">{item.title}</h2>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-5 items-stretch" aria-label="Como funciona de forma pública">
          <div className="bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 space-y-4 relative overflow-hidden">
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl" />
            <div className="relative z-10 space-y-4">
              <div className="text-xs uppercase tracking-widest font-mono text-emerald-300">
                O essencial
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
                Plante. Convide. Participe da árvore.
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                O ARBORIS une plantio de árvores, participação por convite e ajuda mútua direta entre pessoas. A página pública mostra o essencial; os detalhes aparecem na próxima etapa.
              </p>
              <div className="rounded-2xl bg-slate-950/60 border border-slate-800/80 p-4 text-sm text-slate-300 leading-relaxed">
                Cada árvore possui vagas limitadas. Quem recebe um convite acessa a árvore disponível e acompanha sua participação dentro da comunidade.
              </div>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-mono text-amber-300">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              Transparência
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
              Doação não é promessa
            </h2>
            <div className="space-y-3">
              {responsibilityPoints.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl bg-slate-950/50 border border-slate-800/70 p-3 text-sm text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 mt-0.5 flex-none" aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-6 max-w-3xl mx-auto">
          <div className="text-center space-y-2">
            <div className="text-xs uppercase font-mono tracking-widest text-emerald-400 flex items-center justify-center gap-2">
              <Users className="w-4 h-4" aria-hidden="true" />
              Antes de entrar
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-100">Perguntas rápidas</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div key={faq.q} className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full px-4 py-4 text-left flex items-center justify-between gap-3 hover:bg-slate-900 transition-colors"
                  aria-expanded={openFaq === index}
                >
                  <span className="text-sm font-bold text-slate-100">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-emerald-400 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {openFaq === index && (
                  <div className="px-4 pb-4 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 sm:p-8 text-center space-y-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 mx-auto">
            <Sprout className="w-6 h-6" aria-hidden="true" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
            Entre enquanto houver árvore ativa
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Participe de uma comunidade que une plantio, convite e ajuda mútua direta entre pessoas.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onOpenEntry}
              className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold flex items-center justify-center gap-2"
            >
              <span>Entrar com convite</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            {onOpenDirectLogin && (
              <button
                type="button"
                onClick={onOpenDirectLogin}
                className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold flex items-center justify-center gap-2"
              >
                Já tenho cadastro
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
