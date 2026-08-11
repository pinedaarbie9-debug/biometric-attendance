import { useEffect, useState } from 'react';
import { Plus, Filter, X } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';
import Badge from '../components/common/Badge';
import { getEmployees, inviteEmployee } from '../services/employeeService';
import { getDepartments } from '../services/departmentService';
import type { Department, Employee } from '../types';

export default function EmployeeDirectory() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deptFilter, setDeptFilter] = useState<string>('all');

  async function load() {
    setLoading(true);
    try {
      const [emp, dept] = await Promise.all([getEmployees(), getDepartments()]);
      setEmployees(emp);
      setDepartments(dept);
    } catch (err) {
      toast.error('Failed to load employee directory');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered =
    deptFilter === 'all' ? employees : employees.filter((e) => e.department_id === deptFilter);

  return (
    <DashboardLayout title="Employee Directory" subtitle="Enroll, update, or remove credentials in the database">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-8 text-sm font-medium text-gray-700 outline-none focus:border-primary-500"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <Filter size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <Plus size={16} /> Add Employee
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Employee ID</th>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Role Title</th>
                <th className="px-4 py-3">Biometric Status</th>
                <th className="px-4 py-3">Last Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No employees found.</td></tr>
              )}
              {filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-medium text-gray-700">{emp.employee_code}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                        {emp.full_name.charAt(0)}
                      </div>
                      <span className="font-semibold text-gray-900">{emp.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{emp.department?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.role_title ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge tone={emp.biometric_status === 'registered' ? 'green' : 'yellow'}>
                      {emp.biometric_status === 'registered' ? 'REGISTERED' : 'NOT REGISTERED'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {emp.last_verified_at
                      ? new Date(emp.last_verified_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddEmployeeModal
          departments={departments}
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            load();
          }}
        />
      )}
    </DashboardLayout>
  );
}

function AddEmployeeModal({
  departments,
  onClose,
  onCreated,
}: {
  departments: Department[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await inviteEmployee({
        email,
        full_name: fullName,
        role_title: roleTitle,
        department_id: departmentId || undefined,
        password,
      });
      toast.success('Employee added');
      onCreated();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to add employee');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Add Employee</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
          <input required type="email" placeholder="Corporate email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
          <input placeholder="Role title (e.g. HR Specialist)" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500">
            <option value="">Select department</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input required type="password" placeholder="Temporary password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
          <button type="submit" disabled={saving}
            className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
            {saving ? 'Adding…' : 'Add Employee'}
          </button>
        </form>
      </div>
    </div>
  );
}
