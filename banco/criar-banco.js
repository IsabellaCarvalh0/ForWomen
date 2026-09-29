/* ==========================================================================
   FOR WOMEN — CRIAÇÃO DAS TABELAS E DOS USUÁRIOS INICIAIS
   --------------------------------------------------------------------------
   Este script prepara o banco de dados. Ele:

     1. executa o arquivo banco/schema.sql, que cria as tabelas;
     2. cadastra dois usuários de teste (uma aluna e um professor);
     3. mostra no terminal o que ficou gravado.

   Como executar:   node banco/criar-banco.js

   Pode ser executado mais de uma vez sem problema: as tabelas só são
   criadas se ainda não existirem e os usuários só são inseridos se aquele
   e-mail ainda não estiver cadastrado.
   ========================================================================== */

require("dotenv").config();

const fs = require("fs");                  // lê arquivos do computador
const path = require("path");              // monta caminhos de pasta
const bcrypt = require("bcryptjs");        // gera o hash das senhas
const banco = require("./conexao");        // conexão com o PostgreSQL


// Usuários criados para testar o login. Quando o cadastro pela tela
// estiver pronto, esta lista pode ser apagada.
const USUARIOS_INICIAIS = [
    {
        nome: "Ana Clara Ferreira",
        email: "aluna@forwomen.com",
        senha: "aluna123",
        tipo: "aluna"
    },
    {
        nome: "Pierre Vinícius",
        email: "professor@forwomen.com",
        senha: "professor123",
        tipo: "professor"
    }
];


/** Executa todos os passos, um depois do outro. */
async function prepararBanco() {

    // ---- 1. criar as tabelas -------------------------------------------
    // Lê o conteúdo do arquivo schema.sql e manda para o banco executar.
    const caminhoSchema = path.join(__dirname, "schema.sql");
    const comandosSQL = fs.readFileSync(caminhoSchema, "utf8");

    await banco.query(comandosSQL);
    console.log("Tabelas criadas ou já existentes.");


    // ---- 2. cadastrar os usuários --------------------------------------
    for (const usuario of USUARIOS_INICIAIS) {

        // Transforma a senha em hash. O 10 é o custo do embaralhamento.
        const senhaHash = await bcrypt.hash(usuario.senha, 10);

        // INSERT com parâmetros ($1, $2...): os valores são enviados
        // separados do comando, o que evita SQL Injection.
        // ON CONFLICT (email) DO NOTHING: se o e-mail já existir, não faz nada.
        await banco.query(
            `INSERT INTO usuarios (nome, email, senha_hash, tipo)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (email) DO NOTHING`,
            [usuario.nome, usuario.email.toLowerCase(), senhaHash, usuario.tipo]
        );

        console.log("Usuário garantido: " + usuario.email);
    }


    // ---- 3. conferir o resultado ---------------------------------------
    const resultado = await banco.query(
        "SELECT id, nome, email, tipo FROM usuarios ORDER BY id"
    );

    console.log("\nUsuários cadastrados:");
    console.table(resultado.rows);
}


// Executa a função e trata o erro, se houver.
prepararBanco()
    .catch(function (erro) {
        console.error("Erro ao preparar o banco:", erro.message);
    })
    .finally(function () {
        // Fecha as conexões para o script encerrar.
        banco.end();
    });
