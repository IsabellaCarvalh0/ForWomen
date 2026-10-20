/* ==========================================================================
   FOR WOMEN — ATIVIDADES DA ALUNA (JAVASCRIPT)
   Gerenciamento de visualização, entregas e filtros de atividades
   ========================================================================== */

// Chaves de armazenamento compartilhado
const STORAGE_ATIVIDADES = "forwomen_atividades";
const STORAGE_ENTREGAS = "forwomen_entregas";

// Atividades padrão (inicializadas se não houver dados no localStorage)
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

let atividadeSelecionadaId = null;
let filtroAtual = "todos";

// --------------------------------------------------------------------------
// INICIALIZAÇÃO
// --------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", function () {
    inicializarStorage();
    renderizarAtividades();
    configurarEventos();
});

function inicializarStorage() {
    if (!localStorage.getItem(STORAGE_ATIVIDADES)) {
        localStorage.setItem(STORAGE_ATIVIDADES, JSON.stringify(ATIVIDADES_PADRAO));
    }
    if (!localStorage.getItem(STORAGE_ENTREGAS)) {
        // Inicializa com uma entrega de exemplo na terceira atividade para consistência
        const entregasIniciais = {
            "3": {
                data: "25/08/2026",
                link: "https://github.com/aluna/exercicios-flexbox",
                comentario: "Atividade finalizada e testada em desktop e mobile."
            }
        };
        localStorage.setItem(STORAGE_ENTREGAS, JSON.stringify(entregasIniciais));
    }
}

function obterAtividades() {
    try {
        const dados = localStorage.getItem(STORAGE_ATIVIDADES);
        return dados ? JSON.parse(dados) : ATIVIDADES_PADRAO;
    } catch (e) {
        console.error("Erro ao ler atividades do localStorage:", e);
        return ATIVIDADES_PADRAO;
    }
}

function obterEntregas() {
    try {
        const dados = localStorage.getItem(STORAGE_ENTREGAS);
        return dados ? JSON.parse(dados) : {};
    } catch (e) {
        console.error("Erro ao ler entregas do localStorage:", e);
        return {};
    }
}

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

function salvarEntrega(event) {
    event.preventDefault();

    const id = document.getElementById("entregaAtividadeId").value;
    const link = document.getElementById("linkRepositorio").value.trim();
    const comentario = document.getElementById("comentarioEntrega").value.trim();
    const inputArquivo = document.getElementById("arquivoAtividade");
    const arquivoNome = inputArquivo.files.length > 0 ? inputArquivo.files[0].name : null;

    if (!link && !arquivoNome) {
        mostrarToast("Por favor, informe o link do projeto ou anexe um arquivo.");
        return;
    }

    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString("pt-BR") + " às " + agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const entregas = obterEntregas();
    entregas[String(id)] = {
        data: dataFormatada,
        link: link,
        comentario: comentario,
        arquivo: arquivoNome
    };

    localStorage.setItem(STORAGE_ENTREGAS, JSON.stringify(entregas));

    fecharModais();
    renderizarAtividades();
    mostrarToast("Atividade entregue com sucesso! Parabéns! 🎉");
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

    // Ouvir alterações de outras abas/páginas (ex: professor adicionou uma atividade)
    window.addEventListener("storage", function (e) {
        if (e.key === STORAGE_ATIVIDADES || e.key === STORAGE_ENTREGAS) {
            renderizarAtividades();
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