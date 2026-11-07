-- APENAS HOMOLOGAÇÃO. Executar depois de 20261107_programacao_producao_rascunho.sql.
-- A primeira versão da tela permite gravação exclusivamente por administradores ativos.
create unique index if not exists programacoes_data_unica on public.programacoes_producao(data_producao);
create policy "programacoes_insert_admin" on public.programacoes_producao for insert to authenticated with check (criado_por=auth.uid() and exists(select 1 from public.perfis p where p.usuario_id=auth.uid() and p.papel='admin' and p.ativo=true));
create policy "programacoes_update_admin" on public.programacoes_producao for update to authenticated using (exists(select 1 from public.perfis p where p.usuario_id=auth.uid() and p.papel='admin' and p.ativo=true)) with check (exists(select 1 from public.perfis p where p.usuario_id=auth.uid() and p.papel='admin' and p.ativo=true));
create policy "itens_insert_admin" on public.itens_programacao for insert to authenticated with check (exists(select 1 from public.perfis p where p.usuario_id=auth.uid() and p.papel='admin' and p.ativo=true));
create policy "itens_update_admin" on public.itens_programacao for update to authenticated using (exists(select 1 from public.perfis p where p.usuario_id=auth.uid() and p.papel='admin' and p.ativo=true)) with check (exists(select 1 from public.perfis p where p.usuario_id=auth.uid() and p.papel='admin' and p.ativo=true));
-- Pendências e vínculos continuam sem permissão de escrita até RPC transacional auditável.
