# Implantação gradual — Fase 1 (somente programação)

## Escopo
- Nova tela para administradores cadastrarem dia, modelo, cor, quantidade, prioridade e observações.
- Consulta por todos os funcionários ativos, com dados da mesma programação.
- **Não altera** `src/bipagem-estavel.js`, as funções de bipagem em `src/main.jsx`, tabelas `produtos`/`bipagens`, relatórios e metas.
- Não inclui baixa automática nesta fase. A lista é **planejamento**, não saldo produzido.
- Mateus precisa ter `papel='admin'` e `ativo=true` no perfil existente; este PR não altera permissões de usuários.

## Ordem segura de publicação
1. Revisar o diff e confirmar que somente os arquivos de fase 1 estão no PR.
2. Fazer backup verificável do banco de produção e registrar plano de reversão.
3. Validar `perfis` (colunas `usuario_id`, `papel`, `ativo`) e permissões no Supabase. Confirmar que os usuários autenticados podem consultar as duas tabelas novas.
4. Testar build Vite (`npm ci && npm run build`) em ambiente isolado; testar login admin/operador, criação, inserção, suspensão, cancelamento, observações, data e atualização em dois navegadores.
5. Somente após os testes, aplicar **apenas** `supabase/migrations/20261107_fase1_programacao_sem_bipagem.sql` no projeto correto. **Não executar migrações de `feature/programacao-producao-expedicao`**.
6. Publicar o frontend da fase 1 após validar o deploy/rollback de GitHub Pages e o fluxo existente de bipagens.
7. Validar com Mateus e operador de cada setor, incluindo scanner e relatórios antigos.
8. Se ocorrer erro, reverter apenas o frontend ao commit anterior; manter tabelas novas isoladas até revisão. Nunca apagar dados sem backup.

## Pendências antes de deploy
- Compilação e testes ainda não executados.
- Política de atualizações da programação (editar quantidade após cadastro) ainda não implementada; nesta fase é possível suspender/cancelar e adicionar novo item.
- Realtime depende de publicação das tabelas; botão Atualizar lista é alternativa.
- Não houve acesso nem mudança no banco real.
- Avaliar aviso de quota/faturamento do Supabase visto no painel.
