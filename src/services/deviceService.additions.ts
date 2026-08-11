// DROP-IN ADDITIONS para sa existing services/deviceService.ts mo.
// I-copy mo lang ang mga function na ito papunta sa file mo (huwag i-overwrite ang buo).

import { supabase } from '../lib/supabase';

/**
 * Ginagamit habang wala pang physical biometric device.
 * Tumatawag sa `simulate_check_in` RPC function sa Supabase (see 002_realtime_backend_logic.sql),
 * na siyang gumagawa ng fake scan → nagpo-process papunta sa attendance table.
 */
export async function simulateCheckIn(
  employeeCode: string,
  eventType: 'check_in' | 'check_out' = 'check_in'
) {
  const { data, error } = await supabase.rpc('simulate_check_in', {
    p_employee_code: employeeCode,
    p_event_type: eventType,
  });

  if (error) throw error;
  return data;
}
