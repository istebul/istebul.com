export type BusinessAccessState =
  | 'unauthenticated'
  | 'needs-business'
  | 'ready'
  | 'error';

export interface BusinessAccessResult {
  state: BusinessAccessState;
  userId?: string;
  businessId?: string;
  role?: string;
  error?: string;
}
