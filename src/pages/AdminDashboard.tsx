import { useEffect, useState } from 'react';
import { Users, CalendarCheck, Clock, AlertTriangle, Radio } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatCard from '../components/common/StatCard';
import Badge from '../components/common/Badge';
import { getDashboardStats, getTodayAttendanceStream } from '../services/attendanceService';
import { getDepartmentVerificationRates } from '../services/departmentService';
import type { Attendance, DashboardStats, DepartmentVerificationRate } from '../types';

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [stream, setStream] = useState<Attendance[]>([]);
  const [deptRates, setDeptRates] = useState<DepartmentVerificationRate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, st, d] = await Promise.all([
          getDashboardStats(),
          getTodayAttendanceStream(6),
          getDepartmentVerificationRates(),
        ]);
        setStats(s);
        setStream(st);
        setDeptRates(d);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const bestDept = deptRates.slice().sort((a, b) => b.rate - a.rate)[0];

  return (
    <DashboardLayout title="Mission Control Overview" subtitle="System metrics and security logs for today">
      {loading ? (
        <p className="text-sm text-gray-400">Loading dashboard…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Registered Students"
              value={stats?.totalStudents ?? 0}
              icon={<Users size={18} />}
              badge="ACTIVE"
              badgeTone="teal"
            />
            <StatCard
              label="Present Today"
              value={stats?.presentToday ?? 0}
              icon={<CalendarCheck size={18} />}
              badge={`${stats?.presentRate ?? 0}% RATE`}
              badgeTone="green"
            />
            <StatCard
              label="Late Arrivals"
              value={stats?.lateArrivals ?? 0}
              icon={<Clock size={18} />}
              badge="AT RISK"
              badgeTone="yellow"
            />
            <StatCard
              label="Absent Today"
              value={stats?.absentToday ?? 0}
              icon={<AlertTriangle size={18} />}
              badge="UNRESOLVED"
              badgeTone="red"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Recent Attendance Stream</h2>
                  <p className="text-xs text-gray-500">Real-time biometrics stream via Supabase</p>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700">
                  <Radio size={12} /> LIVE STREAM
                </span>
              </div>

              <div className="divide-y divide-gray-50">
                {stream.length === 0 && (
                  <p className="py-6 text-center text-sm text-gray-400">No check-ins recorded yet today.</p>
                )}
                {stream.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                        {a.student?.full_name?.charAt(0) ?? '?'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{a.student?.full_name}</p>
                        <p className="text-xs text-gray-500">{a.student?.department?.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-700">
                        {a.check_in_time && new Date(a.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[11px] text-gray-400 capitalize">{a.verification_method}</p>
                    </div>
                    <Badge tone="green">VERIFIED</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-sm font-bold text-gray-900">Department Verification Rates</h2>
              <p className="mb-4 text-xs text-gray-500">Today's check-in metrics grouped by department</p>

              <div className="space-y-4">
                {deptRates.map((d) => (
                  <div key={d.departmentId}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">{d.departmentName}</span>
                      <span className="font-semibold text-primary-700">
                        {d.rate}% <span className="text-gray-400">({d.verified}/{d.total})</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-primary-600 transition-all"
                        style={{ width: `${d.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
                {deptRates.length === 0 && (
                  <p className="text-sm text-gray-400">No department data yet.</p>
                )}
              </div>

              {bestDept && bestDept.rate === 100 && (
                <div className="mt-5 rounded-lg bg-primary-50 p-3 text-xs text-primary-800">
                  {bestDept.departmentName} achieved full verification today.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}