import type { BusinessRuntime } from '../app/BusinessRuntime';

export interface BusinessAnalysesPageOptions {
  runtime?: BusinessRuntime;
  userId?: string;
  businessId?: string;
}

export function createBusinessAnalysesPageElement(
  options: BusinessAnalysesPageOptions = {}
): HTMLElement {
  const root = document.createElement('div');
  root.className = 'ib-biz-page';
  root.dataset.businessPage = 'analizler';

  const section = document.createElement('section');
  section.className = 'ib-biz-card';

  const title = document.createElement('h2');
  title.textContent = 'Yeni analiz oluştur';

  const description = document.createElement('p');
  description.textContent =
    'Excel, CSV veya PDF dosyanızı güvenli çalışma alanınıza yükleyin.';

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
  fileInput.accept = '.xlsx,.xls,.csv,.pdf,.docx,.pptx';

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
  submit.className =
    'ib-biz-button ib-biz-button-primary';
  submit.textContent = 'Dosyayı yükle';

  const feedback = document.createElement('p');
  feedback.className = 'ib-biz-auth-feedback';
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');

  const result = document.createElement('div');
  result.className = 'ib-biz-card';
  result.hidden = true;

  function setBusy(busy: boolean): void {
    fileInput.disabled = busy;
    analysisSelect.disabled = busy;
    submit.disabled = busy;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const runtime = options.runtime;
    const userId = options.userId;
    const businessId = options.businessId;
    const file = fileInput.files?.[0];

    if (!runtime || !userId || !businessId) {
      feedback.textContent =
        'Oturum veya işletme bilgisi hazırlanamadı. Sayfayı yenileyin.';
      return;
    }

    if (!file) {
      feedback.textContent = 'Yüklenecek dosyayı seçin.';
      fileInput.focus();
      return;
    }

    setBusy(true);
    result.hidden = true;
    feedback.textContent = 'Dosya güvenli alana yükleniyor…';

    void runtime.documents
      .uploadDocument({
        businessId,
        userId,
        file
      })
      .then((uploadedDocument) => {
        feedback.textContent =
          'Dosya başarıyla yüklendi ve kayıt altına alındı.';

        const resultTitle = document.createElement('h3');
        resultTitle.textContent = 'Yükleme tamamlandı';

        const resultDetails = document.createElement('p');
        resultDetails.textContent =
          `${uploadedDocument.fileName} · ${(
            uploadedDocument.fileSizeBytes /
            1024 /
            1024
          ).toLocaleString('tr-TR', {
            maximumFractionDigits: 2
          })} MB`;

        const analysisDetails = document.createElement('p');
        analysisDetails.textContent =
          `Seçilen analiz: ${
            analysisSelect.selectedOptions[0]?.textContent ??
            'Yönetici özeti'
          }`;

        result.replaceChildren(
          resultTitle,
          resultDetails,
          analysisDetails
        );
        result.hidden = false;
        form.reset();
      })
      .catch((error: unknown) => {
        feedback.textContent =
          error instanceof Error
            ? error.message
            : 'Dosya yükleme işlemi tamamlanamadı.';
      })
      .finally(() => {
        setBusy(false);
      });
  });

  form.append(
    fileLabel,
    analysisLabel,
    submit,
    feedback
  );

  section.append(title, description, form, result);
  root.appendChild(section);

  return root;
}

export function mountBusinessAnalysesPage(
  container: HTMLElement,
  options: BusinessAnalysesPageOptions = {}
): void {
  container.replaceChildren(
    createBusinessAnalysesPageElement(options)
  );
}

export default mountBusinessAnalysesPage;
