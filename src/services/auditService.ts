import { supabase } from '../lib/supabase';
import type { AuditLog } from '../types';

export async function getAuditLogs(limit = 50) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*, employee:employees(*)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as AuditLog[];
}

export async function logSecurityEvent(params: {
  employeeId?: string | null;
  eventType: string;
  description?: string;
  ipAddress?: string;
}) {
  const { error } = await supabase.from('audit_logs').insert({
    employee_id: params.employeeId ?? null,
    event_type: params.eventType,
    description: params.description,
    ip_address: params.ipAddress,
  });
  if (error) throw error;
}
