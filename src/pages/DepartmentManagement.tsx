import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';
import { createDepartment, deleteDepartment, getDepartments } from '../services/departmentService';
import type { Department } from '../types';

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setDepartments(await getDepartments());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createDepartment(name.trim(), description.trim() || undefined);
      setName('');
      setDescription('');
      toast.success('Department added');
      load();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to add department');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this department?')) return;
    try {
      await deleteDepartment(id);
      toast.success('Department removed');
      load();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to remove');
    }
  }

  return (
    <DashboardLayout title="Departments" subtitle="Organize employees into departments">
      <form onSubmit={handleAdd} className="mb-6 flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold text-gray-500">Department name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Product Engineering"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold text-gray-500">Description (optional)</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
        </div>
        <button type="submit" className="flex items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
          <Plus size={16} /> Add
        </button>
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading && <p className="text-sm text-gray-400">Loading…</p>}
        {!loading && departments.length === 0 && <p className="text-sm text-gray-400">No departments yet.</p>}
        {departments.map((d) => (
          <div key={d.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{d.name}</h3>
                {d.description && <p className="mt-1 text-xs text-gray-500">{d.description}</p>}
              </div>
              <button onClick={() => handleDelete(d.id)} className="text-gray-300 hover:text-red-500">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
