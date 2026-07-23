import type { BusinessModule } from '../types/business-module';

export interface BusinessModuleCardProps {
  module: BusinessModule;
}

export function createBusinessModuleCardElement(props: BusinessModuleCardProps): HTMLElement {
  const { module } = props;
  const article = document.createElement('article');
  article.className = 'ib-business-module-card';
  article.setAttribute('data-business-module', module.id);

  const title = document.createElement('h3');
  title.className = 'ib-business-module-card__title';
  title.textContent = module.title;

  const description = document.createElement('p');
  description.className = 'ib-business-module-card__description';
  description.textContent = module.description;

  const status = document.createElement('span');
  status.className = 'ib-business-module-card__status';
  status.textContent = module.statusLabel;

  article.append(title, description, status);
  return article;
}

export default createBusinessModuleCardElement;
