# Programação diária de produção — Reflexo Prime (opção C)

## Status
Proposta técnica inicial em branch isolada. **Nenhuma mudança foi aplicada ao banco nem ao site de produção.** A migration SQL é preliminar e NÃO deve ser executada em produção nesta fase.

## Regra de negócio confirmada
A expedição cadastra quantidades por modelo/cor/data. Todos os seis setores veem a programação; cada setor bipa as peças com o leitor já existente. Ao final do dia, **saldos não são transferidos automaticamente**: permanecem pendentes até decisão explícita do chefe da expedição (manter, reprogramar para data escolhida ou cancelar saldo). A decisão é auditável.

## Descobertas no código
- `src/main.jsx`: telas, login, perfis, seis setores, bipagem e indicadores.
- `src/bipagem-estavel.js`: intercepta submit, usa fila e grava diretamente em `produtos` e `bipagens`. **É essencial integrar este caminho**, pois alterar somente `App.bipar` não seria suficiente.
- `supabase/schema.sql`: produtos identificados por código único e bipagens por setor.
- `src/admin-dashboard.js` e painéis TV: métricas existentes, a preservar.
- `supabase/migrations/20260825_metas_setores.sql`: meta fixa por setor; manter separada de programação por produto.

## Modelo de dados proposto
- `programacoes_producao`: data, status, responsável.
- `itens_programacao`: modelo, cor, quantidade, prioridade, status.
- `vinculos_producao`: associa código de barras individual a um item da programação; **não altera os registros legados**.
- `decisoes_pendencias`: decisão manual sobre saldo e data, com autoria e histórico.
- Contagens por setor derivadas de `bipagens` cruzadas com `vinculos_producao`, nunca de contador independente suscetível a divergência.

## Regras críticas antes da integração
1. Não associar automaticamente um código a um item quando houver duas programações abertas do mesmo modelo/cor. Exigir escolha explícita ou critério definido pela expedição.
2. Não permitir exceder a quantidade planejada sem autorização e registro do ajuste.
3. A bipagem e o vínculo devem ser validados no servidor em transação (RPC PostgreSQL), com unicidade `(produto_id,setor_id)` após saneamento de duplicidades legadas. O bloqueio JavaScript sozinho não evita concorrência.
4. Validar setor anterior, usuário ativo e setor autorizado no servidor; nunca confiar só na interface.
5. Não eliminar `produtos`, `bipagens`, relatórios, metas ou telas existentes. Permitir que peças legadas continuem sendo bipadas.
6. Separar `concluído no setor`, `pendente no setor`, `em processo` e `pronto na embalagem`; saldos de um dia não devem desaparecer no dia seguinte.
7. Exibir programação para operadores de setores 1 a 6; permitir escrita apenas para `admin` e novo papel `expedicao` (a confirmar e testar).
8. Não publicar automaticamente via workflow de deploy; abrir PR para revisão.

## Etapas de entrega
1. **Fundação (este commit):** desenho, tabelas isoladas e RLS somente leitura. Sem integração com sistema ativo.
2. Criar migração de permissões e RPCs para cadastrar programação, alterar itens, vincular peças, registrar bipagens e decidir pendências.
3. Criar componente React da expedição, telas de leitura por setor e progresso em tempo real; integrar os dois caminhos de bipagem.
4. Testes de concorrência, scanner físico/câmera, reconexão, RLS, duplicidade, reprogramação, cancelamento e histórico.
5. Homologar em ambiente Supabase de teste com dados fictícios; só então considerar merge/deploy e migração de produção.

## Casos de teste mínimos
- Programar 100, bipar 80 no setor 1, 60 no setor 2, 55 no setor 3: saldos por setor distintos.
- Encerrar o dia: 20 pendentes no setor 1; sem transferência automática.
- Chefe reprograma 20 para amanhã: decisão registrada e saldo anterior preservado.
- Duas bipagens simultâneas do mesmo código/setor: somente uma válida.
- Peça sem programação: comportamento legado preservado ou bloqueio configurável.
- Dois itens mesmo modelo/cor: vínculo não pode ser ambíguo.
- Operador não consegue editar programação; expedição não ganha acesso a administração de funcionários.
