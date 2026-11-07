# Homologação — bipagem vinculada à programação (07/11/2026)

## Estado atual
Implementação inicial em branch isolada. **Não foi compilada, executada ou validada contra Supabase de testes. Não fazer merge/deploy.** Nenhuma migration aplicada em produção.

## Componentes adicionados
- `src/programacao-producao.jsx`: administrador cadastra itens por data/modelo/cor/quantidade/prioridade.
- `src/quadro-programacao-setores.jsx`: lista integral para todos os setores e contagem S1..S6.
- `src/main.jsx`: menus para operadores e administrador, seletor de pedido no scanner do Setor 1.
- `src/bipagem-estavel.js`: usa `registrar_bipagem_programada` na branch de homologação, em vez de gravações diretas.
- `supabase/migrations/20261107_bipagem_programada_homologacao.sql`: função transacional, unicidade e visão de progresso.

## Bloqueios antes de testes integrados
1. Preparar Supabase separado (projeto gratuito, se disponível) e inserir esquema base compatível com produção. **Não executar SQL no projeto principal.**
2. Confirmar no banco de testes nomes e tipos reais de `perfis`, `produtos`, `bipagens`, `setores`, `modelos_espelhos`. O esquema do repositório pode estar desatualizado.
3. Aplicar migrations em ordem apenas no ambiente descartável; resolver quaisquer divergências de RLS e duplicidades.
4. Configurar URL/chave pública do Supabase de testes via variáveis Vite, sem reutilizar credenciais de produção.
5. Testar build Vite, login do operador e administrador, scanner físico e câmera, erro de rede e recarregamento.
6. Avaliar comportamento de peças legadas sem vínculo e de múltiplos pedidos com mesmo modelo/cor. A versão de testes rejeita peça sem vínculo para evitar contagem incorreta.
7. Testar encerramento e decisão manual sobre pendências. **A interface de decisões ainda não está integrada ao banco**.
8. Validar simultaneidade com dois scanners e confirmar que cada par peça/setor tem no máximo uma bipagem.
9. Conferir atualização dos seis setores em vários dispositivos. O realtime depende de configuração do Supabase.
10. Garantir que nenhum processo paralelo antigo contorne a RPC; auditar `App.bipar`, scanners e integrações.

## Cenários de aceitação
- Expedição cadastra 100 peças de um modelo/cor; todos os setores veem 100.
- Bipar código novo no setor 2 sem setor 1: erro, sem escrita.
- Bipar código no setor 1 sem pedido selecionado: erro, sem escrita.
- Bipar mesmo código duas vezes no setor 1: só primeira escrita.
- Bipar em ordem S1..S6: cada contador aumenta uma vez.
- Dois scanners bipam mesmo código simultaneamente: uma escrita.
- Produzir 80 de 100: 20 pendentes no S1, sem transferência automática ao encerrar.
- Pedido suspenso: bloquear novas bipagens programadas.
- Funcionário do setor 3 tenta bipar setor 2: negar.
- Não permitir acesso de operador à tela de cadastro.
- Verificar que a versão principal publicada permanece idêntica.

## Decisão confirmada
Todos os setores veem a programação inteira desde o início, porém a bipagem só é aceita após a etapa anterior. Saldos não são transferidos automaticamente; decisão cabe ao chefe da expedição.

## Pendências de implementação
- Fluxo completo de decisões sobre saldos (com auditoria).
- Distinção entre saldo planejado, pronto para trabalhar e trabalho em andamento.
- Proteção transacional e controle de permissões para edições/cancelamentos após iniciar bipagens.
- Testes automatizados e validação de build.
