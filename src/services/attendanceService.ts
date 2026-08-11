import { supabase } from '../lib/supabase';
import type { Attendance, DashboardStats, EmployeeAttendanceStats } from '../types';
import { subscribeToTable } from './realtimeService';

export async function getTodayAttendanceStream(limit = 10) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('attendance')
    .select('*, employee:employees(*, department:departments(*))')
    .eq('date', today)
    .order('check_in_time', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Attendance[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const today = new Date().toISOString().slice(0, 10);

  const [{ count: totalEmployees }, { data: todaysAttendance, error: attErr }] = await Promise.all([
    supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('attendance').select('status').eq('date', today),
  ]);
  if (attErr) throw attErr;

  const presentToday = (todaysAttendance ?? []).length;
  const lateArrivals = (todaysAttendance ?? []).filter((a) => a.status === 'late_entry').length;
  const total = totalEmployees ?? 0;
  const absentToday = Math.max(total - presentToday, 0);

  return {
    totalEmployees: total,
    presentToday,
    presentRate: total > 0 ? Math.round((presentToday / total) * 1000) / 10 : 0,
    lateArrivals,
    absentToday,
  };
}

export async function getEmployeeAttendanceHistory(employeeId: string, limit = 30) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Attendance[];
}

export async function getEmployeeMonthStats(employeeId: string): Promise<EmployeeAttendanceStats> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('attendance')
    .select('status')
    .eq('employee_id', employeeId)
    .gte('date', monthStart);
  if (error) throw error;

  const rows = data ?? [];
  return {
    daysPresent: rows.length,
    lateEntries: rows.filter((r) => r.status === 'late_entry').length,
    daysAbsent: rows.filter((r) => r.status === 'absent').length,
  };
}

/**
 * Admin-only manual override (e.g. admin correcting an employee's record).
 * NOTE: for actual kiosk/face/fingerprint check-in, use `simulateCheckIn()`
 * from deviceService.ts instead — this direct insert will fail RLS for
 * non-admin employees (see attendance_admin_write policy in schema.sql).
 */
export async function recordAttendance(params: {
  employeeId: string;
  type: 'check_in' | 'check_out';
  verificationMethod: 'fingerprint' | 'facial_id';
  deviceId?: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', params.employeeId)
    .eq('date', today)
    .maybeSingle();

  if (!existing) {
    const shiftStartHour = 8;
    const isLate = new Date().getHours() > shiftStartHour || (new Date().getHours() === shiftStartHour && new Date().getMinutes() > 15);

    const { data, error } = await supabase
      .from('attendance')
      .insert({
        employee_id: params.employeeId,
        date: today,
        check_in_time: now,
        status: isLate ? 'late_entry' : 'on_time',
        verification_method: params.verificationMethod,
        device_id: params.deviceId ?? 'web-terminal',
      })
      .select()
      .single();
    if (error) throw error;

    await supabase.from('employees').update({ last_verified_at: now }).eq('id', params.employeeId);
    return data as Attendance;
  }

  const { data, error } = await supabase
    .from('attendance')
    .update({ check_out_time: now })
    .eq('id', existing.id)
    .select()
    .single();
  if (error) throw error;
  return data as Attendance;
}

export async function getMyAttendance(employeeId: string) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .order('date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAllAttendanceToday() {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('attendance')
    .select('*, employees(full_name, department_id)')
    .eq('date', today)
    .order('check_in_time', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Live subscription — gamitin sa AdminDashboard.tsx (walang filter, lahat) o
 * sa MyAttendance.tsx (may filter na `employee_id=eq.<id>`).
 */
export function subscribeToAttendance(onChange: (payload: any) => void, employeeId?: string) {
  const filter = employeeId ? `employee_id=eq.${employeeId}` : undefined;
  return subscribeToTable('attendance', filter, onChange, 'attendance-live');
}