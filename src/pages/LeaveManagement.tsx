import { useCallback, useEffect, useState } from 'react';
import { Check, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';
import Badge from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import { createLeaveRequest, getLeaveRequests, reviewLeaveRequest } from '../services/leaveService';
import { subscribeToTable, unsubscribe } from '../services/realtimeService';
import type { LeaveRequest } from '../types';

export default function LeaveManagement() {
  const { profile, isAdmin } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const data = await getLeaveRequests(isAdmin ? undefined : profile.id);
      setRequests(data ?? []);
    } catch (err: any) {
      console.error('Failed to fetch leave requests:', err);
      toast.error(err?.message ?? 'Failed to load leave requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [profile, isAdmin]);

  useEffect(() => {
    load();
    if (!profile) return;

    // Live: admin sees every new/updated request; student sees only their own.
    const filter = isAdmin ? undefined : `student_id=eq.${profile.id}`;
    const channel = subscribeToTable('leave_requests', filter, () => load());
    return () => unsubscribe(channel);
  }, [profile, isAdmin, load]);

  async function handleReview(id: string, status: 'approved' | 'rejected') {
    if (!profile) return;
    try {
      await reviewLeaveRequest(id, status, profile.id);
      toast.success(`Leave request ${status}`);
      load();
    } catch (err: any) {
      console.error('Failed to review leave request:', err);
      toast.error(err?.message ?? 'Failed to update');
    }
  }

  return (
    <DashboardLayout title="Leave Requests" subtitle={isAdmin ? 'Review and approve student leave requests' : 'Submit and track your leave requests'}>
      {!isAdmin && (
        <div className="mb-4 flex justify-end">
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
            <Plus size={16} /> New Request
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                {isAdmin && <th className="px-4 py-3">Student</th>}
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                {isAdmin && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>}
              {!loading && requests.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No leave requests.</td></tr>}
              {requests.map((r) => (
                <tr key={r.id}>
                  {isAdmin && <td className="px-4 py-3 font-medium text-gray-800">{r.student?.full_name}</td>}
                  <td className="px-4 py-3 capitalize text-gray-600">{r.leave_type}</td>
                  <td className="px-4 py-3 text-gray-600">{r.start_date} → {r.end_date}</td>
                  <td className="px-4 py-3 text-gray-500">{r.reason || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge tone={r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : 'yellow'}>
                      {r.status.toUpperCase()}
                    </Badge>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      {r.status === 'pending' ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleReview(r.id, 'approved')} className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 hover:bg-emerald-100"><Check size={14} /></button>
                          <button onClick={() => handleReview(r.id, 'rejected')} className="rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100"><X size={14} /></button>
                        </div>
                      ) : <span className="text-xs text-gray-400">Reviewed</span>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && profile && (
        <NewLeaveModal
          employeeId={profile.id}
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); load(); }}
        />
      )}
    </DashboardLayout>
  );
}

function NewLeaveModal({ employeeId, onClose, onCreated }: { employeeId: string; onClose: () => void; onCreated: () => void }) {
  const [leaveType, setLeaveType] = useState<LeaveRequest['leave_type']>('vacation');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createLeaveRequest({ employeeId, leaveType, startDate, endDate, reason });
      toast.success('Leave request submitted');
      onCreated();
    } catch (err: any) {
      console.error('Failed to submit leave request:', err);
      toast.error(err?.message ?? 'Failed to submit');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">New Leave Request</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <select value={leaveType} onChange={(e) => setLeaveType(e.target.value as LeaveRequest['leave_type'])}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500">
            <option value="vacation">Vacation</option>
            <option value="sick">Sick</option>
            <option value="emergency">Emergency</option>
            <option value="other">Other</option>
          </select>
          <div className="flex gap-3">
            <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
            <input required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
          </div>
          <textarea placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
          <button type="submit" disabled={saving}
            className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
            {saving ? 'Submitting…' : 'Submit Request'}
          </button>
        </form>
      </div>
    </div>
  );
}