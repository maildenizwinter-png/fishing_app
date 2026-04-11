import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://iawhknrsvruweoxjdoss.supabase.co"
const supabaseKey = "sb_publishable_uWplgqZCsvs4noV1DobsSg_2azOEsb1"

export const supabase = createClient(supabaseUrl, supabaseKey)