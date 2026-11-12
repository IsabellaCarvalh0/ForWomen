// Frequência e certificado.
//  - Professor: define o total de aulas, vê a frequência da turma, liga cada
//    aluna ao login dela e libera (ou bloqueia) os certificados.
//  - Aluna: vê a própria frequência e emite o certificado, se o professor
//    liberou e se ela atingiu a frequência mínima.
// É carregado por chamada-api.js, que passa o app, o banco e as proteções.
const path = require('path');
const express = require('express');

const FREQUENCIA_MINIMA = 75; // em porcentagem
const MAX_AULAS = 500;

// ---------------------------------------------------------------------------
// Regra da frequência (um só lugar, usado pelo professor e pela aluna)
// ---------------------------------------------------------------------------
//
// Com o total de aulas previstas definido:
//   base       = o maior entre o total previsto e as chamadas já feitas
//   frequência = (base - faltas) / base       -> começa em 100% e cai a cada falta
//   mínimo     = 75% da base, arredondado para cima
//   faltas permitidas = base - presenças mínimas
// Sem o total de aulas, só dá para mostrar a frequência parcial
// (presenças / chamadas registradas), sem dizer se a aluna está apta.
function calcularFrequencia({ totalAulas, aulasRealizadas, presencas, faltas }) {
    const registradas = presencas + faltas;
    const abaixar = valor => Math.floor(valor * 10) / 10; // nunca arredonda para cima

    if (!totalAulas) {
        return {
            modo: 'parcial', base: null, totalAulas: null, aulasRealizadas, presencas, faltas,
            frequencia: registradas ? abaixar((presencas / registradas) * 100) : 100,
            frequenciaMinima: FREQUENCIA_MINIMA, presencasMinimas: null,
            faltasPermitidas: null, faltasRestantes: null, apta: null
        };
    }

    const base = Math.max(totalAulas, aulasRealizadas);
    const presencasMinimas = Math.floor((base * FREQUENCIA_MINIMA + 99) / 100);
    const faltasPermitidas = base - presencasMinimas;
    return {
        modo: 'previsto', base, totalAulas, aulasRealizadas, presencas, faltas,
        frequencia: abaixar(((base - faltas) / base) * 100),
        frequenciaMinima: FREQUENCIA_MINIMA, presencasMinimas, faltasPermitidas,
        faltasRestantes: Math.max(faltasPermitidas - faltas, 0),
        apta: faltas <= faltasPermitidas
    };
}

function semAcento(texto) {
    return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

module.exports = function registrarFrequencia(app, banco, util) {
    const { autenticar, professor, executar, protegida, turmaValida, ordenarPorNome, sincronizarAlunas } = util;

    function aluna(req, res, next) {
        if (req.session.usuario.tipo !== 'aluna') return res.status(403).json({ erro: 'Esta página é para alunas.' });
        next();
    }
    const daAluna = [autenticar, aluna];

    // ---------- leitura dos números ----------

    async function dadosDoCurso(turma) {
        const [curso, realizadas] = await Promise.all([
            banco.query(
                `SELECT c.total_aulas, c.certificado_liberado_em IS NOT NULL AS liberado,
                        to_char(c.certificado_liberado_em AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS liberado_em,
                        u.nome AS liberado_por
                 FROM chamada_cursos c LEFT JOIN usuarios u ON u.id = c.liberado_por
                 WHERE c.turma = $1`, [turma]),
            banco.query('SELECT COUNT(*) AS total FROM chamadas WHERE turma = $1', [turma])
        ]);
        const linha = curso.rows[0] || {};
        return {
            totalAulas: linha.total_aulas || null,
            liberado: Boolean(linha.liberado),
            liberadoEm: linha.liberado_em || null,
            liberadoPor: linha.liberado_por || null,
            aulasRealizadas: Number(realizadas.rows[0].total)
        };
    }

    async function alunasDaTurma(turma) {
        const resultado = await banco.query(
            `SELECT a.id, a.nome, a.usuario_id, COALESCE(u.email, u.login) AS usuario_email,
                    COUNT(*) FILTER (WHERE p.presente = true) AS presencas,
                    COUNT(*) FILTER (WHERE p.presente = false) AS faltas
             FROM chamada_alunas a
             LEFT JOIN usuarios u ON u.id = a.usuario_id
             LEFT JOIN chamada_presencas p ON p.aluna_id = a.id
             WHERE a.turma = $1
             GROUP BY a.id, u.email, u.login`, [turma]);
        return resultado.rows.map(l => ({ ...l, presencas: Number(l.presencas), faltas: Number(l.faltas) }))
            .sort(ordenarPorNome);
    }

    // ---------- ligação aluna da chamada <-> login ----------

    // Liga automaticamente quando o nome é igual (sem contar acentos e
    // maiúsculas) e só existe uma aluna e um login com aquele nome.
    // Os casos duvidosos ficam para o professor resolver à mão.
    async function vincularPorNome() {
        const alunas = await banco.query('SELECT id, nome FROM chamada_alunas WHERE usuario_id IS NULL');
        if (!alunas.rowCount) return;
        const logins = await banco.query(
            `SELECT u.id, u.nome FROM usuarios u
             WHERE u.tipo = 'aluna' AND NOT EXISTS (SELECT 1 FROM chamada_alunas a WHERE a.usuario_id = u.id)`);

        const grupos = new Map();
        const grupo = nome => { const k = semAcento(nome); if (!grupos.has(k)) grupos.set(k, { alunas: [], logins: [] }); return grupos.get(k); };
        alunas.rows.forEach(l => grupo(l.nome).alunas.push(l.id));
        logins.rows.forEach(l => grupo(l.nome).logins.push(l.id));

        for (const g of grupos.values()) {
            if (g.alunas.length !== 1 || g.logins.length !== 1) continue;
            try {
                await banco.query('UPDATE chamada_alunas SET usuario_id = $1 WHERE id = $2 AND usuario_id IS NULL', [g.logins[0], g.alunas[0]]);
            } catch (erro) {
                if (erro.code !== '23505') throw erro; // outra requisição ligou antes
            }
        }
    }
    // As rotas de chamada-api.js usam esta função depois de cadastrar alunas.
    util.vincularPorNome = vincularPorNome;

    // ---------- PROFESSOR ----------

    // Tudo o que as telas Frequência e Conclusão precisam para uma turma.
    app.get('/api/chamada/curso', protegida, executar(async (req, res) => {
        const turma = req.query.turma;
        if (!(await turmaValida(turma))) return res.status(400).json({ erro: 'Escolha uma turma válida.' });

        await sincronizarAlunas();
        await vincularPorNome();
        const curso = await dadosDoCurso(turma);
        const alunas = (await alunasDaTurma(turma)).map(a => {
            const f = calcularFrequencia({ totalAulas: curso.totalAulas, aulasRealizadas: curso.aulasRealizadas, presencas: a.presencas, faltas: a.faltas });
            return {
                id: a.id, nome: a.nome, usuario_id: a.usuario_id, usuario_email: a.usuario_email,
                presencas: a.presencas, faltas: a.faltas,
                frequencia: f.frequencia, apta: f.apta, faltas_restantes: f.faltasRestantes
            };
        });
        const livres = await banco.query(
            `SELECT u.id, u.nome, COALESCE(u.email, u.login) AS email FROM usuarios u
             WHERE u.tipo = 'aluna' AND NOT EXISTS (SELECT 1 FROM chamada_alunas a WHERE a.usuario_id = u.id)
             ORDER BY u.nome`);

        const resumo = calcularFrequencia({ totalAulas: curso.totalAulas, aulasRealizadas: curso.aulasRealizadas, presencas: 0, faltas: 0 });
        res.json({
            turma,
            total_aulas: curso.totalAulas,
            aulas_realizadas: curso.aulasRealizadas,
            frequencia_minima: FREQUENCIA_MINIMA,
            base: resumo.base,
            presencas_minimas: resumo.presencasMinimas,
            faltas_permitidas: resumo.faltasPermitidas,
            liberado: curso.liberado,
            liberado_em: curso.liberadoEm,
            liberado_por: curso.liberadoPor,
            alunas,
            logins_livres: livres.rows
        });
    }));

    // Define o total de aulas previstas da turma.
    app.put('/api/chamada/curso', protegida, executar(async (req, res) => {
        const { turma, total_aulas: total } = req.body || {};
        if (!(await turmaValida(turma))) return res.status(400).json({ erro: 'Escolha uma turma válida.' });
        if (!Number.isInteger(total) || total < 1 || total > MAX_AULAS) {
            return res.status(400).json({ erro: `Digite um total de aulas entre 1 e ${MAX_AULAS}.` });
        }
        await banco.query(
            `INSERT INTO chamada_cursos (turma, total_aulas) VALUES ($1, $2)
             ON CONFLICT (turma) DO UPDATE SET total_aulas = EXCLUDED.total_aulas, atualizado_em = NOW()`,
            [turma, total]);
        res.json({ ok: true });
    }));

    // Libera os certificados da turma. Só as alunas aptas conseguem emitir.
    app.post('/api/chamada/curso/liberar', protegida, executar(async (req, res) => {
        const turma = (req.body || {}).turma;
        if (!(await turmaValida(turma))) return res.status(400).json({ erro: 'Escolha uma turma válida.' });
        const curso = await dadosDoCurso(turma);
        if (!curso.totalAulas) return res.status(400).json({ erro: 'Defina o total de aulas na tela de Frequência antes de liberar os certificados.' });
        if (!curso.aulasRealizadas) return res.status(400).json({ erro: 'Nenhuma chamada foi registrada nesta turma ainda.' });

        await banco.query(
            `UPDATE chamada_cursos
             SET certificado_liberado_em = NOW(),
                 liberado_por = (SELECT id FROM usuarios WHERE id = $2),
                 atualizado_em = NOW()
             WHERE turma = $1`,
            [turma, req.session.usuario.id]);

        const alunas = await alunasDaTurma(turma);
        const aptas = alunas.filter(a => calcularFrequencia({ totalAulas: curso.totalAulas, aulasRealizadas: curso.aulasRealizadas, presencas: a.presencas, faltas: a.faltas }).apta).length;
        res.json({ ok: true, aptas, total: alunas.length });
    }));

    // Desfaz a liberação (caso tenha sido feita por engano ou cedo demais).
    app.post('/api/chamada/curso/bloquear', protegida, executar(async (req, res) => {
        const turma = (req.body || {}).turma;
        if (!(await turmaValida(turma))) return res.status(400).json({ erro: 'Escolha uma turma válida.' });
        await banco.query('UPDATE chamada_cursos SET certificado_liberado_em = NULL, liberado_por = NULL, atualizado_em = NOW() WHERE turma = $1', [turma]);
        res.json({ ok: true });
    }));

    // Liga (ou desliga, com usuario_id null) uma aluna da chamada a um login.
    app.put('/api/chamada/alunas/:id/vinculo', protegida, executar(async (req, res) => {
        const id = Number(req.params.id);
        const usuarioId = (req.body || {}).usuario_id;
        if (!Number.isInteger(id)) return res.status(400).json({ erro: 'Aluna inválida.' });
        if (usuarioId !== null && !Number.isInteger(usuarioId)) return res.status(400).json({ erro: 'Login inválido.' });

        if (usuarioId !== null) {
            const login = await banco.query("SELECT id FROM usuarios WHERE id = $1 AND tipo = 'aluna'", [usuarioId]);
            if (!login.rowCount) return res.status(400).json({ erro: 'Escolha um login de aluna.' });
        }
        try {
            const resultado = await banco.query('UPDATE chamada_alunas SET usuario_id = $1 WHERE id = $2 RETURNING id', [usuarioId, id]);
            if (!resultado.rowCount) return res.status(404).json({ erro: 'Aluna não encontrada.' });
            res.json({ ok: true });
        } catch (erro) {
            if (erro.code === '23505') return res.status(409).json({ erro: 'Esse login já está ligado a outra aluna.' });
            throw erro;
        }
    }));

    // ---------- ALUNA ----------

    // Acha a aluna da chamada que pertence ao login que está na sessão.
    async function minhaFicha(usuarioId) {
        await sincronizarAlunas();
        const consulta = () => banco.query('SELECT id, nome, turma FROM chamada_alunas WHERE usuario_id = $1', [usuarioId]);
        let ficha = await consulta();
        if (!ficha.rowCount) {
            await vincularPorNome();
            ficha = await consulta();
        }
        return ficha.rows[0] || null;
    }

    async function minhaSituacao(ficha) {
        const curso = await dadosDoCurso(ficha.turma);
        const contagem = await banco.query(
            `SELECT COUNT(*) FILTER (WHERE presente = true) AS presencas,
                    COUNT(*) FILTER (WHERE presente = false) AS faltas
             FROM chamada_presencas p JOIN chamadas c ON c.id = p.chamada_id
             WHERE p.aluna_id = $1 AND c.turma = $2`, [ficha.id, ficha.turma]);
        const f = calcularFrequencia({
            totalAulas: curso.totalAulas, aulasRealizadas: curso.aulasRealizadas,
            presencas: Number(contagem.rows[0].presencas), faltas: Number(contagem.rows[0].faltas)
        });
        return { curso, f };
    }

    app.get('/api/frequencia', daAluna, executar(async (req, res) => {
        const ficha = await minhaFicha(req.session.usuario.id);
        if (!ficha) return res.json({ vinculada: false });

        const { curso, f } = await minhaSituacao(ficha);
        const historico = await banco.query(
            `SELECT to_char(c.data, 'YYYY-MM-DD') AS data, p.presente
             FROM chamadas c JOIN chamada_presencas p ON p.chamada_id = c.id AND p.aluna_id = $1
             WHERE c.turma = $2 ORDER BY c.data DESC`, [ficha.id, ficha.turma]);

        res.json({
            vinculada: true,
            nome: ficha.nome,
            turma: ficha.turma,
            total_aulas: f.totalAulas,
            base: f.base,
            aulas_realizadas: f.aulasRealizadas,
            presencas: f.presencas,
            faltas: f.faltas,
            frequencia: f.frequencia,
            frequencia_minima: f.frequenciaMinima,
            presencas_minimas: f.presencasMinimas,
            faltas_permitidas: f.faltasPermitidas,
            faltas_restantes: f.faltasRestantes,
            historico: historico.rows,
            certificado: {
                liberado: curso.liberado,
                apta: f.apta,
                pode_emitir: curso.liberado && f.apta === true
            }
        });
    }));

    // Dados do certificado. O servidor confere tudo de novo: sem a liberação
    // do professor e sem a frequência mínima, a aluna não recebe os dados.
    app.get('/api/frequencia/certificado', daAluna, executar(async (req, res) => {
        const ficha = await minhaFicha(req.session.usuario.id);
        if (!ficha) return res.status(404).json({ erro: 'Seu nome ainda não está na lista de alunas da chamada. Fale com o professor.' });

        const { curso, f } = await minhaSituacao(ficha);
        if (!curso.liberado) return res.status(403).json({ erro: 'O certificado ainda não foi liberado pelo professor.' });
        if (f.apta !== true) return res.status(403).json({ erro: `Sua frequência (${f.frequencia}%) ficou abaixo do mínimo de ${FREQUENCIA_MINIMA}%.` });

        res.json({
            nome: ficha.nome,
            turma: ficha.turma,
            frequencia: f.frequencia,
            total_aulas: f.base,
            presencas: f.base - f.faltas,
            liberado_em: curso.liberadoEm,
            professor: curso.liberadoPor
        });
    }));

    // ---------- páginas da aluna (pasta frequencia/) ----------

    function paginaDaAluna(req, res, next) {
        const usuario = req.session.usuario;
        if (!usuario) return res.redirect('/login?erro=sessao');
        if (usuario.tipo === 'professor') return res.redirect('/chamada/frequencia.html');
        next();
    }
    app.use('/frequencia', paginaDaAluna, express.static(path.join(__dirname, 'frequencia')));
};

module.exports.calcularFrequencia = calcularFrequencia;
module.exports.FREQUENCIA_MINIMA = FREQUENCIA_MINIMA;
