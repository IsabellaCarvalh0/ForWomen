
/* Configuração do menu conforme o usuário */

async function configurarMenu() {
    try {
        const resposta = await fetch("/api/usuario", {
            credentials: "same-origin"
        });

        if (!resposta.ok) {
            throw new Error("Erro ao identificar usuário");
        }

        const usuario = await resposta.json();

        if (usuario.tipo === "professor") {

            // Mostra a opção Chamada
            const linkChamada = document.getElementById("linkChamada");

            if (linkChamada) {
                linkChamada.style.display = "inline-block";
            }

            // Mostra os links de cadastro de turmas e alunas
            document.querySelectorAll(".link-professor").forEach(link => {
                link.style.display = "inline-block";
            });

            // Direciona os avisos para a página do professor
            document.querySelectorAll(
                'a[href="/Avisos/Avisos.html"]'
            ).forEach(link => {
                link.href = "/Avisos/AvisosProfessor.html";
            });
        }

        return usuario;

    } catch (erro) {
        console.error("Erro ao configurar menu:", erro);
        return null;
    }
}

/* Menu responsivo */

function configurarMenuMobile() {
    const botao = document.getElementById("menuToggle");
    const menu = document.getElementById("menuNavegacao");

    if (!botao || !menu) {
        console.error("Elementos do menu não encontrados");
        return;
    }

    // Abre e fecha o menu
    botao.addEventListener("click", () => {
        const aberto = menu.classList.toggle("menu-aberto");

        botao.textContent = aberto ? "✕" : "☰";

        botao.setAttribute(
            "aria-expanded",
            String(aberto)
        );

        botao.setAttribute(
            "aria-label",
            aberto ? "Fechar menu" : "Abrir menu"
        );
    });

    // Fecha o menu ao clicar em um link
    menu.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            menu.classList.remove("menu-aberto");

            botao.textContent = "☰";
            botao.setAttribute("aria-expanded", "false");
            botao.setAttribute("aria-label", "Abrir menu");
        });
    });
}

/* Carregamento dos avisos fixados */

async function carregarAvisosFixados(usuario) {
    const container = document.getElementById("avisosFixadosInicio");

    if (!container) return;

    try {
        // Busca os avisos fixados
        const resposta = await fetch("/api/avisos?fixados=true", {
            credentials: "same-origin"
        });

        if (!resposta.ok) {
            throw new Error("Erro ao buscar avisos: " + resposta.status);
        }

        const dados = await resposta.json();
        const avisos = Array.isArray(dados) ? dados : [];

        // Limpa os avisos anteriores
        container.innerHTML = "";

        // Mostra mensagem quando não existem avisos
        if (avisos.length === 0) {
            const card = document.createElement("div");
            card.className = "pinned-card";

            const conteudo = document.createElement("div");
            conteudo.className = "pinned-content";

            const mensagem = document.createElement("p");
            mensagem.textContent = "Nenhum aviso fixado no momento.";

            conteudo.appendChild(mensagem);
            card.appendChild(conteudo);
            container.appendChild(card);

            return;
        }

        // Define a página conforme o perfil
        const paginaAvisos = usuario?.tipo === "professor"
            ? "/Avisos/AvisosProfessor.html"
            : "/Avisos/Avisos.html";

        // Cria os cards de avisos
        avisos.forEach(aviso => {

            // Card
            const card = document.createElement("div");
            card.className = "pinned-card";

            // Cabeçalho
            const cabecalho = document.createElement("div");
            cabecalho.className = "pinned-header";

            const etiqueta = document.createElement("div");
            etiqueta.className = "pinned-label";
            etiqueta.textContent = "📌 FIXADO";

            cabecalho.appendChild(etiqueta);

            // Conteúdo
            const conteudo = document.createElement("div");
            conteudo.className = "pinned-content";

            const titulo = document.createElement("h2");
            titulo.textContent = aviso.titulo || "Sem título";

            const mensagem = document.createElement("p");
            mensagem.textContent = aviso.mensagem || "";

            conteudo.appendChild(titulo);
            conteudo.appendChild(mensagem);

            // Rodapé
            const rodape = document.createElement("div");
            rodape.className = "pinned-footer";

            const origem = document.createElement("span");
            origem.textContent = "🔔 Avisos";

            const link = document.createElement("a");
            link.href = paginaAvisos;
            link.textContent = "Ver avisos →";

            rodape.appendChild(origem);
            rodape.appendChild(link);

            // Monta o card
            card.appendChild(cabecalho);
            card.appendChild(conteudo);
            card.appendChild(rodape);

            // Adiciona o card à página
            container.appendChild(card);
        });

    } catch (erro) {
        console.error("Erro ao carregar avisos fixados:", erro);

        container.innerHTML = "";

        const card = document.createElement("div");
        card.className = "pinned-card";

        const conteudo = document.createElement("div");
        conteudo.className = "pinned-content";

        const mensagem = document.createElement("p");
        mensagem.textContent =
            "Não foi possível carregar os avisos fixados.";

        conteudo.appendChild(mensagem);
        card.appendChild(conteudo);
        container.appendChild(card);
    }
}

/* Inicialização da página */

document.addEventListener("DOMContentLoaded", async () => {

    // Configura o menu responsivo
    configurarMenuMobile();

    // Identifica o usuário
    const usuario = await configurarMenu();

    // Carrega os avisos fixados
    await carregarAvisosFixados(usuario);
});

