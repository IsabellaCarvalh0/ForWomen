// Atividades e entregas são persistidas exclusivamente no PostgreSQL.
module.exports = function registrarAtividades(app, banco) {
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
            console.error('Erro nas atividades:', erro.message);
            res.status(500).json({ erro: 'Não foi possível acessar o banco de atividades. Tente novamente.' });
        }
    };
    function urlValida(valor) {
        if (!valor) return true;
        try { return ['http:', 'https:'].includes(new URL(valor).protocol); }
        catch { return false; }
    }
    function dadosAtividade(body) {
        const dados = {};
        for (const campo of ['titulo', 'descricao', 'professor', 'prazo', 'instrucoes', 'material']) {
            dados[campo] = typeof body[campo] === 'string' ? body[campo].trim() : '';
        }
        if (!dados.titulo || dados.titulo.length > 180 || !dados.descricao || !dados.professor || dados.professor.length > 120 ||
            !/^\d{4}-\d{2}-\d{2}$/.test(dados.prazo) || !Number.isFinite(Date.parse(dados.prazo)) ||
            new Date(dados.prazo).toISOString().slice(0, 10) !== dados.prazo || !urlValida(dados.material)) return null;
        return dados;
    }
    const colunas = "id, titulo, descricao, professor, professor_id, to_char(prazo, 'YYYY-MM-DD') AS prazo, instrucoes, material";

    app.get('/api/atividades', autenticar, executar(async (req, res) => {
        const atividades = await banco.query(`SELECT ${colunas} FROM atividades ORDER BY id DESC`);
        const usuario = req.session.usuario;
        const entregas = usuario.tipo === 'professor'
            ? await banco.query(`SELECT atividade_id, count(*)::int AS total FROM entregas_atividades GROUP BY atividade_id`)
            : await banco.query(`SELECT atividade_id, link, comentario, arquivo_nome AS arquivo,
                to_char(enviado_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS data
                FROM entregas_atividades WHERE aluna_id = $1`, [usuario.id]);
        res.json({ atividades: atividades.rows, entregas: Object.fromEntries(entregas.rows.map(e => [e.atividade_id, e])) });
    }));

    app.post('/api/atividades', autenticar, professor, executar(async (req, res) => {
        const d = dadosAtividade(req.body);
        if (!d) return res.status(400).json({ erro: 'Confira os campos obrigatórios, a data e o link do material.' });
        const resultado = await banco.query(`INSERT INTO atividades
            (titulo, descricao, professor, prazo, instrucoes, material, professor_id)
            VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${colunas}`,
            [d.titulo, d.descricao, d.professor, d.prazo, d.instrucoes, d.material, req.session.usuario.id]);
        res.status(201).json(resultado.rows[0]);
    }));

    app.put('/api/atividades/:id', autenticar, professor, executar(async (req, res) => {
        const d = dadosAtividade(req.body);
        if (!d || !/^\d+$/.test(req.params.id)) return res.status(400).json({ erro: 'Dados da atividade inválidos.' });
        const resultado = await banco.query(`UPDATE atividades SET titulo=$1, descricao=$2, professor=$3,
            prazo=$4, instrucoes=$5, material=$6 WHERE id=$7 AND professor_id=$8 RETURNING ${colunas}`,
            [d.titulo, d.descricao, d.professor, d.prazo, d.instrucoes, d.material, req.params.id, req.session.usuario.id]);
        if (!resultado.rows.length) return res.status(404).json({ erro: 'Atividade não encontrada ou pertence a outro professor.' });
        res.json(resultado.rows[0]);
    }));

    app.delete('/api/atividades/:id', autenticar, professor, executar(async (req, res) => {
        if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ erro: 'Identificador inválido.' });
        const resultado = await banco.query('DELETE FROM atividades WHERE id=$1 AND professor_id=$2 RETURNING id',
            [req.params.id, req.session.usuario.id]);
        if (!resultado.rows.length) return res.status(404).json({ erro: 'Atividade não encontrada ou pertence a outro professor.' });
        res.json({ sucesso: true });
    }));

    app.put('/api/atividades/:id/entrega', autenticar, executar(async (req, res) => {
        if (req.session.usuario.tipo !== 'aluna') return res.status(403).json({ erro: 'Somente alunas podem entregar atividades.' });
        if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ erro: 'Identificador inválido.' });
        const { link = '', comentario = '', arquivo = null } = req.body;
        if (typeof link !== 'string' || typeof comentario !== 'string' || !urlValida(link) || (!link.trim() && !arquivo)) {
            return res.status(400).json({ erro: 'Informe um link HTTP/HTTPS ou anexe um arquivo.' });
        }
        let conteudo = null;
        if (arquivo) {
            if (typeof arquivo.nome !== 'string' || !arquivo.nome.trim() || typeof arquivo.base64 !== 'string' ||
                !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(arquivo.base64)) {
                return res.status(400).json({ erro: 'Arquivo inválido.' });
            }
            conteudo = Buffer.from(arquivo.base64, 'base64');
            if (conteudo.length > 5 * 1024 * 1024) return res.status(413).json({ erro: 'O arquivo deve ter no máximo 5 MB.' });
        }
        const atividade = await banco.query('SELECT id FROM atividades WHERE id=$1', [req.params.id]);
        if (!atividade.rows.length) return res.status(404).json({ erro: 'Atividade não encontrada.' });
        await banco.query(`INSERT INTO entregas_atividades (atividade_id, aluna_id, link, comentario, arquivo_nome, arquivo_dados)
            VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (atividade_id, aluna_id) DO UPDATE SET
            link=EXCLUDED.link, comentario=EXCLUDED.comentario, arquivo_nome=EXCLUDED.arquivo_nome,
            arquivo_dados=EXCLUDED.arquivo_dados, enviado_em=NOW()`,
            [req.params.id, req.session.usuario.id, link.trim(), comentario.trim(), arquivo ? arquivo.nome : null, conteudo]);
        res.json({ sucesso: true });
    }));

    app.get('/api/atividades/:id/arquivo', autenticar, executar(async (req, res) => {
        if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ erro: 'Identificador inválido.' });
        const resultado = await banco.query(`SELECT arquivo_nome, arquivo_dados FROM entregas_atividades
            WHERE atividade_id=$1 AND aluna_id=$2`, [req.params.id, req.session.usuario.id]);
        const entrega = resultado.rows[0];
        if (!entrega || !entrega.arquivo_dados) return res.status(404).json({ erro: 'Arquivo não encontrado.' });
        res.set('Content-Type', 'application/octet-stream');
        res.set('Content-Disposition', "attachment; filename*=UTF-8''" + encodeURIComponent(entrega.arquivo_nome));
        res.send(entrega.arquivo_dados);
    }));
};
