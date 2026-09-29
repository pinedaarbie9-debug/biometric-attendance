import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import bcpLogo from '../assets/bcp-logo.png';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Verify na may valid recovery session
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        toast.error('Invalid or expired reset link. Request a new one.');
        navigate('/forgot-password');
      }
    });
  }, [navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setDone(true);
    toast.success('Password updated!');
    setTimeout(() => navigate('/login'), 2000);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-white">
      <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-2">
        <div
          className="hidden bg-cover bg-center md:block"
          style={{ backgroundImage: 'linear-gradient(160deg, #1e3a5f 0%, #2d5a8c 45%, #4a90c2 100%)' }}
        />
        <div
          className="bg-cover bg-center"
          style={{ backgroundImage: 'linear-gradient(200deg, #4a90c2 0%, #2d5a8c 55%, #1e3a5f 100%)' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm rounded-lg bg-white px-8 py-10">
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <img src={bcpLogo} alt="BCP" className="h-14 w-14 object-contain" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900">BCP</h1>
          <p className="mt-1 text-xs text-gray-500">Set New Password</p>
        </div>

        {done ? (
          <div className="mt-6 flex items-start gap-2 rounded-lg bg-emerald-50 p-4">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Password updated!</p>
              <p className="mt-1 text-xs text-emerald-700">
                Redirecting to login…
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <p className="text-center text-xs text-gray-500">
              Ilagay ang bagong password mo.
            </p>

            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                className="w-full rounded-md border border-gray-300 bg-white py-3 pl-9 pr-9 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full rounded-md border border-gray-300 bg-white py-3 pl-9 pr-3 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-gradient-to-r from-primary-700 to-primary-900 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}