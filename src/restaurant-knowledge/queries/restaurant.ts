import type { Restaurant } from '../entities/restaurant.ts';
import type { BusinessHours } from '../entities/business-hours.ts';
import type { Holiday } from '../entities/holiday.ts';
import type { RestaurantSnapshot } from '../types/snapshot.ts';

export function getRestaurant(snapshot: RestaurantSnapshot): Restaurant {
  return snapshot.restaurant;
}

export function findRestaurantBySlug(
  restaurants: Restaurant[],
  slug: string,
): Restaurant | undefined {
  const key = slug.trim().toLowerCase();
  return restaurants.find((r) => (r.slug || '').toLowerCase() === key);
}

export function getBusinessHoursForDay(
  hours: BusinessHours[],
  day: number,
): BusinessHours | undefined {
  return hours.find((h) => h.day === day);
}

export function isClosedOnDate(
  snapshot: RestaurantSnapshot,
  dateIso: string,
): { closed: boolean; holiday?: Holiday; hours?: BusinessHours } {
  const holiday = snapshot.holidays.find((h) => h.date === dateIso);
  if (holiday?.closed) {
    return { closed: true, holiday };
  }
  const day = new Date(`${dateIso}T12:00:00`).getDay();
  const hours = getBusinessHoursForDay(snapshot.businessHours, day);
  if (hours?.closed) {
    return { closed: true, hours };
  }
  return { closed: false, holiday, hours };
}
