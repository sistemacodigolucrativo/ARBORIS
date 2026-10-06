import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Compass,
  Eye,
  HeartHandshake,
  Layers,
  Lock,
  Network,
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

const pillars = [
  {
    icon: HeartHandshake,
    title: 'Ajuda mútua entre participantes',
    text: 'O sistema organiza a participação comunitária e o apoio entre membros. A plataforma não vende rendimento, resultado automático ou promessa de retorno.'
  },
  {
    icon: Layers,
    title: 'Matriz visual 1–2–4–8',
    text: 'Cada árvore possui 15 posições: 1 tronco, 2 ramos, 4 galhos e 8 folhas externas de entrada.'
  },
  {
    icon: Network,
    title: 'Progressão por ciclos',
    text: 'Quando a árvore completa seu ciclo, a estrutura se divide em novas árvores e os participantes seguem a regra de progressão configurada.'
  },
  {
    icon: Shield,
    title: 'Comunicação responsável',
    text: 'O Arboris não deve ser apresentado como sem custo, investimento, aplicação financeira, saque garantido ou renda prometida.'
  }
];

const journeySteps = [
  {
    number: '01',
    title: 'Entrada por convite',
    text: 'O participante acessa a plataforma por um link de indicação ou por uma conexão validada dentro da comunidade.'
  },
  {
    number: '02',
    title: 'Posicionamento na árvore',
    text: 'A participação é registrada em uma posição disponível da árvore, respeitando a estrutura 1–2–4–8 e as regras do ciclo ativo.'
  },
  {
    number: '03',
    title: 'Fortalecimento do tronco',
    text: 'A dinâmica de ajuda mútua ocorre entre participantes, com registro e validação dentro do sistema para manter rastreabilidade.'
  },
  {
    number: '04',
    title: 'Fechamento e reinício do ciclo',
    text: 'Ao completar as 15 posições, a árvore encerra o ciclo atual, gera novas ramificações e mantém o histórico de movimentações.'
  }
];

const topology = [
  { label: '1 Tronco', text: 'posição central do ciclo ativo' },
  { label: '2 Ramos', text: 'primeira divisão da árvore' },
  { label: '4 Galhos', text: 'estrutura intermediária de sustentação' },
  { label: '8 Folhas', text: 'posições externas de entrada' }
];

const faqs = [
  {
    q: 'O que é o Arboris?',
    a: 'O Arboris é um sistema comunitário de arborização baseado em ajuda mútua, organizado em uma árvore/matriz 1–2–4–8 com ciclos de entrada, progressão, fechamento, divisão e reinício.'
  },
  {
    q: 'O Arboris é sem custo?',
    a: 'Não deve ser comunicado como sem custo livre ou promocional. A comunicação correta é: sistema comunitário de ajuda mútua entre participantes, com regras próprias de participação e registro interno.'
  },
  {
    q: 'O Arboris é investimento ou promessa de ganho?',
    a: 'Não. O Arboris não é investimento, aplicação financeira, renda passiva, saque garantido nem promessa de ganho. Qualquer apoio entre participantes deve ser tratado como ajuda mútua comunitária, não como rendimento financeiro.'
  },
  {
    q: 'O que são sementes no sistema?',
    a: 'Sementes são unidades internas usadas para organizar e registrar a dinâmica da árvore. Elas não devem ser comunicadas como dinheiro depositado pela plataforma, ganho garantido ou saldo financeiro livre para saque.'
  },
  {
    q: 'O que acontece quando uma árvore completa 15 posições?',
    a: 'O ciclo é fechado conforme a regra da matriz 1–2–4–8. A árvore pode se dividir em novas árvores, preservando o histórico e permitindo a continuidade da progressão comunitária.'
  },
  {
    q: 'Qual é o papel do coordenador?',
    a: 'O coordenador acompanha a organização da rede, a posição dos participantes, os ciclos ativos, os registros e as ações administrativas necessárias para manter a árvore coerente.'
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
                Ajuda mútua · 1–2–4–8
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

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 space-y-20">
        <section className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider shadow-inner">
            <HeartHandshake className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sistema comunitário de arborização por ajuda mútua</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight sm:leading-none text-slate-100">
            Uma árvore de 15 posições organizada em ciclos <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
              1–2–4–8
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-lg leading-relaxed max-w-2xl mx-auto">
            O Arboris organiza participantes em uma matriz visual de árvore, com entrada por convite, progressão por posições,
            fechamento de ciclo e divisão em novas árvores. A lógica central é comunidade, registro e ajuda mútua — não acesso sem responsabilidade comunitária.
          </p>

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
              <span>Explorar a árvore</span>
            </button>
          </div>

          <div className="mt-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-100 text-xs sm:text-sm text-left sm:text-center space-y-2 max-w-2xl mx-auto">
            <div className="font-bold flex items-center justify-center gap-1.5 text-amber-300">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              <span>Comunicação correta do projeto</span>
            </div>
            <p className="text-[11px] sm:text-xs text-amber-100/80 leading-relaxed">
              O Arboris não deve ser apresentado como sistema sem custo, investimento, aplicação financeira, renda garantida ou promessa de ganho.
              A definição correta é: sistema comunitário de arborização por ajuda mútua entre participantes, com regras, ciclos e registros internos.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6" aria-label="Pilares do Arboris">
          {pillars.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-4 hover:border-emerald-500/40 transition-all">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <h2 className="font-bold text-base text-slate-100">{item.title}</h2>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{item.text}</p>
              </article>
            );
          })}
        </section>

        <section className="space-y-10">
          <div className="text-center space-y-2">
            <div className="text-xs uppercase font-mono tracking-widest text-emerald-400">
              Funcionamento do ciclo
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-100">
              Como a árvore evolui
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto">
              A apresentação pública deve explicar a lógica real da matriz, sem prometer acesso irrestrito, rendimento ou resultado automático.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
            {journeySteps.map((step) => (
              <article key={step.number} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-teal-500/40 transition-all">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-300 font-extrabold text-sm">
                    {step.number}
                  </div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-100">{step.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{step.text}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-teal-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Etapa registrada</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6 items-stretch">
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-mono text-emerald-400">
              <Compass className="w-4 h-4" aria-hidden="true" />
              Estrutura matemática
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
              Matriz 2×2×2 representada como árvore
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              A árvore possui uma distribuição fixa de 15 posições. Essa estrutura permite leitura visual simples, controle de ciclos e reorganização dos participantes conforme regras administrativas.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {topology.map((item) => (
                <div key={item.label} className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4">
                  <div className="text-emerald-300 font-black text-lg">{item.label}</div>
                  <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">{item.text}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-950/80 via-slate-900 to-amber-950/60 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 space-y-5 relative overflow-hidden">
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl" />
            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-mono text-amber-300">
                <Lock className="w-4 h-4" aria-hidden="true" />
                Limites de comunicação
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
                O que a apresentação não deve prometer
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {[
                  'Cadastro sem custo como promessa comercial',
                  'Ganho, rendimento ou renda passiva',
                  'Saque prometido ou saldo financeiro livre',
                  'Investimento, aplicação ou retorno automático',
                  'Dinheiro gerado pela plataforma',
                  'Resultado certo por convidar pessoas'
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 rounded-2xl bg-slate-950/50 border border-slate-800/70 p-3 text-slate-300">
                    <Shield className="w-4 h-4 text-amber-300 mt-0.5 flex-none" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                A apresentação correta deve focar na organização comunitária, na matriz de posições, nos ciclos e no registro transparente das ações.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-6 max-w-3xl mx-auto">
          <div className="text-center space-y-2">
            <div className="text-xs uppercase font-mono tracking-widest text-emerald-400 flex items-center justify-center gap-2">
              <Users className="w-4 h-4" aria-hidden="true" />
              Perguntas essenciais
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-100">Regras de entendimento público</h2>
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
            Entrar na comunidade Arboris
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Continue apenas se você entende que o Arboris é uma organização comunitária por árvore, baseada em ajuda mútua, sem promessa de retorno financeiro.
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
