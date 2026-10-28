CREATE TABLE IF NOT EXISTS atividades (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(180) NOT NULL,
    descricao TEXT NOT NULL,
    professor VARCHAR(120) NOT NULL,
    professor_id INTEGER NOT NULL REFERENCES usuarios(id),
    prazo DATE NOT NULL,
    instrucoes TEXT NOT NULL DEFAULT '',
    material TEXT NOT NULL DEFAULT '',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entregas_atividades (
    id SERIAL PRIMARY KEY,
    atividade_id INTEGER NOT NULL REFERENCES atividades(id) ON DELETE CASCADE,
    aluna_id INTEGER NOT NULL REFERENCES usuarios(id),
    link TEXT NOT NULL DEFAULT '',
    comentario TEXT NOT NULL DEFAULT '',
    arquivo_nome TEXT,
    arquivo_dados BYTEA,
    enviado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (atividade_id, aluna_id)
);
