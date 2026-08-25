create or replace function public.excluir_funcionario_admin(p_usuario_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario text;
begin
  if not public.usuario_e_admin() then
    raise exception 'Apenas administradores podem excluir funcionarios.';
  end if;

  if p_usuario_id = auth.uid() then
    raise exception 'O administrador nao pode excluir a propria conta.';
  end if;

  select usuario into v_usuario
  from public.perfis
  where usuario_id = p_usuario_id;

  if v_usuario is null then
    return false;
  end if;

  delete from public.funcionarios_pendentes
  where lower(coalesce(usuario,'')) = lower(v_usuario);

  delete from public.perfis
  where usuario_id = p_usuario_id;

  return true;
end;
$$;

revoke all on function public.excluir_funcionario_admin(uuid) from public;
grant execute on function public.excluir_funcionario_admin(uuid) to authenticated;
