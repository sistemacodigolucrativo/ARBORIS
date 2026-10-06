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
    icon: Users,
    title: 'Cadastro por indicação',
    text: 'O link recebido identifica a árvore. O cadastro e a reserva são etapas anteriores à ativação.'
  },
  {
    icon: HeartHandshake,
    title: 'Doação para ativar',
    text: 'A ativação exige uma doação Pix ao Tronco, no valor definido para a árvore, e a confirmação do recebimento.'
  },
  {
    icon: Sprout,
    title: 'Proposta de arborização',
    text: 'O projeto propõe ações de plantio. A participação na árvore virtual não comprova que uma árvore foi plantada.'
  }
];

const responsibilityPoints = [
  'O Pix é enviado diretamente à conta do participante no Tronco. O sistema registra a solicitação e a aprovação da ativação.',
  'A progressão depende do preenchimento e da ativação das posições por outros participantes.',
  'Você pode doar e não chegar ao Tronco nem receber doações. Não há prazo ou recebimento garantido.',
  'Antes de transferir, confira valor, destinatário e condições. A confirmação é manual; o sistema não verifica o Pix no banco.'
];

const faqs = [
  {
    q: 'Quanto preciso doar?',
    a: 'O valor depende da árvore. Pela regra de participação informada pelo projeto, 1 semente corresponde a R$ 1 para definir a doação: uma árvore de 25 sementes exige R$ 25 ao Tronco. Esse exemplo não fixa o valor de todas as árvores. Confirme o valor da sua antes de transferir.'
  },
  {
    q: 'Receber 50 sementes significa receber R$ 50?',
    a: 'Não. Em uma árvore de 25 sementes, o cadastro concede 50 unidades internas: 25 são consumidas na reserva e 25 saem do seu saldo na ativação. Na versão atual, estas últimas são creditadas ao saldo de sementes do Tronco. O Pix de R$ 25 é uma transferência separada; as sementes não são saldo bancário nem dinheiro disponível para saque.'
  },
  {
    q: 'Quando alguém pode receber doações?',
    a: 'Ao ocupar o Tronco, o participante é o destinatário das doações de novas entradas naquela árvore. Chegar a essa posição depende dos ciclos e de outras pessoas entrarem e ativarem suas posições. Plantar uma árvore não dá direito a receber, e fazer uma doação não garante recebimentos futuros.'
  },
  {
    q: 'O que acontece quando uma árvore fica completa?',
    a: 'Com as 15 posições ativas, a árvore se divide em duas. O Tronco conclui sua participação naquela árvore; os outros 14 participantes são redistribuídos em dois grupos de 7. Cada nova árvore abre 8 vagas. Se não houver novas entradas e ativações, o ciclo pode não se completar.'
  },
  {
    q: 'Como funciona a proposta de plantio?',
    a: 'A proposta informada pelo projeto prevê acumular as sementes da reserva em uma bag virtual e, a cada 500, sortear 10 participantes para plantar. Esse mecanismo ainda não está implementado nesta versão. Também não estão definidos aqui o custeio, a seleção e a comprovação do plantio. Não considere a reserva ou a doação como prova de reflorestamento realizado.'
  },
  {
    q: 'O que conferir antes de participar?',
    a: 'Confira a árvore vinculada ao convite, o valor exigido, quem recebe o Pix e como solicitar a ativação. Esclareça com o responsável as condições de desistência e eventual devolução antes de doar. Não participe contando com recebimentos futuros para recuperar o valor transferido.'
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
                Já tenho cadastro
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
              <span>Acessar</span>
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
              Continuar com este convite
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
            Entenda a participação no ÁRBORIS
          </h1>

          <p className="text-slate-300 text-base sm:text-xl leading-relaxed max-w-3xl mx-auto">
            O ÁRBORIS organiza participantes em árvores de ajuda mútua e propõe ações de arborização. A ativação de uma posição exige doação direta ao Tronco; a progressão depende de novas entradas.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onOpenEntry}
              className="w-full sm:w-auto px-7 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2.5 active:scale-[0.98]"
            >
              <Sprout className="w-5 h-5" aria-hidden="true" />
              <span>Acessar com convite</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onOpenDemoTree}
              className="w-full sm:w-auto px-7 py-4 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 text-slate-200 font-semibold text-sm sm:text-base rounded-2xl shadow-md transition-all flex items-center justify-center gap-2.5"
            >
              <Trees className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              <span>Visualizar árvore</span>
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

        <section className="grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-5 items-stretch" aria-label="Etapas e condições de participação">
          <div className="bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 space-y-4 relative overflow-hidden">
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl" />
            <div className="relative z-10 space-y-4">
              <div className="text-xs uppercase tracking-widest font-mono text-emerald-300">
                O essencial
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
                Do convite à posição ativa
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Cadastre-se pelo link de indicação e reserve uma posição disponível. Depois, confira os dados do Tronco, faça a doação Pix no valor da árvore e solicite a ativação. A posição só fica ativa após a aprovação.
              </p>
              <div className="rounded-2xl bg-slate-950/60 border border-slate-800/80 p-4 text-sm text-slate-300 leading-relaxed">
                Exemplo: árvore de 25 sementes → 50 sementes internas no cadastro → 25 consumidas na reserva → doação Pix de R$ 25 ao Tronco → confirmação e débito das 25 sementes restantes. O cadastro, sozinho, não ativa a posição.
              </div>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-mono text-amber-300">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              Transparência
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
              Condições antes de doar
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
                  aria-controls={`public-faq-${index}`}
                >
                  <span className="text-sm font-bold text-slate-100">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-emerald-400 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {openFaq === index && (
                  <div id={`public-faq-${index}`} className="px-4 pb-4 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
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
            Confira as condições do seu convite
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            O próximo passo abre o acesso por indicação. A doação é exigida para ativar a posição, e você pode não receber doações futuras.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onOpenEntry}
              className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold flex items-center justify-center gap-2"
            >
              <span>Acessar com convite</span>
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
