import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fingerprint, Mail, Lock, Eye, EyeOff, ShieldCheck, ScanFace, KeyRound, ShieldEllipsis } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { loginWithFace } from '../services/faceService';
import FaceCapture from '../components/FaceCapture';

export default function Login() {
  const { signIn, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  // Portal na pinipili: student o admin — nagbabago lang ang UI/labels,
  // pareho pa rin ang signIn logic (base sa role sa DB ang tunay na access).
  const [portal, setPortal] = useState<'student' | 'admin'>('student');

  const [mode, setMode] = useState<'password' | 'face'>('password');
  const [faceLoading, setFaceLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Verification successful. Welcome back!');
    navigate(isAdmin ? '/admin' : '/me');
  }

  async function handleFaceCapture(descriptor: Float32Array) {
    setFaceLoading(true);
    try {
      const result = await loginWithFace(descriptor);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.studentCode) {
        const { error: checkInError } = await supabase.rpc('simulate_check_in', {
          p_student_code: result.studentCode,
        });
        if (checkInError) {
          console.error('Auto check-in failed:', checkInError);
          toast('Naka-login ka na, pero hindi na-record ang check-in. I-check mo sa Attendance Log.', { icon: '⚠️' });
        } else {
          toast.success(`Naka-check-in ka na, ${result.matchedName}!`);
        }
      }

      toast.success(`Nakilala ka bilang ${result.matchedName}. Welcome back!`);
      navigate('/');
    } catch (err: any) {
      toast.error(err.message ?? 'May naganap na error sa face login.');
    } finally {
      setFaceLoading(false);
    }
  }

  function switchPortal(next: 'student' | 'admin') {
    setPortal(next);
    setMode('password');
    setEmail('');
    setPassword('');
  }

  const isAdminPortal = portal === 'admin';

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-white">
      <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-2">
        <div
          className="hidden bg-cover bg-center md:block"
          style={{
            backgroundImage:
              'linear-gradient(160deg, #1e3a5f 0%, #2d5a8c 45%, #4a90c2 100%)',
          }}
        />
        <div
          className="bg-cover bg-center"
          style={{
            backgroundImage:
              'linear-gradient(200deg, #4a90c2 0%, #2d5a8c 55%, #1e3a5f 100%)',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm rounded-lg bg-white px-8 py-10">
        <div className="flex flex-col items-center text-center">
          <div
            className={`mb-3 flex h-16 w-16 items-center justify-center rounded-2xl text-white transition-colors ${
              isAdminPortal ? 'bg-ink-900' : 'bg-primary-600'
            }`}
          >
            {isAdminPortal ? <ShieldEllipsis size={30} /> : <Fingerprint size={30} />}
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900">BIOATTEND</h1>
          <p className="mt-1 text-xs text-gray-500">
            {isAdminPortal ? 'Admin Portal Access' :'Student Biometrics Attendamce'}
          </p>
        </div>

        {/* Password / Face toggle — student lang, wala sa admin portal */}
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
                    <li>Kontakin ang IT admin kung nahihirapan kang mag-log in.</li>
                  </>
                )}
              </ol>
            </div>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-center text-xs text-gray-500">
              I-center mo ang mukha mo sa camera. Awtomatiko kang ma-i-login at ma-record ang check-in mo kapag na-kilala ka.
            </p>
            <div className="flex justify-center">
              <FaceCapture buttonLabel={faceLoading ? 'Verifying…' : 'Login with Face'} onCapture={handleFaceCapture} />
            </div>
          </div>
        )}

        {/* Toggle papunta/pabalik sa admin portal */}
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

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <ShieldCheck size={14} className="text-primary-600" />
          Protected with end-to-end encryption
        </p>
      </div>
    </div>
  );
}