import { useEffect, useState } from 'react';
import { Plus, Filter, X, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';
import Badge from '../components/common/Badge';
import { getEmployees, inviteEmployee, updateEmployee } from '../services/employeeService';
import { getDepartments } from '../services/departmentService';
import type { Department, Student } from '../types';

export default function StudentDirectory() {
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deptFilter, setDeptFilter] = useState<string>('all');

  async function load() {
    setLoading(true);
    try {
      const [stu, dept] = await Promise.all([getEmployees(), getDepartments()]);
      setStudents(stu);
      setDepartments(dept);
    } catch (err) {
      toast.error('Failed to load student directory');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered =
    deptFilter === 'all' ? students : students.filter((s) => s.department_id === deptFilter);

  return (
    <DashboardLayout title="Student Directory" subtitle="Enroll, update, or remove credentials in the database">
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
          <Plus size={16} /> Add Student
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Student ID</th>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Biometric Status</th>
                <th className="px-4 py-3">Last Verification</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No students found.</td></tr>
              )}
              {filtered.map((stu) => (
                <tr key={stu.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-medium text-gray-700">{stu.student_code}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                        {stu.full_name.charAt(0)}
                      </div>
                      <span className="font-semibold text-gray-900">{stu.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{stu.department?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge tone={stu.role === 'admin' ? 'red' : stu.role === 'teacher' ? 'yellow' : 'green'}>
                      {stu.role.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={stu.biometric_status === 'registered' ? 'green' : 'yellow'}>
                      {stu.biometric_status === 'registered' ? 'REGISTERED' : 'NOT REGISTERED'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {stu.last_verified_at
                      ? new Date(stu.last_verified_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditingStudent(stu)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600"
                      aria-label="Edit student"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddStudentModal
          departments={departments}
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            load();
          }}
        />
      )}

      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          departments={departments}
          onClose={() => setEditingStudent(null)}
          onSaved={() => {
            setEditingStudent(null);
            load();
          }}
        />
      )}
    </DashboardLayout>
  );
}

function AddStudentModal({
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
  const [role, setRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await inviteEmployee({
        email,
        full_name: fullName,
        role_title: roleTitle || undefined,
        department_id: departmentId || undefined,
        role,
        password,
      });
      toast.success(
        role === 'student' ? 'Student added' : role === 'teacher' ? 'Teacher added' : 'Admin added'
      );
      onCreated();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to add user');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Add Student / Teacher</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
          <input required type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />

          <select value={role} onChange={(e) => setRole(e.target.value as 'student' | 'teacher' | 'admin')}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500">
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>

          <input placeholder="Role title (e.g. Grade 10 - Section A)" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)}
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
            {saving ? 'Adding…' : 'Add User'}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditStudentModal({
  student,
  departments,
  onClose,
  onSaved,
}: {
  student: Student;
  departments: Department[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(student.full_name);
  const [roleTitle, setRoleTitle] = useState(student.role_title ?? '');
  const [departmentId, setDepartmentId] = useState(student.department_id ?? '');
  const [role, setRole] = useState(student.role);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateEmployee(student.id, {
        full_name: fullName,
        role_title: roleTitle || undefined,
        department_id: departmentId || null,
        role,
      });
      toast.success('Student updated');
      onSaved();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update student');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Edit Student</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* READ-ONLY: Student ID */}
        <div className="mb-3 rounded-lg bg-gray-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Student ID</p>
          <p className="text-sm font-medium text-gray-700">{student.student_code}</p>
        </div>

        {/* READ-ONLY: Email */}
        <div className="mb-4 rounded-lg bg-gray-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Email</p>
          <p className="text-sm font-medium text-gray-700">{student.email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
          <select value={role} onChange={(e) => setRole(e.target.value as typeof role)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500">
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
          <input placeholder="Role title (e.g. 4th year BSIT - 41021)" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500">
            <option value="">Select department</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button type="submit" disabled={saving}
            className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}