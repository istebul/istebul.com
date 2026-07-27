import type { BusinessRuntime } from './BusinessRuntime';
import type { BusinessStudioProject } from '../studio';

export interface BusinessWorkspaceState {
  authenticated: boolean;
  userId: string | null;
  businessId: string | null;
  projects: BusinessStudioProject[];
  error: string | null;
}

export async function loadBusinessWorkspace(
  runtime: BusinessRuntime
): Promise<BusinessWorkspaceState> {
  const {
    data: { session },
    error: sessionError
  } = await runtime.client.auth.getSession();

  if (sessionError) {
    return {
      authenticated: false,
      userId: null,
      businessId: null,
      projects: [],
      error: sessionError.message
    };
  }

  const user = session?.user;

  if (!user) {
    return {
      authenticated: false,
      userId: null,
      businessId: null,
      projects: [],
      error: null
    };
  }

  const { data: membership, error: membershipError } = await runtime.client
    .from('business_users')
    .select('business_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return {
      authenticated: true,
      userId: user.id,
      businessId: null,
      projects: [],
      error: membershipError.message
    };
  }

  const businessId =
    typeof membership?.business_id === 'string'
      ? membership.business_id
      : null;

  if (!businessId) {
    return {
      authenticated: true,
      userId: user.id,
      businessId: null,
      projects: [],
      error: null
    };
  }

  try {
    const projects = await runtime.studio.listProjects(businessId);

    return {
      authenticated: true,
      userId: user.id,
      businessId,
      projects,
      error: null
    };
  } catch (error) {
    return {
      authenticated: true,
      userId: user.id,
      businessId,
      projects: [],
      error:
        error instanceof Error
          ? error.message
          : 'Business projeleri yüklenemedi.'
    };
  }
}
