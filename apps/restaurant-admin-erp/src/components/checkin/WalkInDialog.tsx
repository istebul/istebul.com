import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface WalkInDialogProps {
  open: boolean;
  salons: string[];
  busy?: boolean;
  onClose: () => void;
  onSubmit: (input: {
    customerName: string;
    phone?: string;
    guestCount: number;
    preferredSalon?: string;
    notes?: string;
  }) => Promise<void>;
}

export function WalkInDialog({ open, salons, busy, onClose, onSubmit }: WalkInDialogProps) {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [guestCount, setGuestCount] = useState('2');
  const [preferredSalon, setPreferredSalon] = useState('');
  const [notes, setNotes] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const reset = () => {
    setCustomerName('');
    setPhone('');
    setGuestCount('2');
    setPreferredSalon('');
    setNotes('');
    setLocalError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setLocalError(null);
    try {
      await onSubmit({
        customerName,
        phone: phone || undefined,
        guestCount: Number(guestCount),
        preferredSalon: preferredSalon || undefined,
        notes: notes || undefined,
      });
      handleClose();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Walk-in oluşturulamadı.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Walk-in müşteri</DialogTitle>
          <DialogDescription>
            Müşteri kaydı (telefon varsa) + bekleme listesine eklenir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground" htmlFor="walkin-name">
              Misafir adı
            </label>
            <Input
              id="walkin-name"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Ad Soyad"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground" htmlFor="walkin-phone">
              Telefon
            </label>
            <Input
              id="walkin-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+90…"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground" htmlFor="walkin-guests">
              Kişi sayısı
            </label>
            <Input
              id="walkin-guests"
              type="number"
              min={1}
              value={guestCount}
              onChange={(event) => setGuestCount(event.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground" htmlFor="walkin-salon">
              Tercih edilen salon
            </label>
            <select
              id="walkin-salon"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={preferredSalon}
              onChange={(event) => setPreferredSalon(event.target.value)}
            >
              <option value="">Fark etmez</option>
              {salons.map((salon) => (
                <option key={salon} value={salon}>
                  {salon}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground" htmlFor="walkin-notes">
              Not
            </label>
            <Input
              id="walkin-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Özel istek…"
            />
          </div>
          {localError ? <p className="text-sm text-destructive">{localError}</p> : null}
          <Button className="w-full" disabled={busy} onClick={() => void handleSubmit()}>
            Kuyruğa ekle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
