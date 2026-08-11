import type { ReactNode } from 'react';

export default function StatCard({
  label,
  value,
  icon,
  badge,
  badgeTone = 'teal',
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  badge?: string;
  badgeTone?: 'teal' | 'green' | 'yellow' | 'red';
}) {
  const badgeClasses: Record<string, string> = {
    teal: 'bg-primary-50 text-primary-700',
    green: 'bg-emerald-50 text-emerald-700',
    yellow: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
        <div className="rounded-lg bg-primary-50 p-2 text-primary-600">{icon}</div>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <span className="text-2xl font-bold text-gray-900 sm:text-3xl">{value}</span>
        {badge && (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClasses[badgeTone]}`}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
