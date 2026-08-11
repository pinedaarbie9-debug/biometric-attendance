import DashboardLayout from '../components/layout/DashboardLayout';

export default function Settings() {
  return (
    <DashboardLayout title="Settings" subtitle="System preferences">
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">System-wide settings (shift defaults, notification rules, device management) go here.</p>
      </div>
    </DashboardLayout>
  );
}
