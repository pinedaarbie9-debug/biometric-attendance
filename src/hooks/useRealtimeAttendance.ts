import { useEffect, useState, useCallback } from 'react';
import {
  getMyAttendance,
  getAllAttendanceToday,
  subscribeToAttendance,
} from '../services/attendanceService'; // pagkatapos mong i-merge yung additions dito
import { unsubscribe } from '../services/realtimeService';

/**
 * Gamitin sa AdminDashboard.tsx:
 *   const { records, loading } = useRealtimeAttendance();
 *
 * Gamitin sa MyAttendance.tsx:
 *   const { records, loading } = useRealtimeAttendance(currentEmployeeId);
 */
export function useRealtimeAttendance(employeeId?: string) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = employeeId ? await getMyAttendance(employeeId) : await getAllAttendanceToday();
      setRecords(data ?? []);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    refetch();

    const channel = subscribeToAttendance(() => {
      // Simple + reliable: refetch buong list tuwing may pagbabago.
      // (Pwede mo itong i-optimize later para mag-merge lang ng single row instead of refetch.)
      refetch();
    }, employeeId);

    return () => unsubscribe(channel);
  }, [employeeId, refetch]);

  return { records, loading, refetch };
}
