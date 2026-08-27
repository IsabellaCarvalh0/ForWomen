const botoes = document.querySelectorAll(".botao");
const status = document.querySelectorAll(".status");

botoes.forEach(function(botao, indice) {
    if (localStorage.getItem("atividade" + indice) === "concluida") {
        status[indice].textContent = "Concluído";
        status[indice].classList.remove("pendente");
        status[indice].classList.add("concluida");
    }
    botao.addEventListener("click", function() {
        status[indice].textContent = "Concluído";
        status[indice].classList.remove("pendente");
        status[indice].classList.add("concluida");
        localStorage.setItem("atividade" + indice, "concluida");
    });
});