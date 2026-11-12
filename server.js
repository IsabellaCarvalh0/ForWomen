/* ==========================================================================
   FOR WOMEN — SERVIDOR WEB
   Projeto de Extensão Programa Sabará For Women — IFMG Campus Sabará
   --------------------------------------------------------------------------
   Este arquivo é o servidor da plataforma. Ele é executado pelo Node.js
   (fora do navegador) e tem as seguintes responsabilidades:

     1. entregar as páginas HTML e estáticos do site para o navegador;
     2. autenticar o usuário (conferir e-mail ou login e senha);
     3. direcionar cada usuário para a sua área conforme o perfil;Get-Location
     4. fornecer APIs para dados de usuários, turmas e videoaulas.

   Como executar:   node server.js
   Como acessar:    http://localhost:3000
   ========================================================================== */


/* --------------------------------------------------------------------------
   1. IMPORTAÇÃO DOS MÓDULOS
   -------------------------------------------------------------------------- */

require("dotenv").config();                  // lê o arquivo .env (senhas e conexão)

const express = require("express");          // framework que cria o servidor web
const session = require("express-session");  // guarda quem está logado (sessão)
const bcrypt = require("bcryptjs");          // criptografa e confere senhas
const path = require("path");                // monta caminhos de pastas
const fs = require("fs");                    // manipulação de arquivos do sistema
const banco = require("./banco/conexao");    // conexão com o PostgreSQL (Supabase)


/* --------------------------------------------------------------------------
   2. CRIAÇÃO DA APLICAÇÃO
   -------------------------------------------------------------------------- */

const app = express();                        // objeto principal: representa o nosso servidor
const PORTA = process.env.PORTA || 3000;      // porta de rede (vem do .env; 3000 se faltar)

// Configuração do motor de templates EJS
app.set("view engine", "ejs");
app.set("views", [
  path.join(__dirname, "atividades"),
  path.join(__dirname, "atividade professor"),
  __dirname
]);


/* --------------------------------------------------------------------------
   3. PÁGINAS DE DESTINO DE CADA TIPO DE USUÁRIO
   -------------------------------------------------------------------------- */

const PAGINA_DA_ALUNA = "/Inicio/index.html";        // área da aluna
const PAGINA_DO_PROFESSOR = "/Inicio/index.html"; // área do professor
const CAMINHO_AULAS_JSON = path.join(__dirname, "banco", "aulas.json");


/* --------------------------------------------------------------------------
   4. BUSCA DO USUÁRIO NO BANCO DE DADOS
   -------------------------------------------------------------------------- */

// Usuários de teste para desenvolvimento local ou quando o banco estiver indisponível
const USUARIOS_TESTE = [
  {
    id: 1,
    nome: "Ana Clara Ferreira",
    email: "aluna@forwomen.com",
    senha_hash: bcrypt.hashSync("aluna123", 10),
    tipo: "aluna",
    turma: "Turma A",
    turma_id: null
  },
  {
    id: 2,
    nome: "Pierre Vinícius",
    email: "professor@forwomen.com",
    senha_hash: bcrypt.hashSync("professor123", 10),
    tipo: "professor",
    turma: null,
    turma_id: null
  },
  {
    id: 3,
    nome: "Mariana Costa",
    email: "aluna.turmab@forwomen.com",
    senha_hash: bcrypt.hashSync("aluna123", 10),
    tipo: "aluna",
    turma: "Turma B",
    turma_id: null
  }
];

// Procura pelo e-mail (professores) ou pelo login (alunas cadastradas pelo professor).
async function buscarUsuario(identificacao) {
  const emailLimpo = identificacao.toLowerCase().trim();

  // Tenta consultar o banco de dados PostgreSQL (Supabase)
  try {
    const resultado = await banco.query(
      `SELECT u.id, u.nome, u.email, u.senha_hash, u.tipo, u.turma_id, t.nome AS turma
       FROM usuarios u
       LEFT JOIN turmas t ON t.id = u.turma_id
       WHERE u.email = $1 OR u.login = $1`,
      [emailLimpo]
    );

    if (resultado && resultado.rows && resultado.rows.length > 0) {
      return resultado.rows[0];   // usuário encontrado no banco
    }
  } catch (erroBanco) {
    console.warn("Aviso: Conexão com o banco falhou (" + erroBanco.message + "). Verificando usuários de teste locais...");
  }

  // Fallback: se o banco falhar ou não encontrar, busca na lista de usuários de teste
  return USUARIOS_TESTE.find(u => u.email === emailLimpo);
}


/* --------------------------------------------------------------------------
   4.0. TURMAS
   turma_id vazio (null) significa "todas as turmas".
   -------------------------------------------------------------------------- */

// Confere o turma_id recebido do formulário. Vazio vale como "todas".
async function lerTurmaId(valor) {
  if (valor === undefined || valor === null || valor === "") {
    return { valido: true, turmaId: null };
  }
  const turmaId = Number(valor);
  if (!Number.isInteger(turmaId) || turmaId <= 0) {
    return { valido: false };
  }
  const resultado = await banco.query("SELECT id FROM turmas WHERE id = $1", [turmaId]);
  return { valido: resultado.rows.length > 0, turmaId };
}

// Acrescenta o nome da turma em cada aula (as aulas guardam só o turma_id).
async function incluirNomeDaTurma(aulas) {
  let nomes = new Map();
  try {
    const resultado = await banco.query("SELECT id, nome FROM turmas");
    nomes = new Map(resultado.rows.map(t => [t.id, t.nome]));
  } catch (erroBanco) {
    // Banco indisponível: as aulas aparecem sem o nome da turma
  }
  return aulas.map(a => ({
    ...a,
    turma_id: a.turma_id ?? null,
    turma: a.turma_id ? (nomes.get(a.turma_id) || "Turma removida") : "Todas as turmas"
  }));
}


/* --------------------------------------------------------------------------
   4.1. FUNÇÕES DE PERSISTÊNCIA DAS VIDEOAULAS
   -------------------------------------------------------------------------- */

async function obterAulas() {
  // 1. Tenta obter do banco de dados relacional
  try {
    const resultado = await banco.query(
      "SELECT id, titulo, video_url, descricao, turma_id, duracao_minutos, professor_nome, professor_avatar, materiais, criado_em FROM aulas ORDER BY id ASC"
    );
    if (resultado && resultado.rows && resultado.rows.length > 0) {
      return resultado.rows;
    }
  } catch (erroBanco) {
    // Banco indisponível ou tabela ainda não criada: usa fallback no arquivo
  }

  // 2. Fallback: Lê do arquivo aulas.json
  try {
    if (fs.existsSync(CAMINHO_AULAS_JSON)) {
      const conteudo = fs.readFileSync(CAMINHO_AULAS_JSON, "utf8");
      return JSON.parse(conteudo);
    }
  } catch (erroArquivo) {
    console.error("Erro ao ler aulas.json:", erroArquivo.message);
  }

  return [];
}

async function salvarAula(novaAula) {
  let aulas = [];
  try {
    if (fs.existsSync(CAMINHO_AULAS_JSON)) {
      aulas = JSON.parse(fs.readFileSync(CAMINHO_AULAS_JSON, "utf8"));
    }
  } catch (e) {
    aulas = [];
  }

  // Gera o próximo ID
  const maiorId = aulas.reduce((max, a) => (a.id > max ? a.id : max), 0);
  novaAula.id = maiorId + 1;
  novaAula.criado_em = new Date().toISOString();

  aulas.push(novaAula);

  // 1. Salva no arquivo JSON local
  try {
    fs.writeFileSync(CAMINHO_AULAS_JSON, JSON.stringify(aulas, null, 2), "utf8");
  } catch (errJson) {
    console.error("Erro ao gravar em aulas.json:", errJson.message);
  }

  // 2. Tenta salvar no PostgreSQL
  try {
    await banco.query(
      `INSERT INTO aulas (id, titulo, video_url, descricao, turma_id, duracao_minutos, professor_nome, professor_avatar, materiais, criado_em)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        novaAula.id,
        novaAula.titulo,
        novaAula.video_url,
        novaAula.descricao,
        novaAula.turma_id,
        novaAula.duracao_minutos,
        novaAula.professor_nome,
        novaAula.professor_avatar,
        novaAula.materiais,
        novaAula.criado_em
      ]
    );
  } catch (errDb) {
    // Não interrompe caso o banco esteja offline
  }

  return novaAula;
}

async function excluirAula(id) {
  const idNum = parseInt(id, 10);
  let aulas = [];
  try {
    if (fs.existsSync(CAMINHO_AULAS_JSON)) {
      aulas = JSON.parse(fs.readFileSync(CAMINHO_AULAS_JSON, "utf8"));
    }
  } catch (e) {
    aulas = [];
  }

  const aulasAtualizadas = aulas.filter(a => a.id !== idNum);
  try {
    fs.writeFileSync(CAMINHO_AULAS_JSON, JSON.stringify(aulasAtualizadas, null, 2), "utf8");
  } catch (e) {}

  try {
    await banco.query("DELETE FROM aulas WHERE id = $1", [idNum]);
  } catch (e) {}

  return true;
}


/* --------------------------------------------------------------------------
   4.2. FUNÇÕES DE PERSISTÊNCIA DOS AVISOS
   -------------------------------------------------------------------------- */

// Busca os avisos no banco de dados.
async function obterAvisos() {
  const resultado = await banco.query(`
    SELECT
      a.id,
      a.titulo,
      a.mensagem,
      a.turma_id,
      t.nome AS turma_nome,
      a.fixado,
      a.professor_id,
      a.criado_em,
      a.atualizado_em,
      u.nome AS professor_nome
    FROM avisos a
    LEFT JOIN usuarios u ON u.id = a.professor_id
    LEFT JOIN turmas t ON t.id = a.turma_id
    ORDER BY a.fixado DESC, a.criado_em DESC
  `);

  return resultado.rows;
}

// Cadastra um aviso criado pelo professor autenticado.
async function salvarAviso(aviso) {
  const resultado = await banco.query(`
    INSERT INTO avisos (
      titulo,
      mensagem,
      turma_id,
      fixado,
      professor_id
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [
    aviso.titulo,
    aviso.mensagem,
    aviso.turma_id,
    aviso.fixado,
    aviso.professor_id
  ]);

  return resultado.rows[0];
}

// Atualiza um aviso existente, pertencente ao professor que o criou.
async function editarAviso(id, aviso, professorId) {
  const resultado = await banco.query(`
    UPDATE avisos
    SET
      titulo = $1,
      mensagem = $2,
      turma_id = $3,
      fixado = $4,
      atualizado_em = NOW()
    WHERE id = $5 AND professor_id = $6
    RETURNING *
  `, [
    aviso.titulo,
    aviso.mensagem,
    aviso.turma_id,
    aviso.fixado,
    id,
    professorId
  ]);

  return resultado.rows[0];
}

// Exclui somente um aviso pertencente ao professor autenticado.
async function excluirAviso(id, professorId) {
  const resultado = await banco.query(`
    DELETE FROM avisos
    WHERE id = $1 AND professor_id = $2
    RETURNING id
  `, [id, professorId]);

  return resultado.rowCount > 0;
}



/* --------------------------------------------------------------------------
   5. MIDDLEWARES GERAIS
   -------------------------------------------------------------------------- */

// Lê formulários codificados e payloads JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "8mb" }));


// Cria a sessão
app.use(session({
  secret: process.env.SESSION_SECRET || "forwomen-session-secret-key-ifmg-sabara-2026",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 2 }
}));


require("./atividades-api")(app, banco);
require("./cadastros-api")(app, banco);

/* --------------------------------------------------------------------------
   6. MIDDLEWARES DE PROTEÇÃO DE PÁGINAS
   -------------------------------------------------------------------------- */

function exigirLogin(req, res, next) {
  if (req.session.usuario) {
    return next();
  }
  return res.redirect("/login?erro=sessao");
}

function exigirProfessor(req, res, next) {
  if (!req.session.usuario) {
    return res.redirect("/login?erro=sessao");
  }
  if (req.session.usuario.tipo !== "professor") {
    return res.redirect(PAGINA_DA_ALUNA + "?erro=permissao");
  }
  return next();
}


/* --------------------------------------------------------------------------
   6.1. NORMALIZAÇÃO DE ENDEREÇOS COM ESPAÇO
   -------------------------------------------------------------------------- */

const PASTA_AULAS = "videoPlayer - For Women";

app.use(function (req, res, next) {
  try {
    req.url = decodeURI(req.url);
  } catch (erro) {}

  if (req.url.startsWith("/" + PASTA_AULAS + "/")) {
    req.url = "/aulas" + req.url.slice(PASTA_AULAS.length + 1);
  }

  if (req.url.startsWith("/atividade professor")) {
    req.url = "/atividade-professor" + req.url.slice("/atividade professor".length);
  }

  next();
});


/* --------------------------------------------------------------------------
   7. ARQUIVOS PÚBLICOS
   -------------------------------------------------------------------------- */

app.use("/login", express.static(path.join(__dirname, "login")));


/* --------------------------------------------------------------------------
   8. ROTAS PRINCIPAIS & AUTENTICAÇÃO
   -------------------------------------------------------------------------- */

app.get("/", function (req, res) {
  if (!req.session.usuario) {
    return res.redirect("/login");
  }
  if (req.session.usuario.tipo === "professor") {
    return res.redirect(PAGINA_DO_PROFESSOR);
  }
  return res.redirect(PAGINA_DA_ALUNA);
});

app.post("/entrar", async function (req, res) {
  const email = req.body.email;
  const senha = req.body.senha;

  if (!email || !senha) {
    return res.redirect("/login?erro=campos");
  }

  try {
    const usuario = await buscarUsuario(email);

    if (!usuario) {
      return res.redirect("/login?erro=invalido");
    }

    const senhaConfere = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaConfere) {
      return res.redirect("/login?erro=invalido");
    }

    req.session.usuario = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      tipo: usuario.tipo,
      turma: usuario.turma || null,
      turma_id: usuario.turma_id || null
    };

    if (usuario.tipo === "professor") {
      return res.redirect(PAGINA_DO_PROFESSOR);
    }
    return res.redirect(PAGINA_DA_ALUNA);

  } catch (erro) {
    console.error("Erro ao fazer login:", erro.message);
    return res.redirect("/login?erro=servidor");
  }
});

app.get("/sair", function (req, res) {
  req.session.destroy(function () {
    res.redirect("/login?mensagem=saiu");
  });
});


/* --------------------------------------------------------------------------
   8.1. ROTAS DE API (USUÁRIO E AULAS)
   -------------------------------------------------------------------------- */

app.get("/api/usuario", exigirLogin, function (req, res) {
  res.json(req.session.usuario);
});


/* --------------------------------------------------------------------------
   API DE AVISOS
   -------------------------------------------------------------------------- */

// Lista avisos visíveis para o usuário logado.
// Para a Área Inicial, pode ser usado: /api/avisos?fixados=true
app.get("/api/avisos", exigirLogin, async function (req, res) {
  console.log("ROTA GET /api/avisos FOI ACESSADA");
  try {
    const usuario = req.session.usuario;
    const somenteFixados = req.query.fixados === "true";

    // A aluna vê os avisos para todas as turmas e os da turma dela.
    const resultado = await banco.query(`
      SELECT
        a.id,
        a.titulo,
        a.mensagem,
        a.turma_id,
        t.nome AS turma_nome,
        a.fixado,
        a.professor_id,
        a.criado_em,
        a.atualizado_em,
        u.nome AS professor_nome
      FROM avisos a
      LEFT JOIN usuarios u ON u.id = a.professor_id
      LEFT JOIN turmas t ON t.id = a.turma_id
      WHERE
        ($1 = 'professor'
          OR a.turma_id IS NULL
          OR a.turma_id = $2)
        AND ($3::boolean = FALSE OR a.fixado = TRUE)
      ORDER BY a.fixado DESC, a.criado_em DESC
    `, [usuario.tipo, usuario.turma_id || null, somenteFixados]);

    res.json(resultado.rows);
  } catch (erro) {
    console.error("Erro ao listar avisos:", erro.message);
    res.status(500).json({ erro: "Não foi possível carregar os avisos." });
  }
});


// Cadastra um aviso. Somente professores podem usar esta rota.
app.post("/api/avisos", exigirProfessor, async function (req, res) {
  try {
    const titulo = typeof req.body.titulo === "string"
      ? req.body.titulo.trim()
      : "";

    const mensagem = typeof req.body.mensagem === "string"
      ? req.body.mensagem.trim()
      : "";

    const fixado = req.body.fixado === true ||
      req.body.fixado === "true";

    if (!titulo || !mensagem) {
      return res.status(400).json({
        erro: "O título e a mensagem são obrigatórios."
      });
    }

    const publico = await lerTurmaId(req.body.turma_id);

    if (!publico.valido) {
      return res.status(400).json({
        erro: "Selecione uma turma cadastrada."
      });
    }

    const aviso = await salvarAviso({
      titulo,
      mensagem,
      turma_id: publico.turmaId,
      fixado,
      professor_id: req.session.usuario.id
    });

    res.status(201).json(aviso);
  } catch (erro) {
  console.error("ERRO COMPLETO AO LISTAR AVISOS:", erro);
  res.status(500).json({ erro: "Não foi possível carregar os avisos." });
}
});


// Edita um aviso criado pelo professor logado.
app.put("/api/avisos/:id", exigirProfessor, async function (req, res) {
  
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: "ID de aviso inválido." });
    }

    const titulo = typeof req.body.titulo === "string"
      ? req.body.titulo.trim()
      : "";

    const mensagem = typeof req.body.mensagem === "string"
      ? req.body.mensagem.trim()
      : "";

    const fixado = req.body.fixado === true ||
      req.body.fixado === "true";

    if (!titulo || !mensagem) {
      return res.status(400).json({
        erro: "O título e a mensagem são obrigatórios."
      });
    }

    const publico = await lerTurmaId(req.body.turma_id);

    if (!publico.valido) {
      return res.status(400).json({
        erro: "Selecione uma turma cadastrada."
      });
    }

    const aviso = await editarAviso(
      id,
      { titulo, mensagem, turma_id: publico.turmaId, fixado },
      req.session.usuario.id
    );

    if (!aviso) {
      return res.status(404).json({
        erro: "Aviso não encontrado ou não pertence a você."
      });
    }

    res.json(aviso);
  } catch (erro) {
    console.error("Erro ao editar aviso:", erro.message);
    res.status(500).json({
      erro: "Não foi possível editar o aviso."
    });
  }
});


// Exclui um aviso criado pelo professor logado.
app.delete("/api/avisos/:id", exigirProfessor, async function (req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: "ID de aviso inválido." });
    }

    const excluido = await excluirAviso(
      id,
      req.session.usuario.id
    );

    if (!excluido) {
      return res.status(404).json({
        erro: "Aviso não encontrado ou não pertence a você."
      });
    }

    res.json({ sucesso: true });
  } catch (erro) {
    console.error("Erro ao excluir aviso:", erro.message);
    res.status(500).json({
      erro: "Não foi possível excluir o aviso."
    });
  }
});


/** Lista as aulas de acordo com o perfil e turma */
app.get("/api/aulas", exigirLogin, async function (req, res) {
  try {
    const todasAulas = await incluirNomeDaTurma(await obterAulas());
    const usuario = req.session.usuario;

    // Se for professor: retorna todas as aulas ou filtra por ?turma_id=
    if (usuario.tipo === "professor") {
      if (req.query.turma_id) {
        const turmaFiltro = Number(req.query.turma_id);
        const filtradas = todasAulas.filter(a => a.turma_id === null || a.turma_id === turmaFiltro);
        return res.json(filtradas);
      }
      return res.json(todasAulas);
    }

    // Se for aluna: exibe estritamente as aulas da sua turma + aulas de "Todas as turmas"
    const aulasAluna = todasAulas.filter(a => a.turma_id === null || a.turma_id === usuario.turma_id);

    return res.json(aulasAluna);
  } catch (erro) {
    console.error("Erro ao listar aulas:", erro.message);
    res.status(500).json({ erro: "Erro ao buscar aulas" });
  }
});

/** Detalhes de uma aula específica */
app.get("/api/aulas/:id", exigirLogin, async function (req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const todasAulas = await incluirNomeDaTurma(await obterAulas());
    const aula = todasAulas.find(a => a.id === id);

    if (!aula) {
      return res.status(404).json({ erro: "Aula não encontrada" });
    }

    res.json(aula);
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao buscar aula" });
  }
});

/** Cadastro de nova aula pelo professor */
app.post("/api/aulas", exigirProfessor, async function (req, res) {
  try {
    const { titulo, video_url, descricao, duracao_minutos, materiais } = req.body;

    if (!titulo || !video_url) {
      return res.status(400).json({ erro: "O título e o link do vídeo são obrigatórios." });
    }

    const turma = await lerTurmaId(req.body.turma_id);
    if (!turma.valido) {
      return res.status(400).json({ erro: "Selecione uma turma cadastrada." });
    }

    // Iniciais do professor
    const partesNome = (req.session.usuario.nome || "Professor").trim().split(" ");
    let iniciais = partesNome[0][0].toUpperCase();
    if (partesNome.length > 1) {
      iniciais += partesNome[partesNome.length - 1][0].toUpperCase();
    }

    const novaAula = {
      titulo: titulo.trim(),
      video_url: video_url.trim(),
      descricao: (descricao || "").trim(),
      turma_id: turma.turmaId,
      duracao_minutos: parseInt(duracao_minutos, 10) || 15,
      professor_nome: req.session.usuario.nome,
      professor_avatar: iniciais,
      materiais: (materiais || "").trim()
    };

    const aulaSalva = await salvarAula(novaAula);
    res.status(201).json(aulaSalva);
  } catch (erro) {
    console.error("Erro ao cadastrar aula:", erro.message);
    res.status(500).json({ erro: "Erro ao cadastrar aula" });
  }
});

/** Exclusão de aula pelo professor */
app.delete("/api/aulas/:id", exigirProfessor, async function (req, res) {
  try {
    await excluirAula(req.params.id);
    res.json({ sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao excluir aula" });
  }
});


/* --------------------------------------------------------------------------
   9. ÁREAS PROTEGIDAS & REDIRECIONAMENTOS DE NAVEGAÇÃO
   -------------------------------------------------------------------------- */

// Área de Início
app.use("/Inicio", exigirLogin, express.static(path.join(__dirname, "Inicio")));

// Redirecionamento da raiz de aulas para a página correta
app.get(["/aulas", "/aulas/", "/aulas/index.html"], exigirLogin, function (req, res) {
  res.redirect("/aulas/videoPlayer.html");
});
app.use("/aulas", exigirLogin, express.static(path.join(__dirname, PASTA_AULAS)));

// Avisos: roteamento inteligente por perfil
app.get(["/Avisos", "/Avisos/", "/Avisos/index.html"], exigirLogin, function (req, res) {
  if (req.session.usuario.tipo === "professor") {
    return res.redirect("/Avisos/AvisosProfessor.html");
  }
  return res.redirect("/Avisos/Avisos.html");
});
app.get("/Avisos/AvisosProfessor.html", exigirProfessor, function (req, res, next) {
  next();
});
app.use("/Avisos", exigirLogin, express.static(path.join(__dirname, "Avisos")));

// Atividades: roteamento inteligente por perfil
app.get(["/atividades", "/atividades/", "/atividades/index.html"], exigirLogin, function (req, res) {
  if (req.session.usuario.tipo === "professor") {
    return res.redirect("/atividade-professor");
  }
  res.render("atividadesAluno", { usuario: req.session.usuario });
});
app.get(["/atividades/atividadesAluno.html", "/atividades/atividadesAluno.ejs"], exigirLogin, function (req, res) {
  res.render("atividadesAluno", { usuario: req.session.usuario });
});
app.use("/atividades", exigirLogin, express.static(path.join(__dirname, "atividades")));

// Área exclusiva do professor (Chamada)
app.use("/chamada", exigirProfessor, express.static(path.join(__dirname, "chamada")));

// Área exclusiva do professor (Cadastro de turmas e alunas)
app.use("/cadastros", exigirProfessor, express.static(path.join(__dirname, "cadastros")));

// Atividades do Professor (renderização dinâmica em EJS)
app.get(["/atividade-professor", "/atividade-professor/", "/atividade-professor/atividadeProfessor.html", "/atividade-professor/atividadeProfessor.ejs"], exigirProfessor, function (req, res) {
  res.render("atividadeProfessor", { usuario: req.session.usuario });
});
app.use("/atividade-professor", exigirProfessor, express.static(path.join(__dirname, "atividade professor")));

// Compatibilidade e fallbacks estáticos para arquivos de atividades
app.use(exigirLogin, express.static(path.join(__dirname, "atividades")));



/* --------------------------------------------------------------------------
   10. PÁGINA NÃO ENCONTRADA (ERRO 404)
   -------------------------------------------------------------------------- */

app.use(function (req, res) {
  res.status(404).send("Página não encontrada. <a href='/'>Voltar ao início</a>");
});


/* --------------------------------------------------------------------------
   11. LIGAR O SERVIDOR
   -------------------------------------------------------------------------- */

app.listen(PORTA, function () {
  console.log("Servidor For Women rodando em http://localhost:" + PORTA);
});
