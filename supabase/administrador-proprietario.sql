-- ==============================================
-- PROPRIETARIO DO SISTEMA / ADMINISTRADORES GERAIS
-- Somente o proprietario pode conceder/remover papel admin
-- ==============================================

create table if not exists sistema_config (
  id smallint primary key default 1 check (id = 1),
  owner_user_id uuid not null references auth.users(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Define o proprietario automaticamente de forma segura:
-- 1) prefere um admin cujo usuario/nome seja Gustavo;
-- 2) se nao encontrar, aceita somente se existir exatamente um admin no sistema.
do $$
declare
  v_owner uuid;
  v_qtd integer;
begin
  if not exists (select 1 from sistema_config where id=1) then
    select usuario_id into v_owner
    from perfis
    where papel='admin'
      and (
        lower(trim(coalesce(usuario,'')))='gustavo'
        or lower(trim(coalesce(nome,'')))='gustavo'
      )
    limit 1;

    if v_owner is null then
      select count(*) into v_qtd from perfis where papel='admin';
      if v_qtd <> 1 then
        raise exception 'Nao foi possivel identificar o proprietario com seguranca. Deve existir apenas um admin ou um admin chamado/usuario Gustavo.';
      end if;
      select usuario_id into v_owner from perfis where papel='admin' limit 1;
    end if;

    insert into sistema_config(id,owner_user_id) values(1,v_owner);
  end if;
end $$;

alter table sistema_config enable row level security;

create or replace function sou_proprietario()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from sistema_config
    where id=1 and owner_user_id=auth.uid()
  );
$$;

grant execute on function sou_proprietario() to authenticated;

create or replace function definir_administrador_geral(p_usuario_id uuid, p_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select owner_user_id into v_owner from sistema_config where id=1;
  if auth.uid() is null or auth.uid() <> v_owner then
    raise exception 'Somente o proprietario pode alterar administradores.';
  end if;

  if p_usuario_id = v_owner then
    raise exception 'A permissao do proprietario nao pode ser removida.';
  end if;

  update perfis
  set papel = case when p_admin then 'admin' else 'operador' end,
      ativo = true,
      atualizado_em = now()
  where usuario_id = p_usuario_id;

  if not found then
    raise exception 'Usuario nao encontrado.';
  end if;
end;
$$;

grant execute on function definir_administrador_geral(uuid,boolean) to authenticated;

create or replace function proteger_papel_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  if new.papel is distinct from old.papel then
    select owner_user_id into v_owner from sistema_config where id=1;
    if auth.uid() is null or auth.uid() <> v_owner then
      raise exception 'Somente o proprietario pode alterar administradores.';
    end if;
    if old.usuario_id = v_owner and new.papel <> 'admin' then
      raise exception 'O proprietario deve permanecer administrador.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_papel_admin on perfis;
create trigger trg_proteger_papel_admin
before update of papel on perfis
for each row execute function proteger_papel_admin();
