# Sistema de Produção de Espelhos

Sistema web para acompanhar a produção da fábrica por bipagem de código de barras.

## Processos monitorados

1. Corte e destaque
2. Cola e EVA
3. Colagem do couro
4. Limpeza
5. Finalização e alça
6. Embalagem

## Tecnologias

- React + Vite
- Supabase para banco de dados e autenticação

## Executar localmente

1. Instale as dependências com `npm install`.
2. Copie `.env.example` para `.env`.
3. Preencha as variáveis do Supabase.
4. Execute o SQL de `supabase/schema.sql` no Supabase.
5. Rode `npm run dev`.

## Próximas etapas

- ativar login multiusuário;
- conectar a bipagem ao banco real;
- cadastrar produtos e códigos de barras;
- criar relatórios diário, semanal e mensal;
- publicar o sistema em hospedagem online.
