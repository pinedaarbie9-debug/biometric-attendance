import { supabase } from '../lib/supabase';

export interface SystemSettings {
  id: number;
  shift_start_time: string;
  shift_end_time: string;
  grace_period_minutes: number;
  notify_on_late: boolean;
  notify_on_absence: boolean;
  notify_email: string | null;
  updated_at: string;
}

export interface Device {
  id: string;
  name: string;
  location: string | null;
  status: 'online' | 'offline';
  last_sync_at: string | null;
  created_at: string;
}

export async function getSettings() {
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .eq('id', 1)
    .single();
  if (error) throw error;
  return data as SystemSettings;
}

export async function updateSettings(patch: Partial<SystemSettings>) {
  const { data, error } = await supabase
    .from('system_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select()
    .single();
  if (error) throw error;
  return data as SystemSettings;
}

export async function getDevices() {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Device[];
}

export async function addDevice(name: string, location?: string) {
  const { data, error } = await supabase
    .from('devices')
    .insert({ name, location })
    .select()
    .single();
  if (error) throw error;
  return data as Device;
}

export async function deleteDevice(id: string) {
  const { error } = await supabase.from('devices').delete().eq('id', id);
  if (error) throw error;
}

export async function updateDeviceStatus(id: string, status: 'online' | 'offline') {
  const { error } = await supabase
    .from('devices')
    .update({ status, last_sync_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}