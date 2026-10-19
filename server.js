/* ==========================================================================
   FOR WOMEN — SERVIDOR WEB
   Projeto de Extensão Programa Sabará For Women — IFMG Campus Sabará
   --------------------------------------------------------------------------
   Este arquivo é o servidor da plataforma. Ele é executado pelo Node.js
   (fora do navegador) e tem três responsabilidades:

     1. entregar as páginas HTML do site para o navegador;
     2. autenticar o usuário (conferir e-mail e senha);
     3. direcionar cada usuário para a sua área: professor vai para a área
        do professor e aluna vai para a área da aluna.

   Como executar:   node server.js
   Como acessar:    http://localhost:3000

   OBSERVAÇÃO: nesta etapa os usuários ainda estão gravados em uma lista
   dentro deste arquivo (constante USUARIOS). Na próxima etapa essa lista
   será substituída por uma tabela no banco de dados.
   ========================================================================== */


/* --------------------------------------------------------------------------
   1. IMPORTAÇÃO DOS MÓDULOS
   O require() carrega um módulo já instalado e guarda em uma constante.
   -------------------------------------------------------------------------- */

require("dotenv").config();                  // lê o arquivo .env (senhas e conexão)

const express = require("express");          // framework que cria o servidor web
const session = require("express-session");  // guarda quem está logado (sessão)
const bcrypt = require("bcryptjs");          // criptografa e confere senhas
const path = require("path");                // monta caminhos de pastas
const banco = require("./banco/conexao");    // conexão com o PostgreSQL (Supabase)


/* --------------------------------------------------------------------------
   2. CRIAÇÃO DA APLICAÇÃO
   -------------------------------------------------------------------------- */

const app = express();                        // objeto principal: representa o nosso servidor
const PORTA = process.env.PORTA || 3000;      // porta de rede (vem do .env; 3000 se faltar)


/* --------------------------------------------------------------------------
   3. PÁGINAS DE DESTINO DE CADA TIPO DE USUÁRIO
   Guardadas em constantes para que o caminho apareça uma única vez no
   código. Se a página mudar de lugar, basta alterar aqui.
   -------------------------------------------------------------------------- */

const PAGINA_DA_ALUNA = "/Inicio/index.html";        // área da aluna
const PAGINA_DO_PROFESSOR = "/chamada/chamada.html"; // área do professor


/* --------------------------------------------------------------------------
   4. BUSCA DO USUÁRIO NO BANCO DE DADOS
   Os usuários ficam na tabela "usuarios" do PostgreSQL, criada pelo arquivo
   banco/schema.sql. A senha nunca é guardada como texto: a coluna senha_hash
   guarda o código embaralhado gerado pelo bcrypt, do qual não é possível
   voltar para a senha original.
   -------------------------------------------------------------------------- */

/**
 * Procura um usuário pelo e-mail digitado no formulário.
 * O e-mail é passado para minúsculas e tem os espaços das pontas removidos,
 * para que " Aluna@ForWomen.com " encontre o mesmo cadastro.
 *
 * O $1 é um parâmetro: o valor digitado viaja separado do comando SQL e é
 * tratado pelo driver, o que impede SQL Injection (alguém digitar comandos
 * SQL dentro do campo do formulário).
 *
 * async/await: a consulta ao banco demora, então a função espera a resposta
 * chegar antes de continuar.
 *
 * Retorna o usuário encontrado ou undefined.
 */
async function buscarUsuarioPorEmail(email) {

  const emailLimpo = email.toLowerCase().trim();

  const resultado = await banco.query(
    "SELECT id, nome, email, senha_hash, tipo FROM usuarios WHERE email = $1",
    [emailLimpo]
  );

  return resultado.rows[0];   // primeira linha encontrada (undefined se não achou)
}


/* --------------------------------------------------------------------------
   5. MIDDLEWARES GERAIS
   Middleware é uma função que o Express executa em toda requisição, antes
   das rotas. Os dois abaixo preparam o pedido que chega do navegador.
   -------------------------------------------------------------------------- */

// Lê os dados enviados pelo formulário de login e monta o objeto req.body.
app.use(express.urlencoded({ extended: true }));

// Cria a sessão: o servidor envia um cookie de identificação ao navegador e
// guarda, do seu lado, os dados de quem está logado.
app.use(session({
  secret: process.env.SESSION_SECRET,  // chave que assina o cookie, guardada no .env
  resave: false,                     // não regrava a sessão se nada mudou
  saveUninitialized: false,          // não cria sessão para visitante que não fez login
  cookie: { maxAge: 1000 * 60 * 60 * 2 }  // validade do login: 2 horas (em milissegundos)
}));


/* --------------------------------------------------------------------------
   6. MIDDLEWARES DE PROTEÇÃO DE PÁGINAS
   Usados nas rotas que só podem ser abertas por quem está logado.
   O parâmetro next é a função que libera a passagem para a próxima etapa.
   -------------------------------------------------------------------------- */

/** Libera a passagem apenas para quem já fez login. */
function exigirLogin(req, res, next) {
  if (req.session.usuario) {
    return next();                              // está logada: pode continuar
  }
  return res.redirect("/login?erro=sessao");    // não está: volta para o login
}

/** Libera a passagem apenas para quem está logado E é professor. */
function exigirProfessor(req, res, next) {
  if (!req.session.usuario) {
    return res.redirect("/login?erro=sessao");  // ninguém logado
  }
  if (req.session.usuario.tipo !== "professor") {
    return res.redirect(PAGINA_DA_ALUNA + "?erro=permissao");  // aluna tentou entrar
  }
  return next();                                // é professor: pode continuar
}


/* --------------------------------------------------------------------------
   6.1. AJUSTE DO ENDEREÇO DA PASTA DE AULAS
   A pasta das aulas se chama "videoPlayer - For Women", com espaços no nome,
   e o Express 5 não consegue registrar um endereço com espaços. A solução é
   traduzir o endereço antigo para "/aulas" antes de procurar o arquivo, sem
   precisar alterar os links das páginas que o restante do grupo já escreveu.
   (O ideal, mais para a frente, é renomear a pasta para "aulas".)
   -------------------------------------------------------------------------- */

const PASTA_AULAS = "videoPlayer - For Women";

app.use(function (req, res, next) {

  // O navegador troca cada espaço do endereço por %20; aqui voltamos ao espaço.
  try {
    req.url = decodeURI(req.url);
  } catch (erro) {
    // endereço mal formado: segue adiante do jeito que veio
  }

  // Troca "/videoPlayer - For Women/..." por "/aulas/..."
  if (req.url.startsWith("/" + PASTA_AULAS + "/")) {
    req.url = "/aulas" + req.url.slice(PASTA_AULAS.length + 1);
  }

  next();
});


/* --------------------------------------------------------------------------
   7. ARQUIVOS PÚBLICOS (NÃO PRECISAM DE LOGIN)
   express.static entrega arquivos de uma pasta direto para o navegador.
   Aqui liberamos apenas a pasta da tela de login.
   -------------------------------------------------------------------------- */

app.use("/login", express.static(path.join(__dirname, "login")));


/* --------------------------------------------------------------------------
   8. ROTAS
   Rota = endereço + método HTTP. GET é abrir uma página, POST é enviar
   dados de um formulário.
   -------------------------------------------------------------------------- */

/** Página de entrada do site: manda cada visitante para o lugar certo. */
app.get("/", function (req, res) {
  if (!req.session.usuario) {
    return res.redirect("/login");              // ainda não entrou
  }
  if (req.session.usuario.tipo === "professor") {
    return res.redirect(PAGINA_DO_PROFESSOR);   // já logado como professor
  }
  return res.redirect(PAGINA_DA_ALUNA);         // já logado como aluna
});


/** Recebe o formulário de login e decide para onde o usuário vai. */
app.post("/entrar", async function (req, res) {

  // 8.1 — pega o que foi digitado no formulário
  const email = req.body.email;
  const senha = req.body.senha;

  // 8.2 — algum campo veio vazio
  if (!email || !senha) {
    return res.redirect("/login?erro=campos");
  }

  // O try/catch protege a consulta ao banco: se o banco estiver fora do ar,
  // o servidor mostra um aviso em vez de quebrar.
  try {

    // 8.3 — procura o usuário no banco de dados
    const usuario = await buscarUsuarioPorEmail(email);

    // 8.4 — e-mail não cadastrado
    if (!usuario) {
      return res.redirect("/login?erro=invalido");
    }

    // 8.5 — compara a senha digitada com o hash guardado na coluna senha_hash.
    //       Como o hash não pode ser revertido, o bcrypt embaralha a senha
    //       digitada e verifica se o resultado é o mesmo.
    const senhaConfere = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaConfere) {
      return res.redirect("/login?erro=invalido");
    }

    // 8.6 — login aprovado: guarda os dados na sessão.
    //       A senha e o hash nunca são guardados na sessão.
    req.session.usuario = {
      id: usuario.id,
      nome: usuario.nome,
      tipo: usuario.tipo
    };

    // 8.7 — direcionamento por tipo de usuário
    if (usuario.tipo === "professor") {
      return res.redirect(PAGINA_DO_PROFESSOR);
    }
    return res.redirect(PAGINA_DA_ALUNA);

  } catch (erro) {
    console.error("Erro ao fazer login:", erro.message);
    return res.redirect("/login?erro=servidor");
  }
});


/** Encerra a sessão e volta para a tela de login. */
app.get("/sair", function (req, res) {
  req.session.destroy(function () {
    res.redirect("/login?mensagem=saiu");
  });
});


/** Informa à página quem está logado (usado para mostrar o nome no topo). */
app.get("/api/usuario", exigirLogin, function (req, res) {
  res.json(req.session.usuario);
});


/* --------------------------------------------------------------------------
   9. ÁREAS PROTEGIDAS
   Cada pasta do site só é entregue depois que o middleware de proteção
   autoriza. A pasta chamada é exclusiva do professor.
   -------------------------------------------------------------------------- */

// Área da aluna (o professor também pode consultar estas páginas)
app.use("/Inicio", exigirLogin, express.static(path.join(__dirname, "Inicio")));
app.use("/aulas", exigirLogin, express.static(path.join(__dirname, PASTA_AULAS)));
app.use("/atividades", exigirLogin, express.static(path.join(__dirname, "atividades")));
app.use("/Avisos", exigirLogin, express.static(path.join(__dirname, "Avisos")));

// Área exclusiva do professor
app.use("/chamada", exigirProfessor, express.static(path.join(__dirname, "chamada")));


/* --------------------------------------------------------------------------
   10. PÁGINA NÃO ENCONTRADA (ERRO 404)
   Só chega aqui o endereço que não combinou com nenhuma rota acima.
   -------------------------------------------------------------------------- */

app.use(function (req, res) {
  res.status(404).send("Página não encontrada. <a href='/'>Voltar ao início</a>");
});


/* --------------------------------------------------------------------------
   11. LIGAR O SERVIDOR
   Deixa o servidor escutando a porta e avisa no terminal que subiu.
   -------------------------------------------------------------------------- */

app.listen(PORTA, function () {
  console.log("Servidor For Women rodando em http://localhost:" + PORTA);
});
