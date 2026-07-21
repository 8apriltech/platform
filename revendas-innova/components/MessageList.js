// Componente MessageList

/**
 * Formata a hora de uma mensagem (HH:MM)
 */
function formatMsgTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Formata a data para o separador de chat
 */
function formatSeparatorDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  
  const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = dNow - dDate;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Hoje';
  } else if (diffDays === 1) {
    return 'Ontem';
  } else {
    // Retorna no formato: "15 de junho de 2026"
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}

/**
 * Renders the header of the active conversation.
 */
export function renderChatHeader(container, contact, onToggleDetails, onBackToInbox) {
  if (!contact) {
    container.innerHTML = '';
    return;
  }

  const isHuman = contact.modo_humano === true || contact.status === 'humano';
  const badgeHtml = isHuman 
    ? `<span class="badge-status badge-humano">Humano</span>` 
    : `<span class="badge-status badge-ia">IA</span>`;

  container.innerHTML = `
    <div class="chat-header-left">
      <!-- Botão Voltar (Mobile) -->
      <button class="btn-back-mobile" id="btn-chat-back" title="Voltar para a lista">
        <i data-lucide="chevron-left"></i>
      </button>
      
      <div class="chat-contact-details">
        <span class="chat-contact-name">${contact.nome || contact.telefone}</span>
        <div class="chat-contact-meta">
          <span>${contact.telefone || '-'}</span>
          <span style="color: var(--border-light)">|</span>
          ${badgeHtml}
        </div>
      </div>
    </div>

    <div class="chat-header-actions">
      <!-- Botão Toggle de Detalhes (Mobile/Tablet) -->
      <button class="btn-header-action" id="btn-toggle-details-sidebar" title="Informações do Contato">
        <i data-lucide="info"></i>
      </button>
    </div>
  `;

  // Anexar eventos
  const btnBack = container.querySelector('#btn-chat-back');
  if (btnBack && onBackToInbox) {
    btnBack.addEventListener('click', onBackToInbox);
  }

  const btnInfo = container.querySelector('#btn-toggle-details-sidebar');
  if (btnInfo && onToggleDetails) {
    btnInfo.addEventListener('click', onToggleDetails);
  }

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Renderiza o histórico de mensagens do chat selecionado.
 * @param {HTMLElement} container - O elemento container de mensagens (viewport)
 * @param {Array} messages - Array com as últimas 50 mensagens do banco (ordenadas DESC no banco)
 * @param {Object} contact - Objeto do contato ativo
 */
export function renderMessageList(container, messages, contact) {
  container.innerHTML = '';
  
  if (!contact) {
    // Estado inicial: nenhuma conversa selecionada
    container.innerHTML = `
      <div class="chat-empty-state">
        <div class="chat-empty-icon">
          <i data-lucide="message-square"></i>
        </div>
        <h2>INNA - Central de Conversas</h2>
        <p>Selecione um cliente na lista lateral para visualizar o histórico completo da conversa.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }
  
  if (messages.length === 0) {
    container.innerHTML = `
      <div class="chat-empty-state">
        <div class="chat-empty-icon" style="background-color: var(--border-light); color: var(--text-muted);">
          <i data-lucide="message-circle"></i>
        </div>
        <h2>Nenhuma mensagem</h2>
        <p>Ainda não há mensagens registradas para este contato no banco de dados.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }
  
  // Ordena cronologicamente: as mensagens chegam da API mais novas primeiro (DESC)
  // Precisamos inverter para renderizar as mais antigas no topo e as mais novas na parte inferior
  const sortedMessages = [...messages].reverse();
  
  let lastDateStr = null;
  const fragment = document.createDocumentFragment();
  
  sortedMessages.forEach(msg => {
    const msgDate = new Date(msg.created_at);
    const dateStr = msgDate.toDateString(); // chave simples para data
    
    // Injeta separador de data se a data mudou
    if (dateStr !== lastDateStr) {
      const separator = document.createElement('div');
      separator.className = 'date-separator';
      separator.innerHTML = `
        <div class="date-separator-line"></div>
        <div class="date-separator-pill">${formatSeparatorDate(msg.created_at)}</div>
      `;
      fragment.appendChild(separator);
      lastDateStr = dateStr;
    }
    
    // Configura estrutura de alinhamento e balões
    // Mensagens do cliente -> Alinhadas à esquerda (cinza)
    // Mensagens da IA/Sistema -> Alinhadas à direita (azul)
    // Mensagens do Corretor (caso futuramente exista origem = corretor) -> Alinhadas à direita (verde)
    const isClient = msg.direcao === 'inbound' || msg.direcao === 'cliente' || msg.direcao === 'client';
    
    const wrapper = document.createElement('div');
    wrapper.className = `message-bubble-wrapper ${isClient ? 'align-left' : 'align-right'}`;
    
    // Define a classe do balão com base na origem e direção
    let bubbleClass = 'bubble-client';
    let senderName = contact.nome || 'Cliente';
    
    if (!isClient) {
      const isCorretor = msg.origem === 'corretor' || msg.origem === 'human' || msg.origem === 'humano';
      if (isCorretor) {
        bubbleClass = 'bubble-corretor';
        senderName = 'Corretor';
      } else {
        bubbleClass = 'bubble-ia';
        senderName = 'INNA (IA)';
      }
    }
    
    // Embeleza conteúdo de mensagens de voz/mídias futuras
    let messageText = msg.mensagem || '';
    if (msg.tipo === 'audio') {
      messageText = `🎙️ <em>Áudio desabilitado para reprodução (Apenas leitura)</em>`;
    } else if (msg.tipo === 'imagem') {
      messageText = `📷 <em>Imagem não carregável nesta versão</em>`;
    } else if (msg.tipo === 'documento') {
      messageText = `📄 <em>Documento anexado (${messageText || 'Arquivo'})</em>`;
    }
    
    // Cabeçalho do balão indicando remetente
    const senderHeader = isClient
      ? `<span class="message-sender-name">${senderName}</span>`
      : `<span class="message-sender-name ${bubbleClass === 'bubble-ia' ? 'ia-label' : ''}">
          ${bubbleClass === 'bubble-ia' ? '<i data-lucide="bot"></i>' : '<i data-lucide="user-check"></i>'} ${senderName}
         </span>`;
         
    wrapper.innerHTML = `
      <div class="message-bubble ${bubbleClass}">
        ${senderHeader}
        <div class="message-text">${messageText}</div>
        <div class="message-meta">
          <span>${formatMsgTime(msg.created_at)}</span>
        </div>
      </div>
    `;
    
    fragment.appendChild(wrapper);
  });
  
  container.appendChild(fragment);
  if (window.lucide) window.lucide.createIcons();
  
  // Rola para a última mensagem com um pequeno delay após a renderização do DOM
  setTimeout(() => {
    container.scrollTop = container.scrollHeight;
  }, 50);
}
