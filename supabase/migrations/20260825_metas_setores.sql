create table if not exists public.metas_setores (
  setor_id integer primary key check (setor_id between 1 and 6),
  meta_diaria integer not null default 200 check (meta_diaria >= 0),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid null references auth.users(id)
);

insert into public.metas_setores (setor_id, meta_diaria)
values (1,200),(2,200),(3,200),(4,200),(5,200),(6,200)
on conflict (setor_id) do nothing;

alter table public.metas_setores enable row level security;

drop policy if exists "metas_setores_select_authenticated" on public.metas_setores;
create policy "metas_setores_select_authenticated"
on public.metas_setores for select
to authenticated
using (true);

drop policy if exists "metas_setores_insert_admin" on public.metas_setores;
create policy "metas_setores_insert_admin"
on public.metas_setores for insert
to authenticated
with check (
  exists (
    select 1 from public.perfis p
    where p.usuario_id = auth.uid()
      and p.papel = 'admin'
      and p.ativo = true
  )
);

drop policy if exists "metas_setores_update_admin" on public.metas_setores;
create policy "metas_setores_update_admin"
on public.metas_setores for update
to authenticated
using (
  exists (
    select 1 from public.perfis p
    where p.usuario_id = auth.uid()
      and p.papel = 'admin'
      and p.ativo = true
  )
)
with check (
  exists (
    select 1 from public.perfis p
    where p.usuario_id = auth.uid()
      and p.papel = 'admin'
      and p.ativo = true
  )
);
