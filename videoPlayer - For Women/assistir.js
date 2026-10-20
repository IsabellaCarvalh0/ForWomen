/* ==========================================================================
   FOR WOMEN — REPRODUTOR DE VIDEOAULA (JAVASCRIPT)
   Integração dinâmica com as aulas da turma e controle de progresso
   ========================================================================== */

let usuarioAtual = null;
let aulasAcessiveis = [];
let aulaAtual = null;
let indiceAtual = 0;

document.addEventListener("DOMContentLoaded", async function () {
    await carregarUsuario();
    await carregarAulasEInicializar();
    configurarAbas();
});

/* --------------------------------------------------------------------------
   1. CARREGAMENTO DO USUÁRIO & NAV
   -------------------------------------------------------------------------- */
async function carregarUsuario() {
    try {
        const resposta = await fetch("/api/usuario");
        if (resposta.ok) {
            usuarioAtual = await resposta.json();
            renderizarBarraNavegacao();
        } else {
            window.location.href = "/login?erro=sessao";
        }
    } catch (e) {
        console.error("Erro ao carregar usuário:", e);
    }
}

function renderizarBarraNavegacao() {
    if (!usuarioAtual) return;

    const navLinks = document.getElementById("navLinks");
    const navLogo = document.getElementById("navLogo");
    const navRight = document.getElementById("navRight");

    const ehProfessor = usuarioAtual.tipo === "professor";

    if (navLogo) {
        navLogo.href = ehProfessor ? "/chamada/chamada.html" : "/Inicio/index.html";
    }

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

    if (navRight) {
        const partesNome = (usuarioAtual.nome || "Usuária").trim().split(" ");
        let iniciais = partesNome[0][0].toUpperCase();
        if (partesNome.length > 1) {
            iniciais += partesNome[partesNome.length - 1][0].toUpperCase();
        }

        const badgeTexto = ehProfessor ? "PROFESSOR" : (usuarioAtual.turma || "TURMA A").toUpperCase();

        navRight.innerHTML = `
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
    }
}

/* --------------------------------------------------------------------------
   2. CARREGAMENTO DAS AULAS & REPRODUÇÃO
   -------------------------------------------------------------------------- */
async function carregarAulasEInicializar() {
    try {
        const resposta = await fetch("/api/aulas");
        if (!resposta.ok) return;

        aulasAcessiveis = await resposta.json();
        if (aulasAcessiveis.length === 0) {
            document.querySelector(".page").innerHTML = `
                <div class="breadcrumb mono" onclick="location.href='videoPlayer.html'">← voltar para aulas</div>
                <p>Nenhuma aula disponível para sua turma no momento.</p>
            `;
            return;
        }

        // Obtém o ID da aula pela URL
        const params = new URLSearchParams(window.location.search);
        const aulaParam = params.get("aula");

        let idBuscado = parseInt(aulaParam, 10);
        indiceAtual = aulasAcessiveis.findIndex(a => a.id === idBuscado);

        // Se não encontrou por ID, tenta usar como índice ou vai para a primeira
        if (indiceAtual === -1) {
            indiceAtual = 0;
        }

        aulaAtual = aulasAcessiveis[indiceAtual];
        renderizarAulaAtual();
        renderizarListaLateral();

    } catch (e) {
        console.error("Erro ao carregar videoaula:", e);
    }
}

function ytId(url) {
    if (!url) return null;
    const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
    return m ? m[1] : null;
}

function pad(n) {
    return String(n).padStart(2, '0');
}

function renderizarAulaAtual() {
    if (!aulaAtual) return;

    const $ = id => document.getElementById(id);
    const n = indiceAtual + 1;
    const total = aulasAcessiveis.length;

    document.title = `For Women — ${aulaAtual.titulo}`;

    if ($('file')) $('file').textContent = `aula_${pad(n)}.mp4`;
    if ($('eyebrow')) $('eyebrow').textContent = `// aula ${n} de ${total} • ${aulaAtual.turma || 'Geral'}`;
    if ($('title')) $('title').textContent = aulaAtual.titulo;

    const avatar = aulaAtual.professor_avatar || (aulaAtual.professor_nome ? aulaAtual.professor_nome[0] : "P");
    if ($('ini')) $('ini').textContent = avatar;
    if ($('inst')) $('inst').textContent = aulaAtual.professor_nome || "Docente";

    // Incorporação do YouTube
    const youtubeId = ytId(aulaAtual.video_url);
    if ($('screen')) {
        if (youtubeId) {
            $('screen').innerHTML = `
                <iframe src="https://www.youtube.com/embed/${youtubeId}?rel=0" 
                        title="${aulaAtual.titulo}" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                </iframe>
            `;
        } else {
            $('screen').innerHTML = `
                <div class="empty">
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="#fff"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                    <p class="mono">// video_aula_${pad(n)}.youtube<br>O link de vídeo desta aula não é válido ou foi removido.</p>
                </div>
            `;
        }
    }

    // Botões de navegação anterior/próximo
    const btnPrev = $('prev');
    const btnNext = $('next');

    if (btnPrev) {
        btnPrev.style.visibility = indiceAtual > 0 ? 'visible' : 'hidden';
        btnPrev.onclick = () => {
            if (indiceAtual > 0) {
                const aulaAnterior = aulasAcessiveis[indiceAtual - 1];
                window.location.href = `assistir.html?aula=${aulaAnterior.id}`;
            }
        };
    }

    if (btnNext) {
        btnNext.style.visibility = indiceAtual < total - 1 ? 'visible' : 'hidden';
        btnNext.onclick = () => {
            if (indiceAtual < total - 1) {
                const proximaAula = aulasAcessiveis[indiceAtual + 1];
                window.location.href = `assistir.html?aula=${proximaAula.id}`;
            }
        };
    }

    // Botão de conclusão
    const btnDone = $('done');
    const chaveConcluida = `forwomen_aula_${aulaAtual.id}_concluida`;
    let concluida = localStorage.getItem(chaveConcluida) === "true";

    function atualizarEstadoBotaoConcluida() {
        if (btnDone) {
            if (concluida) {
                btnDone.textContent = "✓ Aula Concluída";
                btnDone.classList.add("done");
            } else {
                btnDone.textContent = "Marcar como concluída";
                btnDone.classList.remove("done");
            }
        }
    }
    atualizarEstadoBotaoConcluida();

    if (btnDone) {
        btnDone.onclick = () => {
            concluida = !concluida;
            localStorage.setItem(chaveConcluida, concluida ? "true" : "false");
            atualizarEstadoBotaoConcluida();
            renderizarListaLateral();
        };
    }

    // Descrição no Sobre
    const painelSobre = $('sobre');
    if (painelSobre) {
        painelSobre.innerHTML = `
            <p>${aulaAtual.descricao || 'Nesta aula, a professora apresenta o conteúdo passo a passo, com exemplos para você acompanhar e reproduzir no seu próprio computador.'}</p>
            <p>Duração estimada: <strong>${aulaAtual.duracao_minutos || 15} minutos</strong>.</p>
            <p>Pause sempre que precisar e leve suas dúvidas para o encontro presencial de terça ou quinta, das 13h às 15h, no IFMG Sabará.</p>
        `;
    }

    // Materiais
    const painelMateriais = $('materiais');
    if (painelMateriais) {
        if (aulaAtual.materiais) {
            const itensMateriais = aulaAtual.materiais.split(',').map(m => m.trim()).filter(Boolean);
            painelMateriais.innerHTML = itensMateriais.map(mat => `
                <div class="file">
                    <b>${mat}</b>
                    <span onclick="alert('Download de material complementar iniciado: ${mat}')">baixar</span>
                </div>
            `).join('');
        } else {
            painelMateriais.innerHTML = `
                <div class="file"><b>slides_aula.pdf</b><span onclick="alert('Download iniciado')">baixar</span></div>
                <div class="file"><b>exercicios.zip</b><span onclick="alert('Download iniciado')">baixar</span></div>
                <div class="file"><b>codigo_exemplo.txt</b><span onclick="alert('Download iniciado')">baixar</span></div>
            `;
        }
    }

    // Anotações da aluna salvas por aula
    const txtNotas = document.querySelector("#notas textarea");
    if (txtNotas) {
        const chaveNotas = `forwomen_aula_${aulaAtual.id}_notas`;
        txtNotas.value = localStorage.getItem(chaveNotas) || "";
        txtNotas.oninput = () => {
            localStorage.setItem(chaveNotas, txtNotas.value);
        };
    }
}

/* --------------------------------------------------------------------------
   3. SIDEBAR / PLAYLIST LATERAL
   -------------------------------------------------------------------------- */
function renderizarListaLateral() {
    const list = document.getElementById("list");
    const prog = document.getElementById("prog");
    const trackfill = document.getElementById("trackfill");
    if (!list) return;

    let concluidasCount = 0;

    list.innerHTML = aulasAcessiveis.map((aula, i) => {
        const n = i + 1;
        const ehAtual = aula.id === aulaAtual.id;
        const chave = `forwomen_aula_${aula.id}_concluida`;
        const foiConcluida = localStorage.getItem(chave) === "true";
        if (foiConcluida) concluidasCount++;

        let classe = "";
        if (ehAtual) classe = "current";
        else if (foiConcluida) classe = "done";

        const duracao = aula.duracao_minutos ? `${aula.duracao_minutos} min` : "15 min";

        return `
            <div class="item ${classe}" onclick="window.location.href='assistir.html?aula=${aula.id}'">
                <div class="num">${foiConcluida ? '✓' : n}</div>
                <div>
                    <div class="item-title">${aula.titulo}</div>
                    <div class="item-min">${duracao}</div>
                </div>
            </div>
        `;
    }).join('');

    const total = aulasAcessiveis.length;
    if (prog) prog.textContent = `${concluidasCount} de ${total} concluídas`;
    if (trackfill) {
        const pct = total > 0 ? (concluidasCount / total) * 100 : 0;
        trackfill.style.width = `${pct}%`;
    }
}

/* --------------------------------------------------------------------------
   4. NAVEGAÇÃO POR ABAS (SOBRE, MATERIAIS, ANOTAÇÕES)
   -------------------------------------------------------------------------- */
function configurarAbas() {
    document.querySelectorAll('.tab').forEach(t => {
        t.onclick = () => {
            document.querySelectorAll('.tab, .panel').forEach(e => e.classList.remove('active'));
            t.classList.add('active');
            const target = document.getElementById(t.dataset.tab);
            if (target) target.classList.add('active');
        };
    });
}
