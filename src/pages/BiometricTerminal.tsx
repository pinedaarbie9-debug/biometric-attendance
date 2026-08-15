import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CheckCircle2, AlertTriangle, LogIn, LogOut, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { loadFaceModels, getFaceDescriptor, verifyFaceAgainstEmployee } from '../services/faceService';
import { simulateCheckIn } from '../services/deviceService';
import { supabase } from '../lib/supabase';

type ScanStatus = 'idle' | 'loading_models' | 'ready' | 'scanning' | 'success' | 'no_face' | 'no_match' | 'error';

const MAX_FAILED_ATTEMPTS = 3;

interface TodayAttendance {
  check_in_time: string | null;
  check_out_time: string | null;
}

export default function BiometricTerminal() {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showFallback, setShowFallback] = useState(false);
  const [fallbackPassword, setFallbackPassword] = useState('');
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [eventType, setEventType] = useState<'check_in' | 'check_out'>('check_in');

  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const hasCheckedIn = !!todayAttendance?.check_in_time;
  const hasCheckedOut = !!todayAttendance?.check_out_time;
  const isDoneForToday = hasCheckedIn && hasCheckedOut;

  async function fetchTodayStatus() {
    if (!profile) return;
    setCheckingStatus(true);
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('attendance')
      .select('check_in_time, check_out_time')
      .eq('student_id', profile.id)
      .eq('date', today)
      .maybeSingle();

    if (error) {
      console.error('fetchTodayStatus error:', error);
    }

    setTodayAttendance(data ?? null);
    // I-set ang default na tab base sa kasalukuyang status
    if (data?.check_in_time && !data?.check_out_time) {
      setEventType('check_out');
    } else {
      setEventType('check_in');
    }
    setCheckingStatus(false);
  }

  useEffect(() => {
    fetchTodayStatus();
  }, [profile?.id]);

  useEffect(() => {
    let stream: MediaStream | undefined;
    let cancelled = false;

    (async () => {
      setStatus('loading_models');
      try {
        await loadFaceModels();
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 300 } });
        if (cancelled) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus('ready');
      } catch (err) {
        console.error('Terminal init error:', err);
        if (!cancelled) {
          setStatus('error');
          const msg = err instanceof Error ? err.message : String(err);
          setErrorMsg(
            msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')
              ? 'Hindi ma-access ang camera. Payagan ang camera permission sa browser.'
              : 'Hindi ma-load ang face detection models.'
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Auto-redirect papunta sa dashboard pagkatapos mag-success
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        navigate(isAdmin ? '/admin' : '/me');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, isAdmin, navigate]);

  async function finalizeCheckIn(verificationMethod: 'fingerprint' | 'facial_id') {
    if (!profile) return;

    // Huling pagkakataon i-verify bago mag-record — kung sakaling naka-refresh
    // sila sa dalawang tabs, o na-check-in na sa ibang paraan.
    if (eventType === 'check_in' && hasCheckedIn) {
      toast.error('Naka-check-in ka na ngayong araw.');
      setStatus('ready');
      return;
    }
    if (eventType === 'check_out' && (!hasCheckedIn || hasCheckedOut)) {
      toast.error(
        !hasCheckedIn
          ? 'Kailangan mo munang mag-check-in bago mag-check-out.'
          : 'Naka-check-out ka na ngayong araw.'
      );
      setStatus('ready');
      return;
    }

    try {
      await simulateCheckIn(profile.student_code, eventType, verificationMethod);
      setStatus('success');
      setResult(
        eventType === 'check_in'
          ? `Check-in recorded! Welcome, ${profile.full_name}.`
          : `Check-out recorded! Ingat sa pauwi, ${profile.full_name}.`
      );
      toast.success(eventType === 'check_in' ? 'Checked in!' : 'Checked out!');
      setFailedAttempts(0);
      setShowFallback(false);
      await fetchTodayStatus();
    } catch (err: any) {
      console.error('simulateCheckIn error:', err);
      toast.error(err.message ?? 'Failed to record attendance');
      setStatus('ready');
    }
  }

  async function handleScan() {
    if (!videoRef.current || !profile) return;
    if (isDoneForToday) return;
    setStatus('scanning');
    setResult(null);

    try {
      const descriptor = await getFaceDescriptor(videoRef.current);

      if (!descriptor) {
        setStatus('no_face');
        setFailedAttempts((n) => n + 1);
        return;
      }

      const { match } = await verifyFaceAgainstEmployee(profile.student_code, descriptor);

      if (!match) {
        setStatus('no_match');
        setFailedAttempts((n) => n + 1);
        return;
      }

      await finalizeCheckIn('facial_id');
    } catch (err) {
      console.error('Scan error:', err);
      setStatus('error');
      setErrorMsg('May error sa pag-scan. Subukan ulit.');
      setFailedAttempts((n) => n + 1);
    }
  }

  async function handleFallbackVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setFallbackLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: fallbackPassword,
      });

      if (error) {
        toast.error('Maling password. Subukan ulit.');
        setFallbackLoading(false);
        return;
      }

      setFallbackPassword('');
      await finalizeCheckIn('fingerprint');
    } catch (err: any) {
      toast.error(err.message ?? 'Verification failed');
    } finally {
      setFallbackLoading(false);
    }
  }

  const showFallbackPrompt = failedAttempts >= MAX_FAILED_ATTEMPTS;

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900 px-4 py-8 sm:py-10">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl sm:max-w-md sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
              <Camera size={18} />
            </div>
            <span className="text-xs font-bold text-gray-900 sm:text-sm">BIOATTEND GATEWAY</span>
          </div>
          <span className="rounded-full bg-primary-50 px-2 py-1 text-[10px] font-semibold text-primary-700 sm:text-[11px]">
            TERMINAL ACTIVE
          </span>
        </div>

        <div className="mb-4 text-center">
          <h2 className="text-base font-bold text-gray-900 sm:text-lg">{profile?.full_name}</h2>
          <p className="text-xs text-gray-500 sm:text-sm">Student ID: {profile?.student_code}</p>
        </div>

        {checkingStatus ? (
          <p className="mb-3 text-center text-xs text-gray-400">Kinukuha ang status ngayong araw…</p>
        ) : isDoneForToday ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-primary-100 bg-primary-50 p-3">
            <CheckCheck size={18} className="mt-0.5 shrink-0 text-primary-600" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Kumpleto na ang attendance mo ngayong araw</p>
              <p className="text-xs text-gray-600">
                Check-in: {todayAttendance?.check_in_time && new Date(todayAttendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {' · '}
                Check-out: {todayAttendance?.check_out_time && new Date(todayAttendance.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="mt-1 text-[11px] text-gray-400">Babalik bukas para sa susunod na check-in.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setEventType('check_in')}
                disabled={hasCheckedIn}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold sm:text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
                  eventType === 'check_in' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <LogIn size={14} /> Check In
              </button>
              <button
                onClick={() => setEventType('check_out')}
                disabled={!hasCheckedIn}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold sm:text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
                  eventType === 'check_out' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <LogOut size={14} /> Check Out
              </button>
            </div>

            {hasCheckedIn && !hasCheckedOut && (
              <p className="mb-3 text-center text-[11px] text-gray-400">
                Naka-check-in ka na ({todayAttendance?.check_in_time && new Date(todayAttendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}). Mag-check-out kapag aalis ka na.
              </p>
            )}

            <div className="mb-4 flex justify-center">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="h-[220px] w-full max-w-[320px] rounded-xl border border-gray-200 bg-black object-cover sm:h-[260px]"
              />
            </div>

            {status === 'loading_models' && (
              <p className="mb-3 text-center text-xs text-gray-500 sm:text-sm">Naglo-load ng face detection…</p>
            )}

            {status !== 'success' && !showFallback && (
              <button
                onClick={handleScan}
                disabled={status === 'loading_models' || status === 'scanning' || status === 'error'}
                className="w-full rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 sm:text-base"
              >
                {status === 'scanning' ? 'Nagsu-scan…' : 'I-scan ang Mukha'}
              </button>
            )}

            {status === 'no_face' && !showFallbackPrompt && (
              <p className="mt-3 text-center text-xs text-amber-600 sm:text-sm">
                Walang nakitang mukha. I-center mo sa camera at subukan ulit. ({failedAttempts}/{MAX_FAILED_ATTEMPTS})
              </p>
            )}

            {status === 'no_match' && !showFallbackPrompt && (
              <p className="mt-3 text-center text-xs text-red-500 sm:text-sm">
                Hindi tumugma ang mukha. Subukan ulit. ({failedAttempts}/{MAX_FAILED_ATTEMPTS})
              </p>
            )}

            {status === 'error' && (
              <p className="mt-3 text-center text-xs text-red-500 sm:text-sm">{errorMsg}</p>
            )}

            {showFallbackPrompt && !showFallback && (
              <div className="mt-3 space-y-2 rounded-lg bg-amber-50 p-3">
                <div className="flex items-start gap-2 text-xs text-amber-800 sm:text-sm">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  Ilang beses nang hindi na-verify ang mukha. Gamitin ang password bilang backup.
                </div>
                <button
                  onClick={() => setShowFallback(true)}
                  className="w-full rounded-lg border border-amber-300 bg-white py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 sm:text-sm"
                >
                  Gamitin ang Password
                </button>
              </div>
            )}

            {showFallback && (
              <form onSubmit={handleFallbackVerify} className="mt-3 space-y-2">
                <p className="text-xs text-gray-600 sm:text-sm">
                  I-type ang password ng account mo (<span className="font-medium">{profile?.email}</span>) para makumpirma.
                </p>
                <input
                  type="password"
                  required
                  placeholder="Password"
                  value={fallbackPassword}
                  onChange={(e) => setFallbackPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowFallback(false); setFailedAttempts(0); }}
                    className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 sm:text-sm"
                  >
                    Kanselahin
                  </button>
                  <button
                    type="submit"
                    disabled={fallbackLoading}
                    className="flex-1 rounded-lg bg-primary-600 py-2 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-60 sm:text-sm"
                  >
                    {fallbackLoading ? 'Ineberify…' : 'I-verify'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {status === 'success' && result && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-primary-100 bg-primary-50 p-3">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary-600" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Verification Successful</p>
              <p className="text-xs text-gray-600">{result}</p>
              <p className="mt-1 text-[11px] text-gray-400">Babalik sa dashboard…</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}