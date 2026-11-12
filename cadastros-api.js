// Cadastro de turmas e alunas, feito somente pelo professor.
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const CAMINHO_AULAS_JSON = path.join(__dirname, 'banco', 'aulas.json');

module.exports = function registrarCadastros(app, banco) {
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
            console.error('Erro nos cadastros:', erro.message);
            res.status(500).json({ erro: 'Não foi possível acessar o banco de dados. Tente novamente.' });
        }
    };
    const idValido = id => /^\d+$/.test(id);
    const texto = valor => typeof valor === 'string' ? valor.trim() : '';

    function dataValida(valor) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || !Number.isFinite(Date.parse(valor))) return false;
        return new Date(valor).toISOString().slice(0, 10) === valor && valor <= new Date().toISOString().slice(0, 10);
    }

    // Quantas aulas do aulas.json estão ligadas à turma.
    function aulasDaTurma(turmaId) {
        try {
            const aulas = JSON.parse(fs.readFileSync(CAMINHO_AULAS_JSON, 'utf8'));
            return aulas.filter(a => a.turma_id === turmaId).length;
        } catch { return 0; }
    }


    /* ---------------------------------- TURMAS ---------------------------------- */

    app.get('/api/turmas', autenticar, professor, executar(async (req, res) => {
        const resultado = await banco.query(`SELECT t.id, t.nome, t.criado_em,
            (SELECT count(*)::int FROM usuarios u WHERE u.turma_id = t.id) AS total_alunas
            FROM turmas t ORDER BY t.nome`);
        res.json(resultado.rows);
    }));

    app.post('/api/turmas', autenticar, professor, executar(async (req, res) => {
        const nome = texto(req.body.nome);
        if (!nome || nome.length > 120) return res.status(400).json({ erro: 'Informe o nome da turma (até 120 caracteres).' });
        try {
            const resultado = await banco.query('INSERT INTO turmas (nome) VALUES ($1) RETURNING *', [nome]);
            res.status(201).json(resultado.rows[0]);
        } catch (erro) {
            if (erro.code === '23505') return res.status(409).json({ erro: 'Já existe uma turma com esse nome.' });
            throw erro;
        }
    }));

    app.put('/api/turmas/:id', autenticar, professor, executar(async (req, res) => {
        const nome = texto(req.body.nome);
        if (!idValido(req.params.id)) return res.status(400).json({ erro: 'Identificador inválido.' });
        if (!nome || nome.length > 120) return res.status(400).json({ erro: 'Informe o nome da turma (até 120 caracteres).' });
        try {
            const resultado = await banco.query('UPDATE turmas SET nome = $1 WHERE id = $2 RETURNING *', [nome, req.params.id]);
            if (!resultado.rows.length) return res.status(404).json({ erro: 'Turma não encontrada.' });
            res.json(resultado.rows[0]);
        } catch (erro) {
            if (erro.code === '23505') return res.status(409).json({ erro: 'Já existe uma turma com esse nome.' });
            throw erro;
        }
    }));

    // Só exclui turma vazia, para nenhuma aluna, aviso ou aula ficar sem turma.
    app.delete('/api/turmas/:id', autenticar, professor, executar(async (req, res) => {
        if (!idValido(req.params.id)) return res.status(400).json({ erro: 'Identificador inválido.' });
        const id = Number(req.params.id);
        const uso = await banco.query(`SELECT
            (SELECT count(*)::int FROM usuarios WHERE turma_id = $1) AS alunas,
            (SELECT count(*)::int FROM avisos WHERE turma_id = $1) AS avisos`, [id]);
        const { alunas, avisos } = uso.rows[0];
        const aulas = aulasDaTurma(id);
        if (alunas || avisos || aulas) {
            const partes = [];
            if (alunas) partes.push(alunas + (alunas === 1 ? ' aluna' : ' alunas'));
            if (avisos) partes.push(avisos + (avisos === 1 ? ' aviso' : ' avisos'));
            if (aulas) partes.push(aulas + (aulas === 1 ? ' aula' : ' aulas'));
            return res.status(409).json({
                erro: 'Essa turma ainda tem ' + partes.join(', ') + ' vinculados. Mova ou exclua antes de apagar a turma.'
            });
        }
        const resultado = await banco.query('DELETE FROM turmas WHERE id = $1 RETURNING id', [id]);
        if (!resultado.rows.length) return res.status(404).json({ erro: 'Turma não encontrada.' });
        res.json({ sucesso: true });
    }));


    /* ---------------------------------- ALUNAS ---------------------------------- */

    // Confere os campos do formulário. Na edição a senha é opcional.
    async function dadosAluna(body, senhaObrigatoria) {
        const d = {
            nome: texto(body.nome),
            login: texto(body.login).toLowerCase(),
            senha: typeof body.senha === 'string' ? body.senha : '',
            data_nascimento: texto(body.data_nascimento),
            filiacao: texto(body.filiacao),
            turma_id: Number(body.turma_id)
        };
        if (!d.nome || d.nome.length > 120) return { erro: 'Informe o nome da aluna (até 120 caracteres).' };
        if (!/^[a-z0-9._-]{3,60}$/.test(d.login)) return { erro: 'O login deve ter de 3 a 60 caracteres: letras sem acento, números, ponto, hífen ou sublinhado.' };
        if ((senhaObrigatoria || d.senha) && d.senha.length < 6) return { erro: 'A senha deve ter pelo menos 6 caracteres.' };
        if (!dataValida(d.data_nascimento)) return { erro: 'Informe uma data de nascimento válida.' };
        if (!d.filiacao || d.filiacao.length > 200) return { erro: 'Informe a filiação (até 200 caracteres).' };
        if (!Number.isInteger(d.turma_id) || d.turma_id <= 0) return { erro: 'Selecione a turma da aluna.' };
        const turma = await banco.query('SELECT id FROM turmas WHERE id = $1', [d.turma_id]);
        if (!turma.rows.length) return { erro: 'Selecione uma turma cadastrada.' };
        return { dados: d };
    }

    const colunasAluna = `u.id, u.nome, u.login, u.email, to_char(u.data_nascimento, 'YYYY-MM-DD') AS data_nascimento,
        u.filiacao, u.turma_id, t.nome AS turma_nome`;

    app.get('/api/alunas', autenticar, professor, executar(async (req, res) => {
        const resultado = await banco.query(`SELECT ${colunasAluna}
            FROM usuarios u LEFT JOIN turmas t ON t.id = u.turma_id
            WHERE u.tipo = 'aluna' ORDER BY u.nome`);
        res.json(resultado.rows);
    }));

    app.post('/api/alunas', autenticar, professor, executar(async (req, res) => {
        const { dados: d, erro } = await dadosAluna(req.body, true);
        if (erro) return res.status(400).json({ erro });
        try {
            const senhaHash = await bcrypt.hash(d.senha, 10);
            const resultado = await banco.query(`INSERT INTO usuarios
                (nome, login, senha_hash, tipo, data_nascimento, filiacao, turma_id)
                VALUES ($1, $2, $3, 'aluna', $4, $5, $6) RETURNING id`,
                [d.nome, d.login, senhaHash, d.data_nascimento, d.filiacao, d.turma_id]);
            res.status(201).json(resultado.rows[0]);
        } catch (erro) {
            if (erro.code === '23505') return res.status(409).json({ erro: 'Esse login já está em uso.' });
            throw erro;
        }
    }));

    app.put('/api/alunas/:id', autenticar, professor, executar(async (req, res) => {
        if (!idValido(req.params.id)) return res.status(400).json({ erro: 'Identificador inválido.' });
        const { dados: d, erro } = await dadosAluna(req.body, false);
        if (erro) return res.status(400).json({ erro });
        try {
            // Senha em branco mantém a senha atual.
            const senhaHash = d.senha ? await bcrypt.hash(d.senha, 10) : null;
            const resultado = await banco.query(`UPDATE usuarios SET nome = $1, login = $2,
                senha_hash = COALESCE($3, senha_hash), data_nascimento = $4, filiacao = $5, turma_id = $6
                WHERE id = $7 AND tipo = 'aluna' RETURNING id`,
                [d.nome, d.login, senhaHash, d.data_nascimento, d.filiacao, d.turma_id, req.params.id]);
            if (!resultado.rows.length) return res.status(404).json({ erro: 'Aluna não encontrada.' });
            res.json(resultado.rows[0]);
        } catch (erro) {
            if (erro.code === '23505') return res.status(409).json({ erro: 'Esse login já está em uso.' });
            throw erro;
        }
    }));

    // Apaga a aluna e as entregas de atividades dela.
    app.delete('/api/alunas/:id', autenticar, professor, executar(async (req, res) => {
        if (!idValido(req.params.id)) return res.status(400).json({ erro: 'Identificador inválido.' });
        const cliente = await banco.connect();
        try {
            await cliente.query('BEGIN');
            await cliente.query(`DELETE FROM entregas_atividades WHERE aluna_id = $1
                AND aluna_id IN (SELECT id FROM usuarios WHERE tipo = 'aluna')`, [req.params.id]);
            const resultado = await cliente.query("DELETE FROM usuarios WHERE id = $1 AND tipo = 'aluna' RETURNING id", [req.params.id]);
            await cliente.query('COMMIT');
            if (!resultado.rows.length) return res.status(404).json({ erro: 'Aluna não encontrada.' });
            res.json({ sucesso: true });
        } catch (erro) {
            await cliente.query('ROLLBACK');
            throw erro;
        } finally {
            cliente.release();
        }
    }));
};
