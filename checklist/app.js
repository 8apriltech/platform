const sections = [

    {
        id:"empresa",
        titulo:"Empresa",
        icon:"🏢",
        completed:false,
        component:"empresa"
    },

    {
        id:"equipe",
        titulo:"Equipe",
        icon:"👥"
    },

    {
        id:"imoveis",
        titulo:"Imóveis",
        icon:"🏠"
    },

    {
        id:"proprietarios",
        titulo:"Proprietários",
        icon:"🧑"
    },

    {
        id:"documentos",
        titulo:"Documentos",
        icon:"📄"
    },

    {
        id:"financeiro",
        titulo:"Financeiro",
        icon:"💰"
    },

    {
        id:"categorias",
        titulo:"Categorias",
        icon:"📊"
    },

    {
        id:"fluxo",
        titulo:"Fluxo",
        icon:"🔄"
    },

    {
        id:"permissoes",
        titulo:"Permissões",
        icon:"🔐"
    },

    {
        id:"identidade",
        titulo:"Identidade Visual",
        icon:"🎨"
    }

]

const onboarding = {

    empresa:{},

    equipe:[],

    imoveis:[],

    proprietarios:[],

    documentos:{},

    financeiro:{},

    categorias:{},

    fluxo:{},

    permissoes:{},

    identidade:{}

}

function renderSidebar(){

    const sidebar = document.getElementById("sidebar");

    sidebar.innerHTML = `

        <div class="logo">

            <img
                src="assets/logo.png"
                alt="8April">

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

function renderHeader(){

    const header = document.getElementById("header");

    header.innerHTML = `

        <div class="header-card">

            <div class="header-top">

                <span class="header-badge">
                    🚀 Portal de Onboarding
                </span>

            </div>

            <h1 class="header-title">
                Morada Imobiliária
            </h1>

            <p class="header-description">
                Configure sua plataforma preenchendo as informações abaixo para iniciarmos a implantação.
            </p>

            <div class="progress-info">

                <span>1 de 10 etapas concluídas</span>

                <span>10%</span>

            </div>

            <div class="progress">

                <div class="progress-bar"></div>

            </div>

        </div>

    `;

}

function renderContent() {

    const content = document.getElementById("content");

    content.innerHTML = `
    
        <h2>${getSection(currentSection).titulo}</h2>

        <br>

        <p style="color:var(--muted);">

            Conteúdo da seção ${getSection(currentSection).titulo}

        </p>

    `;

const renderers = {

    empresa: renderEmpresa,
    equipe: renderEquipe

};

const renderer = renderers[currentSection];

if (renderer) {

    content.innerHTML = renderer();

    if(currentSection === "empresa"){

        bindEmpresa();
        loadEmpresa();
        updateProgress();

    }

    if(currentSection === "equipe"){

        loadEquipe();
        bindEquipe();

    }

}

else {

    content.innerHTML = `

        <h2>${getSection(currentSection).titulo}</h2>

        <p>Em desenvolvimento...</p>

    `;

}

}

function getSection(id){

    return sections.find(section => section.id === id);

}

function changeSection(section){

    currentSection = section;


    
    renderSidebar();

    renderContent();

}

let currentSection = "empresa";

function updateProgress(){

    const totalSections = sections.length;

    let completed = 0;

    if(empresaCompleta()){

        completed++;

    }

    const percent = Math.round((completed / totalSections) * 100);

    document.querySelector(".progress-bar").style.width = `${percent}%`;

    document.querySelector(".progress-info").innerHTML = `

        <span>${completed} de ${totalSections} etapas concluídas</span>

        <span>${percent}%</span>

    `;

    renderSidebar();

}

function sectionCompleted(sectionId){

    switch(sectionId){

        case "empresa":
            return empresaCompleta();

        default:
            return false;

    }

}

renderSidebar();
renderHeader();
renderContent();