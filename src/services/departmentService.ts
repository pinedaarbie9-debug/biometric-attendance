import { supabase } from '../lib/supabase';
import type { Department, DepartmentVerificationRate } from '../types';

export async function getDepartments() {
  const { data, error } = await supabase.from('departments').select('*').order('name');
  if (error) throw error;
  return data as Department[];
}

export async function createDepartment(name: string, description?: string) {
  const { data, error } = await supabase
    .from('departments')
    .insert({ name, description })
    .select()
    .single();
  if (error) throw error;
  return data as Department;
}

export async function updateDepartment(id: string, patch: Partial<Department>) {
  const { data, error } = await supabase
    .from('departments')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Department;
}

export async function deleteDepartment(id: string) {
  const { error } = await supabase.from('departments').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Fetch students grouped by department so each department card
 * can show its member count and list.
 */
export async function getStudentsByDepartment(): Promise<Record<string, { id: string; full_name: string }[]>> {
  const { data, error } = await supabase
    .from('students')
    .select('id, full_name, department_id')
    .order('full_name');
  if (error) throw error;

  const grouped: Record<string, { id: string; full_name: string }[]> = {};
  for (const s of data ?? []) {
    if (!s.department_id) continue;
    if (!grouped[s.department_id]) grouped[s.department_id] = [];
    grouped[s.department_id].push({ id: s.id, full_name: s.full_name });
  }
  return grouped;
}

/**
 * Today's verification rate per department: verified (checked-in) students
 * over total active students in that department.
 */
export async function getDepartmentVerificationRates(): Promise<DepartmentVerificationRate[]> {
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: departments, error: deptErr }, { data: employees, error: empErr }, { data: attendance, error: attErr }] =
    await Promise.all([
      supabase.from('departments').select('*'),
      supabase.from('students').select('id, department_id').eq('is_active', true),
      supabase.from('attendance').select('student_id').eq('date', today),
    ]);

  if (deptErr) throw deptErr;
  if (empErr) throw empErr;
  if (attErr) throw attErr;

  const checkedInIds = new Set((attendance ?? []).map((a) => a.student_id));

  return (departments ?? []).map((dept) => {
    const deptEmployees = (employees ?? []).filter((e) => e.department_id === dept.id);
    const verified = deptEmployees.filter((e) => checkedInIds.has(e.id)).length;
    const total = deptEmployees.length;
    return {
      departmentId: dept.id,
      departmentName: dept.name,
      verified,
      total,
      rate: total > 0 ? Math.round((verified / total) * 100) : 0,
    };
  });
}