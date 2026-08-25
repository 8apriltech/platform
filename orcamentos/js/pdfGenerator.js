/* =========================================================
   8APRIL ORÇAMENTOS - A4 PDF PREVIEW & GENERATION LOGIC
   ========================================================= */

import { formatCurrencyBRL } from './quoteManager.js';

export function buildA4DocumentHtml(orcamento) {
  const formattedDate = formatDateBR(orcamento.data_emissao);
  
  const itemsRowsHtml = (orcamento.itens || []).map(item => `
    <tr>
      <td>${escapeHtml(item.descricao)}</td>
      <td class="text-center">${item.quantidade}</td>
      <td class="text-right">${formatCurrencyBRL(item.valor_unitario)}</td>
      <td class="text-right font-bold">${formatCurrencyBRL(item.valor_total)}</td>
    </tr>
  `).join('');

  const validityText = orcamento.validade_dias 
    ? `${orcamento.validade_dias} dias a partir da data de emissão`
    : '15 dias';

  return `
    <div class="a4-document" id="pdf-export-container">
      <div class="pdf-content-wrapper">
        <!-- Header -->
        <div class="pdf-header">
          <div class="pdf-brand">
            <img src="./assets/logo-8april.svg" alt="8April Soluções Digitais" />
          </div>
          <div class="pdf-meta-box">
            <div class="pdf-orcamento-number">${escapeHtml(orcamento.numero || 'ORC-2026-0000')}</div>
            <div class="pdf-orcamento-date">Data de Emissão: <strong>${formattedDate}</strong></div>
          </div>
        </div>

        <!-- Client & Quote Overview -->
        <div class="pdf-section">
          <div class="pdf-info-grid">
            <div class="pdf-info-block">
              <label>Cliente</label>
              <p>${escapeHtml(orcamento.cliente_nome || 'N/A')}</p>
            </div>
            ${orcamento.cliente_empresa ? `
              <div class="pdf-info-block">
                <label>Empresa</label>
                <p>${escapeHtml(orcamento.cliente_empresa)}</p>
              </div>
            ` : `
              <div class="pdf-info-block">
                <label>Validade do Orçamento</label>
                <p>${validityText}</p>
              </div>
            `}
            ${orcamento.cliente_empresa ? `
              <div class="pdf-info-block">
                <label>Validade do Orçamento</label>
                <p>${validityText}</p>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Items Table -->
        <div class="pdf-section">
          <table class="pdf-table">
            <thead>
              <tr>
                <th style="width: 45%;">Descrição dos Serviços / Produtos</th>
                <th style="width: 15%; text-align: center;">Qtd</th>
                <th style="width: 20%; text-align: right;">Valor Unit.</th>
                <th style="width: 20%; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRowsHtml || '<tr><td colspan="4" class="text-center">Nenhum item informado</td></tr>'}
            </tbody>
          </table>
        </div>

        <!-- Grand Total -->
        <div class="pdf-total-container">
          <div class="pdf-total-box">
            <span class="pdf-total-label">Valor Total do Orçamento</span>
            <span class="pdf-total-val">${formatCurrencyBRL(orcamento.valor_total)}</span>
          </div>
        </div>

        <!-- Payment & Timeline Details -->
        ${orcamento.condicoes_pagamento ? `
          <div class="pdf-details-block">
            <div class="pdf-details-title">💳 Condições de Pagamento</div>
            <div class="pdf-details-content">${escapeHtml(orcamento.condicoes_pagamento)}</div>
          </div>
        ` : ''}

        ${orcamento.prazo_execucao ? `
          <div class="pdf-details-block">
            <div class="pdf-details-title">⏱️ Prazo de Execução / Entrega</div>
            <div class="pdf-details-content">${escapeHtml(orcamento.prazo_execucao)}</div>
          </div>
        ` : ''}

        ${orcamento.observacoes ? `
          <div class="pdf-details-block">
            <div class="pdf-details-title">📌 Observações</div>
            <div class="pdf-details-content">${escapeHtml(orcamento.observacoes)}</div>
          </div>
        ` : ''}
      </div>

      <!-- Footer -->
      <div class="pdf-footer">
        <div class="pdf-footer-msg">Em caso de dúvidas ou solicitações, gentileza entrar em contato conosco.</div>
        <a href="https://wa.me/5534998039530" target="_blank" rel="noopener noreferrer" class="pdf-whatsapp-btn">
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
          Entrar em Contato via WhatsApp
        </a>
      </div>
    </div>
  `;
}

export function renderPdfPreview(orcamento) {
  const modal = document.getElementById('pdf-preview-modal');
  const modalBody = document.getElementById('pdf-preview-body');

  if (modalBody) {
    modalBody.innerHTML = buildA4DocumentHtml(orcamento);
  }

  if (modal) {
    modal.classList.add('open');
  }

  // Setup print and download actions
  const printBtn = document.getElementById('modal-print-btn');
  const downloadBtn = document.getElementById('modal-download-btn');

  if (printBtn) {
    printBtn.onclick = () => window.print();
  }

  if (downloadBtn) {
    downloadBtn.onclick = () => downloadPdfFile(orcamento);
  }
}

export function downloadPdfFile(orcamento) {
  const element = document.getElementById('pdf-export-container');
  if (!element) return;

  const filename = `${orcamento.numero || 'Orcamento'}_8April.pdf`;

  window.showToast('Gerando arquivo PDF...', 'info');

  if (window.html2pdf) {
    const opt = {
      margin:       0,
      filename:     filename,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    window.html2pdf().set(opt).from(element).save().then(() => {
      window.showToast('Download do PDF concluído!', 'success');
    }).catch(err => {
      console.warn('Erro html2pdf, disparando impressão nativa:', err);
      window.print();
    });
  } else {
    // Fallback to native print if html2pdf library not loaded
    window.print();
  }
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
