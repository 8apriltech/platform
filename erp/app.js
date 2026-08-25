/* ==========================================================================
   8April ERP - INTEGRATED SYSTEM ENGINE (8April Tech)
   ========================================================================== */

// Default Supabase Configuration (Shared across modules)
const DEFAULT_SUPABASE_URL = "https://exrvjejlhtdjdhcuzwth.supabase.co";
const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4cnZqZWpsaHRkamRoY3V6d3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MTk2NDQsImV4cCI6MjA4NTk5NTY0NH0.Jd_gn8bvcDyw5RjiXIL5FePT6mTg6B1tDbBKw-hRakc";
const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

const STORAGE_KEY = 'ha_erp_comercial_state';
const SUPABASE_CFG_KEY = 'ha_erp_supabase_config';
const DEFAULT_WEBHOOK_COBRANCA_URL = "https://n8n.srv1129054.hstgr.cloud/webhook/cobranca-whatsapp";
const WEBHOOK_COBRANCA_CFG_KEY = '8april_erp_webhook_cobranca_url';

let client = null;
let isSupabaseConnected = false;

// Consolidated Application State
let state = {
  // Comercial Data
  contratos: [],
  parcelas: [],
  recebimentos: [],
  timeline: [],
  clientesComercial: [],
  
  // OS Data
  ordensServico: [],
  crmLeads: []
};

// State for OS module pagination & filtering
let osPaginaAtual = 1;
const osLimite = 100;
let osColunaAtual = "data_entrega";
let osOrdemAsc = false;
let osEditandoId = null;

// State for Comercial module active contract view
let activeContractId = null;

// Chart Instances
let chartConsolidadoInstance = null;
let chartComercialRecebimentos = null;
let chartComercialStatus = null;
let chartOsFaturamento = null;

// Helper: UUID Generator
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper: Currency & Date Formatters
const formatarMoeda = v => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatarData = d => {
  if (!d) return "-";
  const parts = d.split("T")[0].split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
};

function formatarDataLocal(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// Toast Notifications
function mostrarToast(msg, tipo = "sucesso") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  const cores = {
    sucesso: "#22c55e",
    erro: "#ef4444",
    aviso: "#f59e0b"
  };

  toast.innerText = msg;
  toast.style.background = cores[tipo] || "#22c55e";
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

/* ==========================================================================
   INITIALIZATION & SUPABASE AUTHENTICATION
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  initSupabaseFromConfig();

  const authed = await verificarSessao();
  if (!authed) return;

  // Load database content
  await carregarTodosDados();

  // Initialize UI components
  initCharts();
  renderDashboardConsolidado();
  carregarDadosOS();
  carregarClientesAutocompleteOS();

  // Set default form dates to today
  const hoje = new Date().toISOString().split('T')[0];
  const elemRec = document.getElementById('inp-rec-data');
  if (elemRec) elemRec.value = hoje;
  const elemIni = document.getElementById('inp-data-inicio');
  if (elemIni) elemIni.value = hoje;
  const elemFim = document.getElementById('inp-data-fim');
  if (elemFim) elemFim.value = hoje;
});

function initSupabaseFromConfig() {
  let url = DEFAULT_SUPABASE_URL;
  let key = DEFAULT_SUPABASE_KEY;

  const savedCfg = localStorage.getItem(SUPABASE_CFG_KEY);
  if (savedCfg) {
    try {
      const cfg = JSON.parse(savedCfg);
      if (cfg.url && cfg.key) {
        url = cfg.url;
        key = cfg.key;
      }
    } catch(e) {}
  }

  if (url && key && window.supabase) {
    try {
      client = window.supabase.createClient(url, key);
      isSupabaseConnected = true;
      
      const inputUrl = document.getElementById('cfg-supabase-url');
      const inputKey = document.getElementById('cfg-supabase-key');
      if (inputUrl) inputUrl.value = url;
      if (inputKey) inputKey.value = key;
      
      initWebhookConfigUI();
      updateConnectionUI(true, url);
      return;
    } catch(e) {
      console.error("Erro ao iniciar cliente Supabase", e);
    }
  }
  updateConnectionUI(false);
}

function updateConnectionUI(connected, url = '') {
  const bannerTitle = document.getElementById('banner-title');
  const bannerSub = document.getElementById('banner-sub');
  const btnStatus = document.getElementById('btn-supabase-status');
  const sidebarStatus = document.getElementById('sidebar-conn-status');

  if (connected) {
    if (bannerTitle) bannerTitle.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--success);"></i> Supabase Conectado (Produção)`;
    if (bannerSub) bannerSub.innerText = `Conexão direta unificada PostgreSQL (${url})`;
    if (btnStatus) btnStatus.innerHTML = `<i class="fa-solid fa-database" style="color:var(--success)"></i> Supabase Ativo`;
    if (sidebarStatus) sidebarStatus.innerHTML = `<span style="color:var(--success)">🟢 Supabase Conectado</span>`;
  } else {
    if (bannerTitle) bannerTitle.innerHTML = `<i class="fa-solid fa-database" style="color: var(--warning);"></i> Supabase Pendente`;
    if (bannerSub) bannerSub.innerText = `Configure sua URL e Anon Key no menu de Configurações.`;
    if (btnStatus) btnStatus.innerHTML = `<i class="fa-solid fa-gear"></i> Configurar Conexão`;
    if (sidebarStatus) sidebarStatus.innerText = `Supabase Desconectado`;
  }
}

function getLoginUrl() {
  if (window.location.protocol === 'file:') {
    return "https://app.8april.com.br/login.html";
  }
  return "/login.html";
}

async function verificarSessao() {
  if (!isSupabaseConnected || !client) {
    if (window.location.protocol === 'file:') {
      console.warn("Visualizando via protocolo local file://");
      return true; // Permite visualização e testes locais
    }
    window.location.href = getLoginUrl();
    return false;
  }

  try {
    const { data: { session } } = await client.auth.getSession();

    if (!session) {
      if (window.location.protocol === 'file:') {
        console.warn("Visualizando localmente (file://) sem sessão de login. Permite testar/visualizar a interface.");
        const bannerTitle = document.getElementById('banner-title');
        const bannerSub = document.getElementById('banner-sub');
        if (bannerTitle) bannerTitle.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color: var(--warning);"></i> Visualizando Modo Local (Sem Sessão)`;
        if (bannerSub) bannerSub.innerHTML = `Sessão não detectada no arquivo local. Acesse <a href="https://app.8april.com.br/login.html" target="_blank" style="color:var(--accent-neon); text-decoration:underline;">app.8april.com.br</a> para autenticar.`;
        return true;
      }
      window.location.href = getLoginUrl();
      return false;
    }

    client.auth.onAuthStateChange((event, currentSession) => {
      if (event === 'SIGNED_OUT' || !currentSession) {
        window.location.href = getLoginUrl();
      }
    });

    return true;
  } catch(e) {
    console.error("Erro na verificação de sessão", e);
    if (window.location.protocol === 'file:') {
      return true;
    }
    window.location.href = getLoginUrl();
    return false;
  }
}

async function fazerLogout() {
  if (client) {
    try { await client.auth.signOut(); } catch(e){}
  }
  window.location.href = getLoginUrl();
}

async function fazerLoginSupabase(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();

  if (!client) {
    mostrarToast("Supabase não configurado", "erro");
    return;
  }

  mostrarToast("Autenticando...");
  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    mostrarToast("Erro ao autenticar: " + error.message, "erro");
    return;
  }

  closeModal('modal-login-supabase');
  mostrarToast("✅ Autenticado com sucesso!");
  setTimeout(() => location.reload(), 800);
}

function salvarConfigSupabase(e) {
  e.preventDefault();
  const url = document.getElementById('cfg-supabase-url').value.trim();
  const key = document.getElementById('cfg-supabase-key').value.trim();

  if (!url || !key) {
    mostrarToast("Preencha a URL e a Key", "erro");
    return;
  }

  localStorage.setItem(SUPABASE_CFG_KEY, JSON.stringify({ url, key }));
  closeModal('modal-config-supabase');
  mostrarToast("Credenciais salvas. Recarregando...");
  setTimeout(() => location.reload(), 1000);
}

function getWebhookCobrancaUrl() {
  const saved = localStorage.getItem(WEBHOOK_COBRANCA_CFG_KEY);
  return saved || DEFAULT_WEBHOOK_COBRANCA_URL;
}

function initWebhookConfigUI() {
  const input = document.getElementById('cfg-webhook-cobranca-url');
  if (input) input.value = getWebhookCobrancaUrl();
}

function salvarConfigWebhookCobranca(e) {
  e.preventDefault();
  const url = document.getElementById('cfg-webhook-cobranca-url').value.trim();
  if (!url) {
    mostrarToast("Preencha a URL do Webhook", "erro");
    return;
  }

  localStorage.setItem(WEBHOOK_COBRANCA_CFG_KEY, url);
  mostrarToast("✅ URL do Webhook WhatsApp salva com sucesso!");
}

async function testarWebhookCobranca() {
  const inputUrl = document.getElementById('cfg-webhook-cobranca-url');
  const url = (inputUrl ? inputUrl.value.trim() : '') || getWebhookCobrancaUrl();
  
  if (!url) {
    mostrarToast("URL do Webhook não configurada", "erro");
    return;
  }

  const payloadTeste = {
    teste: true,
    cliente: "Bravo Veículos (Teste)",
    telefone: "5511999999999",
    vencimento: formatarData(new Date().toISOString().split('T')[0]),
    valor: 1500.00,
    valor_formatado: "R$ 1.500,00",
    descricao: "Mensalidade Suporte & Manutenção (Teste ERP)",
    pix_copia_cola: generatePixPayload("46005353000185", "8APRIL TECH", "SAO PAULO", 1500.00, "8ATEST"),
    pix_qr_url: "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=TESTE_ERP"
  };

  mostrarToast("⏳ Enviando teste para o n8n...");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadTeste)
    });

    if (res.ok || res.status === 200 || res.status === 201) {
      mostrarToast("✅ Disparo teste enviado com sucesso ao n8n!");
    } else {
      mostrarToast("⚠️ Webhook respondeu com HTTP " + res.status, "aviso");
    }
  } catch(err) {
    console.warn("Retentando via fallback no-cors para bypass de CORS...", err);
    try {
      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(payloadTeste)
      });
      mostrarToast("✅ Disparo enviado com sucesso ao n8n!");
    } catch(err2) {
      console.error("Erro disparo teste Webhook", err2);
      mostrarToast("❌ Falha na conexão com o Webhook. Verifique se o n8n está Ativo.", "erro");
    }
  }
}

async function dispararCobrancaWhatsApp(parcelaId) {
  const parcela = state.parcelas.find(p => String(p.id) === String(parcelaId));
  if (!parcela) {
    mostrarToast("Parcela não encontrada", "erro");
    return;
  }

  const contrato = state.contratos.find(c => String(c.id) === String(parcela.contrato_id));
  const clienteNomeNoContrato = contrato ? (contrato.cliente || contrato.cliente_nome || '') : '';

  // 1. Busca inteligente do cliente nas tabelas Comercial e CRM Leads
  let cliente = null;
  if (contrato && contrato.cliente_id) {
    cliente = state.clientesComercial.find(cli => String(cli.id) === String(contrato.cliente_id));
    if (!cliente) {
      cliente = state.crmLeads.find(l => String(l.id) === String(contrato.cliente_id));
    }
  }

  if (!cliente && clienteNomeNoContrato) {
    const nomeNorm = clienteNomeNoContrato.trim().toLowerCase();
    cliente = state.clientesComercial.find(cli => (cli.nome || '').trim().toLowerCase() === nomeNorm);
    if (!cliente) {
      cliente = state.crmLeads.find(l => (l.nome || '').trim().toLowerCase() === nomeNorm);
    }
  }

  const clienteNome = cliente ? cliente.nome : (clienteNomeNoContrato || 'Cliente');
  
  let clienteTelefone = cliente 
    ? (cliente.telefone || cliente.whatsapp || cliente.celular || cliente.contato) 
    : (contrato ? (contrato.telefone || contrato.whatsapp || contrato.celular) : '');

  // Limpa caracteres especiais do telefone
  if (clienteTelefone) {
    clienteTelefone = String(clienteTelefone).replace(/\D/g, '');
  }

  // 2. Se o telefone não for encontrado, solicita via prompt até obter um número válido
  while (!clienteTelefone || clienteTelefone.length < 8) {
    const numDigitado = prompt(`📱 O cliente "${clienteNome}" ainda não possui WhatsApp cadastrado.\n\nPor favor, informe o número do WhatsApp com DDD (ex: 3498039530):`);
    if (!numDigitado) {
      mostrarToast("Envio de cobrança cancelado (sem número do WhatsApp).", "aviso");
      return;
    }
    clienteTelefone = String(numDigitado).replace(/\D/g, '');
    
    // Salva temporariamente no contrato e cliente na sessão
    if (contrato) contrato.telefone = clienteTelefone;
    if (cliente) cliente.telefone = clienteTelefone;
  }

  // Garante DDI 55 se o número tiver 10 ou 11 dígitos
  if (clienteTelefone.length === 10 || clienteTelefone.length === 11) {
    clienteTelefone = '55' + clienteTelefone;
  }

  const pago = getParcelaPagoAmount(parcela.id);
  const valorPagar = Math.max(0, parcela.valor - pago);

  const txId = '8A' + String(parcela.id).replace(/\D/g, '').substring(0, 10);
  const emvPayload = generatePixPayload("46005353000185", "8APRIL TECH", "SAO PAULO", valorPagar, txId);
  const pixQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(emvPayload)}`;

  const payload = {
    parcela_id: parcela.id,
    contrato_id: contrato ? contrato.id : null,
    cliente: clienteNome,
    telefone: clienteTelefone,
    vencimento: formatarData(parcela.vencimento),
    valor: valorPagar,
    valor_formatado: formatarMoeda(valorPagar),
    descricao: parcela.descricao,
    pix_copia_cola: emvPayload,
    pix_qr_url: pixQrUrl
  };

  const inputUrl = document.getElementById('cfg-webhook-cobranca-url');
  const webhookUrl = (inputUrl ? inputUrl.value.trim() : '') || getWebhookCobrancaUrl();

  mostrarToast(`📱 Enviando cobrança via Whats para ${clienteNome}...`);

  let sucesso = false;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok || res.status === 200 || res.status === 201) {
      sucesso = true;
    }
  } catch(err) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(payload)
      });
      sucesso = true;
    } catch(err2) {
      console.error("Erro disparo Whats", err2);
    }
  }

  if (sucesso) {
    mostrarToast(`✅ Cobrança enviada com sucesso para ${clienteNome}!`);
    if (contrato) {
      state.timeline.push({
        contrato_id: contrato.id,
        data: new Date().toLocaleString('pt-BR'),
        titulo: "Cobrança WhatsApp Enviada",
        desc: `Cobrança de ${formatarMoeda(valorPagar)} (${parcela.descricao}) enviada via WhatsApp.`
      });
      syncStateComercial();
    }
  } else {
    mostrarToast("❌ Erro ao enviar Webhook WhatsApp. Verifique se o n8n está Ativo.", "erro");
  }
}

function verificarAutoCobrancasDoDia() {
  if (!state.parcelas || state.parcelas.length === 0) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const parcelasHoje = state.parcelas.filter(p => {
    return (p.status === 'Pendente' || p.status === 'Parcial') && p.vencimento && p.vencimento.split('T')[0] === todayStr;
  });

  if (parcelasHoje.length === 0) return;

  let disparadosCount = 0;

  parcelasHoje.forEach(p => {
    const keyEnvio = `8april_auto_cobranca_sent_${p.id}_${todayStr}`;
    if (localStorage.getItem(keyEnvio)) {
      return;
    }

    const contrato = state.contratos.find(c => String(c.id) === String(p.contrato_id));
    const clienteNomeNoContrato = contrato ? (contrato.cliente || contrato.cliente_nome || '') : '';

    let cliente = null;
    if (contrato && contrato.cliente_id) {
      cliente = state.clientesComercial.find(cli => String(cli.id) === String(contrato.cliente_id)) || state.crmLeads.find(l => String(l.id) === String(contrato.cliente_id));
    }
    if (!cliente && clienteNomeNoContrato) {
      const nomeNorm = clienteNomeNoContrato.trim().toLowerCase();
      cliente = state.clientesComercial.find(cli => (cli.nome || '').trim().toLowerCase() === nomeNorm) || state.crmLeads.find(l => (l.nome || '').trim().toLowerCase() === nomeNorm);
    }

    let tel = cliente ? (cliente.telefone || cliente.whatsapp || cliente.celular) : (contrato ? (contrato.telefone || contrato.whatsapp) : '');
    if (tel) tel = String(tel).replace(/\D/g, '');

    if (tel && tel.length >= 8) {
      localStorage.setItem(keyEnvio, 'true');
      dispararCobrancaWhatsAppSilencioso(p.id, tel);
      disparadosCount++;
    }
  });

  if (disparadosCount > 0) {
    mostrarToast(`⚡ ${disparadosCount} cobrança(s) do dia disparada(s) automaticamente via WhatsApp!`);
  }
}

async function dispararCobrancaWhatsAppSilencioso(parcelaId, telefoneInformado) {
  const parcela = state.parcelas.find(p => String(p.id) === String(parcelaId));
  if (!parcela) return;

  const contrato = state.contratos.find(c => String(c.id) === String(parcela.contrato_id));
  const clienteNomeNoContrato = contrato ? (contrato.cliente || contrato.cliente_nome || '') : '';

  let cliente = null;
  if (contrato && contrato.cliente_id) {
    cliente = state.clientesComercial.find(cli => String(cli.id) === String(contrato.cliente_id)) || state.crmLeads.find(l => String(l.id) === String(contrato.cliente_id));
  }
  if (!cliente && clienteNomeNoContrato) {
    const nomeNorm = clienteNomeNoContrato.trim().toLowerCase();
    cliente = state.clientesComercial.find(cli => (cli.nome || '').trim().toLowerCase() === nomeNorm) || state.crmLeads.find(l => (l.nome || '').trim().toLowerCase() === nomeNorm);
  }

  const clienteNome = cliente ? cliente.nome : (clienteNomeNoContrato || 'Cliente');
  let clienteTelefone = telefoneInformado ? String(telefoneInformado).replace(/\D/g, '') : '';

  if (clienteTelefone.length === 10 || clienteTelefone.length === 11) {
    clienteTelefone = '55' + clienteTelefone;
  }

  const pago = getParcelaPagoAmount(parcela.id);
  const valorPagar = Math.max(0, parcela.valor - pago);

  const txId = '8A' + String(parcela.id).replace(/\D/g, '').substring(0, 10);
  const emvPayload = generatePixPayload("46005353000185", "8APRIL TECH", "SAO PAULO", valorPagar, txId);
  const pixQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(emvPayload)}`;

  const payload = {
    parcela_id: parcela.id,
    contrato_id: contrato ? contrato.id : null,
    cliente: clienteNome,
    telefone: clienteTelefone,
    vencimento: formatarData(parcela.vencimento),
    valor: valorPagar,
    valor_formatado: formatarMoeda(valorPagar),
    descricao: parcela.descricao,
    pix_copia_cola: emvPayload,
    pix_qr_url: pixQrUrl
  };

  const webhookUrl = getWebhookCobrancaUrl();

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch(err) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(payload)
      });
    } catch(err2) {}
  }
}

/* ==========================================================================
   NAVIGATION & VIEW SWITCHING
   ========================================================================== */

function switchView(viewName, element) {
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.classList.add('active');

  if (element) {
    element.classList.add('active');
  }

  if (window.innerWidth <= 900) {
    const sidebar = document.querySelector('aside');
    const backdrop = document.querySelector('.sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.remove('active');
  }

  // Refresh views as navigated
  if (viewName === 'dashboard') {
    renderDashboardConsolidado();
  } else if (viewName === 'comercial') {
    renderDashboardComercial();
    renderContratosTable();
  } else if (viewName === 'parcelas') {
    renderTodasParcelas();
  } else if (viewName === 'recebimentos') {
    renderTodosRecebimentos();
  } else if (viewName === 'os') {
    carregarDadosOS();
  } else if (viewName === 'financeiro') {
    renderFinanceiroGeral();
  } else if (viewName === 'clientes') {
    renderClientesModule();
  } else if (viewName === 'detalhe-contrato' && activeContractId) {
    renderContractDetails(activeContractId);
  }
}

function toggleMobileSidebar() {
  const sidebar = document.querySelector('aside');
  const backdrop = document.querySelector('.sidebar-backdrop');
  if (sidebar) sidebar.classList.toggle('mobile-open');
  if (backdrop) backdrop.classList.toggle('active');
}

/* ==========================================================================
   DATA LOADING ENGINE
   ========================================================================== */

async function carregarTodosDados() {
  if (isSupabaseConnected && client) {
    try {
      const [
        { data: clientes },
        { data: contratos },
        { data: parcelas },
        { data: recebimentos },
        { data: timeline },
        { data: ordensServico },
        { data: crmLeads }
      ] = await Promise.all([
        client.from('clientes').select('*'),
        client.from('contratos').select('*'),
        client.from('parcelas').select('*'),
        client.from('recebimentos').select('*'),
        client.from('historico_auditoria').select('*'),
        client.from('ordens_servico').select('*'),
        client.from('crm_leads').select('*')
      ]);

      if (clientes) state.clientesComercial = clientes;
      if (contratos) {
        state.contratos = contratos.map(c => {
          const cli = clientes ? clientes.find(x => x.id === c.cliente_id) : null;
          return {
            ...c,
            cliente: cli ? cli.nome : (c.cliente || c.cliente_nome || 'Cliente'),
            responsavel: c.responsavel_nome || c.responsavel || 'Admin'
          };
        });
      }
      if (parcelas) state.parcelas = parcelas;
      if (recebimentos) state.recebimentos = recebimentos;
      if (timeline) state.timeline = timeline;
      if (ordensServico) state.ordensServico = ordensServico;
      if (crmLeads) state.crmLeads = crmLeads;

      console.log("⚡ 8April ERP: Todos os dados carregados do Supabase com sucesso!");
      renderDashboardConsolidado();
      renderDashboardComercial();
      renderContratosTable();
      renderTodasParcelas();
      renderTodosRecebimentos();
      verificarAutoCobrancasDoDia();
    } catch(e) {
      console.error("Falha ao carregar dados do Supabase", e);
    }
  }
}

async function syncStateComercial() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ==========================================================================
   1. DASHBOARD CONSOLIDADO INICIAL
   ========================================================================== */

function renderDashboardConsolidado() {
  // 1. Contratos Ativos
  const contratosAtivos = state.contratos.filter(c => c.status === 'Ativo' || c.status === 'Em execução').length;
  
  // 2. Receita Recorrente Mensal (MRR)
  // Calculate from active recurring contract parcelas + recurring OS
  let mrrContratos = 0;
  state.parcelas.forEach(p => {
    const desc = (p.descricao || '').toLowerCase();
    if (desc.includes('mensalidade') || desc.includes('recorrência') || desc.includes('suporte')) {
      mrrContratos += parseFloat(p.valor || 0);
    }
  });
  
  let mrrOS = 0;
  state.ordensServico.forEach(os => {
    if (os.recorrente) {
      mrrOS += parseFloat(os.valor || 0);
    }
  });
  const mrrTotal = mrrContratos + mrrOS;

  // 3. Receita Prevista (Sum of pending commercial parcelas + pending OS)
  let receitaPrevistaParcelas = 0;
  state.parcelas.forEach(p => {
    const pago = getParcelaPagoAmount(p.id);
    const resta = Math.max(0, parseFloat(p.valor || 0) - pago);
    if (p.status !== 'Pago') {
      receitaPrevistaParcelas += resta;
    }
  });

  let receitaPrevistaOS = 0;
  state.ordensServico.forEach(os => {
    if (os.status !== 'Finalizada') {
      receitaPrevistaOS += parseFloat(os.valor || 0);
    }
  });

  const receitaPrevistaTotal = receitaPrevistaParcelas + receitaPrevistaOS;

  // 4. Valor Recebido no Mês
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth();

  let recebidoMesComercial = 0;
  state.recebimentos.forEach(r => {
    if (r.data) {
      const d = new Date(r.data.split('T')[0] + 'T00:00:00');
      if (d.getFullYear() === anoAtual && d.getMonth() === mesAtual) {
        recebidoMesComercial += parseFloat(r.valor || 0);
      }
    }
  });

  let recebidoMesOS = 0;
  state.ordensServico.forEach(os => {
    if (os.status === 'Finalizada' && os.data_entrega) {
      const d = new Date(os.data_entrega.split('T')[0] + 'T00:00:00');
      if (d.getFullYear() === anoAtual && d.getMonth() === mesAtual) {
        recebidoMesOS += parseFloat(os.valor || 0);
      }
    }
  });

  const valorRecebidoMes = recebidoMesComercial + recebidoMesOS;

  // 5. Ordens de Serviço Abertas
  const osAbertas = state.ordensServico.filter(os => os.status !== 'Finalizada').length;

  // 6. Ordens Concluídas
  const osConcluidas = state.ordensServico.filter(os => os.status === 'Finalizada').length;

  // 7. Receita de OS (Total value of finalized OS)
  const receitaOS = state.ordensServico
    .filter(os => os.status === 'Finalizada')
    .reduce((sum, os) => sum + parseFloat(os.valor || 0), 0);

  // Update KPI DOM elements
  const elContratosAtivos = document.getElementById('dash-contratos-ativos');
  if (elContratosAtivos) elContratosAtivos.innerText = `${contratosAtivos} / ${state.contratos.length}`;

  const elMRR = document.getElementById('dash-mrr');
  if (elMRR) elMRR.innerText = formatarMoeda(mrrTotal);

  const elReceitaPrevista = document.getElementById('dash-receita-prevista');
  if (elReceitaPrevista) elReceitaPrevista.innerText = formatarMoeda(receitaPrevistaTotal);

  const elValorRecebidoMes = document.getElementById('dash-recebido-mes');
  if (elValorRecebidoMes) elValorRecebidoMes.innerText = formatarMoeda(valorRecebidoMes);

  const elOSAbertas = document.getElementById('dash-os-abertas');
  if (elOSAbertas) elOSAbertas.innerText = osAbertas;

  const elOSConcluidas = document.getElementById('dash-os-concluidas');
  if (elOSConcluidas) elOSConcluidas.innerText = osConcluidas;

  const elReceitaOS = document.getElementById('dash-receita-os');
  if (elReceitaOS) elReceitaOS.innerText = formatarMoeda(receitaOS);

  // 8. Próximas Mensalidades / Vencimentos (Merged upcoming list)
  renderProximasMensalidadesDash();

  // Consolidated Chart
  updateChartConsolidado();
}

function renderProximasMensalidadesDash() {
  const tbody = document.getElementById('dash-tbl-vencimentos');
  if (!tbody) return;

  tbody.innerHTML = '';

  const proximasParcelas = state.parcelas
    .filter(p => p.status === 'Pendente' || p.status === 'Vencido' || p.status === 'Parcial')
    .map(p => {
      const contrato = state.contratos.find(c => String(c.id) === String(p.contrato_id));
      return {
        origem: 'Comercial',
        cliente: contrato ? (contrato.cliente || contrato.cliente_nome) : 'Cliente',
        descricao: p.descricao,
        vencimento: p.vencimento,
        valor: p.valor,
        status: p.status,
        id: p.id
      };
    });

  const proximasOS = state.ordensServico
    .filter(os => os.status !== 'Finalizada')
    .map(os => ({
      origem: 'Ordens de Serviço',
      cliente: os.nome || 'Cliente',
      descricao: os.servico || 'OS',
      vencimento: os.data_entrega,
      valor: os.valor,
      status: os.status || 'Em andamento',
      id: os.id
    }));

  const listaConsolidada = [...proximasParcelas, ...proximasOS]
    .sort((a, b) => new Date(a.vencimento || '2099-12-31') - new Date(b.vencimento || '2099-12-31'))
    .slice(0, 8);

  if (listaConsolidada.length === 0) {
    tbody.innerHTML = '<tr class="empty-state-row"><td colspan="7">Nenhum vencimento pendente registrado.</td></tr>';
    return;
  }

  listaConsolidada.forEach(item => {
    const tr = document.createElement('tr');
    const badgeClass = item.origem === 'Comercial' 
      ? `badge-${(item.status || '').toLowerCase()}`
      : 'badge-os';

    tr.innerHTML = `
      <td><span class="badge ${item.origem === 'Comercial' ? 'badge-ativo' : 'badge-os'}">${item.origem}</span></td>
      <td><strong>${item.cliente}</strong></td>
      <td>${item.descricao}</td>
      <td><span style="font-family: monospace;">${formatarData(item.vencimento)}</span></td>
      <td><strong style="color:var(--text-main);">${formatarMoeda(item.valor)}</strong></td>
      <td><span class="badge ${badgeClass}">${item.status}</span></td>
      <td>
        ${item.origem === 'Comercial' 
          ? `<button class="btn btn-secondary btn-sm" onclick="openGatewayModal('${item.id}')"><i class="fa-solid fa-qrcode"></i> PIX</button>
             <button class="btn btn-secondary btn-sm" style="background:rgba(37, 211, 102, 0.15); color:#25D366; border:1px solid rgba(37, 211, 102, 0.4);" onclick="dispararCobrancaWhatsApp('${item.id}')" title="Enviar Cobrança via WhatsApp"><i class="fa-brands fa-whatsapp"></i> Whats</button>`
          : `<button class="btn btn-secondary btn-sm" onclick="switchView('os'); editarOS('${item.id}');"><i class="fa-solid fa-pen"></i> Ver OS</button>`
        }
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ==========================================================================
   2. MÓDULO COMERCIAL
   ========================================================================== */

function getStatusBadgeClass(status) {
  const st = (status || '').toLowerCase();
  if (st.includes('ativo') || st.includes('execução') || st.includes('execucao')) return 'badge-ativo';
  if (st.includes('negociação') || st.includes('negociacao')) return 'badge-negociacao';
  if (st.includes('aguardando')) return 'badge-aguardando';
  if (st.includes('finalizado') || st.includes('concluido') || st.includes('pago')) return 'badge-finalizado';
  if (st.includes('cancelado')) return 'badge-cancelado';
  return 'badge-ativo';
}

function getContractFinancials(contratoId) {
  const contractParcelas = state.parcelas.filter(p => String(p.contrato_id) === String(contratoId));
  const parcelasIds = contractParcelas.map(p => String(p.id));
  
  const recebimentos = state.recebimentos.filter(r => parcelasIds.includes(String(r.parcela_id)));
  const totalRecebido = recebimentos.reduce((sum, r) => sum + parseFloat(r.valor || 0), 0);

  const valorTotalCalculado = contractParcelas.reduce((sum, p) => sum + parseFloat(p.valor || 0), 0);
  const contrato = state.contratos.find(c => String(c.id) === String(contratoId));
  const valorTotal = valorTotalCalculado > 0 ? valorTotalCalculado : (contrato ? parseFloat(contrato.valor_total || 0) : 0);

  const saldo = Math.max(0, valorTotal - totalRecebido);

  const setupParcelas = contractParcelas.filter(p => {
    const desc = (p.descricao || '').toLowerCase();
    return desc.includes('setup') || desc.includes('implementação') || desc.includes('implementacao') || !desc.includes('mensalidade');
  });

  let pct = 0;
  if (setupParcelas.length > 0) {
    const valorSetupTotal = setupParcelas.reduce((sum, p) => sum + parseFloat(p.valor || 0), 0);
    const setupParcelasIds = setupParcelas.map(p => String(p.id));
    const recebidoSetup = state.recebimentos
      .filter(r => setupParcelasIds.includes(String(r.parcela_id)))
      .reduce((sum, r) => sum + parseFloat(r.valor || 0), 0);

    pct = valorSetupTotal > 0 ? Math.min(100, ((recebidoSetup / valorSetupTotal) * 100)).toFixed(1) : 0;
  } else {
    pct = valorTotal > 0 ? Math.min(100, ((totalRecebido / valorTotal) * 100)).toFixed(1) : 0;
  }

  return { totalRecebido, saldo, pct, valorTotal };
}

function getParcelaPagoAmount(parcelaId) {
  return state.recebimentos
    .filter(r => String(r.parcela_id) === String(parcelaId))
    .reduce((sum, r) => sum + parseFloat(r.valor || 0), 0);
}

function updateParcelaStatusAutomatic(parcelaId) {
  const parcela = state.parcelas.find(p => String(p.id) === String(parcelaId));
  if (!parcela) return;

  const pagoAmount = getParcelaPagoAmount(parcelaId);
  parcela.valor_pago = pagoAmount;

  if (pagoAmount >= parcela.valor) {
    parcela.status = "Pago";
  } else if (pagoAmount > 0) {
    parcela.status = "Parcial";
  }
}

function renderDashboardComercial() {
  let totalContratado = 0;
  let totalRecebidoGlobal = 0;
  let totalVencido = 0;
  let totalAberto = 0;

  state.contratos.forEach(c => {
    const fin = getContractFinancials(c.id);
    totalContratado += fin.valorTotal;
  });

  state.recebimentos.forEach(r => {
    totalRecebidoGlobal += parseFloat(r.valor || 0);
  });

  state.parcelas.forEach(p => {
    const pago = getParcelaPagoAmount(p.id);
    const aPagar = Math.max(0, p.valor - pago);

    if (p.status === 'Vencido') {
      totalVencido += aPagar;
    } else if (p.status === 'Pendente' || p.status === 'Parcial') {
      totalAberto += aPagar;
    }
  });

  const pctGlobal = totalContratado > 0 ? ((totalRecebidoGlobal / totalContratado) * 100).toFixed(1) : 0;
  const ativos = state.contratos.filter(c => c.status === 'Ativo' || c.status === 'Em execução').length;

  const elKpiContratado = document.getElementById('kpi-contratado');
  if (elKpiContratado) elKpiContratado.innerText = formatarMoeda(totalContratado);
  const elKpiRecebido = document.getElementById('kpi-recebido');
  if (elKpiRecebido) elKpiRecebido.innerText = formatarMoeda(totalRecebidoGlobal);
  const elKpiPct = document.getElementById('kpi-pct-recebido');
  if (elKpiPct) elKpiPct.innerText = `${pctGlobal}%`;
  const elKpiAberto = document.getElementById('kpi-aberto');
  if (elKpiAberto) elKpiAberto.innerText = formatarMoeda(totalAberto);
  const elKpiVencido = document.getElementById('kpi-vencido');
  if (elKpiVencido) elKpiVencido.innerText = formatarMoeda(totalVencido);
  const elKpiAtivos = document.getElementById('kpi-qtd-ativos');
  if (elKpiAtivos) elKpiAtivos.innerText = `${ativos} / ${state.contratos.length}`;

  updateChartsComercial();
}

function renderContratosTable() {
  const tbody = document.getElementById('tbl-contratos-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (state.contratos.length === 0) {
    tbody.innerHTML = '<tr class="empty-state-row"><td colspan="8">Nenhum contrato cadastrado ainda. Clique em "+ Criar Contrato" para começar.</td></tr>';
    return;
  }

  state.contratos.forEach(c => {
    const fin = getContractFinancials(c.id);
    const badgeClass = getStatusBadgeClass(c.status);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong style="font-size:0.95rem;">${c.nome}</strong><br>
        <span style="color:var(--primary); font-weight:600; font-size:0.8rem;">${c.cliente || c.cliente_nome || 'Cliente'}</span>
      </td>
      <td><span class="badge badge-ativo">${c.tipo}</span></td>
      <td><strong>${formatarMoeda(fin.valorTotal)}</strong></td>
      <td>
        <div>${fin.pct}% <span style="font-size:0.75rem; color:var(--text-secondary);">(Impl.)</span></div>
        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${fin.pct}%;"></div></div>
      </td>
      <td>${c.responsavel || c.responsavel_nome || 'Admin'}</td>
      <td><span style="font-size:0.78rem; color:var(--text-secondary);">${formatarData(c.data_inicio)} até ${formatarData(c.previsao_termino)}</span></td>
      <td><span class="badge ${badgeClass}">${c.status}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="openContractDetail('${c.id}')"><i class="fa-solid fa-eye"></i> Detalhes</button>
        <button class="btn btn-secondary btn-sm" onclick="openEditarContratoModal('${c.id}')"><i class="fa-solid fa-pen-to-square"></i> Editar</button>
        <button class="btn btn-danger btn-sm" onclick="excluirContratoConfirm('${c.id}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  filterContratos();
}

function filterContratos() {
  const searchInput = document.getElementById('filter-search-contrato');
  const statusInput = document.getElementById('filter-status-contrato');
  const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const status = statusInput ? statusInput.value.toLowerCase().trim() : '';

  const rows = document.querySelectorAll('#tbl-contratos-body tr');
  rows.forEach((row, index) => {
    const contrato = state.contratos[index];
    if (!contrato) return;

    const nomeStr = (contrato.nome || '').toLowerCase();
    const clienteStr = (contrato.cliente || contrato.cliente_nome || '').toLowerCase();
    const respStr = (contrato.responsavel || contrato.responsavel_nome || '').toLowerCase();
    const matchSearch = !search || nomeStr.includes(search) || clienteStr.includes(search) || respStr.includes(search);

    const cStatus = (contrato.status || '').toLowerCase().trim();
    let matchStatus = !status;
    if (status) {
      if (cStatus === status) {
        matchStatus = true;
      } else if (status === 'em execução' && (cStatus === 'ativo' || cStatus === 'em execução')) {
        matchStatus = true;
      } else if (status === 'ativo' && (cStatus === 'ativo' || cStatus === 'em execução')) {
        matchStatus = true;
      }
    }

    if (matchSearch && matchStatus) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
}

function openContractDetail(id) {
  activeContractId = id;
  switchView('detalhe-contrato');
}

function renderContractDetails(id) {
  const contrato = state.contratos.find(c => String(c.id) === String(id));
  if (!contrato) return;

  const fin = getContractFinancials(contrato.id);

  const elNome = document.getElementById('detalhe-nome-contrato');
  if (elNome) elNome.innerText = contrato.nome;
  const elSub = document.getElementById('detalhe-sub-contrato');
  if (elSub) elSub.innerText = `Cliente: ${contrato.cliente || contrato.cliente_nome} • Responsável: ${contrato.responsavel || contrato.responsavel_nome}`;
  const elDesc = document.getElementById('detalhe-desc');
  if (elDesc) elDesc.innerText = contrato.descricao || 'Sem observações';
  const elBadge = document.getElementById('detalhe-badge-status');
  if (elBadge) {
    elBadge.className = `badge ${getStatusBadgeClass(contrato.status)}`;
    elBadge.innerText = contrato.status;
  }

  const elValTotal = document.getElementById('detalhe-val-total');
  if (elValTotal) elValTotal.innerText = formatarMoeda(fin.valorTotal);
  const elValRecebido = document.getElementById('detalhe-val-recebido');
  if (elValRecebido) elValRecebido.innerText = formatarMoeda(fin.totalRecebido);
  const elValSaldo = document.getElementById('detalhe-val-saldo');
  if (elValSaldo) elValSaldo.innerText = formatarMoeda(fin.saldo);
  const elPctTexto = document.getElementById('detalhe-pct-texto');
  if (elPctTexto) elPctTexto.innerText = `${fin.pct}%`;
  const elPctBar = document.getElementById('detalhe-pct-bar');
  if (elPctBar) elPctBar.style.width = `${fin.pct}%`;

  // Render Parcelas tab table
  const tbodyParcelas = document.getElementById('tbl-detalhe-parcelas');
  if (tbodyParcelas) {
    tbodyParcelas.innerHTML = '';
    const contractParcelas = state.parcelas.filter(p => String(p.contrato_id) === String(contrato.id));

    if (contractParcelas.length === 0) {
      tbodyParcelas.innerHTML = '<tr class="empty-state-row"><td colspan="8">Nenhuma parcela ou mensalidade associada a este contrato.</td></tr>';
    } else {
      contractParcelas.forEach(p => {
        updateParcelaStatusAutomatic(p.id);
        const pago = getParcelaPagoAmount(p.id);

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><span style="font-family:monospace;">#${p.id}</span></td>
          <td><strong>${p.descricao}</strong></td>
          <td>${formatarData(p.vencimento)}</td>
          <td>${formatarMoeda(p.valor)}</td>
          <td><span style="color:var(--success); font-weight:600;">${formatarMoeda(pago)}</span></td>
          <td><i class="fa-solid fa-credit-card" style="color:var(--text-secondary); margin-right:4px;"></i> ${p.forma_pagamento || 'Pix'}</td>
          <td><span class="badge badge-${(p.status||'').toLowerCase()}">${p.status}</span></td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="openGatewayModal('${p.id}')"><i class="fa-solid fa-qrcode"></i> Cobrar</button>
            <button class="btn btn-secondary btn-sm" style="background:rgba(37, 211, 102, 0.15); color:#25D366; border:1px solid rgba(37, 211, 102, 0.4);" onclick="dispararCobrancaWhatsApp('${p.id}')" title="Enviar Cobrança via WhatsApp"><i class="fa-brands fa-whatsapp"></i> Whats</button>
            <button class="btn btn-primary btn-sm" style="background:var(--success);" onclick="quickRecebimentoModal('${p.id}')"><i class="fa-solid fa-check"></i> Dar Baixa</button>
          </td>
        `;
        tbodyParcelas.appendChild(tr);
      });
    }
  }

  // Render Recebimentos tab table
  const tbodyRec = document.getElementById('tbl-detalhe-recebimentos');
  if (tbodyRec) {
    tbodyRec.innerHTML = '';
    const contractParcelas = state.parcelas.filter(p => String(p.contrato_id) === String(contrato.id));
    const parcelasIds = contractParcelas.map(p => String(p.id));
    const contractRecebimentos = state.recebimentos.filter(r => parcelasIds.includes(String(r.parcela_id)));

    if (contractRecebimentos.length === 0) {
      tbodyRec.innerHTML = '<tr class="empty-state-row"><td colspan="7">Nenhum recebimento registrado para este contrato ainda.</td></tr>';
    } else {
      contractRecebimentos.forEach(r => {
        const parcela = state.parcelas.find(p => String(p.id) === String(r.parcela_id));
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><span style="font-family:monospace;">REC-${r.id}</span></td>
          <td>${parcela ? parcela.descricao : 'N/A'}</td>
          <td>${formatarData(r.data)}</td>
          <td><strong style="color:var(--success);">${formatarMoeda(r.valor)}</strong></td>
          <td>${r.forma_pagamento}</td>
          <td>${r.usuario || r.usuario_nome || 'Admin'}</td>
          <td><span><i class="fa-solid fa-paperclip"></i> ${r.observacoes || 'Sem anexo'}</span></td>
        `;
        tbodyRec.appendChild(tr);
      });
    }
  }

  // Render Timeline
  const timelineBox = document.getElementById('timeline-events');
  if (timelineBox) {
    timelineBox.innerHTML = '';
    const events = state.timeline.filter(t => String(t.contrato_id) === String(contrato.id));

    if (events.length === 0) {
      timelineBox.innerHTML = '<p style="color:var(--text-secondary); font-size:0.85rem; padding: 1rem 0;">Nenhum evento auditado ainda.</p>';
    } else {
      events.forEach(e => {
        const div = document.createElement('div');
        div.className = 'timeline-item';
        div.innerHTML = `
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-title">${e.titulo || e.acao}</div>
            <div class="timeline-date">${e.data || formatarData(e.created_at)}</div>
            <div style="font-size:0.82rem; color:var(--text-secondary);">${e.desc || e.descricao}</div>
          </div>
        `;
        timelineBox.appendChild(div);
      });
    }
  }
}

async function salvarNovoContrato(e) {
  e.preventDefault();
  const newId = generateUUID();
  const valorSetup = parseFloat(document.getElementById('inp-valor').value) || 0;
  const numParcelasSetup = parseInt(document.getElementById('inp-qtd-parcelas').value) || 1;
  const clienteNome = document.getElementById('inp-cliente').value;

  const temMensalidade = document.getElementById('chk-tem-mensalidade').checked;
  const valorMensalidade = temMensalidade ? parseFloat(document.getElementById('inp-valor-mensalidade').value) || 0 : 0;
  const qtdMensalidades = temMensalidade ? parseInt(document.getElementById('inp-qtd-mensalidades').value) || 12 : 0;

  const totalContratoHibrido = valorSetup + (valorMensalidade * qtdMensalidades);

  let clienteId = generateUUID();

  const inputTel = document.getElementById('inp-telefone');
  const clienteTelefone = inputTel ? inputTel.value.trim().replace(/\D/g, '') : '';

  const newContrato = {
    id: newId,
    tenant_id: DEFAULT_TENANT_ID,
    cliente: clienteNome,
    cliente_nome: clienteNome,
    cliente_id: clienteId,
    telefone: clienteTelefone,
    nome: document.getElementById('inp-nome').value,
    tipo: document.getElementById('inp-tipo').value,
    valor_total: totalContratoHibrido,
    status: document.getElementById('inp-status').value,
    data_inicio: document.getElementById('inp-data-inicio').value,
    previsao_termino: document.getElementById('inp-data-fim').value,
    responsavel: document.getElementById('inp-responsavel').value,
    responsavel_nome: document.getElementById('inp-responsavel').value,
    descricao: document.getElementById('inp-desc').value
  };

  const newParcelas = [];
  const valorParcelaSetup = valorSetup / numParcelasSetup;

  for (let i = 1; i <= numParcelasSetup; i++) {
    const venc = new Date(newContrato.data_inicio || new Date());
    venc.setMonth(venc.getMonth() + (i - 1));

    newParcelas.push({
      id: generateUUID(),
      tenant_id: DEFAULT_TENANT_ID,
      contrato_id: newId,
      numero_parcela: i,
      descricao: `Setup ${i}/${numParcelasSetup} - Implementação`,
      valor: valorParcelaSetup,
      valor_pago: 0,
      vencimento: venc.toISOString().split('T')[0],
      status: "Pendente",
      forma_pagamento: "pix"
    });
  }

  if (temMensalidade && valorMensalidade > 0) {
    const baseDate = new Date(newContrato.previsao_termino || newContrato.data_inicio);
    for (let j = 1; j <= qtdMensalidades; j++) {
      const vencM = new Date(baseDate);
      vencM.setMonth(vencM.getMonth() + j);

      newParcelas.push({
        id: generateUUID(),
        tenant_id: DEFAULT_TENANT_ID,
        contrato_id: newId,
        numero_parcela: numParcelasSetup + j,
        descricao: `Mensalidade ${j}/${qtdMensalidades} - Manutenção/Suporte`,
        valor: valorMensalidade,
        valor_pago: 0,
        vencimento: vencM.toISOString().split('T')[0],
        status: "Pendente",
        forma_pagamento: "pix"
      });
    }
  }

  if (isSupabaseConnected && client) {
    try {
      try {
        await client.from('clientes').insert([{
          id: clienteId,
          tenant_id: DEFAULT_TENANT_ID,
          nome: clienteNome
        }]);
      } catch(eCli) {}

      const payloadContrato = {
        id: newContrato.id,
        tenant_id: newContrato.tenant_id,
        cliente_id: newContrato.cliente_id,
        nome: newContrato.nome,
        descricao: newContrato.descricao,
        tipo: newContrato.tipo,
        valor_total: newContrato.valor_total,
        status: newContrato.status,
        data_inicio: newContrato.data_inicio,
        previsao_termino: newContrato.previsao_termino,
        responsavel_nome: newContrato.responsavel_nome
      };

      const { error: errC } = await client.from('contratos').insert([payloadContrato]);

      if (errC) {
        console.error("Erro no contrato Supabase:", errC);
        mostrarToast("⚠️ Erro no contrato no banco: " + (errC.message || errC.details), "erro");
      } else {
        const { error: errP } = await client.from('parcelas').insert(newParcelas.map(p => ({
          id: p.id,
          tenant_id: p.tenant_id,
          contrato_id: p.contrato_id,
          numero_parcela: p.numero_parcela,
          descricao: p.descricao,
          valor: p.valor,
          valor_pago: p.valor_pago,
          vencimento: p.vencimento,
          status: p.status,
          forma_pagamento: p.forma_pagamento
        })));

        if (errP) console.error("Erro nas parcelas Supabase:", errP);
      }
    } catch(err) {
      console.error("Erro comunicação Supabase", err);
    }
  }

  state.contratos.push(newContrato);
  state.parcelas.push(...newParcelas);

  state.timeline.push({
    contrato_id: newId,
    data: new Date().toLocaleString('pt-BR'),
    titulo: "Contrato Criado",
    desc: `Setup: ${formatarMoeda(valorSetup)} (${numParcelasSetup}x) | Recorrência: ${qtdMensalidades}x de ${formatarMoeda(valorMensalidade)}.`
  });

  syncStateComercial();
  closeModal('modal-novo-contrato');
  renderDashboardConsolidado();
  renderDashboardComercial();
  renderContratosTable();
  populateRecebimentoModalDropdown();
  mostrarToast("✅ Contrato e cronograma gerados com sucesso!");
}

async function excluirContratoConfirm(contratoId) {
  const contrato = state.contratos.find(c => String(c.id) === String(contratoId));
  if (!contrato) return;

  if (!confirm(`⚠️ ATENÇÃO: Tem certeza que deseja excluir o contrato '${contrato.nome}'?\n\nTodas as parcelas e recebimentos vinculados serão apagados!`)) {
    return;
  }

  if (isSupabaseConnected && client) {
    try {
      await client.from('contratos').delete().eq('id', contratoId);
    } catch(err) {
      console.error("Erro Delete Supabase", err);
    }
  }

  const parcelasRemovidas = state.parcelas.filter(p => String(p.contrato_id) === String(contratoId));
  const parcelasIds = parcelasRemovidas.map(p => String(p.id));

  state.contratos = state.contratos.filter(c => String(c.id) !== String(contratoId));
  state.parcelas = state.parcelas.filter(p => String(p.contrato_id) !== String(contratoId));
  state.recebimentos = state.recebimentos.filter(r => !parcelasIds.includes(String(r.parcela_id)));
  state.timeline = state.timeline.filter(t => String(t.contrato_id) !== String(contratoId));

  syncStateComercial();
  switchView('comercial');
  renderDashboardConsolidado();
  renderDashboardComercial();
  renderContratosTable();
  populateRecebimentoModalDropdown();
  mostrarToast("🗑️ Contrato excluído");
}

function openEditarContratoModal(contratoId) {
  const contrato = state.contratos.find(c => String(c.id) === String(contratoId));
  if (!contrato) return;

  const setupParcelas = state.parcelas.filter(p => {
    const desc = (p.descricao || '').toLowerCase();
    return String(p.contrato_id) === String(contratoId) && (desc.includes('setup') || desc.includes('implementação') || !desc.includes('mensalidade'));
  });

  const valorSetupAtual = setupParcelas.reduce((sum, p) => sum + parseFloat(p.valor || 0), 0);

  document.getElementById('edit-contrato-id').value = contrato.id;
  document.getElementById('edit-cliente').value = contrato.cliente || contrato.cliente_nome || '';
  const inputEditTel = document.getElementById('edit-telefone');
  if (inputEditTel) inputEditTel.value = contrato.telefone || contrato.whatsapp || '';
  document.getElementById('edit-nome').value = contrato.nome || '';
  document.getElementById('edit-tipo').value = contrato.tipo || 'parcelado';
  document.getElementById('edit-valor-setup').value = valorSetupAtual > 0 ? valorSetupAtual : (contrato.valor_total || 0);
  document.getElementById('edit-inp-qtd-parcelas').value = setupParcelas.length > 0 ? setupParcelas.length : 2;
  document.getElementById('edit-data-inicio').value = contrato.data_inicio ? contrato.data_inicio.split('T')[0] : '';
  document.getElementById('edit-data-fim').value = contrato.previsao_termino ? contrato.previsao_termino.split('T')[0] : '';
  document.getElementById('edit-responsavel').value = contrato.responsavel || contrato.responsavel_nome || '';
  document.getElementById('edit-status').value = contrato.status || 'Ativo';
  document.getElementById('edit-desc').value = contrato.descricao || '';

  document.getElementById('edit-chk-regerar-setup').checked = true;
  document.getElementById('edit-chk-tem-mensalidade').checked = false;
  document.getElementById('edit-box-fields-mensalidade').style.display = 'none';

  openModal('modal-editar-contrato');
}

async function salvarEdicaoContrato(e) {
  e.preventDefault();
  const contratoId = document.getElementById('edit-contrato-id').value;
  const contrato = state.contratos.find(c => String(c.id) === String(contratoId));
  if (!contrato) return;

  const clienteNome = document.getElementById('edit-cliente').value;
  const nome = document.getElementById('edit-nome').value;
  const tipo = document.getElementById('edit-tipo').value;
  const valorSetupNovo = parseFloat(document.getElementById('edit-valor-setup').value) || 0;
  const qtdParcelasSetupNova = parseInt(document.getElementById('edit-inp-qtd-parcelas').value) || 1;
  const dataInicio = document.getElementById('edit-data-inicio').value;
  const previsaoTermino = document.getElementById('edit-data-fim').value;
  const responsavel = document.getElementById('edit-responsavel').value;
  const status = document.getElementById('edit-status').value;
  const descricao = document.getElementById('edit-desc').value;
  const regerarSetup = document.getElementById('edit-chk-regerar-setup').checked;

  const addMensalidade = document.getElementById('edit-chk-tem-mensalidade').checked;
  const valMensalidade = addMensalidade ? parseFloat(document.getElementById('edit-inp-valor-mensalidade').value) || 0 : 0;
  const qtdMensalidades = addMensalidade ? parseInt(document.getElementById('edit-inp-qtd-mensalidades').value) || 12 : 0;

  const existingParcelas = state.parcelas.filter(p => String(p.contrato_id) === String(contratoId));
  const oldSetupParcelas = existingParcelas.filter(p => {
    const desc = (p.descricao || '').toLowerCase();
    return desc.includes('setup') || desc.includes('implementação') || !desc.includes('mensalidade');
  });

  const novasSetupParcelas = [];
  if (regerarSetup && valorSetupNovo > 0 && qtdParcelasSetupNova > 0) {
    const valorCadaSetup = valorSetupNovo / qtdParcelasSetupNova;

    for (let i = 1; i <= qtdParcelasSetupNova; i++) {
      const venc = new Date(dataInicio || new Date());
      venc.setMonth(venc.getMonth() + (i - 1));

      novasSetupParcelas.push({
        id: generateUUID(),
        tenant_id: DEFAULT_TENANT_ID,
        contrato_id: contratoId,
        numero_parcela: i,
        descricao: `Setup ${i}/${qtdParcelasSetupNova} - Implementação`,
        valor: valorCadaSetup,
        valor_pago: 0,
        vencimento: venc.toISOString().split('T')[0],
        status: "Pendente",
        forma_pagamento: "pix"
      });
    }
  }

  const novasMensalidadesEdit = [];
  if (addMensalidade && valMensalidade > 0 && qtdMensalidades > 0) {
    const lastCount = (regerarSetup ? novasSetupParcelas.length : oldSetupParcelas.length);
    const baseDate = new Date(previsaoTermino || dataInicio);

    for (let j = 1; j <= qtdMensalidades; j++) {
      const vencM = new Date(baseDate);
      vencM.setMonth(vencM.getMonth() + j);

      novasMensalidadesEdit.push({
        id: generateUUID(),
        tenant_id: DEFAULT_TENANT_ID,
        contrato_id: contratoId,
        numero_parcela: lastCount + j,
        descricao: `Mensalidade ${j}/${qtdMensalidades} - Manutenção/Suporte`,
        valor: valMensalidade,
        valor_pago: 0,
        vencimento: vencM.toISOString().split('T')[0],
        status: "Pendente",
        forma_pagamento: "pix"
      });
    }
  }

  const novoValorTotalContrato = (regerarSetup ? valorSetupNovo : oldSetupParcelas.reduce((sum, p) => sum + parseFloat(p.valor || 0), 0)) + (valMensalidade * qtdMensalidades);

  const inputEditTel = document.getElementById('edit-telefone');
  const clienteTelefoneEdit = inputEditTel ? inputEditTel.value.trim().replace(/\D/g, '') : '';

  if (isSupabaseConnected && client) {
    try {
      await client.from('contratos').update({
        nome: nome,
        tipo: tipo,
        valor_total: novoValorTotalContrato,
        data_inicio: dataInicio,
        previsao_termino: previsaoTermino,
        responsavel_nome: responsavel,
        status: status,
        descricao: descricao
      }).eq('id', contratoId);

      if (regerarSetup && oldSetupParcelas.length > 0) {
        const idsToDelete = oldSetupParcelas.map(p => p.id);
        await client.from('parcelas').delete().in('id', idsToDelete);
      }

      if (novasSetupParcelas.length > 0) {
        await client.from('parcelas').insert(novasSetupParcelas);
      }
      if (novasMensalidadesEdit.length > 0) {
        await client.from('parcelas').insert(novasMensalidadesEdit);
      }
    } catch(err) {
      console.error("Erro ao sincronizar edição com Supabase", err);
    }
  }

  contrato.cliente = clienteNome;
  contrato.cliente_nome = clienteNome;
  contrato.telefone = clienteTelefoneEdit;
  contrato.nome = nome;
  contrato.tipo = tipo;
  contrato.valor_total = novoValorTotalContrato;
  contrato.data_inicio = dataInicio;
  contrato.previsao_termino = previsaoTermino;
  contrato.responsavel = responsavel;
  contrato.responsavel_nome = responsavel;
  contrato.status = status;
  contrato.descricao = descricao;

  if (regerarSetup) {
    state.parcelas = state.parcelas.filter(p => !(String(p.contrato_id) === String(contratoId) && oldSetupParcelas.some(oldP => String(oldP.id) === String(p.id))));
    state.parcelas.push(...novasSetupParcelas);
  }
  if (novasMensalidadesEdit.length > 0) {
    state.parcelas.push(...novasMensalidadesEdit);
  }

  syncStateComercial();
  closeModal('modal-editar-contrato');
  renderDashboardConsolidado();
  renderDashboardComercial();
  renderContratosTable();
  mostrarToast("✏️ Contrato e parcelas recalculadas");
}

function populateRecebimentoModalDropdown() {
  const select = document.getElementById('inp-rec-parcela');
  if (!select) return;
  select.innerHTML = '';

  const parcelasEmAberto = state.parcelas.filter(p => {
    const pago = getParcelaPagoAmount(p.id);
    return (p.valor - pago) > 0;
  });

  if (parcelasEmAberto.length === 0) {
    const opt = document.createElement('option');
    opt.value = "";
    opt.innerText = "Nenhuma parcela pendente";
    select.appendChild(opt);
    return;
  }

  parcelasEmAberto.forEach(p => {
    const contrato = state.contratos.find(c => String(c.id) === String(p.contrato_id));
    const pago = getParcelaPagoAmount(p.id);
    const resta = p.valor - pago;

    const opt = document.createElement('option');
    opt.value = p.id;
    opt.innerText = `${contrato ? (contrato.cliente || contrato.cliente_nome) : ''} - ${p.descricao} (Restante: ${formatarMoeda(resta)})`;
    select.appendChild(opt);
  });
}

function quickRecebimentoModal(parcelaId) {
  populateRecebimentoModalDropdown();
  document.getElementById('inp-rec-parcela').value = parcelaId;

  const p = state.parcelas.find(par => String(par.id) === String(parcelaId));
  if (p) {
    const resta = p.valor - getParcelaPagoAmount(p.id);
    document.getElementById('inp-rec-valor').value = resta;
  }
  openModal('modal-novo-recebimento');
}

async function salvarRecebimento(e) {
  e.preventDefault();
  const parcelaId = document.getElementById('inp-rec-parcela').value;
  if (!parcelaId) return;

  const valor = parseFloat(document.getElementById('inp-rec-valor').value);
  const data = document.getElementById('inp-rec-data').value;
  const forma = document.getElementById('inp-rec-forma').value;
  const usuario = document.getElementById('inp-rec-usuario').value;
  const obs = document.getElementById('inp-rec-obs').value;

  const newRec = {
    id: generateUUID(),
    tenant_id: DEFAULT_TENANT_ID,
    parcela_id: parcelaId,
    valor: valor,
    data: data,
    forma_pagamento: forma,
    usuario_nome: usuario,
    observacoes: obs
  };

  if (isSupabaseConnected && client) {
    try {
      await client.from('recebimentos').insert([{
        id: newRec.id,
        tenant_id: newRec.tenant_id,
        parcela_id: newRec.parcela_id,
        valor: newRec.valor,
        data: newRec.data,
        forma_pagamento: newRec.forma_pagamento,
        observacoes: newRec.observacoes,
        usuario_nome: newRec.usuario_nome
      }]);
    } catch(err) {
      console.error("Erro recebimento Supabase", err);
    }
  }

  state.recebimentos.push(newRec);
  updateParcelaStatusAutomatic(parcelaId);

  syncStateComercial();
  closeModal('modal-novo-recebimento');
  renderDashboardConsolidado();
  renderDashboardComercial();
  renderContratosTable();
  renderTodasParcelas();
  renderTodosRecebimentos();
  if (activeContractId) renderContractDetails(activeContractId);
  mostrarToast("💵 Recebimento baixado com sucesso!");
}

function openAdicionarParcelaModal() {
  if (!activeContractId) return;
  const today = new Date().toISOString().split('T')[0];
  const inputVenc = document.getElementById('add-parc-venc');
  if (inputVenc) inputVenc.value = today;
  openModal('modal-add-parcela');
}

async function salvarAdicaoParcela(e) {
  e.preventDefault();
  if (!activeContractId) return;

  const desc = document.getElementById('add-parc-desc').value;
  const valor = parseFloat(document.getElementById('add-parc-valor').value);
  const venc = document.getElementById('add-parc-venc').value;
  const forma = document.getElementById('add-parc-forma').value;

  const existingParcelas = state.parcelas.filter(p => String(p.contrato_id) === String(activeContractId));

  const newParcela = {
    id: generateUUID(),
    tenant_id: DEFAULT_TENANT_ID,
    contrato_id: activeContractId,
    numero_parcela: existingParcelas.length + 1,
    descricao: desc,
    valor: valor,
    valor_pago: 0,
    vencimento: venc,
    status: "Pendente",
    forma_pagamento: forma
  };

  if (isSupabaseConnected && client) {
    try {
      const { error: errP } = await client.from('parcelas').insert([{
        id: newParcela.id,
        tenant_id: newParcela.tenant_id,
        contrato_id: newParcela.contrato_id,
        numero_parcela: newParcela.numero_parcela,
        descricao: newParcela.descricao,
        valor: newParcela.valor,
        valor_pago: newParcela.valor_pago,
        vencimento: newParcela.vencimento,
        status: newParcela.status,
        forma_pagamento: newParcela.forma_pagamento
      }]);

      if (errP) console.error("Erro Adicionar Parcela:", errP);
    } catch(err) {
      console.error("Erro comunicação Supabase", err);
    }
  }

  state.parcelas.push(newParcela);

  state.timeline.push({
    contrato_id: activeContractId,
    data: new Date().toLocaleString('pt-BR'),
    titulo: "Nova Parcela / Mensalidade Adicionada",
    desc: `Adicionado: ${desc} no valor de ${formatarMoeda(valor)} com vencimento em ${formatarData(venc)}.`
  });

  syncStateComercial();
  closeModal('modal-add-parcela');
  renderDashboardConsolidado();
  renderDashboardComercial();
  renderContratosTable();
  renderTodasParcelas();
  if (activeContractId) renderContractDetails(activeContractId);
  populateRecebimentoModalDropdown();
  mostrarToast('Parcela/Mensalidade adicionada ao cronograma!');
}

function renderTodasParcelas() {
  const tbody = document.getElementById('tbl-todas-parcelas');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (state.parcelas.length === 0) {
    tbody.innerHTML = '<tr class="empty-state-row"><td colspan="7">Nenhuma parcela cadastrada no sistema.</td></tr>';
    return;
  }

  state.parcelas.forEach(p => {
    const contrato = state.contratos.find(c => String(c.id) === String(p.contrato_id));
    const pago = getParcelaPagoAmount(p.id);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${contrato ? (contrato.cliente || contrato.cliente_nome) : 'N/A'}</strong></td>
      <td>${p.descricao}</td>
      <td>${formatarData(p.vencimento)}</td>
      <td>${formatarMoeda(p.valor)}</td>
      <td><span style="color:var(--success); font-weight:600;">${formatarMoeda(pago)}</span></td>
      <td><span class="badge badge-${(p.status||'').toLowerCase()}">${p.status}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="openGatewayModal('${p.id}')"><i class="fa-solid fa-qrcode"></i> Cobrar PIX</button>
        <button class="btn btn-secondary btn-sm" style="background:rgba(37, 211, 102, 0.15); color:#25D366; border:1px solid rgba(37, 211, 102, 0.4);" onclick="dispararCobrancaWhatsApp('${p.id}')" title="Enviar Cobrança via WhatsApp"><i class="fa-brands fa-whatsapp"></i> Whats</button>
        <button class="btn btn-primary btn-sm" style="background:var(--success);" onclick="quickRecebimentoModal('${p.id}')"><i class="fa-solid fa-check"></i> Dar Baixa</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderTodosRecebimentos() {
  const tbody = document.getElementById('tbl-todos-recebimentos');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (state.recebimentos.length === 0) {
    tbody.innerHTML = '<tr class="empty-state-row"><td colspan="7">Nenhum recebimento registrado no sistema.</td></tr>';
    return;
  }

  state.recebimentos.forEach(r => {
    const parcela = state.parcelas.find(p => String(p.id) === String(r.parcela_id));
    const contrato = parcela ? state.contratos.find(c => String(c.id) === String(parcela.contrato_id)) : null;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatarData(r.data)}</td>
      <td><strong>${contrato ? (contrato.cliente || contrato.cliente_nome) : 'N/A'}</strong></td>
      <td>${parcela ? parcela.descricao : 'N/A'}</td>
      <td><strong style="color:var(--success);">${formatarMoeda(r.valor)}</strong></td>
      <td>${r.forma_pagamento}</td>
      <td>${r.usuario || r.usuario_nome || 'Admin'}</td>
      <td>${r.observacoes || '-'}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ==========================================================================
   PIX BR CODE GENERATOR (CRC16)
   ========================================================================== */

function calculateCRC16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function generatePixPayload(chavePix, nomeRecebedor, cidadeRecebedor, valor, txId = '***') {
  const chave = chavePix.replace(/\D/g, '');
  const gui = "0014BR.GOV.BCB.PIX";
  const keyTag = "01" + String(chave.length).padStart(2, '0') + chave;
  const tag26Value = gui + keyTag;
  const tag26 = "26" + String(tag26Value.length).padStart(2, '0') + tag26Value;

  const tag00 = "000201";
  const tag52 = "52040000";
  const tag53 = "5303986";
  
  let tag54 = "";
  if (valor && parseFloat(valor) > 0) {
    const valorStr = parseFloat(valor).toFixed(2);
    tag54 = "54" + String(valorStr.length).padStart(2, '0') + valorStr;
  }

  const tag58 = "5802BR";
  const nomeClean = (nomeRecebedor || "8APRIL TECH").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().substring(0, 25);
  const tag59 = "59" + String(nomeClean.length).padStart(2, '0') + nomeClean;

  const cidadeClean = (cidadeRecebedor || "SAO PAULO").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().substring(0, 15);
  const tag60 = "60" + String(cidadeClean.length).padStart(2, '0') + cidadeClean;

  const txIdClean = (txId || "***").replace(/[^a-zA-Z0-9]/g, "").substring(0, 25) || "***";
  const tag62Value = "05" + String(txIdClean.length).padStart(2, '0') + txIdClean;
  const tag62 = "62" + String(tag62Value.length).padStart(2, '0') + tag62Value;

  const payloadWithoutCRC = tag00 + tag26 + tag52 + tag53 + tag54 + tag58 + tag59 + tag60 + tag62 + "6304";
  const crc = calculateCRC16(payloadWithoutCRC);

  return payloadWithoutCRC + crc;
}

function openGatewayModal(parcelaId) {
  const parcela = state.parcelas.find(p => String(p.id) === String(parcelaId));
  const descEl = document.getElementById('gateway-pay-desc');
  const keyInput = document.getElementById('gateway-pay-key');
  const qrImg = document.getElementById('gateway-pay-qr');
  
  let valorPagar = 0;
  let txId = '8A' + (parcelaId ? String(parcelaId).replace(/\D/g, '').substring(0, 10) : 'PROD');

  if (parcela && descEl) {
    const contrato = state.contratos.find(c => String(c.id) === String(parcela.contrato_id));
    const pago = getParcelaPagoAmount(parcela.id);
    valorPagar = Math.max(0, parcela.valor - pago);
    descEl.innerHTML = `<strong>${contrato ? (contrato.cliente || contrato.cliente_nome) : 'Cliente'}</strong> • ${parcela.descricao}<br><span style="color:var(--success); font-weight:700;">Valor a Pagar: ${formatarMoeda(valorPagar)}</span>`;
  } else if (descEl) {
    descEl.innerHTML = `Chave PIX Oficial 8April Tech (CNPJ)`;
  }

  const emvPayload = generatePixPayload("46005353000185", "8APRIL TECH", "SAO PAULO", valorPagar, txId);
  if (keyInput) keyInput.value = emvPayload;
  if (qrImg) qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(emvPayload)}`;

  openModal('modal-gateway-pay');
}

function copiarPixPayload() {
  const keyInput = document.getElementById('gateway-pay-key');
  if (keyInput && keyInput.value) {
    navigator.clipboard.writeText(keyInput.value);
    mostrarToast("✅ Código 'Pix Copia e Cola' copiado!");
  }
}

function copiarChavePixApenas() {
  navigator.clipboard.writeText('46005353000185');
  mostrarToast("✅ Chave CNPJ (46005353000185) copiada!");
}

/* ==========================================================================
   3. MÓDULO ORDENS DE SERVIÇO
   ========================================================================== */

async function carregarDadosOS() {
  if (!client) return;

  const inicioRange = (osPaginaAtual - 1) * osLimite;
  const fimRange = inicioRange + osLimite - 1;
  let query = client
    .from("ordens_servico")
    .select("*")
    .order(osColunaAtual, { ascending: osOrdemAsc })
    .range(inicioRange, fimRange);

  const busca = (document.getElementById("buscaOS")?.value || "").trim().toLowerCase();
  if (busca) {
    query = query.or(`nome.ilike.%${busca}%,servico.ilike.%${busca}%,cidade.ilike.%${busca}%,estado.ilike.%${busca}%`);
  }
  const status = document.getElementById("filtroStatusOS")?.value;
  const inicio = document.getElementById("dataInicioOS")?.value;
  const fim = document.getElementById("dataFimOS")?.value;

  if (status) query = query.eq("status", status);
  if (inicio) query = query.gte("data_entrega", inicio);
  if (fim) query = query.lte("data_entrega", fim);

  const { data } = await query;
  state.ordensServico = data || [];

  const tabela = document.getElementById("tabelaOS");
  const cards = document.getElementById("cardsOS");

  if (tabela) tabela.innerHTML = "";
  if (cards) cards.innerHTML = "";

  (data || [])
    .filter(item =>
      !busca ||
      item.nome?.toLowerCase().includes(busca) ||
      item.servico?.toLowerCase().includes(busca) ||
      item.cidade?.toLowerCase().includes(busca) ||
      item.estado?.toLowerCase().includes(busca)
    )
    .forEach(item => {
      const st = item.status || "Em andamento";
      const hoje = new Date();
      const dataEntrega = item.data_entrega ? new Date(item.data_entrega) : null;
      const atrasado = dataEntrega && dataEntrega < hoje && st !== "Finalizada";

      if (tabela) {
        tabela.innerHTML += `
          <tr style="${atrasado ? 'background:rgba(127, 29, 29, 0.4);' : ''}">
            <td><strong>${item.nome || '-'}</strong></td>
            <td>${item.servico || '-'}</td>
            <td>${item.cidade || '-'}</td>
            <td>${item.estado || '-'}</td>
            <td><strong>${formatarMoeda(item.valor)}</strong></td>
            <td>${formatarData(item.data_entrega)}</td>
            <td title="${item.obs || ''}">
              ${item.obs ? item.obs.substring(0, 40) + (item.obs.length > 40 ? '...' : '') : '-'}
            </td>
            <td>
              <select onchange="atualizarStatusOS('${item.id}', this.value)" style="padding:6px;">
                <option ${st === "Em andamento" ? "selected" : ""}>Em andamento</option>
                <option ${st === "Finalizada" ? "selected" : ""}>Finalizada</option>
              </select>
            </td>
            <td style="white-space:nowrap; width:120px;">
              <div style="display:flex; gap:6px; align-items:center; flex-wrap:nowrap;">
                <button class="btn btn-secondary btn-sm" onclick="editarOS('${item.id}')" title="Editar OS">✏️</button>
                ${st === "Finalizada" ? `<button class="btn btn-secondary btn-sm" onclick="enviarOS('${item.id}')" title="Enviar Webhook OS">📄</button>` : ""}
                <button class="btn btn-danger btn-sm" onclick="excluirOS('${item.id}')" title="Excluir OS">🗑️</button>
              </div>
            </td>
          </tr>
        `;
      }

      if (cards) {
        cards.innerHTML += `
          <div class="card-os">
            <div class="topo">
              <div class="nome">${item.nome}</div>
              <div class="valor">${formatarMoeda(item.valor)}</div>
            </div>
            <div class="info">🔧 ${item.servico || '-'}</div>
            ${(item.cidade || item.estado) ? `<div class="info">📍 ${item.cidade || '-'}${item.estado ? ' / ' + item.estado : ''}</div>` : ''}
            ${item.obs ? `<div class="info">📝 ${item.obs}</div>` : ''}
            <div class="info">📅 ${formatarData(item.data_entrega)}</div>
            <div class="status ${item.status === "Finalizada" ? "pago" : "pendente"}">
              ${item.status || "Em andamento"}
            </div>
            <div style="margin-top:10px; display:flex; gap:8px;">
              <button class="btn btn-secondary btn-sm" onclick="editarOS('${item.id}')">✏️ Editar</button>
              ${item.status === "Finalizada" ? `<button class="btn btn-secondary btn-sm" onclick="enviarOS('${item.id}')">📄 Webhook</button>` : ""}
              <button class="btn btn-danger btn-sm" onclick="excluirOS('${item.id}')">🗑️ Excluir</button>
            </div>
          </div>
        `;
      }
    });

  const infoPagina = document.getElementById("infoPaginaOS");
  if (infoPagina) infoPagina.innerText = `Página ${osPaginaAtual}`;

  carregarTotaisOS();
  gerarGraficoOS(data || []);
}

async function carregarClientesAutocompleteOS() {
  if (!client) return;
  const { data, error } = await client
    .from("crm_leads")
    .select("nome")
    .order("nome", { ascending: true });

  if (error) return;

  const lista = document.getElementById("clientesListOS");
  if (!lista) return;

  const nomesUnicos = [...new Set(data.map(c => c.nome?.trim()).filter(Boolean))];
  lista.innerHTML = nomesUnicos.map(nome => `<option value="${nome}">`).join("");
}

function ordenarOS(coluna) {
  if (osColunaAtual === coluna) osOrdemAsc = !osOrdemAsc;
  else {
    osColunaAtual = coluna;
    osOrdemAsc = true;
  }
  carregarDadosOS();
}

// OS Form Submission Listener
document.addEventListener('submit', async e => {
  if (e.target && e.target.id === 'formOS') {
    e.preventDefault();
    const erro = document.getElementById("erroFormOS");
    const nome = document.getElementById("os_nome");
    const servico = document.getElementById("os_servico");
    const cidade = document.getElementById("os_cidade");
    const estado = document.getElementById("os_estado");
    const valor = document.getElementById("os_valor");
    const data_entrega = document.getElementById("os_data_entrega");
    const status = document.getElementById("os_status");
    const obs = document.getElementById("os_obs");
    const recorrente = document.getElementById("os_recorrente");
    const periodicidade = document.getElementById("os_periodicidade");
    const qtdRecorrencias = document.getElementById("os_qtdRecorrencias");

    if (!nome.value || !servico.value || !valor.value || !data_entrega.value) {
      if (erro) {
        erro.innerText = "⚠️ Preencha todos os campos obrigatórios.";
        erro.style.display = "block";
      }
      mostrarToast("⚠️ Preencha todos os campos", "erro");
      return;
    } else {
      if (erro) erro.style.display = "none";
    }

    const nomeCliente = nome.value.trim();
    let leadId = null;

    const { data: leadExistente } = await client
      .from("crm_leads")
      .select("id")
      .ilike("nome", nomeCliente)
      .limit(1)
      .maybeSingle();

    if (!leadExistente) {
      const { data: novoLead, error: erroLead } = await client
        .from("crm_leads")
        .insert([{
          nome: nomeCliente,
          telefone: `SEM_FONE_${Date.now()}`,
          status: "fechado",
          observacao: "Cliente criado automaticamente via módulo de OS."
        }])
        .select("id")
        .single();

      if (!erroLead && novoLead) {
        leadId = novoLead.id;
      }
    } else {
      leadId = leadExistente.id;
    }

    const payload = {
      nome: nomeCliente,
      servico: servico.value,
      cidade: cidade.value.trim(),
      estado: estado.value.trim(),
      valor: valor.value,
      status: status.value,
      data_entrega: data_entrega.value,
      obs: obs.value,
      lead_id: leadId
    };

    try {
      if (osEditandoId) {
        const { error } = await client
          .from("ordens_servico")
          .update(payload)
          .eq("id", osEditandoId);

        if (error) throw error;
        mostrarToast("✏️ OS atualizada com sucesso!");
        osEditandoId = null;
        document.getElementById("tituloModalOS").innerText = "➕ Nova Ordem de Serviço";
      } else {
        const grupo = crypto.randomUUID();
        const recorrenteAtivo = recorrente.checked;

        if (!recorrenteAtivo) {
          const { error } = await client.from("ordens_servico").insert([payload]);
          if (error) throw error;
        } else {
          const lista = [];
          for (let i = 0; i < Number(qtdRecorrencias.value); i++) {
            const data = new Date(data_entrega.value);
            switch (periodicidade.value) {
              case "mensal": data.setMonth(data.getMonth() + i); break;
              case "semanal": data.setDate(data.getDate() + 7 * i); break;
              case "quinzenal": data.setDate(data.getDate() + 15 * i); break;
              case "anual": data.setFullYear(data.getFullYear() + i); break;
            }

            lista.push({
              ...payload,
              recorrente: true,
              grupo_recorrencia: grupo,
              periodicidade: periodicidade.value,
              qtd_recorrencias: Number(qtdRecorrencias.value),
              data_entrega: data.toISOString().split("T")[0]
            });
          }
          const { error } = await client.from("ordens_servico").insert(lista);
          if (error) throw error;
        }

        if (leadId) {
          await client.from("crm_leads").update({ status: "em_andamento" }).eq("id", leadId);
        }

        mostrarToast("✅ OS criada com sucesso!");
      }

      e.target.reset();
      carregarDadosOS();
      renderDashboardConsolidado();
      fecharModalOS();
    } catch (err) {
      console.error("ERRO REAL OS:", err);
      mostrarToast("❌ Erro ao salvar OS", "erro");
    }
  }
});

async function editarOS(id) {
  const { data, error } = await client
    .from("ordens_servico")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    mostrarToast("❌ Erro ao carregar OS", "erro");
    return;
  }

  document.getElementById("os_nome").value = data.nome || "";
  document.getElementById("os_servico").value = data.servico || "";
  document.getElementById("os_cidade").value = data.cidade || "";
  document.getElementById("os_estado").value = data.estado || "";
  document.getElementById("os_valor").value = data.valor || "";
  document.getElementById("os_status").value = data.status || "Em andamento";
  document.getElementById("os_data_entrega").value = data.data_entrega || "";
  document.getElementById("os_obs").value = data.obs || "";

  osEditandoId = id;
  document.getElementById("tituloModalOS").innerText = "✏️ Editando Ordem de Serviço";
  abrirModalOS();
}

async function excluirOS(id) {
  if (!confirm("Tem certeza que deseja excluir esta OS?")) return;
  await client.from("ordens_servico").delete().eq("id", id);
  mostrarToast("🗑️ OS excluída com sucesso");
  carregarDadosOS();
  renderDashboardConsolidado();
}

async function atualizarStatusOS(id, s) {
  const { error } = await client
    .from("ordens_servico")
    .update({ status: s })
    .eq("id", id);

  if (error) {
    console.error("Erro ao atualizar status OS:", error);
    return;
  }

  if (s === "Finalizada") {
    const { data: os, error: erroOS } = await client
      .from("ordens_servico")
      .select("*")
      .eq("id", id)
      .single();

    if (!erroOS && os && !os.financeiro_lancado) {
      const sucesso = await lancarReceitaOS(os);
      if (sucesso) {
        await client.from("ordens_servico").update({ financeiro_lancado: true }).eq("id", id);
      }
    }
  }

  carregarDadosOS();
  renderDashboardConsolidado();
}

async function lancarReceitaOS(os) {
  try {
    let { data: usuario } = await client.from("usuarios").select("id").eq("nome", "Rudge").maybeSingle();
    if (!usuario) {
      const { data: qUser } = await client.from("usuarios").select("id").limit(1).maybeSingle();
      usuario = qUser;
    }

    let { data: categoria } = await client.from("categorias").select("id").eq("nome", "8April").maybeSingle();
    if (!categoria) {
      const { data: qCat } = await client.from("categorias").select("id").limit(1).maybeSingle();
      categoria = qCat;
    }

    if (!usuario || !categoria) {
      console.log("Usuário ou Categoria não encontrados para movimentação.");
      return false;
    }

    const competencia = os.data_entrega ? os.data_entrega.substring(0, 7) + "-01" : new Date().toISOString().substring(0, 7) + "-01";
    const descricao = `${os.nome} - ${os.servico}`;

    const { error } = await client.from("movimentacoes").insert({
      usuario_id: usuario.id,
      categoria_id: categoria.id,
      descricao: descricao,
      observacao: descricao,
      valor: os.valor,
      data: os.data_entrega,
      competencia: competencia,
      pago: true,
      os_id: os.id
    });

    if (error) {
      console.error("ERRO INSERT MOVIMENTAÇÕES:", error);
      return false;
    }

    console.log("Receita lançada no financeiro!");
    return true;
  } catch(e) {
    console.error("Erro ao lancar receita OS", e);
    return false;
  }
}

async function enviarOS(id) {
  mostrarToast("📄 Gerando OS...");
  const { data, error } = await client.from("ordens_servico").select("*").eq("id", id).single();

  if (error || !data) {
    mostrarToast("❌ Erro ao buscar OS", "erro");
    return;
  }

  let telefone = "";
  if (data.lead_id) {
    const { data: lead } = await client.from("crm_leads").select("telefone").eq("id", data.lead_id).single();
    telefone = lead?.telefone || "";
  }

  try {
    const response = await fetch("https://n8n.srv1129054.hstgr.cloud/webhook/2e9d7f60-a095-488a-a56c-9b4a4a6ba10a", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        os_id: data.id,
        nome: data.nome,
        telefone,
        servico: data.servico,
        cidade: data.cidade || "",
        estado: data.estado || "",
        valor: data.valor,
        status: data.status,
        data_entrega: data.data_entrega,
        obs: data.obs || ""
      })
    });

    if (!response.ok) throw new Error("Erro webhook");
    mostrarToast("📄 OS enviada com sucesso!");
  } catch (err) {
    console.error(err);
    mostrarToast("❌ Erro ao enviar OS via Webhook", "erro");
  }
}

async function carregarTotaisOS() {
  let query = client.from("ordens_servico").select("*");
  const status = document.getElementById("filtroStatusOS")?.value;
  const inicio = document.getElementById("dataInicioOS")?.value;
  const fim = document.getElementById("dataFimOS")?.value;

  if (status) query = query.eq("status", status);
  if (inicio) query = query.gte("data_entrega", inicio);
  if (fim) query = query.lte("data_entrega", fim);

  const { data, error } = await query;
  if (error) return;

  let total = 0;
  let faturado = 0;
  let aReceber = 0;

  (data || []).forEach(item => {
    const valor = Number(item.valor || 0);
    total += valor;
    if (item.status === "Finalizada") faturado += valor;
    else aReceber += valor;
  });

  const elTotalOS = document.getElementById("totalOS");
  if (elTotalOS) elTotalOS.innerText = (data || []).length;
  const elTotalValor = document.getElementById("totalValorOS");
  if (elTotalValor) elTotalValor.innerText = formatarMoeda(total);
  const elFaturado = document.getElementById("faturadoOS");
  if (elFaturado) elFaturado.innerText = formatarMoeda(faturado);
  const elAReceber = document.getElementById("aReceberOS");
  if (elAReceber) elAReceber.innerText = formatarMoeda(aReceber);
}

function filtrarOS() {
  osPaginaAtual = 1;
  carregarDadosOS();
}

function aplicarPeriodoOS() {
  const hoje = new Date();
  const periodo = document.getElementById("filtroPeriodoOS").value;

  let inicio = null;
  let fim = new Date();

  switch (periodo) {
    case "mes_atual":
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      break;
    case "mes_anterior":
      inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      break;
    case "ano_atual":
      inicio = new Date(hoje.getFullYear(), 0, 1);
      break;
    case "ultimos_7":
      inicio = new Date();
      inicio.setDate(hoje.getDate() - 7);
      break;
    case "ultimos_30":
      inicio = new Date();
      inicio.setDate(hoje.getDate() - 30);
      break;
  }

  if (inicio) document.getElementById("dataInicioOS").value = formatarDataLocal(inicio);
  document.getElementById("dataFimOS").value = formatarDataLocal(fim);
  filtrarOS();
}

function osProximaPagina() {
  osPaginaAtual++;
  carregarDadosOS();
}

function osPaginaAnterior() {
  if (osPaginaAtual > 1) {
    osPaginaAtual--;
    carregarDadosOS();
  }
}

function toggleRecorrenciaOS() {
  const chk = document.getElementById("os_recorrente");
  const box = document.getElementById("boxRecorrenciaOS");
  if (box) box.style.display = chk.checked ? "block" : "none";
}

function abrirModalOS() {
  openModal("modalOS");
}

function fecharModalOS() {
  closeModal("modalOS");
  osEditandoId = null;
  const form = document.getElementById("formOS");
  if (form) form.reset();
  const titulo = document.getElementById("tituloModalOS");
  if (titulo) titulo.innerText = "➕ Nova Ordem de Serviço";
}

/* ==========================================================================
   4. MÓDULO FINANCEIRO GERAL CONSOLIDADO
   ========================================================================== */

function renderFinanceiroGeral() {
  const tbody = document.getElementById("tbl-financeiro-geral");
  if (!tbody) return;

  tbody.innerHTML = "";

  const busca = (document.getElementById("fin-busca")?.value || "").toLowerCase();
  const filtroOrigem = document.getElementById("fin-filtro-origem")?.value || "";

  // 1. Receitas do Módulo Comercial (Recebimentos)
  const entradasComercial = state.recebimentos.map(r => {
    const parcela = state.parcelas.find(p => String(p.id) === String(r.parcela_id));
    const contrato = parcela ? state.contratos.find(c => String(c.id) === String(parcela.contrato_id)) : null;
    return {
      origem: "Comercial",
      cliente: contrato ? (contrato.cliente || contrato.cliente_nome) : "Cliente",
      descricao: parcela ? parcela.descricao : "Recebimento Comercial",
      data: r.data,
      valor: parseFloat(r.valor || 0),
      forma: r.forma_pagamento || "Pix",
      status: "Pago",
      id: `REC-${r.id}`
    };
  });

  // 2. Receitas do Módulo OS (Ordens de Serviço Finalizadas / Em andamento)
  const entradasOS = state.ordensServico.map(os => ({
    origem: "Ordens de Serviço",
    cliente: os.nome || "Cliente",
    descricao: `${os.servico || 'OS'} ${os.obs ? ' - ' + os.obs : ''}`,
    data: os.data_entrega,
    valor: parseFloat(os.valor || 0),
    forma: "Direto OS",
    status: os.status === "Finalizada" ? "Pago" : "Pendente",
    id: `OS-${os.id}`
  }));

  // Combine via JS Equivalent of UNION ALL
  const consolidado = [...entradasComercial, ...entradasOS]
    .filter(item => {
      const matchSearch = !busca || 
        item.cliente.toLowerCase().includes(busca) || 
        item.descricao.toLowerCase().includes(busca) ||
        item.id.toLowerCase().includes(busca);
      
      const matchOrigem = !filtroOrigem || item.origem === filtroOrigem;
      return matchSearch && matchOrigem;
    })
    .sort((a, b) => new Date(b.data || '1970-01-01') - new Date(a.data || '1970-01-01'));

  // Calculate totals
  let totalGeralRecebido = 0;
  let totalComercialRecebido = 0;
  let totalOSRecebido = 0;

  consolidado.forEach(item => {
    if (item.status === 'Pago') {
      totalGeralRecebido += item.valor;
      if (item.origem === 'Comercial') totalComercialRecebido += item.valor;
      if (item.origem === 'Ordens de Serviço') totalOSRecebido += item.valor;
    }
  });

  const elTotalFinGeral = document.getElementById("fin-total-recebido");
  if (elTotalFinGeral) elTotalFinGeral.innerText = formatarMoeda(totalGeralRecebido);
  const elTotalFinComercial = document.getElementById("fin-total-comercial");
  if (elTotalFinComercial) elTotalFinComercial.innerText = formatarMoeda(totalComercialRecebido);
  const elTotalFinOS = document.getElementById("fin-total-os");
  if (elTotalFinOS) elTotalFinOS.innerText = formatarMoeda(totalOSRecebido);

  if (consolidado.length === 0) {
    tbody.innerHTML = '<tr class="empty-state-row"><td colspan="7">Nenhuma movimentação financeira encontrada para os filtros selecionados.</td></tr>';
    return;
  }

  consolidado.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="badge ${item.origem === 'Comercial' ? 'badge-ativo' : 'badge-os'}">${item.origem}</span></td>
      <td><strong>${item.cliente}</strong></td>
      <td>${item.descricao}</td>
      <td><span style="font-family:monospace;">${formatarData(item.data)}</span></td>
      <td><strong style="color:var(--success);">${formatarMoeda(item.valor)}</strong></td>
      <td>${item.forma}</td>
      <td><span class="badge ${item.status === 'Pago' ? 'badge-pago' : 'badge-pendente'}">${item.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

/* ==========================================================================
   5. MÓDULO CLIENTES
   ========================================================================== */

function renderClientesModule() {
  const tbody = document.getElementById("tbl-clientes-consolidado");
  if (!tbody) return;

  tbody.innerHTML = "";

  const busca = (document.getElementById("busca-cliente")?.value || "").toLowerCase();

  // Combine clients from `clientes` (Comercial) and `crm_leads` (OS)
  const mapClientes = new Map();

  state.clientesComercial.forEach(c => {
    const nomeKey = (c.nome || "").trim().toLowerCase();
    if (!nomeKey) return;
    mapClientes.set(nomeKey, {
      nome: c.nome,
      origem: "Comercial",
      id: c.id
    });
  });

  state.crmLeads.forEach(l => {
    const nomeKey = (l.nome || "").trim().toLowerCase();
    if (!nomeKey) return;
    if (mapClientes.has(nomeKey)) {
      const existing = mapClientes.get(nomeKey);
      existing.origem = "Comercial & OS";
      existing.telefone = l.telefone;
    } else {
      mapClientes.set(nomeKey, {
        nome: l.nome,
        origem: "CRM Leads (OS)",
        telefone: l.telefone,
        id: l.id
      });
    }
  });

  const listaClientes = Array.from(mapClientes.values()).filter(c => 
    !busca || c.nome.toLowerCase().includes(busca)
  );

  if (listaClientes.length === 0) {
    tbody.innerHTML = '<tr class="empty-state-row"><td colspan="5">Nenhum cliente cadastrado no sistema.</td></tr>';
    return;
  }

  listaClientes.forEach(c => {
    // Count linked contracts & OS
    const numContratos = state.contratos.filter(con => (con.cliente || con.cliente_nome || '').toLowerCase() === c.nome.toLowerCase()).length;
    const numOS = state.ordensServico.filter(os => (os.nome || '').toLowerCase() === c.nome.toLowerCase()).length;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${c.nome}</strong></td>
      <td><span class="badge badge-ativo">${c.origem}</span></td>
      <td><span style="font-family:monospace;">${c.telefone || '-'}</span></td>
      <td><strong>${numContratos}</strong> Contrato(s)</td>
      <td><strong>${numOS}</strong> OS(s)</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ==========================================================================
   CHARTS MANAGEMENT
   ========================================================================== */

function initCharts() {
  // 1. Chart Consolidado (Initial Dashboard)
  const ctxCons = document.getElementById("chartConsolidado")?.getContext("2d");
  if (ctxCons) {
    chartConsolidadoInstance = new Chart(ctxCons, {
      type: "bar",
      data: {
        labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
        datasets: [
          {
            label: "Módulo Comercial (R$)",
            data: new Array(12).fill(0),
            backgroundColor: "rgba(59, 130, 246, 0.8)",
            borderRadius: 6
          },
          {
            label: "Ordens de Serviço (R$)",
            data: new Array(12).fill(0),
            backgroundColor: "rgba(0, 255, 180, 0.8)",
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: "#94a3b8" } }
        },
        scales: {
          x: { ticks: { color: "#64748b" }, grid: { color: "rgba(255,255,255,0.05)" } },
          y: { ticks: { color: "#64748b" }, grid: { color: "rgba(255,255,255,0.05)" } }
        }
      }
    });
  }

  // 2. Chart Recebimentos Comercial
  const ctxRecCom = document.getElementById("chartRecebimentosComercial")?.getContext("2d");
  if (ctxRecCom) {
    chartComercialRecebimentos = new Chart(ctxRecCom, {
      type: "bar",
      data: {
        labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
        datasets: [{
          label: "Recebido (R$)",
          data: new Array(12).fill(0),
          backgroundColor: "rgba(16, 185, 129, 0.8)",
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "#94a3b8" } } },
        scales: {
          x: { ticks: { color: "#64748b" }, grid: { color: "rgba(255,255,255,0.05)" } },
          y: { ticks: { color: "#64748b" }, grid: { color: "rgba(255,255,255,0.05)" } }
        }
      }
    });
  }

  // 3. Chart Status Comercial
  const ctxStCom = document.getElementById("chartStatusComercial")?.getContext("2d");
  if (ctxStCom) {
    chartComercialStatus = new Chart(ctxStCom, {
      type: "doughnut",
      data: {
        labels: ["Em execução", "Ativo", "Aguardando Assinatura", "Finalizado", "Em Negociação", "Cancelado"],
        datasets: [{
          data: [0, 0, 0, 0, 0, 0],
          backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#64748b", "#ef4444"],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { color: "#94a3b8", boxWidth: 12 } } }
      }
    });
  }
}

function updateChartConsolidado() {
  if (!chartConsolidadoInstance) return;

  const monthlyComercial = new Array(12).fill(0);
  const monthlyOS = new Array(12).fill(0);

  state.recebimentos.forEach(r => {
    if (r.data) {
      const d = new Date(r.data.split('T')[0] + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        const m = d.getMonth();
        if (m >= 0 && m < 12) monthlyComercial[m] += parseFloat(r.valor || 0);
      }
    }
  });

  state.ordensServico.forEach(os => {
    if (os.status === 'Finalizada' && os.data_entrega) {
      const d = new Date(os.data_entrega.split('T')[0] + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        const m = d.getMonth();
        if (m >= 0 && m < 12) monthlyOS[m] += parseFloat(os.valor || 0);
      }
    }
  });

  chartConsolidadoInstance.data.datasets[0].data = monthlyComercial;
  chartConsolidadoInstance.data.datasets[1].data = monthlyOS;
  chartConsolidadoInstance.update();
}

function updateChartsComercial() {
  if (!chartComercialRecebimentos || !chartComercialStatus) return;

  const monthlyTotals = new Array(12).fill(0);
  state.recebimentos.forEach(r => {
    if (r.data) {
      const d = new Date(r.data.split('T')[0] + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        const m = d.getMonth();
        if (m >= 0 && m < 12) monthlyTotals[m] += parseFloat(r.valor || 0);
      }
    }
  });

  chartComercialRecebimentos.data.datasets[0].data = monthlyTotals;
  chartComercialRecebimentos.update();

  const statusCounts = {
    'Em execução': 0,
    'Ativo': 0,
    'Aguardando assinatura': 0,
    'Finalizado': 0,
    'Em negociação': 0,
    'Cancelado': 0
  };

  state.contratos.forEach(c => {
    const s = c.status || 'Em negociação';
    if (statusCounts.hasOwnProperty(s)) statusCounts[s]++;
    else statusCounts['Em negociação']++;
  });

  chartComercialStatus.data.datasets[0].data = [
    statusCounts['Em execução'],
    statusCounts['Ativo'],
    statusCounts['Aguardando assinatura'],
    statusCounts['Finalizado'],
    statusCounts['Em negociação'],
    statusCounts['Cancelado']
  ];
  chartComercialStatus.update();
}

function gerarGraficoOS(data) {
  const faturado = {};
  const pendente = {};

  (data || []).forEach(item => {
    if (!item.data_entrega) return;
    const dataObj = new Date(item.data_entrega);
    const mes = dataObj.toLocaleDateString("pt-BR", { year: "numeric", month: "2-digit" });
    const valor = Number(item.valor || 0);

    if (!faturado[mes]) faturado[mes] = 0;
    if (!pendente[mes]) pendente[mes] = 0;

    if (item.status === "Finalizada") faturado[mes] += valor;
    else pendente[mes] += valor;
  });

  const labels = Array.from(new Set([...Object.keys(faturado), ...Object.keys(pendente)])).sort((a, b) => {
    const [mesA, anoA] = a.split('/');
    const [mesB, anoB] = b.split('/');
    return new Date(`${anoB}-${mesB}-01`) - new Date(`${anoA}-${mesA}-01`);
  });

  const dadosFaturado = labels.map(l => faturado[l] || 0);
  const dadosPendente = labels.map(l => pendente[l] || 0);

  const canvas = document.getElementById('graficoFaturamentoOS');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (chartOsFaturamento) chartOsFaturamento.destroy();

  chartOsFaturamento = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: '💰 Faturado',
          data: dadosFaturado,
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(34,197,94,0.2)',
          pointBackgroundColor: '#3b82f6'
        },
        {
          label: '🕒 A Receber',
          data: dadosPendente,
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(245,158,11,0.2)',
          pointBackgroundColor: '#22c55e'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#fff' } } },
      scales: {
        x: { ticks: { color: '#fff' } },
        y: { ticks: { color: '#fff' } }
      }
    }
  });
}

/* Modal Helper Global */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

function switchContractTab(tabId, element) {
  document.querySelectorAll('#view-detalhe-contrato .tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('#view-detalhe-contrato .tab-content').forEach(c => c.classList.remove('active'));

  element.classList.add('active');
  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');
}
