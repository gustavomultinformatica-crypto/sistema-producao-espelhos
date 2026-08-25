import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://ixvubomxbumidgzwlzft.supabase.co'
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_PlaCnL2KVdum3LfvY5Whqg_I4TZuiwz'

export const supabaseConfigured = Boolean(url && publishableKey)

const client = supabaseConfigured ? createClient(url, publishableKey) : null

// Mantém compatibilidade com o nome usado no painel de Modelos.
// No banco, a tabela oficial criada pelo administrador é `modelos_espelhos`.
export const supabase = client
  ? new Proxy(client, {
      get(target, prop) {
        if (prop === 'from') {
          return (table) => target.from(table === 'modelos' ? 'modelos_espelhos' : table)
        }
        return target[prop]
      },
    })
  : null
