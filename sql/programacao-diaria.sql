begin;
create table if not exists public.programacao_diaria (
 data_producao date primary key,
 itens jsonb not null check (jsonb_typeof(itens)='array'),
 publicado_por uuid not null default auth.uid(),
 atualizado_em timestamptz not null default now()
);
create table if not exists public.programacao_gestores (usuario_id uuid primary key);
alter table public.programacao_gestores enable row level security;
grant select on public.programacao_gestores to authenticated;
create policy "gestor consulta propria" on public.programacao_gestores for select to authenticated using (usuario_id=auth.uid());
alter table public.programacao_diaria enable row level security;
grant select,insert,update on public.programacao_diaria to authenticated;
create policy "programacao leitura ativos" on public.programacao_diaria for select to authenticated using (exists(select 1 from public.perfis p where p.usuario_id=auth.uid() and p.ativo));
create policy "programacao inserir" on public.programacao_diaria for insert to authenticated with check (publicado_por=auth.uid() and exists(select 1 from public.perfis p where p.usuario_id=auth.uid() and p.ativo and (p.papel='admin' or exists(select 1 from public.programacao_gestores g where g.usuario_id=auth.uid()))));
create policy "programacao atualizar" on public.programacao_diaria for update to authenticated using (exists(select 1 from public.perfis p where p.usuario_id=auth.uid() and p.ativo and (p.papel='admin' or exists(select 1 from public.programacao_gestores g where g.usuario_id=auth.uid())))) with check (publicado_por=auth.uid() and exists(select 1 from public.perfis p where p.usuario_id=auth.uid() and p.ativo and (p.papel='admin' or exists(select 1 from public.programacao_gestores g where g.usuario_id=auth.uid()))));
commit;