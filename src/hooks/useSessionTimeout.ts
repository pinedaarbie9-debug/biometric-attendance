import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes idle
const WARNING_MS = 1 * 60 * 1000; // warn 1 min before logout

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'];

export function useSessionTimeout() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const warningRef = useRef<ReturnType<typeof setTimeout>>();
  const warnedRef = useRef(false);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    toast.error('Na-logout ka dahil sa katagalan ng pag-iidle.');
    window.location.href = '/login';
  }, []);

  const resetTimers = useCallback(() => {
    warnedRef.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    warningRef.current = setTimeout(() => {
      if (!warnedRef.current) {
        warnedRef.current = true;
        toast('Mag-i-idle logout ka sa loob ng 1 minuto. Gumalaw para manatiling naka-login.', { icon: '⚠️' });
      }
    }, TIMEOUT_MS - WARNING_MS);

    timeoutRef.current = setTimeout(logout, TIMEOUT_MS);
  }, [logout]);

  useEffect(() => {
    resetTimers();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimers));

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimers));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [resetTimers]);
}