

console.log("AvisosAluno.js foi carregado!");

document.addEventListener("DOMContentLoaded", carregarAvisosAluno);

async function carregarAvisosAluno() {
    const contador = document.getElementById("contadorAvisos");
    const fixados = document.getElementById("avisosFixados");
    const lista = document.getElementById("listaAvisos");

    try {
        const resposta = await fetch("/api/avisos", {
            credentials: "same-origin"
        });

        if (!resposta.ok) {
            throw new Error("Erro ao buscar avisos: " + resposta.status);
        }

        const avisos = await resposta.json();

        contador.textContent =
            avisos.length + (avisos.length === 1 ? " aviso" : " avisos");

        fixados.innerHTML = "";
        lista.innerHTML = "";

        const avisosFixados = avisos.filter(aviso => aviso.fixado);
        const avisosNormais = avisos.filter(aviso => !aviso.fixado);

        if (avisos.length === 0) {
            lista.textContent = "Nenhum aviso disponível no momento.";
            return;
        }

        avisosFixados.forEach(aviso => {
            const card = document.createElement("section");
            card.className = "pinned-card";

            const cabecalho = document.createElement("div");
            cabecalho.className = "pinned-header";

            const etiqueta = document.createElement("div");
            etiqueta.className = "pinned-label";
            etiqueta.textContent = "📌 FIXADO";

            const data = document.createElement("div");
            data.className = "pinned-date";
            data.textContent = formatarData(aviso.criado_em);

            cabecalho.append(etiqueta, data);

            const conteudo = document.createElement("div");
            conteudo.className = "pinned-content";

            const titulo = document.createElement("h2");
            titulo.textContent = aviso.titulo;

            const mensagem = document.createElement("p");
            mensagem.textContent = aviso.mensagem;
            mensagem.style.whiteSpace = "pre-line";

            const autor = document.createElement("div");
            autor.className = "notice-author";
            autor.textContent = "👩‍🏫 " +
                (aviso.professor_nome || "Professor(a)");

            conteudo.append(titulo, mensagem, autor);
            card.append(cabecalho, conteudo);
            fixados.appendChild(card);
        });

        avisosNormais.forEach(aviso => {
            const card = document.createElement("article");
            card.className = "notice-card";

            const topo = document.createElement("div");
            topo.className = "notice-card-top";

            const publico = document.createElement("span");
            publico.className = "notice-type";
            publico.textContent = nomePublico(aviso.publico);

            const data = document.createElement("span");
            data.className = "notice-date";
            data.textContent = formatarData(aviso.criado_em);

            topo.append(publico, data);

            const titulo = document.createElement("h3");
            titulo.textContent = aviso.titulo;

            const mensagem = document.createElement("p");
            mensagem.textContent = aviso.mensagem;
            mensagem.style.whiteSpace = "pre-line";

            const rodape = document.createElement("div");
            rodape.className = "notice-footer";

            const autor = document.createElement("span");
            autor.textContent = "👩‍🏫 " +
                (aviso.professor_nome || "Professor(a)");

            rodape.appendChild(autor);
            card.append(topo, titulo, mensagem, rodape);
            lista.appendChild(card);
        });

    } catch (erro) {
        console.error("Erro ao carregar avisos da aluna:", erro);
        contador.textContent = "Avisos indisponíveis";
        fixados.innerHTML = "";
        lista.textContent = "Não foi possível carregar os avisos.";
    }
}

function formatarData(data) {
    if (!data) return "";
    const valor = new Date(data);
    return Number.isNaN(valor.getTime())
        ? ""
        : valor.toLocaleDateString("pt-BR");
}

function nomePublico(publico) {
    const nomes = {
        todas: "📢 Todas as alunas",
        turma_a: "📚 Turma A",
        turma_b: "📚 Turma B"
    };

    return nomes[publico] || "📢 Aviso";
}
