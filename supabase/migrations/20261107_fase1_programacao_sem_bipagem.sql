-- FASE 1: cadastro e consulta apenas. NÃO altera produtos, bipagens ou metas.
-- APLICAR SOMENTE APÓS BACKUP E REVISÃO NO BANCO CORRETO.
create table if not exists public.programacoes_diarias (
 id uuid primary key default gen_random_uuid(),
 dia date not null unique,
 observacoes text not null default '',
 criado_por uuid not null references auth.users(id),
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now()
);
create table if not exists public.programacoes_diarias_itens (
 id uuid primary key default gen_random_uuid(),
 programacao_id uuid not null references public.programacoes_diarias(id) on delete restrict,
 modelo text not null check (length(trim(modelo)) between 1 and 150),
 cor text not null check (length(trim(cor)) between 1 and 80),
 quantidade integer not null check (quantidade between 1 and 10000),
 prioridade smallint not null default 2 check (prioridade between 1 and 3),
 status text not null default 'ativo' check (status in ('ativo','suspenso','cancelado')),
 criado_em timestamptz not null default now()
);
create index if not exists idx_programacoes_itens_programacao on public.programacoes_diarias_itens(programacao_id);
alter table public.programacoes_diarias enable row level security;
alter table public.programacoes_diarias_itens enable row level security;
-- Usuários ativos podem consultar. Somente administradores ativos editam.
create policy "pd_consulta_ativos" on public.programacoes_diarias for select to authenticated
 using (exists(select 1 from public.perfis p where p.usuario_id=auth.uid() and p.ativo=true));
create policy "pd_cadastro_admin" on public.programacoes_diarias for insert to authenticated
 with check (criado_por=auth.uid() and exists(select 1 from public.perfis p where p.usuario_id=auth.uid() and p.ativo=true and p.papel='admin'));
create policy "pd_atualizacao_admin" on public.programacoes_diarias for update to authenticated
 using (exists(select 1 from public.perfis p where p.usuario_id=auth.uid() and p.ativo=true and p.papel='admin'))
 with check (exists(select 1 from public.perfis p where p.usuario_id=auth.uid() and p.ativo=true and p.papel='admin'));
create policy "pdi_consulta_ativos" on public.programacoes_diarias_itens for select to authenticated
 using (exists(select 1 from public.perfis p where p.usuario_id=auth.uid() and p.ativo=true));
create policy "pdi_cadastro_admin" on public.programacoes_diarias_itens for insert to authenticated
 with check (exists(select 1 from public.perfis p where p.usuario_id=auth.uid() and p.ativo=true and p.papel='admin'));
create policy "pdi_atualizacao_admin" on public.programacoes_diarias_itens for update to authenticated
 using (exists(select 1 from public.perfis p where p.usuario_id=auth.uid() and p.ativo=true and p.papel='admin'))
 with check (exists(select 1 from public.perfis p where p.usuario_id=auth.uid() and p.ativo=true and p.papel='admin'));
-- Nenhuma permissão de delete. Histórico permanece.
