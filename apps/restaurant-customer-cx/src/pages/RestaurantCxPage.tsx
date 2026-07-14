import { ConciergeStep } from '@/components/cx/ConciergeStep';
import { ConfirmationStep } from '@/components/cx/ConfirmationStep';
import { CxEmpty, CxError, CxLoading } from '@/components/cx/CxStates';
import { CxShell } from '@/components/cx/CxShell';
import { GuaranteeStep } from '@/components/cx/GuaranteeStep';
import { LandingStep } from '@/components/cx/LandingStep';
import { MenuStep } from '@/components/cx/MenuStep';
import { PreorderStep } from '@/components/cx/PreorderStep';
import { SummaryStep } from '@/components/cx/SummaryStep';
import {
  DateStep,
  GuestsStep,
  SalonStep,
  TableStep,
  TimeStep,
} from '@/components/cx/WizardSteps';
import { useRestaurantCx } from '@/hooks/useRestaurantCx';

interface RestaurantCxPageProps {
  slug: string;
}

export function RestaurantCxPage({ slug }: RestaurantCxPageProps) {
  const cx = useRestaurantCx(slug);

  if (!slug) {
    return (
      <CxShell step="landing">
        <CxEmpty
          title="Restoran seçilmedi"
          description="Adres /r/{restaurantSlug} biçiminde olmalıdır."
        />
      </CxShell>
    );
  }

  if (cx.isLoading && !cx.bundle) {
    return (
      <CxShell step={cx.step}>
        <CxLoading label="Restoran deneyimi yükleniyor…" />
      </CxShell>
    );
  }

  if (cx.error || !cx.bundle || !cx.guarantee) {
    return (
      <CxShell step={cx.step}>
        <CxError message={cx.error || 'Restoran bulunamadı.'} onRetry={() => void cx.reload()} />
      </CxShell>
    );
  }

  const selectedTable =
    cx.bundle.tables.find((table) => table.id === cx.draft.tableId) || null;

  return (
    <CxShell restaurantName={cx.bundle.restaurant.name} step={cx.step}>
      {cx.step === 'landing' ? (
        <LandingStep restaurant={cx.bundle.restaurant} onContinue={cx.goNext} />
      ) : null}

      {cx.step === 'concierge' ? (
        <ConciergeStep restaurantName={cx.bundle.restaurant.name} onContinue={cx.goNext} />
      ) : null}

      {cx.step === 'date' ? (
        <DateStep
          draft={cx.draft}
          updateDraft={cx.updateDraft}
          onContinue={cx.goNext}
          onBack={cx.goBack}
        />
      ) : null}

      {cx.step === 'time' ? (
        <TimeStep
          draft={cx.draft}
          updateDraft={cx.updateDraft}
          onContinue={cx.goNext}
          onBack={cx.goBack}
        />
      ) : null}

      {cx.step === 'guests' ? (
        <GuestsStep
          draft={cx.draft}
          updateDraft={cx.updateDraft}
          onContinue={cx.goNext}
          onBack={cx.goBack}
        />
      ) : null}

      {cx.step === 'salon' ? (
        <SalonStep
          draft={cx.draft}
          updateDraft={cx.updateDraft}
          salons={cx.bundle.salons}
          onContinue={cx.goNext}
          onBack={cx.goBack}
        />
      ) : null}

      {cx.step === 'table' ? (
        <TableStep
          draft={cx.draft}
          updateDraft={cx.updateDraft}
          tables={cx.availableTables}
          realtimeStatus={cx.realtimeStatus}
          onContinue={cx.goNext}
          onBack={cx.goBack}
        />
      ) : null}

      {cx.step === 'menu' ? (
        <MenuStep
          categories={cx.bundle.categories}
          items={cx.bundle.menuItems}
          favorites={cx.draft.favorites}
          onFavorite={cx.toggleFavorite}
          onAdd={cx.addToCart}
          onContinue={cx.goNext}
          onBack={cx.goBack}
          onSkip={() => cx.setStep('guarantee')}
        />
      ) : null}

      {cx.step === 'preorder' ? (
        <PreorderStep
          cart={cx.draft.cart}
          total={cx.cartTotal}
          onQty={cx.updateCartQty}
          onNote={cx.updateCartNote}
          onContinue={cx.goNext}
          onBack={cx.goBack}
        />
      ) : null}

      {cx.step === 'guarantee' ? (
        <GuaranteeStep
          guarantee={cx.guarantee}
          onContinue={cx.goNext}
          onBack={cx.goBack}
        />
      ) : null}

      {cx.step === 'summary' ? (
        <SummaryStep
          draft={cx.draft}
          table={selectedTable}
          guarantee={cx.guarantee}
          cart={cx.draft.cart}
          cartTotal={cx.cartTotal}
          isSubmitting={cx.isSubmitting}
          error={cx.submitError}
          updateDraft={cx.updateDraft}
          onBack={cx.goBack}
          onSubmit={() => {
            void cx.submit();
          }}
        />
      ) : null}

      {cx.step === 'confirmation' ? (
        <ConfirmationStep
          reservationId={cx.reservationId}
          restaurantName={cx.bundle.restaurant.name}
          onRestart={() => {
            cx.setStep('landing');
          }}
        />
      ) : null}
    </CxShell>
  );
}
