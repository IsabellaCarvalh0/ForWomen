# Chamada, frequência e certificado

Funcionalidades do professor e da aluna ligadas à presença no curso.
Tudo é guardado no PostgreSQL.

## Como funciona

**Professor** (pasta `chamada/`)

| Página | O que faz |
|---|---|
| `chamada.html` | Escolhe turma e data e marca a presença. As alunas vêm do **cadastro de alunas** (tela Alunas): quem o professor cadastrar numa turma aparece sozinha na chamada. **Todas começam presentes**: o professor desmarca quem faltou. Escolhendo a mesma turma e data, a chamada é reaberta para edição. |
| `frequencia.html` | Informa o **total de aulas previstas** e o sistema calcula na hora a frequência mínima. Mostra presenças, faltas e frequência de cada aluna e liga cada uma ao login dela. |
| `conclusao.html` | Mostra quem pode emitir o certificado e quem não pode. Tem o botão **Liberar certificados** (e **Bloquear**, para desfazer). |

**Aluna** (pasta `frequencia/`, endereço `/frequencia/`)

- Vê a própria frequência, que começa em 100% e **desce a cada falta**, o histórico de aulas e quantas faltas ainda pode ter.
- Quando o professor libera e ela tem pelo menos 75%, aparece o botão **Emitir certificado**. O certificado abre numa página pronta para **imprimir ou salvar em PDF** (A4 na horizontal).

## Regra da frequência

- Frequência mínima: **75%** (constante `FREQUENCIA_MINIMA` em `frequencia-api.js`).
- Base de cálculo: o maior entre o **total de aulas previstas** e as chamadas já feitas.
- Frequência = (base − faltas) ÷ base. Ex.: 20 aulas, 2 faltas → 90%.
- Presenças mínimas = 75% da base, arredondado para cima. Ex.: 10 aulas → 8 presenças, até 2 faltas.
- A porcentagem nunca é arredondada para cima (74,9% aparece como 74,9%, não 75%).
- Sem o total de aulas definido, a tela mostra só a frequência parcial e não diz quem está apta; também não dá para liberar certificados.
- O certificado só sai se o professor liberou **e** a aluna está dentro do limite de faltas. O servidor confere os dois a cada pedido. Se ela faltar depois da liberação e passar do limite, perde o direito.

## Ligação entre a aluna da chamada e o login

As alunas vêm da tela de cadastros (tabela `usuarios`, com `turma_id`). Ao abrir a chamada, cada aluna cadastrada ganha um registro em `chamada_alunas` **já ligado ao login dela**, e nomes corrigidos no cadastro são atualizados. Não é preciso ligar nada à mão.

A coluna "Login" da página Frequência fica só para casos antigos (nomes que não vieram do cadastro).

## Preparar o banco

Instalação nova: `node banco/criar-banco.js` já cria tudo.

Banco que já existe (por exemplo, o Supabase do grupo):

```
node banco/migrar-turmas.js
node banco/migrar-chamada.js
```

Pode ser executado mais de uma vez sem problema.

## Tabelas (`banco/chamada.sql`)

| Tabela | Para que serve |
|---|---|
| `chamada_alunas` | Alunas de cada turma (`nome`, `turma`, `usuario_id` com o login ligado). |
| `chamadas` | Um registro por turma e data. |
| `chamada_presencas` | Presente ou ausente de cada aluna em cada chamada. |
| `chamada_cursos` | Por turma: `total_aulas` e a data de liberação dos certificados. |

Remover uma aluna da chamada apaga também o histórico de presenças dela.

## Rotas

Código em `chamada-api.js` (chamada) e `frequencia-api.js` (frequência e certificado).

**Professor** (aluna recebe 403; sem login, 401)

| Método e rota | O que faz |
|---|---|
| `GET /api/chamada/turmas` | Lista as turmas. |
| `GET /api/chamada/alunas?turma=` | Alunas da turma. |
| `PUT /api/chamada/alunas/:id/vinculo` | Liga ao login (`{ usuario_id }`) ou desliga (`null`). |
| `GET /api/chamada?turma=&data=` | Alunas e presenças da data. |
| `PUT /api/chamada` | Salva ou atualiza a chamada. |
| `GET /api/chamada/curso?turma=` | Total de aulas, regra, frequência de cada aluna e estado da liberação. |
| `PUT /api/chamada/curso` | Define o total de aulas: `{ turma, total_aulas }`. |
| `POST /api/chamada/curso/liberar` | Libera os certificados da turma. |
| `POST /api/chamada/curso/bloquear` | Desfaz a liberação. |

**Aluna** (professor recebe 403; sem login, 401)

| Método e rota | O que faz |
|---|---|
| `GET /api/frequencia` | Frequência, faltas, histórico e situação do certificado. |
| `GET /api/frequencia/certificado` | Dados do certificado, só se liberado e se ela estiver apta. |

As turmas vêm da tabela `turmas`, criada pelo professor na tela de cadastros. Para ter turmas, rode também `node banco/migrar-turmas.js`. Se a tabela não existir, a chamada usa só "Turma A" e "Turma B".

## Link no menu da aluna

O link `<a href="/frequencia/">Frequência</a>` foi acrescentado (uma linha em cada) nos menus das telas da aluna: Início (escondido para o professor), Avisos, Aulas e Atividades. Nenhuma outra mudança foi feita nessas telas.
