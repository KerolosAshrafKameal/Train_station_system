import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://soacefgbythdldbyngzl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_EGCVFemMN0nmGGJ09vjXKA_a5N-wn8n';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
