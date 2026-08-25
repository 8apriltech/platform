// Controlador Principal da Central de Conversas INNA
import { renderConversationList, renderLoadingSkeleton } from './components/ConversationList.js';
import { renderChatHeader, renderMessageList } from './components/MessageList.js';
import { renderContactDetails, renderAISummary } from './components/ContactPanel.js';

// --- ESTADO GLOBAL DA APLICAÇÃO ---
const STATE = {
  supabase: null,
  isDemoMode: false,
  conversations: [],       // Lista de contatos da vw_inbox
  filteredConversations: [], // Lista filtrada pela pesquisa
  selectedContactId: null,
  activeContact: null,     // Dados do contato selecionado
  activeMessages: [],      // Mensagens da conversa ativa
  activeSummary: null,     // Resumo da IA da conversa ativa
  searchQuery: ''
};

// --- MOCK DATA PARA MODO DEMO ---
const MOCK_DATA = {
  inbox: [
    {
      id: "demo-1",
      nome_exibicao: "Ana Silva",
      nome: "Ana Silva",
      telefone: "+55 (11) 99888-7766",
      status: "ia",
      modo_humano: false,
      colaborador_responsavel: null,
      empreendimento_interesse: "Residencial Innova",
      ultima_interacao: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min atrás
      ultima_mensagem: "Vou querer fazer uma visita amanhã sim! Qual o horário disponível?",
      ultima_direcao: "inbound",
      ultima_origem: "cliente",
      ultimo_tipo: "texto",
      ultima_mensagem_em: new Date(Date.now() - 1000 * 60 * 5).toISOString()
    },
    {
      id: "demo-2",
      nome_exibicao: "Bruno Souza",
      nome: "Bruno Souza",
      telefone: "+55 (21) 98765-4321",
      status: "humano",
      modo_humano: true,
      colaborador_responsavel: "Corretor Roberto",
      empreendimento_interesse: "Parque das Flores",
      ultima_interacao: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2h atrás
      ultima_mensagem: "O corretor já está ciente? Estarei no local às 14h.",
      ultima_direcao: "outbound",
      ultima_origem: "corretor",
      ultimo_tipo: "texto",
      ultima_mensagem_em: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
    },
    {
      id: "demo-3",
      nome_exibicao: "Carlos Mendes",
      nome: "Carlos Mendes",
      telefone: "+55 (31) 97777-8888",
      status: "ia",
      modo_humano: false,
      colaborador_responsavel: null,
      empreendimento_interesse: "Vitta Condomínio",
      ultima_interacao: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // Ontem
      ultima_mensagem: "Temos opções de 3 quartos?",
      ultima_direcao: "inbound",
      ultima_origem: "cliente",
      ultimo_tipo: "texto",
      ultima_mensagem_em: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
    },
    {
      id: "demo-4",
      nome_exibicao: "+55 (19) 96543-2109",
      nome: null,
      telefone: "+55 (19) 96543-2109",
      status: "ia",
      modo_humano: false,
      colaborador_responsavel: null,
      empreendimento_interesse: null,
      ultima_interacao: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 dias atrás
      ultima_mensagem: "Gostaria de ver fotos do decorado.",
      ultima_direcao: "inbound",
      ultima_origem: "cliente",
      ultimo_tipo: "texto",
      ultima_mensagem_em: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
    },
    {
      id: "demo-5",
      nome_exibicao: "Mariana Santos",
      nome: "Mariana Santos",
      telefone: "+55 (11) 91234-5678",
      status: "finalizado",
      modo_humano: false,
      colaborador_responsavel: null,
      empreendimento_interesse: "Terras Altas",
      ultima_interacao: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 dias atrás
      ultima_mensagem: "Obrigada pelas informações!",
      ultima_direcao: "inbound",
      ultima_origem: "cliente",
      ultimo_tipo: "texto",
      ultima_mensagem_em: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString()
    }
  ],
  messages: {
    "demo-1": [
      { id: "m1", created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), direcao: "inbound", origem: "cliente", tipo: "texto", mensagem: "Olá, gostaria de saber mais sobre o Residencial Innova" },
      { id: "m2", created_at: new Date(Date.now() - 1000 * 60 * 29).toISOString(), direcao: "outbound", origem: "ia", tipo: "texto", mensagem: "Olá! Sou a INNA, assistente virtual da Innova. O Residencial Innova conta com apartamentos de 2 e 3 dormitórios, lazer completo e condições especiais de lançamento. Gostaria de receber a tabela de preços?" },
      { id: "m3", created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(), direcao: "inbound", origem: "cliente", tipo: "texto", mensagem: "Sim, por favor. E aceitam FGTS na entrada?" },
      { id: "m4", created_at: new Date(Date.now() - 1000 * 60 * 19).toISOString(), direcao: "outbound", origem: "ia", tipo: "texto", mensagem: "Sim, aceitamos o FGTS como parte da entrada! Acabo de enviar os detalhes das opções de lazer. Gostaria de agendar uma visita ao decorado para amanhã?" },
      { id: "m5", created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), direcao: "inbound", origem: "cliente", tipo: "texto", mensagem: "Vou querer fazer uma visita amanhã sim! Qual o horário disponível?" }
    ],
    "demo-2": [
      { id: "m2-1", created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), direcao: "inbound", origem: "cliente", tipo: "texto", mensagem: "Gostaria de agendar uma visita com um corretor para hoje à tarde." },
      { id: "m2-2", created_at: new Date(Date.now() - 1000 * 60 * 60 * 3.9).toISOString(), direcao: "outbound", origem: "ia", tipo: "texto", mensagem: "Perfeito! Estou acionando um de nossos consultores humanos para dar continuidade no seu agendamento. Um instante." },
      { id: "m2-3", created_at: new Date(Date.now() - 1000 * 60 * 60 * 3.5).toISOString(), direcao: "outbound", origem: "corretor", tipo: "texto", mensagem: "Olá Bruno, aqui é o Roberto! Eu posso te atender hoje às 14h no estande do Parque das Flores. Fica bom para você?" },
      { id: "m2-4", created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), direcao: "inbound", origem: "cliente", tipo: "texto", mensagem: "O corretor já está ciente? Estarei no local às 14h." }
    ],
    "demo-3": [
      { id: "m3-1", created_at: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(), direcao: "inbound", origem: "cliente", tipo: "texto", mensagem: "Olá" },
      { id: "m3-2", created_at: new Date(Date.now() - 1000 * 60 * 60 * 24.9).toISOString(), direcao: "outbound", origem: "ia", tipo: "texto", mensagem: "Olá! Como posso te ajudar hoje?" },
      { id: "m3-3", created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), direcao: "inbound", origem: "cliente", tipo: "texto", mensagem: "Temos opções de 3 quartos?" }
    ],
    "demo-4": [
      { id: "m4-1", created_at: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(), direcao: "inbound", origem: "cliente", tipo: "texto", mensagem: "Quero informações" },
      { id: "m4-2", created_at: new Date(Date.now() - 1000 * 60 * 60 * 49.9).toISOString(), direcao: "outbound", origem: "ia", tipo: "texto", mensagem: "Olá! Para te enviar as informações corretas, qual empreendimento você gostaria de conhecer?" },
      { id: "m4-3", created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), direcao: "inbound", origem: "cliente", tipo: "texto", mensagem: "Gostaria de ver fotos do decorado." }
    ],
    "demo-5": [
      { id: "m5-1", created_at: new Date(Date.now() - 1000 * 60 * 60 * 125).toISOString(), direcao: "inbound", origem: "cliente", tipo: "texto", mensagem: "Oi, vi o anúncio do Terras Altas" },
      { id: "m5-2", created_at: new Date(Date.now() - 1000 * 60 * 60 * 124).toISOString(), direcao: "outbound", origem: "ia", tipo: "texto", mensagem: "Excelente escolha! O Terras Altas é ideal para quem busca lotes residenciais em condomínio fechado com segurança 24h. O valor do m² está super atrativo." },
      { id: "m5-3", created_at: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(), direcao: "inbound", origem: "cliente", tipo: "texto", mensagem: "Obrigada pelas informações!" }
    ]
  },
  conversas: {
    "demo-1": {
      id: "conv-c1",
      contato_id: "demo-1",
      ultima_intencao: "Agendamento de visita",
      resumo_contexto: "Lead muito interessado no Residencial Innova. Questionou sobre uso de FGTS para entrada, confirmou visita ao decorado e aguarda agendamento de horário.",
      ultimo_status: "Visita pré-agendada",
      lead_temperatura: "Quente"
    },
    "demo-2": {
      id: "conv-c2",
      contato_id: "demo-2",
      ultima_intencao: "Contato Humano",
      resumo_contexto: "O cliente solicitou falar com corretor. Foi repassado para o corretor Roberto para tratar do Parque das Flores.",
      ultimo_status: "Transferido para corretor",
      lead_temperatura: "Morno"
    },
    "demo-3": {
      id: "conv-c3",
      contato_id: "demo-3",
      ultima_intencao: "Dúvida sobre dormitórios",
      resumo_contexto: "Iniciou contato hoje demonstrando interesse em opções com 3 dormitórios.",
      ultimo_status: "Em atendimento pela IA",
      lead_temperatura: "Frio"
    },
    "demo-4": null, // Sem resumo
    "demo-5": {
      id: "conv-c5",
      contato_id: "demo-5",
      ultima_intencao: "Encerramento",
      resumo_contexto: "Agradeceu o atendimento sobre o loteamento Terras Altas.",
      ultimo_status: "Concluído",
      lead_temperatura: "Frio"
    }
  }
};


// --- INICIALIZAÇÃO DA APLICAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
  setupAccordion();
  loadSavedConnectionConfig();
  
  // Inicializa o tema (Modo Escuro / Claro)
  initTheme();
  
  // Event Listeners de Alternância de Tema
  document.getElementById('btn-theme-toggle').addEventListener('click', toggleTheme);
  document.getElementById('btn-login-theme-toggle').addEventListener('click', toggleTheme);
  
  // Event Listeners de Login
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('btn-demo-mode').addEventListener('click', handleDemoMode);
  document.getElementById('btn-save-config').addEventListener('click', saveConnectionConfig);
  document.getElementById('btn-logout').addEventListener('click', handleLogout);
  
  const btnGoogle = document.getElementById('btn-login-google');
  if (btnGoogle) {
    btnGoogle.addEventListener('click', handleGoogleLogin);
  }
  
  // Event Listeners de Busca
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', handleSearch);
  
  const btnClearSearch = document.getElementById('btn-clear-search');
  btnClearSearch.addEventListener('click', () => {
    searchInput.value = '';
    STATE.searchQuery = '';
    btnClearSearch.classList.add('hidden');
    filterInboxList();
  });
  
  // Responsividade: Fechar detalhes ou voltar para inbox
  document.getElementById('btn-close-details').addEventListener('click', () => {
    const container = document.getElementById('app-screen');
    container.classList.remove('show-details');
    container.classList.add('show-chat');
    
    // Fechar drawer no tablet
    document.getElementById('column-details').classList.remove('show-drawer');
  });

  // Ação de Excluir Conversa
  document.addEventListener('click', async (e) => {
    const btnDelete = e.target.closest('#btn-delete-conversation');
    if (btnDelete) {
      const contactId = btnDelete.dataset.id;
      await handleDeleteConversation(contactId);
    }
  });

  // Tenta auto-login
  autoLogin();
});

// --- CONTROLE DE TEMA (MODO ESCURO) ---
function initTheme() {
  const savedTheme = localStorage.getItem('inna_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
  
  if (isDark) {
    document.body.classList.add('dark-theme');
    updateThemeIcons(true);
  } else {
    document.body.classList.remove('dark-theme');
    updateThemeIcons(false);
  }
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-theme');
  localStorage.setItem('inna_theme', isDark ? 'dark' : 'light');
  updateThemeIcons(isDark);
}

function updateThemeIcons(isDark) {
  const iconName = isDark ? 'sun' : 'moon';
  
  const btnLogin = document.getElementById('btn-login-theme-toggle');
  const btnSidebar = document.getElementById('btn-theme-toggle');
  
  if (btnLogin) {
    btnLogin.innerHTML = `<i data-lucide="${iconName}"></i>`;
  }
  if (btnSidebar) {
    btnSidebar.innerHTML = `<i data-lucide="${iconName}"></i>`;
  }
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
}


// --- FUNÇÕES DE INTERFACE DO ACORDEON ---
function setupAccordion() {
  const toggle = document.getElementById('btn-toggle-advanced');
  const content = document.getElementById('advanced-settings-content');
  
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    content.classList.toggle('hidden');
  });
}

// --- CONFIGURAÇÃO DO BANCO (LOCALSTORAGE) ---
function loadSavedConnectionConfig() {
  const savedUrl = localStorage.getItem('inna_sb_url') || window.SUPABASE_CONFIG?.url || '';
  const savedKey = localStorage.getItem('inna_sb_key') || window.SUPABASE_CONFIG?.anonKey || '';
  
  document.getElementById('config-sb-url').value = savedUrl;
  document.getElementById('config-sb-key').value = savedKey;
}

function saveConnectionConfig() {
  const url = document.getElementById('config-sb-url').value.trim();
  const key = document.getElementById('config-sb-key').value.trim();
  
  if (!url || !key) {
    alert('Por favor, preencha a URL e a Anon Key do Supabase!');
    return;
  }
  
  localStorage.setItem('inna_sb_url', url);
  localStorage.setItem('inna_sb_key', key);
  alert('Credenciais do Supabase salvas localmente!');
  
  // Fecha o acordeon
  document.getElementById('btn-toggle-advanced').classList.remove('active');
  document.getElementById('advanced-settings-content').classList.add('hidden');
}

// --- CONEXÃO COM O SUPABASE ---
function initSupabase() {
  const url = localStorage.getItem('inna_sb_url') || window.SUPABASE_CONFIG?.url;
  const key = localStorage.getItem('inna_sb_key') || window.SUPABASE_CONFIG?.anonKey;
  
  if (!url || !key) {
    return false;
  }
  
  try {
    // A biblioteca é exposta no escopo global 'supabase'
    if (window.supabase) {
      STATE.supabase = window.supabase.createClient(url, key);
      return true;
    }
  } catch (err) {
    console.error('Erro ao conectar ao Supabase:', err);
  }
  return false;
}

// --- AUTENTICAÇÃO ---
async function autoLogin() {
  // Verifica se o modo demo já estava ativo
  if (sessionStorage.getItem('inna_demo_active') === 'true') {
    STATE.isDemoMode = true;
    showAppScreen();
    loadInbox();
    return;
  }

  const isConnected = initSupabase();
  if (isConnected) {
    try {
      const { data: { session } } = await STATE.supabase.auth.getSession();
      if (session) {
        // Limpa tokens da URL pós-redirecionamento OAuth (Google)
        if (window.location.hash) {
          window.history.replaceState(null, null, window.location.pathname);
        }
        showAppScreen();
        loadInbox();
      }
    } catch (err) {
      console.warn('Não foi possível recuperar sessão automática.', err);
    }
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorContainer = document.getElementById('login-error');
  const errorText = document.getElementById('login-error-text');
  const btnSubmit = document.getElementById('btn-login-submit');
  
  errorContainer.classList.add('hidden');
  
  const isConnected = initSupabase();
  if (!isConnected) {
    errorText.innerText = 'Supabase não configurado. Por favor, acesse "Configurações do Banco" e informe a URL e Chave Anon.';
    errorContainer.classList.remove('hidden');
    return;
  }
  
  // Feedback visual de carregando
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<span>Verificando...</span>';
  
  try {
    const { data, error } = await STATE.supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      throw error;
    }
    
    STATE.isDemoMode = false;
    sessionStorage.removeItem('inna_demo_active');
    showAppScreen();
    loadInbox();
  } catch (err) {
    errorText.innerText = err.message || 'Erro de autenticação no banco Supabase.';
    errorContainer.classList.remove('hidden');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = '<span>Entrar no Sistema</span><i data-lucide="arrow-right"></i>';
    if (window.lucide) window.lucide.createIcons();
  }
}

async function handleGoogleLogin() {
  const errorContainer = document.getElementById('login-error');
  const errorText = document.getElementById('login-error-text');
  errorContainer.classList.add('hidden');
  
  const isConnected = initSupabase();
  if (!isConnected) {
    errorText.innerText = 'Supabase não configurado. Por favor, acesse "Configurações do Banco" e informe a URL e Chave Anon.';
    errorContainer.classList.remove('hidden');
    return;
  }
  
  try {
    const { error } = await STATE.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    });
    
    if (error) throw error;
  } catch (err) {
    errorText.innerText = err.message || 'Erro ao conectar via Google.';
    errorContainer.classList.remove('hidden');
  }
}

function handleDemoMode() {
  STATE.isDemoMode = true;
  sessionStorage.setItem('inna_demo_active', 'true');
  showAppScreen();
  loadInbox();
}

function handleLogout() {
  if (STATE.supabase && !STATE.isDemoMode) {
    STATE.supabase.auth.signOut();
  }
  
  STATE.isDemoMode = false;
  STATE.selectedContactId = null;
  STATE.activeContact = null;
  STATE.activeMessages = [];
  STATE.activeSummary = null;
  sessionStorage.removeItem('inna_demo_active');
  
  hideAppScreen();
}

// --- TRANSIÇÕES DE TELA ---
function showAppScreen() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  
  // Atualiza as tags do consultor no header se for demo
  const userRole = document.querySelector('.user-role');
  if (STATE.isDemoMode) {
    userRole.innerText = 'Modo Demo';
    userRole.style.color = '#e11d48'; // Destaque avermelhado para demo
  } else {
    userRole.innerText = 'Leitura';
    userRole.style.color = 'var(--brand-primary)';
  }
}

function hideAppScreen() {
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  
  // Limpa inputs
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').classList.add('hidden');
  
  // Reseta visual do chat
  const chatArea = document.getElementById('column-chat');
  chatArea.innerHTML = '';
}


// --- FLUXO DE DADOS: INBOX (COLUNA 1) ---
async function loadInbox() {
  const listContainer = document.getElementById('conversation-list');
  renderLoadingSkeleton(listContainer);
  
  if (STATE.isDemoMode) {
    // Simula atraso na rede
    setTimeout(() => {
      STATE.conversations = MOCK_DATA.inbox;
      filterInboxList();
    }, 600);
    return;
  }
  
  try {
    const { data, error } = await STATE.supabase
      .from('vw_inbox')
      .select('*');
      
    if (error) throw error;
    
    // O view já está ordenado por ultima_interacao DESC no banco
    STATE.conversations = data || [];
    filterInboxList();
  } catch (err) {
    console.error('Erro ao carregar vw_inbox:', err);
    listContainer.innerHTML = `
      <div class="empty-list-state">
        <i data-lucide="alert-triangle" style="color: hsl(0, 84%, 50%)"></i>
        <p>Falha ao conectar com o Supabase. Verifique suas tabelas ou permissões RLS.</p>
        <button class="btn-secondary btn-sm" onclick="location.reload()">Recarregar</button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }
}

// Filtro e pesquisa
function handleSearch(e) {
  STATE.searchQuery = e.target.value;
  const btnClear = document.getElementById('btn-clear-search');
  
  if (STATE.searchQuery.trim().length > 0) {
    btnClear.classList.remove('hidden');
  } else {
    btnClear.classList.add('hidden');
  }
  
  filterInboxList();
}

function filterInboxList() {
  const query = STATE.searchQuery.toLowerCase().trim();
  const listContainer = document.getElementById('conversation-list');
  
  if (!query) {
    STATE.filteredConversations = STATE.conversations;
  } else {
    STATE.filteredConversations = STATE.conversations.filter(item => {
      const nome = (item.nome || '').toLowerCase();
      const telefone = (item.telefone || '').toLowerCase();
      const empreendimento = (item.empreendimento_interesse || '').toLowerCase();
      
      return nome.includes(query) || telefone.includes(query) || empreendimento.includes(query);
    });
  }
  
  // Renderiza no container
  renderConversationList(
    listContainer, 
    STATE.filteredConversations, 
    STATE.selectedContactId, 
    selectConversation
  );
}


// --- SELEÇÃO DE CONVERSA E CARREGAMENTO DE DETALHES (COLUNAS 2 E 3) ---
async function selectConversation(contactId) {
  STATE.selectedContactId = contactId;
  
  // Responsividade Mobile: Navega para a tela de chat
  const container = document.getElementById('app-screen');
  container.className = 'app-container show-chat';
  
  // Renderiza cabeçalho e viewport limpo em estado de loading
  const headerContainer = document.getElementById('chat-header-container');
  const viewport = document.getElementById('message-viewport');
  const contactContainer = document.getElementById('contact-panel-container');
  const aiContainer = document.getElementById('ai-summary-container');
  
  viewport.innerHTML = `
    <div style="flex: 1; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 16px; color: var(--text-muted);">
      <div class="skeleton-loader" style="width: 50px; height: 50px; border-radius: 50%;"></div>
      <p style="font-size: 13px;">Carregando histórico de mensagens...</p>
    </div>
  `;
  
  contactContainer.innerHTML = `<div class="empty-list-state"><p>Carregando dados...</p></div>`;
  aiContainer.innerHTML = `<div class="empty-list-state"><p>Carregando resumo...</p></div>`;
  
  // Carrega os dados paralelos
  if (STATE.isDemoMode) {
    setTimeout(() => {
      // Pega o contato do mockup
      STATE.activeContact = MOCK_DATA.inbox.find(c => c.id === contactId);
      STATE.activeMessages = MOCK_DATA.messages[contactId] || [];
      STATE.activeSummary = MOCK_DATA.conversas[contactId] || null;
      
      renderConversationDetails();
    }, 400);
  } else {
    try {
      // 1. Busca detalhes do contato na tabela contatos
      const contactPromise = STATE.supabase
        .from('contatos')
        .select('*')
        .eq('id', contactId)
        .single();
        
      // 2. Busca últimas 50 mensagens em ordem decrescente de criação
      const messagesPromise = STATE.supabase
        .from('mensagens')
        .select('*')
        .eq('contato_id', contactId)
        .order('created_at', { ascending: false })
        .limit(50);
        
      // 3. Busca resumo da conversa (se houver)
      const summaryPromise = STATE.supabase
        .from('conversas')
        .select('*')
        .eq('contato_id', contactId)
        .maybeSingle(); // não gera erro se não houver registros
        
      const [contactRes, messagesRes, summaryRes] = await Promise.all([
        contactPromise,
        messagesPromise,
        summaryPromise
      ]);
      
      if (contactRes.error) throw contactRes.error;
      if (messagesRes.error) throw messagesRes.error;
      
      STATE.activeContact = contactRes.data;
      STATE.activeMessages = messagesRes.data || [];
      STATE.activeSummary = summaryRes.data || null;
      
      renderConversationDetails();
    } catch (err) {
      console.error('Erro ao carregar detalhes da conversa:', err);
      viewport.innerHTML = `
        <div class="chat-empty-state">
          <i data-lucide="alert-octagon" style="color: hsl(0, 84%, 50%); width: 48px; height: 48px;"></i>
          <h2>Erro de Carregamento</h2>
          <p>Ocorreu uma falha ao puxar os registros do banco de dados.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
  }
}

// Renderizadores do estado atual
function renderConversationDetails() {
  const headerContainer = document.getElementById('chat-header-container');
  const viewport = document.getElementById('message-viewport');
  const contactContainer = document.getElementById('contact-panel-container');
  const aiContainer = document.getElementById('ai-summary-container');
  
  // Renderiza cabeçalho
  renderChatHeader(headerContainer, STATE.activeContact, toggleDetailsSidebar, backToInboxList);
  
  // Renderiza mensagens (será ordenado cronologicamente dentro do componente)
  renderMessageList(viewport, STATE.activeMessages, STATE.activeContact);
  
  // Renderiza Detalhes do Contato
  renderContactDetails(contactContainer, STATE.activeContact);
  
  // Renderiza Resumo da IA
  renderAISummary(aiContainer, STATE.activeSummary);
}

// --- CONTROLADORES DE RESPONSIVIDADE EM NAVEGAÇÃO ---
function backToInboxList() {
  const container = document.getElementById('app-screen');
  container.className = 'app-container'; // Limpa classes retornando para inbox
  
  // Limpa seleção na sidebar
  STATE.selectedContactId = null;
  const activeItems = document.querySelectorAll('.conversation-item.active');
  activeItems.forEach(el => el.classList.remove('active'));
}

function toggleDetailsSidebar() {
  const container = document.getElementById('app-screen');
  const detailsSidebar = document.getElementById('column-details');
  
  const isMobile = window.innerWidth <= 767;
  
  if (isMobile) {
    container.className = 'app-container show-details';
  } else {
    // Em tablets, abre como drawer lateral
    detailsSidebar.classList.toggle('show-drawer');
  }
}

// --- FUNÇÃO PARA DELETAR CONVERSA ---
async function handleDeleteConversation(contactId) {
  const confirmDelete = confirm("Tem certeza que deseja excluir permanentemente esta conversa e todo o seu histórico? Esta ação não pode ser desfeita.");
  if (!confirmDelete) return;

  // Feedback visual de carregamento no botão
  const btnDelete = document.getElementById('btn-delete-conversation');
  if (btnDelete) {
    btnDelete.disabled = true;
    btnDelete.innerHTML = `<i data-lucide="loader" class="spinner"></i> <span>Excluindo...</span>`;
    if (window.lucide) window.lucide.createIcons();
  }

  if (STATE.isDemoMode) {
    // Modo Demo: Simula exclusão em memória
    setTimeout(() => {
      MOCK_DATA.inbox = MOCK_DATA.inbox.filter(c => c.id !== contactId);
      delete MOCK_DATA.messages[contactId];
      delete MOCK_DATA.conversas[contactId];

      STATE.conversations = STATE.conversations.filter(c => c.id !== contactId);
      
      resetActiveChat();
      filterInboxList();
      alert("Conversa excluída com sucesso! (Modo Demo)");
    }, 800);
    return;
  }

  try {
    // Banco Real: Exclui o contato (devido ao CASCADE, apaga mensagens e conversas)
    const { error } = await STATE.supabase
      .from('contatos')
      .delete()
      .eq('id', contactId);

    if (error) throw error;

    // Atualiza estado local
    STATE.conversations = STATE.conversations.filter(c => c.id !== contactId);
    
    // Reseta visualização do chat ativo
    resetActiveChat();
    
    // Filtra e recarrega a barra lateral
    filterInboxList();
    
    alert("Conversa excluída com sucesso!");
  } catch (err) {
    console.error("Erro ao excluir conversa:", err);
    alert("Erro ao excluir conversa: " + (err.message || err));
    
    // Restaura botão original
    if (btnDelete) {
      btnDelete.disabled = false;
      btnDelete.innerHTML = `<i data-lucide="trash-2"></i> <span>Excluir Conversa</span>`;
      if (window.lucide) window.lucide.createIcons();
    }
  }
}

// Reseta o painel de chat e informações para o estado padrão (limpo)
function resetActiveChat() {
  STATE.selectedContactId = null;
  STATE.activeContact = null;
  STATE.activeMessages = [];
  STATE.activeSummary = null;

  // Limpa elementos da tela
  document.getElementById('chat-header-container').innerHTML = '';
  
  // Exibe tela vazia padrão no chat
  const viewport = document.getElementById('message-viewport');
  viewport.innerHTML = `
    <div class="chat-empty-state">
      <div class="chat-empty-icon">
        <i data-lucide="message-square"></i>
      </div>
      <h2>INNA - Central de Conversas</h2>
      <p>Selecione um cliente na lista lateral para visualizar o histórico completo da conversa.</p>
    </div>
  `;
  
  document.getElementById('contact-panel-container').innerHTML = `
    <div class="empty-list-state" style="padding: 20px 0;">
      <p>Selecione um contato para ver os detalhes.</p>
    </div>
  `;
  
  document.getElementById('ai-summary-container').innerHTML = `
    <div class="ai-empty-message">Resumo ainda não disponível.</div>
  `;

  // Se estiver em mobile, volta para a lista
  const container = document.getElementById('app-screen');
  container.className = 'app-container';
  
  // Fecha o drawer no tablet
  document.getElementById('column-details').classList.remove('show-drawer');

  if (window.lucide) window.lucide.createIcons();
}
