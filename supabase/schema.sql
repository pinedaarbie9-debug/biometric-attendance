-- ============================================================
-- BIOATTEND - Smart Biometric Attendance Manager
-- Supabase / Postgres schema
-- ============================================================

-- Enable extension for UUID generation
create extension if not exists "uuid-ossp";

-- ---------- ENUMS ----------
create type user_role as enum ('admin', 'employee');
create type biometric_status as enum ('registered', 'not_registered');
create type attendance_status as enum ('on_time', 'late_entry', 'absent', 'excused');
create type leave_status as enum ('pending', 'approved', 'rejected');
create type verification_method as enum ('fingerprint', 'facial_id');

-- ---------- DEPARTMENTS ----------
create table departments (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

-- ---------- EMPLOYEES (extends auth.users) ----------
create table employees (
  id uuid primary key references auth.users(id) on delete cascade,
  employee_code text unique not null, -- e.g. EMP-4019
  full_name text not null,
  email text unique not null,
  role_title text,
  role user_role not null default 'employee',
  department_id uuid references departments(id) on delete set null,
  biometric_status biometric_status not null default 'not_registered',
  primary_verification_method verification_method,
  avatar_url text,
  is_active boolean not null default true,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- SCHEDULES ----------
create table schedules (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employees(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Sunday
  shift_start time not null,
  shift_end time not null,
  created_at timestamptz not null default now()
);

-- ---------- RAW ATTENDANCE LOGS (from biometric device, unprocessed) ----------
create table raw_attendance_logs (
  id uuid primary key default uuid_generate_v4(),
  device_id text not null,
  badge_number text not null,
  event_type text not null, -- 'check_in' | 'check_out'
  verification_method verification_method not null default 'fingerprint',
  raw_payload jsonb,
  captured_at timestamptz not null default now(),
  processed boolean not null default false
);

-- ---------- ATTENDANCE (processed daily records) ----------
create table attendance (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employees(id) on delete cascade,
  date date not null,
  check_in_time timestamptz,
  check_out_time timestamptz,
  status attendance_status not null default 'on_time',
  verification_method verification_method,
  device_id text,
  created_at timestamptz not null default now(),
  unique (employee_id, date)
);

-- ---------- LEAVE REQUESTS ----------
create table leave_requests (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employees(id) on delete cascade,
  leave_type text not null, -- 'sick' | 'vacation' | 'emergency' | 'other'
  start_date date not null,
  end_date date not null,
  reason text,
  status leave_status not null default 'pending',
  reviewed_by uuid references employees(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- NOTIFICATIONS ----------
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employees(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- AUDIT LOGS (security events, access denials) ----------
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid references employees(id) on delete set null,
  event_type text not null, -- e.g. UNAUTHORIZED_DB_POLL
  description text,
  ip_address text,
  created_at timestamptz not null default now()
);

-- ---------- INDEXES ----------
create index idx_attendance_employee_date on attendance(employee_id, date desc);
create index idx_employees_department on employees(department_id);
create index idx_raw_logs_processed on raw_attendance_logs(processed);
create index idx_leave_employee on leave_requests(employee_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table employees enable row level security;
alter table departments enable row level security;
alter table schedules enable row level security;
alter table attendance enable row level security;
alter table leave_requests enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;
alter table raw_attendance_logs enable row level security;

-- Helper: is the current user an admin?
create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from employees where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- Employees: admins see all, employees see only themselves
create policy "employees_select" on employees for select
  using (is_admin() or id = auth.uid());
create policy "employees_admin_write" on employees for insert
  with check (is_admin());
create policy "employees_admin_update" on employees for update
  using (is_admin() or id = auth.uid());

-- Departments: everyone can read, only admin writes
create policy "departments_select" on departments for select using (true);
create policy "departments_admin_write" on departments for all
  using (is_admin()) with check (is_admin());

-- Attendance: admin sees all, employee sees own
create policy "attendance_select" on attendance for select
  using (is_admin() or employee_id = auth.uid());
create policy "attendance_admin_write" on attendance for insert
  with check (is_admin());
create policy "attendance_admin_update" on attendance for update
  using (is_admin());

-- Leave requests: employee can create/view own, admin can view/update all
create policy "leave_select" on leave_requests for select
  using (is_admin() or employee_id = auth.uid());
create policy "leave_insert" on leave_requests for insert
  with check (employee_id = auth.uid());
create policy "leave_admin_update" on leave_requests for update
  using (is_admin());

-- Notifications: employee sees own
create policy "notifications_select" on notifications for select
  using (employee_id = auth.uid());
create policy "notifications_admin_write" on notifications for insert
  with check (is_admin());

-- Audit logs: admin only
create policy "audit_admin_select" on audit_logs for select using (is_admin());
create policy "audit_insert" on audit_logs for insert with check (true);

-- Schedules: admin manages, employee reads own
create policy "schedules_select" on schedules for select
  using (is_admin() or employee_id = auth.uid());
create policy "schedules_admin_write" on schedules for all
  using (is_admin()) with check (is_admin());

-- Raw logs: only service role (device ingestion) touches this; admin can view
create policy "raw_logs_admin_select" on raw_attendance_logs for select using (is_admin());

-- ============================================================
-- Auto-create employee profile row when a new auth user signs up
-- ============================================================
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.employees (id, employee_code, full_name, email, role)
  values (
    new.id,
    'EMP-' || substr(replace(new.id::text, '-', ''), 1, 4),
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    'employee'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
