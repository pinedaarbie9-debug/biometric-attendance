import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, Wifi, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  getSettings, updateSettings, getDevices, addDevice, deleteDevice, updateDeviceStatus,
  type SystemSettings, type Device,
} from '../services/settingsService';

export default function Settings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [deviceLocation, setDeviceLocation] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [s, d] = await Promise.all([getSettings(), getDevices()]);
      setSettings(s);
      setDevices(d);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await updateSettings({
        shift_start_time: settings.shift_start_time,
        shift_end_time: settings.shift_end_time,
        grace_period_minutes: settings.grace_period_minutes,
        notify_on_late: settings.notify_on_late,
        notify_on_absence: settings.notify_on_absence,
        notify_email: settings.notify_email,
      });
      setSettings(updated);
      toast.success('Settings saved');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddDevice(e: React.FormEvent) {
    e.preventDefault();
    if (!deviceName.trim()) return;
    try {
      await addDevice(deviceName.trim(), deviceLocation.trim() || undefined);
      setDeviceName('');
      setDeviceLocation('');
      toast.success('Device added');
      load();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to add device');
    }
  }

  async function handleDeleteDevice(id: string) {
    if (!confirm('Remove this device?')) return;
    try {
      await deleteDevice(id);
      toast.success('Device removed');
      load();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to remove device');
    }
  }

  async function handleToggleStatus(d: Device) {
    try {
      await updateDeviceStatus(d.id, d.status === 'online' ? 'offline' : 'online');
      load();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update device');
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Settings" subtitle="System preferences">
        <p className="text-sm text-gray-400">Loading…</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Settings" subtitle="System preferences">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Shift Defaults + Notification Rules */}
        <form onSubmit={handleSaveSettings} className="space-y-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div>
            <h3 className="mb-3 text-sm font-bold text-gray-900">Shift Defaults</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-semibold text-gray-500">Start time</label>
                <input type="time" value={settings?.shift_start_time?.slice(0, 5) ?? ''}
                  onChange={(e) => setSettings((s) => s && { ...s, shift_start_time: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-semibold text-gray-500">End time</label>
                <input type="time" value={settings?.shift_end_time?.slice(0, 5) ?? ''}
                  onChange={(e) => setSettings((s) => s && { ...s, shift_end_time: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
              </div>
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold text-gray-500">Grace period (minutes)</label>
              <input type="number" min={0} value={settings?.grace_period_minutes ?? 0}
                onChange={(e) => setSettings((s) => s && { ...s, grace_period_minutes: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold text-gray-900">Notification Rules</h3>
            <label className="mb-2 flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={settings?.notify_on_late ?? false}
                onChange={(e) => setSettings((s) => s && { ...s, notify_on_late: e.target.checked })} />
              Notify when a student is late
            </label>
            <label className="mb-3 flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={settings?.notify_on_absence ?? false}
                onChange={(e) => setSettings((s) => s && { ...s, notify_on_absence: e.target.checked })} />
              Notify on unexcused absence
            </label>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Notification email</label>
              <input type="email" placeholder="admin@bcp.edu.ph" value={settings?.notify_email ?? ''}
                onChange={(e) => setSettings((s) => s && { ...s, notify_email: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
            <Save size={16} /> {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </form>

        {/* Device Management */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-gray-900">Device Management</h3>
          <form onSubmit={handleAddDevice} className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input placeholder="Device name (e.g. Gate Scanner 1)" value={deviceName} onChange={(e) => setDeviceName(e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
            <input placeholder="Location" value={deviceLocation} onChange={(e) => setDeviceLocation(e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
            <button type="submit" className="flex items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
              <Plus size={16} /> Add
            </button>
          </form>

          <div className="space-y-2">
            {devices.length === 0 && <p className="text-sm text-gray-400">No devices registered yet.</p>}
            {devices.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{d.name}</p>
                  <p className="text-xs text-gray-500">{d.location ?? 'No location set'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleStatus(d)}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      d.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {d.status === 'online' ? <Wifi size={12} /> : <WifiOff size={12} />}
                    {d.status.toUpperCase()}
                  </button>
                  <button onClick={() => handleDeleteDevice(d.id)} className="text-gray-300 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}