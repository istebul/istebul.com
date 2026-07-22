import type { RawBusinessData } from '../types/raw-business-data';

/** EPIC-510 mock dataset — no API / DB. */
export const MOCK_BUSINESS_RAW_DATA: RawBusinessData = Object.freeze({
  asOf: '2026-07-22',
  currency: 'TRY' as const,
  revenueSeries: Object.freeze([
    Object.freeze({ label: 'Gün-1', value: 118_000 }),
    Object.freeze({ label: 'Gün-2', value: 121_500 }),
    Object.freeze({ label: 'Gün-3', value: 119_800 }),
    Object.freeze({ label: 'Gün-4', value: 126_200 }),
    Object.freeze({ label: 'Gün-5', value: 128_400 }),
    Object.freeze({ label: 'Gün-6', value: 130_100 }),
    Object.freeze({ label: 'Gün-7', value: 132_160 })
  ]),
  costSeries: Object.freeze([
    Object.freeze({ label: 'Gün-1', value: 74_000 }),
    Object.freeze({ label: 'Gün-2', value: 75_200 }),
    Object.freeze({ label: 'Gün-3', value: 76_100 }),
    Object.freeze({ label: 'Gün-4', value: 77_800 }),
    Object.freeze({ label: 'Gün-5', value: 79_400 }),
    Object.freeze({ label: 'Gün-6', value: 81_200 }),
    Object.freeze({ label: 'Gün-7', value: 82_900 })
  ]),
  customerCount: 1_842,
  previousCustomerCount: 1_790,
  churnRatePercent: 3.4,
  stockDaysRemaining: 9,
  categoryMargins: Object.freeze([
    Object.freeze({ category: 'Elektronik', marginPercent: 28.4 }),
    Object.freeze({ category: 'Ev & Yaşam', marginPercent: 21.1 }),
    Object.freeze({ category: 'Giyim', marginPercent: 18.6 }),
    Object.freeze({ category: 'Gıda', marginPercent: 12.3 })
  ]),
  cashFlowSeries: Object.freeze([
    Object.freeze({ label: 'Gün-1', value: 42_000 }),
    Object.freeze({ label: 'Gün-2', value: 39_500 }),
    Object.freeze({ label: 'Gün-3', value: 38_200 }),
    Object.freeze({ label: 'Gün-4', value: 36_800 }),
    Object.freeze({ label: 'Gün-5', value: 35_100 }),
    Object.freeze({ label: 'Gün-6', value: 33_400 }),
    Object.freeze({ label: 'Gün-7', value: 31_200 })
  ])
});

export default MOCK_BUSINESS_RAW_DATA;
