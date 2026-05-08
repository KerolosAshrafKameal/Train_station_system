import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://soacefgbythdldbyngzl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_EGCVFemMN0nmGGJ09vjXKA_a5N-wn8n';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const classMap = {
  talgo: [0, 1], // 1st, 2nd
  spanish: [0, 1, 2], // 1st, 2nd, 3rd
  vip: [0, 1, 2],
  russian: [0, 1, 2],
  sleeper: [0, 1], // single, double
};

(async () => {
  const { data: trains } = await supabase.from('trains').select('*');
  
  for (const train of trains) {
    const { data: existingCarriages } = await supabase.from('carriages').select('*').eq('train_id', train.id);
    if (!existingCarriages || existingCarriages.length === 0) {
      console.log(`Seeding carriages for train ${train.id} (${train.name})`);
      const classes = classMap[train.type] || [0, 1, 2];
      
      let carriageCounter = 1;
      for (const clsIdx of classes) {
        // Create 1 carriage per class
        const { data: carriage, error: cErr } = await supabase.from('carriages').insert({
          train_id: train.id,
          number: carriageCounter++,
          class_index: clsIdx,
          capacity: 10, // 10 seats for simple testing
          cabin_type: train.type === 'sleeper' ? (clsIdx === 0 ? 'single' : 'double') : 'seat'
        }).select().single();
        
        if (cErr) {
          console.error('Error creating carriage:', cErr);
          continue;
        }

        // Create 10 seats
        const seats = [];
        for (let s = 1; s <= 10; s++) {
          seats.push({
            carriage_id: carriage.id,
            seat_number: s,
            is_occupied: false
          });
        }
        await supabase.from('seats').insert(seats);
      }
    }
  }
  console.log('Seeding complete.');
})();
