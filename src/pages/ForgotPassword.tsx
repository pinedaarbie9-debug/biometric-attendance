import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import bcpLogo from '../assets/bcp-logo.png';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSent(true);
    toast.success('Password reset link sent to your email');
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
          <p className="mt-1 text-xs text-gray-500">Forgot Password</p>
        </div>

        {sent ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-4">
              <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Check your email</p>
                <p className="mt-1 text-xs text-emerald-700">
                  Nagpadala kami ng password reset link sa <strong>{email}</strong>. I-click mo yung link para mag-set ng bagong password.
                </p>
              </div>
            </div>
            <Link
              to="/login"
              className="flex items-center justify-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline"
            >
              <ArrowLeft size={14} /> Balik sa Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <p className="text-center text-xs text-gray-500">
              Ilagay ang email mo at magpapadala kami ng password reset link.
            </p>

            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full rounded-md border border-gray-300 bg-white py-3 pl-9 pr-3 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-gradient-to-r from-primary-700 to-primary-900 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>

            <Link
              to="/login"
              className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 hover:underline"
            >
              <ArrowLeft size={13} /> Balik sa Login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}