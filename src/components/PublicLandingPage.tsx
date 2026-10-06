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

const benefitCards = [
  {
    icon: Sprout,
    title: 'Plante árvores com a comunidade',
    text: 'A participação gira em torno da arborização e do reflorestamento, com acompanhamento coletivo da comunidade.'
  },
  {
    icon: HeartHandshake,
    title: 'Receba apoio direto de membros',
    text: 'Participantes podem realizar doações diretamente entre si, sem atravessadores e sem dinheiro passando pelo ARBORIS.'
  },
  {
    icon: Trees,
    title: 'Entre enquanto há árvore ativa',
    text: 'Cada árvore possui vagas limitadas. O acesso por convite cria curiosidade, senso de oportunidade e movimento dentro da comunidade.'
  }
];

const responsibilityPoints = [
  'Doações ou transferências, quando ocorrerem, são realizadas diretamente entre participantes.',
  'O ARBORIS não recebe, coleta, intermedeia, custodia ou administra valores financeiros.',
  'Não existe promessa de doação, lucro, rendimento, renda passiva ou retorno garantido.',
  'Qualquer movimentação entre membros é de responsabilidade exclusiva das partes envolvidas.',
  'A causa ambiental e a ajuda mútua devem caminhar juntas na comunicação pública.'
];

const notPromised = [
  'lucro garantido',
  'retorno automático',
  'renda passiva',
  'pagamento pela plataforma',
  'custódia de valores',
  'intermediação financeira'
];

const faqs = [
  {
    q: 'Posso receber doações por plantar árvores?',
    a: 'Sim, dentro da lógica de ajuda mútua entre participantes: membros podem apoiar outros membros diretamente. Isso não é pagamento do ARBORIS, não é salário, não é investimento e não é promessa de recebimento garantido.'
  },
  {
    q: 'Quem faz as doações?',
    a: 'As doações ou transferências são feitas diretamente entre os próprios participantes, quando houver acordo entre as partes envolvidas. O ARBORIS não recebe, intermedeia, custodia nem administra esses valores.'
  },
  {
    q: 'O ARBORIS paga para plantar árvores?',
    a: 'Não. O ARBORIS organiza a comunidade, os convites, os registros e a apresentação da iniciativa. Qualquer apoio financeiro ocorre diretamente entre membros, por responsabilidade dos próprios participantes.'
  },
  {
    q: 'Isso é investimento ou renda passiva?',
    a: 'Não. O projeto não deve ser apresentado como investimento, aplicação financeira, lucro garantido, renda passiva ou retorno automático. A chamada correta é ajuda mútua comunitária ligada ao plantio de árvores.'
  },
  {
    q: 'Por que entrar por convite?',
    a: 'O convite organiza a entrada na comunidade e mantém a participação vinculada a uma árvore ativa. Isso cria rastreabilidade e evita uma entrada solta, sem contexto comunitário.'
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
                Doações diretas · Plantio de árvores
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
              Entrar por este convite
            </button>
          </div>
        </div>
      )}

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 space-y-16 sm:space-y-20">
        <section className="text-center space-y-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider shadow-inner">
            <HeartHandshake className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Ajuda mútua direta entre participantes</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-tight sm:leading-none text-slate-100">
            Receba doações por plantar árvores
          </h1>

          <p className="text-slate-300 text-base sm:text-xl leading-relaxed max-w-3xl mx-auto">
            Entre em uma comunidade onde plantar árvores, participar de ciclos ativos e receber apoio direto de outros membros fazem parte da mesma experiência. O funcionamento completo é apresentado por convite, sem expor a dinâmica interna antes da entrada.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto text-left pt-2">
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
              <div className="text-emerald-300 font-bold text-sm">Plante</div>
              <div className="text-slate-400 text-xs mt-1 leading-relaxed">Participe de uma causa ambiental com apelo simples e fácil de entender.</div>
            </div>
            <div className="rounded-2xl border border-teal-500/25 bg-teal-500/10 p-4">
              <div className="text-teal-300 font-bold text-sm">Receba apoio</div>
              <div className="text-slate-400 text-xs mt-1 leading-relaxed">Doações podem acontecer diretamente entre membros da comunidade.</div>
            </div>
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
              <div className="text-amber-300 font-bold text-sm">Entre por convite</div>
              <div className="text-slate-400 text-xs mt-1 leading-relaxed">Cada árvore tem vagas limitadas e a participação começa por indicação.</div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onOpenEntry}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2.5 active:scale-[0.98]"
            >
              <Sprout className="w-5 h-5" aria-hidden="true" />
              <span>Entrar com convite</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onOpenDemoTree}
              className="w-full sm:w-auto px-6 py-3.5 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 text-slate-200 font-semibold text-sm sm:text-base rounded-2xl shadow-md transition-all flex items-center justify-center gap-2.5"
            >
              <Trees className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              <span>Ver como a árvore aparece</span>
            </button>
          </div>

          <div className="mt-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-100 text-xs sm:text-sm text-left sm:text-center space-y-2 max-w-3xl mx-auto">
            <div className="font-bold flex items-center justify-center gap-1.5 text-amber-300">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              <span>Doações diretas, sem promessa financeira</span>
            </div>
            <p className="text-[11px] sm:text-xs text-amber-100/80 leading-relaxed">
              O ARBORIS não paga participantes, não recebe dinheiro, não intermedeia valores e não garante doações. Qualquer apoio financeiro ocorre diretamente entre membros e depende exclusivamente das partes envolvidas.
            </p>
          </div>
        </section>

        <section className="space-y-8" aria-label="Por que participar do ARBORIS">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <div className="text-xs uppercase font-mono tracking-widest text-emerald-400">
              Por que isso chama atenção
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-100">
              A causa é ambiental. O gatilho é participação com possibilidade de apoio.
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              A comunicação pública deve despertar curiosidade sem explicar toda a mecânica interna da árvore. O convite apresenta a próxima etapa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {benefitCards.map((item) => {
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

        <section className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6 items-stretch" aria-label="Doações diretas e responsabilidade financeira">
          <div className="bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 space-y-5 relative overflow-hidden">
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl" />
            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-mono text-emerald-300">
                <Shield className="w-4 h-4" aria-hidden="true" />
                Ajuda mútua e doações
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
                A doação é direta entre participantes
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                O ARBORIS funciona como uma comunidade de arborização com ajuda mútua. Quando houver doação ou transferência, ela acontece diretamente entre os membros envolvidos.
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
              Limite da promessa
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
              Forte na chamada, claro na responsabilidade
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              A página pode chamar atenção pelo desejo de receber doações, mas não pode vender garantia de resultado financeiro.
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
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-100">Antes de entrar</h2>
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
            Quer entrar em uma árvore ativa?
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Entre apenas se você entende que o ARBORIS une plantio de árvores, ajuda mútua e doações diretas entre participantes, sem garantia de recebimento e sem intermediação financeira da plataforma.
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
