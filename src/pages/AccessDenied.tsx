import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AccessDenied() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <ShieldAlert size={30} className="text-red-500" />
        </div>
        <h1 className="text-xl font-extrabold text-gray-900">Access Denied</h1>
        <p className="mt-2 text-sm text-gray-500">
          You do not have administrative clearance or matching roles to access this resource.
          This attempt has been logged under security audit protocols.
        </p>

        <div className="mt-5 rounded-lg bg-gray-50 p-3 text-left text-xs">
          <div className="flex justify-between py-1">
            <span className="text-gray-400">TRIGGER EVENT</span>
            <span className="font-semibold text-red-600">UNAUTHORIZED_ACCESS_ATTEMPT</span>
          </div>
        </div>

        <button
          onClick={() => navigate(isAdmin ? '/admin' : '/me')}
          className="mt-6 w-full rounded-lg bg-ink-900 py-3 text-sm font-semibold text-white hover:bg-ink-800"
        >
          Return to Dashboard Portal
        </button>
      </div>
    </div>
  );
}
