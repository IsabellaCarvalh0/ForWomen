/* ==========================================
   FOR WOMEN — CADASTRO DE ALUNAS
   ========================================== */

const formAluna = document.getElementById("formAluna");
const campos = {
    nome: document.getElementById("nome"),
    login: document.getElementById("login"),
    senha: document.getElementById("senha"),
    dataNascimento: document.getElementById("dataNascimento"),
    turma: document.getElementById("turma"),
    filiacao: document.getElementById("filiacao")
};
const filtroTurma = document.getElementById("filtroTurma");
const botaoCancelar = document.getElementById("cancelarEdicao");
const listaAlunas = document.getElementById("listaAlunas");

let alunas = [];
let idEmEdicao = null;

/* Não deixa escolher data de nascimento no futuro */
campos.dataNascimento.max = new Date().toISOString().slice(0, 10);

/* DATAS: "2010-05-20" -> "20/05/2010" e idade em anos */

function formatarData(dataISO) {

    const [ano, mes, dia] = dataISO.split("-");

    return dia + "/" + mes + "/" + ano;
}

function calcularIdade(dataISO) {

    const [ano, mes, dia] = dataISO.split("-").map(Number);

    const hoje = new Date();

    let idade = hoje.getFullYear() - ano;

    if (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)) {
        idade--;
    }

    return idade;
}

/* CARREGAR TURMAS NOS CAMPOS DE SELEÇÃO */

async function carregarTurmas() {

    try {

        const turmas = await requisitarAPI("/api/turmas");

        document.getElementById("totalTurmas").textContent = turmas.length;

        turmas.forEach(function (turma) {

            campos.turma.add(new Option(turma.nome, turma.id));

            filtroTurma.add(new Option(turma.nome, turma.id));

        });

    } catch (erro) {

        console.error("Erro ao carregar turmas:", erro);

    }
}

/* CARREGAR E MOSTRAR AS ALUNAS */

async function carregarAlunas() {

    try {

        alunas = await requisitarAPI("/api/alunas");

        renderizarAlunas();

    } catch (erro) {

        console.error("Erro ao carregar alunas:", erro);

        mostrarListaVazia(listaAlunas, "Não foi possível carregar as alunas.");

    }
}

function renderizarAlunas() {

    document.getElementById("totalAlunas").textContent = alunas.length;

    const turmaFiltrada = Number(filtroTurma.value);

    const visiveis = turmaFiltrada
        ? alunas.filter(aluna => aluna.turma_id === turmaFiltrada)
        : alunas;

    if (visiveis.length === 0) {

        mostrarListaVazia(
            listaAlunas,
            turmaFiltrada ? "Nenhuma aluna nesta turma." : "Nenhuma aluna cadastrada até o momento."
        );

        return;
    }

    listaAlunas.replaceChildren(...visiveis.map(function (aluna) {

        const nascimento = aluna.data_nascimento
            ? formatarData(aluna.data_nascimento) + " (" + calcularIdade(aluna.data_nascimento) + " anos)"
            : "Não informado";

        return criarCard(
            aluna.nome,
            [
                ["Login", aluna.login || aluna.email || "—"],
                ["Turma", aluna.turma_nome || "Sem turma"],
                ["Nascimento", nascimento],
                ["Filiação", aluna.filiacao || "Não informada"]
            ],
            () => editarAluna(aluna),
            () => excluirAluna(aluna)
        );

    }));
}

filtroTurma.addEventListener("change", renderizarAlunas);

/* CADASTRAR OU SALVAR EDIÇÃO */

formAluna.addEventListener("submit", async function (evento) {

    evento.preventDefault();

    const dadosAluna = {
        nome: campos.nome.value.trim(),
        login: campos.login.value.trim(),
        senha: campos.senha.value,
        data_nascimento: campos.dataNascimento.value,
        filiacao: campos.filiacao.value.trim(),
        turma_id: campos.turma.value
    };

    const editando = idEmEdicao !== null;

    const botaoEnviar = formAluna.querySelector('button[type="submit"]');

    botaoEnviar.disabled = true;

    try {

        await requisitarAPI(
            editando ? "/api/alunas/" + idEmEdicao : "/api/alunas",
            {
                method: editando ? "PUT" : "POST",
                body: JSON.stringify(dadosAluna)
            }
        );

        sairDaEdicao();

        await carregarAlunas();

        alert(editando ? "Aluna atualizada com sucesso!" : "Aluna cadastrada com sucesso!");

    } catch (erro) {

        alert(erro.message);

    } finally {

        botaoEnviar.disabled = false;

    }
});

/* EDITAR */

function editarAluna(aluna) {

    idEmEdicao = aluna.id;

    campos.nome.value = aluna.nome;
    campos.login.value = aluna.login || "";
    campos.senha.value = "";
    campos.dataNascimento.value = aluna.data_nascimento || "";
    campos.turma.value = aluna.turma_id || "";
    campos.filiacao.value = aluna.filiacao || "";

    /* Na edição a senha é opcional */
    campos.senha.required = false;
    campos.senha.placeholder = "Deixe em branco para manter";
    document.getElementById("dicaSenha").textContent = "Preencha só se quiser trocar a senha.";

    document.getElementById("rotuloFormulario").textContent = "EDITANDO ALUNA";
    document.getElementById("tituloFormulario").textContent = "Editar aluna";
    formAluna.querySelector('button[type="submit"]').textContent = "Salvar alterações";
    botaoCancelar.hidden = false;

    formAluna.scrollIntoView({ behavior: "smooth", block: "start" });
}

function sairDaEdicao() {

    idEmEdicao = null;

    formAluna.reset();

    campos.senha.required = true;
    campos.senha.placeholder = "Mínimo de 6 caracteres";
    document.getElementById("dicaSenha").textContent = "A aluna usa essa senha para entrar.";

    document.getElementById("rotuloFormulario").textContent = "NOVA ALUNA";
    document.getElementById("tituloFormulario").textContent = "Cadastrar aluna";
    formAluna.querySelector('button[type="submit"]').textContent = "Cadastrar aluna →";
    botaoCancelar.hidden = true;
}

botaoCancelar.addEventListener("click", sairDaEdicao);

/* EXCLUIR */

async function excluirAluna(aluna) {

    const confirmar = confirm(
        'Tem certeza de que deseja excluir a aluna "' + aluna.nome + '"?\n' +
        "As entregas de atividades dela também serão apagadas."
    );

    if (!confirmar) return;

    try {

        await requisitarAPI("/api/alunas/" + aluna.id, { method: "DELETE" });

        if (idEmEdicao === aluna.id) {
            sairDaEdicao();
        }

        await carregarAlunas();

        alert("Aluna excluída com sucesso!");

    } catch (erro) {

        alert(erro.message);

    }
}

carregarTurmas();

carregarAlunas();
