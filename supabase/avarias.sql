create table if not exists avarias (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id) on delete cascade,
  setor_id smallint not null references setores(id),
  usuario_id uuid not null references auth.users(id),
  tipo text not null check (tipo in ('Quebrada','Avariada')),
  motivo text,
  observacao text,
  status text not null default 'Aberta' check (status in ('Aberta','Reprocessada','Descartada')),
  reprocessado_em timestamptz,
  reprocessado_por uuid references auth.users(id),
  criado_em timestamptz not null default now()
);

-- Compatibilidade para quem já executou uma versão anterior deste arquivo.
alter table avarias add column if not exists status text;
alter table avarias add column if not exists reprocessado_em timestamptz;
alter table avarias add column if not exists reprocessado_por uuid references auth.users(id);
update avarias set status='Aberta' where status is null;
alter table avarias alter column status set default 'Aberta';
alter table avarias alter column status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='avarias'::regclass and conname='avarias_status_check'
  ) then
    alter table avarias add constraint avarias_status_check
      check (status in ('Aberta','Reprocessada','Descartada'));
  end if;
end $$;

create index if not exists avarias_criado_em_idx on avarias(criado_em desc);
create index if not exists avarias_setor_idx on avarias(setor_id, criado_em desc);
create index if not exists avarias_produto_idx on avarias(produto_id, criado_em desc);
create index if not exists avarias_status_idx on avarias(status, criado_em desc);

alter table avarias enable row level security;

drop policy if exists "usuarios autenticados leem avarias" on avarias;
create policy "usuarios autenticados leem avarias"
on avarias for select to authenticated using (true);

drop policy if exists "usuarios autenticados registram avarias" on avarias;
create policy "usuarios autenticados registram avarias"
on avarias for insert to authenticated
with check (auth.uid() = usuario_id);

drop policy if exists "usuarios autenticados atualizam avarias" on avarias;
create policy "usuarios autenticados atualizam avarias"
on avarias for update to authenticated
using (true)
with check (true);
