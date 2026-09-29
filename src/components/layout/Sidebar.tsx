import { NavLink } from 'react-router-dom';
import {
  LayoutGrid,
  Users,
  CalendarCheck,
  Building2,
  FileText,
  Settings,
  ShieldCheck,
  ClipboardList,
  Fingerprint,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const adminNav: NavItem[] = [
  { to: '/admin', label: 'Overview', icon: <LayoutGrid size={18} /> },
  { to: '/admin/employees', label: 'Student Directory', icon: <Users size={18} /> },
  { to: '/admin/attendance', label: 'Attendance Log', icon: <CalendarCheck size={18} /> },
  { to: '/admin/departments', label: 'Departments', icon: <Building2 size={18} /> },
  { to: '/admin/leave', label: 'Absence Requests', icon: <ClipboardList size={18} /> },
  { to: '/admin/reports', label: 'Reports & Exports', icon: <FileText size={18} /> },
  { to: '/admin/settings', label: 'Settings', icon: <Settings size={18} /> },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: <ShieldCheck size={18} /> },
];

const employeeNav: NavItem[] = [
  { to: '/me', label: 'My Attendance', icon: <CalendarCheck size={18} /> },
  { to: '/terminal', label: 'Check In / Out', icon: <Fingerprint size={18} /> },
  { to: '/me/leave', label: 'Absence Requests', icon: <ClipboardList size={18} /> },
  { to: '/me/settings', label: 'Credential Settings', icon: <Settings size={18} /> },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isAdmin } = useAuth();
  const items = isAdmin ? adminNav : employeeNav;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-ink-900 px-4 py-6 transition-transform duration-200 ease-in-out
        lg:static lg:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="mb-8 flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5" title="Bestlink College of the Philippines">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
              <Fingerprint size={20} />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight text-white">BCP</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-400">
                {isAdmin ? 'Secure System' : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 lg:hidden" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin' || item.to === '/me'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}