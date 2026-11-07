-- SOMENTE AMBIENTE ISOLADO DE HOMOLOGAÇÃO. NÃO EXECUTAR EM PRODUÇÃO.
-- Após migrations de programação e políticas de leitura.
-- Este RPC vincula cada peça ao item correto e registra a passagem em transação.
-- A seleção explícita do item é obrigatória na primeira etapa (evita confundir cores).
create unique index if not exists uq_bipagens_produto_setor
 on public.bipagens(produto_id,setor_id);
-- IMPORTANTE: índice acima exige checagem de duplicidades em dados legados;
-- só executar em banco descartável de testes, nunca diretamente no banco real.
create or replace function public.registrar_bipagem_programada(
 p_codigo text,p_modelo text,p_setor smallint,p_item_programacao uuid default null
) returns table(produto uuid, item_programacao uuid, setor smallint, total_setor bigint)
language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_usuario uuid:=auth.uid();
 v_perfil public.perfis%rowtype;
 v_produto public.produtos%rowtype;
 v_item public.itens_programacao%rowtype;
 v_vinculo uuid;
 v_contagem bigint;
begin
 if v_usuario is null then raise exception 'Sessão expirada'; end if;
 select * into v_perfil from public.perfis where usuario_id=v_usuario;
 if not found or not v_perfil.ativo then raise exception 'Funcionário sem acesso ativo'; end if;
 if p_setor not between 1 and 6 then raise exception 'Setor inválido'; end if;
 if v_perfil.papel<>'admin' and v_perfil.setor_id<>p_setor then raise exception 'Setor não autorizado'; end if;
 if length(trim(coalesce(p_codigo,'')))=0 or length(trim(p_codigo))>120 then raise exception 'Código inválido'; end if;
 -- Serializa concorrência sobre o mesmo código, inclusive quando produto ainda não existe.
 perform pg_advisory_xact_lock(hashtextextended(upper(trim(p_codigo)),0));
 select * into v_produto from public.produtos where codigo_barras=upper(trim(p_codigo)) for update;
 if not found then
  if p_setor<>1 then raise exception 'Peça deve iniciar no setor 1'; end if;
  if p_item_programacao is null then raise exception 'Selecione o pedido programado para esta peça'; end if;
  select * into v_item from public.itens_programacao where id=p_item_programacao for update;
  if not found or v_item.status<>'ativo' then raise exception 'Pedido indisponível'; end if;
  if v_item.modelo<>trim(p_modelo) then raise exception 'Modelo não corresponde ao pedido'; end if;
  if not exists(select 1 from public.programacoes_producao where id=v_item.programacao_id and status='aberta')
  then raise exception 'Programação não está aberta'; end if;
  select count(*) into v_contagem from public.vinculos_producao where item_programacao_id=v_item.id;
  if v_contagem>=v_item.quantidade then raise exception 'Quantidade programada já atingida'; end if;
  insert into public.produtos(codigo_barras,modelo,ativo) values(upper(trim(p_codigo)),trim(p_modelo),true) returning * into v_produto;
  insert into public.vinculos_producao(produto_id,item_programacao_id,vinculado_por)
   values(v_produto.id,v_item.id,v_usuario);
  v_vinculo:=v_item.id;
 else
  if not v_produto.ativo then raise exception 'Peça inativa'; end if;
  if trim(p_modelo)<>v_produto.modelo then raise exception 'Modelo diferente do cadastro da peça'; end if;
  select item_programacao_id into v_vinculo from public.vinculos_producao where produto_id=v_produto.id;
  if v_vinculo is null then raise exception 'Peça antiga sem vínculo com programação: usar fluxo legado de homologação'; end if;
  if p_item_programacao is not null and p_item_programacao<>v_vinculo then raise exception 'Pedido diferente do vínculo da peça'; end if;
  select * into v_item from public.itens_programacao where id=v_vinculo for update;
  if v_item.status<>'ativo' then raise exception 'Pedido suspenso ou cancelado'; end if;
 end if;
 if exists(select 1 from public.bipagens where produto_id=v_produto.id and setor_id=p_setor)
 then raise exception 'Peça já bipada neste setor'; end if;
 if p_setor>1 and not exists(select 1 from public.bipagens where produto_id=v_produto.id and setor_id=p_setor-1)
 then raise exception 'Peça não passou pelo setor anterior'; end if;
 insert into public.bipagens(produto_id,setor_id,usuario_id) values(v_produto.id,p_setor,v_usuario);
 select count(*) into v_contagem from public.bipagens b
 join public.vinculos_producao v on v.produto_id=b.produto_id
 where v.item_programacao_id=v_vinculo and b.setor_id=p_setor;
 return query select v_produto.id,v_vinculo,p_setor,v_contagem;
end;$$;
revoke all on function public.registrar_bipagem_programada(text,text,smallint,uuid) from public;
grant execute on function public.registrar_bipagem_programada(text,text,smallint,uuid) to authenticated;
create or replace view public.progresso_programacao_setores
with (security_invoker=true) as
select i.id as item_programacao_id, s.id as setor_id, i.quantidade as programadas,
 count(distinct b.produto_id)::integer as concluidas,
 greatest(i.quantidade-count(distinct b.produto_id)::integer,0) as pendentes
from public.itens_programacao i
cross join public.setores s
left join public.vinculos_producao v on v.item_programacao_id=i.id
left join public.bipagens b on b.produto_id=v.produto_id and b.setor_id=s.id
group by i.id,s.id,i.quantidade;
