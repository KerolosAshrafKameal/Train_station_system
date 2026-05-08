import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://soacefgbythdldbyngzl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_EGCVFemMN0nmGGJ09vjXKA_a5N-wn8n';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
(async () => {
  const { data: bData, error } = await supabase.from('pre_bookings').select('*').order('created_at', { ascending: false }).limit(5);
  console.log('Recent Pre-Bookings:', bData);
  if (error) console.error('Error:', error);
})();
