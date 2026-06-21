import { createBrowserClient } from '@supabase/ssr'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/env'

export function createClient() {
  const url = getSupabaseUrl()
  const key = getSupabasePublishableKey()
  if (!url || !key) {
    throw new Error('Supabase env missing')
  }
  return createBrowserClient(url, key)
}
