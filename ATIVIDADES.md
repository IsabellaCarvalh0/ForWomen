As áreas de atividades da aluna e do professor utilizam PostgreSQL, pela conexão em `banco/conexao.js`. Não há persistência no navegador nem atividades de exemplo.

Para uma instalação existente, configure `DATABASE_URL` no `.env` e execute, na pasta que contém `server.js`:

```
node banco/migrar-atividades.js
node server.js
```

O banco deve ter a tabela `usuarios`. Para uma instalação nova, `node banco/criar-banco.js` prepara também as novas tabelas.

As atividades são visíveis para todas as alunas. Cada professor pode editar e excluir suas próprias atividades. Cada aluna acessa apenas suas próprias entregas; reenviar substitui a entrega anterior. Arquivos de até 5 MB são gravados integralmente no banco. Excluir uma atividade remove suas entregas por chave estrangeira.

Dados antigos do localStorage não são importados automaticamente, pois não identificam com segurança a aluna ou o professor responsável.

Validação automatizada: `node --test atividades-api.test.js`.
