# Biometric Smart Attendance System

React + TypeScript + Supabase na employee attendance system na may biometric
device integration, role-based access (admin/employee), department/schedule/
leave management, at reporting.

## Tech Stack
- React 18 + TypeScript + Vite
- Supabase (Auth, Postgres, Realtime)
- Tailwind CSS
- React Router v6
- Recharts (para sa reports/dashboard charts)

## Project Structure

```
src/
  types/          -> lahat ng TypeScript interfaces (Employee, Department, Schedule, Leave, Attendance, atbp.)
  lib/             -> Supabase client setup
  context/         -> AuthContext (login, session, role)
  services/        -> Supabase query functions per module:
                       - employeeService
                       - departmentService
                       - scheduleService
                       - leaveService
                       - notificationService
                       - reportService
                       - deviceService (biometric device webhook/ingest)
  routes/          -> ProtectedRoute, RoleRoute, AppRoutes
  pages/           -> AdminDashboard, EmployeeManagement, DepartmentManagement,
                       ScheduleManagement, LeaveManagement, atbp.
  components/      -> reusable UI (common/, layout/)
  hooks/           -> custom hooks
  utils/           -> helper functions (date formatting, validation, atbp.)
```

## Biometric Device Integration

Ang device ay may sariling proprietary SDK (TBD/wala pang napili). Sa ngayon,
ang `deviceService` ay dinisenyo bilang isang **generic ingestion layer**:

1. Ang biometric device (fingerprint/face scanner) ay magpapadala ng logs
   (employee ID/badge number + timestamp + event type) papunta sa isang
   endpoint o direkta sa Supabase table (`raw_attendance_logs`) via isang
   maliit na bridge/agent na tatakbo malapit sa device (kung LAN-based ang
   device, hal. ZKTeco push protocol).
2. Ang `deviceService.processRawLog()` ang bahala mag-match ng badge number
   papunta sa employee record, at gagawa ng `attendance` entry (time-in/time-out).
3. Kapag napili na ang specific device brand/SDK, dito lang natin ilalagay
   ang adapter/parser logic — hindi na kailangang baguhin ang ibang parte
   ng system.

## Setup

1. Create a project at https://supabase.com
2. In the SQL editor, run `supabase/schema.sql` (creates tables, RLS
   policies, and an auto-profile trigger).
3. In Supabase → Authentication → Providers, make sure Email sign-up
   is enabled.
4. Copy your Project URL and anon key from Settings → API.

```bash
npm install
cp .env.example .env   # paste your Supabase URL + anon key
npm run dev
```

5. Open the app, then in Supabase → Authentication → Users, manually
   promote your first account: in the SQL editor run
   `update employees set role = 'admin' where email = 'you@company.com';`
   so you can log in as an admin and start adding real employees from
   the Employee Directory screen.

## Mobile

The layout is fully responsive (Tailwind breakpoints): the sidebar
becomes a slide-in drawer on phones, stat cards stack to 1–2 columns,
and tables scroll horizontally on small screens. No extra setup is
needed — the same build works on desktop browsers and mobile browsers.
To wrap it as an installable app later, this can be dropped into
Capacitor or Expo with minimal changes since it's plain React.

## Status

- [x] Project scaffold (config files, folder structure)
- [x] Database schema (SQL) — `supabase/schema.sql`
- [x] Types
- [x] Supabase client + AuthContext (role-based: admin/employee)
- [x] Services layer (employee, department, attendance, leave,
      notification, report, device, audit)
- [x] Routing (protected/role routes, Access Denied page)
- [x] Login (BIOATTEND design)
- [x] AdminDashboard (Mission Control Overview)
- [x] Employee Directory (add/view, biometric status)
- [x] Department Management
- [x] Attendance Log (admin, by date)
- [x] Leave Requests (submit + approve/reject)
- [x] Reports & CSV export
- [x] Audit Logs
- [x] Employee self-service (My Attendance, Credential Settings)
- [x] Biometric Terminal (kiosk check-in/out simulation, ready to be
      swapped for a real device adapter — see `deviceService.ts`)
- [x] Responsive mobile + desktop layout
- [ ] Real biometric device SDK adapter (once brand is chosen)
- [ ] Push/email notifications delivery (schema + service ready,
      no delivery channel wired up yet)
