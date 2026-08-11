// ============================================================
// BIOATTEND - Shared TypeScript types
// Mirrors the Supabase schema in supabase/schema.sql
// ============================================================

export type UserRole = 'admin' | 'employee';
export type BiometricStatus = 'registered' | 'not_registered';
export type AttendanceStatus = 'on_time' | 'late_entry' | 'absent' | 'excused';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type VerificationMethod = 'fingerprint' | 'facial_id';

export interface Department {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  role_title: string | null;
  role: UserRole;
  department_id: string | null;
  department?: Department | null;
  biometric_status: BiometricStatus;
  primary_verification_method: VerificationMethod | null;
  avatar_url: string | null;
  is_active: boolean;
  last_verified_at: string | null;
  face_descriptor?: number[] | null; // ← BAGO: enrolled Face ID descriptor
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  id: string;
  employee_id: string;
  day_of_week: number; // 0 = Sunday
  shift_start: string; // HH:mm:ss
  shift_end: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  employee?: Employee;
  date: string; // YYYY-MM-DD
  check_in_time: string | null;
  check_out_time: string | null;
  status: AttendanceStatus;
  verification_method: VerificationMethod | null;
  device_id: string | null;
  created_at: string;
}

export interface RawAttendanceLog {
  id: string;
  device_id: string;
  badge_number: string;
  event_type: 'check_in' | 'check_out';
  verification_method: VerificationMethod;
  raw_payload: Record<string, unknown> | null;
  captured_at: string;
  processed: boolean;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  employee?: Employee;
  leave_type: 'sick' | 'vacation' | 'emergency' | 'other';
  start_date: string;
  end_date: string;
  reason: string | null;
  status: LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  employee_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  employee_id: string | null;
  event_type: string;
  description: string | null;
  ip_address: string | null;
  created_at: string;
}

// ---------- Dashboard aggregate types ----------
export interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  presentRate: number;
  lateArrivals: number;
  absentToday: number;
}

export interface DepartmentVerificationRate {
  departmentId: string;
  departmentName: string;
  verified: number;
  total: number;
  rate: number;
}

export interface EmployeeAttendanceStats {
  daysPresent: number;
  lateEntries: number;
  daysAbsent: number;
}
