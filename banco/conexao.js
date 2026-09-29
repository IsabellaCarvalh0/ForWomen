/* ==========================================================================
   FOR WOMEN — CONEXÃO COM O BANCO DE DADOS
   --------------------------------------------------------------------------
   Este arquivo abre a conexão com o PostgreSQL (Supabase) e a disponibiliza
   para os outros arquivos do projeto. Assim a conexão é configurada em um
   lugar só: quem precisar do banco escreve

       const banco = require("./banco/conexao");

   e usa banco.query(...).
   ========================================================================== */

// Lê o arquivo .env e coloca os valores dentro de process.env.
require("dotenv").config();

// Pool é o "gerenciador de conexões" do driver do PostgreSQL. Em vez de
// abrir e fechar uma conexão a cada consulta, ele mantém algumas prontas
// e empresta para quem precisar.
const { Pool } = require("pg");

const pool = new Pool({

    // Endereço completo do banco, guardado no .env para não ir para o Git.
    connectionString: process.env.DATABASE_URL,

    // O Supabase só aceita conexão criptografada (SSL).
    ssl: { rejectUnauthorized: false },

    // Número máximo de conexões abertas ao mesmo tempo.
    // O plano gratuito tem limite, então mantemos um valor baixo.
    max: 5

});

// Avisa no terminal se a conexão cair, em vez de derrubar o servidor.
pool.on("error", function (erro) {
    console.error("Erro na conexão com o banco:", erro.message);
});

// Deixa o pool disponível para os outros arquivos.
module.exports = pool;
