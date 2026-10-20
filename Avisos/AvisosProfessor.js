
const formAviso = document.getElementById("formAviso");
const campoTitulo = document.getElementById("titulo");
const campoMensagem = document.getElementById("mensagem");
const campoPublico = document.getElementById("publico");
const campoFixado = document.getElementById("fixado");

const listaAvisos = document.getElementById("listaAvisos");
const totalAvisos = document.getElementById("totalAvisos");
const totalFixados = document.getElementById("totalFixados");

// Dados temporários para testar a página.
// Depois, os avisos virão do Supabase.
let avisos = [];

let proximoId = 1;
let idEmEdicao = null;

// Cadastra um aviso ou salva uma edição.
formAviso.addEventListener("submit", function (evento) {
    evento.preventDefault();

    const titulo = campoTitulo.value.trim();
    const mensagem = campoMensagem.value.trim();
    const publico = campoPublico.value;
    const fixado = campoFixado.checked;

    if (!titulo || !mensagem || !publico) {
        alert("Preencha todos os campos obrigatórios.");
        return;
    }

    if (idEmEdicao !== null) {
        // Procura o aviso que está sendo editado.
        const aviso = avisos.find(function (item) {
            return item.id === idEmEdicao;
        });

        if (!aviso) {
            alert("Não foi possível encontrar esse aviso.");
            return;
        }

        aviso.titulo = titulo;
        aviso.mensagem = mensagem;
        aviso.publico = publico;
        aviso.fixado = fixado;
        aviso.atualizadoEm = new Date();

        idEmEdicao = null;
        alert("Aviso atualizado com sucesso!");
    } else {
        // Cria um novo aviso.
        const novoAviso = {
            id: proximoId++,
            titulo: titulo,
            mensagem: mensagem,
            publico: publico,
            fixado: fixado,
            criadoEm: new Date(),
            atualizadoEm: new Date()
        };

        avisos.push(novoAviso);
        alert("Aviso cadastrado com sucesso!");
    }

    formAviso.reset();
    restaurarBotaoFormulario();
    renderizarAvisos();
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
        publico.textContent = "Público: " + aviso.publico;

        const data = document.createElement("small");
        data.textContent =
            "Publicado em: " + aviso.criadoEm.toLocaleString("pt-BR");

        card.append(titulo, mensagem, publico);

        if (aviso.fixado) {
            const etiqueta = document.createElement("span");
            etiqueta.className = "etiqueta-fixado";
            etiqueta.textContent = "📌 Aviso fixado";
            card.appendChild(etiqueta);
        }

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

    if (!aviso) {
        return;
    }

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

// Exclui um aviso após confirmação.
function excluirAviso(id) {
    const confirmar = confirm(
        "Tem certeza de que deseja excluir este aviso?"
    );

    if (!confirmar) {
        return;
    }

    avisos = avisos.filter(function (item) {
        return item.id !== id;
    });

    if (idEmEdicao === id) {
        formAviso.reset();
        idEmEdicao = null;
        restaurarBotaoFormulario();
    }

    renderizarAvisos();
    alert("Aviso excluído com sucesso!");
}

// Atualiza os números apresentados na página.
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

// Inicializa a página.
renderizarAvisos();
