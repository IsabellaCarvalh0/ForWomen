-- ==========================================================================
-- FOR WOMEN — ESTRUTURA DO BANCO DE DADOS
-- Banco: PostgreSQL (hospedado no Supabase)
-- --------------------------------------------------------------------------
-- Este arquivo cria as tabelas do sistema. Ele pode ser executado de duas
-- formas:
--   1. pelo script:        node banco/criar-banco.js
--   2. pelo painel:        Supabase > SQL Editor > colar e executar
--
-- "IF NOT EXISTS" faz o comando não dar erro caso a tabela já exista,
-- então o arquivo pode ser executado quantas vezes for preciso.
-- ==========================================================================


-- --------------------------------------------------------------------------
-- TABELA: usuarios
-- Guarda quem pode entrar na plataforma. O campo "tipo" é o que define
-- para qual área a pessoa é direcionada depois do login.
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS usuarios (

    -- Identificador. SERIAL numera sozinho (1, 2, 3...) a cada inserção.
    -- PRIMARY KEY: é a chave primária, não repete e não pode ser nula.
    id SERIAL PRIMARY KEY,

    -- Nome completo, mostrado no topo das páginas.
    -- NOT NULL: o campo é obrigatório.
    nome VARCHAR(120) NOT NULL,

    -- E-mail usado para entrar.
    -- UNIQUE: não podem existir dois cadastros com o mesmo e-mail.
    -- É gravado sempre em minúsculas, tratamento feito pelo servidor.
    email VARCHAR(160) NOT NULL UNIQUE,

    -- Senha embaralhada pelo bcrypt (nunca a senha em texto).
    -- O hash do bcrypt tem 60 caracteres; 100 deixa folga.
    senha_hash VARCHAR(100) NOT NULL,

    -- Perfil do usuário.
    -- CHECK: o banco só aceita estes dois valores. É uma segunda barreira,
    -- caso algum código tente gravar um tipo diferente por engano.
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('aluna', 'professor')),

    -- Turma à qual a aluna pertence (ex: 'Turma A', 'Turma B').
    turma VARCHAR(50) DEFAULT 'Turma A',

    -- Data e hora do cadastro, preenchida sozinha pelo banco.
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()

);

-- Garante a coluna turma caso a tabela já tenha sido criada anteriormente
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS turma VARCHAR(50) DEFAULT 'Turma A';


-- --------------------------------------------------------------------------
-- TABELA: aulas
-- Guarda as videoaulas publicadas pelos professores.
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS aulas (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(180) NOT NULL,
    video_url VARCHAR(500) NOT NULL,
    descricao TEXT,
    turma VARCHAR(50) NOT NULL DEFAULT 'Todas as turmas',
    duracao_minutos INTEGER NOT NULL DEFAULT 15,
    professor_nome VARCHAR(120) NOT NULL,
    professor_avatar VARCHAR(10) DEFAULT 'PV',
    professor_id INTEGER REFERENCES usuarios(id),
    materiais TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);


-- --------------------------------------------------------------------------
-- TABELA: avisos
-- Tabela avisos dos professores
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS avisos (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    mensagem TEXT NOT NULL,

    publico VARCHAR(30) NOT NULL
        CHECK (publico IN ('todas', 'turma_a', 'turma_b')),

    fixado BOOLEAN NOT NULL DEFAULT FALSE,

    professor_id INTEGER NOT NULL
        REFERENCES usuarios(id),

    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);
