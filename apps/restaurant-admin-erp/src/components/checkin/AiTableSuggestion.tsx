import { Sparkles } from 'lucide-react';
import type { CheckinTableOption } from '@/data/checkin-api';
import { suggestTablesForParty } from '@/data/checkin-api';

interface AiTableSuggestionProps {
  tables: CheckinTableOption[];
  guestCount: number;
  preferredSalon?: string | null;
  onPick?: (tableId: string) => void;
}

export function AiTableSuggestion({
  tables,
  guestCount,
  preferredSalon,
  onPick,
}: AiTableSuggestionProps) {
  const suggestions = suggestTablesForParty(tables, guestCount, preferredSalon);

  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="h-4 w-4" aria-hidden />
        AI masa önerisi
      </h3>
      <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm">
        <p className="mb-2 text-muted-foreground">
          Placeholder — kapasite ve salon tercihine göre sıralı öneri. İleride GarsonAI ranking
          modeli buraya bağlanacak.
        </p>
        {suggestions.length === 0 ? (
          <p className="text-muted-foreground">Uygun boş masa bulunamadı.</p>
        ) : (
          <ul className="space-y-1.5">
            {suggestions.map((table, index) => (
              <li key={table.id}>
                <button
                  type="button"
                  className="w-full rounded-md border bg-background px-3 py-2 text-left hover:bg-muted"
                  onClick={() => onPick?.(table.id)}
                >
                  <span className="font-medium">
                    #{index + 1} {table.name}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {table.salon} · {table.capacity} kişi
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
