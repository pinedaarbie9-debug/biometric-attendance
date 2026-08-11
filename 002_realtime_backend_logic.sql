-- ============================================================
-- BIOATTEND - Realtime + Backend Processing Logic
-- Run this AFTER schema.sql in the Supabase SQL editor.
-- Idempotent: safe to re-run.
-- ============================================================

-- ---------- 1. Process a raw attendance log into the daily attendance row ----------
create or replace function fn_process_raw_attendance_log()
returns trigger as $$
declare
  v_employee employees%rowtype;
  v_schedule schedules%rowtype;
  v_date date := (new.captured_at at time zone 'utc')::date;
  v_status attendance_status;
begin
  select * into v_employee from employees where employee_code = new.badge_number limit 1;

  if v_employee.id is null then
    insert into audit_logs (event_type, description)
    values ('UNKNOWN_BADGE_SCAN', 'No employee found for badge ' || new.badge_number);
    return new;
  end if;

  select * into v_schedule
  from schedules
  where employee_id = v_employee.id
    and day_of_week = extract(dow from new.captured_at)::int
  limit 1;

  if new.event_type = 'check_in' then
    if v_schedule.shift_start is not null
       and (new.captured_at at time zone 'utc')::time > v_schedule.shift_start + interval '10 minutes' then
      v_status := 'late_entry';
    else
      v_status := 'on_time';
    end if;

    insert into attendance (employee_id, date, check_in_time, status, verification_method, device_id)
    values (v_employee.id, v_date, new.captured_at, v_status, new.verification_method, new.device_id)
    on conflict (employee_id, date)
    do update set check_in_time = excluded.check_in_time,
                  status = excluded.status,
                  verification_method = excluded.verification_method,
                  device_id = excluded.device_id;

  elsif new.event_type = 'check_out' then
    insert into attendance (employee_id, date, check_out_time, status, verification_method, device_id)
    values (v_employee.id, v_date, new.captured_at, 'on_time', new.verification_method, new.device_id)
    on conflict (employee_id, date)
    do update set check_out_time = excluded.check_out_time,
                  device_id = excluded.device_id;
  end if;

  update employees set last_verified_at = new.captured_at where id = v_employee.id;

  new.processed := true;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_process_raw_attendance on raw_attendance_logs;
create trigger trg_process_raw_attendance
  before insert on raw_attendance_logs
  for each row execute function fn_process_raw_attendance_log();


-- ---------- 2. Notify on late / absent attendance events ----------
create or replace function fn_notify_attendance_event()
returns trigger as $$
begin
  if new.status in ('late_entry', 'absent')
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then

    insert into notifications (employee_id, title, message)
    values (
      new.employee_id,
      case when new.status = 'late_entry' then 'Late Arrival Recorded' else 'Absence Recorded' end,
      'Your attendance for ' || new.date || ' was marked as ' || new.status || '.'
    );

    insert into notifications (employee_id, title, message)
    select id, 'Attendance Alert',
           (select full_name from employees where id = new.employee_id) || ' was marked ' || new.status || ' on ' || new.date
    from employees where role = 'admin';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_attendance on attendance;
create trigger trg_notify_attendance
  after insert or update on attendance
  for each row execute function fn_notify_attendance_event();


-- ---------- 3. Notify employee when leave request status changes ----------
create or replace function fn_notify_leave_status_change()
returns trigger as $$
begin
  if old.status is distinct from new.status and new.status in ('approved', 'rejected') then
    insert into notifications (employee_id, title, message)
    values (
      new.employee_id,
      'Leave Request ' || initcap(new.status::text),
      'Your ' || new.leave_type || ' leave (' || new.start_date || ' to ' || new.end_date || ') was ' || new.status || '.'
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_leave on leave_requests;
create trigger trg_notify_leave
  after update on leave_requests
  for each row execute function fn_notify_leave_status_change();


-- ---------- 4. Simulate a biometric scan (use this until a real device exists) ----------
create or replace function simulate_check_in(p_employee_code text, p_event_type text default 'check_in')
returns raw_attendance_logs as $$
declare
  v_row raw_attendance_logs;
begin
  insert into raw_attendance_logs (device_id, badge_number, event_type, verification_method, captured_at)
  values ('SIMULATED-TERMINAL', p_employee_code, p_event_type, 'fingerprint', now())
  returning * into v_row;

  return v_row;
end;
$$ language plpgsql security definer;

grant execute on function simulate_check_in(text, text) to authenticated;


-- ---------- 5. Mark unresolved employees as absent (run manually or via pg_cron) ----------
create or replace function fn_mark_absentees(p_date date default current_date)
returns void as $$
begin
  insert into attendance (employee_id, date, status)
  select e.id, p_date, 'absent'
  from employees e
  where e.is_active = true
    and not exists (
      select 1 from attendance a where a.employee_id = e.id and a.date = p_date
    )
  on conflict (employee_id, date) do nothing;
end;
$$ language plpgsql security definer;


-- ---------- 6. Enable Realtime on the tables the UI needs to watch live ----------
do $$
begin
  alter publication supabase_realtime add table attendance;
exception when duplicate_object then null; end $$;

do $$
begin
  alter publication supabase_realtime add table raw_attendance_logs;
exception when duplicate_object then null; end $$;

do $$
begin
  alter publication supabase_realtime add table notifications;
exception when duplicate_object then null; end $$;

do $$
begin
  alter publication supabase_realtime add table leave_requests;
exception when duplicate_object then null; end $$;
