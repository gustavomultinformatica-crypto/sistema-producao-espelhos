import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://ixvubomxbumidgzwlzft.supabase.co'
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_PlaCnL2KVdum3LfvY5Whqg_I4TZuiwz'

export const supabaseConfigured = Boolean(url && publishableKey)
export const supabase = supabaseConfigured ? createClient(url, publishableKey) : null
