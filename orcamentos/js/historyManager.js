/* =========================================================
   8APRIL ORÇAMENTOS - HISTORY & SEARCH MANAGEMENT
   ========================================================= */

import { fetchAllOrcamentos, deleteOrcamento } from './supabaseClient.js';
import { loadQuoteIntoForm } from './quoteManager.js';
import { renderPdfPreview } from './pdfGenerator.js';
import { formatCurrencyBRL } from './quoteManager.js';

let debounceTimer = null;

export async function initHistoryManager() {
  const searchInput = document.getElementById('history-search-input');
  
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadHistoryList(e.target.value);
      }, 300);
    });
  }

  await loadHistoryList();
}

export async function loadHistoryList(searchTerm = '') {
  const container = document.getElementById('history-grid-container');
  if (!container) return;

  container.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
      <svg class="animate-spin" width="24" height="24" fill="none" viewBox="0 0 24 24" style="margin: 0 auto 10px;">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      Carregando histórico de orçamentos...
    </div>
  `;

  try {
    const list = await fetchAllOrcamentos(searchTerm);
    renderHistoryCards(list, container);
  } catch (err) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--accent-rose);">
        Erro ao carregar histórico: ${err.message}
      </div>
    `;
  }
}

function renderHistoryCards(list, container) {
  if (!list || list.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
        <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin: 0 auto 12px; opacity: 0.4;">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p style="font-weight: 600; color: var(--text-main);">Nenhum orçamento encontrado</p>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">Crie seu primeiro orçamento na aba "Novo Orçamento".</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(item => `
    <div class="history-card">
      <div>
        <div class="history-card-header">
          <span class="history-number">${escapeHtml(item.numero)}</span>
          <span class="history-date">${formatDateBR(item.data_emissao)}</span>
        </div>
        <div class="history-client">${escapeHtml(item.cliente_nome)}</div>
        ${item.cliente_empresa ? `<div class="history-company">${escapeHtml(item.cliente_empresa)}</div>` : ''}
      </div>

      <div class="history-card-footer">
        <div class="history-total">${formatCurrencyBRL(item.valor_total)}</div>
        <div class="history-actions-group">
          <button type="button" class="btn btn-secondary btn-icon-only view-pdf-btn" data-id="${item.id}" title="Visualizar / Gerar PDF">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button type="button" class="btn btn-secondary btn-icon-only edit-quote-btn" data-id="${item.id}" title="Editar Orçamento">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button type="button" class="btn btn-danger btn-icon-only delete-quote-btn" data-id="${item.id}" data-number="${escapeHtml(item.numero)}" title="Excluir Orçamento">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  // Attach card event listeners
  container.querySelectorAll('.view-pdf-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const target = list.find(q => q.id === id);
      if (target) renderPdfPreview(target);
    };
  });

  container.querySelectorAll('.edit-quote-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const target = list.find(q => q.id === id);
      if (target) loadQuoteIntoForm(target);
    };
  });

  container.querySelectorAll('.delete-quote-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const num = btn.dataset.number;
      if (confirm(`Tem certeza que deseja excluir o orçamento ${num}?`)) {
        await deleteOrcamento(id);
        window.showToast(`Orçamento ${num} excluído.`, 'info');
        await loadHistoryList();
      }
    };
  });
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
