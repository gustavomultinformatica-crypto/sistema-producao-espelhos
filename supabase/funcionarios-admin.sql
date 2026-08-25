alter table perfis add column if not exists email text;
alter table perfis add column if not exists papel text not null default 'operador' check (papel in ('admin','operador'));

create table if not exists funcionarios_pendentes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null unique,
  setor_id smallint references setores(id),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table funcionarios_pendentes enable row level security;

-- O primeiro usuário criado no projeto vira administrador.
update perfis
set papel = 'admin'
where usuario_id = (
  select id from auth.users order by created_at asc limit 1
);

-- Permite que todos os autenticados leiam perfis para ranking.
drop policy if exists "usuarios autenticados leem perfis" on perfis;
create policy "usuarios autenticados leem perfis"
on perfis for select to authenticated using (true);

-- Usuário pode criar o próprio perfil.
drop policy if exists "usuario cria proprio perfil" on perfis;
create policy "usuario cria proprio perfil"
on perfis for insert to authenticated
with check (auth.uid() = usuario_id);

-- Usuário atualiza o próprio perfil; admin atualiza qualquer perfil.
drop policy if exists "usuario atualiza proprio perfil" on perfis;
create policy "usuario atualiza proprio perfil"
on perfis for update to authenticated
using (
  auth.uid() = usuario_id
  or exists (select 1 from perfis p where p.usuario_id = auth.uid() and p.papel = 'admin')
)
with check (
  auth.uid() = usuario_id
  or exists (select 1 from perfis p where p.usuario_id = auth.uid() and p.papel = 'admin')
);

-- Administrador gerencia pré-cadastros.
drop policy if exists "admin le funcionarios pendentes" on funcionarios_pendentes;
create policy "admin le funcionarios pendentes"
on funcionarios_pendentes for select to authenticated
using (exists (select 1 from perfis p where p.usuario_id = auth.uid() and p.papel = 'admin'));

drop policy if exists "admin cria funcionarios pendentes" on funcionarios_pendentes;
create policy "admin cria funcionarios pendentes"
on funcionarios_pendentes for insert to authenticated
with check (exists (select 1 from perfis p where p.usuario_id = auth.uid() and p.papel = 'admin'));

drop policy if exists "admin atualiza funcionarios pendentes" on funcionarios_pendentes;
create policy "admin atualiza funcionarios pendentes"
on funcionarios_pendentes for update to authenticated
using (exists (select 1 from perfis p where p.usuario_id = auth.uid() and p.papel = 'admin'))
with check (exists (select 1 from perfis p where p.usuario_id = auth.uid() and p.papel = 'admin'));

drop policy if exists "admin exclui funcionarios pendentes" on funcionarios_pendentes;
create policy "admin exclui funcionarios pendentes"
on funcionarios_pendentes for delete to authenticated
using (exists (select 1 from perfis p where p.usuario_id = auth.uid() and p.papel = 'admin'));

-- Qualquer usuário autenticado pode localizar apenas o pré-cadastro do próprio e-mail.
drop policy if exists "usuario le seu pre cadastro" on funcionarios_pendentes;
create policy "usuario le seu pre cadastro"
on funcionarios_pendentes for select to authenticated
using (lower(email) = lower(coalesce(auth.jwt() ->> 'email','')));

create index if not exists funcionarios_pendentes_email_idx on funcionarios_pendentes(lower(email));
