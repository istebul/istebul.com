import type { Customer } from '../entities/customer.ts';
import type { LoyaltyRule } from '../entities/loyalty-rule.ts';
import type { RestaurantSnapshot } from '../types/snapshot.ts';

export function listCustomers(snapshot: RestaurantSnapshot): Customer[] {
  return snapshot.customers;
}

export function findCustomerByPhone(
  snapshot: RestaurantSnapshot,
  phone: string,
): Customer | undefined {
  const digits = phone.replace(/\D/g, '');
  return snapshot.customers.find(
    (c) => (c.phone || '').replace(/\D/g, '').endsWith(digits.slice(-10)),
  );
}

export function findCustomerById(
  snapshot: RestaurantSnapshot,
  id: string,
): Customer | undefined {
  return snapshot.customers.find((c) => c.id === id);
}

export function listActiveLoyaltyRules(snapshot: RestaurantSnapshot): LoyaltyRule[] {
  return snapshot.loyaltyRules.filter((r) => r.active !== false);
}

export function summarizeCustomerForPrompt(customer: Customer): string {
  const parts = [
    customer.name ? `Ad: ${customer.name}` : null,
    customer.loyaltyTier ? `Tier: ${customer.loyaltyTier}` : null,
    customer.allergies?.length ? `Alerji: ${customer.allergies.join(', ')}` : null,
    customer.dietary?.length ? `Diyet: ${customer.dietary.join(', ')}` : null,
    customer.favorites?.length ? `Favoriler: ${customer.favorites.join(', ')}` : null,
  ].filter(Boolean);
  return parts.join(' | ');
}
