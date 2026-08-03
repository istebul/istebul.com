import type { SupabaseClient } from '@supabase/supabase-js';

import type { BusinessAnalysisResult } from '../../models/BusinessAnalysisResult';

export interface SaveBusinessDocumentAnalysisInput {
  businessId: string;
  documentId: string;
  userId: string;
  analysisType: string;
  result: BusinessAnalysisResult;
}

export interface StoredBusinessDocumentAnalysis {
  id: string;
  businessId: string;
  documentId: string;
  analysisType: string;
  category: string;
  score: number;
  summary: string;
  kpis: BusinessAnalysisResult['kpis'];
  insights: BusinessAnalysisResult['insights'];
  recommendations: string[];
  createdAt: string;
}

interface AnalysisRow {
  id: string;
  business_id: string;
  document_id: string;
  analysis_type: string;
  category: string;
  score: number;
  summary: string;
  kpis: BusinessAnalysisResult['kpis'];
  insights: BusinessAnalysisResult['insights'];
  recommendations: string[];
  created_at: string;
}

function mapAnalysisRow(
  row: AnalysisRow
): StoredBusinessDocumentAnalysis {
  return {
    id: row.id,
    businessId: row.business_id,
    documentId: row.document_id,
    analysisType: row.analysis_type,
    category: row.category,
    score: row.score,
    summary: row.summary,
    kpis: row.kpis,
    insights: row.insights,
    recommendations: row.recommendations,
    createdAt: row.created_at
  };
}

export class SupabaseBusinessDocumentAnalysisProvider {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async updateDocumentStatus(
    documentId: string,
    status: 'processing' | 'ready' | 'failed'
  ): Promise<void> {
    const { error } = await this.client
      .from('business_documents')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    if (error) {
      throw new Error(
        `Belge durumu güncellenemedi: ${error.message}`
      );
    }
  }

  async saveAnalysis(
    input: SaveBusinessDocumentAnalysisInput
  ): Promise<StoredBusinessDocumentAnalysis> {
    const now = new Date().toISOString();

    const { data, error } = await this.client
      .from('business_document_analyses')
      .upsert(
        {
          business_id: input.businessId,
          document_id: input.documentId,
          created_by: input.userId,
          analysis_type: input.analysisType,
          category: input.result.category,
          score: input.result.score,
          summary: input.result.summary,
          kpis: input.result.kpis,
          insights: input.result.insights,
          recommendations: input.result.recommendations,
          updated_at: now
        },
        {
          onConflict: 'document_id'
        }
      )
      .select(
        [
          'id',
          'business_id',
          'document_id',
          'analysis_type',
          'category',
          'score',
          'summary',
          'kpis',
          'insights',
          'recommendations',
          'created_at'
        ].join(',')
      )
      .single();

    if (error || !data) {
      throw new Error(
        `Analiz sonucu kaydedilemedi: ${
          error?.message ?? 'Kayıt bulunamadı.'
        }`
      );
    }

    return mapAnalysisRow(data as unknown as AnalysisRow);
  }

  async listByBusiness(
    businessId: string
  ): Promise<StoredBusinessDocumentAnalysis[]> {
    const { data, error } = await this.client
      .from('business_document_analyses')
      .select(
        [
          'id',
          'business_id',
          'document_id',
          'analysis_type',
          'category',
          'score',
          'summary',
          'kpis',
          'insights',
          'recommendations',
          'created_at'
        ].join(',')
      )
      .eq('business_id', businessId)
      .order('created_at', {
        ascending: false
      })
      .limit(20);

    if (error) {
      throw new Error(
        `Geçmiş analizler yüklenemedi: ${error.message}`
      );
    }

    return (data ?? []).map((row) =>
      mapAnalysisRow(row as unknown as AnalysisRow)
    );
  }
}
