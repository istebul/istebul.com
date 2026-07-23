<<<<<<< HEAD
import { createBusinessAdvisorPanelElement } from '../components/BusinessAdvisorPanel';
import { runBusinessIntelligenceEngine } from '../intelligence/pipeline/BusinessIntelligenceEngine';
import type { BusinessAdvisorResult } from '../intelligence/types/advisor-result';

export interface BusinessAiAdvisorPageOptions {
  advisor?: BusinessAdvisorResult;
}

export function createBusinessAiAdvisorPageElement(
  options: BusinessAiAdvisorPageOptions = {}
): HTMLElement {
  const advisor = options.advisor ?? runBusinessIntelligenceEngine();
  const root = document.createElement('div');
  root.className = 'ib-biz-page';
  root.dataset.businessPage = 'danisman';

  const intro = document.createElement('p');
  intro.className = 'ib-biz-page__lead';
  intro.textContent =
    'Yapay Zekâ Danışmanı foundation katmanı aktif. Öneriler mock Intelligence Engine çıktısıdır; API bağlantısı yoktur.';

  root.append(intro, createBusinessAdvisorPanelElement({ advisor, compact: false }));
=======
import { createBusinessEmptyStateElement } from '../components/BusinessEmptyState';

export function createBusinessAiAdvisorPageElement(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'ib-biz-page';
  root.dataset.businessPage = 'danisman';
  root.appendChild(
    createBusinessEmptyStateElement({
      title: 'Yapay Zekâ Danışmanı yakında',
      description:
        'Danışman sohbet yüzeyi MVP iskeletinde yer tutucu olarak hazır. AI proxy bağlantısı bu sprintte açılmaz.',
      actionLabel: 'Dashboard’a dön',
      actionHref: '/business/'
    })
  );
>>>>>>> origin/main
  return root;
}

export function mountBusinessAiAdvisorPage(container: HTMLElement): void {
  container.replaceChildren(createBusinessAiAdvisorPageElement());
}

export default mountBusinessAiAdvisorPage;
