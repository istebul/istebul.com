import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { JOURNEY_STEP_LABELS, type JourneyStep } from '@/lib/journey';

interface CxShellProps {
  restaurantName?: string;
  step: JourneyStep;
  children: React.ReactNode;
}

export function CxShell({ restaurantName, step, children }: CxShellProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-10 pt-4 sm:px-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold tracking-tight">GarsonAI</p>
          <p className="truncate text-xs text-muted-foreground">
            {restaurantName || 'Customer Experience'} · {JOURNEY_STEP_LABELS[step]}
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Tema değiştir">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
