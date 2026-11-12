-- ==========================================================================
-- FOR WOMEN — TABELAS DA CHAMADA
-- --------------------------------------------------------------------------
-- Executado por:  node banco/criar-banco.js   (instalação nova)
--                 node banco/migrar-chamada.js (instalação existente)
-- Pode ser executado várias vezes: "IF NOT EXISTS" evita erro.
-- ==========================================================================


-- --------------------------------------------------------------------------
-- TABELA: chamada_alunas
-- Lista de alunas de cada turma, cadastrada pelo professor no início do
-- curso. É a lista que aparece na tela de chamada.
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS chamada_alunas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    turma VARCHAR(50) NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Não permite a mesma aluna duas vezes na mesma turma
-- (LOWER faz "ana clara" e "Ana Clara" contarem como o mesmo nome).
CREATE UNIQUE INDEX IF NOT EXISTS chamada_alunas_nome_turma_unico
    ON chamada_alunas (LOWER(nome), turma);


-- --------------------------------------------------------------------------
-- TABELA: chamadas
-- Uma linha por dia de aula de cada turma.
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS chamadas (
    id SERIAL PRIMARY KEY,
    turma VARCHAR(50) NOT NULL,
    data DATE NOT NULL,
    professor_id INTEGER REFERENCES usuarios(id),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Só existe uma chamada por turma e por dia: salvar de novo atualiza.
    UNIQUE (turma, data)
);


-- --------------------------------------------------------------------------
-- TABELA: chamada_presencas
-- Presente ou ausente de cada aluna em cada chamada.
-- Apagar uma chamada (ou uma aluna) apaga também as presenças ligadas a ela.
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS chamada_presencas (
    chamada_id INTEGER NOT NULL REFERENCES chamadas(id) ON DELETE CASCADE,
    aluna_id INTEGER NOT NULL REFERENCES chamada_alunas(id) ON DELETE CASCADE,
    presente BOOLEAN NOT NULL,
    PRIMARY KEY (chamada_id, aluna_id)
);


-- --------------------------------------------------------------------------
-- VÍNCULO: aluna da chamada  <->  login da aluna (tabela usuarios)
-- É por esse vínculo que a aluna enxerga a própria frequência.
-- O sistema liga sozinho quando o nome é igual; o professor corrige à mão
-- na tela de Frequência. Um login só pode estar ligado a uma aluna.
-- --------------------------------------------------------------------------

ALTER TABLE chamada_alunas
    ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS chamada_alunas_usuario_unico
    ON chamada_alunas (usuario_id) WHERE usuario_id IS NOT NULL;


-- --------------------------------------------------------------------------
-- TABELA: chamada_cursos
-- Uma linha por turma: total de aulas previstas (informado pelo professor)
-- e a liberação do certificado. A frequência mínima (75%) fica no código.
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS chamada_cursos (
    turma VARCHAR(50) PRIMARY KEY,
    total_aulas INTEGER CHECK (total_aulas IS NULL OR (total_aulas > 0 AND total_aulas <= 500)),

    -- Preenchido quando o professor libera os certificados; vazio = bloqueado.
    certificado_liberado_em TIMESTAMPTZ,
    liberado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,

    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
