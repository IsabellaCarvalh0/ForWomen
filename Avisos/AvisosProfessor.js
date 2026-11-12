
/* ==========================================
   FOR WOMEN — AVISOS DOS PROFESSORES
   ========================================== */

/* ELEMENTOS DO FORMULÁRIO */

const formAviso = document.getElementById("formAviso");
const campoTitulo = document.getElementById("titulo");
const campoMensagem = document.getElementById("mensagem");
const campoPublico = document.getElementById("publico");
const campoFixado = document.getElementById("fixado");

/* ELEMENTOS DOS AVISOS */

const listaAvisos = document.getElementById("listaAvisos");
const totalAvisos = document.getElementById("totalAvisos");
const totalFixados = document.getElementById("totalFixados");

/* VARIÁVEIS DE CONTROLE */

let avisos = [];
let idEmEdicao = null;
let carregando = false;
let salvando = false;

/* ==========================================
   NORMALIZAR AVISOS
   ========================================== */

function normalizarAviso(aviso) {
    return {
        ...aviso,
        id: Number(aviso.id),
        fixado: aviso.fixado === true,
        criadoEm: aviso.criado_em || aviso.criadoEm,
        atualizadoEm: aviso.atualizado_em || aviso.atualizadoEm
    };
}

/* ==========================================
   REQUISIÇÕES PARA API
   ========================================== */

async function requisitarAPI(url, opcoes = {}) {

    const resposta = await fetch(url, {
        ...opcoes,
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
            ...opcoes.headers
        }
    });

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
        throw new Error(
            dados.erro || "Não foi possível concluir a operação."
        );
    }

    return dados;
}

/* ==========================================
   CARREGAR TURMAS NO CAMPO PÚBLICO
   ========================================== */

async function carregarTurmas() {

    try {

        const turmas = await requisitarAPI("/api/turmas");

        turmas.forEach(function (turma) {

            const opcao = document.createElement("option");

            opcao.value = turma.id;

            opcao.textContent = turma.nome;

            campoPublico.appendChild(opcao);

        });

    } catch (erro) {

        console.error("Erro ao carregar turmas:", erro);

    }
}

/* ==========================================
   CARREGAR AVISOS
   ========================================== */

async function carregarAvisos() {

    if (carregando) return;

    carregando = true;

    try {

        const dados = await requisitarAPI("/api/avisos");

        avisos = dados.map(normalizarAviso);

        renderizarAvisos();

    } catch (erro) {

        console.error("Erro ao carregar avisos:", erro);

        alert(
            "Não foi possível carregar os avisos. Verifique sua conexão com o servidor."
        );

    } finally {

        carregando = false;

    }
}

/* ==========================================
   CADASTRAR OU EDITAR AVISO
   ========================================== */

if (formAviso) {

    formAviso.addEventListener("submit", async function (evento) {

        evento.preventDefault();

        if (salvando) return;

        const titulo = campoTitulo.value.trim();
        const mensagem = campoMensagem.value.trim();
        const turmaId = campoPublico.value;
        const fixado = campoFixado.checked;

        if (!titulo || !mensagem) {

            alert("Preencha todos os campos obrigatórios.");

            return;
        }

        /* turma_id vazio = todas as turmas */
        const dadosAviso = {
            titulo,
            mensagem,
            turma_id: turmaId,
            fixado
        };

        const editando = idEmEdicao !== null;

        const botaoEnviar = formAviso.querySelector(
            'button[type="submit"], input[type="submit"]'
        );

        salvando = true;

        try {

            if (botaoEnviar) {
                botaoEnviar.disabled = true;
            }

            if (editando) {

                await requisitarAPI(
                    "/api/avisos/" + idEmEdicao,
                    {
                        method: "PUT",
                        body: JSON.stringify(dadosAviso)
                    }
                );

            } else {

                await requisitarAPI(
                    "/api/avisos",
                    {
                        method: "POST",
                        body: JSON.stringify(dadosAviso)
                    }
                );

            }

            formAviso.reset();

            idEmEdicao = null;

            restaurarBotaoFormulario();

            await carregarAvisos();

            alert(
                editando
                    ? "Aviso atualizado com sucesso!"
                    : "Aviso cadastrado com sucesso!"
            );

        } catch (erro) {

            console.error("Erro ao salvar aviso:", erro);

            alert(erro.message);

        } finally {

            salvando = false;

            if (botaoEnviar) {
                botaoEnviar.disabled = false;
            }

        }

    });

}

/* ==========================================
   RENDERIZAR AVISOS
   ========================================== */

function renderizarAvisos() {

    if (!listaAvisos) return;

    listaAvisos.replaceChildren();

    if (avisos.length === 0) {

        const mensagemVazia = document.createElement("p");

        mensagemVazia.textContent =
            "Nenhum aviso publicado até o momento.";

        listaAvisos.appendChild(mensagemVazia);

        atualizarContadores();

        return;
    }

    avisos.forEach(function (aviso) {

        const card = document.createElement("article");

        card.className = "card-aviso";

        /* TÍTULO */

        const titulo = document.createElement("h3");

        titulo.textContent = aviso.titulo;

        /* MENSAGEM */

        const mensagem = document.createElement("p");

        mensagem.textContent = aviso.mensagem;

        /* PÚBLICO */

        const publico = document.createElement("p");

        publico.textContent = "Público: " +
            (aviso.turma_nome || "Todas as turmas");

        card.append(titulo, mensagem, publico);

        /* AVISO FIXADO */

        if (aviso.fixado) {

            const etiqueta = document.createElement("span");

            etiqueta.className = "etiqueta-fixado";

            etiqueta.textContent = "📌 Aviso fixado";

            card.appendChild(etiqueta);
        }

        /* DATA DE PUBLICAÇÃO */

        const data = document.createElement("small");

        const dataCriacao = aviso.criadoEm
            ? new Date(aviso.criadoEm)
            : null;

        data.textContent =
            dataCriacao && !Number.isNaN(dataCriacao.getTime())
                ? "Publicado em: " +
                  dataCriacao.toLocaleString("pt-BR")
                : "Data de publicação indisponível";

        card.appendChild(data);

        /* BOTÕES DE AÇÃO */

        const botoes = document.createElement("div");

        botoes.className = "acoes-aviso";

        /* EDITAR */

        const botaoEditar = document.createElement("button");

        botaoEditar.type = "button";

        botaoEditar.textContent = "Editar";

        botaoEditar.addEventListener("click", function () {

            editarAviso(aviso.id);

        });

        /* EXCLUIR */

        const botaoExcluir = document.createElement("button");

        botaoExcluir.type = "button";

        botaoExcluir.textContent = "Excluir";

        botaoExcluir.addEventListener("click", function () {

            excluirAviso(aviso.id);

        });

        botoes.append(botaoEditar, botaoExcluir);

        card.appendChild(botoes);

        listaAvisos.appendChild(card);

    });

    atualizarContadores();
}

/* ==========================================
   EDITAR AVISO
   ========================================== */

function editarAviso(id) {

    const aviso = avisos.find(function (item) {
        return item.id === id;
    });

    if (!aviso) return;

    campoTitulo.value = aviso.titulo;
    campoMensagem.value = aviso.mensagem;
    campoPublico.value = aviso.turma_id || "";
    campoFixado.checked = aviso.fixado;

    idEmEdicao = id;

    const botaoEnviar = formAviso.querySelector(
        'button[type="submit"], input[type="submit"]'
    );

    if (botaoEnviar) {

        if (botaoEnviar.tagName === "INPUT") {
            botaoEnviar.value = "Salvar alterações";
        } else {
            botaoEnviar.textContent = "Salvar alterações";
        }

    }

    /* ROLA ATÉ O FORMULÁRIO */

    formAviso.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

/* ==========================================
   EXCLUIR AVISO
   ========================================== */

async function excluirAviso(id) {

    const confirmar = confirm(
        "Tem certeza de que deseja excluir este aviso?"
    );

    if (!confirmar) return;

    try {

        await requisitarAPI(
            "/api/avisos/" + id,
            {
                method: "DELETE"
            }
        );

        if (idEmEdicao === id) {

            formAviso.reset();

            idEmEdicao = null;

            restaurarBotaoFormulario();

        }

        await carregarAvisos();

        alert("Aviso excluído com sucesso!");

    } catch (erro) {

        console.error("Erro ao excluir aviso:", erro);

        alert(erro.message);

    }
}

/* ==========================================
   ATUALIZAR CONTADORES
   ========================================== */

function atualizarContadores() {

    if (totalAvisos) {

        totalAvisos.textContent = avisos.length;

    }

    if (totalFixados) {

        totalFixados.textContent = avisos.filter(function (aviso) {
            return aviso.fixado;
        }).length;

    }
}

/* ==========================================
   RESTAURAR BOTÃO DO FORMULÁRIO
   ========================================== */

function restaurarBotaoFormulario() {

    if (!formAviso) return;

    const botaoEnviar = formAviso.querySelector(
        'button[type="submit"], input[type="submit"]'
    );

    if (botaoEnviar) {

        if (botaoEnviar.tagName === "INPUT") {
            botaoEnviar.value = "Publicar aviso →";
        } else {
            botaoEnviar.textContent = "Publicar aviso →";
        }

    }
}

/* ==========================================
   MENU RESPONSIVO
   ========================================== */

function configurarMenuMobile() {

    const botaoMenu = document.getElementById("menuToggle");

    const menu = document.getElementById("menuNavegacao");

    if (!botaoMenu || !menu) return;

    /* FECHAR MENU */

    function fecharMenu() {

        menu.classList.remove("open");

        botaoMenu.classList.remove("active");

        botaoMenu.setAttribute(
            "aria-expanded",
            "false"
        );

        botaoMenu.setAttribute(
            "aria-label",
            "Abrir menu"
        );
    }

    /* ABRIR OU FECHAR MENU */

    botaoMenu.addEventListener("click", function () {

        const aberto = menu.classList.toggle("open");

        botaoMenu.classList.toggle("active", aberto);

        botaoMenu.setAttribute(
            "aria-expanded",
            String(aberto)
        );

        botaoMenu.setAttribute(
            "aria-label",
            aberto ? "Fechar menu" : "Abrir menu"
        );

    });

    /* FECHAR AO CLICAR EM UM LINK */

    menu.querySelectorAll("a").forEach(function (link) {

        link.addEventListener("click", fecharMenu);

    });

    /* FECHAR AO CLICAR FORA */

    document.addEventListener("click", function (evento) {

        if (!evento.target.closest(".nav")) {

            fecharMenu();

        }

    });

    /* FECHAR COM ESCAPE */

    document.addEventListener("keydown", function (evento) {

        if (evento.key === "Escape") {

            fecharMenu();

        }

    });

    /* FECHAR AO VOLTAR PARA DESKTOP */

    window.addEventListener("resize", function () {

        if (window.innerWidth > 980) {

            fecharMenu();

        }

    });

}

/* ==========================================
   INICIALIZAÇÃO
   ========================================== */

function iniciarPagina() {

    configurarMenuMobile();

    if (
        formAviso &&
        listaAvisos &&
        totalAvisos &&
        totalFixados
    ) {

        carregarTurmas();

        carregarAvisos();

    } else {

        console.error(
            "Não foi possível encontrar todos os elementos da página."
        );

    }
}

if (document.readyState === "loading") {

    document.addEventListener("DOMContentLoaded", iniciarPagina);

} else {

    iniciarPagina();

}
