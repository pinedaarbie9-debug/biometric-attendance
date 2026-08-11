import { supabase } from '../lib/supabase';
import type { LeaveRequest } from '../types';

export async function getLeaveRequests(employeeId?: string) {
  let query = supabase
    .from('leave_requests')
    .select(`
      *,
      employee:employees!leave_requests_employee_id_fkey(
        *,
        department:departments(*)
      )
    `)
    .order('created_at', { ascending: false });

  if (employeeId) query = query.eq('employee_id', employeeId);

  const { data, error } = await query;
  if (error) {
    console.error('getLeaveRequests error:', error);
    throw error;
  }
  return data as LeaveRequest[];
}

export async function createLeaveRequest(params: {
  employeeId: string;
  leaveType: LeaveRequest['leave_type'];
  startDate: string;
  endDate: string;
  reason?: string;
}) {
  const { data, error } = await supabase
    .from('leave_requests')
    .insert({
      employee_id: params.employeeId,
      leave_type: params.leaveType,
      start_date: params.startDate,
      end_date: params.endDate,
      reason: params.reason,
    })
    .select()
    .single();
  if (error) {
    console.error('createLeaveRequest error:', error);
    throw error;
  }
  return data as LeaveRequest;
}

export async function reviewLeaveRequest(
  id: string,
  status: 'approved' | 'rejected',
  reviewerId: string
) {
  const { data, error } = await supabase
    .from('leave_requests')
    .update({ status, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('reviewLeaveRequest error:', error);
    throw error;
  }
  return data as LeaveRequest;
}