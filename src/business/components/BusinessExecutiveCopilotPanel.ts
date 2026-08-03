import type {
  ExecutiveCopilotAction,
  ExecutiveCopilotPriority,
  ExecutiveCopilotResult,
  ExecutiveCopilotSignal
} from '../executive-copilot';

export interface BusinessExecutiveCopilotPanelProps {
  copilot: ExecutiveCopilotResult;
}

function priorityLabel(
  priority: ExecutiveCopilotPriority
): string {
  if (priority === 'critical') return 'Kritik';
  if (priority === 'high') return 'Yüksek';
  if (priority === 'medium') return 'Orta';
  return 'Düşük';
}

function createSignalCard(
  labelText: string,
  signal: ExecutiveCopilotSignal | undefined,
  emptyText: string
): HTMLElement {
  const article = document.createElement('article');
  article.className = 'ib-biz-copilot-signal';

  const label = document.createElement('span');
  label.className = 'ib-biz-copilot-signal__label';
  label.textContent = labelText;

  const title = document.createElement('strong');
  title.className = 'ib-biz-copilot-signal__title';
  title.textContent = signal?.title ?? emptyText;

  const description = document.createElement('p');
  description.className =
    'ib-biz-copilot-signal__description';
  description.textContent =
    signal?.description ??
    'Bu başlık için yeterli karşılaştırmalı veri bulunmuyor.';

  article.dataset.severity =
    signal?.severity ?? 'low';

  article.append(label, title, description);
  return article;
}

function createActionItem(
  action: ExecutiveCopilotAction,
  index: number
): HTMLElement {
  const item = document.createElement('li');
  item.className = 'ib-biz-copilot-action';
  item.dataset.priority = action.priority;

  const number = document.createElement('span');
  number.className = 'ib-biz-copilot-action__number';
  number.textContent = String(index + 1);

  const body = document.createElement('div');

  const title = document.createElement('strong');
  title.textContent = action.title;

  const description = document.createElement('p');
  description.textContent = action.description;

  const meta = document.createElement('small');
  meta.textContent =
    `${priorityLabel(action.priority)} öncelik · ` +
    action.dueLabel;

  body.append(title, description, meta);
  item.append(number, body);

  return item;
}

export function createBusinessExecutiveCopilotPanelElement(
  props: BusinessExecutiveCopilotPanelProps
): HTMLElement {
  const { copilot } = props;

  const section = document.createElement('section');
  section.className = 'ib-biz-copilot';
  section.dataset.health = copilot.health.status;
  section.setAttribute(
    'aria-labelledby',
    'business-executive-copilot-title'
  );

  const header = document.createElement('header');
  header.className = 'ib-biz-copilot__header';

  const headingWrap = document.createElement('div');

  const eyebrow = document.createElement('p');
  eyebrow.className = 'ib-biz-copilot__eyebrow';
  eyebrow.textContent = 'İSTEBUL Business V8';

  const title = document.createElement('h2');
  title.id = 'business-executive-copilot-title';
  title.className = 'ib-biz-copilot__title';
  title.textContent = 'Executive Copilot';

  const summary = document.createElement('p');
  summary.className = 'ib-biz-copilot__summary';
  summary.textContent = copilot.dailySummary;

  headingWrap.append(eyebrow, title, summary);

  const score = document.createElement('div');
  score.className = 'ib-biz-copilot-score';

  const scoreValue = document.createElement('strong');
  scoreValue.textContent = String(copilot.health.score);

  const scoreLabel = document.createElement('span');
  scoreLabel.textContent = 'İşletme sağlık skoru';

  const status = document.createElement('small');
  status.textContent =
    `${copilot.health.statusLabel} · ` +
    copilot.health.trendLabel;

  score.append(scoreValue, scoreLabel, status);
  header.append(headingWrap, score);

  const signals = document.createElement('div');
  signals.className = 'ib-biz-copilot-signals';

  signals.append(
    createSignalCard(
      'En kritik risk',
      copilot.topRisk,
      'Kritik risk bulunmadı'
    ),
    createSignalCard(
      'En güçlü fırsat',
      copilot.topOpportunity,
      'Yeni fırsat için daha fazla veri gerekli'
    )
  );

  const actionsSection = document.createElement('section');
  actionsSection.className = 'ib-biz-copilot-actions';

  const actionsTitle = document.createElement('h3');
  actionsTitle.textContent = 'Öncelikli Yönetici Aksiyonları';

  const actionsList = document.createElement('ol');

  for (const [index, action] of
    copilot.actions.slice(0, 3).entries()) {
    actionsList.appendChild(
      createActionItem(action, index)
    );
  }

  if (copilot.actions.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'ib-biz-copilot-actions__empty';
    empty.textContent =
      'Şu anda acil yönetici aksiyonu bulunmuyor.';

    actionsSection.append(actionsTitle, empty);
  } else {
    actionsSection.append(actionsTitle, actionsList);
  }

  const footer = document.createElement('footer');
  footer.className = 'ib-biz-copilot__footer';

  const confidence = document.createElement('div');
  confidence.className = 'ib-biz-copilot-confidence';

  const confidenceLabel = document.createElement('span');
  confidenceLabel.textContent = 'Veri güveni';

  const confidenceValue = document.createElement('strong');
  confidenceValue.textContent =
    `${copilot.confidence.score}/100`;

  const confidenceText = document.createElement('small');
  confidenceText.textContent =
    copilot.confidence.label;

  confidence.append(
    confidenceLabel,
    confidenceValue,
    confidenceText
  );

  const disclosure = document.createElement('small');
  disclosure.className = 'ib-biz-copilot__disclosure';
  disclosure.textContent = copilot.disclosure;

  footer.append(confidence, disclosure);

  section.append(
    header,
    signals,
    actionsSection,
    footer
  );

  return section;
}

export default createBusinessExecutiveCopilotPanelElement;
