export interface BusinessEmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function createBusinessEmptyStateElement(props: BusinessEmptyStateProps): HTMLElement {
  const section = document.createElement('section');
  section.className = 'ib-biz-empty';
  section.setAttribute('aria-live', 'polite');

  const title = document.createElement('h2');
  title.className = 'ib-biz-empty__title';
  title.textContent = props.title;

  const description = document.createElement('p');
  description.className = 'ib-biz-empty__description';
  description.textContent = props.description;

  section.append(title, description);

  if (props.actionLabel && props.actionHref) {
    const action = document.createElement('a');
    action.className = 'ib-biz-empty__action';
    action.href = props.actionHref;
    action.textContent = props.actionLabel;
    section.appendChild(action);
  }

  return section;
}

export default createBusinessEmptyStateElement;
