import type { BusinessRuntime } from '../app/BusinessRuntime';
import type {
  BusinessAnalysisResult,
  BusinessDocument
} from '../document-intelligence';

export interface BusinessAnalysesPageOptions {
  runtime?: BusinessRuntime;
  userId?: string;
  businessId?: string;
}

function formatKpiValue(
  value: number,
  unit?: string
): string {
  const formatted = value.toLocaleString('tr-TR', {
    maximumFractionDigits: 2
  });

  if (unit === 'TRY') return `${formatted} ₺`;
  if (unit === '%') return `%${formatted}`;
  if (unit) return `${formatted} ${unit}`;

  return formatted;
}

function createScoreCard(score: number): HTMLElement {
  const card = document.createElement('article');
  card.className = 'ib-biz-card';

  const label = document.createElement('p');
  label.textContent = 'Belge sağlık skoru';

  const value = document.createElement('strong');
  value.textContent = `${score}/100`;

  const note = document.createElement('p');
  note.textContent =
    score >= 80
      ? 'Veri yapısı analiz için güçlü görünüyor.'
      : score >= 60
        ? 'Veri kullanılabilir; bazı alanlar geliştirilebilir.'
        : 'Veri kalitesi ve tablo yapısı gözden geçirilmeli.';

  card.append(label, value, note);

  return card;
}

function renderAnalysisResult(
  container: HTMLElement,
  result: BusinessAnalysisResult
): void {
  const heading = document.createElement('h2');
  heading.textContent = 'Analiz tamamlandı';

  const summary = document.createElement('p');
  summary.textContent = result.summary;

  const scoreCard = createScoreCard(result.score);

  const kpiHeading = document.createElement('h3');
  kpiHeading.textContent = 'Temel performans göstergeleri';

  const kpiGrid = document.createElement('div');
  kpiGrid.className = 'ib-biz-kpi-grid';

  for (const kpi of result.kpis.slice(0, 8)) {
    const card = document.createElement('article');
    card.className = 'ib-biz-card';

    const label = document.createElement('p');
    label.textContent = kpi.label;

    const value = document.createElement('strong');
    value.textContent = formatKpiValue(
      kpi.value,
      kpi.unit
    );

    card.append(label, value);
    kpiGrid.appendChild(card);
  }

  const insightsHeading = document.createElement('h3');
  insightsHeading.textContent = 'İçgörüler';

  const insights = document.createElement('ul');

  for (const insight of result.insights) {
    const item = document.createElement('li');
    const title = document.createElement('strong');
    const description = document.createElement('p');

    title.textContent = insight.title;
    description.textContent = insight.description;

    item.append(title, description);
    insights.appendChild(item);
  }

  const recommendationsHeading =
    document.createElement('h3');
  recommendationsHeading.textContent = 'Önerilen aksiyonlar';

  const recommendations = document.createElement('ol');

  for (const recommendation of result.recommendations) {
    const item = document.createElement('li');
    item.textContent = recommendation;
    recommendations.appendChild(item);
  }

  container.replaceChildren(
    heading,
    summary,
    scoreCard,
    kpiHeading,
    kpiGrid,
    insightsHeading,
    insights,
    recommendationsHeading,
    recommendations
  );

  container.hidden = false;
}

function toBusinessDocument(
  uploadedDocument: {
    id: string;
    businessId: string;
    projectId: string | null;
    fileName: string;
    documentType: BusinessDocument['format'];
    mimeType: string;
    fileSizeBytes: number;
    storagePath: string;
    createdAt: string;
  }
): BusinessDocument {
  return {
    id: uploadedDocument.id,
    businessId: uploadedDocument.businessId,
    projectId: uploadedDocument.projectId ?? '',
    fileName: uploadedDocument.fileName,
    format: uploadedDocument.documentType,
    mimeType: uploadedDocument.mimeType,
    sizeBytes: uploadedDocument.fileSizeBytes,
    storagePath: uploadedDocument.storagePath,
    status: 'uploaded',
    uploadedAt: uploadedDocument.createdAt
  };
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
  title.textContent = 'Belge yükle ve analiz et';

  const description = document.createElement('p');
  description.textContent =
    'Excel, CSV veya PDF belgenizi yükleyin; KPI, sağlık skoru, içgörü ve aksiyon önerilerini görüntüleyin.';

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
    ['profitability', 'Kârlılık analizi']
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
  submit.textContent = 'Yükle ve analiz et';

  const feedback = document.createElement('p');
  feedback.className = 'ib-biz-auth-feedback';
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');

  const result = document.createElement('section');
  result.className = 'ib-biz-card';
  result.dataset.businessAnalysisResult = '1';
  result.hidden = true;

  function setBusy(busy: boolean): void {
    fileInput.disabled = busy;
    analysisSelect.disabled = busy;
    submit.disabled = busy;
    submit.textContent = busy
      ? 'Analiz hazırlanıyor…'
      : 'Yükle ve analiz et';
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

    const analysisType = analysisSelect.value;

    setBusy(true);
    result.hidden = true;
    feedback.textContent =
      'Dosya güvenli alana yükleniyor…';

    void runtime.documents
      .uploadDocument({
        businessId,
        userId,
        file
      })
      .then(async (uploadedDocument) => {
        await runtime.documentAnalyses.updateDocumentStatus(
          uploadedDocument.id,
          'processing'
        );

        feedback.textContent =
          'Belge ayrıştırılıyor ve işletme analizi hazırlanıyor…';

        const {
          BusinessDocumentClassifier,
          CsvDocumentParser,
          DatasetNormalizer,
          DeterministicBusinessAnalysisEngine,
          DocumentIntelligenceService,
          ExcelDocumentParser,
          PdfDocumentParser
        } = await import('../document-intelligence');

        const loader = {
          load: async (): Promise<ArrayBuffer> =>
            file.arrayBuffer()
        };

        const parserService = new DocumentIntelligenceService([
          new CsvDocumentParser(loader),
          new ExcelDocumentParser(loader),
          new PdfDocumentParser()
        ]);

        const businessDocument =
          toBusinessDocument(uploadedDocument);

        const parsedDocument =
          await parserService.parse(businessDocument);

        const normalizedDocument =
          new DatasetNormalizer().normalize(parsedDocument);

        const classification =
          new BusinessDocumentClassifier().classify(
            normalizedDocument
          );

        const analysisResult =
          await new DeterministicBusinessAnalysisEngine().analyze(
            normalizedDocument,
            classification
          );

        await runtime.documentAnalyses.saveAnalysis({
          businessId,
          documentId: uploadedDocument.id,
          userId,
          analysisType,
          result: analysisResult
        });

        await runtime.documentAnalyses.updateDocumentStatus(
          uploadedDocument.id,
          'ready'
        );

        feedback.textContent =
          'Analiz tamamlandı ve güvenli çalışma alanına kaydedildi.';

        renderAnalysisResult(result, analysisResult);
        form.reset();
      })
      .catch(async (error: unknown) => {
        feedback.textContent =
          error instanceof Error
            ? error.message
            : 'Belge analizi tamamlanamadı.';

        const uploadedId =
          result.dataset.uploadedDocumentId;

        if (uploadedId) {
          await runtime.documentAnalyses
            .updateDocumentStatus(uploadedId, 'failed')
            .catch(() => undefined);
        }
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

  section.append(title, description, form);
  root.append(section, result);

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
