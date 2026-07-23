import { cn } from '@/lib/utils';

interface SalonTabsProps {
  salons: string[];
  activeSalon: string | null;
  onChange: (salon: string) => void;
}

export function SalonTabs({ salons, activeSalon, onChange }: SalonTabsProps) {
  if (!salons.length) return null;

  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="Salonlar"
    >
      {salons.map((salon) => {
        const isActive = salon === activeSalon;
        return (
          <button
            key={salon}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(salon)}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:bg-muted',
            )}
          >
            {salon}
          </button>
        );
      })}
    </div>
  );
}
