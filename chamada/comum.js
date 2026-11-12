// Funções compartilhadas pelas páginas Frequência e Conclusão.

const mensagemChamada = document.getElementById("mensagemChamada");

function mostrarMensagem(texto, erro) {
    mensagemChamada.textContent = texto;
    mensagemChamada.classList.toggle("erro", Boolean(erro));
    mensagemChamada.style.display = "block";
}

function limparMensagem() {
    mensagemChamada.textContent = "";
    mensagemChamada.style.display = "none";
}

// Chama o servidor e devolve o JSON; em caso de erro, lança uma exceção
// com a mensagem que o servidor mandou.
async function api(url, opcoes) {
    const configuracao = Object.assign(
        { headers: { "Content-Type": "application/json" }, credentials: "same-origin" },
        opcoes
    );
    let resposta;
    try {
        resposta = await fetch(url, configuracao);
    } catch (erro) {
        throw new Error("Não foi possível falar com o servidor. Verifique a conexão.");
    }

    let dados = {};
    try { dados = await resposta.json(); } catch (erro) { /* resposta sem JSON */ }

    if (!resposta.ok) {
        throw new Error(dados.erro || "Algo deu errado. Tente novamente.");
    }
    return dados;
}

// Converte AAAA-MM-DD para DD/MM/AAAA.
function formatarData(valor) {
    const partes = valor.split("-");
    return partes[2] + "/" + partes[1] + "/" + partes[0];
}

// 87.5 -> "87,5%"
function formatarPorcentagem(valor) {
    return String(valor).replace(".", ",") + "%";
}

async function carregarTurmas(selecionarTurma) {
    try {
        const dados = await api("/api/chamada/turmas");
        dados.turmas.forEach(function (turma) {
            const opcao = document.createElement("option");
            opcao.value = turma;
            opcao.textContent = turma;
            selecionarTurma.appendChild(opcao);
        });
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
}

function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
}
