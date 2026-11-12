// ==========================================================================
// Tela de chamada do professor
// --------------------------------------------------------------------------
// 1. O professor escolhe a turma e a data.
// 2. As alunas da turma vêm do cadastro feito na tela de cadastros.
// 3. Marca quem está presente e salva. A chamada fica guardada no banco e,
//    se ele escolher a mesma turma e data depois, ela é reaberta para edição.
// ==========================================================================

const selecionarTurma = document.getElementById("selecionarTurma");
const dataChamada = document.getElementById("dataChamada");
const avisoChamada = document.getElementById("avisoChamada");
const listaChamada = document.getElementById("listaChamada");
const marcarTodas = document.getElementById("marcarTodas");
const salvarChamada = document.getElementById("salvarChamada");
const contadorPresentes = document.getElementById("contadorPresentes");
const mensagemChamada = document.getElementById("mensagemChamada");

// Estado da tela
let turmaAtual = "";        // turma cuja lista está na tela
let dataAtual = "";         // data (AAAA-MM-DD) cuja chamada está na tela
let alunas = [];            // [{ id, nome, presente }]
let chamadaExiste = false;  // já existe chamada salva para turma + data?
let alteracoesPendentes = false;


// ---------- funções auxiliares ----------

// Data de hoje no horário local, no formato AAAA-MM-DD.
// (toISOString() usaria UTC e, à noite, mostraria o dia seguinte.)
function dataDeHoje() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");
    return ano + "-" + mes + "-" + dia;
}

// Converte AAAA-MM-DD para DD/MM/AAAA.
function formatarData(valor) {
    const partes = valor.split("-");
    return partes[2] + "/" + partes[1] + "/" + partes[0];
}

function mostrarMensagem(texto, erro) {
    mensagemChamada.textContent = texto;
    mensagemChamada.classList.toggle("erro", Boolean(erro));
    mensagemChamada.style.display = "block";
}

function limparMensagem() {
    mensagemChamada.textContent = "";
    mensagemChamada.style.display = "none";
}

// Chama o servidor e devolve o JSON. Se der erro, lança uma exceção
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

function confirmarDescarte() {
    return !alteracoesPendentes ||
        confirm("Há marcações que ainda não foram salvas. Deseja descartá-las?");
}


// ---------- desenho da tela ----------

function textoVazio(texto) {
    const vazio = document.createElement("p");
    vazio.className = "lista-vazia";
    vazio.textContent = texto;
    return vazio;
}

function desenharChamada() {
    listaChamada.textContent = "";

    if (!turmaAtual) {
        listaChamada.appendChild(textoVazio("Escolha a turma para começar a chamada."));
    } else if (!dataAtual) {
        listaChamada.appendChild(textoVazio("Escolha a data da chamada."));
    } else if (!alunas.length) {
        listaChamada.appendChild(textoVazio("Nenhuma aluna nesta turma. Cadastre as alunas na tela Alunas."));
    }

    // Só mostra as alunas se turma e data estiverem escolhidas.
    if (turmaAtual && dataAtual) {
        alunas.forEach(function (aluna) {
            const linha = document.createElement("label");
            linha.className = "aluna";

            const nome = document.createElement("span");
            nome.textContent = aluna.nome;

            const caixa = document.createElement("input");
            caixa.type = "checkbox";
            caixa.className = "presenca";
            caixa.dataset.id = aluna.id;
            caixa.checked = aluna.presente === true;

            linha.append(nome, caixa);
            listaChamada.appendChild(linha);
        });
    }

    atualizarResumo();
}

// Atualiza "Marcar todas", o contador e o botão de salvar.
function atualizarResumo() {
    const mostrando = Boolean(turmaAtual && dataAtual && alunas.length);
    const presentes = alunas.filter(function (aluna) { return aluna.presente === true; }).length;

    marcarTodas.disabled = !mostrando;
    salvarChamada.disabled = !mostrando;
    marcarTodas.checked = mostrando && presentes === alunas.length;
    marcarTodas.indeterminate = mostrando && presentes > 0 && presentes < alunas.length;
    contadorPresentes.textContent = mostrando ? presentes + " de " + alunas.length + " presentes" : "";
}

function atualizarAviso() {
    if (turmaAtual && dataAtual && chamadaExiste) {
        avisoChamada.textContent = "Já existe uma chamada salva para esta turma em " +
            formatarData(dataAtual) + ". Salvar de novo vai atualizá-la.";
        avisoChamada.style.display = "block";
    } else {
        avisoChamada.textContent = "";
        avisoChamada.style.display = "none";
    }
}


// ---------- carregar dados do servidor ----------

// Busca no servidor as alunas da turma e a chamada da data escolhida.
// Com manterMarcacoes = true, as marcações ainda não salvas são preservadas.
async function carregarChamada(manterMarcacoes) {
    const marcacoes = {};
    if (manterMarcacoes) {
        alunas.forEach(function (aluna) { marcacoes[aluna.id] = aluna.presente; });
    }

    if (!turmaAtual) {
        alunas = [];
        chamadaExiste = false;
        alteracoesPendentes = false;
        desenharChamada();
        atualizarAviso();
        return;
    }

    // Sem data, busca só a lista de alunas.
    const consulta = dataAtual
        ? "/api/chamada?turma=" + encodeURIComponent(turmaAtual) + "&data=" + dataAtual
        : "/api/chamada/alunas?turma=" + encodeURIComponent(turmaAtual);
    const dados = await api(consulta);

    chamadaExiste = Boolean(dados.existe);
    alunas = dados.alunas.map(function (aluna) {
        // Todas começam presentes: o professor só desmarca quem faltou.
        // Chamada já salva: vale o que foi gravado. Aluna sem registro (por
        // exemplo, cadastrada depois da chamada) também começa presente.
        const salvo = aluna.presente === null || aluna.presente === undefined ? true : aluna.presente === true;
        const local = marcacoes[aluna.id];
        return { id: aluna.id, nome: aluna.nome, presente: local === undefined ? salvo : local };
    });
    if (!manterMarcacoes) alteracoesPendentes = false;

    desenharChamada();
    atualizarAviso();
}

async function carregarEMostrarErro(manterMarcacoes) {
    try {
        await carregarChamada(manterMarcacoes);
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
}

async function carregarTurmas() {
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


// ---------- eventos ----------

selecionarTurma.addEventListener("change", function () {
    if (!confirmarDescarte()) {
        selecionarTurma.value = turmaAtual;
        return;
    }
    turmaAtual = selecionarTurma.value;
    limparMensagem();
    carregarEMostrarErro(false);
});

dataChamada.addEventListener("change", function () {
    if (!confirmarDescarte()) {
        dataChamada.value = dataAtual;
        return;
    }
    dataAtual = dataChamada.value;
    limparMensagem();
    carregarEMostrarErro(false);
});

// Marcar ou desmarcar uma aluna.
listaChamada.addEventListener("change", function (evento) {
    const caixa = evento.target;
    if (!caixa.classList.contains("presenca")) return;

    const aluna = alunas.find(function (a) { return String(a.id) === caixa.dataset.id; });
    if (!aluna) return;
    aluna.presente = caixa.checked;
    alteracoesPendentes = true;
    atualizarResumo();
});

marcarTodas.addEventListener("change", function () {
    alunas.forEach(function (aluna) { aluna.presente = marcarTodas.checked; });
    alteracoesPendentes = true;
    desenharChamada();
});

salvarChamada.addEventListener("click", async function () {
    if (!turmaAtual) {
        mostrarMensagem("Selecione a turma antes de salvar a chamada.", true);
        selecionarTurma.focus();
        return;
    }
    if (!dataAtual) {
        mostrarMensagem("Selecione a data da chamada antes de salvar.", true);
        dataChamada.focus();
        return;
    }

    salvarChamada.disabled = true;
    try {
        const dados = await api("/api/chamada", {
            method: "PUT",
            body: JSON.stringify({
                turma: turmaAtual,
                data: dataAtual,
                presencas: alunas.map(function (aluna) {
                    return { aluna_id: aluna.id, presente: aluna.presente === true };
                })
            })
        });

        alteracoesPendentes = false;
        chamadaExiste = true;
        atualizarAviso();
        mostrarMensagem("✓ Chamada da " + turmaAtual + " do dia " + formatarData(dataAtual) +
            " salva: " + dados.presentes + " de " + dados.total + " presentes.", false);
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    } finally {
        salvarChamada.disabled = false;
        atualizarResumo();
    }
});

// Avisa antes de fechar a página com marcações não salvas.
window.addEventListener("beforeunload", function (evento) {
    if (alteracoesPendentes) {
        evento.preventDefault();
        evento.returnValue = "";
    }
});


// ---------- início ----------

dataChamada.max = dataDeHoje();
dataChamada.value = dataDeHoje();
dataAtual = dataChamada.value;

desenharChamada();
atualizarAviso();
carregarTurmas();
