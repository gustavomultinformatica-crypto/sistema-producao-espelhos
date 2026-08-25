create extension if not exists pgcrypto;

create or replace function public.alterar_senha_funcionario_admin(
  p_usuario_id uuid,
  p_nova_senha text
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.usuario_e_admin() then
    raise exception 'Apenas administradores podem alterar senhas.';
  end if;

  if p_usuario_id is null then
    raise exception 'Usuario invalido.';
  end if;

  if char_length(coalesce(p_nova_senha,'')) < 6 then
    raise exception 'A senha deve ter pelo menos 6 caracteres.';
  end if;

  if p_usuario_id = auth.uid() then
    raise exception 'Use a recuperacao de senha para alterar a senha do administrador.';
  end if;

  if not exists (
    select 1 from public.perfis
    where usuario_id = p_usuario_id
      and coalesce(papel,'operador') <> 'admin'
  ) then
    raise exception 'Funcionario nao encontrado.';
  end if;

  update auth.users
  set encrypted_password = crypt(p_nova_senha, gen_salt('bf')),
      updated_at = now()
  where id = p_usuario_id;

  if not found then
    raise exception 'Usuario de autenticacao nao encontrado.';
  end if;

  return true;
end;
$$;

revoke all on function public.alterar_senha_funcionario_admin(uuid,text) from public;
grant execute on function public.alterar_senha_funcionario_admin(uuid,text) to authenticated;
