const equipeFields = [

    {
        id:"nome",
        label:"Nome Completo",
        type:"text",
        required:true
    },

    {
        id:"cargo",
        label:"Cargo",
        type:"text",
        required:true
    },

    {
        id:"telefone",
        label:"Telefone",
        type:"text"
    },

    {
        id:"email",
        label:"E-mail",
        type:"email"
    }

];

function renderEquipe(){

    return `

        <div class="section-header">

            <span class="section-badge">

                👥 Equipe

            </span>

            <h2>

                Equipe

            </h2>

            <p class="section-description">

                Cadastre os colaboradores que utilizarão a plataforma.

            </p>

            <button class="primary-button">

                + Adicionar Colaborador

            </button>

        </div>

        <div id="teamModal" class="modal hidden">

            <div class="modal-content">

                <h2>Novo Colaborador</h2>

                <div class="modal-grid">

                    <div class="form-group">
                        <label>Nome Completo</label>
                        <input type="text" id="colaborador_nome">
                    </div>

                    <div class="form-group">
                        <label>Cargo</label>
                        <input type="text" id="colaborador_cargo">
                    </div>

                    <div class="form-group">
                        <label>Telefone</label>
                        <input type="text" id="colaborador_telefone">
                    </div>

                    <div class="form-group">
                        <label>E-mail</label>
                        <input type="email" id="colaborador_email">
                    </div>

                </div>

                <div class="modal-actions">

                    <button
                        class="secondary-button"
                        id="btnCancelarColaborador">

                        Cancelar

                    </button>

                    <button
                        class="primary-button"
                        id="btnSalvarColaborador">

                        Salvar

                    </button>

                </div>

            </div>

        </div>
        
        <div id="team-list">

        </div>

        <div class="empty-state">

            <div class="empty-icon">

                👥

            </div>

            <h3>

                Nenhum colaborador cadastrado

            </h3>

            <p>

                Clique em <strong>Adicionar Colaborador</strong> para cadastrar a equipe que utilizará a plataforma.

            </p>

            <button id="btnAddColaborador" class="primary-button">

                + Adicionar Colaborador

            </button>

        </div>

    `;

}

function renderTeamCard(colaborador, index){

    return `

        <div class="team-card">

            <div class="team-card-header">

                <div>

                    <h3>${colaborador.nome}</h3>

                    <span>${colaborador.cargo}</span>

                </div>

            </div>

            <div class="team-card-body">

                <p>📞 ${colaborador.telefone || "-"}</p>

                <p>✉️ ${colaborador.email || "-"}</p>

            </div>

            <div class="team-card-actions">

                <button class="secondary-button">

                    ✏️ Editar

                </button>

                <button class="danger-button">

                    🗑️ Excluir

                </button>

            </div>

        </div>

    `;

}

function renderTeamList(){

    const list = document.getElementById("team-list");

    if(!list) return;

    if(onboarding.equipe.length === 0){

        list.innerHTML = "";

        return;

    }

    list.innerHTML = onboarding.equipe
        .map((colaborador, index) => renderTeamCard(colaborador, index))
        .join("");

}

function bindEquipe(){

    document
        .getElementById("btnAddColaborador")
        .addEventListener("click", openTeamModal);

    document
        .getElementById("btnCancelarColaborador")
        .addEventListener("click", closeTeamModal);

    document
        .getElementById("btnSalvarColaborador")
        .addEventListener("click", saveColaborador);

}

function loadEquipe(){

    renderTeamList();

}

function openTeamModal(){

    document
        .getElementById("teamModal")
        .classList.remove("hidden");

}

function closeTeamModal(){

    document
        .getElementById("teamModal")
        .classList.add("hidden");

}

function saveColaborador(){

    console.log("SALVAR CLICADO");
    const colaborador = {

        nome: document.getElementById("colaborador_nome").value,

        cargo: document.getElementById("colaborador_cargo").value,

        telefone: document.getElementById("colaborador_telefone").value,

        email: document.getElementById("colaborador_email").value

    };

    onboarding.equipe.push(colaborador);

    console.log(onboarding.equipe);
    
    renderTeamList();

    closeTeamModal();

    document.getElementById("colaborador_nome").value = "";
    document.getElementById("colaborador_cargo").value = "";
    document.getElementById("colaborador_telefone").value = "";
    document.getElementById("colaborador_email").value = "";

}
