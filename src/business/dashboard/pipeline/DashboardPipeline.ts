/**
 * Dashboard pipeline aşama tanımları.
 */

import type { DashboardStage } from '../models/DashboardStage';

export interface DashboardPipelineStageDefinition {
  id: DashboardStage;
  name: string;
  description: string;
  order: number;
}

const STAGES: DashboardPipelineStageDefinition[] = [
  {
    id: 'dashboard-dogrulama',
    name: 'Dashboard Validation',
    description:
      'İstek ve kaynak (Analysis/Decision/Report) doğrulaması (implementasyon sonraki PR).',
    order: 1
  },
  {
    id: 'widget-derleme',
    name: 'Widget Assembly',
    description: 'IWidgetBuilder ile widget tanımları derlenir.',
    order: 2
  },
  {
    id: 'yerlesim-cozumu',
    name: 'Layout Resolution',
    description: 'ILayoutResolver ile DashboardLayout çözülür.',
    order: 3
  },
  {
    id: 'filtre-cozumu',
    name: 'Filter Resolution',
    description: 'IFilterResolver ile filtreler çözülür.',
    order: 4
  },
  {
    id: 'dashboard-birlestirme',
    name: 'Dashboard Composition',
    description: 'IDashboardComposer ile DashboardModel taslağı birleştirilir.',
    order: 5
  },
  {
    id: 'dashboard-derleme',
    name: 'Dashboard Assembly',
    description: 'Nihai DashboardModel paketlenir ve döndürülür.',
    order: 6
  }
];

export const DASHBOARD_PIPELINE_STAGES: readonly DashboardPipelineStageDefinition[] =
  Object.freeze(STAGES);

export const DASHBOARD_PIPELINE_STAGE_COUNT = DASHBOARD_PIPELINE_STAGES.length;

export function getDashboardPipelineStage(
  id: DashboardStage
): DashboardPipelineStageDefinition | undefined {
  return DASHBOARD_PIPELINE_STAGES.find((stage) => stage.id === id);
}

export function listDashboardPipelineStages(): readonly DashboardPipelineStageDefinition[] {
  return DASHBOARD_PIPELINE_STAGES;
}
