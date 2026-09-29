# BIOATTEND — Realtime + Backend Logic Blueprint

Base sa `schema.sql` mo at sa folder structure na nakita sa VS Code (services/, pages/, routes/).
Wala pang physical biometric device, kaya may **Simulate Check-In** flow muna para testable end-to-end.

---

## 1. Bakit "0" / walang laman lahat ang dashboard mo ngayon

- Walang data pa sa `attendance` table kasi walang nagpo-populate dito. `raw_attendance_logs` ang
  dinideklarang entry point ng device, pero walang trigger/function na nagpoproseso nito papunta
  sa `attendance`.
- Walang realtime subscription — kahit magkaroon ng data, hindi mag-uupdate live yung
  `AdminDashboard.tsx` / `MyAttendance.tsx` maliban kung nag-`supabase.channel().on('postgres_changes', ...)`.
- Notifications table ay may row lang kapag may explicit insert — wala pang trigger na
  auto-generate ng notification pag may late/absent/leave update.

## 2. Buong Data Flow (end-to-end)

```
[Device / Simulate Button]
        │  insert
        ▼
raw_attendance_logs (processed = false)
        │  AFTER INSERT trigger
        ▼
fn_process_raw_attendance_log()
        │  computes status vs schedules table
        ▼
attendance (upsert: student_id + date)
        │  AFTER INSERT/UPDATE trigger
        ▼
fn_notify_attendance_event()
        │  insert
        ▼
notifications
        │
        ▼
Supabase Realtime (postgres_changes)
        │
        ▼
React hooks (useRealtimeAttendance, useRealtimeNotifications)
        │
        ▼
AdminDashboard / MyAttendance / notif bell — LIVE update, walang refresh
```

## 3. Backend logic na idadagdag sa Supabase (SQL)

File: `supabase/002_realtime_backend_logic.sql` (kasama dito)

1. **`fn_process_raw_attendance_log()`** — trigger function na tumatakbo pag may bagong row sa
   `raw_attendance_logs`. Hahanapin ang schedule ngstudent(base sa `badge_number` → `student_code`),
   ikukumpara ang `captured_at` sa `shift_start` para malaman kung `on_time` o `late_entry`,
   tapos mag-`upsert` sa `attendance` (check_in_time kung `check_in`, check_out_time kung `check_out`).
   Pagkatapos, i-mamarkahan yung raw log na `processed = true`.

2. **`fn_notify_attendance_event()`** — trigger sa `attendance` (AFTER INSERT/UPDATE). Kapag
   `status = 'late_entry'` o `'absent'`, gumagawa ng row sa `notifications` para sastudentAT
   sa lahat ng admin.

3. **`fn_notify_leave_status_change()`** — trigger sa `leave_requests` (AFTER UPDATE OF status).
   Pag na-approve/reject ng admin, auto-notify yung employee.

4. **`simulate_check_in(p_student_code text, p_event_type text)`** — RPC function na
   ginagamit habang wala pang device. Ito ang tatawagin ng "Simulate Biometric Scan" button sa
   `BiometricTerminal.tsx`.

5. **`fn_mark_absentees()`** — function na pwedeng i-schedule (pg_cron o manual trigger via admin
   button) para markahan na `absent` ang mga walang check-in pagsapit ng cutoff time.

6. **Enable Realtime** — `alter publication supabase_realtime add table` para sa `attendance`,
   `raw_attendance_logs`, `notifications`, `leave_requests`.

> I-run mo ito sa Supabase SQL editor pagkatapos ng schema.sql mo (idempotent, safe i-re-run).

## 4. Frontend service layer na idadagdag

| File | Bagong function |
|---|---|
| `services/attendanceService.ts` | `getMyAttendance()`, `getAllAttendanceToday()`, `subscribeToAttendance(cb)` |
| `services/deviceService.ts` | `simulateCheckIn(employeeCode, eventType)` — tumatawag sa RPC |
| `services/notificationService.ts` | `getMyNotifications()`, `markAsRead(id)`, `subscribeToNotifications(cb)` |
| `services/realtimeService.ts` (bago) | generic `subscribeToTable(table, filter, callback)` helper, ginagamit ng lahat |
| `hooks/useRealtimeAttendance.ts` (bago) | React hook — auto refetch + realtime merge, gamitin sa `AdminDashboard.tsx` at `MyAttendance.tsx` |

Naka-attach ang draft code ng lahat ng ito. **Note:** wala akong nakitang existing content ng
`attendanceService.ts` etc. (screenshots lang ang nakita ko), kaya ang mga ito ay **drop-in
functions** — i-merge mo sa existing file mo instead of overwrite, para hindi masira yung mga
existing exports/types na ginagamit na ng ibang pages.

## 5. Paano gagamitin habang walang device (testing)

1. Sa `BiometricTerminal.tsx`, magdagdag ng button na "Simulate Scan" → tatawag sa
   `deviceService.simulateCheckIn(employeeCode, 'check_in' | 'check_out')`.
2. Automatic na maglalaro yung buong chain (trigger → attendance → notification → realtime push).
3. Sa `AdminDashboard.tsx` at `MyAttendance.tsx`, tatawagin ang `useRealtimeAttendance()` hook
   para live mag-update ang stats/table nang walang refresh.

## 6. Susunod na hakbang

Kung ok ang plano, sabihan mo lang ako at gagawin ko na rin ang updated na version ng:
- `AdminDashboard.tsx` (live counters + recent stream)
- `MyAttendance.tsx` (live personal history)
- `BiometricTerminal.tsx` (simulate button)

Pero para tama ang pag-merge (hindi masira existing UI mo), kailangan ko munang makita yung
**current content** ng mga files na yan — i-zip mo na lang yung `src/` folder at i-upload dito.
