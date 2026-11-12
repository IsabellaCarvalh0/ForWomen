/* ==========================================================================
   FOR WOMEN — MIGRAÇÃO DAS TURMAS
   --------------------------------------------------------------------------
   1. executa banco/turmas.sql (tabela turmas e novas colunas);
   2. converte os avisos antigos (publico = turma_a / turma_b) para turma_id;
   3. converte as aulas do banco/aulas.json ("Turma A", "Turma B") para turma_id;
   4. coloca a aluna de teste na Turma A, se ela ainda não tiver turma.

   Como executar:   node banco/migrar-turmas.js
   Pode ser executado mais de uma vez sem duplicar nada.
   ========================================================================== */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const banco = require("./conexao");

const CAMINHO_AULAS_JSON = path.join(__dirname, "aulas.json");

// Garante que a turma existe e devolve o id dela.
async function idDaTurma(nome) {
    const resultado = await banco.query(
        `INSERT INTO turmas (nome) VALUES ($1)
         ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome
         RETURNING id`,
        [nome]
    );
    return resultado.rows[0].id;
}

async function migrar() {
    if (!process.env.DATABASE_URL) throw new Error("Configure DATABASE_URL no arquivo .env antes de executar a migração.");

    await banco.query(fs.readFileSync(path.join(__dirname, "turmas.sql"), "utf8"));
    console.log("Tabela turmas e novas colunas prontas.");

    // ---- avisos antigos ----------------------------------------------------
    const antigos = { turma_a: "Turma A", turma_b: "Turma B" };
    for (const [publico, nome] of Object.entries(antigos)) {
        const pendentes = await banco.query(
            "SELECT count(*)::int AS total FROM avisos WHERE publico = $1 AND turma_id IS NULL", [publico]);
        if (pendentes.rows[0].total > 0) {
            const turmaId = await idDaTurma(nome);
            await banco.query("UPDATE avisos SET turma_id = $1 WHERE publico = $2 AND turma_id IS NULL", [turmaId, publico]);
            console.log(`Avisos de ${nome} convertidos: ${pendentes.rows[0].total}`);
        }
    }

    // ---- aulas do arquivo aulas.json -------------------------------------
    if (fs.existsSync(CAMINHO_AULAS_JSON)) {
        const aulas = JSON.parse(fs.readFileSync(CAMINHO_AULAS_JSON, "utf8"));
        let alteradas = 0;
        for (const aula of aulas) {
            if (!("turma" in aula)) continue;
            const nome = (aula.turma || "").trim();
            const paraTodas = !nome || ["todas", "todas as turmas"].includes(nome.toLowerCase());
            aula.turma_id = paraTodas ? null : await idDaTurma(nome);
            delete aula.turma;
            alteradas++;
        }
        if (alteradas) {
            fs.writeFileSync(CAMINHO_AULAS_JSON, JSON.stringify(aulas, null, 2), "utf8");
            console.log(`Aulas do aulas.json convertidas: ${alteradas}`);
        }
    }

    // ---- aluna de teste ----------------------------------------------------
    const alunaTeste = await banco.query(
        "SELECT id FROM usuarios WHERE email = 'aluna@forwomen.com' AND turma_id IS NULL");
    if (alunaTeste.rows.length) {
        await banco.query("UPDATE usuarios SET turma_id = $1 WHERE id = $2",
            [await idDaTurma("Turma A"), alunaTeste.rows[0].id]);
        console.log("Aluna de teste vinculada à Turma A.");
    }

    const turmas = await banco.query("SELECT id, nome FROM turmas ORDER BY id");
    console.log("\nTurmas cadastradas:");
    console.table(turmas.rows);
}

migrar().catch(erro => {
    console.error(erro.message);
    process.exitCode = 1;
}).finally(() => banco.end());
