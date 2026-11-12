// ==========================================================================
// Minha frequência (aluna)
// --------------------------------------------------------------------------
// Começa em 100% e desce a cada falta. A frequência mínima para o certificado
// é 75% do total de aulas previstas, informado pelo professor.
// O certificado só pode ser emitido depois que o professor liberar.
// ==========================================================================

const conteudo = document.getElementById("conteudo");
const subtitulo = document.getElementById("subtitulo");
const avatar = document.getElementById("avatar");


function criar(tag, classe, texto) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
}

function porcentagem(valor) {
    return String(valor).replace(".", ",") + "%";
}

function formatarData(valor) {
    const partes = valor.split("-");
    return partes[2] + "/" + partes[1] + "/" + partes[0];
}

function diaDaSemana(valor) {
    const data = new Date(valor + "T12:00:00");
    return data.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
}

function plural(quantidade, singular, pluralTexto) {
    return quantidade + " " + (quantidade === 1 ? singular : pluralTexto);
}

function mostrarErro(texto) {
    conteudo.textContent = "";
    conteudo.appendChild(criar("p", "erro-pagina", texto));
}


// ---------- blocos da página ----------

function classificar(dados) {
    if (dados.faltas_permitidas === null) return "neutro";
    if (dados.frequencia < dados.frequencia_minima || dados.faltas > dados.faltas_permitidas) return "abaixo";
    if (dados.faltas_restantes === 0) return "limite";
    return "ok";
}

function textoDaSituacao(dados, estado) {
    if (estado === "neutro") {
        return "O professor ainda não definiu o total de aulas do curso. A frequência mostrada considera só as aulas já registradas.";
    }
    if (estado === "abaixo") {
        return "Sua frequência está abaixo do mínimo de " + dados.frequencia_minima + "% e você não poderá emitir o certificado. Fale com o professor.";
    }
    if (estado === "limite") {
        return "Atenção: você está no limite de faltas. Mais uma falta e sua frequência fica abaixo de " + dados.frequencia_minima + "%.";
    }
    return "Você está dentro da frequência mínima. Ainda pode faltar " + plural(dados.faltas_restantes, "vez", "vezes") + " e continuar apta ao certificado.";
}

function cartaoFrequencia(dados) {
    const estado = classificar(dados);
    const cartao = criar("section", "cartao");
    cartao.appendChild(criar("h2", "", dados.nome + " · " + dados.turma));

    const destaque = criar("div", "destaque");
    destaque.append(criar("span", "numero", porcentagem(dados.frequencia)), criar("span", "rotulo", "de frequência"));
    cartao.appendChild(destaque);

    const barra = criar("div", "barra-grande");
    const preenchimento = criar("div", "preenchimento " + (estado === "neutro" ? "ok" : estado));
    preenchimento.style.width = Math.max(0, Math.min(100, dados.frequencia)) + "%";
    const marca = criar("span", "marca-minimo");
    marca.style.left = dados.frequencia_minima + "%";
    const legenda = criar("span", "legenda-minimo", "mínimo " + dados.frequencia_minima + "%");
    legenda.style.left = dados.frequencia_minima + "%";
    barra.append(preenchimento, marca, legenda);
    cartao.appendChild(barra);

    cartao.appendChild(criar("p", "situacao " + estado, textoDaSituacao(dados, estado)));

    const numeros = criar("div", "numeros");
    const itens = [
        ["Aulas registradas", dados.base ? dados.aulas_realizadas + " de " + dados.base : String(dados.aulas_realizadas)],
        ["Presenças", String(dados.presencas)],
        ["Faltas", String(dados.faltas)],
        ["Faltas permitidas", dados.faltas_permitidas === null ? "—" : "até " + dados.faltas_permitidas]
    ];
    itens.forEach(function (item) {
        const caixa = criar("div");
        caixa.append(criar("span", "", item[0]), criar("strong", "", item[1]));
        numeros.appendChild(caixa);
    });
    cartao.appendChild(numeros);
    return cartao;
}

function cartaoHistorico(dados) {
    const cartao = criar("section", "cartao");
    cartao.appendChild(criar("h2", "", "Minhas aulas"));

    if (!dados.historico.length) {
        cartao.appendChild(criar("p", "vazio", "Nenhuma chamada registrada ainda."));
        return cartao;
    }

    const cabecalho = criar("div", "cabecalho-historico");
    cabecalho.append(criar("span", "", "Data"), criar("span", "", "Presença"));
    cartao.appendChild(cabecalho);

    dados.historico.forEach(function (aula) {
        const linha = criar("div", "linha-historico");
        linha.appendChild(criar("span", "", formatarData(aula.data) + " · " + diaDaSemana(aula.data)));
        const celula = criar("span");
        celula.appendChild(criar("span", "selo " + (aula.presente ? "presente" : "falta"), aula.presente ? "Presente" : "Falta"));
        linha.appendChild(celula);
        cartao.appendChild(linha);
    });
    return cartao;
}

function cartaoCertificado(dados) {
    const cartao = criar("section", "cartao");
    cartao.appendChild(criar("h2", "", "Certificado"));
    const certificado = dados.certificado;

    if (certificado.pode_emitir) {
        cartao.appendChild(criar("p", "situacao ok", "Seu certificado está liberado. Você atingiu a frequência mínima do curso."));
        const botao = criar("a", "botao", "Emitir certificado");
        botao.href = "certificado.html";
        cartao.appendChild(botao);
    } else if (certificado.liberado) {
        cartao.appendChild(criar("p", "situacao abaixo",
            "O professor já liberou os certificados, mas sua frequência ficou abaixo do mínimo de " + dados.frequencia_minima + "%. Fale com o professor."));
    } else {
        cartao.appendChild(criar("p", "situacao neutro",
            "O certificado será liberado pelo professor ao final do curso. Quem tiver pelo menos " + dados.frequencia_minima + "% de frequência poderá emitir aqui."));
    }
    return cartao;
}


// ---------- início ----------

async function mostrarAvatar() {
    try {
        const resposta = await fetch("/api/usuario", { credentials: "same-origin" });
        const usuario = await resposta.json();
        const partes = String(usuario.nome || "").trim().split(/\s+/);
        avatar.textContent = ((partes[0] || "")[0] || "") + ((partes.length > 1 ? partes[partes.length - 1] : "")[0] || "");
        avatar.textContent = avatar.textContent.toUpperCase();
    } catch (erro) { /* o avatar fica vazio, sem atrapalhar a página */ }
}

async function iniciar() {
    mostrarAvatar();

    let dados;
    try {
        const resposta = await fetch("/api/frequencia", { credentials: "same-origin" });
        dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados.erro || "Não foi possível carregar sua frequência.");
    } catch (erro) {
        return mostrarErro(erro.message);
    }

    conteudo.textContent = "";
    if (!dados.vinculada) {
        subtitulo.textContent = "Acompanhe sua presença durante o curso";
        return conteudo.appendChild(criar("p", "erro-pagina",
            "Seu nome ainda não está na lista de chamada da turma. Fale com o professor para ele ligar o seu cadastro."));
    }

    subtitulo.textContent = "Sua frequência se atualiza a cada aula registrada";
    conteudo.append(cartaoFrequencia(dados), cartaoCertificado(dados), cartaoHistorico(dados));
}

iniciar();
