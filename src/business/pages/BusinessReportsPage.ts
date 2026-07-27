export function createBusinessReportsPageElement(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'ib-biz-page';
  root.dataset.businessPage = 'raporlar';

  const section = document.createElement('section');
  section.className = 'ib-biz-card';

  const title = document.createElement('h2');
  title.textContent = 'Yeni rapor oluştur';

  const description = document.createElement('p');
  description.textContent =
    'Yönetim, finans, maliyet, depo, stok ve operasyon raporlarınızı yapay zekâ desteğiyle hazırlayın.';

  const form = document.createElement('form');
  form.className = 'ib-biz-auth-form';
  form.dataset.businessReportCreate = '1';

  const titleLabel = document.createElement('label');
  titleLabel.className = 'ib-biz-auth-field';

  const titleText = document.createElement('span');
  titleText.textContent = 'Rapor başlığı';

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.name = 'title';
  titleInput.required = true;
  titleInput.maxLength = 160;
  titleInput.placeholder = 'Örn. Temmuz Depo Sayım Raporu';

  titleLabel.append(titleText, titleInput);

  const typeLabel = document.createElement('label');
  typeLabel.className = 'ib-biz-auth-field';

  const typeText = document.createElement('span');
  typeText.textContent = 'Rapor türü';

  const typeSelect = document.createElement('select');
  typeSelect.name = 'reportType';
  typeSelect.required = true;

  [
    ['executive', 'Yönetici raporu'],
    ['warehouse', 'Depo sayım raporu'],
    ['cost', 'Maliyet raporu'],
    ['finance', 'Finansal rapor'],
    ['operations', 'Operasyon raporu'],
    ['presentation', 'Sunum taslağı']
  ].forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    typeSelect.appendChild(option);
  });

  typeLabel.append(typeText, typeSelect);

  const promptLabel = document.createElement('label');
  promptLabel.className = 'ib-biz-auth-field';

  const promptText = document.createElement('span');
  promptText.textContent = 'Rapor talebi';

  const promptInput = document.createElement('input');
  promptInput.type = 'text';
  promptInput.name = 'prompt';
  promptInput.required = true;
  promptInput.maxLength = 500;
  promptInput.placeholder =
    'Örn. Sayım farklarını, maliyet etkisini ve alınması gereken aksiyonları açıkla.';

  promptLabel.append(promptText, promptInput);

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'ib-biz-button ib-biz-button-primary';
  submit.textContent = 'Raporu oluştur';

  const feedback = document.createElement('p');
  feedback.className = 'ib-biz-auth-feedback';
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');

  form.append(
    titleLabel,
    typeLabel,
    promptLabel,
    submit,
    feedback
  );

  section.append(title, description, form);
  root.appendChild(section);

  return root;
}

export function mountBusinessReportsPage(container: HTMLElement): void {
  container.replaceChildren(createBusinessReportsPageElement());
}

export default mountBusinessReportsPage;
