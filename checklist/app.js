const sections = [
    { id: "empresa", titulo: "Empresa", icon: "🏢", completed: false },
    { id: "equipe", titulo: "Equipe", icon: "👥", completed: false },
    { id: "imoveis", titulo: "Imóveis", icon: "🏠", completed: false },
    { id: "proprietarios", titulo: "Proprietários", icon: "🧑", completed: false },
    { id: "documentos", titulo: "Documentos", icon: "📄", completed: false },
    { id: "financeiro", titulo: "Financeiro", icon: "💰", completed: false },
    { id: "categorias", titulo: "Categorias", icon: "📊", completed: false },
    { id: "fluxo", titulo: "Fluxo", icon: "🔄", completed: false },
    { id: "permissoes", titulo: "Permissões", icon: "🔐", completed: false },
    { id: "identidade", titulo: "Identidade Visual", icon: "🎨", completed: false }
];

const onboarding = {
    empresa: {},
    equipe: [],
    imoveis: [],
    proprietarios: [],
    documentos: {},
    financeiro: {},
    categorias: { receitas: [], despesas: [] },
    fluxo: {},
    permissoes: {},
    identidade: {}
};

let currentSection = "empresa";

function renderSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;

    sidebar.innerHTML = `
        <div class="logo">
            <img src="assets/logo.png" alt="8April" onerror="this.style.display='none'">
            <h3>Portal de Onboarding</h3>
        </div>
        <nav>
            ${sections.map(section => `
                <div
                    class="menu-item ${section.id === currentSection ? "active" : ""}"
                    onclick="changeSection('${section.id}')"
                >
                    <span>
                        ${sectionCompleted(section.id) ? "✅" : section.icon}
                    </span>
                    <span>
                        ${section.titulo}
                    </span>
                </div>
            `).join("")}
        </nav>
    `;
}

function renderHeader() {
    const header = document.getElementById("header");
    if (!header) return;

    const totalSections = sections.length;
    let completedCount = 0;
    sections.forEach(s => {
        if (sectionCompleted(s.id)) completedCount++;
    });

    const percent = Math.round((completedCount / totalSections) * 100);

    header.innerHTML = `
        <div class="header-card">
            <div class="header-top">
                <span class="header-badge">🚀 Portal de Onboarding</span>
            </div>
            <h1 class="header-title">Morada Imobiliária</h1>
            <p class="header-description">
                Configure sua plataforma preenchendo as informações abaixo para iniciarmos a implantação.
            </p>
            <div class="progress-info">
                <span>${completedCount} de ${totalSections} etapas concluídas</span>
                <span>${percent}%</span>
            </div>
            <div class="progress">
                <div class="progress-bar" style="width: ${percent}%"></div>
            </div>
        </div>
    `;
}

function renderContent() {
    const content = document.getElementById("content");
    if (!content) return;

    const renderers = {
        empresa: typeof renderEmpresa === "function" ? renderEmpresa : null,
        equipe: typeof renderEquipe === "function" ? renderEquipe : null,
        categorias: renderCategorias
    };

    const renderer = renderers[currentSection];

    if (renderer) {
        content.innerHTML = renderer();

        if (currentSection === "empresa" && typeof bindEmpresa === "function") {
            bindEmpresa();
            if (typeof loadEmpresa === "function") loadEmpresa();
            updateProgress();
        }
        if (currentSection === "equipe" && typeof bindEquipe === "function") {
            if (typeof loadEquipe === "function") loadEquipe();
            bindEquipe();
        }
        if (currentSection === "categorias") {
            bindCategorias();
        }
    } else {
        content.innerHTML = `
            <h2>${getSection(currentSection).titulo}</h2>
            <br>
            <p style="color:var(--muted, #94a3b8);">
                Conteúdo da seção ${getSection(currentSection).titulo} em desenvolvimento...
            </p>
        `;
    }
}

// Renderização segura do componente de Categorias Financeiras
function renderCategorias() {
    // Inicialização defensiva garantindo que os arrays existam
    if (!onboarding.categorias) onboarding.categorias = { receitas: [], despesas: [] };
    if (!Array.isArray(onboarding.categorias.receitas)) onboarding.categorias.receitas = [];
    if (!Array.isArray(onboarding.categorias.despesas)) onboarding.categorias.despesas = [];

    // Carrega padrões caso esteja vazio
    if (onboarding.categorias.receitas.length === 0 && onboarding.categorias.despesas.length === 0) {
        onboarding.categorias.receitas = [
            "Comissão de Venda - Exclusivo",
            "Comissão de Venda - Compartilhado",
            "Comissão de Locação - Primeiro Aluguel",
            "Taxa de Administração de Aluguel"
        ];
        onboarding.categorias.despesas = [
            "Comissão de Corretor Parcerias",
            "Marketing Digital e Tráfego Pago",
            "Fotografia Profissional de Imóveis",
            "Assinatura de Portais Imobiliários"
        ];
    }

    return `
        <h2>Categorias Financeiras</h2>
        <p style="color:var(--muted, #94a3b8); margin-bottom: 20px;">
            Gerencie as categorias de receita e despesa para o plano de contas.
        </p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
            <!-- Receitas -->
            <div class="card-categorias">
                <h4 style="color:#22c55e;">📈 Categorias de Receita</h4>
                <div style="display:flex; gap:8px; margin: 15px 0;">
                    <input type="text" id="inputNewRevenue" placeholder="Nova receita..." style="flex:1; padding:8px; border-radius:6px; border:1px solid #334155; background:#0f172a; color:#fff;">
                    <button onclick="addCategoriaItem('receitas')" style="padding:8px 12px; background:#22c55e; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">+</button>
                </div>
                <ul id="listReceitas" style="list-style:none; padding:0;">
                    ${onboarding.categorias.receitas.map((item, idx) => `
                        <li style="display:flex; justify-content:space-between; padding:8px; background:#020617; margin-bottom:6px; border-radius:6px; font-size:13px;">
                            <span>${item}</span>
                            <span onclick="removeCategoriaItem('receitas', ${idx})" style="color:#f43f5e; cursor:pointer; font-weight:bold;">✕</span>
                        </li>
                    `).join('')}
                </ul>
            </div>

            <!-- Despesas -->
            <div class="card-categorias">
                <h4 style="color:#f43f5e;">📉 Categorias de Despesa</h4>
                <div style="display:flex; gap:8px; margin: 15px 0;">
                    <input type="text" id="inputNewExpense" placeholder="Nova despesa..." style="flex:1; padding:8px; border-radius:6px; border:1px solid #334155; background:#0f172a; color:#fff;">
                    <button onclick="addCategoriaItem('despesas')" style="padding:8px 12px; background:#f43f5e; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">+</button>
                </div>
                <ul id="listDespesas" style="list-style:none; padding:0;">
                    ${onboarding.categorias.despesas.map((item, idx) => `
                        <li style="display:flex; justify-content:space-between; padding:8px; background:#020617; margin-bottom:6px; border-radius:6px; font-size:13px;">
                            <span>${item}</span>
                            <span onclick="removeCategoriaItem('despesas', ${idx})" style="color:#f43f5e; cursor:pointer; font-weight:bold;">✕</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `;
}

function bindCategorias() {
    // Binds de eventos adicionais se necessário
}

function addCategoriaItem(type) {
    const inputId = type === 'receitas' ? 'inputNewRevenue' : 'inputNewExpense';
    const input = document.getElementById(inputId);
    if (!input) return;

    const val = input.value.trim();
    if (!val) return;

    if (!onboarding.categorias) onboarding.categorias = { receitas: [], despesas: [] };
    if (!Array.isArray(onboarding.categorias[type])) onboarding.categorias[type] = [];

    onboarding.categorias[type].push(val);
    renderContent();
    updateProgress();
}

function removeCategoriaItem(type, index) {
    if (!onboarding.categorias || !Array.isArray(onboarding.categorias[type])) return;
    onboarding.categorias[type].splice(index, 1);
    renderContent();
    updateProgress();
}

function getSection(id) {
    return sections.find(section => section.id === id) || { titulo: id };
}

function changeSection(section) {
    currentSection = section;
    renderSidebar();
    renderContent();
}

function updateProgress() {
    const totalSections = sections.length;
    let completed = 0;

    sections.forEach(s => {
        if (sectionCompleted(s.id)) completed++;
    });

    const percent = Math.round((completed / totalSections) * 100);

    const progressBar = document.querySelector(".progress-bar");
    if (progressBar) progressBar.style.width = `${percent}%`;

    const progressInfo = document.querySelector(".progress-info");
    if (progressInfo) {
        progressInfo.innerHTML = `
            <span>${completed} de ${totalSections} etapas concluídas</span>
            <span>${percent}%</span>
        `;
    }

    renderSidebar();
}

function sectionCompleted(sectionId) {
    switch (sectionId) {
        case "empresa":
            return typeof empresaCompleta === "function" ? empresaCompleta() : false;
        case "categorias":
            const rec = onboarding.categorias?.receitas || [];
            const desp = onboarding.categorias?.despesas || [];
            return rec.length > 0 && desp.length > 0;
        default:
            return false;
    }
}

// Inicialização da aplicação
document.addEventListener("DOMContentLoaded", () => {
    renderSidebar();
    renderHeader();
    renderContent();
});
