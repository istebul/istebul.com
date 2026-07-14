import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CxEmpty } from '@/components/cx/CxStates';
import type { CxTable } from '@/data/cx-api';
import type { JourneyDraft } from '@/hooks/useRestaurantCx';
import { cn } from '@/lib/utils';

const TIME_SLOTS = ['12:00', '13:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

interface CommonProps {
  draft: JourneyDraft;
  updateDraft: (patch: Partial<JourneyDraft>) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function DateStep({ draft, updateDraft, onContinue, onBack }: CommonProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tarih</CardTitle>
        <CardDescription>Rezervasyon gününü seçin</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="date"
          value={draft.date}
          onChange={(event) => updateDraft({ date: event.target.value })}
        />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onBack}>
            Geri
          </Button>
          <Button className="flex-1" disabled={!draft.date} onClick={onContinue}>
            Saat
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function TimeStep({ draft, updateDraft, onContinue, onBack }: CommonProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Saat</CardTitle>
        <CardDescription>Uygun zaman dilimini seçin</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => updateDraft({ time: slot })}
              className={cn(
                'rounded-xl border px-3 py-3 text-sm font-medium',
                draft.time === slot
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-card hover:bg-muted',
              )}
            >
              {slot}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onBack}>
            Geri
          </Button>
          <Button className="flex-1" disabled={!draft.time} onClick={onContinue}>
            Kişi sayısı
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function GuestsStep({ draft, updateDraft, onContinue, onBack }: CommonProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Kişi sayısı</CardTitle>
        <CardDescription>Masaya kaç kişi geleceksiniz?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => updateDraft({ guestCount: Math.max(1, draft.guestCount - 1) })}
          >
            −
          </Button>
          <span className="font-display text-3xl font-semibold">{draft.guestCount}</span>
          <Button
            variant="outline"
            onClick={() => updateDraft({ guestCount: Math.min(20, draft.guestCount + 1) })}
          >
            +
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onBack}>
            Geri
          </Button>
          <Button className="flex-1" onClick={onContinue}>
            Salon
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SalonStep({
  draft,
  updateDraft,
  onContinue,
  onBack,
  salons,
}: CommonProps & { salons: string[] }) {
  if (salons.length === 0) {
    return (
      <div className="space-y-3">
        <CxEmpty title="Salon yok" description="Bu restoran için henüz salon/masa planı yok." />
        <Button variant="outline" className="w-full" onClick={onBack}>
          Geri
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Salon</CardTitle>
        <CardDescription>Oturmak istediğiniz alanı seçin</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          {salons.map((salon) => (
            <button
              key={salon}
              type="button"
              onClick={() => updateDraft({ salon, tableId: '' })}
              className={cn(
                'rounded-xl border px-4 py-3 text-left text-sm font-medium',
                draft.salon === salon
                  ? 'border-primary bg-primary/10'
                  : 'bg-card hover:bg-muted',
              )}
            >
              {salon}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onBack}>
            Geri
          </Button>
          <Button className="flex-1" disabled={!draft.salon} onClick={onContinue}>
            Masa
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function TableStep({
  draft,
  updateDraft,
  onContinue,
  onBack,
  tables,
  realtimeStatus,
}: CommonProps & { tables: CxTable[]; realtimeStatus: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Masa seçimi</CardTitle>
        <CardDescription>
          Yalnızca uygun masalar · realtime: {realtimeStatus}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {tables.length === 0 ? (
          <CxEmpty
            title="Uygun masa yok"
            description="Seçili salon ve kişi sayısına göre boş masa bulunamadı. Filtreleri değiştirin."
          />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {tables.map((table) => (
              <button
                key={table.id}
                type="button"
                onClick={() => updateDraft({ tableId: table.id })}
                className={cn(
                  'rounded-xl border px-3 py-4 text-left',
                  draft.tableId === table.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-card hover:bg-muted',
                )}
              >
                <p className="font-medium">{table.name}</p>
                <p className="text-xs opacity-80">
                  {table.salon} · {table.capacity} kişi
                </p>
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onBack}>
            Geri
          </Button>
          <Button className="flex-1" disabled={!draft.tableId} onClick={onContinue}>
            Menü
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
