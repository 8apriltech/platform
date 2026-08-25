/* =========================================================
   8APRIL ORÇAMENTOS - QUOTE FORM & CALCULATION LOGIC
   ========================================================= */

import { fetchNextSequence, saveOrcamento } from './supabaseClient.js';
import { renderPdfPreview } from './pdfGenerator.js';

let currentQuoteId = null;

export function formatCurrencyBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}

export function parseCurrencyInput(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  // Replace points and convert comma decimal separator
  const cleaned = value.toString().replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export async function initQuoteForm() {
  const form = document.getElementById('orcamento-form');
  const addRowBtn = document.getElementById('add-item-btn');
  const itemsContainer = document.getElementById('items-table-body');
  const issueDateInput = document.getElementById('data-emissao');

  // Set default issue date to today if empty
  if (issueDateInput && !issueDateInput.value) {
    const today = new Date().toISOString().split('T')[0];
    issueDateInput.value = today;
  }

  // Setup Event Listeners
  if (addRowBtn) {
    addRowBtn.addEventListener('click', () => addItemRow());
  }

  // Live calculation listener on table
  if (itemsContainer) {
    itemsContainer.addEventListener('input', (e) => {
      if (e.target.classList.contains('item-qty') || e.target.classList.contains('item-unit')) {
        recalculateTotals();
      }
    });

    itemsContainer.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.delete-row-btn');
      if (deleteBtn) {
        const row = deleteBtn.closest('tr');
        if (itemsContainer.querySelectorAll('tr').length > 1) {
          row.remove();
          recalculateTotals();
        } else {
          window.showToast('O orçamento deve possuir pelo menos 1 item.', 'info');
        }
      }
    });
  }

  // Form Submit Handler (Save Quote)
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleSaveQuote();
    });
  }

  // Preview PDF Button Handler
  const previewBtn = document.getElementById('preview-pdf-btn');
  if (previewBtn) {
    previewBtn.addEventListener('click', () => {
      const data = collectFormData();
      if (validateFormData(data)) {
        renderPdfPreview(data);
      }
    });
  }

  // Generate Auto Sequence Number if creating new
  if (!currentQuoteId) {
    await resetFormToNew();
  }
}

export async function generateNewQuoteNumber() {
  const currentYear = new Date().getFullYear();
  const nextSeq = await fetchNextSequence(currentYear);
  const formattedSeq = String(nextSeq).padStart(4, '0');
  const numberStr = `ORC-${currentYear}-${formattedSeq}`;
  
  const numInput = document.getElementById('numero-orcamento');
  if (numInput) {
    numInput.value = numberStr;
  }
  return { year: currentYear, seq: nextSeq, number: numberStr };
}

export function addItemRow(itemData = { descricao: '', quantidade: 1, valor_unitario: 0 }) {
  const tbody = document.getElementById('items-table-body');
  if (!tbody) return;

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>
      <input type="text" class="item-desc" placeholder="Ex.: Desenvolvimento de Website Responsivo" value="${escapeHtml(itemData.descricao || '')}" required />
    </td>
    <td>
      <input type="number" class="item-qty" min="1" step="1" value="${itemData.quantidade || 1}" required />
    </td>
    <td>
      <input type="number" class="item-unit" min="0" step="0.01" placeholder="0,00" value="${itemData.valor_unitario || ''}" required />
    </td>
    <td>
      <span class="item-total-text">${formatCurrencyBRL((itemData.quantidade || 1) * (itemData.valor_unitario || 0))}</span>
    </td>
    <td style="text-align: center;">
      <button type="button" class="btn btn-danger btn-icon-only delete-row-btn" title="Remover item">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </td>
  `;
  tbody.appendChild(tr);
  recalculateTotals();
}

export function recalculateTotals() {
  const rows = document.querySelectorAll('#items-table-body tr');
  let grandTotal = 0;

  rows.forEach(row => {
    const qtyInput = row.querySelector('.item-qty');
    const unitInput = row.querySelector('.item-unit');
    const totalSpan = row.querySelector('.item-total-text');

    const qty = parseFloat(qtyInput?.value) || 0;
    const unit = parseFloat(unitInput?.value) || 0;
    const lineTotal = qty * unit;

    grandTotal += lineTotal;
    if (totalSpan) {
      totalSpan.textContent = formatCurrencyBRL(lineTotal);
    }
  });

  const grandTotalEl = document.getElementById('valor-total-exibicao');
  if (grandTotalEl) {
    grandTotalEl.textContent = formatCurrencyBRL(grandTotal);
  }
  return grandTotal;
}

export function collectFormData() {
  const numberInput = document.getElementById('numero-orcamento');
  const issueDateInput = document.getElementById('data-emissao');
  const clientNameInput = document.getElementById('cliente-nome');
  const clientCompanyInput = document.getElementById('cliente-empresa');
  const validityInput = document.getElementById('validade-dias');
  const paymentTermsInput = document.getElementById('condicoes-pagamento');
  const executionPeriodInput = document.getElementById('prazo-execucao');
  const notesInput = document.getElementById('observacoes');

  const rows = document.querySelectorAll('#items-table-body tr');
  const itens = [];

  rows.forEach(row => {
    const desc = row.querySelector('.item-desc')?.value || '';
    const qty = parseFloat(row.querySelector('.item-qty')?.value) || 0;
    const unit = parseFloat(row.querySelector('.item-unit')?.value) || 0;
    const total = qty * unit;

    if (desc.trim()) {
      itens.push({
        descricao: desc.trim(),
        quantidade: qty,
        valor_unitario: unit,
        valor_total: total
      });
    }
  });

  const numParts = (numberInput?.value || '').split('-');
  const year = numParts.length >= 2 ? parseInt(numParts[1], 10) : new Date().getFullYear();
  const seq = numParts.length >= 3 ? parseInt(numParts[2], 10) : 1;

  return {
    id: currentQuoteId,
    numero: numberInput?.value || '',
    sequencial: seq,
    ano: year,
    data_emissao: issueDateInput?.value || new Date().toISOString().split('T')[0],
    cliente_nome: clientNameInput?.value.trim() || '',
    cliente_empresa: clientCompanyInput?.value.trim() || '',
    validade_dias: parseInt(validityInput?.value, 10) || 15,
    condicoes_pagamento: paymentTermsInput?.value.trim() || '',
    prazo_execucao: executionPeriodInput?.value.trim() || '',
    observacoes: notesInput?.value.trim() || '',
    valor_total: recalculateTotals(),
    itens: itens
  };
}

export function validateFormData(data) {
  if (!data.cliente_nome) {
    window.showToast('Por favor, informe o nome do cliente.', 'error');
    document.getElementById('cliente-nome')?.focus();
    return false;
  }
  if (!data.itens || data.itens.length === 0) {
    window.showToast('Adicione pelo menos um item válido ao orçamento.', 'error');
    return false;
  }
  return true;
}

export async function handleSaveQuote() {
  const data = collectFormData();
  if (!validateFormData(data)) return;

  const saveBtn = document.getElementById('save-quote-btn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = `
      <svg class="animate-spin" width="18" height="18" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      Salvando...
    `;
  }

  try {
    const result = await saveOrcamento(data);
    if (result.success) {
      currentQuoteId = result.data.id;
      window.showToast('Orçamento salvo com sucesso!', 'success');
      // Automatically open PDF Preview after saving
      renderPdfPreview(result.data);
    }
  } catch (err) {
    window.showToast('Erro ao salvar orçamento: ' + err.message, 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
        Salvar Orçamento
      `;
    }
  }
}

export async function resetFormToNew() {
  currentQuoteId = null;
  const form = document.getElementById('orcamento-form');
  if (form) form.reset();

  const tbody = document.getElementById('items-table-body');
  if (tbody) tbody.innerHTML = '';

  const issueDateInput = document.getElementById('data-emissao');
  if (issueDateInput) {
    issueDateInput.value = new Date().toISOString().split('T')[0];
  }

  await generateNewQuoteNumber();
  addItemRow({ descricao: '', quantidade: 1, valor_unitario: 0 });

  // Update header subtitle
  const titleEl = document.getElementById('form-page-subtitle');
  if (titleEl) titleEl.textContent = 'Preencha os campos abaixo para gerar um novo orçamento';
}

export function loadQuoteIntoForm(orcamento) {
  currentQuoteId = orcamento.id;
  
  document.getElementById('numero-orcamento').value = orcamento.numero || '';
  document.getElementById('data-emissao').value = orcamento.data_emissao || new Date().toISOString().split('T')[0];
  document.getElementById('cliente-nome').value = orcamento.cliente_nome || '';
  document.getElementById('cliente-empresa').value = orcamento.cliente_empresa || '';
  document.getElementById('validade-dias').value = orcamento.validade_dias || 15;
  document.getElementById('condicoes-pagamento').value = orcamento.condicoes_pagamento || '';
  document.getElementById('prazo-execucao').value = orcamento.prazo_execucao || '';
  document.getElementById('observacoes').value = orcamento.observacoes || '';

  const tbody = document.getElementById('items-table-body');
  if (tbody) {
    tbody.innerHTML = '';
    if (orcamento.itens && Array.isArray(orcamento.itens) && orcamento.itens.length > 0) {
      orcamento.itens.forEach(item => addItemRow(item));
    } else {
      addItemRow();
    }
  }

  const titleEl = document.getElementById('form-page-subtitle');
  if (titleEl) titleEl.textContent = `Editando Orçamento ${orcamento.numero}`;

  // Switch tab to form
  window.switchTab('form-view');
  window.showToast(`Orçamento ${orcamento.numero} carregado para edição.`, 'info');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
