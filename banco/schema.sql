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

    -- Data e hora do cadastro, preenchida sozinha pelo banco.
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()

);


-- --------------------------------------------------------------------------
-- CONSULTAS ÚTEIS (para conferir os dados no SQL Editor do Supabase)
-- --------------------------------------------------------------------------

-- Ver todos os cadastros (sem mostrar o hash inteiro):
-- SELECT id, nome, email, tipo, criado_em FROM usuarios ORDER BY id;

-- Contar quantos usuários existem de cada tipo:
-- SELECT tipo, COUNT(*) AS quantidade FROM usuarios GROUP BY tipo;
