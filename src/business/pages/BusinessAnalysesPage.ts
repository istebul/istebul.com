export function createBusinessAnalysesPageElement(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'ib-biz-page';
  root.dataset.businessPage = 'analizler';

  const section = document.createElement('section');
  section.className = 'ib-biz-card';

  const title = document.createElement('h2');
  title.textContent = 'Yeni analiz oluştur';

  const description = document.createElement('p');
  description.textContent =
    'Excel, CSV veya PDF dosyanızı yükleyin; satış, maliyet, stok, depo sayımı ve yönetim analizleri oluşturun.';

  const form = document.createElement('form');
  form.className = 'ib-biz-auth-form';
  form.dataset.businessAnalysisUpload = '1';

  const fileLabel = document.createElement('label');
  fileLabel.className = 'ib-biz-auth-field';

  const fileLabelText = document.createElement('span');
  fileLabelText.textContent = 'Analiz edilecek dosya';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.name = 'document';
  fileInput.required = true;
  fileInput.accept = '.xlsx,.xls,.csv,.pdf';

  fileLabel.append(fileLabelText, fileInput);

  const analysisLabel = document.createElement('label');
  analysisLabel.className = 'ib-biz-auth-field';

  const analysisText = document.createElement('span');
  analysisText.textContent = 'Analiz türü';

  const analysisSelect = document.createElement('select');
  analysisSelect.name = 'analysisType';
  analysisSelect.required = true;

  [
    ['management-summary', 'Yönetici özeti'],
    ['inventory-count', 'Depo sayım raporu'],
    ['cost-analysis', 'Maliyet analizi'],
    ['stock-analysis', 'Stok analizi'],
    ['sales-analysis', 'Satış analizi'],
    ['profitability', 'Karlılık analizi']
  ].forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    analysisSelect.appendChild(option);
  });

  analysisLabel.append(analysisText, analysisSelect);

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'ib-biz-button ib-biz-button-primary';
  submit.textContent = 'Analizi başlat';

  const feedback = document.createElement('p');
  feedback.className = 'ib-biz-auth-feedback';
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');

  form.append(fileLabel, analysisLabel, submit, feedback);
  section.append(title, description, form);
  root.appendChild(section);

  return root;
}

export function mountBusinessAnalysesPage(container: HTMLElement): void {
  container.replaceChildren(createBusinessAnalysesPageElement());
}

export default mountBusinessAnalysesPage;
