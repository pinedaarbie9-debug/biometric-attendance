import { useEffect, useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Badge from '../components/common/Badge';
import { supabase } from '../lib/supabase';
import type { Attendance } from '../types';

export default function AttendanceLog() {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('attendance')
        .select('*, student:students(*, department:departments(*))')
        .eq('date', date)
        .order('check_in_time', { ascending: false });
      setRecords((data as Attendance[]) ?? []);
      setLoading(false);
    })();
  }, [date]);

  return (
    <DashboardLayout title="Attendance Log" subtitle="Daily check-in and check-out records">
      <div className="mb-4">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Check In</th>
                <th className="px-4 py-3">Check Out</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>}
              {!loading && records.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No records for this date.</td></tr>}
              {records.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-gray-800">{r.student?.full_name}</td>
                  <td className="px-4 py-3 text-gray-600">{r.student?.department?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="px-4 py-3"><Badge tone={r.status === 'on_time' ? 'green' : r.status === 'late_entry' ? 'yellow' : 'red'}>{r.status.replace('_', ' ').toUpperCase()}</Badge></td>
                  <td className="px-4 py-3 capitalize text-gray-500">{r.verification_method ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}