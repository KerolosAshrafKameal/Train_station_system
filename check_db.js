import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://soacefgbythdldbyngzl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_EGCVFemMN0nmGGJ09vjXKA_a5N-wn8n';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
(async () => {
  const { data: tData } = await supabase.from('trains').select('*').eq('id', 1005);
  console.log('Train:', tData);
  
  const { data: allCarriages } = await supabase.from('carriages').select('*').limit(5);
  console.log('Sample Carriages in DB:', allCarriages);
})();
