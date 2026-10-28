
const formAviso = document.getElementById("formAviso");
const campoTitulo = document.getElementById("titulo");
const campoMensagem = document.getElementById("mensagem");
const campoPublico = document.getElementById("publico");
const campoFixado = document.getElementById("fixado");

const listaAvisos = document.getElementById("listaAvisos");
const totalAvisos = document.getElementById("totalAvisos");
const totalFixados = document.getElementById("totalFixados");

let avisos = [];
let idEmEdicao = null;
let carregando = false;

// Converte os valores recebidos do banco para um formato consistente.
function normalizarAviso(aviso) {
    return {
        ...aviso,
        id: Number(aviso.id),
        fixado: aviso.fixado === true,
        criadoEm: aviso.criado_em || aviso.criadoEm,
        atualizadoEm: aviso.atualizado_em || aviso.atualizadoEm
    };
}

// Faz requisições para a API do servidor.
async function requisitarAPI(url, opcoes = {}) {
    const resposta = await fetch(url, {
        ...opcoes,
        headers: {
            "Content-Type": "application/json",
            ...opcoes.headers
        }
    });

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
        throw new Error(dados.erro || "Não foi possível concluir a operação.");
    }

    return dados;
}

// Busca os avisos armazenados no banco.
async function carregarAvisos() {
    if (carregando) return;
    carregando = true;

    try {
        const dados = await requisitarAPI("/api/avisos");
        avisos = dados.map(normalizarAviso);
        renderizarAvisos();
    } catch (erro) {
        console.error("Erro ao carregar avisos:", erro);
        alert("Não foi possível carregar os avisos. Verifique sua conexão com o servidor.");
    } finally {
        carregando = false;
    }
}

// Cadastra um aviso ou salva uma edição no banco.
formAviso.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    if (carregando) return;

    const titulo = campoTitulo.value.trim();
    const mensagem = campoMensagem.value.trim();
    const publico = campoPublico.value;
    const fixado = campoFixado.checked;

    if (!titulo || !mensagem || !publico) {
        alert("Preencha todos os campos obrigatórios.");
        return;
    }

    console.log("Público selecionado:", publico);

    const dadosAviso = { titulo, mensagem, publico, fixado };
    const editando = idEmEdicao !== null;

    try {
        const botaoEnviar = formAviso.querySelector(
            'button[type="submit"], input[type="submit"]'
        );

        if (botaoEnviar) botaoEnviar.disabled = true;

        if (editando) {
            await requisitarAPI("/api/avisos/" + idEmEdicao, {
                method: "PUT",
                body: JSON.stringify(dadosAviso)
            });
        } else {
            await requisitarAPI("/api/avisos", {
                method: "POST",
                body: JSON.stringify(dadosAviso)
            });
        }

        formAviso.reset();
        idEmEdicao = null;
        restaurarBotaoFormulario();

        await carregarAvisos();

        alert(editando
            ? "Aviso atualizado com sucesso!"
            : "Aviso cadastrado com sucesso!");
    } catch (erro) {
        console.error("Erro ao salvar aviso:", erro);
        alert(erro.message);
    } finally {
        const botaoEnviar = formAviso.querySelector(
            'button[type="submit"], input[type="submit"]'
        );

        if (botaoEnviar) botaoEnviar.disabled = false;
    }
});

// Mostra os avisos na página.
function renderizarAvisos() {
    listaAvisos.replaceChildren();

    avisos.forEach(function (aviso) {
        const card = document.createElement("article");
        card.className = "card-aviso";

        const titulo = document.createElement("h3");
        titulo.textContent = aviso.titulo;

        const mensagem = document.createElement("p");
        mensagem.textContent = aviso.mensagem;

        const publico = document.createElement("p");
        const nomesPublico = {
            todas: "Todas as turmas",
            turma_a: "Turma A",
            turma_b: "Turma B"
        };
        publico.textContent = "Público: " +
            (nomesPublico[aviso.publico] || aviso.publico);

        card.append(titulo, mensagem, publico);

        if (aviso.fixado) {
            const etiqueta = document.createElement("span");
            etiqueta.className = "etiqueta-fixado";
            etiqueta.textContent = "📌 Aviso fixado";
            card.appendChild(etiqueta);
        }

        const data = document.createElement("small");
        const dataCriacao = aviso.criadoEm
            ? new Date(aviso.criadoEm)
            : null;

        data.textContent = dataCriacao && !Number.isNaN(dataCriacao.getTime())
            ? "Publicado em: " + dataCriacao.toLocaleString("pt-BR")
            : "Data de publicação indisponível";

        card.appendChild(data);

        const botoes = document.createElement("div");
        botoes.className = "acoes-aviso";

        const botaoEditar = document.createElement("button");
        botaoEditar.type = "button";
        botaoEditar.textContent = "Editar";
        botaoEditar.addEventListener("click", function () {
            editarAviso(aviso.id);
        });

        const botaoExcluir = document.createElement("button");
        botaoExcluir.type = "button";
        botaoExcluir.textContent = "Excluir";
        botaoExcluir.addEventListener("click", function () {
            excluirAviso(aviso.id);
        });

        botoes.append(botaoEditar, botaoExcluir);
        card.appendChild(botoes);
        listaAvisos.appendChild(card);
    });

    atualizarContadores();
}

// Preenche o formulário com os dados do aviso escolhido.
function editarAviso(id) {
    const aviso = avisos.find(function (item) {
        return item.id === id;
    });

    if (!aviso) return;

    campoTitulo.value = aviso.titulo;
    campoMensagem.value = aviso.mensagem;
    campoPublico.value = aviso.publico;
    campoFixado.checked = aviso.fixado;

    idEmEdicao = id;

    const botaoEnviar = formAviso.querySelector(
        'button[type="submit"], input[type="submit"]'
    );

    if (botaoEnviar) {
        botaoEnviar.textContent = "Salvar alterações";
    }

    formAviso.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

// Exclui um aviso do banco após confirmação.
async function excluirAviso(id) {
    const confirmar = confirm(
        "Tem certeza de que deseja excluir este aviso?"
    );

    if (!confirmar) return;

    try {
        await requisitarAPI("/api/avisos/" + id, {
            method: "DELETE"
        });

        if (idEmEdicao === id) {
            formAviso.reset();
            idEmEdicao = null;
            restaurarBotaoFormulario();
        }

        await carregarAvisos();
        alert("Aviso excluído com sucesso!");
    } catch (erro) {
        console.error("Erro ao excluir aviso:", erro);
        alert(erro.message);
    }
}

// Atualiza os contadores da página.
function atualizarContadores() {
    totalAvisos.textContent = avisos.length;

    totalFixados.textContent = avisos.filter(function (aviso) {
        return aviso.fixado;
    }).length;
}

// Restaura o texto original do botão do formulário.
function restaurarBotaoFormulario() {
    const botaoEnviar = formAviso.querySelector(
        'button[type="submit"], input[type="submit"]'
    );

    if (botaoEnviar) {
        botaoEnviar.textContent = "Cadastrar aviso";
    }
}

// Carrega os dados quando a página abre.
carregarAvisos();
