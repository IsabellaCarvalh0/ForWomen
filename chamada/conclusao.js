// ==========================================================================
// Conclusão do curso (professor)
// --------------------------------------------------------------------------
// Mostra quem pode emitir o certificado (frequência de 75% ou mais) e quem
// não pode. O professor libera os certificados quando o curso termina; só
// as alunas aptas conseguem emitir. A liberação pode ser desfeita.
// ==========================================================================

const selecionarTurma = document.getElementById("selecionarTurma");
const resumoCurso = document.getElementById("resumoCurso");
const faixaLiberacao = document.getElementById("faixaLiberacao");
const botaoLiberar = document.getElementById("botaoLiberar");
const botaoBloquear = document.getElementById("botaoBloquear");
const listaAptas = document.getElementById("listaAptas");
const listaNaoAptas = document.getElementById("listaNaoAptas");
const totalAptas = document.getElementById("totalAptas");
const totalNaoAptas = document.getElementById("totalNaoAptas");

let turmaAtual = "";
let dados = null;


function itemDaLista(aluna) {
    const item = criarElemento("li");
    item.appendChild(criarElemento("span", "nome-aluna", aluna.nome));

    const detalhe = aluna.faltas === 1 ? "1 falta" : aluna.faltas + " faltas";
    item.appendChild(criarElemento("span", "detalhe", detalhe + " · " + formatarPorcentagem(aluna.frequencia)));
    if (!aluna.usuario_id) {
        const aviso = criarElemento("span", "selo neutro", "sem login");
        aviso.title = "Esta aluna não tem login ligado e não conseguirá emitir. Ligue na página Frequência.";
        item.appendChild(aviso);
    }
    return item;
}

function preencherLista(lista, alunas, textoVazio) {
    lista.textContent = "";
    if (!alunas.length) lista.appendChild(criarElemento("li", "lista-vazia", textoVazio));
    alunas.forEach(function (aluna) { lista.appendChild(itemDaLista(aluna)); });
}

function desenhar() {
    resumoCurso.textContent = "";
    faixaLiberacao.textContent = "";
    faixaLiberacao.className = "faixa-liberacao";
    botaoLiberar.disabled = true;
    botaoBloquear.hidden = true;
    botaoLiberar.hidden = false;

    if (!turmaAtual || !dados) {
        preencherLista(listaAptas, [], "Escolha a turma.");
        preencherLista(listaNaoAptas, [], "Escolha a turma.");
        totalAptas.textContent = "";
        totalNaoAptas.textContent = "";
        return;
    }

    // Sem o total de aulas não dá para dizer quem está apta.
    if (!dados.total_aulas) {
        faixaLiberacao.classList.add("aviso");
        faixaLiberacao.append("Defina o total de aulas da turma na página ");
        const link = criarElemento("a", "", "Frequência");
        link.href = "frequencia.html";
        faixaLiberacao.append(link, " para calcular quem pode emitir o certificado.");
        preencherLista(listaAptas, [], "Total de aulas não definido.");
        preencherLista(listaNaoAptas, [], "Total de aulas não definido.");
        totalAptas.textContent = "";
        totalNaoAptas.textContent = "";
        return;
    }

    const aptas = dados.alunas.filter(function (a) { return a.apta; });
    const naoAptas = dados.alunas.filter(function (a) { return !a.apta; });

    const info = criarElemento("div", "cartao-calculo");
    info.append(
        criarElemento("span", "rotulo", "Regra"),
        criarElemento("strong", "valor", dados.frequencia_minima + "% · até " + dados.faltas_permitidas + " faltas em " + dados.base + " aulas")
    );
    resumoCurso.appendChild(info);

    totalAptas.textContent = "(" + aptas.length + ")";
    totalNaoAptas.textContent = "(" + naoAptas.length + ")";
    preencherLista(listaAptas, aptas, "Nenhuma aluna apta até agora.");
    preencherLista(listaNaoAptas, naoAptas, "Todas as alunas estão dentro da frequência mínima.");

    if (dados.liberado) {
        faixaLiberacao.classList.add("liberado");
        faixaLiberacao.textContent = "✓ Certificados liberados em " + formatarData(dados.liberado_em) +
            (dados.liberado_por ? " por " + dados.liberado_por : "") +
            ". As alunas aptas já podem emitir o certificado.";
        botaoLiberar.hidden = true;
        botaoBloquear.hidden = false;
    } else {
        faixaLiberacao.classList.add("bloqueado");
        faixaLiberacao.textContent = "Os certificados ainda não foram liberados. As alunas não conseguem emitir.";
        botaoLiberar.disabled = !dados.aulas_realizadas || !dados.alunas.length;
    }
}

async function carregar() {
    dados = turmaAtual ? await api("/api/chamada/curso?turma=" + encodeURIComponent(turmaAtual)) : null;
    desenhar();
}

async function carregarEMostrarErro() {
    try {
        await carregar();
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
}


selecionarTurma.addEventListener("change", function () {
    turmaAtual = selecionarTurma.value;
    limparMensagem();
    carregarEMostrarErro();
});

botaoLiberar.addEventListener("click", async function () {
    const aptas = dados.alunas.filter(function (a) { return a.apta; }).length;
    const naoAptas = dados.alunas.length - aptas;
    const certeza = confirm(
        "Liberar os certificados da " + turmaAtual + "?\n\n" +
        aptas + " aluna(s) poderão emitir. " + naoAptas + " não atingiram a frequência mínima e não poderão.\n\n" +
        "Você pode bloquear de novo depois, se precisar."
    );
    if (!certeza) return;

    botaoLiberar.disabled = true;
    try {
        await api("/api/chamada/curso/liberar", { method: "POST", body: JSON.stringify({ turma: turmaAtual }) });
        await carregar();
        mostrarMensagem("✓ Certificados liberados para as alunas aptas.", false);
    } catch (erro) {
        mostrarMensagem(erro.message, true);
        desenhar();
    }
});

botaoBloquear.addEventListener("click", async function () {
    if (!confirm("Bloquear os certificados da " + turmaAtual + "?\n\nAs alunas deixam de conseguir emitir até você liberar de novo.")) return;

    botaoBloquear.disabled = true;
    try {
        await api("/api/chamada/curso/bloquear", { method: "POST", body: JSON.stringify({ turma: turmaAtual }) });
        await carregar();
        mostrarMensagem("Certificados bloqueados.", false);
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    } finally {
        botaoBloquear.disabled = false;
    }
});


desenhar();
carregarTurmas(selecionarTurma);
