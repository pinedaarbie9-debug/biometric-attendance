import { useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { enrollFace, checkDuplicateFace } from '../../services/faceService';
import FaceCapture from '../../components/FaceCapture';

export default function CredentialSettings() {
  const { profile, refreshProfile } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [faceStatus, setFaceStatus] = useState<'idle' | 'saving' | 'done'>('idle');
  const [showReEnroll, setShowReEnroll] = useState(false);
  const isRegistered = profile?.biometric_status === 'registered';

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Password updated');
    setNewPassword('');
  }

  async function handleFaceCapture(descriptor: Float32Array) {
    if (!profile) return;
    setFaceStatus('saving');
    try {
      const { isDuplicate, matchedName } = await checkDuplicateFace(descriptor, profile.employee_code);

      if (isDuplicate) {
        setFaceStatus('idle');
        toast.error(`Face already registered sa ibang account (${matchedName ?? 'unknown'}). Kontakin ang admin kung mali ito.`);
        return;
      }

      await enrollFace(profile.id, descriptor);
      setFaceStatus('done');
      setShowReEnroll(false);
      toast.success('Face ID registered!');
      await refreshProfile();
    } catch (err: any) {
      setFaceStatus('idle');
      toast.error(err.message ?? 'Failed to register Face ID');
    }
  }

  return (
    <DashboardLayout title="Credential Settings" subtitle="Manage your login and biometric credentials">
      <div className="max-w-md space-y-4">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-1 text-sm font-bold text-gray-900">Account</h3>
          <p className="text-sm text-gray-500">{profile?.email}</p>
          <p className="text-xs text-gray-400">Employee ID: {profile?.employee_code}</p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Face ID</h3>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              isRegistered ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}>
              {isRegistered ? 'REGISTERED' : 'NOT REGISTERED'}
            </span>
          </div>

          {faceStatus === 'done' && !showReEnroll ? (
            <div className="flex items-center gap-2 rounded-lg bg-primary-50 p-3 text-sm text-primary-800">
              <CheckCircle2 size={18} /> Face ID registered successfully.
            </div>
          ) : isRegistered && !showReEnroll ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                <CheckCircle2 size={18} /> May naka-register nang Face ID.
              </div>
              <button
                onClick={() => setShowReEnroll(true)}
                className="w-full rounded-lg border border-gray-200 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Baguhin ang Face ID
              </button>
            </div>
          ) : (
            <>
              <p className="mb-3 text-xs text-gray-500">
                I-center mo ang mukha mo sa camera, siguraduhing maliwanag ang paligid, tapos i-click ang button.
              </p>
              {showReEnroll && (
                <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  Papalitan nito ang naka-register mo nang Face ID. Sigurado ka ba?
                </div>
              )}
              <FaceCapture
                buttonLabel={isRegistered ? 'Confirm Re-register Face ID' : 'Register Face ID'}
                onCapture={handleFaceCapture}
              />
              {showReEnroll && (
                <button
                  onClick={() => setShowReEnroll(false)}
                  className="mt-2 w-full text-xs font-medium text-gray-500 hover:text-gray-700"
                >
                  Kanselahin
                </button>
              )}
            </>
          )}
        </div>

        <form onSubmit={handleUpdatePassword} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-gray-900">Change Password</h3>
          <input
            type="password"
            required
            minLength={6}
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500"
          />
          <button type="submit" disabled={saving}
            className="mt-3 w-full rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
            {saving ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}