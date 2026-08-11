import { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, Clock, AlertTriangle, Fingerprint } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeAttendanceHistory, getEmployeeMonthStats, subscribeToAttendance } from '../../services/attendanceService';
import { unsubscribe } from '../../services/realtimeService';
import type { Attendance, EmployeeAttendanceStats } from '../../types';

export default function MyAttendance() {
  const { profile } = useAuth();
  const [history, setHistory] = useState<Attendance[]>([]);
  const [stats, setStats] = useState<EmployeeAttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    const [h, s] = await Promise.all([
      getEmployeeAttendanceHistory(profile.id),
      getEmployeeMonthStats(profile.id),
    ]);
    setHistory(h);
    setStats(s);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
    if (!profile) return;

    // Live: pag may bagong check-in/check-out (o na-edit ng admin), auto-refresh.
    const channel = subscribeToAttendance(() => load(), profile.id);
    return () => unsubscribe(channel);
  }, [profile, load]);

  return (
    <DashboardLayout
      title={`Welcome back, ${profile?.full_name?.split(' ')[0] ?? ''}!`}
      subtitle={`${profile?.full_name} — ${profile?.role_title ?? 'Employee'} (ID: ${profile?.employee_code})`}
    >
      <div className="mb-4 flex justify-end">
        <Badge tone="green">ACTIVE EMPLOYEE STATUS</Badge>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Days Present (This Month)" value={stats?.daysPresent ?? 0} icon={<CalendarCheck size={18} />} badge="ON TRACK" badgeTone="green" />
            <StatCard label="Late Entrance Entries" value={stats?.lateEntries ?? 0} icon={<Clock size={18} />} badge="EXCUSED" badgeTone="yellow" />
            <StatCard label="Days Absent / Unresolved" value={stats?.daysAbsent ?? 0} icon={<AlertTriangle size={18} />} badge={stats?.daysAbsent === 0 ? 'PERFECT MONTH' : 'REVIEW'} badgeTone={stats?.daysAbsent === 0 ? 'green' : 'red'} />
            <StatCard
              label="Biometrics Registered"
              value={profile?.biometric_status === 'registered' ? 'Registered' : 'Not Registered'}
              icon={<Fingerprint size={18} />}
              badge={profile?.biometric_status === 'registered' ? 'REGISTERED' : 'ACTION NEEDED'}
              badgeTone={profile?.biometric_status === 'registered' ? 'teal' : 'red'}
            />
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-4 text-sm font-bold text-gray-900">Personal Attendance History Logs</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Check-In Time</th>
                    <th className="py-2 pr-4">Check-Out Time</th>
                    <th className="py-2 pr-4">Shift Status</th>
                    <th className="py-2 pr-4">Verification Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {history.length === 0 && (
                    <tr><td colSpan={5} className="py-6 text-center text-gray-400">No attendance records yet.</td></tr>
                  )}
                  {history.map((a) => (
                    <tr key={a.id}>
                      <td className="py-3 pr-4 font-medium text-gray-800">
                        {new Date(a.date).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}
                      </td>
                      <td className="py-3 pr-4 text-gray-600">
                        {a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="py-3 pr-4 text-gray-600">
                        {a.check_out_time ? new Date(a.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge tone={a.status === 'on_time' ? 'green' : a.status === 'late_entry' ? 'yellow' : 'red'}>
                          {a.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-gray-600 capitalize">{a.verification_method ?? '—'} Scanned</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}