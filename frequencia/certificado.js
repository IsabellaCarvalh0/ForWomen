// Mostra o certificado da aluna. O servidor só entrega os dados se o professor
// liberou os certificados e se a aluna atingiu a frequência mínima.

const mensagem = document.getElementById("mensagem");
const acoes = document.getElementById("acoes");
const folha = document.getElementById("folha");

function porcentagem(valor) {
    return String(valor).replace(".", ",") + "%";
}

async function carregarCertificado() {
    let dados;
    try {
        const resposta = await fetch("/api/frequencia/certificado", { credentials: "same-origin" });
        dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados.erro || "Não foi possível emitir o certificado.");
    } catch (erro) {
        const aviso = document.createElement("p");
        aviso.className = "erro-pagina";
        aviso.textContent = erro.message;
        mensagem.appendChild(aviso);

        acoes.hidden = false;
        document.getElementById("botaoImprimir").hidden = true;
        return;
    }

    document.getElementById("certNome").textContent = dados.nome;
    document.getElementById("certTexto").textContent =
        "concluiu o curso For Women (" + dados.turma + "), com frequência de " +
        porcentagem(dados.frequencia) + " em " + dados.total_aulas + " aulas.";
    document.getElementById("certProfessor").textContent = dados.professor || "Professor(a)";
    document.getElementById("certEmissao").textContent = "Emitido em " +
        new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

    folha.hidden = false;
    acoes.hidden = false;
}

document.getElementById("botaoImprimir").addEventListener("click", function () {
    window.print();
});

carregarCertificado();
