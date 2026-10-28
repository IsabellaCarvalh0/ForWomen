require('dotenv').config();
const fs = require('fs');
const path = require('path');
const banco = require('./conexao');

async function migrar() {
    if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL no arquivo .env antes de executar a migração.');
    await banco.query(fs.readFileSync(path.join(__dirname, 'atividades.sql'), 'utf8'));
    console.log('Tabelas de atividades e entregas prontas.');
}
migrar().catch(erro => {
    console.error(erro.message);
    process.exitCode = 1;
}).finally(() => banco.end());
