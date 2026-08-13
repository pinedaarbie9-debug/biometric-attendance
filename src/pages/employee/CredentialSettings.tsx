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
  // Kailangan ng current password para ma-save bilang `login_secret` — ito ang
  // gagamitin ng Face Login para makabuo ng totoong Supabase session.
  const [confirmPassword, setConfirmPassword] = useState('');
  const isRegistered = profile?.biometric_status === 'registered';

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setSaving(false);
      toast.error(error.message);
      return;
    }

    // I-sync agad ang login_secret sa bagong password, para gumana pa rin
    // ang Face Login kahit hindi mo ulit i-re-enroll ang mukha.
    if (profile) {
      const { error: syncError } = await supabase
        .from('students')
        .update({ login_secret: newPassword })
        .eq('id', profile.id);

      if (syncError) {
        // Hindi natin i-block ang buong flow kung mabigo lang ang sync —
        // successful naman talaga ang password change mismo.
        console.error('Failed to sync login_secret:', syncError);
        toast('Na-update ang password, pero hindi na-sync sa Face Login. I-re-register na lang ang Face ID.', { icon: '⚠️' });
      }
    }

    setSaving(false);
    toast.success('Password updated');
    setNewPassword('');
  }

  async function handleFaceCapture(descriptor: Float32Array) {
    if (!profile) return;

    if (!confirmPassword) {
      toast.error('I-type muna ang iyong kasalukuyang password bago mag-register ng Face ID.');
      return;
    }

    setFaceStatus('saving');
    try {
      const { isDuplicate, matchedName } = await checkDuplicateFace(descriptor, profile.student_code);

      if (isDuplicate) {
        setFaceStatus('idle');
        toast.error(`Face already registered sa ibang account (${matchedName ?? 'unknown'}). Kontakin ang admin kung mali ito.`);
        return;
      }

      // I-verify muna na tama ang na-type na password bago ito i-save,
      // para hindi masira ang login_secret ng mali/typo na password.
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: confirmPassword,
      });

      if (verifyError) {
        setFaceStatus('idle');
        toast.error('Mali ang na-type mong password. Subukan ulit.');
        return;
      }

      await enrollFace(profile.id, descriptor, confirmPassword);
      setFaceStatus('done');
      setShowReEnroll(false);
      setConfirmPassword('');
      toast.success('Face ID registered! Puwede mo nang gamitin ito para mag-login.');
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
          <p className="text-xs text-gray-400">Employee ID: {profile?.student_code}</p>
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

              <div className="mb-3">
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Kumpirmahin ang kasalukuyang password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Kasalukuyang password mo"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Kailangan ito para gumana ang "Login with Face" — ito ang gagamitin para awtomatikong makapag-login ka gamit lang ang mukha mo.
                </p>
              </div>

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
          <p className="mt-2 text-[11px] text-gray-400">
            Awtomatiko itong mag-a-update sa Face Login credential mo — hindi mo na kailangan i-re-register ang Face ID.
          </p>
        </form>
      </div>
    </DashboardLayout>
  );
}