import { Menu, Search, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Topbar({
  title,
  subtitle,
  onMenuClick,
}: {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
}) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-gray-900 sm:text-xl">{title}</h1>
          {subtitle && <p className="hidden truncate text-xs text-gray-500 sm:block sm:text-sm">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="relative hidden md:block">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search records..."
            className="w-56 rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <button className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="Notifications">
          <Bell size={18} />
        </button>

        <div className="hidden items-center gap-2 sm:flex">
          <div className="h-8 w-8 overflow-hidden rounded-full bg-primary-100 text-center text-sm font-semibold leading-8 text-primary-700">
            {profile?.full_name?.charAt(0) ?? '?'}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold leading-tight text-gray-900">{profile?.full_name}</p>
            <p className="text-xs leading-tight text-gray-500">{profile?.role_title || (profile?.role === 'admin' ? 'System Admin' : 'Employee')}</p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
