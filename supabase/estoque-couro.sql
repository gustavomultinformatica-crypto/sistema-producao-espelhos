-- ==========================================
-- ESTOQUE DE COURO
-- Entradas e saídas por cor e metragem
-- ==========================================

create table if not exists estoque_couro_movimentos (
  id uuid primary key default gen_random_uuid(),
  cor text not null,
  tipo text not null check (tipo in ('entrada','saida')),
  quantidade_metros numeric(12,2) not null check (quantidade_metros > 0),
  data_movimento date not null default current_date,
  fornecedor text,
  documento text,
  observacao text,
  usuario_id uuid not null references auth.users(id),
  criado_em timestamptz not null default now()
);

create index if not exists estoque_couro_movimentos_data_idx
on estoque_couro_movimentos(data_movimento desc, criado_em desc);

create index if not exists estoque_couro_movimentos_cor_idx
on estoque_couro_movimentos(cor);

create index if not exists estoque_couro_movimentos_tipo_idx
on estoque_couro_movimentos(tipo);

alter table estoque_couro_movimentos enable row level security;

drop policy if exists "admins leem estoque couro" on estoque_couro_movimentos;
create policy "admins leem estoque couro"
on estoque_couro_movimentos
for select
to authenticated
using (
  exists (
    select 1 from perfis p
    where p.usuario_id = auth.uid()
      and p.papel = 'admin'
      and p.ativo = true
  )
);

drop policy if exists "admins inserem estoque couro" on estoque_couro_movimentos;
create policy "admins inserem estoque couro"
on estoque_couro_movimentos
for insert
to authenticated
with check (
  usuario_id = auth.uid()
  and exists (
    select 1 from perfis p
    where p.usuario_id = auth.uid()
      and p.papel = 'admin'
      and p.ativo = true
  )
);

drop policy if exists "admins atualizam estoque couro" on estoque_couro_movimentos;
create policy "admins atualizam estoque couro"
on estoque_couro_movimentos
for update
to authenticated
using (
  exists (
    select 1 from perfis p
    where p.usuario_id = auth.uid()
      and p.papel = 'admin'
      and p.ativo = true
  )
)
with check (
  exists (
    select 1 from perfis p
    where p.usuario_id = auth.uid()
      and p.papel = 'admin'
      and p.ativo = true
  )
);
