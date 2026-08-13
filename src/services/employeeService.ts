import { supabase } from '../lib/supabase';
import type { Student } from '../types';

export async function getEmployees() {
  const { data, error } = await supabase
    .from('students')
    .select('*, department:departments(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Student[];
}

export async function getEmployeeById(id: string) {
  const { data, error } = await supabase
    .from('students')
    .select('*, department:departments(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Student;
}

export async function updateEmployee(id: string, patch: Partial<Student>) {
  const { data, error } = await supabase
    .from('students')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Student;
}

export async function deactivateEmployee(id: string) {
  return updateEmployee(id, { is_active: false });
}

export async function reactivateEmployee(id: string) {
  return updateEmployee(id, { is_active: true });
}

/**
 * Creates the auth user + student profile row (profile row itself
 * is auto-created by the `handle_new_user` trigger in schema.sql).
 * Requires the Supabase project's sign-ups to be enabled, or should
 * be called from a server/edge-function using the service role key
 * for production admin-invite flows.
 */
export async function inviteEmployee(params: {
  email: string;
  full_name: string;
  role_title?: string;
  department_id?: string;
  role?: 'admin' | 'student';
  password: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: { data: { full_name: params.full_name } },
  });
  if (error) throw error;

  if (data.user) {
    await updateEmployee(data.user.id, {
      role_title: params.role_title,
      department_id: params.department_id,
      role: params.role ?? 'student',
    });
  }
  return data.user;
}