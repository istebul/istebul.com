import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  SupabaseBusinessStudioProvider,
  type BusinessStudioProvider
} from '../studio';
import {
  SupabaseBusinessDocumentAnalysisProvider,
  SupabaseBusinessDocumentUploadProvider
} from '../document-intelligence/providers/supabase';

type PublicEnv = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

declare global {
  interface Window {
    __ENV__?: PublicEnv;
    ENV?: PublicEnv;
  }
}

export interface BusinessRuntime {
  client: SupabaseClient;
  studio: BusinessStudioProvider;
  documents: SupabaseBusinessDocumentUploadProvider;
  documentAnalyses: SupabaseBusinessDocumentAnalysisProvider;
}

function readPublicEnv(): PublicEnv {
  if (typeof window === 'undefined') return {};

  return {
    SUPABASE_URL:
      window.__ENV__?.SUPABASE_URL ??
      window.ENV?.SUPABASE_URL,
    SUPABASE_ANON_KEY:
      window.__ENV__?.SUPABASE_ANON_KEY ??
      window.ENV?.SUPABASE_ANON_KEY
  };
}

export function createBusinessRuntime(): BusinessRuntime | null {
  const env = readPublicEnv();

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return null;
  }

  const client = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  return {
    client,
    studio: new SupabaseBusinessStudioProvider(client),
    documents: new SupabaseBusinessDocumentUploadProvider(client),
    documentAnalyses:
      new SupabaseBusinessDocumentAnalysisProvider(client)
  };
}
