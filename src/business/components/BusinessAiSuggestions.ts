import type { BusinessAiSuggestionMock } from '../types/dashboard-mock';

export interface BusinessAiSuggestionsProps {
  items: readonly BusinessAiSuggestionMock[];
  title?: string;
}

export function createBusinessAiSuggestionsElement(props: BusinessAiSuggestionsProps): HTMLElement {
  const section = document.createElement('section');
  section.className = 'ib-biz-panel';
  section.setAttribute('aria-labelledby', 'business-ai-suggestions-title');

  const heading = document.createElement('h2');
  heading.className = 'ib-biz-panel__title';
  heading.id = 'business-ai-suggestions-title';
  heading.textContent = props.title ?? 'AI Önerileri';

  const note = document.createElement('p');
  note.className = 'ib-biz-panel__note';
  note.textContent = 'Placeholder — canlı AI bağlantısı sonraki sürümlerde eklenecek.';

  const list = document.createElement('ul');
  list.className = 'ib-biz-ai-list';

  for (const item of props.items) {
    const li = document.createElement('li');
    li.className = 'ib-biz-ai-list__item';
    li.dataset.suggestionId = item.id;

    const title = document.createElement('h3');
    title.className = 'ib-biz-ai-list__title';
    title.textContent = item.title;

    const body = document.createElement('p');
    body.className = 'ib-biz-ai-list__body';
    body.textContent = item.body;

    li.append(title, body);
    list.appendChild(li);
  }

  section.append(heading, note, list);
  return section;
}

export default createBusinessAiSuggestionsElement;
