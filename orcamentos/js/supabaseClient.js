/* =========================================================
   8APRIL ORÇAMENTOS - SUPABASE CLIENT & DATA PERSISTENCE
   ========================================================= */

// Default configuration keys (can be overridden by user in UI settings)
const STORAGE_KEY_URL = '8april_supabase_url';
const STORAGE_KEY_ANON = '8april_supabase_anon_key';
const LOCAL_ORCAMENTOS_KEY = '8april_local_orcamentos';

let supabaseClient = null;

export function getStoredConfig() {
  return {
    url: localStorage.getItem(STORAGE_KEY_URL) || '',
    key: localStorage.getItem(STORAGE_KEY_ANON) || ''
  };
}

export function saveStoredConfig(url, key) {
  if (url) localStorage.setItem(STORAGE_KEY_URL, url.trim());
  else localStorage.removeItem(STORAGE_KEY_URL);

  if (key) localStorage.setItem(STORAGE_KEY_ANON, key.trim());
  else localStorage.removeItem(STORAGE_KEY_ANON);

  initSupabaseClient();
}

export function initSupabaseClient() {
  const { url, key } = getStoredConfig();
  if (url && key && window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(url, key);
      return supabaseClient;
    } catch (err) {
      console.warn('Erro ao inicializar Supabase client:', err);
      supabaseClient = null;
    }
  }
  return null;
}

export function getClient() {
  if (!supabaseClient) {
    initSupabaseClient();
  }
  return supabaseClient;
}

export function isConnected() {
  return Boolean(getClient());
}

/* Local storage fallback helpers */
function getLocalQuotes() {
  try {
    const raw = localStorage.getItem(LOCAL_ORCAMENTOS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalQuotes(quotes) {
  localStorage.setItem(LOCAL_ORCAMENTOS_KEY, JSON.stringify(quotes));
}

/* Data Access Operations */
export async function fetchNextSequence(year) {
  const client = getClient();
  if (client) {
    try {
      // Try function first
      const { data: fnData, error: fnErr } = await client.rpc('get_next_orcamento_numero', { p_ano: year });
      if (!fnErr && fnData && fnData.length > 0) {
        return fnData[0].next_seq;
      }
      
      // Fallback query
      const { data, error } = await client
        .from('orcamentos')
        .select('sequencial')
        .eq('ano', year)
        .order('sequencial', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        return data[0].sequencial + 1;
      }
      return 1;
    } catch (err) {
      console.warn('Erro ao buscar sequencial no Supabase, usando fallback local:', err);
    }
  }

  // Local Storage Fallback
  const locals = getLocalQuotes();
  const yearQuotes = locals.filter(q => q.ano === year);
  if (yearQuotes.length === 0) return 1;
  const maxSeq = Math.max(...yearQuotes.map(q => q.sequencial || 0));
  return maxSeq + 1;
}

export async function saveOrcamento(orcamentoData) {
  const client = getClient();
  
  if (client) {
    try {
      if (orcamentoData.id) {
        // Update existing
        const { data, error } = await client
          .from('orcamentos')
          .update({
            ...orcamentoData,
            updated_at: new Date().toISOString()
          })
          .eq('id', orcamentoData.id)
          .select();

        if (error) throw error;
        return { success: true, data: data[0], mode: 'supabase' };
      } else {
        // Insert new
        const { data, error } = await client
          .from('orcamentos')
          .insert([orcamentoData])
          .select();

        if (error) throw error;
        return { success: true, data: data[0], mode: 'supabase' };
      }
    } catch (err) {
      console.warn('Erro ao salvar no Supabase, armazenando localmente:', err);
    }
  }

  // Local Storage Fallback
  const locals = getLocalQuotes();
  let savedItem = { ...orcamentoData };
  if (!savedItem.id) {
    savedItem.id = 'local-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    savedItem.created_at = new Date().toISOString();
  }
  savedItem.updated_at = new Date().toISOString();

  const idx = locals.findIndex(q => q.id === savedItem.id);
  if (idx >= 0) {
    locals[idx] = savedItem;
  } else {
    locals.unshift(savedItem);
  }
  saveLocalQuotes(locals);
  return { success: true, data: savedItem, mode: 'local' };
}

export async function fetchAllOrcamentos(searchTerm = '') {
  const client = getClient();

  if (client) {
    try {
      let query = client
        .from('orcamentos')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm.trim()) {
        const term = `%${searchTerm.trim()}%`;
        query = query.or(`cliente_nome.ilike.${term},numero.ilike.${term},cliente_empresa.ilike.${term}`);
      }

      const { data, error } = await query;
      if (!error) return data || [];
    } catch (err) {
      console.warn('Erro ao carregar do Supabase:', err);
    }
  }

  // Local Fallback
  let locals = getLocalQuotes();
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase().trim();
    locals = locals.filter(q => 
      (q.cliente_nome && q.cliente_nome.toLowerCase().includes(term)) ||
      (q.numero && q.numero.toLowerCase().includes(term)) ||
      (q.cliente_empresa && q.cliente_empresa.toLowerCase().includes(term))
    );
  }
  return locals;
}

export async function deleteOrcamento(id) {
  const client = getClient();

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

  // Local Storage
  const locals = getLocalQuotes().filter(q => q.id !== id);
  saveLocalQuotes(locals);
  return true;
}
