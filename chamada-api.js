// Chamada: alunas cadastradas pelo professor e presenças por turma e data.
// Tudo é persistido no PostgreSQL (tabelas em banco/chamada.sql).
// Todas as rotas são exclusivas do professor.
module.exports = function registrarChamada(app, banco) {
    // As turmas são criadas pelo professor na tela de cadastros (tabela turmas).
    // Se a tabela ainda não existir, usa as duas turmas antigas.
    const TURMAS_PADRAO = ['Turma A', 'Turma B'];
    const MAX_NOMES_POR_ENVIO = 200;
    const MAX_TAMANHO_NOME = 120;

    function autenticar(req, res, next) {
        if (!req.session.usuario) return res.status(401).json({ erro: 'Entre novamente para continuar.' });
        next();
    }
    function professor(req, res, next) {
        if (req.session.usuario.tipo !== 'professor') return res.status(403).json({ erro: 'Área exclusiva do professor.' });
        next();
    }
    const executar = fn => async (req, res) => {
        try { await fn(req, res); }
        catch (erro) {
            console.error('Erro na chamada:', erro.message);
            res.status(500).json({ erro: 'Não foi possível acessar o banco da chamada. Tente novamente.' });
        }
    };
    const protegida = [autenticar, professor];

    // ---------- validações ----------

    function dataDeHoje() {
        // Data de hoje no horário de Brasília (formato AAAA-MM-DD).
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
    }
    function dataValida(valor) {
        if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
        const data = new Date(valor + 'T00:00:00Z');
        return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === valor;
    }
    function limparNome(texto) {
        // Tira espaços repetidos e das pontas: "  Ana   Clara " -> "Ana Clara".
        return String(texto).replace(/\s+/g, ' ').trim();
    }
    function listaDeNomes(entrada) {
        const bruto = Array.isArray(entrada) ? entrada : String(entrada || '').split(/\r?\n|;/);
        const vistos = new Set();
        const nomes = [];
        for (const item of bruto) {
            const nome = limparNome(item);
            if (!nome || vistos.has(nome.toLowerCase())) continue;
            vistos.add(nome.toLowerCase());
            nomes.push(nome);
        }
        return nomes;
    }
    const ordenarPorNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });

    async function listarTurmas() {
        try {
            const resultado = await banco.query('SELECT nome FROM turmas ORDER BY nome');
            return resultado.rows.map(linha => linha.nome);
        } catch (erro) {
            if (erro.code === '42P01') return TURMAS_PADRAO; // tabela turmas não existe
            throw erro;
        }
    }
    async function turmaValida(turma) {
        return typeof turma === 'string' && (await listarTurmas()).includes(turma);
    }

    // As alunas vêm do cadastro feito pelo professor na tela de cadastros
    // (usuarios com turma_id). Cada uma ganha um registro na chamada, já ligado
    // ao login dela. Se o cadastro ainda não existir no banco, não faz nada.
    async function sincronizarAlunas() {
        try {
            await banco.query(
                `INSERT INTO chamada_alunas (nome, turma, usuario_id)
                 SELECT u.nome, t.nome, u.id
                 FROM usuarios u JOIN turmas t ON t.id = u.turma_id
                 WHERE u.tipo = 'aluna'
                   AND NOT EXISTS (SELECT 1 FROM chamada_alunas a WHERE a.usuario_id = u.id)
                 ON CONFLICT DO NOTHING`
            );
            // Nome corrigido no cadastro vale também na chamada.
            await banco.query(
                `UPDATE chamada_alunas a SET nome = u.nome
                 FROM usuarios u
                 WHERE a.usuario_id = u.id AND a.nome <> u.nome
                   AND NOT EXISTS (SELECT 1 FROM chamada_alunas b
                                   WHERE b.turma = a.turma AND LOWER(b.nome) = LOWER(u.nome) AND b.id <> a.id)`
            );
        } catch (erro) {
            console.error('Não foi possível sincronizar as alunas do cadastro:', erro.message);
        }
    }

    // Compartilhado com frequencia-api.js.
    const util = { sincronizarAlunas, autenticar, professor, executar, protegida, listarTurmas, turmaValida, ordenarPorNome };

    // ---------- turmas ----------

    app.get('/api/chamada/turmas', protegida, executar(async (req, res) => {
        res.json({ turmas: await listarTurmas() });
    }));

    // ---------- alunas da turma ----------

    app.get('/api/chamada/alunas', protegida, executar(async (req, res) => {
        const turma = req.query.turma;
        if (!(await turmaValida(turma))) return res.status(400).json({ erro: 'Escolha uma turma válida.' });
        await sincronizarAlunas();
        const resultado = await banco.query('SELECT id, nome FROM chamada_alunas WHERE turma = $1', [turma]);
        res.json({ alunas: resultado.rows.sort(ordenarPorNome) });
    }));

    app.post('/api/chamada/alunas', protegida, executar(async (req, res) => {
        const { turma } = req.body || {};
        if (!(await turmaValida(turma))) return res.status(400).json({ erro: 'Escolha uma turma válida.' });
        const nomes = listaDeNomes((req.body || {}).nomes);
        if (!nomes.length) return res.status(400).json({ erro: 'Digite pelo menos um nome.' });
        if (nomes.length > MAX_NOMES_POR_ENVIO) return res.status(400).json({ erro: `Envie no máximo ${MAX_NOMES_POR_ENVIO} nomes por vez.` });
        if (nomes.some(nome => nome.length > MAX_TAMANHO_NOME)) return res.status(400).json({ erro: `Cada nome pode ter no máximo ${MAX_TAMANHO_NOME} letras.` });

        // Nomes que já existem na turma são ignorados (índice único no banco).
        const inseridas = await banco.query(
            `INSERT INTO chamada_alunas (nome, turma)
             SELECT n, $2::text FROM unnest($1::text[]) AS n
             ON CONFLICT DO NOTHING
             RETURNING id, nome`,
            [nomes, turma]
        );
        // Liga as alunas novas aos logins de mesmo nome (veja frequencia-api.js).
        if (inseridas.rowCount && util.vincularPorNome) await util.vincularPorNome();

        res.status(201).json({
            adicionadas: inseridas.rowCount,
            ignoradas: nomes.length - inseridas.rowCount
        });
    }));

    app.put('/api/chamada/alunas/:id', protegida, executar(async (req, res) => {
        const id = Number(req.params.id);
        const nome = limparNome((req.body || {}).nome || '');
        if (!Number.isInteger(id)) return res.status(400).json({ erro: 'Aluna inválida.' });
        if (!nome || nome.length > MAX_TAMANHO_NOME) return res.status(400).json({ erro: `Digite um nome de até ${MAX_TAMANHO_NOME} letras.` });
        try {
            const resultado = await banco.query('UPDATE chamada_alunas SET nome = $1 WHERE id = $2 RETURNING id, nome', [nome, id]);
            if (!resultado.rowCount) return res.status(404).json({ erro: 'Aluna não encontrada.' });
            res.json(resultado.rows[0]);
        } catch (erro) {
            if (erro.code === '23505') return res.status(409).json({ erro: 'Já existe uma aluna com esse nome na turma.' });
            throw erro;
        }
    }));

    app.delete('/api/chamada/alunas/:id', protegida, executar(async (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).json({ erro: 'Aluna inválida.' });
        // As presenças dela são apagadas junto (ON DELETE CASCADE).
        const resultado = await banco.query('DELETE FROM chamada_alunas WHERE id = $1', [id]);
        if (!resultado.rowCount) return res.status(404).json({ erro: 'Aluna não encontrada.' });
        res.json({ ok: true });
    }));

    // ---------- chamada de um dia ----------

    // Devolve as alunas da turma e, se a chamada desse dia já foi feita,
    // quem estava presente (presente: true/false). Sem registro: null.
    app.get('/api/chamada', protegida, executar(async (req, res) => {
        const { turma, data } = req.query;
        if (!(await turmaValida(turma))) return res.status(400).json({ erro: 'Escolha uma turma válida.' });
        if (!dataValida(data)) return res.status(400).json({ erro: 'Escolha uma data válida.' });

        await sincronizarAlunas();
        const chamada = await banco.query('SELECT id FROM chamadas WHERE turma = $1 AND data = $2', [turma, data]);
        const alunas = await banco.query(
            `SELECT a.id, a.nome, p.presente
             FROM chamada_alunas a
             LEFT JOIN chamada_presencas p ON p.aluna_id = a.id AND p.chamada_id = $2
             WHERE a.turma = $1`,
            [turma, chamada.rows[0] ? chamada.rows[0].id : null]
        );
        res.json({ existe: chamada.rowCount > 0, alunas: alunas.rows.sort(ordenarPorNome) });
    }));

    // Salva (ou atualiza) a chamada de uma turma em uma data.
    // Corpo: { turma, data, presencas: [{ aluna_id, presente }] }
    app.put('/api/chamada', protegida, executar(async (req, res) => {
        const { turma, data, presencas } = req.body || {};
        if (!(await turmaValida(turma))) return res.status(400).json({ erro: 'Escolha uma turma válida.' });
        if (!dataValida(data)) return res.status(400).json({ erro: 'Escolha uma data válida.' });
        if (data > dataDeHoje()) return res.status(400).json({ erro: 'Não é possível fazer a chamada de uma data futura.' });
        if (!Array.isArray(presencas) || !presencas.length) return res.status(400).json({ erro: 'Cadastre as alunas da turma antes de fazer a chamada.' });
        if (presencas.some(p => !p || !Number.isInteger(p.aluna_id) || typeof p.presente !== 'boolean')) {
            return res.status(400).json({ erro: 'Dados de presença inválidos.' });
        }

        const ids = presencas.map(p => p.aluna_id);
        const estados = presencas.map(p => p.presente);
        if (new Set(ids).size !== ids.length) return res.status(400).json({ erro: 'Dados de presença inválidos.' });

        const cliente = await banco.connect();
        try {
            await cliente.query('BEGIN');

            // A lista enviada precisa ser exatamente a lista atual da turma.
            // Se outra pessoa cadastrou ou removeu alguém no meio tempo, avisa.
            const atuais = await cliente.query('SELECT id FROM chamada_alunas WHERE turma = $1', [turma]);
            const idsAtuais = new Set(atuais.rows.map(linha => linha.id));
            if (idsAtuais.size !== ids.length || ids.some(id => !idsAtuais.has(id))) {
                await cliente.query('ROLLBACK');
                return res.status(409).json({ erro: 'A lista de alunas mudou. Recarregue a página e refaça a chamada.' });
            }

            // professor_id só é gravado se o usuário existir na tabela.
            const chamada = await cliente.query(
                `INSERT INTO chamadas (turma, data, professor_id)
                 VALUES ($1, $2, (SELECT id FROM usuarios WHERE id = $3))
                 ON CONFLICT (turma, data)
                 DO UPDATE SET atualizado_em = NOW(), professor_id = EXCLUDED.professor_id
                 RETURNING id`,
                [turma, data, req.session.usuario.id]
            );
            await cliente.query(
                `INSERT INTO chamada_presencas (chamada_id, aluna_id, presente)
                 SELECT $1::int, x.id, x.presente FROM unnest($2::int[], $3::boolean[]) AS x(id, presente)
                 ON CONFLICT (chamada_id, aluna_id) DO UPDATE SET presente = EXCLUDED.presente`,
                [chamada.rows[0].id, ids, estados]
            );
            await cliente.query('COMMIT');
            res.json({ ok: true, presentes: estados.filter(Boolean).length, total: estados.length });
        } catch (erro) {
            await cliente.query('ROLLBACK').catch(() => {});
            throw erro;
        } finally {
            cliente.release();
        }
    }));

    // Frequência, vínculo com o login da aluna e certificado.
    require('./frequencia-api')(app, banco, util);
};
