const marcarTodas = document.getElementById("marcarTodas");
const presencas = document.querySelectorAll(".presenca");
const salvarChamada = document.getElementById("salvarChamada");
const mensagemChamada = document.getElementById("mensagemChamada");
marcarTodas.addEventListener("change", function(){
    presencas.forEach(function (presenca){
        presenca.checked = marcarTodas.checked;
    });
});

salvarChamada.addEventListener("click", function (){
    const alunas = document.querySelectorAll(".aluna");
    alunas.forEach(function (aluna){
        const nome = aluna.querySelector("span").textContent;
        const checkbox = aluna.querySelector(".presenca");
        if (checkbox.checked){
            console.log(nome + " - Presente");
        }else{
            console.log(nome + " - Ausente");
        }

    });
    mensagemChamada.textContent = "✓ Chamada salva com sucesso!";
    mensagemChamada.style.display = "block";
});