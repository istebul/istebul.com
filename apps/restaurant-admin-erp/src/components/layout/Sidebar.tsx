import { motion } from 'framer-motion';
import {
  BarChart3,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ERP_NAV_ITEMS } from '@/data/mock-data';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  Wallet,
  BarChart3,
  Settings,
};

interface SidebarProps {
  activeId?: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ activeId = 'dashboard', collapsed = false, onNavigate }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground',
        collapsed ? 'w-[72px]' : 'w-64',
      )}
      aria-label="ERP menüsü"
    >
      <div className={cn('flex items-center gap-3 px-4 py-5', collapsed && 'justify-center px-2')}>
        <img
          src="/assets/brand/istebul-icon.svg"
          alt=""
          width={32}
          height={32}
          className="rounded-md"
        />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">GarsonAI ERP</p>
            <p className="truncate text-xs text-sidebar-foreground/70">Enterprise Admin</p>
          </div>
        )}
      </div>

      <Separator className="bg-sidebar-border" />

      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="space-y-1">
          {ERP_NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.icon];
            const isActive = item.id === activeId;
            const isDisabled = 'disabled' in item && item.disabled;

            return (
              <Button
                key={item.id}
                variant="ghost"
                disabled={isDisabled}
                className={cn(
                  'w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
                  collapsed && 'justify-center px-0',
                  isActive && 'bg-sidebar-accent text-white',
                  isDisabled && 'opacity-50',
                )}
                onClick={onNavigate}
                asChild={!isDisabled && item.href !== '#'}
              >
                {isDisabled || item.href === '#' ? (
                  <span className="flex w-full items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {!collapsed && (
                      <>
                        <span className="truncate">{item.label}</span>
                        <Badge variant="secondary" className="ml-auto text-[10px]">
                          Yakında
                        </Badge>
                      </>
                    )}
                  </span>
                ) : (
                  <a href={item.href} className="flex w-full items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </a>
                )}
              </Button>
            );
          })}
        </nav>
      </ScrollArea>

      {!collapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border-t border-sidebar-border p-4"
        >
          <p className="text-xs text-sidebar-foreground/60">P7-A · Mock ERP altyapısı</p>
          <p className="mt-1 text-xs text-sidebar-foreground/40">Production panelden bağımsız</p>
        </motion.div>
      )}
    </aside>
  );
}
