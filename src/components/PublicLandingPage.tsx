import React, { useState } from 'react';
import {
  Trees,
  Sprout,
  Shield,
  Users,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  ChevronDown,
  Layers,
  HelpCircle,
  Eye,
  Share2,
  HeartHandshake,
  Compass,
  Zap,
  BookOpen
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

  const faqs = [
    {
      q: 'O que é o jogo Arboris?',
      a: 'O Arboris é um jogo comunitário e recreativo inspirado no reflorestamento vivo e na progressão fractal 1–2–4–8 das árvores. Os participantes colaboram para preencher e fazer florescer tabuleiros circulares de reflorestamento com 15 posições, utilizando sementes virtuais como pontuação interna.'
    },
    {
      q: 'Existe algum valor monetário, pagamento ou depósito?',
      a: 'ABSOLUTAMENTE NÃO. O sistema é 100% recreativo e lúdico. Não existe dinheiro real, transferências via PIX, taxas de entrada, depósitos, saques, promessas de lucro ou rendimento financeiro. As sementes são apenas fichas virtuais sem valor econômico.'
    },
    {
      q: 'Como consigo as sementes para jogar?',
      a: 'Todo novo participante recebe gratuitamente 25 sementes virtuais no ato do cadastro comunitário através de um convite de um membro ativo. Essas sementes são concedidas automaticamente pelo sistema para que você possa participar do tabuleiro de reflorestamento.'
    },
    {
      q: 'Como funciona a topologia 1–2–4–8 da árvore?',
      a: 'Cada árvore viva possui exatamente 15 posições estruturadas em 4 camadas circulares concêntricas:\n• 1 Tronco Central (Nível 0 - O coração do reflorestamento)\n• 2 Ramos Guardiões (Nível 1 - Lado Esquerdo e Direito)\n• 4 Galhos de Sustentação (Nível 2 - 2 à esquerda, 2 à direita)\n• 8 Folhas Externas (Nível 3 - Vagas de entrada para novos membros).'
    },
    {
      q: 'O que acontece quando todas as 15 vagas são preenchidas?',
      a: 'Ocorre a Bifurcação Harmônica! A árvore mãe cumpre seu propósito e o Tronco encerra seu ciclo de reflorestamento com honra. A árvore então se divide matematicamente em duas novas árvores filhas ativas, permitindo que os membros das camadas anteriores avancem para novas posições e o reflorestamento continue.'
    },
    {
      q: 'Como posso me juntar a uma árvore?',
      a: 'O acesso ao jogo funciona por convite comunitário. Basta clicar em "Entrar no Jogo" e informar o usuário do participante que o convidou (ou acessar diretamente através do link exclusivo dele).'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white relative overflow-x-hidden">
      {/* Background Ambient Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-emerald-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-[40%] -left-32 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 -right-32 w-[550px] h-[550px] bg-indigo-500/10 rounded-full blur-[130px]" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-950 border border-emerald-500/40 flex items-center justify-center text-xl shadow-inner text-emerald-400">
              🌲
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg tracking-wider bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
                ARBORIS
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-mono tracking-widest text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-700/60">
                Reflorestamento Comunitário
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={onOpenDemoTree}
              className="text-xs sm:text-sm font-medium text-slate-300 hover:text-emerald-400 transition-colors px-3 py-2 rounded-lg hover:bg-slate-900 flex items-center gap-1.5"
            >
              <Eye className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Ver Tabuleiro</span>
              <span className="sm:hidden">Tabuleiro</span>
            </button>

            <button
              onClick={onOpenEntry}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sprout className="w-4 h-4 fill-slate-950" />
              <span>Entrar no Jogo</span>
            </button>
          </div>
        </div>
      </header>

      {/* Referral Invite Welcome Banner (se acessou via link) */}
      {referralData && (
        <div className="relative z-10 bg-gradient-to-r from-emerald-900/60 via-slate-900 to-amber-900/60 border-b border-emerald-500/30 px-4 py-3 text-center animate-in fade-in slide-in-from-top-4">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✨ Convite de Reflorestamento:</span>
              <span>Você foi convidado por <strong>@{referralData.username}</strong> ({referralData.full_name})</span>
            </div>
            <button
              onClick={onOpenEntry}
              className="px-3 py-1 bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-emerald-400 transition-all shadow"
            >
              Aceitar Convite & Ganhar 25 Sementes →
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 space-y-24">
        {/* HERO SECTION */}
        <section className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider shadow-inner">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Jogo Comunitário de Reflorestamento · 100% Gratuito</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight sm:leading-none text-slate-100">
            A Harmonia do <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
              Reflorestamento Vivo
            </span> em Tabuleiro
          </h1>

          <p className="text-slate-300 text-sm sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Descubra o <strong>Arboris</strong>: um jogo de reflorestamento comunitário onde participantes colaboram
            para fortalecer árvores de 15 posições através de <strong>sementes virtuais gratuitas</strong>.
          </p>

          {/* Call to action buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={onOpenEntry}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2.5 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sprout className="w-5 h-5 fill-slate-950" />
              <span>Entrar com Convite</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenDemoTree}
              className="w-full sm:w-auto px-6 py-3.5 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 text-slate-200 font-semibold text-sm sm:text-base rounded-2xl shadow-md transition-all flex items-center justify-center gap-2.5"
            >
              <Trees className="w-5 h-5 text-emerald-400" />
              <span>Explorar o Tabuleiro Vivo</span>
            </button>
          </div>

          {/* Legal / Non-financial Disclaimer Badge */}
          <div className="mt-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200/90 text-xs sm:text-sm text-center space-y-1 max-w-xl mx-auto">
            <div className="font-bold flex items-center justify-center gap-1.5 text-amber-300">
              <Shield className="w-4 h-4" />
              <span>Jogo Estritamente Recreativo e Não-Financeiro</span>
            </div>
            <p className="text-[11px] sm:text-xs text-amber-200/70 leading-relaxed">
              Não existe dinheiro real, transferências bancárias, PIX, taxas, depósitos ou saques.
              As sementes são pontos lúdicos internos concedidos gratuitamente para a dinâmica de reflorestamento do jogo.
            </p>
          </div>
        </section>

        {/* SECTION: COMO FUNCIONA O JOGO (PASSO A PASSO) */}
        <section className="space-y-10">
          <div className="text-center space-y-2">
            <div className="text-xs uppercase font-mono tracking-widest text-emerald-400">
              Mecânica Simples e Harmoniosa
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-100">
              Como Funciona a Jornada de Reflorestamento
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto">
              Acompanhe as 4 etapas da dinâmica comunitária no tabuleiro de reflorestamento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
            {/* Step 1 */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between hover:border-emerald-500/40 transition-all group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-extrabold text-lg">
                  1
                </div>
                <h3 className="font-bold text-base sm:text-lg text-slate-100 group-hover:text-emerald-300 transition-colors">
                  O Convite Comunitário
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Você recebe um link de um amigo que já participa de uma árvore. Ao aceitar o convite,
                  você ganha <strong>25 sementes virtuais de boas-vindas</strong> na sua carteira lúdica.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Cadastro 100% gratuito</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between hover:border-teal-500/40 transition-all group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-extrabold text-lg">
                  2
                </div>
                <h3 className="font-bold text-base sm:text-lg text-slate-100 group-hover:text-teal-300 transition-colors">
                  Fortalecimento do Tronco
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Com suas 25 sementes, você contribui simbolicamente para o Tronco da árvore.
                  Essa ação planta a próxima <strong>vaga externa (Folha)</strong> disponível no tabuleiro.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-teal-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ocupação das vagas 7 a 14</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between hover:border-amber-500/40 transition-all group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-extrabold text-lg">
                  3
                </div>
                <h3 className="font-bold text-base sm:text-lg text-slate-100 group-hover:text-amber-300 transition-colors">
                  Florescimento do Reflorestamento
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Todos os participantes colaboram convidando outros amigos. O tabuleiro vai sendo
                  preenchido radialmente até completar <strong>todas as 15 posições</strong> da floresta viva.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-amber-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Meta coletiva: 15/15 membros</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between hover:border-indigo-500/40 transition-all group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-extrabold text-lg">
                  4
                </div>
                <h3 className="font-bold text-base sm:text-lg text-slate-100 group-hover:text-indigo-300 transition-colors">
                  A Bifurcação das Árvores
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Ao fechar as 15 vagas, o Tronco se despede vitorioso. A árvore então se divide
                  em <strong>duas novas árvores filhas</strong>, e os membros avançam para os níveis internos!
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-indigo-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Bifurcação 1-2-4-8 contínua</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: ANATOMIA DA ÁRVORE (TOPOLOGIA 1-2-4-8) */}
        <section className="bg-slate-900/50 border border-slate-800/90 rounded-3xl p-6 sm:p-10 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-400">
              Estrutura Florestal Comunitária
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
              Anatomia das 15 Posições do Reflorestamento
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto">
              Cada árvore é composta por 4 níveis circulares perfeitamente equilibrados:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Level 0: Tronco */}
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase">Nível 0 · Centro</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">1 Vaga</span>
              </div>
              <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                👑 <span>O Tronco</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                O centro e coração da árvore. Recebe as sementes de fortalecimento de cada nova folha que entra até completar o ciclo de 15 membros.
              </p>
            </div>

            {/* Level 1: Ramos */}
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase">Nível 1 · Guardiões</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">2 Vagas</span>
              </div>
              <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                🛡️ <span>Os Ramos</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Dois guardiões (Ramo Esquerdo e Direito). Quando a árvore mãe completa o ciclo, eles se tornam os novos Troncos das duas árvores filhas.
              </p>
            </div>

            {/* Level 2: Galhos */}
            <div className="p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase">Nível 2 · Sustentação</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold">4 Vagas</span>
              </div>
              <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                🌿 <span>Os Galhos</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Quatro posições de sustentação intermediária (2 à esquerda e 2 à direita). Na bifurcação, eles avançam para se tornarem os Ramos Guardiões.
              </p>
            </div>

            {/* Level 3: Folhas */}
            <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-indigo-400 uppercase">Nível 3 · Entrada</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold">8 Vagas</span>
              </div>
              <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                🍃 <span>As Folhas</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                As 8 posições externas da borda (posições 7 a 14). É aqui que todo novo participante ingressa ao usar suas sementes de boas-vindas.
              </p>
            </div>
          </div>

          <div className="pt-4 text-center">
            <button
              onClick={onOpenDemoTree}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold border border-slate-700 inline-flex items-center gap-2 transition-all"
            >
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>Ver Visualização Gráfica do Tabuleiro</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* SECTION: PILARES DE TRANSPARÊNCIA */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">
              Compromisso e Confiança
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
              Nossos Pilares de Transparência
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Sprout className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-100 text-base">Sementes sem Valor Financeiro</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                As sementes são pontos internos exclusivamente criados para animar a progressão lúdica do jogo. Não podem ser vendidas, trocadas por dinheiro ou resgatadas.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-100 text-base">Livro-Razão Aberto e Auditável</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cada concessão e transferência de sementes gera um registro imutável no ledger. Qualquer participante pode inspecionar a integridade das operações.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-100 text-base">Reflorestamento Cooperativo</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                O avanço de cada membro depende do sucesso coletivo da árvore. Uma dinâmica de apoio mútuo onde todos crescem juntos na comunidade.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION: PERGUNTAS FREQUENTES (FAQ) */}
        <section className="space-y-8 max-w-3xl mx-auto">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">
              Tire Suas Dúvidas
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
              Perguntas Frequentes
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border border-slate-800/90 rounded-2xl bg-slate-900/40 overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-slate-200 hover:text-emerald-300 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-emerald-400 shrink-0 transition-transform duration-200 ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3 whitespace-pre-line animate-in fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* FINAL HERO CTA */}
        <section className="text-center p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-amber-950/40 border border-emerald-500/30 space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-3xl mx-auto shadow-inner">
            🌱
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-100 max-w-lg mx-auto">
            Pronto para Reflorestar a Próxima Árvore?
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-md mx-auto">
            Junte-se à nossa comunidade recreativa, resgate suas 25 sementes de boas-vindas e participe do reflorestamento.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onOpenEntry}
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2 hover:scale-[1.02]"
            >
              <Sprout className="w-5 h-5 fill-slate-950" />
              <span>Entrar no Jogo Agora</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {onOpenDirectLogin && (
              <button
                onClick={onOpenDirectLogin}
                className="px-5 py-4 text-slate-400 hover:text-slate-200 text-xs sm:text-sm font-semibold transition-colors"
              >
                Já sou membro / Acesso direto →
              </button>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950 py-8 text-center text-xs text-slate-500 space-y-3">
        <div className="flex items-center justify-center gap-2">
          <span>🌲</span>
          <span className="font-bold text-slate-300 tracking-wider">ARBORIS REFLORESTAMENTO</span>
          <span>·</span>
          <span>Jogo Comunitário Recreativo</span>
        </div>
        <p className="max-w-xl mx-auto text-[11px] text-slate-400 px-4">
          Sistema 100% estático sem finalidade financeira, sem apostas e sem movimentação de dinheiro real. Todos os direitos comunitários reservados.
        </p>
      </footer>
    </div>
  );
};
