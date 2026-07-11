/**
 * GarsonAI production activation entry point.
 */
export {
  resolveProductionEnv,
  validateSupabaseEnvironment,
  validateWhatsAppEnvironment,
  validateOpenAIEnvironment
} from './environment-validator.js';

export { runProductionChecklist } from './activation-checklist.js';
export { getProductionHealth } from './health-service.js';
export { bootstrapProduction } from './production-bootstrap.js';
export { generateDeploymentReport } from './deployment-report.js';

import { runProductionChecklist } from './activation-checklist.js';
import { getProductionHealth } from './health-service.js';
import { bootstrapProduction } from './production-bootstrap.js';
import { generateDeploymentReport } from './deployment-report.js';

/**
 * @param {Record<string, unknown>} [options]
 * @returns {Promise<{
 *   ok: boolean,
 *   checklist: Awaited<ReturnType<typeof runProductionChecklist>>,
 *   health: Awaited<ReturnType<typeof getProductionHealth>>,
 *   bootstrap: Awaited<ReturnType<typeof bootstrapProduction>>,
 *   report: string
 * }>}
 */
export async function activateProduction(options = {}) {
  const checklist = await runProductionChecklist(options);
  const health = await getProductionHealth(options);
  const bootstrap = await bootstrapProduction(options);
  const report = generateDeploymentReport({ checklist, health, bootstrap });

  return {
    ok: checklist.ok && bootstrap.ok,
    checklist,
    health,
    bootstrap,
    report
  };
}
