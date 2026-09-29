import { supabase } from '../lib/supabase';
import type { NotificationItem } from '../types';

export async function getNotifications(employeeId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('student_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data as NotificationItem[];
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  if (error) throw error;
}

export async function sendNotification(employeeId: string, title: string, message: string) {
  const { error } = await supabase
    .from('notifications')
    .insert({ student_id: employeeId, title, message });
  if (error) throw error;
}
