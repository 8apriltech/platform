/* =========================================================
   8APRIL ORÇAMENTOS - MAIN APPLICATION LOGIC & CONTROLLER
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Lucide Icons
  if (window.lucide) window.lucide.createIcons();

  // 🔐 0. Session Authentication Check (8April Architecture)
  if (window.AppStorage) {
    const hasSession = await window.AppStorage.verificarSessao();
    if (!hasSession) return; // Redirecting to https://app.8april.com.br/login.html
  }

  // 1. Toast Notification System
  window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-circle';

    toast.innerHTML = `<i data-lucide="${iconName}"></i> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  };

  // 2. Theme Toggle System (Dark / Light)
  const themeToggleBtn = document.getElementById('btn-theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const savedTheme = localStorage.getItem('8april_theme') || 'dark';

  function applyTheme(theme) {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
      if (themeIcon) themeIcon.setAttribute('data-lucide', 'sun');
    } else {
      document.body.classList.remove('light-theme');
      if (themeIcon) themeIcon.setAttribute('data-lucide', 'moon');
    }
    localStorage.setItem('8april_theme', theme);
    if (window.lucide) window.lucide.createIcons();
  }

  applyTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isLight = document.body.classList.contains('light-theme');
      applyTheme(isLight ? 'dark' : 'light');
    });
  }

  // 3. Tab Navigation System
  function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(sec => sec.classList.remove('active'));

    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    const activeSec = document.getElementById(tabId);

    if (activeBtn) activeBtn.classList.add('active');
    if (activeSec) activeSec.classList.add('active');

    if (tabId === 'tab-historico') {
      loadHistoryTable();
    }
  }

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      if (target) switchTab(target);
    });
  });

  // 4. Items Table Dynamic Rows Logic
  const tbody = document.getElementById('itens-tbody');
  const btnAddItem = document.getElementById('btn-add-item');

  function addItemRow(itemData = { descricao: '', quantidade: 1, valor_unitario: 0 }) {
    if (!tbody) return;
    const rowCount = tbody.children.length + 1;
    const tr = document.createElement('tr');
    
    tr.innerHTML = `
      <td class="text-center font-mono bold" style="color: var(--text-dim);">${rowCount}</td>
      <td>
        <input type="text" class="form-control item-desc" placeholder="Ex.: Desenvolvimento de Sistema Web" value="${escapeHtml(itemData.descricao || '')}" required>
      </td>
      <td>
        <input type="number" class="form-control item-qty text-center" min="1" step="1" value="${itemData.quantidade || 1}" required>
      </td>
      <td>
        <input type="number" class="form-control item-unit text-right" min="0" step="0.01" placeholder="0,00" value="${itemData.valor_unitario || ''}" required>
      </td>
      <td class="text-right font-mono bold item-total-display">
        ${formatCurrency((itemData.quantidade || 1) * (itemData.valor_unitario || 0))}
      </td>
      <td class="text-center">
        <button type="button" class="btn-icon btn-remove-item" title="Remover Item">
          <i data-lucide="trash-2"></i>
        </button>
      </td>
    `;

    tbody.appendChild(tr);
    if (window.lucide) window.lucide.createIcons();
    recalculateGrandTotal();
  }

  function updateRowNumbers() {
    if (!tbody) return;
    Array.from(tbody.children).forEach((row, i) => {
      const cell = row.children[0];
      if (cell) cell.textContent = i + 1;
    });
  }

  if (btnAddItem) {
    btnAddItem.addEventListener('click', () => addItemRow());
  }

  if (tbody) {
    tbody.addEventListener('input', (e) => {
      if (e.target.classList.contains('item-qty') || e.target.classList.contains('item-unit')) {
        recalculateGrandTotal();
      }
    });

    tbody.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.btn-remove-item');
      if (removeBtn) {
        const row = removeBtn.closest('tr');
        if (tbody.children.length > 1) {
          row.remove();
          updateRowNumbers();
          recalculateGrandTotal();
        } else {
          window.showToast('O orçamento deve conter pelo menos 1 item.', 'info');
        }
      }
    });
  }

  function recalculateGrandTotal() {
    if (!tbody) return 0;
    let grandTotal = 0;

    Array.from(tbody.children).forEach(row => {
      const qtyInput = row.querySelector('.item-qty');
      const unitInput = row.querySelector('.item-unit');
      const totalDisplay = row.querySelector('.item-total-display');

      const qty = parseFloat(qtyInput?.value) || 0;
      const unit = parseFloat(unitInput?.value) || 0;
      const subtotal = qty * unit;

      grandTotal += subtotal;
      if (totalDisplay) {
        totalDisplay.textContent = formatCurrency(subtotal);
      }
    });

    const displayEl = document.getElementById('valor-total-display');
    if (displayEl) displayEl.textContent = formatCurrency(grandTotal);

    return grandTotal;
  }

  // 5. Collect & Validate Form Data
  function collectFormData() {
    const id = document.getElementById('orcamento-id')?.value || null;
    const numero = document.getElementById('numero-orcamento')?.value || '';
    const data_emissao = document.getElementById('data-emissao')?.value || new Date().toISOString().split('T')[0];
    const cliente_nome = document.getElementById('nome-cliente')?.value.trim() || '';
    const cliente_empresa = document.getElementById('empresa-cliente')?.value.trim() || '';
    const validade_orcamento = document.getElementById('validade-orcamento')?.value.trim() || '15 dias';
    const prazo_execucao = document.getElementById('prazo-execucao')?.value.trim() || '';
    const condicoes_pagamento = document.getElementById('condicoes-pagamento')?.value.trim() || '';
    const observacoes = document.getElementById('observacoes')?.value.trim() || '';

    const itens = [];
    if (tbody) {
      Array.from(tbody.children).forEach(row => {
        const desc = row.querySelector('.item-desc')?.value.trim() || '';
        const qty = parseFloat(row.querySelector('.item-qty')?.value) || 0;
        const unit = parseFloat(row.querySelector('.item-unit')?.value) || 0;
        if (desc) {
          itens.push({
            descricao: desc,
            quantidade: qty,
            valor_unitario: unit,
            valor_total: qty * unit
          });
        }
      });
    }

    return {
      id,
      numero,
      data_emissao,
      cliente_nome,
      cliente_empresa,
      validade_orcamento,
      prazo_execucao,
      condicoes_pagamento,
      observacoes,
      valor_total: recalculateGrandTotal(),
      itens
    };
  }

  function validateFormData(data) {
    if (!data.cliente_nome) {
      window.showToast('Por favor, informe o nome do cliente.', 'error');
      document.getElementById('nome-cliente')?.focus();
      return false;
    }
    if (!data.itens || data.itens.length === 0) {
      window.showToast('Adicione pelo menos um item válido ao orçamento.', 'error');
      return false;
    }
    return true;
  }

  // 6. Reset Form & Auto Sequence Number
  async function resetForm() {
    document.getElementById('orcamento-id').value = '';
    document.getElementById('orcamento-form').reset();
    document.getElementById('form-title').textContent = 'Novo Orçamento';

    const dataEmissao = document.getElementById('data-emissao');
    if (dataEmissao) dataEmissao.value = new Date().toISOString().split('T')[0];

    document.getElementById('validade-orcamento').value = '15 dias';
    document.getElementById('condicoes-pagamento').value = '50% de entrada + 50% na entrega final';

    if (tbody) tbody.innerHTML = '';
    addItemRow({ descricao: '', quantidade: 1, valor_unitario: 0 });

    const numInput = document.getElementById('numero-orcamento');
    if (numInput && window.AppStorage) {
      numInput.value = 'Gerando...';
      const seqNum = await window.AppStorage.getNextSequenceNumber();
      numInput.value = seqNum;
    }
  }

  const btnReset = document.getElementById('btn-novo-reset');
  if (btnReset) btnReset.addEventListener('click', resetForm);

  // 7. Save Quote Handler
  async function handleSaveQuote() {
    const data = collectFormData();
    if (!validateFormData(data)) return;

    window.showToast('Salvando orçamento no Supabase...', 'info');
    const result = await window.AppStorage.saveOrcamentoToDB(data);

    if (result.success) {
      document.getElementById('orcamento-id').value = result.data.id;
      window.showToast(`Orçamento ${result.data.numero} salvo com sucesso!`, 'success');
      loadHistoryTable();
      window.AppPdf.openPdfModal(result.data);
    } else {
      window.showToast('Erro ao salvar orçamento.', 'error');
    }
  }

  const btnSalvar = document.getElementById('btn-salvar');
  const btnSalvarBottom = document.getElementById('btn-salvar-bottom');
  if (btnSalvar) btnSalvar.addEventListener('click', handleSaveQuote);
  if (btnSalvarBottom) btnSalvarBottom.addEventListener('click', handleSaveQuote);

  // 8. PDF Actions
  const btnPreviewPdf = document.getElementById('btn-preview-pdf');
  const btnGerarPdfDirect = document.getElementById('btn-gerar-pdf-direct');

  if (btnPreviewPdf) {
    btnPreviewPdf.addEventListener('click', () => {
      const data = collectFormData();
      if (validateFormData(data)) {
        window.AppPdf.openPdfModal(data);
      }
    });
  }

  if (btnGerarPdfDirect) {
    btnGerarPdfDirect.addEventListener('click', () => {
      const data = collectFormData();
      if (validateFormData(data)) {
        window.AppPdf.openPdfModal(data);
        window.AppPdf.downloadPdfA4(`${data.numero}_8April.pdf`);
      }
    });
  }

  const btnModalClose = document.getElementById('btn-modal-close');
  if (btnModalClose) {
    btnModalClose.addEventListener('click', () => window.AppPdf.closePdfModal());
  }

  const btnModalDownload = document.getElementById('btn-modal-download');
  if (btnModalDownload) {
    btnModalDownload.addEventListener('click', () => {
      const num = document.getElementById('pdf-num-orcamento')?.textContent || 'Orcamento';
      window.AppPdf.downloadPdfA4(`${num}_8April.pdf`);
    });
  }

  const btnModalWa = document.getElementById('btn-modal-wa');
  if (btnModalWa) {
    btnModalWa.addEventListener('click', () => {
      const num = document.getElementById('pdf-num-orcamento')?.textContent || '';
      const client = document.getElementById('pdf-cliente-nome')?.textContent || '';
      window.AppPdf.openWhatsAppContact(num, client);
    });
  }

  // 9. History Table Controller
  const historyTbody = document.getElementById('historico-tbody');
  const historyEmpty = document.getElementById('history-empty');
  const searchInput = document.getElementById('search-input');
  let searchDebounce = null;

  async function loadHistoryTable() {
    if (!historyTbody) return;

    const searchTerm = searchInput?.value || '';
    const list = await window.AppStorage.fetchOrcamentosList(searchTerm);

    // Update Stats
    const totalCountEl = document.getElementById('stat-total-count');
    const totalValueEl = document.getElementById('stat-total-value');
    const countBadgeEl = document.getElementById('count-badge');

    const totalVal = list.reduce((acc, q) => acc + (parseFloat(q.valor_total) || 0), 0);

    if (totalCountEl) totalCountEl.textContent = list.length;
    if (countBadgeEl) countBadgeEl.textContent = list.length;
    if (totalValueEl) totalValueEl.textContent = formatCurrency(totalVal);

    if (!list || list.length === 0) {
      historyTbody.innerHTML = '';
      if (historyEmpty) historyEmpty.style.display = 'block';
      return;
    }

    if (historyEmpty) historyEmpty.style.display = 'none';
    historyTbody.innerHTML = list.map(item => `
      <tr>
        <td class="font-mono bold" style="color: var(--primary);">${escapeHtml(item.numero)}</td>
        <td>${formatDateBR(item.data_emissao)}</td>
        <td class="bold">${escapeHtml(item.cliente_nome)}</td>
        <td>${escapeHtml(item.cliente_empresa || '-')}</td>
        <td class="font-mono bold">${formatCurrency(item.valor_total)}</td>
        <td class="text-center">
          <div style="display: inline-flex; gap: 6px;">
            <button type="button" class="btn-icon btn-view-pdf" data-id="${item.id}" title="Ver PDF A4">
              <i data-lucide="eye"></i>
            </button>
            <button type="button" class="btn-icon btn-edit-quote" data-id="${item.id}" title="Editar">
              <i data-lucide="edit"></i>
            </button>
            <button type="button" class="btn-icon btn-delete-quote" data-id="${item.id}" data-num="${escapeHtml(item.numero)}" title="Excluir" style="color: var(--accent-rose);">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();

    // Event handlers for action buttons
    historyTbody.querySelectorAll('.btn-view-pdf').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const target = list.find(q => q.id === id);
        if (target) window.AppPdf.openPdfModal(target);
      };
    });

    historyTbody.querySelectorAll('.btn-edit-quote').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const target = list.find(q => q.id === id);
        if (target) populateFormForEdit(target);
      };
    });

    historyTbody.querySelectorAll('.btn-delete-quote').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const num = btn.dataset.num;
        if (confirm(`Tem certeza que deseja excluir o orçamento ${num}?`)) {
          await window.AppStorage.deleteOrcamentoDB(id);
          window.showToast(`Orçamento ${num} excluído.`, 'info');
          await loadHistoryTable();
        }
      };
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(loadHistoryTable, 300);
    });
  }

  function populateFormForEdit(orcamento) {
    document.getElementById('orcamento-id').value = orcamento.id;
    document.getElementById('numero-orcamento').value = orcamento.numero || '';
    document.getElementById('data-emissao').value = orcamento.data_emissao || new Date().toISOString().split('T')[0];
    document.getElementById('nome-cliente').value = orcamento.cliente_nome || '';
    document.getElementById('empresa-cliente').value = orcamento.cliente_empresa || '';
    document.getElementById('validade-orcamento').value = orcamento.validade_dias || orcamento.validade_orcamento || '15 dias';
    document.getElementById('prazo-execucao').value = orcamento.prazo_execucao || '';
    document.getElementById('condicoes-pagamento').value = orcamento.condicoes_pagamento || '';
    document.getElementById('observacoes').value = orcamento.observacoes || '';

    if (tbody) {
      tbody.innerHTML = '';
      if (orcamento.itens && Array.isArray(orcamento.itens) && orcamento.itens.length > 0) {
        orcamento.itens.forEach(item => addItemRow(item));
      } else {
        addItemRow();
      }
    }

    document.getElementById('form-title').textContent = `Editar Orçamento (${orcamento.numero})`;
    switchTab('tab-novo');
    window.showToast(`Orçamento ${orcamento.numero} carregado para edição.`, 'info');
  }

  // 10. Supabase Config Form Handlers
  const supabaseForm = document.getElementById('supabase-config-form');
  const supabaseUrlInput = document.getElementById('supabase-url');
  const supabaseKeyInput = document.getElementById('supabase-key');
  const supabaseStatus = document.getElementById('supabase-status');
  const btnTestSupabase = document.getElementById('btn-test-supabase');
  const btnClearSupabase = document.getElementById('btn-clear-supabase');

  // Load saved config
  const cfg = window.AppStorage.getSupabaseConfig();
  if (supabaseUrlInput) supabaseUrlInput.value = cfg.url;
  if (supabaseKeyInput) supabaseKeyInput.value = cfg.key;

  if (supabaseForm) {
    supabaseForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const url = supabaseUrlInput?.value.trim() || '';
      const key = supabaseKeyInput?.value.trim() || '';
      window.AppStorage.saveSupabaseConfig(url, key);
      window.showToast('Configurações do Supabase salvas com sucesso!', 'success');
      if (supabaseStatus) {
        supabaseStatus.style.color = 'var(--accent-green)';
        supabaseStatus.textContent = 'Configuração salva!';
      }
    });
  }

  if (btnTestSupabase) {
    btnTestSupabase.addEventListener('click', async () => {
      const url = supabaseUrlInput?.value.trim() || '';
      const key = supabaseKeyInput?.value.trim() || '';
      if (!url || !key) {
        window.showToast('Preencha a URL e a Chave antes de testar.', 'error');
        return;
      }
      if (supabaseStatus) supabaseStatus.textContent = 'Testando conexão...';
      const res = await window.AppStorage.testSupabaseConnection(url, key);
      if (supabaseStatus) {
        supabaseStatus.style.color = res.success ? 'var(--accent-green)' : 'var(--accent-rose)';
        supabaseStatus.textContent = res.message;
      }
      window.showToast(res.message, res.success ? 'success' : 'error');
    });
  }

  if (btnClearSupabase) {
    btnClearSupabase.addEventListener('click', () => {
      window.AppStorage.clearSupabaseConfig();
      const defaultCfg = window.AppStorage.getSupabaseConfig();
      if (supabaseUrlInput) supabaseUrlInput.value = defaultCfg.url;
      if (supabaseKeyInput) supabaseKeyInput.value = defaultCfg.key;
      if (supabaseStatus) {
        supabaseStatus.style.color = 'var(--accent-green)';
        supabaseStatus.textContent = 'Restauradas credenciais padrão da 8April.';
      }
      window.showToast('Restauradas credenciais padrão.', 'info');
    });
  }

  // Initial Boot
  await resetForm();
  await loadHistoryTable();
});

function formatCurrency(val) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(val || 0);
}

function formatDateBR(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
