/* ==========================================
   FOR WOMEN — CADASTRO DE TURMAS
   ========================================== */

const formTurma = document.getElementById("formTurma");
const campoNome = document.getElementById("nomeTurma");
const botaoCancelar = document.getElementById("cancelarEdicao");
const listaTurmas = document.getElementById("listaTurmas");

let turmas = [];
let idEmEdicao = null;

/* CARREGAR E MOSTRAR AS TURMAS */

async function carregarTurmas() {

    try {

        turmas = await requisitarAPI("/api/turmas");

        renderizarTurmas();

    } catch (erro) {

        console.error("Erro ao carregar turmas:", erro);

        mostrarListaVazia(listaTurmas, "Não foi possível carregar as turmas.");

    }
}

function renderizarTurmas() {

    document.getElementById("totalTurmas").textContent = turmas.length;

    document.getElementById("totalAlunas").textContent =
        turmas.reduce((soma, turma) => soma + turma.total_alunas, 0);

    if (turmas.length === 0) {

        mostrarListaVazia(listaTurmas, "Nenhuma turma cadastrada até o momento.");

        return;
    }

    listaTurmas.replaceChildren(...turmas.map(function (turma) {

        const total = turma.total_alunas;

        return criarCard(
            turma.nome,
            [
                ["Alunas", total + (total === 1 ? " aluna" : " alunas")],
                ["Criada em", new Date(turma.criado_em).toLocaleDateString("pt-BR")]
            ],
            () => editarTurma(turma),
            () => excluirTurma(turma)
        );

    }));
}

/* CADASTRAR OU SALVAR EDIÇÃO */

formTurma.addEventListener("submit", async function (evento) {

    evento.preventDefault();

    const nome = campoNome.value.trim();

    if (!nome) {

        alert("Informe o nome da turma.");

        return;
    }

    const editando = idEmEdicao !== null;

    const botaoEnviar = formTurma.querySelector('button[type="submit"]');

    botaoEnviar.disabled = true;

    try {

        await requisitarAPI(
            editando ? "/api/turmas/" + idEmEdicao : "/api/turmas",
            {
                method: editando ? "PUT" : "POST",
                body: JSON.stringify({ nome })
            }
        );

        sairDaEdicao();

        await carregarTurmas();

        alert(editando ? "Turma atualizada com sucesso!" : "Turma cadastrada com sucesso!");

    } catch (erro) {

        alert(erro.message);

    } finally {

        botaoEnviar.disabled = false;

    }
});

/* EDITAR */

function editarTurma(turma) {

    idEmEdicao = turma.id;

    campoNome.value = turma.nome;

    document.getElementById("rotuloFormulario").textContent = "EDITANDO TURMA";

    document.getElementById("tituloFormulario").textContent = "Editar turma";

    formTurma.querySelector('button[type="submit"]').textContent = "Salvar alterações";

    botaoCancelar.hidden = false;

    formTurma.scrollIntoView({ behavior: "smooth", block: "start" });

    campoNome.focus();
}

function sairDaEdicao() {

    idEmEdicao = null;

    formTurma.reset();

    document.getElementById("rotuloFormulario").textContent = "NOVA TURMA";

    document.getElementById("tituloFormulario").textContent = "Cadastrar turma";

    formTurma.querySelector('button[type="submit"]').textContent = "Cadastrar turma →";

    botaoCancelar.hidden = true;
}

botaoCancelar.addEventListener("click", sairDaEdicao);

/* EXCLUIR */

async function excluirTurma(turma) {

    if (!confirm('Tem certeza de que deseja excluir a turma "' + turma.nome + '"?')) return;

    try {

        await requisitarAPI("/api/turmas/" + turma.id, { method: "DELETE" });

        if (idEmEdicao === turma.id) {
            sairDaEdicao();
        }

        await carregarTurmas();

        alert("Turma excluída com sucesso!");

    } catch (erro) {

        alert(erro.message);

    }
}

carregarTurmas();
