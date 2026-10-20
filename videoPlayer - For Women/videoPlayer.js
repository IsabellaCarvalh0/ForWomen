/* ==========================================================================
   FOR WOMEN — GERENCIADOR & VISUALIZADOR DE VIDEOAULAS (JAVASCRIPT)
   Integração com a API do servidor para Alunas e Professores
   ========================================================================== */

let usuarioAtual = null;
let todasAulas = [];
let filtroTurmaProfessor = "todas";
let termoBusca = "";

document.addEventListener("DOMContentLoaded", async function () {
    await carregarDadosUsuario();
    await carregarAulas();
    configurarEventos();
});

/* --------------------------------------------------------------------------
   1. CARREGAMENTO DOS DADOS DO USUÁRIO
   -------------------------------------------------------------------------- */
async function carregarDadosUsuario() {
    try {
        const resposta = await fetch("/api/usuario");
        if (resposta.ok) {
            usuarioAtual = await resposta.json();
            renderizarBarraNavegacao();
        } else {
            // Se a sessão expirou, redireciona ao login
            window.location.href = "/login?erro=sessao";
        }
    } catch (erro) {
        console.error("Erro ao carregar usuário:", erro);
    }
}

/* --------------------------------------------------------------------------
   2. RENDERIZAÇÃO DA BARRA DE NAVEGAÇÃO POR PERFIL
   -------------------------------------------------------------------------- */
function renderizarBarraNavegacao() {
    if (!usuarioAtual) return;

    const navLinks = document.getElementById("navLinks");
    const navLogo = document.getElementById("navLogo");
    const navRight = document.getElementById("navRight");

    const ehProfessor = usuarioAtual.tipo === "professor";

    // Logo direciona para a página inicial correspondente
    if (navLogo) {
        navLogo.href = ehProfessor ? "/chamada/chamada.html" : "/Inicio/index.html";
    }

    // Links de navegação
    if (navLinks) {
        if (ehProfessor) {
            navLinks.innerHTML = `
                <a href="/chamada/chamada.html">Chamada</a>
                <a href="/aulas/videoPlayer.html" class="active">Aulas</a>
                <a href="/atividade-professor">Atividades</a>
                <a href="/Avisos/AvisosProfessor.html">Avisos</a>
            `;
        } else {
            navLinks.innerHTML = `
                <a href="/Inicio/index.html">Início</a>
                <a href="/aulas/videoPlayer.html" class="active">Aulas</a>
                <a href="/atividades">Atividades</a>
                <a href="/Avisos/Avisos.html">Avisos</a>
            `;
        }
    }

    // Área do usuário (Avatar, Turma e Sair)
    if (navRight) {
        const partesNome = (usuarioAtual.nome || "Usuária").trim().split(" ");
        let iniciais = partesNome[0][0].toUpperCase();
        if (partesNome.length > 1) {
            iniciais += partesNome[partesNome.length - 1][0].toUpperCase();
        }

        const badgeTexto = ehProfessor ? "PROFESSOR" : (usuarioAtual.turma || "TURMA A").toUpperCase();

        navRight.innerHTML = `
            <div class="search-box">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="7"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input type="text" id="campoBusca" placeholder="buscar aula..." aria-label="Buscar aula" style="border:none; background:transparent; outline:none; width:100%; font-family:inherit; font-size:inherit; color:inherit;">
            </div>
            <div class="user-profile">
                <span class="user-badge">${badgeTexto}</span>
                <div class="avatar" title="${usuarioAtual.nome}">${iniciais}</div>
                <a href="/sair" class="btn-sair" title="Encerrar sessão">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Sair
                </a>
            </div>
        `;

        // Evento de busca em tempo real
        const inputBusca = document.getElementById("campoBusca");
        if (inputBusca) {
            inputBusca.addEventListener("input", function (e) {
                termoBusca = e.target.value.toLowerCase().trim();
                renderizarAulas();
            });
        }
    }

    // Configuração dos cabeçalhos da página e botões exclusivos de professor
    const pageHeadActions = document.getElementById("pageHeadActions");
    const containerFiltros = document.getElementById("containerFiltros");
    const pageEyebrow = document.getElementById("pageEyebrow");
    const pageTitle = document.getElementById("pageTitle");
    const pageSub = document.getElementById("pageSub");

    if (ehProfessor) {
        if (pageEyebrow) pageEyebrow.textContent = "// painel-docente • video-aulas.mp4";
        if (pageTitle) pageTitle.textContent = "Gerenciar videoaulas";
        if (pageSub) pageSub.textContent = "Cadastre novas aulas para suas turmas, adicione materiais complementares e acompanhe os vídeos publicados.";

        if (pageHeadActions) {
            pageHeadActions.innerHTML = `
                <button type="button" class="btn-criar-aula" onclick="abrirModalNovaAula()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    + Adicionar Aula
                </button>
            `;
        }

        if (containerFiltros) {
            containerFiltros.style.display = "flex";
            containerFiltros.innerHTML = `
                <div class="turma-filters">
                    <button type="button" class="turma-pill active" data-turma="todas" onclick="filtrarPorTurma('todas')">Todas as turmas</button>
                    <button type="button" class="turma-pill" data-turma="Turma A" onclick="filtrarPorTurma('Turma A')">Turma A</button>
                    <button type="button" class="turma-pill" data-turma="Turma B" onclick="filtrarPorTurma('Turma B')">Turma B</button>
                </div>
            `;
        }
    } else {
        const turmaAluna = usuarioAtual.turma || "Turma A";
        if (pageEyebrow) pageEyebrow.textContent = `// suas-aulas.mp4 • ${turmaAluna}`;
        if (pageTitle) pageTitle.textContent = `Suas aulas — ${turmaAluna}`;
        if (pageSub) pageSub.textContent = "Aulas de programação personalizadas para a sua turma, para você aprender no seu ritmo.";

        if (pageHeadActions) pageHeadActions.innerHTML = "";
        if (containerFiltros) containerFiltros.style.display = "none";
    }
}

/* --------------------------------------------------------------------------
   3. CARREGAMENTO E RENDERIZAÇÃO DAS AULAS
   -------------------------------------------------------------------------- */
async function carregarAulas() {
    try {
        const resposta = await fetch("/api/aulas");
        if (resposta.ok) {
            todasAulas = await resposta.json();
            renderizarAulas();
            renderizarSidebar();
        } else {
            console.error("Falha ao carregar aulas da API");
        }
    } catch (erro) {
        console.error("Erro na requisição das aulas:", erro);
    }
}

function filtrarPorTurma(turma) {
    filtroTurmaProfessor = turma;
    document.querySelectorAll(".turma-pill").forEach(p => {
        if (p.dataset.turma === turma) {
            p.classList.add("active");
        } else {
            p.classList.remove("active");
        }
    });
    renderizarAulas();
    renderizarSidebar();
}

function renderizarAulas() {
    const videoGrid = document.getElementById("videoGrid");
    const moduleCount = document.getElementById("moduleCount");
    const moduleTitle = document.getElementById("moduleTitle");
    if (!videoGrid) return;

    let aulasFiltradas = todasAulas.slice();

    // Filtro de turma para professor
    if (usuarioAtual && usuarioAtual.tipo === "professor" && filtroTurmaProfessor !== "todas") {
        aulasFiltradas = aulasFiltradas.filter(a => {
            const t = (a.turma || "").toLowerCase().trim();
            const f = filtroTurmaProfessor.toLowerCase().trim();
            return t === f || t === "todas" || t === "todas as turmas";
        });
    }

    // Filtro por busca de texto
    if (termoBusca) {
        aulasFiltradas = aulasFiltradas.filter(a => {
            const titulo = (a.titulo || "").toLowerCase();
            const desc = (a.descricao || "").toLowerCase();
            const prof = (a.professor_nome || "").toLowerCase();
            return titulo.includes(termoBusca) || desc.includes(termoBusca) || prof.includes(termoBusca);
        });
    }

    // Atualiza contadores
    if (moduleCount) {
        moduleCount.textContent = `${aulasFiltradas.length} ${aulasFiltradas.length === 1 ? 'aula' : 'aulas'}`;
    }

    if (moduleTitle) {
        if (usuarioAtual && usuarioAtual.tipo === "professor") {
            const nomeTurmaExibida = filtroTurmaProfessor === "todas" ? "Todas as turmas" : filtroTurmaProfessor;
            moduleTitle.innerHTML = `${nomeTurmaExibida} <b>Lista de videoaulas</b>`;
        } else {
            const turmaNome = (usuarioAtual && usuarioAtual.turma) ? usuarioAtual.turma : "Turma A";
            moduleTitle.innerHTML = `${turmaNome} <b>Todas as suas aulas</b>`;
        }
    }

    if (aulasFiltradas.length === 0) {
        videoGrid.innerHTML = `
            <div class="empty-state">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                <h3>Nenhuma aula encontrada</h3>
                <p>Nenhum vídeo corresponde aos critérios selecionados no momento.</p>
            </div>
        `;
        return;
    }

    const pad = n => String(n).padStart(2, '0');
    const ehProfessor = usuarioAtual && usuarioAtual.tipo === "professor";

    videoGrid.innerHTML = aulasFiltradas.map((aula, index) => {
        const numero = pad(index + 1);
        const duracao = aula.duracao_minutos ? `${aula.duracao_minutos} min` : "15 min";
        const avatar = aula.professor_avatar || (aula.professor_nome ? aula.professor_nome[0] : "P");
        const turmaBadge = aula.turma ? aula.turma : "Todas as turmas";

        // Verifica status no localStorage
        const chaveConcluida = `forwomen_aula_${aula.id}_concluida`;
        const foiConcluida = localStorage.getItem(chaveConcluida) === "true";

        return `
            <div class="video-card" onclick="irParaAula(${aula.id})">
                <div class="card-titlebar">
                    <div class="card-filename">aula_${numero}.mp4</div>
                    ${ehProfessor ? `
                        <button type="button" class="card-btn-delete" title="Excluir aula" onclick="event.stopPropagation(); confirmarExclusao(${aula.id}, '${aula.titulo}')">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Excluir
                        </button>
                    ` : ''}
                </div>
                <div class="card-thumb">
                    <span class="badge-turma">${turmaBadge}</span>
                    <div class="play-mini">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#4C1D8C">
                            <polygon points="6 3 20 12 6 21 6 3"/>
                        </svg>
                    </div>
                </div>
                <div class="card-body">
                    <div class="card-title">${aula.titulo}</div>
                    <div class="card-instructor">
                        <div class="mini-avatar">${avatar}</div>
                        ${aula.professor_nome || 'Docente'}
                    </div>
                </div>
                <div class="card-status">
                    <span>${duracao}</span>
                    <span class="${foiConcluida ? 'status-check' : ''}">
                        ${foiConcluida ? '✓ concluída' : 'assistir aula →'}
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

function renderizarSidebar() {
    const treeAulas = document.getElementById("treeAulas");
    if (!treeAulas) return;

    let aulasSidebar = todasAulas.slice();
    if (usuarioAtual && usuarioAtual.tipo === "professor" && filtroTurmaProfessor !== "todas") {
        aulasSidebar = aulasSidebar.filter(a => {
            const t = (a.turma || "").toLowerCase().trim();
            const f = filtroTurmaProfessor.toLowerCase().trim();
            return t === f || t === "todas" || t === "todas as turmas";
        });
    }

    const pad = n => String(n).padStart(2, '0');
    const pastaNome = usuarioAtual && usuarioAtual.tipo === "professor"
        ? (filtroTurmaProfessor === "todas" ? "todas_as_turmas" : filtroTurmaProfessor.toLowerCase().replace(" ", "_"))
        : (usuarioAtual && usuarioAtual.turma ? usuarioAtual.turma.toLowerCase().replace(" ", "_") : "turma_01");

    treeAulas.innerHTML = `
        <div class="tree-folder">📂 ${pastaNome}/</div>
        ${aulasSidebar.map((aula, i) => {
            const num = pad(i + 1);
            const chaveConcluida = `forwomen_aula_${aula.id}_concluida`;
            const foiConcluida = localStorage.getItem(chaveConcluida) === "true";
            return `
                <div class="tree-item ${foiConcluida ? 'done' : ''}" style="cursor:pointer;" onclick="irParaAula(${aula.id})">
                    <span class="tree-icon">${foiConcluida ? '✓' : '▶'}</span>
                    aula_${num}.mp4
                </div>
            `;
        }).join('')}
    `;
}

function irParaAula(id) {
    window.location.href = `assistir.html?aula=${id}`;
}

/* --------------------------------------------------------------------------
   4. MODAL E CADASTRO DE NOVA AULA (PROFESSOR)
   -------------------------------------------------------------------------- */
function abrirModalNovaAula() {
    const modal = document.getElementById("modalNovaAula");
    const form = document.getElementById("formNovaAula");
    if (form) form.reset();
    if (modal) modal.classList.add("ativo");
}

function fecharModalNovaAula() {
    const modal = document.getElementById("modalNovaAula");
    if (modal) modal.classList.remove("ativo");
}

function configurarEventos() {
    const formNovaAula = document.getElementById("formNovaAula");
    if (formNovaAula) {
        formNovaAula.addEventListener("submit", async function (e) {
            e.preventDefault();

            const titulo = document.getElementById("aulaTitulo").value.trim();
            const video_url = document.getElementById("aulaUrl").value.trim();
            const turma = document.getElementById("aulaTurma").value;
            const duracao_minutos = document.getElementById("aulaDuracao").value.trim();
            const descricao = document.getElementById("aulaDescricao").value.trim();
            const materiais = document.getElementById("aulaMateriais").value.trim();

            if (!titulo || !video_url) {
                alert("Por favor, preencha o título e o link do vídeo.");
                return;
            }

            const dados = {
                titulo,
                video_url,
                turma,
                duracao_minutos: parseInt(duracao_minutos, 10) || 15,
                descricao,
                materiais
            };

            const btnSalvar = formNovaAula.querySelector(".btn-salvar");
            const textoOriginal = btnSalvar.textContent;
            btnSalvar.textContent = "Salvando...";
            btnSalvar.disabled = true;

            try {
                const resposta = await fetch("/api/aulas", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(dados)
                });

                if (resposta.ok) {
                    fecharModalNovaAula();
                    await carregarAulas();
                    alert("Aula cadastrada com sucesso!");
                } else {
                    const erro = await resposta.json();
                    alert(erro.erro || "Ocorreu um erro ao salvar a aula.");
                }
            } catch (err) {
                console.error("Erro ao enviar aula:", err);
                alert("Erro ao se conectar com o servidor.");
            } finally {
                btnSalvar.textContent = textoOriginal;
                btnSalvar.disabled = false;
            }
        });
    }

    // Fecha modal clicando fora
    const modal = document.getElementById("modalNovaAula");
    if (modal) {
        modal.addEventListener("click", function (e) {
            if (e.target === modal) {
                fecharModalNovaAula();
            }
        });
    }
}

async function confirmarExclusao(id, titulo) {
    if (confirm(`Tem certeza que deseja remover a aula "${titulo}"?`)) {
        try {
            const resposta = await fetch(`/api/aulas/${id}`, { method: "DELETE" });
            if (resposta.ok) {
                await carregarAulas();
            } else {
                alert("Erro ao excluir a aula.");
            }
        } catch (e) {
            alert("Erro de comunicação com o servidor.");
        }
    }
}
