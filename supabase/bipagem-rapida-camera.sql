create or replace function public.registrar_bipagem_rapida(
  p_codigo text,
  p_modelo text,
  p_setor smallint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_perfil record;
  v_produto_id uuid;
  v_existe boolean;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'mensagem', 'Sessão expirada. Entre novamente.');
  end if;

  if coalesce(trim(p_codigo),'') = '' then
    return jsonb_build_object('ok', false, 'mensagem', 'Código da peça inválido.');
  end if;

  if p_setor not between 1 and 6 then
    return jsonb_build_object('ok', false, 'mensagem', 'Setor inválido.');
  end if;

  select usuario_id,setor_id,ativo,papel
    into v_perfil
  from public.perfis
  where usuario_id = v_user;

  if v_perfil.usuario_id is null or coalesce(v_perfil.ativo,false) = false then
    return jsonb_build_object('ok', false, 'mensagem', 'Usuário sem acesso ativo.');
  end if;

  if coalesce(v_perfil.papel,'operador') <> 'admin' and v_perfil.setor_id <> p_setor then
    return jsonb_build_object('ok', false, 'mensagem', 'Você só pode registrar peças no seu setor.');
  end if;

  perform pg_advisory_xact_lock(hashtext(lower(trim(p_codigo))));

  select id into v_produto_id
  from public.produtos
  where codigo_barras = trim(p_codigo)
  limit 1;

  if v_produto_id is null then
    if p_setor <> 1 then
      return jsonb_build_object('ok', false, 'mensagem', 'Peça nova deve iniciar no setor 1.');
    end if;

    insert into public.produtos(codigo_barras,modelo)
    values(trim(p_codigo),coalesce(nullif(trim(p_modelo),''),'Sem modelo'))
    returning id into v_produto_id;
  end if;

  select exists(
    select 1 from public.bipagens
    where produto_id = v_produto_id and setor_id = p_setor
  ) into v_existe;

  if v_existe then
    return jsonb_build_object('ok', false, 'mensagem', 'Peça já registrada neste setor.');
  end if;

  if p_setor > 1 and not exists(
    select 1 from public.bipagens
    where produto_id = v_produto_id and setor_id = p_setor - 1
  ) then
    return jsonb_build_object('ok', false, 'mensagem', 'Etapa fora de ordem. Registre primeiro no setor anterior.');
  end if;

  insert into public.bipagens(produto_id,setor_id,usuario_id)
  values(v_produto_id,p_setor,v_user);

  return jsonb_build_object('ok', true, 'mensagem', 'Peça registrada com sucesso.');
end;
$$;

revoke all on function public.registrar_bipagem_rapida(text,text,smallint) from public;
grant execute on function public.registrar_bipagem_rapida(text,text,smallint) to authenticated;
