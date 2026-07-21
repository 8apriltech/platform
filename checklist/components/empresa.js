const empresaFields = [

    {
        id: "razao_social",
        label: "Razão Social",
        type: "text",
        required: true
    },

    {
        id: "nome_fantasia",
        label: "Nome Fantasia",
        type: "text"
        
    },

    {
        id: "cnpj",
        label: "CNPJ",
        type: "text",
        required: true
    },

    {
        id: "inscricao_estadual",
        label: "Inscrição Estadual",
        type: "text"
    },

    {
        id: "endereco",
        label: "Endereço Completo",
        type: "text",
        full: true
    },

    {
        id: "telefone",
        label: "Telefone Principal",
        type: "text",
        required: true
    },

    {
        id: "email",
        label: "E-mail Principal",
        type: "email",
        required: true
    }

];

function renderEmpresa(){

    return `

        <div class="section-header">

            <span class="section-badge">
                🏢 Empresa
            </span>

            <h2>Informações da Empresa</h2>

            <p class="section-description">
                Preencha as informações abaixo para iniciarmos a configuração da sua plataforma.
            </p>

        </div>

        <div class="form-grid">

            

                ${empresaFields.map(field => `
                <div class="form-group ${field.full ? "full" : ""}">
                    <label>${field.label}</label>
                    <input
                        type="${field.type}"
                        id="${field.id}"
                        autocomplete="off"
                    >
                </div>
                `).join("")}

            </div>

        </div>

        <div class="upload-area">

            <h3>Logo da Empresa</h3>

            <p>
                Arraste um arquivo PNG ou SVG ou clique para selecionar.
            </p>

            <button class="upload-button">

                Selecionar Arquivo

            </button>

        </div>

    `;

}

function bindEmpresa(){

    empresaFields.forEach(field => {

        const input = document.getElementById(field.id);

        if(!input) return;

        input.addEventListener("input", (event) => {

            onboarding.empresa[field.id] = event.target.value;

            updateProgress();

            console.log(onboarding);

        });

    });

}

function loadEmpresa(){

    empresaFields.forEach(field => {

        const input = document.getElementById(field.id);

        if(!input) return;

        input.value = onboarding.empresa[field.id] || "";

    });

}

function empresaCompleta(){

    return empresaFields
        .filter(field => field.required)
        .every(field => {

            const value = onboarding.empresa[field.id];

            return value && value.trim() !== "";

        });

}