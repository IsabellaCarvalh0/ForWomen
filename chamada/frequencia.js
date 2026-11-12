// ==========================================================================
// Frequência da turma (professor)
// --------------------------------------------------------------------------
// 1. O professor escolhe a turma e informa o total de aulas previstas.
//    O sistema calcula na hora a frequência mínima (75%).
// 2. A tabela mostra presenças, faltas e frequência de cada aluna.
// 3. Cada aluna da chamada é ligada ao login dela, para ela ver a própria
//    frequência. O sistema liga sozinho quando o nome é igual.
// ==========================================================================

const FREQUENCIA_MINIMA = 75; // precisa ser igual ao valor de frequencia-api.js

const selecionarTurma = document.getElementById("selecionarTurma");
const totalAulas = document.getElementById("totalAulas");
const salvarTotal = document.getElementById("salvarTotal");
const calculo = document.getElementById("calculo");
const avisoLogins = document.getElementById("avisoLogins");
const corpoTabela = document.getElementById("corpoTabela");

let turmaAtual = "";
let dados = null;


// ---------- cálculo da frequência mínima ----------

// Mesma conta do servidor: a base é o maior entre o total previsto e as
// chamadas já feitas; o mínimo é 75% da base, arredondado para cima.
function calcularMinimo(total, realizadas) {
    const base = Math.max(total, realizadas);
    const presencasMinimas = Math.floor((base * FREQUENCIA_MINIMA + 99) / 100);
    return { base: base, presencasMinimas: presencasMinimas, faltasPermitidas: base - presencasMinimas };
}

function desenharCalculo() {
    calculo.textContent = "";

    if (!turmaAtual) return;

    const total = parseInt(totalAulas.value, 10);
    if (!total || total < 1) {
        calculo.appendChild(criarElemento("p", "calculo-vazio",
            "Informe o total de aulas previstas para calcular a frequência mínima."));
        return;
    }

    const realizadas = dados ? dados.aulas_realizadas : 0;
    const resultado = calcularMinimo(total, realizadas);

    const itens = [
        ["Frequência mínima", FREQUENCIA_MINIMA + "%"],
        ["Presenças necessárias", resultado.presencasMinimas + " de " + resultado.base + " aulas"],
        ["Faltas permitidas", "até " + resultado.faltasPermitidas],
        ["Aulas já registradas", realizadas + " de " + resultado.base]
    ];
    itens.forEach(function (item) {
        const cartao = criarElemento("div", "cartao-calculo");
        cartao.append(criarElemento("span", "rotulo", item[0]), criarElemento("strong", "valor", item[1]));
        calculo.appendChild(cartao);
    });

    if (realizadas > total) {
        calculo.appendChild(criarElemento("p", "calculo-alerta",
            "Já existem mais chamadas (" + realizadas + ") do que o total informado. O cálculo usa " + realizadas + " aulas."));
    }
}


// ---------- tabela ----------

function criarBarra(frequencia, apta) {
    const barra = criarElemento("div", "barra");
    const preenchimento = criarElemento("div", "preenchimento " + (apta === false ? "abaixo" : "ok"));
    preenchimento.style.width = Math.max(0, Math.min(100, frequencia)) + "%";
    const marca = criarElemento("span", "marca-minimo");
    marca.style.left = FREQUENCIA_MINIMA + "%";
    marca.title = "Mínimo de " + FREQUENCIA_MINIMA + "%";
    barra.append(preenchimento, marca);
    return barra;
}

function criarSituacao(aluna) {
    if (aluna.apta === null) return criarElemento("span", "selo neutro", "—");
    if (!aluna.apta) return criarElemento("span", "selo abaixo", "Abaixo do mínimo");
    if (aluna.faltas_restantes === 0) return criarElemento("span", "selo limite", "No limite de faltas");
    const restantes = aluna.faltas_restantes === 1 ? "1 falta restante" : aluna.faltas_restantes + " faltas restantes";
    return criarElemento("span", "selo ok", restantes);
}

function criarSeletorDeLogin(aluna) {
    const seletor = criarElemento("select", "campo-login");
    seletor.dataset.id = aluna.id;
    seletor.setAttribute("aria-label", "Login de " + aluna.nome);

    const nenhum = criarElemento("option", "", aluna.usuario_id ? "Desligar do login" : "Sem login");
    nenhum.value = "";
    seletor.appendChild(nenhum);

    if (aluna.usuario_id) {
        const atual = criarElemento("option", "", aluna.usuario_email);
        atual.value = String(aluna.usuario_id);
        seletor.appendChild(atual);
        seletor.value = String(aluna.usuario_id);
    }
    dados.logins_livres.forEach(function (login) {
        const opcao = criarElemento("option", "", login.nome + " (" + login.email + ")");
        opcao.value = String(login.id);
        seletor.appendChild(opcao);
    });
    if (!aluna.usuario_id) seletor.value = "";
    return seletor;
}

function desenharTabela() {
    corpoTabela.textContent = "";

    if (!turmaAtual) {
        linhaUnica("Escolha a turma para ver a frequência.");
    } else if (!dados.alunas.length) {
        linhaUnica("Nenhuma aluna cadastrada nesta turma. Cadastre as alunas na página Chamada.");
    } else {
        dados.alunas.forEach(function (aluna) {
            const linha = document.createElement("tr");
            const celulaFrequencia = criarElemento("td", "celula-frequencia");
            celulaFrequencia.append(criarBarra(aluna.frequencia, aluna.apta), criarElemento("span", "percentual", formatarPorcentagem(aluna.frequencia)));

            const celulaLogin = criarElemento("td");
            celulaLogin.appendChild(criarSeletorDeLogin(aluna));

            const celulaSituacao = criarElemento("td");
            celulaSituacao.appendChild(criarSituacao(aluna));

            const celulaPresencas = criarElemento("td", "num", String(aluna.presencas));
            const celulaFaltas = criarElemento("td", "num", String(aluna.faltas));

            // No celular a tabela vira cartões; o CSS mostra estes títulos.
            celulaPresencas.dataset.rotulo = "Presenças";
            celulaFaltas.dataset.rotulo = "Faltas";
            celulaFrequencia.dataset.rotulo = "Frequência";
            celulaSituacao.dataset.rotulo = "Situação";
            celulaLogin.dataset.rotulo = "Login";

            linha.append(
                criarElemento("td", "nome-aluna", aluna.nome),
                celulaPresencas,
                celulaFaltas,
                celulaFrequencia,
                celulaSituacao,
                celulaLogin
            );
            corpoTabela.appendChild(linha);
        });
    }

    // Aviso das alunas que ainda não têm login ligado.
    const semLogin = turmaAtual ? dados.alunas.filter(function (a) { return !a.usuario_id; }).length : 0;
    if (semLogin) {
        avisoLogins.textContent = (semLogin === 1 ? "1 aluna está" : semLogin + " alunas estão") +
            " sem login ligado e não consegue ver a própria frequência. Escolha o login na última coluna.";
        avisoLogins.style.display = "block";
    } else {
        avisoLogins.style.display = "none";
    }
}

function linhaUnica(texto) {
    const linha = document.createElement("tr");
    const celula = criarElemento("td", "lista-vazia", texto);
    celula.colSpan = 6;
    linha.appendChild(celula);
    corpoTabela.appendChild(linha);
}


// ---------- carregar ----------

async function carregar() {
    if (!turmaAtual) {
        dados = null;
        totalAulas.value = "";
        totalAulas.disabled = true;
        salvarTotal.disabled = true;
        desenharCalculo();
        desenharTabela();
        return;
    }

    dados = await api("/api/chamada/curso?turma=" + encodeURIComponent(turmaAtual));
    totalAulas.disabled = false;
    salvarTotal.disabled = false;
    totalAulas.value = dados.total_aulas || "";
    desenharCalculo();
    desenharTabela();
}

async function carregarEMostrarErro() {
    try {
        await carregar();
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
}


// ---------- eventos ----------

selecionarTurma.addEventListener("change", function () {
    turmaAtual = selecionarTurma.value;
    limparMensagem();
    carregarEMostrarErro();
});

// O cálculo aparece enquanto o professor digita.
totalAulas.addEventListener("input", desenharCalculo);

salvarTotal.addEventListener("click", async function () {
    const total = parseInt(totalAulas.value, 10);
    if (!total || total < 1 || total > 500) {
        mostrarMensagem("Digite um total de aulas entre 1 e 500.", true);
        totalAulas.focus();
        return;
    }

    salvarTotal.disabled = true;
    try {
        await api("/api/chamada/curso", { method: "PUT", body: JSON.stringify({ turma: turmaAtual, total_aulas: total }) });
        await carregar();
        mostrarMensagem("✓ Total de aulas salvo. A frequência de todas as alunas foi recalculada.", false);
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    } finally {
        salvarTotal.disabled = false;
    }
});

// Ligar ou desligar uma aluna de um login.
corpoTabela.addEventListener("change", async function (evento) {
    const seletor = evento.target;
    if (!seletor.classList.contains("campo-login")) return;

    seletor.disabled = true;
    try {
        await api("/api/chamada/alunas/" + seletor.dataset.id + "/vinculo", {
            method: "PUT",
            body: JSON.stringify({ usuario_id: seletor.value ? Number(seletor.value) : null })
        });
        await carregar();
        mostrarMensagem("✓ Login atualizado.", false);
    } catch (erro) {
        mostrarMensagem(erro.message, true);
        await carregarEMostrarErro();
    }
});


// ---------- início ----------

desenharTabela();
carregarTurmas(selecionarTurma);
