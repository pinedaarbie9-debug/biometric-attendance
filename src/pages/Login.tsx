import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ScanFace, KeyRound, ArrowLeft } from 'lucide-react';
import bcpLogo from '../assets/bcp-logo.png';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { loginWithFace } from '../services/faceService';
import { logSecurityEvent } from '../services/auditService';
import FaceCapture from '../components/FaceCapture';

type LoginStep = 'credentials' | 'otp';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const [portal, setPortal] = useState<'student' | 'admin'>('student');
  const [mode, setMode] = useState<'password' | 'face'>('password');
  const [faceLoading, setFaceLoading] = useState(false);

  const [step, setStep] = useState<LoginStep>('credentials');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setLoading(false);
      toast.error(error);
      try {
        await logSecurityEvent({
          eventType: 'LOGIN_FAILED',
          description: `Failed ${portal} login attempt for ${email}`,
        });
      } catch (logErr) {
        console.error('Failed to log security event:', logErr);
      }
      return;
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    await supabase.auth.signOut();
    setLoading(false);

    if (otpError) {
      toast.error(otpError.message ?? 'Hindi naipadala ang verification code.');
      return;
    }

    toast.success('Naipadala ang code sa email mo.');
    setStep('otp');
    setOtpCode('');
    setResendCooldown(30);
    const timer = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(timer);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setOtpLoading(true);

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'email',
    });

    setOtpLoading(false);

    if (error || !data.session) {
      toast.error('Mali o expired na ang code. Subukan ulit.');
      try {
        await logSecurityEvent({
          eventType: 'OTP_VERIFICATION_FAILED',
          description: `Failed OTP verification for ${email}`,
        });
      } catch (logErr) {
        console.error('Failed to log security event:', logErr);
      }
      return;
    }

    const { data: profileRow } = await supabase
      .from('students')
      .select('role')
      .eq('id', data.session.user.id)
      .single();

    toast.success('Verification successful. Welcome back!');
    navigate(profileRow?.role === 'admin' ? '/admin' : '/me');
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) {
      toast.error('Hindi naipadala ulit ang code.');
      return;
    }
    toast.success('Naipadala ulit ang code.');
    setOtpCode('');
    setResendCooldown(30);
    const timer = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(timer);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function backToCredentials() {
    setStep('credentials');
    setOtpCode('');
    setPassword('');
  }

  async function handleFaceCapture(descriptor: Float32Array) {
    setFaceLoading(true);
    try {
      const result = await loginWithFace(descriptor);

      if (result.error) {
        toast.error(result.error);
        try {
          await logSecurityEvent({
            eventType: 'FACE_LOGIN_FAILED',
            description: result.error,
          });
        } catch (logErr) {
          console.error('Failed to log security event:', logErr);
        }
        return;
      }

      // Face login lang ito — hindi na mag-a-auto check-in.
      // Kailangan pumunta ang student sa "Check In / Out" page para mag-check-in.
      toast.success(`Nakilala ka bilang ${result.matchedName}. Welcome back!`);
      navigate('/');
    } catch (err: any) {
      toast.error(err.message ?? 'May naganap na error sa face login.');
      try {
        await logSecurityEvent({
          eventType: 'FACE_LOGIN_ERROR',
          description: err.message ?? 'Unknown face login error',
        });
      } catch (logErr) {
        console.error('Failed to log security event:', logErr);
      }
    } finally {
      setFaceLoading(false);
    }
  }

  function switchPortal(next: 'student' | 'admin') {
    setPortal(next);
    setMode('password');
    setEmail('');
    setPassword('');
    setStep('credentials');
  }

  const isAdminPortal = portal === 'admin';

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
            <img src={bcpLogo} alt="Bestlink College of the Philippines" className="h-14 w-14 object-contain" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900">BCP</h1>
          <p className="mt-1 text-xs text-gray-500">
            {step === 'otp'
              ? 'Ilagay ang verification code'
              : isAdminPortal
              ? 'Admin Portal Access'
              : 'Student Biometrics Attendance'}
          </p>
        </div>

        {step === 'otp' ? (
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
            <p className="text-center text-xs text-gray-500">
              Nagpadala kami ng verification code sa <span className="font-semibold text-gray-700">{email}</span>. Ilagay ito sa baba.
            </p>

            <input
              type="text"
              inputMode="numeric"
              autoFocus
              required
              maxLength={8}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="00000000"
              className="w-full rounded-md border border-gray-300 bg-white py-3 text-center text-2xl tracking-[0.3em] outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />

            <button
              type="submit"
              disabled={otpLoading || otpCode.length < 6}
              className="w-full rounded-md bg-gradient-to-r from-primary-700 to-primary-900 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {otpLoading ? 'Nagve-verify…' : 'I-verify ang Code'}
            </button>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={backToCredentials}
                className="flex items-center gap-1 font-semibold text-gray-500 hover:underline"
              >
                <ArrowLeft size={13} /> Bumalik
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="font-semibold text-primary-700 hover:underline disabled:text-gray-300"
              >
                {resendCooldown > 0 ? `I-resend (${resendCooldown}s)` : 'I-resend ang code'}
              </button>
            </div>
          </form>
        ) : (
          <>
            {!isAdminPortal && (
              <div className="mt-6 flex rounded-lg bg-gray-100 p-1 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => setMode('password')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 transition-colors ${
                    mode === 'password' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  <KeyRound size={15} /> Password
                </button>
                <button
                  type="button"
                  onClick={() => setMode('face')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 transition-colors ${
                    mode === 'face' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  <ScanFace size={15} /> Face Login
                </button>
              </div>
            )}

            {(isAdminPortal || mode === 'password') ? (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="relative">
                  <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isAdminPortal ? 'Admin Email Address' : 'Student Email Address'}
                    className="w-full rounded-md border border-gray-300 bg-white py-3 pl-9 pr-3 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Secured Passphrase"
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

                <div className="text-center">
                  <a href="#" className="text-sm text-primary-700 hover:underline">
                    Forgot Password?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full rounded-md py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60 ${
                    isAdminPortal
                      ? 'bg-gradient-to-r from-ink-900 to-gray-700'
                      : 'bg-gradient-to-r from-primary-700 to-primary-900'
                  }`}
                >
                  {loading ? 'Signing in…' : isAdminPortal ? 'Sign In to Admin Console' : 'Sign In to Dashboard'}
                </button>

                {!isAdminPortal && (
                  <label className="flex items-center justify-center gap-2 text-xs text-gray-500">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    Remember computer
                  </label>
                )}

                <div className="rounded-md bg-primary-50 p-3 text-xs text-primary-900">
                  <p className="mb-1 font-semibold">Instructions</p>
                  <ol className="list-inside list-decimal space-y-1">
                    {isAdminPortal ? (
                      <>
                        <li>Gamitin lamang ang opisyal na admin credentials.</li>
                        <li>Bawal ibahagi ang admin passphrase sa iba.</li>
                      </>
                    ) : (
                      <>
                        <li>Gamitin ang iyong corporate email at binigay na passphrase.</li>
                        <li>Magpapadala kami ng verification code sa email mo bago ka makapasok.</li>
                      </>
                    )}
                  </ol>
                </div>
              </form>
            ) : (
              <div className="mt-6 space-y-4">
                <p className="text-center text-xs text-gray-500">
                  I-center mo ang mukha mo sa camera. Awtomatiko kang ma-i-login kapag na-kilala ka — pumunta sa "Check In / Out" para irecord ang attendance.
                </p>
                <div className="flex justify-center">
                  <FaceCapture buttonLabel={faceLoading ? 'Verifying…' : 'Login with Face'} onCapture={handleFaceCapture} />
                </div>
              </div>
            )}

            <div className="mt-5 text-center text-xs text-gray-500">
              {isAdminPortal ? (
                <button
                  type="button"
                  onClick={() => switchPortal('student')}
                  className="font-semibold text-primary-700 hover:underline"
                >
                  ← Balik sa Student Login
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => switchPortal('admin')}
                  className="font-semibold text-gray-600 hover:underline"
                >
                  Admin? Sign in here →
                </button>
              )}
            </div>
          </>
        )}

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <ShieldCheck size={14} className="text-primary-600" />
          Protected with end-to-end encryption
        </p>
      </div>
    </div>
  );
}