-- ==========================================================================
-- FOR WOMEN — TURMAS E CADASTRO DE ALUNAS
-- --------------------------------------------------------------------------
-- Cria a tabela de turmas e liga alunas, avisos e aulas a ela.
-- Pode ser executado mais de uma vez: só cria o que ainda não existe.
--   node banco/migrar-turmas.js
-- ==========================================================================


-- --------------------------------------------------------------------------
-- TABELA: turmas
-- O professor escolhe o nome (ex.: "Programa Sabará 2026").
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS turmas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL UNIQUE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);


-- --------------------------------------------------------------------------
-- USUARIOS: dados da aluna
-- A aluna entra com login (sem e-mail); o professor continua com e-mail.
-- turma_id fica vazio para professores.
-- --------------------------------------------------------------------------

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS login VARCHAR(60) UNIQUE,
    ADD COLUMN IF NOT EXISTS data_nascimento DATE,
    ADD COLUMN IF NOT EXISTS filiacao VARCHAR(200),
    ADD COLUMN IF NOT EXISTS turma_id INTEGER REFERENCES turmas(id);

ALTER TABLE usuarios ALTER COLUMN email DROP NOT NULL;

-- Todo usuário precisa de pelo menos uma forma de entrar.
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_email_ou_login_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_email_ou_login_check
    CHECK (email IS NOT NULL OR login IS NOT NULL);


-- --------------------------------------------------------------------------
-- AVISOS E AULAS: turma de destino
-- turma_id vazio (NULL) significa "todas as turmas".
-- A coluna antiga avisos.publico deixa de ser usada.
-- --------------------------------------------------------------------------

ALTER TABLE avisos ADD COLUMN IF NOT EXISTS turma_id INTEGER REFERENCES turmas(id);
ALTER TABLE avisos ALTER COLUMN publico DROP NOT NULL;

ALTER TABLE IF EXISTS aulas ADD COLUMN IF NOT EXISTS turma_id INTEGER REFERENCES turmas(id);
