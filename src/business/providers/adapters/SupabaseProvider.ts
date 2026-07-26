import type { BusinessProviderAdapter } from '../../types/business-provider';
import type { RawBusinessData } from '../../intelligence/types/raw-business-data';
import type { ProviderCapabilities } from '../models/provider-capabilities';
import type { ProviderStatus } from '../models/provider-status';
import { getProviderCapabilities } from '../core/ProviderCapabilities';
import { createProviderStatus } from '../utils/provider-validator';

type PublicEnv = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

type SupabaseProviderOptions = {
  businessId?: string;
  fetchImpl?: typeof fetch;
  env?: PublicEnv;
};

type BusinessSnapshotRow = Partial<RawBusinessData> & {
  business_id?: string;
  snapshot?: RawBusinessData;
};

function readPublicEnv(): PublicEnv {
  if (typeof window === 'undefined') return {};

  const runtimeEnv = (
    window as typeof window & {
      __env?: PublicEnv;
    }
  ).__env;

  return runtimeEnv ?? {};
}

function normalizeBaseUrl(value: string | undefined): string {
  return String(value ?? '').trim().replace(/\/$/, '');
}

function readBusinessId(explicitBusinessId?: string): string {
  if (explicitBusinessId) return explicitBusinessId;

  if (typeof window === 'undefined') return '';

  const params = new URLSearchParams(window.location.search);

  return (
    params.get('business_id') ??
    window.localStorage.getItem('istebul_business_id') ??
    ''
  ).trim();
}

export class SupabaseProvider implements BusinessProviderAdapter {
  readonly kind = 'supabase' as const;

  private readonly baseUrl: string;
  private readonly anonKey: string;
  private readonly businessId: string;
  private readonly fetchImpl: typeof fetch;
  private snapshot: RawBusinessData | null = null;
  private errorMessage = '';

  constructor(options: SupabaseProviderOptions = {}) {
    const env = options.env ?? readPublicEnv();

    this.baseUrl = normalizeBaseUrl(env.SUPABASE_URL);
    this.anonKey = String(env.SUPABASE_ANON_KEY ?? '').trim();
    this.businessId = readBusinessId(options.businessId);
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  getCapabilities(): ProviderCapabilities {
    return getProviderCapabilities('supabase');
  }

  getStatus(): ProviderStatus {
    if (this.snapshot) {
      return createProviderStatus({
        kind: this.kind,
        code: 'ready',
        ready: true,
        message: 'Supabase Business snapshot hazır.'
      });
    }

    if (!this.baseUrl || !this.anonKey) {
      return createProviderStatus({
        kind: this.kind,
        code: 'unavailable',
        ready: false,
        message: 'SUPABASE_URL veya SUPABASE_ANON_KEY eksik.'
      });
    }

    if (!this.businessId) {
      return createProviderStatus({
        kind: this.kind,
        code: 'unavailable',
        ready: false,
        message: 'Business kimliği bulunamadı.'
      });
    }

    if (this.errorMessage) {
      return createProviderStatus({
        kind: this.kind,
        code: 'unavailable',
        ready: false,
        message: this.errorMessage
      });
    }

    return createProviderStatus({
      kind: this.kind,
      code: 'unavailable',
      ready: false,
      message: 'Supabase Business snapshot henüz yüklenmedi.'
    });
  }

  async loadSnapshot(): Promise<RawBusinessData> {
    if (!this.baseUrl || !this.anonKey) {
      throw new Error('SUPABASE_URL veya SUPABASE_ANON_KEY eksik.');
    }

    if (!this.businessId) {
      throw new Error('Business kimliği bulunamadı.');
    }

    const endpoint =
      `${this.baseUrl}/rest/v1/business_snapshots` +
      `?business_id=eq.${encodeURIComponent(this.businessId)}` +
      '&select=snapshot&limit=1';

    const response = await this.fetchImpl(endpoint, {
      headers: {
        apikey: this.anonKey,
        Authorization: `Bearer ${this.anonKey}`,
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      const body = await response.text();
      this.errorMessage = `Supabase Business verisi alınamadı (${response.status}): ${body}`;
      throw new Error(this.errorMessage);
    }

    const rows = (await response.json()) as BusinessSnapshotRow[];
    const snapshot = rows[0]?.snapshot;

    if (!snapshot) {
      this.errorMessage = 'Bu işletme için Business snapshot bulunamadı.';
      throw new Error(this.errorMessage);
    }

    this.snapshot = Object.freeze(snapshot);
    this.errorMessage = '';

    return this.snapshot;
  }

  getSnapshot(): RawBusinessData {
    if (!this.snapshot) {
      throw new Error('Supabase snapshot yüklenmedi. Önce loadSnapshot() çağrılmalı.');
    }

    return this.snapshot;
  }
}

export function createSupabaseProvider(
  options: SupabaseProviderOptions = {}
): SupabaseProvider {
  return new SupabaseProvider(options);
}

export default SupabaseProvider;
