const marcarTodas = document.getElementById("marcarTodas");
const presencas = document.querySelectorAll(".presenca");
const salvarChamada = document.getElementById("salvarChamada");
const mensagemChamada = document.getElementById("mensagemChamada");
const selecionarTurma = document.getElementById("selecionarTurma");
const dataChamada = document.getElementById("dataChamada");

// Preenche a data com o dia de hoje (formato YYYY-MM-DD, horário local)
function dataDeHoje() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");
    return ano + "-" + mes + "-" + dia;
}

// Converte YYYY-MM-DD para DD/MM/YYYY
function formatarData(valor) {
    const partes = valor.split("-");
    return partes[2] + "/" + partes[1] + "/" + partes[0];
}

function mostrarMensagem(texto, erro) {
    mensagemChamada.textContent = texto;
    mensagemChamada.classList.toggle("erro", erro);
    mensagemChamada.style.display = "block";
}

dataChamada.value = dataDeHoje();

marcarTodas.addEventListener("change", function () {
    presencas.forEach(function (presenca) {
        presenca.checked = marcarTodas.checked;
    });
});

salvarChamada.addEventListener("click", function () {
    if (!selecionarTurma.value) {
        mostrarMensagem("Selecione a turma antes de salvar a chamada.", true);
        selecionarTurma.focus();
        return;
    }

    if (!dataChamada.value) {
        mostrarMensagem("Selecione a data da chamada antes de salvar.", true);
        dataChamada.focus();
        return;
    }

    const turma = selecionarTurma.value;
    const data = formatarData(dataChamada.value);

    console.log("Chamada - " + turma + " - " + data);

    const alunas = document.querySelectorAll(".aluna");
    alunas.forEach(function (aluna) {
        const nome = aluna.querySelector("span").textContent;
        const checkbox = aluna.querySelector(".presenca");
        if (checkbox.checked) {
            console.log(nome + " - Presente");
        } else {
            console.log(nome + " - Ausente");
        }
    });

    mostrarMensagem("✓ Chamada da " + turma + " do dia " + data + " salva com sucesso!", false);
});