import { supabase } from '../lib/supabase';

/**
 * Builds a CSV export of attendance records within a date range.
 * Returns a downloadable Blob URL.
 */
export async function exportAttendanceCsv(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('attendance')
    .select('date, check_in_time, check_out_time, status, student:students(student_code, full_name, department:departments(name))')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as any[];
  const header = ['Student ID', 'Name', 'Department', 'Date', 'Check In', 'Check Out', 'Status'];
  const csvRows = rows.map((r) => [
    r.student?.student_code ?? '',
    r.student?.full_name ?? '',
    r.student?.department?.name ?? '',
    r.date,
    r.check_in_time ?? '',
    r.check_out_time ?? '',
    r.status,
  ]);

  const csv = [header, ...csvRows].map((row) => row.map((v) => `"${v}"`).join(',')).join('\n');
  return new Blob([csv], { type: 'text/csv' });
}