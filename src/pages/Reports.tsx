import { useState } from 'react';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';
import { exportAttendanceCsv } from '../services/reportService';

export default function Reports() {
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportAttendanceCsv(startDate, endDate);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${startDate}_to_${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to export');
    } finally {
      setExporting(false);
    }
  }

  return (
    <DashboardLayout title="Reports & Exports" subtitle="Generate attendance reports for a date range">
      <div className="max-w-md rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold text-gray-500">From</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold text-gray-500">To</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
          </div>
        </div>
        <button onClick={handleExport} disabled={exporting}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
          <Download size={16} /> {exporting ? 'Preparing…' : 'Export CSV'}
        </button>
      </div>
    </DashboardLayout>
  );
}