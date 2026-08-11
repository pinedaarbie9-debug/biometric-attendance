import { supabase } from '../lib/supabase';

/**
 * Generic ingestion layer for biometric hardware.
 *
 * No specific device SDK has been chosen yet, so this service accepts a
 * normalized payload shape. Once a device brand is selected (ZKTeco,
 * Hikvision, etc.), add a small adapter that translates its native push
 * protocol into this same shape and calls `ingestRawLog`.
 */
export interface DeviceLogPayload {
  deviceId: string;
  badgeNumber: string;
  eventType: 'check_in' | 'check_out';
  verificationMethod: 'fingerprint' | 'facial_id';
  capturedAt?: string;
  rawPayload?: Record<string, unknown>;
}

/**
 * ⚠️ SERVER-SIDE ONLY. `raw_attendance_logs` has RLS enabled with NO insert
 * policy — a normal authenticated browser client (even an admin) will get
 * blocked here. This function only works when called with the Supabase
 * SERVICE ROLE key (e.g. inside a Supabase Edge Function that receives the
 * real device's webhook/push). Do NOT call this from React components.
 *
 * For any check-in/out triggered from the web app itself (kiosk, face scan,
 * fingerprint simulation), use `simulateCheckIn()` below instead — it goes
 * through the `simulate_check_in` RPC, which is security-definer and safely
 * bypasses this same RLS gap for authenticated employees.
 */
export async function ingestRawLog(payload: DeviceLogPayload) {
  const { error } = await supabase.from('raw_attendance_logs').insert({
    device_id: payload.deviceId,
    badge_number: payload.badgeNumber,
    event_type: payload.eventType,
    verification_method: payload.verificationMethod,
    captured_at: payload.capturedAt ?? new Date().toISOString(),
    raw_payload: payload.rawPayload ?? null,
  });
  if (error) throw error;
}

/**
 * @deprecated Superseded by the `fn_process_raw_attendance_log()` DB trigger
 * (see supabase/002_realtime_backend_logic.sql), which runs automatically
 * BEFORE INSERT on `raw_attendance_logs` and additionally applies proper
 * late/on-time detection using the `schedules` table. Calling this manually
 * on top of the trigger will produce conflicting/incorrect attendance
 * status. Kept only for reference — do not call this from the app.
 */
export async function processRawLog(logId: string) {
  const { data: log, error: logErr } = await supabase
    .from('raw_attendance_logs')
    .select('*')
    .eq('id', logId)
    .single();
  if (logErr) throw logErr;

  const { data: employee, error: empErr } = await supabase
    .from('employees')
    .select('id')
    .eq('employee_code', log.badge_number)
    .single();
  if (empErr) throw empErr;

  const date = log.captured_at.slice(0, 10);
  const { data: existing } = await supabase
    .from('attendance')
    .select('id')
    .eq('employee_id', employee.id)
    .eq('date', date)
    .maybeSingle();

  if (log.event_type === 'check_in' && !existing) {
    await supabase.from('attendance').insert({
      employee_id: employee.id,
      date,
      check_in_time: log.captured_at,
      status: 'on_time',
      verification_method: log.verification_method,
      device_id: log.device_id,
    });
  } else if (log.event_type === 'check_out' && existing) {
    await supabase
      .from('attendance')
      .update({ check_out_time: log.captured_at })
      .eq('id', existing.id);
  }

  await supabase.from('raw_attendance_logs').update({ processed: true }).eq('id', logId);
}

/**
 * ✅ USE THIS from the web app (BiometricTerminal.tsx, Face ID scan, etc.)
 * Calls the `simulate_check_in` RPC — security-definer, so it works for any
 * authenticated employee without hitting the raw_attendance_logs RLS gap.
 * The DB trigger takes it from here (schedule-aware status + notifications).
 */
export async function simulateCheckIn(
  employeeCode: string,
  eventType: 'check_in' | 'check_out' = 'check_in',
  verificationMethod: 'fingerprint' | 'facial_id' = 'fingerprint'
) {
  const { data, error } = await supabase.rpc('simulate_check_in', {
    p_employee_code: employeeCode,
    p_event_type: eventType,
    p_verification_method: verificationMethod,
  });

  if (error) throw error;
  return data;
}