import { Bell, ChevronDown, Menu, Moon, Search, Sun } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTenant } from '@/contexts/TenantContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface TopNavProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function TopNav({ onMenuClick, showMenuButton = false }: TopNavProps) {
  const { theme, toggleTheme } = useTheme();
  const { tenant, tenants, setRestaurantId } = useTenant();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-6">
      {showMenuButton && (
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Menüyü aç">
          <Menu className="h-5 w-5" />
        </Button>
      )}

      <div className="hidden min-w-0 flex-1 md:block">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Sipariş, masa veya müşteri ara…"
            className={cn(
              'h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm',
              'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
            disabled
            aria-label="Arama (yakında)"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Badge variant="success" className="hidden sm:inline-flex">
          Canlı veri
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="max-w-[220px] justify-between gap-2">
              <span className="truncate text-left">
                <span className="block text-xs text-muted-foreground">Restoran</span>
                <span className="block truncate text-sm font-medium">{tenant?.name ?? 'Restoran seçin'}</span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Şube seç (multi-tenant)</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {tenants.map((item) => (
              <DropdownMenuItem
                key={item.restaurant_id}
                onClick={() => setRestaurantId(item.restaurant_id)}
                className="flex flex-col items-start gap-0.5"
              >
                <span className="font-medium">{item.name}</span>
                <span className="text-xs text-muted-foreground">
                  {item.city} · {item.plan}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Tema değiştir">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Button variant="ghost" size="icon" aria-label="Bildirimler (yakında)" disabled>
          <Bell className="h-4 w-4" />
        </Button>

        <Avatar>
          <AvatarFallback>GA</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
