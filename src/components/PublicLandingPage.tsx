import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Eye,
  HeartHandshake,
  Share2,
  Shield,
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

const institutionalSections = [
  {
    icon: Trees,
    title: 'Arborização comunitária',
    text: 'O ARBORIS é uma iniciativa comunitária de arborização e reflorestamento. A proposta é reunir participantes em torno de uma causa ambiental, com organização, clareza e participação coletiva.'
  },
  {
    icon: HeartHandshake,
    title: 'Ajuda mútua entre participantes',
    text: 'A comunidade funciona por ajuda mútua: os próprios participantes se apoiam diretamente, conforme as regras de participação. O sistema organiza informações, convites e registros, sem prometer retorno financeiro.'
  }
];

const responsibilityPoints = [
  'Eventuais doações ou transferências são realizadas diretamente entre os próprios participantes.',
  'Não existem atravessadores nas movimentações realizadas entre membros.',
  'Qualquer movimentação financeira entre participantes é de responsabilidade exclusiva das partes envolvidas.',
  'O ARBORIS não recebe, coleta, intermedeia, custodia ou administra valores financeiros.',
  'O ARBORIS não executa nem garante transações realizadas entre participantes.'
];

const notPromised = [
  'investimento financeiro',
  'lucro ou rendimento garantido',
  'renda passiva',
  'retorno automático',
  'custódia de valores',
  'intermediação de pagamentos'
];

const faqs = [
  {
    q: 'O que é o ARBORIS?',
    a: 'O ARBORIS é uma iniciativa comunitária de arborização e reflorestamento baseada em ajuda mútua entre participantes. A comunicação pública do projeto deve explicar a causa, a participação comunitária e as responsabilidades de forma simples.'
  },
  {
    q: 'Como funciona a ajuda mútua?',
    a: 'A ajuda mútua acontece diretamente entre participantes. Quando houver doação ou transferência, a relação é entre as partes envolvidas, sem recebimento, custódia ou intermediação financeira pelo ARBORIS.'
  },
  {
    q: 'O ARBORIS recebe ou administra dinheiro dos participantes?',
    a: 'Não. O ARBORIS não recebe, coleta, guarda, intermedeia, administra ou executa valores financeiros. Qualquer movimentação feita entre membros é responsabilidade exclusiva dos próprios participantes.'
  },
  {
    q: 'O ARBORIS é investimento ou promessa de ganho?',
    a: 'Não. O projeto não deve ser apresentado como investimento, aplicação financeira, renda passiva, lucro garantido ou retorno automático. A participação depende das regras comunitárias e não representa promessa financeira.'
  },
  {
    q: 'Qual é o papel do sistema?',
    a: 'O sistema serve para apresentar a comunidade, organizar informações, registrar convites e facilitar o acompanhamento da participação. Ele não substitui a responsabilidade individual dos participantes nas relações realizadas entre si.'
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <Trees className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg tracking-wider bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
                ARBORIS
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-mono tracking-widest text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-700/60">
                Arborização · Ajuda mútua
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
              <span>Participar</span>
            </button>
          </div>
        </div>
      </header>

      {referralData && (
        <div className="relative z-10 bg-gradient-to-r from-emerald-900/60 via-slate-900 to-amber-900/60 border-b border-emerald-500/30 px-4 py-3 text-center animate-in fade-in slide-in-from-top-4">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>Convite recebido de <strong>@{referralData.username}</strong> ({referralData.full_name}) para a árvore <strong>{referralData.tree_code}</strong>.</span>
            </div>
            <button
              type="button"
              onClick={onOpenEntry}
              className="px-3 py-1 bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-emerald-400 transition-all shadow"
            >
              Continuar com este convite
            </button>
          </div>
        </div>
      )}

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 space-y-16 sm:space-y-20">
        <section className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider shadow-inner">
            <HeartHandshake className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sistema filantrópico de ajuda mútua</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight sm:leading-none text-slate-100">
            Arborização comunitária com participação organizada
          </h1>

          <p className="text-slate-300 text-sm sm:text-lg leading-relaxed max-w-2xl mx-auto">
            O ARBORIS conecta pessoas em uma iniciativa de arborização e reflorestamento baseada em ajuda mútua. A participação é comunitária, direta entre membros e sem intermediação financeira pela plataforma.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onOpenEntry}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2.5 active:scale-[0.98]"
            >
              <Sprout className="w-5 h-5" aria-hidden="true" />
              <span>Participar com convite</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onOpenDemoTree}
              className="w-full sm:w-auto px-6 py-3.5 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 text-slate-200 font-semibold text-sm sm:text-base rounded-2xl shadow-md transition-all flex items-center justify-center gap-2.5"
            >
              <Trees className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              <span>Conhecer a árvore</span>
            </button>
          </div>

          <div className="mt-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-100 text-xs sm:text-sm text-left sm:text-center space-y-2 max-w-2xl mx-auto">
            <div className="font-bold flex items-center justify-center gap-1.5 text-amber-300">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              <span>Participação com responsabilidade</span>
            </div>
            <p className="text-[11px] sm:text-xs text-amber-100/80 leading-relaxed">
              O ARBORIS não é investimento, aplicação financeira, promessa de lucro, renda passiva ou garantia de retorno. O projeto deve ser entendido como uma comunidade de ajuda mútua ligada à arborização e ao reflorestamento.
            </p>
          </div>
        </section>

        <section className="space-y-8" aria-label="Apresentação institucional do ARBORIS">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <div className="text-xs uppercase font-mono tracking-widest text-emerald-400">
              Apresentação institucional
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-100">
              O essencial em duas ideias
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              A explicação pública do ARBORIS deve ser direta: causa ambiental e participação comunitária por ajuda mútua.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {institutionalSections.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-emerald-500/40 transition-all">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-100">{item.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6 items-stretch" aria-label="Ajuda mútua e responsabilidade financeira">
          <div className="bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 space-y-5 relative overflow-hidden">
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl" />
            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-mono text-emerald-300">
                <Shield className="w-4 h-4" aria-hidden="true" />
                Ajuda mútua e movimentações
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
                Relações diretas entre participantes
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                O ARBORIS funciona como um sistema filantrópico de ajuda mútua entre participantes. Quando houver apoio financeiro, doação ou transferência, a movimentação acontece diretamente entre os membros envolvidos.
              </p>
              <div className="space-y-3">
                {responsibilityPoints.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl bg-slate-950/50 border border-slate-800/70 p-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 mt-0.5 flex-none" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-mono text-amber-300">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              O que não é
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
              Sem promessa financeira
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              A comunicação pública deve evitar termos que façam o participante entender o ARBORIS como produto financeiro ou promessa de resultado.
            </p>
            <div className="flex flex-wrap gap-2">
              {notPromised.map((item) => (
                <span key={item} className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-100">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-6 max-w-3xl mx-auto">
          <div className="text-center space-y-2">
            <div className="text-xs uppercase font-mono tracking-widest text-emerald-400 flex items-center justify-center gap-2">
              <Users className="w-4 h-4" aria-hidden="true" />
              Perguntas essenciais
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-100">Entendimento público</h2>
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
            Participar da comunidade ARBORIS
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Continue apenas se você entende que o ARBORIS é uma comunidade de arborização e ajuda mútua, sem promessa de retorno financeiro e sem intermediação de valores pela plataforma.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onOpenEntry}
              className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold flex items-center justify-center gap-2"
            >
              <span>Continuar com convite</span>
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
