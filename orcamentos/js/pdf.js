/* =========================================================
   8APRIL ORÇAMENTOS - A4 PDF PREVIEW & DOWNLOAD ENGINE
   ========================================================= */

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

function populatePdfTemplate(orcamento) {
  // 1. Meta fields
  document.getElementById('pdf-num-orcamento').textContent = orcamento.numero || 'ORC-2026-0001';
  document.getElementById('pdf-data-emissao').textContent = formatDateBR(orcamento.data_emissao);
  document.getElementById('pdf-validade').textContent = orcamento.validade_orcamento || '15 dias';

  // 2. Client Info
  document.getElementById('pdf-cliente-nome').textContent = orcamento.cliente_nome || '-';

  const empresaWrapper = document.getElementById('pdf-empresa-wrapper');
  if (orcamento.cliente_empresa && orcamento.cliente_empresa.trim()) {
    document.getElementById('pdf-cliente-empresa').textContent = orcamento.cliente_empresa;
    if (empresaWrapper) empresaWrapper.style.display = 'block';
  } else {
    if (empresaWrapper) empresaWrapper.style.display = 'none';
  }

  const prazoWrapper = document.getElementById('pdf-prazo-wrapper');
  if (orcamento.prazo_execucao && orcamento.prazo_execucao.trim()) {
    document.getElementById('pdf-prazo-execucao').textContent = orcamento.prazo_execucao;
    if (prazoWrapper) prazoWrapper.style.display = 'block';
  } else {
    if (prazoWrapper) prazoWrapper.style.display = 'none';
  }

  // 3. Items Table
  const tbody = document.getElementById('pdf-itens-tbody');
  tbody.innerHTML = '';

  if (orcamento.itens && Array.isArray(orcamento.itens) && orcamento.itens.length > 0) {
    orcamento.itens.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${escapeHtml(item.descricao)}</td>
        <td class="text-center">${item.quantidade}</td>
        <td class="text-right">${formatCurrency(item.valor_unitario)}</td>
        <td class="text-right bold">${formatCurrency(item.valor_total)}</td>
      `;
      tbody.appendChild(tr);
    });
  } else {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum item informado</td></tr>';
  }

  // 4. Grand Total
  document.getElementById('pdf-valor-total').textContent = formatCurrency(orcamento.valor_total);

  // 5. Conditions & Notes
  const condWrapper = document.getElementById('pdf-cond-wrapper');
  if (orcamento.condicoes_pagamento && orcamento.condicoes_pagamento.trim()) {
    document.getElementById('pdf-condicoes').textContent = orcamento.condicoes_pagamento;
    if (condWrapper) condWrapper.style.display = 'block';
  } else {
    if (condWrapper) condWrapper.style.display = 'none';
  }

  const obsWrapper = document.getElementById('pdf-obs-wrapper');
  if (orcamento.observacoes && orcamento.observacoes.trim()) {
    document.getElementById('pdf-observacoes').textContent = orcamento.observacoes;
    if (obsWrapper) obsWrapper.style.display = 'block';
  } else {
    if (obsWrapper) obsWrapper.style.display = 'none';
  }
}

function openPdfModal(orcamento) {
  populatePdfTemplate(orcamento);
  const modal = document.getElementById('pdf-modal');
  if (modal) modal.classList.add('open');
  
  if (window.lucide) window.lucide.createIcons();
}

function closePdfModal() {
  const modal = document.getElementById('pdf-modal');
  if (modal) modal.classList.remove('open');
}

function downloadPdfA4(filename = 'Orcamento_8April.pdf') {
  const element = document.getElementById('pdf-template');
  if (!element) return;

  if (window.showToast) window.showToast('Gerando arquivo PDF A4...', 'info');

  if (window.html2pdf) {
    const opt = {
      margin:       0,
      filename:     filename,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2.5, 
        useCORS: true, 
        logging: false,
        scrollY: 0,
        scrollX: 0
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    window.html2pdf().set(opt).from(element).save().then(() => {
      if (window.showToast) window.showToast('PDF baixado com sucesso!', 'success');
    }).catch(err => {
      console.warn('Erro html2pdf, acionando impressão nativa:', err);
      window.print();
    });
  } else {
    window.print();
  }
}

function openWhatsAppContact(numOrcamento, clienteNome) {
  const text = encodeURIComponent(`Olá, 8April! Gostaria de falar sobre o orçamento ${numOrcamento || ''} do cliente ${clienteNome || ''}.`);
  const url = `https://wa.me/5534998039530?text=${text}`;
  window.open(url, '_blank');
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.AppPdf = {
  populatePdfTemplate,
  openPdfModal,
  closePdfModal,
  downloadPdfA4,
  openWhatsAppContact
};
