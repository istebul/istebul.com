import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getErpActionStatuses, getOrderStatusLabel } from '@/lib/order-status';

interface OrderStatusActionsProps {
  status: string;
  isUpdating: boolean;
  onChange: (status: string) => Promise<void>;
}

export function OrderStatusActions({ status, isUpdating, onChange }: OrderStatusActionsProps) {
  const actions = getErpActionStatuses(status);

  if (!actions.length) {
    return <p className="text-sm text-muted-foreground">Bu sipariş için durum güncellemesi yok.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((nextStatus) => (
        <Button
          key={nextStatus}
          variant={nextStatus === 'cancelled' ? 'outline' : 'default'}
          size="sm"
          disabled={isUpdating}
          onClick={() => void onChange(nextStatus)}
        >
          {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {getOrderStatusLabel(nextStatus)}
        </Button>
      ))}
    </div>
  );
}
