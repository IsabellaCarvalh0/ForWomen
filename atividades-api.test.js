const { test } = require('node:test');
const assert = require('node:assert/strict');
const registrar = require('./atividades-api');

function ambiente(query = async () => ({ rows: [] })) {
    const rotas = {};
    const app = Object.fromEntries(['get', 'post', 'put', 'delete'].map(m => [m, (p, ...handlers) => { rotas[m + p] = handlers; }]));
    registrar(app, { query });
    return async (rota, usuario, body = {}, params = { id: '7' }) => {
        const req = { session: { usuario }, body, params };
        const res = { codigo: 200, status(c) { this.codigo = c; return this; }, json(d) { this.dados = d; },
            set() {}, send(d) { this.dados = d; } };
        const handlers = rotas[rota];
        async function seguir(i) { if (handlers[i]) await handlers[i](req, res, () => seguir(i + 1)); }
        await seguir(0);
        return res;
    };
}
const aluna = { id: 12, tipo: 'aluna' };
const professor = { id: 25, tipo: 'professor' };
const tarefa = { titulo: 'Lógica', descricao: 'Exercícios', professor: 'Docente', prazo: '2026-12-10' };

test('exige sessão e impede aluna de criar, editar e excluir', async () => {
    const api = ambiente(() => { throw new Error('Não deveria consultar'); });
    assert.equal((await api('get/api/atividades')).codigo, 401);
    for (const rota of ['post/api/atividades', 'put/api/atividades/:id', 'delete/api/atividades/:id']) {
        assert.equal((await api(rota, aluna, tarefa)).codigo, 403);
    }
});
test('consulta somente as entregas da aluna autenticada', async () => {
    const chamadas = [];
    const api = ambiente(async (sql, args) => {
        chamadas.push([sql, args]);
        return { rows: chamadas.length === 1 ? [{ id: 7 }] : [{ atividade_id: 7, link: 'https://example.com' }] };
    });
    const res = await api('get/api/atividades', aluna);
    assert.deepEqual(chamadas[1][1], [12]);
    assert.match(chamadas[1][0], /WHERE aluna_id = \$1/);
    assert.equal(res.dados.entregas['7'].link, 'https://example.com');
});
test('cria no banco com autor da sessão e valores parametrizados', async () => {
    const api = ambiente(async (sql, args) => {
        assert.match(sql, /INSERT INTO atividades/);
        assert.equal(args[6], 25);
        return { rows: [{ id: 7 }] };
    });
    assert.equal((await api('post/api/atividades', professor, tarefa)).codigo, 201);
});
test('edição e exclusão restringem o autor; outra autoria retorna 404', async () => {
    const api = ambiente(async (sql, args) => {
        assert.match(sql, /AND professor_id=/);
        assert.equal(args.at(-1), 25);
        return { rows: [] };
    });
    assert.equal((await api('put/api/atividades/:id', professor, tarefa)).codigo, 404);
    assert.equal((await api('delete/api/atividades/:id', professor)).codigo, 404);
});
test('rejeita data inexistente e links inseguros antes de gravar', async () => {
    const api = ambiente(() => { throw new Error('Não deveria consultar'); });
    for (const extra of [{ prazo: '2026-02-30' }, { material: 'javascript:alert(1)' }]) {
        assert.equal((await api('post/api/atividades', professor, { ...tarefa, ...extra })).codigo, 400);
    }
    assert.equal((await api('put/api/atividades/:id/entrega', aluna, { link: 'javascript:alert(1)' })).codigo, 400);
});
test('salva bytes do anexo e reenvia usando chave atividade/aluna', async () => {
    const chamadas = [];
    const api = ambiente(async (sql, args) => {
        chamadas.push([sql, args]);
        return { rows: [{ id: 7 }] };
    });
    const res = await api('put/api/atividades/:id/entrega', aluna, {
        arquivo: { nome: 'resposta.txt', base64: Buffer.from('solução').toString('base64') }
    });
    assert.equal(res.codigo, 200);
    assert.match(chamadas[1][0], /ON CONFLICT \(atividade_id, aluna_id\) DO UPDATE/);
    assert.equal(chamadas[1][1][1], 12);
    assert.equal(chamadas[1][1][5].toString(), 'solução');
});
test('professor não entrega e atividade inexistente não recebe entrega', async () => {
    const api = ambiente();
    const entrega = { link: 'https://example.com' };
    assert.equal((await api('put/api/atividades/:id/entrega', professor, entrega)).codigo, 403);
    assert.equal((await api('put/api/atividades/:id/entrega', aluna, entrega)).codigo, 404);
});
test('download busca somente o arquivo da aluna autenticada', async () => {
    const api = ambiente(async (sql, args) => {
        assert.match(sql, /aluna_id=\$2/);
        assert.deepEqual(args, ['7', 12]);
        return { rows: [{ arquivo_nome: 'a.txt', arquivo_dados: Buffer.from('conteúdo') }] };
    });
    assert.equal((await api('get/api/atividades/:id/arquivo', aluna)).dados.toString(), 'conteúdo');
});
