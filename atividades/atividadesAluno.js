/* ==========================================================================
   FOR WOMEN — ATIVIDADES DA ALUNA (JAVASCRIPT)
   Gerenciamento de visualização, entregas e filtros de atividades
   ========================================================================== */

let atividadesBanco = [];
let entregasBanco = {};

let atividadeSelecionadaId = null;
let filtroAtual = "todos";

// --------------------------------------------------------------------------
// INICIALIZAÇÃO
// --------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", function () {
    configurarEventos();
    renderizarAtividades();
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
        renderizarAtividades();
    } catch (erro) {
        const container = document.getElementById("listaAtividades");
        if (container && !atividadesBanco.length) container.textContent = erro.message;
        mostrarToast(erro.message);
    }
}

function obterAtividades() { return atividadesBanco; }
function obterEntregas() { return entregasBanco; }

// --------------------------------------------------------------------------
// RENDERIZAÇÃO NA TELA
// --------------------------------------------------------------------------

function renderizarAtividades() {
    const lista = obterAtividades();
    const entregas = obterEntregas();
    const container = document.getElementById("listaAtividades");
    const termoBusca = (document.getElementById("campoBusca")?.value || "").toLowerCase().trim();
    const semAtividades = document.getElementById("semAtividades");

    if (!container) return;

    let total = lista.length;
    let pendentes = 0;
    let concluidas = 0;

    container.innerHTML = "";
    let visiveis = 0;

    lista.forEach(function (atv) {
        const jaEntregue = !!entregas[String(atv.id)];
        if (jaEntregue) {
            concluidas++;
        } else {
            pendentes++;
        }

        // Aplica filtro de status
        if (filtroAtual === "pendente" && jaEntregue) return;
        if (filtroAtual === "concluida" && !jaEntregue) return;

        // Aplica busca
        if (termoBusca) {
            const matchTitulo = atv.titulo.toLowerCase().includes(termoBusca);
            const matchDesc = atv.descricao.toLowerCase().includes(termoBusca);
            const matchProf = atv.professor.toLowerCase().includes(termoBusca);
            if (!matchTitulo && !matchDesc && !matchProf) return;
        }

        visiveis++;

        const card = document.createElement("article");
        card.className = "atividade-card";
        card.dataset.id = atv.id;
        card.dataset.status = jaEntregue ? "concluida" : "pendente";

        const statusClasse = jaEntregue ? "concluida" : "pendente";
        const statusTexto = jaEntregue ? "CONCLUÍDA" : "PENDENTE";
        const botaoTexto = jaEntregue ? "Ver Entrega / Reenviar" : "Entregar atividade";

        const prazoFormatado = atv.prazoFormatado || formatarData(atv.prazo);

        card.innerHTML = `
            <div class="atividade-topo">
                <h2>${escapeHtml(atv.titulo)}</h2>
                <span class="status ${statusClasse}">
                    ${jaEntregue ? "✓ " : ""}${statusTexto}
                </span>
            </div>

            <p class="atividade-descricao">${escapeHtml(atv.descricao)}</p>

            <div class="informacoes">
                <span class="info-item">
                    <span class="info-icone">👩‍🏫</span>
                    ${escapeHtml(atv.professor)}
                </span>
                <span class="info-item">
                    <span class="info-icone">📅</span>
                    Entrega: ${prazoFormatado}
                </span>
            </div>

            <div class="card-acoes">
                <button type="button" class="btn-detalhes" onclick="abrirModalVisualizacao(${atv.id})">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                    Visualizar atividade
                </button>
                <button type="button" class="botao btn-entregar" onclick="abrirModalEntrega(${atv.id})">
                    ${botaoTexto}
                </button>
            </div>
        `;

        container.appendChild(card);
    });

    // Atualiza contadores
    document.getElementById("statTotal").textContent = total;
    document.getElementById("statPendentes").textContent = pendentes;
    document.getElementById("statConcluidas").textContent = concluidas;

    // Estado vazio
    if (semAtividades) {
        semAtividades.style.display = visiveis === 0 ? "block" : "none";
    }
}

// --------------------------------------------------------------------------
// MODAIS DE VISUALIZAÇÃO E ENTREGA
// --------------------------------------------------------------------------

function abrirModalVisualizacao(id) {
    const lista = obterAtividades();
    const entregas = obterEntregas();
    const atv = lista.find(item => item.id === Number(id));

    if (!atv) return;
    atividadeSelecionadaId = atv.id;

    const jaEntregue = !!entregas[String(atv.id)];
    const entregaDados = entregas[String(atv.id)];

    document.getElementById("modalVisualizarTitulo").textContent = atv.titulo;
    document.getElementById("modalVisualizarProfessor").textContent = atv.professor;
    document.getElementById("modalVisualizarPrazo").textContent = atv.prazoFormatado || formatarData(atv.prazo);
    document.getElementById("modalVisualizarDescricao").textContent = atv.descricao;
    document.getElementById("modalVisualizarInstrucoes").textContent = atv.instrucoes || "Siga as orientações passadas em aula e entregue a tarefa no prazo.";

    const statusBadge = document.getElementById("modalVisualizarStatus");
    statusBadge.className = `status ${jaEntregue ? "concluida" : "pendente"}`;
    statusBadge.textContent = jaEntregue ? "✓ CONCLUÍDA" : "PENDENTE";

    // Material de apoio
    const secaoMaterial = document.getElementById("secaoMaterial");
    const linkMaterial = document.getElementById("modalVisualizarMaterial");
    if (atv.material) {
        secaoMaterial.style.display = "block";
        linkMaterial.href = atv.material;
    } else {
        secaoMaterial.style.display = "none";
    }

    let anexo = document.getElementById("anexoEntregaRealizada");
    if (!anexo) {
        anexo = document.createElement("a");
        anexo.id = "anexoEntregaRealizada";
        document.getElementById("blocoEntregaRealizada").appendChild(anexo);
    }
    anexo.hidden = !entregaDados?.arquivo;
    if (entregaDados?.arquivo) {
        anexo.textContent = "Baixar arquivo: " + entregaDados.arquivo;
        anexo.href = "/api/atividades/" + atv.id + "/arquivo";
    }

    // Detalhes da entrega já feita
    const blocoEntrega = document.getElementById("blocoEntregaRealizada");
    const btnAcao = document.getElementById("btnModalAcaoEntrega");

    if (jaEntregue && entregaDados) {
        blocoEntrega.style.display = "block";
        document.getElementById("dataEntregaRealizada").textContent = entregaDados.data || "Registrada";
        
        const aLink = document.getElementById("linkEntregaRealizada");
        if (entregaDados.link) {
            aLink.href = entregaDados.link;
            aLink.textContent = entregaDados.link;
            document.getElementById("pLinkEntrega").style.display = "block";
        } else {
            document.getElementById("pLinkEntrega").style.display = "none";
        }

        const spanComentario = document.getElementById("comentarioEntregaRealizada");
        if (entregaDados.comentario) {
            spanComentario.textContent = entregaDados.comentario;
            document.getElementById("pComentarioEntrega").style.display = "block";
        } else {
            document.getElementById("pComentarioEntrega").style.display = "none";
        }

        btnAcao.textContent = "Reenviar atividade";
    } else {
        blocoEntrega.style.display = "none";
        btnAcao.textContent = "Entregar atividade";
    }

    abrirModal("modalVisualizar");
}

function abrirModalEntrega(id) {
    const lista = obterAtividades();
    const entregas = obterEntregas();
    const atv = lista.find(item => item.id === Number(id));

    if (!atv) return;
    atividadeSelecionadaId = atv.id;

    fecharModais();

    document.getElementById("entregaAtividadeId").value = atv.id;
    document.getElementById("modalEntregarTitulo").textContent = `Entregar: ${atv.titulo}`;

    // Pré-preenche caso já tenha entregue anteriormente
    const entregaAnterior = entregas[String(atv.id)];
    document.getElementById("linkRepositorio").value = entregaAnterior ? entregaAnterior.link : "";
    document.getElementById("comentarioEntrega").value = entregaAnterior ? (entregaAnterior.comentario || "") : "";
    document.getElementById("arquivoAtividade").value = "";

    abrirModal("modalEntregar");
}

function irParaEntrega() {
    if (atividadeSelecionadaId) {
        abrirModalEntrega(atividadeSelecionadaId);
    }
}

async function salvarEntrega(event) {
    event.preventDefault();
    const botao = document.getElementById("btnConfirmarEntrega");
    if (botao.disabled) return;
    const id = document.getElementById("entregaAtividadeId").value;
    const link = document.getElementById("linkRepositorio").value.trim();
    const comentario = document.getElementById("comentarioEntrega").value.trim();
    const selecionado = document.getElementById("arquivoAtividade").files[0];
    if (!link && !selecionado) return mostrarToast("Informe o link do projeto ou anexe um arquivo.");
    if (selecionado && selecionado.size > 5 * 1024 * 1024) return mostrarToast("O arquivo deve ter no máximo 5 MB.");
    botao.disabled = true;
    try {
        let arquivo = null;
        if (selecionado) {
            const base64 = await new Promise((resolve, reject) => {
                const leitor = new FileReader();
                leitor.onload = () => resolve(leitor.result.split(",")[1]);
                leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
                leitor.readAsDataURL(selecionado);
            });
            arquivo = { nome: selecionado.name, base64 };
        }
        await requisitar("/api/atividades/" + id + "/entrega", {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ link, comentario, arquivo })
        });
        fecharModais();
        await carregarDados();
        mostrarToast("Atividade entregue com sucesso!");
    } catch (erro) { mostrarToast(erro.message); }
    finally { botao.disabled = false; }
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

    // Filtros
    document.querySelectorAll(".filtro-btn").forEach(btn => {
        btn.addEventListener("click", function () {
            document.querySelectorAll(".filtro-btn").forEach(b => b.classList.remove("ativo"));
            this.classList.add("ativo");
            filtroAtual = this.dataset.filtro;
            renderizarAtividades();
        });
    });

    // Busca
    const campoBusca = document.getElementById("campoBusca");
    if (campoBusca) {
        campoBusca.addEventListener("input", function () {
            renderizarAtividades();
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