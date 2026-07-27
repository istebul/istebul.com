export type BusinessAccessState =
  | 'unauthenticated'
  | 'needs-business'
  | 'ready';

export interface BusinessAccessResult {
  state: BusinessAccessState;
  userId?: string;
  businessId?: string;
}
