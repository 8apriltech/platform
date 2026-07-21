// Componente ConversationList

/**
 * Formata a data/hora para exibição amigável na lista lateral.
 * - Se hoje: "HH:MM"
 * - Se ontem: "Ontem"
 * - Se nesta semana: "Dia da semana" (ex: "Segunda")
 * - Caso contrário: "DD/MM/AAAA"
 */
export function formatTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  
  // Zera horas para comparação de dias inteiros
  const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = dNow - dDate;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Ontem';
  } else if (diffDays < 7) {
    const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return weekdays[date.getDay()];
  } else {
    return date.toLocaleDateString('pt-BR');
  }
}

/**
 * Renders a loading skeleton in the conversation container.
 */
export function renderLoadingSkeleton(container) {
  container.innerHTML = Array(6).fill(0).map(() => `
    <div class="skeleton-item">
      <div class="conv-item-header">
        <div class="skeleton-loader skeleton-line header"></div>
        <div class="skeleton-loader skeleton-line short" style="width: 50px;"></div>
      </div>
      <div class="skeleton-loader skeleton-line medium"></div>
      <div class="conv-item-footer">
        <div class="skeleton-loader skeleton-line short"></div>
        <div class="skeleton-loader skeleton-line short" style="width: 40px; border-radius: 99px;"></div>
      </div>
    </div>
  `).join('');
}

/**
 * Renderiza a lista de conversas.
 * @param {HTMLElement} container - O elemento container HTML
 * @param {Array} conversations - Lista de conversas vindas da vw_inbox
 * @param {string|null} activeId - ID do contato selecionado no momento
 * @param {Function} onSelect - Callback chamado ao selecionar um contato
 */
export function renderConversationList(container, conversations, activeId, onSelect) {
  container.innerHTML = '';
  
  if (conversations.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-list-state';
    emptyState.innerHTML = `
      <i data-lucide="message-square-off"></i>
      <p>Nenhuma conversa localizada.</p>
    `;
    container.appendChild(emptyState);
    if (window.lucide) window.lucide.createIcons();
    return;
  }
  
  const fragment = document.createDocumentFragment();
  
  conversations.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = `conversation-item ${item.id === activeId ? 'active' : ''}`;
    itemEl.dataset.id = item.id;
    
    // Badge de status IA / Humano
    // Se modo_humano for verdadeiro, é "Humano" (laranja). Caso contrário, ou se status for 'ia', é "IA" (azul)
    const isHuman = item.modo_humano === true || item.status === 'humano';
    const badgeHtml = isHuman 
      ? `<span class="badge-status badge-humano">Humano</span>` 
      : `<span class="badge-status badge-ia">IA</span>`;
      
    // Preview da última mensagem
    let previewMsg = item.ultima_mensagem || 'Sem mensagens registradas';
    if (item.ultimo_tipo === 'audio') {
      previewMsg = '🎙️ Mensagem de voz';
    } else if (item.ultimo_tipo === 'imagem') {
      previewMsg = '📷 Foto';
    } else if (item.ultimo_tipo === 'documento') {
      previewMsg = '📄 Documento';
    }
    
    // Empreendimento de interesse
    const enterpriseHtml = item.empreendimento_interesse 
      ? `<span class="conv-enterprise-tag" title="${item.empreendimento_interesse}">
           <i data-lucide="building"></i> ${item.empreendimento_interesse}
         </span>` 
      : '<span></span>';
      
    itemEl.innerHTML = `
      <div class="conv-item-header">
        <span class="conv-client-name" title="${item.nome_exibicao || item.telefone}">${item.nome_exibicao || item.telefone}</span>
        <span class="conv-time">${formatTime(item.ultima_mensagem_em || item.ultima_interacao)}</span>
      </div>
      <div class="conv-preview" title="${previewMsg}">${previewMsg}</div>
      <div class="conv-item-footer">
        ${enterpriseHtml}
        ${badgeHtml}
      </div>
    `;
    
    // Evento de clique
    itemEl.addEventListener('click', () => {
      // Remove classe active dos irmãos
      const activeItems = container.querySelectorAll('.conversation-item.active');
      activeItems.forEach(el => el.classList.remove('active'));
      // Adiciona ao selecionado
      itemEl.classList.add('active');
      
      onSelect(item.id);
    });
    
    fragment.appendChild(itemEl);
  });
  
  container.appendChild(fragment);
  if (window.lucide) window.lucide.createIcons();
}
