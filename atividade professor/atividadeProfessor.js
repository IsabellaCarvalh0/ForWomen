/* ==========================================================================
   FOR WOMEN — GERENCIADOR DE ATIVIDADES DO PROFESSOR (JAVASCRIPT)
   Criação, Edição, Exclusão e Listagem de Atividades
   ========================================================================== */

const STORAGE_ATIVIDADES = "forwomen_atividades";
const STORAGE_ENTREGAS = "forwomen_entregas";

const ATIVIDADES_PADRAO = [
    {
        id: 1,
        titulo: "Introdução à Programação",
        descricao: "Resolva os exercícios sobre lógica de programação, variáveis e estruturas condicionais em JavaScript.",
        professor: "Pierre Vinícius",
        prazo: "2026-08-30",
        prazoFormatado: "30/08/2026",
        material: "https://developer.mozilla.org/pt-BR/docs/Web/JavaScript",
        instrucoes: "Implemente as funções solicitadas no arquivo exercicios.js e envie o link do seu repositório no GitHub ou faça o upload do arquivo com a resolução."
    },
    {
        id: 2,
        titulo: "Criando uma página com CSS",
        descricao: "Desenvolva uma página utilizando HTML e CSS seguindo os conceitos de semântica e estilização apresentados em aula.",
        professor: "Isabella Carvalho",
        prazo: "2026-09-02",
        prazoFormatado: "02/09/2026",
        material: "https://developer.mozilla.org/pt-BR/docs/Learn/CSS",
        instrucoes: "Crie a estrutura básica com tags semânticas (<nav>, <main>, <section>, <footer>) e aplique cores, fontes e espaçamentos adequados."
    },
    {
        id: 3,
        titulo: "Exercícios de Flexbox",
        descricao: "Pratique a utilização de Flexbox criando diferentes layouts para uma página responsiva e moderna.",
        professor: "Isabella Carvalho",
        prazo: "2026-08-25",
        prazoFormatado: "25/08/2026",
        material: "https://css-tricks.com/snippets/css/a-guide-to-flexbox/",
        instrucoes: "Utilize display: flex, justify-content, align-items e flex-wrap para organizar os cards da página."
    }
];

let idParaExcluir = null;

// --------------------------------------------------------------------------
// INICIALIZAÇÃO
// --------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", function () {
    inicializarStorage();
    renderizarPainel();
    configurarEventos();
});

function inicializarStorage() {
    if (!localStorage.getItem(STORAGE_ATIVIDADES)) {
        localStorage.setItem(STORAGE_ATIVIDADES, JSON.stringify(ATIVIDADES_PADRAO));
    }
}

function obterAtividades() {
    try {
        const dados = localStorage.getItem(STORAGE_ATIVIDADES);
        return dados ? JSON.parse(dados) : ATIVIDADES_PADRAO;
    } catch (e) {
        console.error("Erro ao ler atividades:", e);
        return ATIVIDADES_PADRAO;
    }
}

function salvarListaAtividades(lista) {
    localStorage.setItem(STORAGE_ATIVIDADES, JSON.stringify(lista));
}

function obterEntregas() {
    try {
        const dados = localStorage.getItem(STORAGE_ENTREGAS);
        return dados ? JSON.parse(dados) : {};
    } catch (e) {
        console.error("Erro ao ler entregas:", e);
        return {};
    }
}

// --------------------------------------------------------------------------
// RENDERIZAÇÃO DO PAINEL
// --------------------------------------------------------------------------

function renderizarPainel() {
    const lista = obterAtividades();
    const entregas = obterEntregas();
    const container = document.getElementById("tabelaAtividades");
    const termoBusca = (document.getElementById("campoBusca")?.value || "").toLowerCase().trim();
    const semAtividades = document.getElementById("semAtividadesProf");
    const contadorListadas = document.getElementById("contadorListadas");

    if (!container) return;

    container.innerHTML = "";
    let visiveis = 0;
    const professoresSet = new Set();

    lista.forEach(function (atv) {
        if (atv.professor) {
            professoresSet.add(atv.professor.trim());
        }

        // Filtro de busca
        if (termoBusca) {
            const matchTitulo = atv.titulo.toLowerCase().includes(termoBusca);
            const matchDesc = atv.descricao.toLowerCase().includes(termoBusca);
            const matchProf = atv.professor.toLowerCase().includes(termoBusca);
            if (!matchTitulo && !matchDesc && !matchProf) return;
        }

        visiveis++;

        const card = document.createElement("article");
        card.className = "card-professor";
        card.dataset.id = atv.id;

        const prazoFormatado = atv.prazoFormatado || formatarData(atv.prazo);
        const temEntrega = !!entregas[String(atv.id)];

        card.innerHTML = `
            <div class="card-professor-conteudo">
                <div class="card-professor-header">
                    <h3>${escapeHtml(atv.titulo)}</h3>
                    <span class="prazo-tag">📅 Entrega: ${prazoFormatado}</span>
                    ${temEntrega ? `<span class="badge-contador" style="background:#E4F6E9; color:#2E7D47;">✓ Possui entrega</span>` : ""}
                </div>

                <p class="card-professor-desc">${escapeHtml(atv.descricao)}</p>

                <div class="card-professor-meta">
                    <span>👩‍🏫 Responsável: <strong>${escapeHtml(atv.professor)}</strong></span>
                    ${atv.material ? `<span class="meta-link">🔗 Material de apoio disponível</span>` : ""}
                </div>
            </div>

            <div class="card-professor-acoes">
                <button type="button" class="btn-acao btn-editar" onclick="abrirModalEditar(${atv.id})" title="Editar atividade">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Editar
                </button>
                <button type="button" class="btn-acao btn-excluir" onclick="confirmarExclusao(${atv.id})" title="Excluir atividade">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Excluir
                </button>
            </div>
        `;

        container.appendChild(card);
    });

    // Atualiza contadores e estatísticas
    const totalEntregas = Object.keys(entregas).length;
    document.getElementById("statTotalAtividades").textContent = lista.length;
    document.getElementById("statProfessores").textContent = professoresSet.size || "1";
    document.getElementById("statTotalEntregas").textContent = totalEntregas;

    if (contadorListadas) {
        contadorListadas.textContent = `${visiveis} ${visiveis === 1 ? "atividade" : "atividades"}`;
    }

    if (semAtividades) {
        semAtividades.style.display = visiveis === 0 ? "block" : "none";
    }
}

// --------------------------------------------------------------------------
// CRIAR E EDITAR ATIVIDADE
// --------------------------------------------------------------------------

function abrirModalCriar() {
    fecharModais();

    document.getElementById("formAtividade").reset();
    document.getElementById("atividadeId").value = "";
    document.getElementById("modalFormSubtitulo").textContent = "Cadastro de Tarefa";
    document.getElementById("modalFormTitulo").textContent = "Nova Atividade";
    document.getElementById("btnSalvarAtividade").textContent = "Criar Atividade";

    // Sugere professor padrão e data atual + 7 dias
    document.getElementById("professorResponsavel").value = "Isabella Carvalho";
    const dataFutura = new Date();
    dataFutura.setDate(dataFutura.getDate() + 7);
    document.getElementById("prazoEntrega").value = dataFutura.toISOString().split("T")[0];

    abrirModal("modalFormAtividade");
}

function abrirModalEditar(id) {
    const lista = obterAtividades();
    const atv = lista.find(item => item.id === Number(id));
    if (!atv) return;

    fecharModais();

    document.getElementById("atividadeId").value = atv.id;
    document.getElementById("modalFormSubtitulo").textContent = "Edição de Tarefa";
    document.getElementById("modalFormTitulo").textContent = "Editar Atividade";
    document.getElementById("btnSalvarAtividade").textContent = "Salvar Alterações";

    document.getElementById("tituloAtividade").value = atv.titulo || "";
    document.getElementById("professorResponsavel").value = atv.professor || "";
    document.getElementById("descricaoAtividade").value = atv.descricao || "";
    document.getElementById("instrucoesAtividade").value = atv.instrucoes || "";
    document.getElementById("materialApoio").value = atv.material || "";

    // Converte prazo para formato YYYY-MM-DD
    let prazoFormatadoInput = atv.prazo || "";
    if (prazoFormatadoInput.includes("/")) {
        const partes = prazoFormatadoInput.split("/");
        if (partes.length === 3) {
            prazoFormatadoInput = `${partes[2]}-${partes[1]}-${partes[0]}`;
        }
    }
    document.getElementById("prazoEntrega").value = prazoFormatadoInput;

    abrirModal("modalFormAtividade");
}

function salvarAtividade(event) {
    event.preventDefault();

    const idInput = document.getElementById("atividadeId").value;
    const titulo = document.getElementById("tituloAtividade").value.trim();
    const professor = document.getElementById("professorResponsavel").value.trim();
    const prazoRaw = document.getElementById("prazoEntrega").value;
    const descricao = document.getElementById("descricaoAtividade").value.trim();
    const instrucoes = document.getElementById("instrucoesAtividade").value.trim();
    const material = document.getElementById("materialApoio").value.trim();

    if (!titulo || !professor || !prazoRaw || !descricao) {
        mostrarToast("Por favor, preencha todos os campos obrigatórios (*)");
        return;
    }

    const prazoFormatado = formatarData(prazoRaw);
    let lista = obterAtividades();

    if (idInput) {
        // MODO EDIÇÃO
        const index = lista.findIndex(item => item.id === Number(idInput));
        if (index !== -1) {
            lista[index] = {
                ...lista[index],
                titulo,
                professor,
                prazo: prazoRaw,
                prazoFormatado,
                descricao,
                instrucoes,
                material
            };
            salvarListaAtividades(lista);
            mostrarToast("Atividade atualizada com sucesso! ✨");
        }
    } else {
        // MODO CRIAÇÃO
        const novoId = lista.length > 0 ? Math.max(...lista.map(i => Number(i.id) || 0)) + 1 : 1;
        const novaAtividade = {
            id: novoId,
            titulo,
            professor,
            prazo: prazoRaw,
            prazoFormatado,
            descricao,
            instrucoes: instrucoes || "Siga as orientações passadas em aula e entregue a tarefa no prazo.",
            material: material || ""
        };
        lista.push(novaAtividade);
        salvarListaAtividades(lista);
        mostrarToast("Atividade criada com sucesso! 🚀");
    }

    fecharModais();
    renderizarPainel();
}

// --------------------------------------------------------------------------
// EXCLUSÃO DE ATIVIDADE
// --------------------------------------------------------------------------

function confirmarExclusao(id) {
    const lista = obterAtividades();
    const atv = lista.find(item => item.id === Number(id));
    if (!atv) return;

    idParaExcluir = atv.id;
    document.getElementById("nomeAtividadeExcluir").textContent = `"${atv.titulo}"`;

    abrirModal("modalExcluir");
}

function executarExclusao() {
    if (!idParaExcluir) return;

    let lista = obterAtividades();
    lista = lista.filter(item => item.id !== Number(idParaExcluir));
    salvarListaAtividades(lista);

    // Opcional: limpa entregas associadas
    const entregas = obterEntregas();
    if (entregas[String(idParaExcluir)]) {
        delete entregas[String(idParaExcluir)];
        localStorage.setItem(STORAGE_ENTREGAS, JSON.stringify(entregas));
    }

    idParaExcluir = null;
    fecharModais();
    renderizarPainel();
    mostrarToast("Atividade excluída com sucesso.");
}

// --------------------------------------------------------------------------
// CONTROLE DE MODAIS E NOTIFICAÇÃO
// --------------------------------------------------------------------------

function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add("ativo");
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }
}

function fecharModais() {
    const modais = document.querySelectorAll(".modal-backdrop");
    modais.forEach(modal => {
        modal.classList.remove("ativo");
        modal.setAttribute("aria-hidden", "true");
    });
    document.body.style.overflow = "";
}

function mostrarToast(mensagem) {
    const toast = document.getElementById("toastNotificacao");
    if (!toast) return;

    toast.textContent = mensagem;
    toast.classList.add("visivel");

    setTimeout(function () {
        toast.classList.remove("visivel");
    }, 4000);
}

// --------------------------------------------------------------------------
// CONFIGURAÇÃO DE EVENTOS
// --------------------------------------------------------------------------

function configurarEventos() {
    // Fechar ao clicar no backdrop
    document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
        backdrop.addEventListener("click", function (e) {
            if (e.target === this) fecharModais();
        });
    });

    // Fechar ao apertar Esc
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") fecharModais();
    });

    // Busca
    const campoBusca = document.getElementById("campoBusca");
    if (campoBusca) {
        campoBusca.addEventListener("input", function () {
            renderizarPainel();
        });
    }

    // Sincronização em tempo real entre abas
    window.addEventListener("storage", function (e) {
        if (e.key === STORAGE_ATIVIDADES || e.key === STORAGE_ENTREGAS) {
            renderizarPainel();
        }
    });
}

// --------------------------------------------------------------------------
// FUNÇÕES AUXILIARES
// --------------------------------------------------------------------------

function formatarData(dataString) {
    if (!dataString) return "-";
    if (dataString.includes("/")) return dataString;
    const partes = dataString.split("-");
    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataString;
}

function escapeHtml(texto) {
    if (!texto) return "";
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
