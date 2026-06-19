/**
 * Client mirror of outcome-informed scoring (P3).
 */

export function buildSegmentKey(form = {}) {
  const budget = Number(form.budget || 0);
  const budgetBand =
    budget >= 2000000
      ? '2m+'
      : budget >= 1000000
        ? '1m-2m'
        : budget >= 500000
          ? '500k-1m'
          : 'sub500k';

  const body = String(form.body || 'any').toLowerCase().slice(0, 24) || 'any';
  const fuel = String(form.fuel || 'any').toLowerCase().slice(0, 16) || 'any';
  const interest = String(form.interest_type || 'vehicle_offer').toLowerCase().slice(0, 32);

  return `${interest}|${budgetBand}|${body}|${fuel}`;
}

export function describeCalibration({ delta = 0, reason = '' } = {}) {
  if (!delta || reason === 'insufficient_outcome_data') {
    return {
      label: 'Standart skorlama',
      detail:
        'Bu segment için henüz yeterli kapanış verisi yok; skor kural tabanlı hesaplanır. Partner outcome biriktikçe kalibrasyon devreye girer.'
    };
  }

  if (delta > 0) {
    return {
      label: 'Outcome kalibrasyonu (+)',
      detail: `Benzer segmentte partner kapanış oranı güçlü — lead skoru ${delta} puan yukarı kalibre edildi (deterministik).`
    };
  }

  return {
    label: 'Outcome kalibrasyonu (−)',
    detail: `Segment kapanış sinyali zayıf — lead skoru ${Math.abs(delta)} puan aşağı kalibre edildi (konservatif routing).`
  };
}

export function priorityFromScore(score) {
  const s = Number(score || 0);
  if (s >= 150) return 'very_hot';
  if (s >= 100) return 'hot';
  if (s >= 50) return 'warm';
  return 'cold';
}
