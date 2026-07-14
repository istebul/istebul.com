import { crmPrompt } from './crm.ts';
import { customerPrompt } from './customer.ts';
import { inventoryPrompt } from './inventory.ts';
import { kitchenPrompt } from './kitchen.ts';
import { menuPrompt } from './menu.ts';
import { paymentsPrompt } from './payments.ts';
import { reservationPrompt } from './reservation.ts';
import type { PromptTemplate } from './types.ts';
import { waiterPrompt } from './waiter.ts';

export type { PromptTemplate, PromptRenderInput } from './types.ts';
export { reservationPrompt } from './reservation.ts';
export { menuPrompt } from './menu.ts';
export { crmPrompt } from './crm.ts';
export { kitchenPrompt } from './kitchen.ts';
export { waiterPrompt } from './waiter.ts';
export { paymentsPrompt } from './payments.ts';
export { customerPrompt } from './customer.ts';
export { inventoryPrompt } from './inventory.ts';

/** Built-in prompt catalog used to seed PromptRegistry. */
export const BUILTIN_PROMPTS: PromptTemplate[] = [
  reservationPrompt,
  menuPrompt,
  crmPrompt,
  kitchenPrompt,
  waiterPrompt,
  paymentsPrompt,
  customerPrompt,
  inventoryPrompt,
];
