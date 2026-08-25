/* =========================================================
   8APRIL ORÇAMENTOS - STORAGE & SUPABASE PERSISTENCE ENGINE
   ========================================================= */

// Default Production Supabase Credentials (8April Tech)
const DEFAULT_SUPABASE_URL = "https://exrvjejlhtdjdhcuzwth.supabase.co";
const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4cnZqZWpsaHRkamRoY3V6d3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MTk2NDQsImV4cCI6MjA4NTk5NTY0NH0.Jd_gn8bvcDyw5RjiXIL5FePT6mTg6B1tDbBKw-hRakc";

const STORAGE_CFG_URL = '8april_supabase_url';
const STORAGE_CFG_KEY = '8april_supabase_key';
const LOCAL_ORCAMENTOS_KEY = '8april_orcamentos_db';

let supabaseClient = null;

// Config Management
function getSupabaseConfig() {
  return {
    url: localStorage.getItem(STORAGE_CFG_URL) || DEFAULT_SUPABASE_URL,
    key: localStorage.getItem(STORAGE_CFG_KEY) || DEFAULT_SUPABASE_KEY
  };
}

function saveSupabaseConfig(url, key) {
  if (url && url.trim()) localStorage.setItem(STORAGE_CFG_URL, url.trim());
  else localStorage.removeItem(STORAGE_CFG_URL);

  if (key && key.trim()) localStorage.setItem(STORAGE_CFG_KEY, key.trim());
  else localStorage.removeItem(STORAGE_CFG_KEY);

  initSupabaseClient();
}

function clearSupabaseConfig() {
  localStorage.removeItem(STORAGE_CFG_URL);
  localStorage.removeItem(STORAGE_CFG_KEY);
  initSupabaseClient();
}

function initSupabaseClient() {
  const { url, key } = getSupabaseConfig();
  if (url && key && window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(url, key);
      return supabaseClient;
    } catch (e) {
      console.warn('Erro ao inicializar Supabase:', e);
      supabaseClient = null;
    }
  } else {
    supabaseClient = null;
  }
  return supabaseClient;
}

function isSupabaseActive() {
  if (!supabaseClient) initSupabaseClient();
  return Boolean(supabaseClient);
}

// 🔐 Check User Session (Redirects to /login.html if not authenticated)
async function verificarSessao() {
  const client = initSupabaseClient();
  if (!client) return true;

  try {
    const { data: { session } } = await client.auth.getSession();
    if (!session) {
      // Check if we are running in localhost dev mode to avoid blocking local testing without login session,
      // but enforce /login.html on app.8april.com.br domain or when session is mandatory.
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isLocalhost) {
        window.location.href = "https://app.8april.com.br/login.html";
        return false;
      }
    }
    return true;
  } catch (err) {
    console.warn('Erro ao verificar sessão de autenticação:', err);
    return true;
  }
}

// Local Storage Fallback Helpers
function getLocalQuotes() {
  try {
    const raw = localStorage.getItem(LOCAL_ORCAMENTOS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalQuotes(list) {
  localStorage.setItem(LOCAL_ORCAMENTOS_KEY, JSON.stringify(list));
}

// Sequence Number Generator
async function getNextSequenceNumber() {
  const currentYear = new Date().getFullYear();
  const client = initSupabaseClient();

  if (client) {
    try {
      // Query higher sequence number for current year
      const { data, error } = await client
        .from('orcamentos')
        .select('sequencial')
        .eq('ano', currentYear)
        .order('sequencial', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const nextSeq = (data[0].sequencial || 0) + 1;
        return formatQuoteNumber(currentYear, nextSeq);
      } else {
        return formatQuoteNumber(currentYear, 1);
      }
    } catch (err) {
      console.warn('Erro sequencial no Supabase, usando local:', err);
    }
  }

  // Fallback Local Storage
  const locals = getLocalQuotes();
  const yearQuotes = locals.filter(q => q.ano === currentYear);
  if (yearQuotes.length === 0) return formatQuoteNumber(currentYear, 1);
  const maxSeq = Math.max(...yearQuotes.map(q => q.sequencial || 0));
  return formatQuoteNumber(currentYear, maxSeq + 1);
}

function formatQuoteNumber(year, seq) {
  const formattedSeq = String(seq).padStart(4, '0');
  return `ORC-${year}-${formattedSeq}`;
}

function parseQuoteNumberParts(numStr) {
  const currentYear = new Date().getFullYear();
  if (!numStr) return { year: currentYear, seq: 1 };
  const parts = numStr.split('-');
  if (parts.length >= 3) {
    return {
      year: parseInt(parts[1], 10) || currentYear,
      seq: parseInt(parts[2], 10) || 1
    };
  }
  return { year: currentYear, seq: 1 };
}

// Data Operations
async function saveOrcamentoToDB(orcamentoData) {
  const client = initSupabaseClient();
  const { year, seq } = parseQuoteNumberParts(orcamentoData.numero);
  
  const payload = {
    numero: orcamentoData.numero,
    sequencial: seq,
    ano: year,
    data_emissao: orcamentoData.data_emissao,
    cliente_nome: orcamentoData.cliente_nome,
    cliente_empresa: orcamentoData.cliente_empresa || null,
    validade_dias: orcamentoData.validade_orcamento || '15 dias',
    condicoes_pagamento: orcamentoData.condicoes_pagamento || null,
    prazo_execucao: orcamentoData.prazo_execucao || null,
    observacoes: orcamentoData.observacoes || null,
    valor_total: parseFloat(orcamentoData.valor_total) || 0.00,
    itens: orcamentoData.itens || []
  };

  if (client) {
    try {
      if (orcamentoData.id && !orcamentoData.id.startsWith('local-')) {
        // Update existing row
        const { data, error } = await client
          .from('orcamentos')
          .update({
            ...payload,
            updated_at: new Date().toISOString()
          })
          .eq('id', orcamentoData.id)
          .select();

        if (error) throw error;
        return { success: true, data: data[0], mode: 'supabase' };
      } else {
        // Insert new row
        const { data, error } = await client
          .from('orcamentos')
          .insert([payload])
          .select();

        if (error) throw error;
        return { success: true, data: data[0], mode: 'supabase' };
      }
    } catch (err) {
      console.warn('Erro ao salvar no Supabase, fallback para LocalStorage:', err);
    }
  }

  // Local Storage Storage
  const locals = getLocalQuotes();
  let savedRecord = {
    ...payload,
    id: orcamentoData.id || ('local-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)),
    created_at: new Date().toISOString()
  };

  const idx = locals.findIndex(q => q.id === savedRecord.id);
  if (idx >= 0) {
    locals[idx] = savedRecord;
  } else {
    locals.unshift(savedRecord);
  }

  saveLocalQuotes(locals);
  return { success: true, data: savedRecord, mode: 'local' };
}

async function fetchOrcamentosList(searchTerm = '') {
  const client = initSupabaseClient();

  if (client) {
    try {
      let query = client
        .from('orcamentos')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm && searchTerm.trim()) {
        const term = `%${searchTerm.trim()}%`;
        query = query.or(`cliente_nome.ilike.${term},numero.ilike.${term},cliente_empresa.ilike.${term}`);
      }

      const { data, error } = await query;
      if (!error && data) return data;
    } catch (err) {
      console.warn('Erro ao listar do Supabase, buscando local:', err);
    }
  }

  // Fallback Local Storage
  let list = getLocalQuotes();
  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.toLowerCase().trim();
    list = list.filter(q =>
      (q.cliente_nome && q.cliente_nome.toLowerCase().includes(term)) ||
      (q.numero && q.numero.toLowerCase().includes(term)) ||
      (q.cliente_empresa && q.cliente_empresa.toLowerCase().includes(term))
    );
  }
  return list;
}

async function deleteOrcamentoDB(id) {
  const client = initSupabaseClient();

  if (client && !id.startsWith('local-')) {
    try {
      const { error } = await client
        .from('orcamentos')
        .delete()
        .eq('id', id);

      if (!error) return true;
    } catch (err) {
      console.warn('Erro ao deletar do Supabase:', err);
    }
  }

  // Delete from local storage
  const locals = getLocalQuotes().filter(q => q.id !== id);
  saveLocalQuotes(locals);
  return true;
}

async function testSupabaseConnection(url, key) {
  if (!window.supabase) return { success: false, message: 'Biblioteca Supabase JS não carregada.' };
  try {
    const testClient = window.supabase.createClient(url, key);
    const { data, error } = await testClient.from('orcamentos').select('count', { count: 'exact', head: true });
    if (error) {
      if (error.code === 'PGRST301' || error.message.includes('relation "public.orcamentos" does not exist')) {
        return { success: true, message: 'Conectado! Tabela "orcamentos" precisa ser criada no Supabase (execute o schema.sql).' };
      }
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Conexão efetuada com sucesso!' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// Global Storage Namespace
window.AppStorage = {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  isSupabaseActive,
  verificarSessao,
  getNextSequenceNumber,
  saveOrcamentoToDB,
  fetchOrcamentosList,
  deleteOrcamentoDB,
  testSupabaseConnection
};
