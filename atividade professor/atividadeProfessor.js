/* ==========================================================================
   FOR WOMEN — GERENCIADOR DE ATIVIDADES DO PROFESSOR (JAVASCRIPT)
   Criação, Edição, Exclusão e Listagem de Atividades
   ========================================================================== */

let atividadesBanco = [];
let entregasBanco = {};

let idParaExcluir = null;
let professorLogadoNome = "Pierre Vinícius";

// --------------------------------------------------------------------------
// INICIALIZAÇÃO
// --------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", function () {
    configurarEventos();
    requisitar("/api/usuario").then(u => { professorLogadoNome = u.nome; }).catch(erro => mostrarToast(erro.message));
    renderizarPainel();
    carregarDados();
    window.addEventListener("focus", carregarDados);
});

async function requisitar(url, opcoes) {
    const resposta = await fetch(url, opcoes);
    if (resposta.status === 401) { window.location.href = "/login?erro=sessao"; throw new Error("Sua sessão expirou."); }
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.erro || "Não foi possível salvar os dados.");
    return dados;
}

async function carregarDados() {
    try {
        const dados = await requisitar("/api/atividades");
        atividadesBanco = dados.atividades;
        entregasBanco = dados.entregas;
        renderizarPainel();
    } catch (erro) {
        const container = document.getElementById("tabelaAtividades");
        if (container && !atividadesBanco.length) container.textContent = erro.message;
        mostrarToast(erro.message);
    }
}

function obterAtividades() { return atividadesBanco; }
function obterEntregas() { return entregasBanco; }

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
    const totalEntregas = Object.values(entregas).reduce((soma, entrega) => soma + entrega.total, 0);
    document.getElementById("statTotalAtividades").textContent = lista.length;
    document.getElementById("statProfessores").textContent = professoresSet.size;
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
    document.getElementById("professorResponsavel").value = professorLogadoNome;
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

async function salvarAtividade(event) {
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

    const botao = document.getElementById("btnSalvarAtividade");
    if (botao.disabled) return;
    botao.disabled = true;
    try {
        await requisitar(idInput ? "/api/atividades/" + idInput : "/api/atividades", {
            method: idInput ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ titulo, professor, prazo: prazoRaw, descricao, instrucoes, material })
        });
        fecharModais();
        await carregarDados();
        mostrarToast(idInput ? "Atividade atualizada com sucesso!" : "Atividade criada com sucesso!");
    } catch (erro) { mostrarToast(erro.message); }
    finally { botao.disabled = false; }
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

let excluindo = false;
async function executarExclusao() {
    if (!idParaExcluir || excluindo) return;
    excluindo = true;
    try {
        await requisitar("/api/atividades/" + idParaExcluir, { method: "DELETE" });
        idParaExcluir = null;
        fecharModais();
        await carregarDados();
        mostrarToast("Atividade excluída com sucesso.");
    } catch (erro) { mostrarToast(erro.message); }
    finally { excluindo = false; }
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
