async function configurarMenu() {
    try {
        const resposta = await fetch("/api/usuario");
        if (!resposta.ok) return;

        const usuario = await resposta.json();

        if (usuario.tipo === "professor") {
            document.getElementById("linkChamada").style.display = "";

            document.querySelectorAll(
                'a[href="/Avisos/Avisos.html"]'
            ).forEach(link => {
                link.href = "/Avisos/AvisosProfessor.html";
            });
        }
    } catch (erro) {
        console.error("Erro ao configurar menu:", erro);
    }
}

document.addEventListener("DOMContentLoaded", configurarMenu);
document.addEventListener("DOMContentLoaded", carregarAvisosFixados);

async function carregarAvisosFixados() {
    const container = document.getElementById("avisosFixadosInicio");

    if (!container) return;

    try {
        // Busca somente os avisos fixados
        const resposta = await fetch("/api/avisos?fixados=true", {
            credentials: "same-origin"
        });

        if (!resposta.ok) {
            throw new Error("Erro ao buscar avisos: " + resposta.status);
        }

        const avisos = await resposta.json();

        // Limpa os avisos anteriores
        container.innerHTML = "";

        // Caso não existam avisos fixados
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

        // Cria um card para cada aviso fixado
        avisos.forEach(aviso => {
            const card = document.createElement("div");
            card.className = "pinned-card";

            // Cabeçalho
            const cabecalho = document.createElement("div");
            cabecalho.className = "pinned-header";

            const etiqueta = document.createElement("div");
            etiqueta.className = "pinned-label";
            etiqueta.textContent = "📌 FIXADO";

            cabecalho.appendChild(etiqueta);

            // Conteúdo do aviso
            const conteudo = document.createElement("div");
            conteudo.className = "pinned-content";

            const titulo = document.createElement("h2");
            titulo.textContent = aviso.titulo;

            const mensagem = document.createElement("p");
            mensagem.textContent = aviso.mensagem;

            conteudo.appendChild(titulo);
            conteudo.appendChild(mensagem);

            // Rodapé
            const rodape = document.createElement("div");
            rodape.className = "pinned-footer";

            const origem = document.createElement("span");
            origem.textContent = "🔔 Avisos";

            const link = document.createElement("a");
            link.href = "/Avisos/Avisos.html";
            link.textContent = "Ver avisos →";

            rodape.appendChild(origem);
            rodape.appendChild(link);

            // Monta o card
            card.appendChild(cabecalho);
            card.appendChild(conteudo);
            card.appendChild(rodape);

            // Adiciona o aviso à Página Inicial
            container.appendChild(card);
        });

    } catch (erro) {
        console.error("Erro ao carregar avisos fixados:", erro);

        container.innerHTML = "";

        const mensagem = document.createElement("p");
        mensagem.textContent = "Não foi possível carregar os avisos fixados.";

        container.appendChild(mensagem);
    }
}
async function configurarMenuProfessor() {
    try {
        const resposta = await fetch("/api/usuario", {
            credentials: "same-origin"
        });

        if (!resposta.ok) {
            throw new Error("Erro ao identificar usuário");
        }

        const usuario = await resposta.json();

        console.log("Tipo de usuário:", usuario.tipo);

        if (usuario.tipo === "professor") {
            // Exibe a opção Chamada
            const linkChamada = document.getElementById("linkChamada");

            if (linkChamada) {
                linkChamada.style.display = "inline-block";
            }

            // Direciona os avisos para a página do professor
            document.querySelectorAll(
                'a[href="/Avisos/Avisos.html"]'
            ).forEach(link => {
                link.href = "/Avisos/AvisosProfessor.html";
            });
        }

    } catch (erro) {
        console.error("Erro ao configurar menu:", erro);
    }
}

document.addEventListener("DOMContentLoaded", configurarMenuProfessor);
