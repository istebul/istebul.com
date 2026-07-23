import type { DashboardPipelineStageDefinition } from '../pipeline/DashboardPipeline';
import type { DashboardModel } from '../models/DashboardModel';
import type { DashboardRequest } from '../models/DashboardRequest';

export interface IDashboardPipeline {
  readonly stages: readonly DashboardPipelineStageDefinition[];

  /**
   * İsteği dashboard pipeline aşamalarından geçirir.
   * Implementasyon sonraki PR’lardadır.
   */
  run(request: DashboardRequest): Promise<DashboardModel>;
}
