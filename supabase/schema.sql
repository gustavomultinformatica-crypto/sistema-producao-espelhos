create extension if not exists pgcrypto;

create table if not exists setores (
  id smallint primary key,
  nome text not null,
  ordem smallint not null unique
);

insert into setores (id,nome,ordem) values
(1,'Corte e destaque',1),(2,'Cola e EVA',2),(3,'Colagem do couro',3),
(4,'Limpeza',4),(5,'Finalização e alça',5),(6,'Embalagem',6)
on conflict (id) do update set nome=excluded.nome, ordem=excluded.ordem;

create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  codigo_barras text not null unique,
  modelo text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists bipagens (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id),
  setor_id smallint not null references setores(id),
  usuario_id uuid references auth.users(id),
  criado_em timestamptz not null default now()
);

create index if not exists bipagens_criado_em_idx on bipagens(criado_em desc);
create index if not exists bipagens_setor_idx on bipagens(setor_id, criado_em desc);

alter table produtos enable row level security;
alter table bipagens enable row level security;

create policy "usuarios autenticados leem produtos" on produtos for select to authenticated using (true);
create policy "usuarios autenticados criam produtos" on produtos for insert to authenticated with check (true);
create policy "usuarios autenticados leem bipagens" on bipagens for select to authenticated using (true);
create policy "usuarios autenticados registram bipagens" on bipagens for insert to authenticated with check (auth.uid() = usuario_id);
