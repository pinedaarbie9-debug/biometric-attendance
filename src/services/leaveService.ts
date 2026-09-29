import { supabase } from '../lib/supabase';
import type { LeaveRequest } from '../types';

export async function getLeaveRequests(employeeId?: string) {
  let query = supabase
    .from('leave_requests')
    .select(`
      *,
      student:students!leave_requests_employee_id_fkey(
        *,
        department:departments(*)
      )
    `)
    .order('created_at', { ascending: false });

  if (employeeId) query = query.eq('student_id', employeeId);

  const { data, error } = await query;
  if (error) {
    console.error('getLeaveRequests error:', error);
    throw error;
  }
  return data as LeaveRequest[];
}

/**
 * Upload attachment to Supabase Storage, returns public URL
 */
export async function uploadLeaveAttachment(
  file: File,
  userId: string
): Promise<{ url: string; name: string; type: string }> {
  const ext = file.name.split('.').pop() ?? 'bin';
  const fileName = `${userId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('leave-attachments')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    console.error('uploadLeaveAttachment error:', uploadError);
    throw uploadError;
  }

  // NOTE: bucket is private, so getPublicUrl returns a path only.
  // Use signed URL instead for viewing later.
  return {
    url: fileName, // store the path, not the public URL
    name: file.name,
    type: file.type,
  };
}

/**
 * Get signed URL for viewing attachment (valid for 1 hour)
 */
export async function getAttachmentSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('leave-attachments')
    .createSignedUrl(path, 3600);

  if (error) {
    console.error('getAttachmentSignedUrl error:', error);
    return null;
  }
  return data.signedUrl;
}

export async function createLeaveRequest(params: {
  employeeId: string;
  leaveType: LeaveRequest['leave_type'];
  startDate: string;
  endDate: string;
  reason: string;
  attachment?: { url: string; name: string; type: string };
}) {
  const { data, error } = await supabase
    .from('leave_requests')
    .insert({
      student_id: params.employeeId,
      leave_type: params.leaveType,
      start_date: params.startDate,
      end_date: params.endDate,
      reason: params.reason,
      attachment_url: params.attachment?.url ?? null,
      attachment_name: params.attachment?.name ?? null,
      attachment_type: params.attachment?.type ?? null,
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