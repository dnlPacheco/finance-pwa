// Controle Financeiro 50/30/20 - Core JavaScript

// 1. Dados de Exemplo (Carregados caso o localStorage esteja vazio)
const SAMPLE_INCOME = 5000;
const SAMPLE_TRANSACTIONS = [
  {
    id: 'tx-1',
    description: 'Aluguel do Apartamento',
    amount: 1500.00,
    category: 'Necessidades',
    date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0] // 5 dias atrás
  },
  {
    id: 'tx-2',
    description: 'Supermercado Mensal',
    amount: 450.00,
    category: 'Necessidades',
    date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0] // 3 dias atrás
  },
  {
    id: 'tx-3',
    description: 'Jantar com amigos',
    amount: 180.00,
    category: 'Desejos',
    date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0] // 2 dias atrás
  },
  {
    id: 'tx-4',
    description: 'Assinatura Streaming',
    amount: 55.90,
    category: 'Desejos',
    date: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0] // ontem
  },
  {
    id: 'tx-5',
    description: 'Aporte Tesouro Direto',
    amount: 600.00,
    category: 'Futuro',
    date: new Date().toISOString().split('T')[0] // hoje
  }
];

// 2. Estado Global da Aplicação
let state = {
  income: SAMPLE_INCOME,
  transactions: [],
  showValues: true
};

// 3. Inicialização e Persistência
function initApp() {
  const storedIncome = localStorage.getItem('fin_income');
  const storedTransactions = localStorage.getItem('fin_transactions');
  const storedShowValues = localStorage.getItem('fin_show_values');

  if (storedIncome === null || storedTransactions === null) {
    // Primeiro acesso: inicializa com dados de exemplo
    state.income = SAMPLE_INCOME;
    state.transactions = SAMPLE_TRANSACTIONS;
    state.showValues = true;
    saveToStorage();
  } else {
    state.income = parseFloat(storedIncome) || SAMPLE_INCOME;
    state.transactions = JSON.parse(storedTransactions) || [];
    state.showValues = storedShowValues !== 'false';
  }

  registerServiceWorker();
  updateUI();
  setupEventListeners();
  setupPWAInstallPrompt();
}

function saveToStorage() {
  localStorage.setItem('fin_income', state.income.toString());
  localStorage.setItem('fin_transactions', JSON.stringify(state.transactions));
  localStorage.setItem('fin_show_values', state.showValues.toString());
}

// 4. Registro do Service Worker para suporte PWA
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => console.log('Service Worker registrado com sucesso:', reg.scope))
        .catch((err) => console.error('Falha ao registrar Service Worker:', err));
    });
  }
}

// 5. Cálculos da Regra 50/30/20
function getFinancialCalculations() {
  const limits = {
    'Necessidades': state.income * 0.50,
    'Desejos': state.income * 0.30,
    'Futuro': state.income * 0.20
  };

  const spent = {
    'Necessidades': 0,
    'Desejos': 0,
    'Futuro': 0
  };

  state.transactions.forEach(tx => {
    if (spent[tx.category] !== undefined) {
      spent[tx.category] += tx.amount;
    }
  });

  const totalSpent = spent['Necessidades'] + spent['Desejos'] + spent['Futuro'];
  const balance = state.income - totalSpent;

  return {
    limits,
    spent,
    totalSpent,
    balance
  };
}

// 6. Atualização e Renderização da UI
function updateUI() {
  const calc = getFinancialCalculations();

  // Formatação de valores (com suporte a ocultação)
  const formatCurrency = (val) => {
    if (!state.showValues) return 'R$ ••••';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Atualizar ícones de exibição do olho
  const eyeOpenIcon = document.getElementById('icon-eye-open');
  const eyeClosedIcon = document.getElementById('icon-eye-closed');
  if (eyeOpenIcon && eyeClosedIcon) {
    if (state.showValues) {
      eyeOpenIcon.classList.remove('hidden');
      eyeClosedIcon.classList.add('hidden');
    } else {
      eyeOpenIcon.classList.add('hidden');
      eyeClosedIcon.classList.remove('hidden');
    }
  }

  // Dashboard - Saldo Disponível
  const balanceEl = document.getElementById('dashboard-balance');
  balanceEl.textContent = formatCurrency(calc.balance);
  
  if (calc.balance < 0) {
    balanceEl.className = 'text-3xl font-extrabold tracking-tight text-rose-500 transition-colors duration-300';
  } else {
    balanceEl.className = 'text-3xl font-extrabold tracking-tight text-emerald-400 transition-colors duration-300';
  }

  // Renda Exibida nas Configurações
  document.getElementById('current-income-display').textContent = formatCurrency(state.income);
  document.getElementById('input-income').value = state.income;

  // Atualizar as 3 categorias
  const categories = ['Necessidades', 'Desejos', 'Futuro'];
  const pctValues = { 'Necessidades': 50, 'Desejos': 30, 'Futuro': 20 };

  categories.forEach(cat => {
    const limit = calc.limits[cat];
    const spent = calc.spent[cat];
    const percentage = limit > 0 ? (spent / limit) * 100 : 0;
    
    // Labels do orçamento
    document.getElementById(`limit-display-${cat}`).textContent = formatCurrency(limit);
    document.getElementById(`spent-display-${cat}`).textContent = formatCurrency(spent);
    document.getElementById(`pct-badge-${cat}`).textContent = `${pctValues[cat]}%`;

    // Barra de progresso visual
    const barEl = document.getElementById(`progress-bar-${cat}`);
    const percentageTextEl = document.getElementById(`progress-text-${cat}`);
    
    // Ajuste da largura máxima a 100% para evitar overflow visual
    const barWidth = Math.min(percentage, 100);
    barEl.style.width = `${barWidth}%`;
    percentageTextEl.textContent = `${percentage.toFixed(0)}%`;

    // Cor dinâmica baseada no consumo do limite
    // Verde (< 70%), Amarelo (70% - 90%), Vermelho (> 90%)
    barEl.className = 'h-3 rounded-full transition-all duration-500 ease-out ';
    if (percentage < 70) {
      barEl.classList.add('bg-emerald-500');
    } else if (percentage >= 70 && percentage <= 90) {
      barEl.classList.add('bg-amber-500');
    } else {
      barEl.classList.add('bg-rose-500');
    }
  });

  // Renderizar Lista de Transações
  renderTransactions(formatCurrency);
}

function renderTransactions(formatCurrency) {
  const listEl = document.getElementById('transaction-list');
  listEl.innerHTML = '';

  if (state.transactions.length === 0) {
    listEl.innerHTML = `
      <div class="flex flex-col items-center justify-center py-12 text-slate-500">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
        <p class="text-sm font-medium">Nenhum gasto registrado ainda.</p>
        <p class="text-xs text-slate-600 mt-1">Toque no "+" abaixo para adicionar.</p>
      </div>
    `;
    return;
  }

  // Ordenar transações por data decrescente (mais recente primeiro)
  const sortedTxs = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  sortedTxs.forEach(tx => {
    const itemEl = document.createElement('div');
    itemEl.className = 'flex items-center justify-between p-4 bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-2xl transition duration-200 hover:bg-slate-800/80';
    
    // Badge de Categoria Cor
    let badgeColor = '';
    if (tx.category === 'Necessidades') badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    else if (tx.category === 'Desejos') badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    else badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

    // Formatando Data amigável
    const [year, month, day] = tx.date.split('-');
    const formattedDate = `${day}/${month}`;

    itemEl.innerHTML = `
      <div class="flex items-center space-x-3 min-w-0">
        <div class="flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-lg border ${badgeColor}">
          ${tx.category}
        </div>
        <div class="min-w-0">
          <p class="text-sm font-medium text-slate-100 truncate">${tx.description}</p>
          <p class="text-xs text-slate-400">${formattedDate}</p>
        </div>
      </div>
      <div class="flex items-center space-x-3 ml-2 flex-shrink-0">
        <span class="text-sm font-semibold text-slate-200">${formatCurrency(tx.amount)}</span>
        <button data-id="${tx.id}" class="btn-delete p-2 text-slate-500 hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-500/10 focus:outline-none" aria-label="Excluir transação">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    `;

    listEl.appendChild(itemEl);
  });
}

// 7. Configuração dos Event Listeners
function setupEventListeners() {
  const expenseDialog = document.getElementById('expense-dialog');
  const settingsDialog = document.getElementById('settings-dialog');
  
  // Abrir Modal de Despesas
  document.getElementById('btn-open-expense').addEventListener('click', () => {
    // Definir data padrão como hoje no formulário
    document.getElementById('input-date').value = new Date().toISOString().split('T')[0];
    expenseDialog.showModal();
  });

  // Abrir Modal de Configurações
  document.getElementById('btn-open-settings').addEventListener('click', () => {
    settingsDialog.showModal();
  });

  // Fechar Modais ao clicar fora (no backdrop) ou no botão Cancelar
  const closeOnBackdropClick = (e, dialog) => {
    const rect = dialog.getBoundingClientRect();
    const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
    if (!isInDialog) {
      dialog.close();
    }
  };

  expenseDialog.addEventListener('click', (e) => closeOnBackdropClick(e, expenseDialog));
  settingsDialog.addEventListener('click', (e) => closeOnBackdropClick(e, settingsDialog));

  document.getElementById('btn-cancel-expense').addEventListener('click', () => expenseDialog.close());
  document.getElementById('btn-cancel-settings').addEventListener('click', () => settingsDialog.close());

  // Submissão do Formulário de Gastos
  document.getElementById('expense-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('input-amount').value);
    const description = document.getElementById('input-description').value.trim();
    const category = document.getElementById('select-category').value;
    const date = document.getElementById('input-date').value;

    if (!amount || amount <= 0 || !description) {
      alert('Por favor, insira uma descrição válida e um valor maior que zero.');
      return;
    }

    const newTransaction = {
      id: 'tx-' + Date.now(),
      description,
      amount,
      category,
      date: date || new Date().toISOString().split('T')[0]
    };

    state.transactions.push(newTransaction);
    saveToStorage();
    updateUI();

    // Resetar formulário e fechar modal
    document.getElementById('expense-form').reset();
    expenseDialog.close();
  });

  // Submissão do Formulário de Configurações de Renda
  document.getElementById('settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const newIncome = parseFloat(document.getElementById('input-income').value);

    if (!newIncome || newIncome <= 0) {
      alert('Por favor, insira um valor de renda líquida válido.');
      return;
    }

    state.income = newIncome;
    saveToStorage();
    updateUI();

    settingsDialog.close();
  });

  // Deletar Transação (Event Delegation)
  document.getElementById('transaction-list').addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.btn-delete');
    if (!deleteBtn) return;

    const id = deleteBtn.getAttribute('data-id');
    
    // Animação de exclusão suave pode ser implementada ou exclusão imediata
    state.transactions = state.transactions.filter(tx => tx.id !== id);
    saveToStorage();
    updateUI();
  });

  // Alternar Visibilidade de Dados Sensíveis
  document.getElementById('btn-toggle-visibility').addEventListener('click', () => {
    state.showValues = !state.showValues;
    saveToStorage();
    updateUI();
  });

  // Eventos do Modal Informativo (Metodologia 50/30/20)
  const infoDialog = document.getElementById('info-dialog');
  document.getElementById('btn-open-info').addEventListener('click', () => {
    infoDialog.showModal();
  });
  document.getElementById('btn-close-info').addEventListener('click', () => {
    infoDialog.close();
  });
  infoDialog.addEventListener('click', (e) => {
    const rect = infoDialog.getBoundingClientRect();
    const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
    if (!isInDialog) {
      infoDialog.close();
    }
  });
}

// 8. Prompt de Instalação Customizado (PWA)
let deferredPrompt = null;

function setupPWAInstallPrompt() {
  const banner = document.getElementById('pwa-install-banner');
  const installBtn = document.getElementById('btn-pwa-install');
  const closeBtn = document.getElementById('btn-close-install-banner');
  const installText = document.getElementById('pwa-install-text');

  // Verifica se o usuário já dispensou o banner anteriormente
  const isDismissed = localStorage.getItem('fin_install_dismissed') === 'true';
  // Verifica se o app já está rodando em modo "standalone" (aplicativo instalado)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  if (isStandalone) {
    // Se já está instalado, garante que o banner esteja oculto
    return;
  }

  // 1. Caso seja iOS (iPhone/iPad) no Safari: mostramos instrução personalizada imediata
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  
  if (isIOS && !isDismissed) {
    // Customizar texto do banner para iOS
    installText.innerHTML = 'Para instalar no seu iPhone, toque no ícone de <strong class="text-emerald-400">Compartilhar</strong> e selecione <strong class="text-emerald-400">"Adicionar à Tela de Início"</strong>.';
    // Ocultar o botão padrão de instalar
    installBtn.classList.add('hidden');
    // Mostrar o banner
    banner.classList.remove('hidden');
  }

  // 2. Ouvir evento para dispositivos Android/Chrome/Chromium (Opera Mobile/Brave)
  window.addEventListener('beforeinstallprompt', (e) => {
    // Impede o prompt nativo padrão do Chrome
    e.preventDefault();
    // Salva o evento para ser disparado posteriormente
    deferredPrompt = e;

    // Se o usuário não tiver dispensado o banner, exibe-o com o botão de instalação de 1 clique
    if (!isDismissed) {
      installText.textContent = 'Adicione o app à sua tela de início para acessar rapidamente e de forma offline.';
      installBtn.classList.remove('hidden');
      banner.classList.remove('hidden');
    }
  });

  // 3. Fallback para outros navegadores (Firefox, Opera Desktop, etc. que não possuem prompt dinâmico)
  // Aguarda 3 segundos. Se beforeinstallprompt não disparar, exibe instruções genéricas
  setTimeout(() => {
    if (!deferredPrompt && !isIOS && !isStandalone && !isDismissed) {
      installText.innerHTML = 'Adicione este app à sua tela inicial! Abra o menu do seu navegador (três pontinhos ou linhas) e selecione <strong class="text-emerald-400">"Adicionar à Tela Inicial"</strong> ou <strong class="text-emerald-400">"Instalar"</strong>.';
      installBtn.classList.add('hidden');
      banner.classList.remove('hidden');
    }
  }, 3000);

  // Ação de clicar no botão "Instalar Agora" (para Chrome/Android)
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;

    // Exibe o prompt nativo de instalação
    deferredPrompt.prompt();

    // Aguarda a resposta do usuário
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Escolha de instalação do usuário: ${outcome}`);

    // Limpa a variável do evento, pois o prompt só pode ser usado uma vez
    deferredPrompt = null;
    // Oculta o banner
    banner.classList.add('hidden');
  });

  // Ação de fechar/dispensar o banner
  closeBtn.addEventListener('click', () => {
    banner.classList.add('hidden');
    // Salva no localStorage para não perturbar o usuário novamente
    localStorage.setItem('fin_install_dismissed', 'true');
  });
}

// Inicializar aplicativo no carregamento do DOM
document.addEventListener('DOMContentLoaded', initApp);
