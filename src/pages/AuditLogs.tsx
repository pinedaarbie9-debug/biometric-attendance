import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';
import { getAuditLogs } from '../services/auditService';
import type { AuditLog } from '../types';

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLogs(await getAuditLogs());
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardLayout title="Audit Logs" subtitle="Security events and access attempts">
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>}
              {!loading && logs.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No security events logged.</td></tr>}
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-red-600">{l.event_type}</td>
                  <td className="px-4 py-3 text-gray-600">{l.description ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{l.ip_address ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(l.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}