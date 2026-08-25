create table if not exists perfis (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  setor_id smallint references setores(id),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table perfis enable row level security;

drop policy if exists "usuarios autenticados leem perfis" on perfis;
create policy "usuarios autenticados leem perfis"
on perfis for select
to authenticated
using (true);

drop policy if exists "usuario cria proprio perfil" on perfis;
create policy "usuario cria proprio perfil"
on perfis for insert
to authenticated
with check (auth.uid() = usuario_id);

drop policy if exists "usuario atualiza proprio perfil" on perfis;
create policy "usuario atualiza proprio perfil"
on perfis for update
to authenticated
using (auth.uid() = usuario_id)
with check (auth.uid() = usuario_id);

create index if not exists perfis_setor_idx on perfis(setor_id);
create index if not exists bipagens_usuario_idx on bipagens(usuario_id, criado_em desc);
