/* ==========================================
   FOR WOMEN — FUNÇÕES COMUNS DOS CADASTROS
   Usado pelas páginas de turmas e de alunas.
   ========================================== */

/* REQUISIÇÕES PARA API */

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

/* INICIAIS DO PROFESSOR NO AVATAR */

async function preencherAvatar() {

    try {

        const usuario = await requisitarAPI("/api/usuario");

        const partes = (usuario.nome || "Professor").trim().split(" ");

        let iniciais = partes[0][0];

        if (partes.length > 1) {
            iniciais += partes[partes.length - 1][0];
        }

        document.querySelector(".avatar").textContent = iniciais.toUpperCase();

    } catch (erro) {

        console.error("Erro ao carregar usuário:", erro);

    }
}

/* MENU RESPONSIVO */

function configurarMenuMobile() {

    const botaoMenu = document.getElementById("menuToggle");

    const menu = document.getElementById("menuNavegacao");

    if (!botaoMenu || !menu) return;

    function fecharMenu() {

        menu.classList.remove("open");

        botaoMenu.classList.remove("active");

        botaoMenu.setAttribute("aria-expanded", "false");

        botaoMenu.setAttribute("aria-label", "Abrir menu");
    }

    botaoMenu.addEventListener("click", function () {

        const aberto = menu.classList.toggle("open");

        botaoMenu.classList.toggle("active", aberto);

        botaoMenu.setAttribute("aria-expanded", String(aberto));

        botaoMenu.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");

    });

    menu.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", fecharMenu);
    });

    document.addEventListener("click", function (evento) {
        if (!evento.target.closest(".nav")) {
            fecharMenu();
        }
    });

    document.addEventListener("keydown", function (evento) {
        if (evento.key === "Escape") {
            fecharMenu();
        }
    });

    window.addEventListener("resize", function () {
        if (window.innerWidth > 980) {
            fecharMenu();
        }
    });
}

/* MONTA UM CARD COM TÍTULO, LINHAS DE DADOS E BOTÕES EDITAR / EXCLUIR */

function criarCard(titulo, linhas, aoEditar, aoExcluir) {

    const card = document.createElement("article");

    card.className = "card-aviso";

    const h3 = document.createElement("h3");

    h3.textContent = titulo;

    card.appendChild(h3);

    linhas.forEach(function ([rotulo, valor]) {

        const p = document.createElement("p");

        p.className = "dado";

        const forte = document.createElement("strong");

        forte.textContent = rotulo + ": ";

        p.append(forte, valor);

        card.appendChild(p);

    });

    const botoes = document.createElement("div");

    botoes.className = "acoes-aviso";

    const botaoEditar = document.createElement("button");

    botaoEditar.type = "button";

    botaoEditar.textContent = "Editar";

    botaoEditar.addEventListener("click", aoEditar);

    const botaoExcluir = document.createElement("button");

    botaoExcluir.type = "button";

    botaoExcluir.textContent = "Excluir";

    botaoExcluir.addEventListener("click", aoExcluir);

    botoes.append(botaoEditar, botaoExcluir);

    card.appendChild(botoes);

    return card;
}

function mostrarListaVazia(lista, texto) {

    const vazio = document.createElement("p");

    vazio.className = "lista-vazia";

    vazio.textContent = texto;

    lista.replaceChildren(vazio);
}

/* INICIALIZAÇÃO COMUM */

configurarMenuMobile();

preencherAvatar();
