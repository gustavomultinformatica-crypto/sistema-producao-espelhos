create table if not exists avarias (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id) on delete cascade,
  setor_id smallint not null references setores(id),
  usuario_id uuid not null references auth.users(id),
  tipo text not null check (tipo in ('Quebrada','Avariada')),
  motivo text,
  observacao text,
  criado_em timestamptz not null default now()
);

create index if not exists avarias_criado_em_idx on avarias(criado_em desc);
create index if not exists avarias_setor_idx on avarias(setor_id, criado_em desc);
create index if not exists avarias_produto_idx on avarias(produto_id, criado_em desc);

alter table avarias enable row level security;

drop policy if exists "usuarios autenticados leem avarias" on avarias;
create policy "usuarios autenticados leem avarias"
on avarias for select to authenticated using (true);

drop policy if exists "usuarios autenticados registram avarias" on avarias;
create policy "usuarios autenticados registram avarias"
on avarias for insert to authenticated
with check (auth.uid() = usuario_id);
