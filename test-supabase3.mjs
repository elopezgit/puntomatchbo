import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://xszsligjaagxnaccifqx.supabase.co', 'sb_publishable_2-C7XK2dR9DIMefJmutC1w_O6OKYXjt');

async function test() {
  const { data, error } = await supabase
    .from('pm_bookings')
    .select(`*, pm_booking_slots(time_slot_id)`)
    .order('created_at', { ascending: false })
    .limit(1);
    
  console.log("Error:", error);
  console.log("Data:", JSON.stringify(data, null, 2));
}

test();
