// DROP-IN ADDITIONS para sa existing services/notificationService.ts mo.

import { supabase } from '../lib/supabase';
import { subscribeToTable } from './realtimeService';

export async function getMyNotifications(employeeId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('student_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function markAsRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) throw error;
}

export function subscribeToNotifications(employeeId: string, onChange: (payload: any) => void) {
  return subscribeToTable(
    'notifications',
    `student_id=eq.${employeeId}`,
    onChange,
    'notifications-live'
  );
}
