import { TABLE_STATUSES, TABLE_STATUS_LABELS, TABLE_STATUS_STYLES } from '@/lib/table-status';

export function TableStatusLegend() {
  return (
    <div className="flex flex-wrap gap-2">
      {TABLE_STATUSES.map((status) => (
        <span
          key={status}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${TABLE_STATUS_STYLES[status].badge}`}
        >
          <span className={`h-2 w-2 rounded-full ${TABLE_STATUS_STYLES[status].accent}`} />
          {TABLE_STATUS_LABELS[status]}
        </span>
      ))}
    </div>
  );
}
