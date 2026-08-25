// Componente ContactPanel

/**
 * Retorna o valor original ou "-" caso o campo seja nulo ou indefinido.
 */
function getValueOrFallback(val) {
  if (val === null || val === undefined || String(val).trim() === '') {
    return '—';
  }
  return val;
}

/**
 * Formata datas do painel de detalhes (DD/MM/AAAA às HH:MM)
 */
function formatPanelDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Renderiza o painel de informações básicas do contato.
 * @param {HTMLElement} container - Container HTML do painel do contato
 * @param {Object|null} contact - Objeto de dados do contato
 */
export function renderContactDetails(container, contact) {
  if (!contact) {
    container.innerHTML = `
      <div class="empty-list-state" style="padding: 20px 0;">
        <p>Selecione um contato para ver os detalhes.</p>
      </div>
    `;
    return;
  }

  const isHuman = contact.modo_humano === true || contact.status === 'humano';
  const modoHumanoText = isHuman ? 'Ativo (Humano)' : 'Inativo (IA)';
  
  container.innerHTML = `
    <div class="details-grid">
      <div class="detail-item">
        <span class="detail-label">Nome</span>
        <span class="detail-value" style="font-weight: 700; font-size: 15px;">${getValueOrFallback(contact.nome)}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">Telefone</span>
        <span class="detail-value">${getValueOrFallback(contact.telefone)}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">Empreendimento de Interesse</span>
        <span class="detail-value" style="color: var(--brand-primary); font-weight: 600;">
          ${getValueOrFallback(contact.empreendimento_interesse)}
        </span>
      </div>

      <div class="detail-item">
        <span class="detail-label">Status do Atendimento</span>
        <span class="detail-value" style="text-transform: capitalize;">${getValueOrFallback(contact.status)}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">Modo Humano</span>
        <span class="detail-value">${modoHumanoText}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">Colaborador Responsável</span>
        <span class="detail-value">${getValueOrFallback(contact.colaborador_responsavel)}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">Primeiro Contato</span>
        <span class="detail-value">${formatPanelDate(contact.created_at)}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">Última Interação</span>
        <span class="detail-value">${formatPanelDate(contact.ultima_interacao)}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">Observações</span>
        <div class="observation-box">${getValueOrFallback(contact.observacoes)}</div>
      </div>

      <div class="detail-actions" style="margin-top: 8px;">
        <button type="button" class="btn-danger-outline" id="btn-delete-conversation" data-id="${contact.id}">
          <i data-lucide="trash-2"></i>
          <span>Excluir Conversa</span>
        </button>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Renderiza o painel de Resumo da IA obtido da tabela `conversas`.
 * @param {HTMLElement} container - Container HTML da seção de resumo da IA
 * @param {Object|null} aiSummary - Dados da linha correspondente da tabela `conversas`
 */
export function renderAISummary(container, aiSummary) {
  container.innerHTML = '';

  // Se não existir resumo ou se o objeto for vazio (banco em branco)
  if (!aiSummary || (!aiSummary.resumo_contexto && !aiSummary.ultima_intencao && !aiSummary.lead_temperatura && !aiSummary.ultimo_status)) {
    container.innerHTML = `
      <div class="ai-empty-message">Resumo ainda não disponível.</div>
    `;
    return;
  }

  // Estiliza a temperatura do lead
  let tempClass = 'temp-cold';
  const tempVal = String(aiSummary.lead_temperatura || '').toLowerCase();
  
  if (tempVal === 'quente' || tempVal === 'hot') {
    tempClass = 'temp-hot';
  } else if (tempVal === 'morno' || tempVal === 'warm') {
    tempClass = 'temp-warm';
  }

  const temperatureBadge = aiSummary.lead_temperatura 
    ? `<span class="badge-temperature ${tempClass}">${aiSummary.lead_temperatura}</span>`
    : '—';

  container.innerHTML = `
    <div class="ai-summary-card">
      <div class="ai-meta-item">
        <span class="ai-meta-label"><i data-lucide="sparkles"></i> Resumo do Contexto</span>
        <div class="ai-context-text">${getValueOrFallback(aiSummary.resumo_contexto)}</div>
      </div>

      <div class="ai-meta-item">
        <span class="ai-meta-label"><i data-lucide="target"></i> Última Intenção</span>
        <span class="ai-meta-value">${getValueOrFallback(aiSummary.ultima_intencao)}</span>
      </div>

      <div class="ai-meta-item">
        <span class="ai-meta-label"><i data-lucide="thermometer"></i> Temperatura do Lead</span>
        <div class="detail-value badge-value">${temperatureBadge}</div>
      </div>

      <div class="ai-meta-item">
        <span class="ai-meta-label"><i data-lucide="help-circle"></i> Último Status</span>
        <span class="ai-meta-value">${getValueOrFallback(aiSummary.ultimo_status)}</span>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}
