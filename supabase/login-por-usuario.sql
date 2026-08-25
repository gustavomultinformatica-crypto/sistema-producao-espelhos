alter table perfis add column if not exists usuario text;
alter table funcionarios_pendentes add column if not exists usuario text;

create unique index if not exists perfis_usuario_unique
on perfis(lower(usuario)) where usuario is not null;

create unique index if not exists funcionarios_pendentes_usuario_unique
on funcionarios_pendentes(lower(usuario)) where usuario is not null;

-- Preenche usuario de perfis antigos usando o nome, quando possível.
update perfis
set usuario = lower(regexp_replace(trim(nome), '[^a-zA-Z0-9._-]+', '', 'g'))
where usuario is null and nome is not null;

-- O operador pode consultar somente o pré-cadastro referente ao próprio usuário interno.
drop policy if exists "usuario le seu pre cadastro" on funcionarios_pendentes;
create policy "usuario le seu pre cadastro"
on funcionarios_pendentes
for select
to authenticated
using (
  lower(coalesce(usuario,'')) = lower(split_part(coalesce(auth.jwt() ->> 'email',''), '@', 1))
  or exists (
    select 1 from perfis p
    where p.usuario_id = auth.uid() and p.papel = 'admin'
  )
);
