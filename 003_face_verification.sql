-- ============================================================
-- BIOATTEND - Face Verification support
-- Run this AFTER 002_realtime_backend_logic.sql
-- ============================================================

-- Store the enrolled face descriptor (128-length float array from face-api.js)
alter table employees
  add column if not exists face_descriptor jsonb;

-- Employees can update their own face_descriptor during enrollment
drop policy if exists "employees_self_face_enroll" on employees;
create policy "employees_self_face_enroll" on employees for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Replace simulate_check_in so it accepts the verification method used
-- (fingerprint OR facial_id) instead of hardcoding 'fingerprint'.
create or replace function simulate_check_in(
  p_employee_code text,
  p_event_type text default 'check_in',
  p_verification_method verification_method default 'fingerprint'
)
returns raw_attendance_logs as $$
declare
  v_row raw_attendance_logs;
begin
  insert into raw_attendance_logs (device_id, badge_number, event_type, verification_method, captured_at)
  values ('SIMULATED-TERMINAL', p_employee_code, p_event_type, p_verification_method, now())
  returning * into v_row;

  return v_row;
end;
$$ language plpgsql security definer;

grant execute on function simulate_check_in(text, text, verification_method) to authenticated;
