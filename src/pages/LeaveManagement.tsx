import { useCallback, useEffect, useState } from 'react';
import { Check, X, Plus, Paperclip, FileText, Image as ImageIcon, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';
import Badge from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import {
  createLeaveRequest,
  getLeaveRequests,
  reviewLeaveRequest,
  uploadLeaveAttachment,
  getAttachmentSignedUrl,
} from '../services/leaveService';
import { subscribeToTable, unsubscribe } from '../services/realtimeService';
import type { LeaveRequest } from '../types';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

export default function LeaveManagement() {
  const { profile, isAdmin } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingAttachment, setViewingAttachment] = useState<LeaveRequest | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const data = await getLeaveRequests(isAdmin ? undefined : profile.id);
      setRequests(data ?? []);
    } catch (err: any) {
      console.error('Failed to fetch absence requests:', err);
      toast.error(err?.message ?? 'Failed to load absence requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [profile, isAdmin]);

  useEffect(() => {
    load();
    if (!profile) return;

    const filter = isAdmin ? undefined : `student_id=eq.${profile.id}`;
    const channel = subscribeToTable('leave_requests', filter, () => load());
    return () => unsubscribe(channel);
  }, [profile, isAdmin, load]);

  async function handleReview(id: string, status: 'approved' | 'rejected') {
    if (!profile) return;
    try {
      await reviewLeaveRequest(id, status, profile.id);
      toast.success(`Absence request ${status}`);
      load();
    } catch (err: any) {
      console.error('Failed to review absence request:', err);
      toast.error(err?.message ?? 'Failed to update');
    }
  }

  return (
    <DashboardLayout
      title={isAdmin ? 'Student Absence Requests' : 'My Absence Requests'}
      subtitle={
        isAdmin
          ? 'Review and approve student absence requests'
          : 'Submit and track your own absence requests'
      }
    >
      {!isAdmin && (
        <div className="mb-4 flex justify-end">
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
            <Plus size={16} /> New Request
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                {isAdmin && <th className="px-4 py-3">Student</th>}
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Proof</th>
                <th className="px-4 py-3">Status</th>
                {isAdmin && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>}
              {!loading && requests.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No absence requests.</td></tr>
              )}
              {requests.map((r) => (
                <tr key={r.id}>
                  {isAdmin && <td className="px-4 py-3 font-medium text-gray-800">{r.student?.full_name}</td>}
                  <td className="px-4 py-3 capitalize text-gray-600">{r.leave_type}</td>
                  <td className="px-4 py-3 text-gray-600">{r.start_date} → {r.end_date}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate" title={r.reason ?? ''}>
                    {r.reason || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {r.attachment_url ? (
                      <button
                        onClick={() => setViewingAttachment(r)}
                        className="flex items-center gap-1 rounded-lg bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100"
                      >
                        {r.attachment_type?.startsWith('image/') ? <ImageIcon size={12} /> : <FileText size={12} />}
                        View
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
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
        <NewAbsenceModal
          employeeId={profile.id}
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); load(); }}
        />
      )}

      {viewingAttachment && (
        <AttachmentViewer
          request={viewingAttachment}
          onClose={() => setViewingAttachment(null)}
        />
      )}
    </DashboardLayout>
  );
}

// ============================================================
// NEW ABSENCE MODAL — with required reason + attachment
// ============================================================
function NewAbsenceModal({ employeeId, onClose, onCreated }: { employeeId: string; onClose: () => void; onCreated: () => void }) {
  // ⚠️ Default is 'sick' now — vacation removed
  const [leaveType, setLeaveType] = useState<LeaveRequest['leave_type']>('sick');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) {
      setFile(null);
      return;
    }

    if (!ALLOWED_TYPES.includes(selected.type)) {
      toast.error('Image (JPG, PNG) o PDF lang ang pwedeng i-upload.');
      e.target.value = '';
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      toast.error('Maximum file size ay 5MB.');
      e.target.value = '';
      return;
    }

    setFile(selected);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (reason.trim().length < 10) {
      toast.error('Ang reason ay dapat hindi bababa sa 10 characters.');
      return;
    }

    if (!file) {
      toast.error('Kailangan ng attachment (medical certificate, etc.) bilang proof.');
      return;
    }

    setSaving(true);
    try {
      toast.loading('Ina-upload ang attachment…', { id: 'upload' });
      const attachment = await uploadLeaveAttachment(file, employeeId);

      await createLeaveRequest({
        employeeId,
        leaveType,
        startDate,
        endDate,
        reason: reason.trim(),
        attachment,
      });

      toast.success('Absence request submitted!', { id: 'upload' });
      onCreated();
    } catch (err: any) {
      console.error('Failed to submit absence request:', err);
      toast.error(err?.message ?? 'Failed to submit', { id: 'upload' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">New Absence Request</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <select
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value as LeaveRequest['leave_type'])}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500"
          >
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

          <div>
            <textarea
              required
              placeholder="Reason (required — minimum 10 characters)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              minLength={10}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              {reason.length}/10 characters minimum
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">
              Attachment (required) — Medical certificate, etc.
            </label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-sm font-semibold text-gray-600 hover:border-primary-400 hover:bg-primary-50">
              <Paperclip size={16} />
              {file ? file.name : 'Pumili ng file (JPG, PNG, o PDF)'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <p className="mt-1 text-[11px] text-gray-400">
              Max 5MB. Image o PDF lang.
            </p>
          </div>

          <button type="submit" disabled={saving}
            className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
            {saving ? 'Submitting…' : 'Submit Request'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// ATTACHMENT VIEWER MODAL
// ============================================================
function AttachmentViewer({ request, onClose }: { request: LeaveRequest; onClose: () => void }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!request.attachment_url) return;
      const url = await getAttachmentSignedUrl(request.attachment_url);
      if (mounted) {
        setSignedUrl(url);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [request.attachment_url]);

  const isImage = request.attachment_type?.startsWith('image/');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">Proof of Absence</h3>
            <p className="text-xs text-gray-500">{request.attachment_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-auto rounded-lg bg-gray-50 p-4">
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-10">Loading attachment…</p>
          ) : signedUrl ? (
            isImage ? (
              <img src={signedUrl} alt="Attachment" className="mx-auto max-h-full rounded-lg" />
            ) : (
              <div className="flex flex-col items-center justify-center py-10">
                <FileText size={48} className="text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 mb-4">PDF Document</p>
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                >
                  <Eye size={16} /> Open PDF
                </a>
              </div>
            )
          ) : (
            <p className="text-center text-sm text-red-500 py-10">Failed to load attachment.</p>
          )}
        </div>

        <div className="mt-4 rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Reason</p>
          <p className="text-sm text-gray-700">{request.reason}</p>
        </div>
      </div>
    </div>
  );
}