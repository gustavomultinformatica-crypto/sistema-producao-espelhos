-- PROPOSTA EM BRANCH DE TESTES: não executar no banco de produção sem homologação.
create table if not exists public.programacoes_producao (
 id uuid primary key default gen_random_uuid(),
 data_producao date not null,
 status text not null default 'aberta' check (status in ('rascunho','aberta','encerrada')),
 observacoes text,
 criado_por uuid not null references auth.users(id),
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now()
);
create table if not exists public.itens_programacao (
 id uuid primary key default gen_random_uuid(),
 programacao_id uuid not null references public.programacoes_producao(id),
 modelo text not null,
 cor text not null default 'Não informada',
 quantidade integer not null check (quantidade > 0),
 prioridade smallint not null default 2 check (prioridade between 1 and 3),
 status text not null default 'ativo' check (status in ('ativo','suspenso','cancelado','concluido')),
 criado_em timestamptz not null default now()
);
create table if not exists public.vinculos_producao (
 produto_id uuid primary key references public.produtos(id),
 item_programacao_id uuid not null references public.itens_programacao(id),
 vinculado_em timestamptz not null default now(),
 vinculado_por uuid references auth.users(id)
);
create table if not exists public.decisoes_pendencias (
 id uuid primary key default gen_random_uuid(),
 item_programacao_id uuid not null references public.itens_programacao(id),
 data_referencia date not null,
 saldo_pendente integer not null check (saldo_pendente >= 0),
 decisao text not null check (decisao in ('manter_pendente','reprogramar','cancelar_saldo')),
 nova_data date,
 observacao text,
 decidido_por uuid not null references auth.users(id),
 decidido_em timestamptz not null default now(),
 check (decisao <> 'reprogramar' or nova_data is not null)
);
create index if not exists idx_programacao_data on public.programacoes_producao(data_producao);
create index if not exists idx_itens_programacao on public.itens_programacao(programacao_id);
create index if not exists idx_vinculos_item on public.vinculos_producao(item_programacao_id);
create index if not exists idx_decisoes_item on public.decisoes_pendencias(item_programacao_id,data_referencia);
alter table public.programacoes_producao enable row level security;
alter table public.itens_programacao enable row level security;
alter table public.vinculos_producao enable row level security;
alter table public.decisoes_pendencias enable row level security;
-- Nesta fase, apenas leitura por usuários ativos. Escritas serão liberadas
-- após definição e teste de papéis e RPC transacional para bipagem.
create policy "programacoes_leitura_ativos" on public.programacoes_producao for select to authenticated using (exists(select 1 from public.perfis p where p.usuario_id=auth.uid() and p.ativo=true));
create policy "itens_leitura_ativos" on public.itens_programacao for select to authenticated using (exists(select 1 from public.perfis p where p.usuario_id=auth.uid() and p.ativo=true));
create policy "vinculos_leitura_ativos" on public.vinculos_producao for select to authenticated using (exists(select 1 from public.perfis p where p.usuario_id=auth.uid() and p.ativo=true));
create policy "decisoes_leitura_ativos" on public.decisoes_pendencias for select to authenticated using (exists(select 1 from public.perfis p where p.usuario_id=auth.uid() and p.ativo=true));
