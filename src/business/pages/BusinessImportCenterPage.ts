import type { BusinessRuntime } from '../app/BusinessRuntime';
import type {
  UploadedBusinessDocument,
  UploadableBusinessDocumentType
} from '../document-intelligence/providers/supabase/SupabaseBusinessDocumentUploadProvider';

export interface BusinessImportCenterPageOptions {
  runtime?: BusinessRuntime;
  userId?: string;
  businessId?: string;
}

const ACCEPTED_EXTENSIONS = Object.freeze([
  '.xlsx',
  '.xls',
  '.csv',
  '.pdf',
  '.docx',
  '.pptx'
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

function getFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');

  return dotIndex >= 0
    ? fileName.slice(dotIndex).toLocaleLowerCase('tr-TR')
    : '';
}

function statusLabel(status: string): string {
  switch (status) {
    case 'processing':
      return 'İşleniyor';
    case 'ready':
      return 'Analize hazır';
    case 'failed':
      return 'Başarısız';
    case 'uploaded':
    default:
      return 'Yüklendi';
  }
}

function createUploadArea(): {
  element: HTMLElement;
  input: HTMLInputElement;
  status: HTMLElement;
  dropZone: HTMLLabelElement;
} {
  const area = document.createElement('section');
  area.className =
    'ib-biz-import__card ib-biz-import__upload-card';
  area.setAttribute(
    'aria-labelledby',
    'business-import-upload-title'
  );

  const heading = document.createElement('div');
  heading.className = 'ib-biz-import__card-heading';

  const title = document.createElement('h2');
  title.id = 'business-import-upload-title';
  title.textContent = 'Dosya yükle';

  const description = document.createElement('p');
  description.textContent =
    'Excel, CSV, PDF, Word veya PowerPoint dosyanızı güvenli alana yükleyin.';

  heading.append(title, description);

  const dropZone = document.createElement('label');
  dropZone.className = 'ib-biz-import__drop-zone';
  dropZone.setAttribute('for', 'business-import-file');

  const icon = document.createElement('span');
  icon.className = 'ib-biz-import__drop-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '↥';

  const dropTitle = document.createElement('strong');
  dropTitle.textContent = 'Dosyanızı buraya sürükleyin';

  const dropText = document.createElement('span');
  dropText.textContent = 'veya bilgisayarınızdan seçin';

  const chooseButton = document.createElement('span');
  chooseButton.className = 'ib-biz-import__choose';
  chooseButton.textContent = 'Dosya Seç';

  const input = document.createElement('input');
  input.id = 'business-import-file';
  input.className = 'ib-biz-import__file-input';
  input.type = 'file';
  input.accept = ACCEPTED_EXTENSIONS.join(',');
  input.multiple = false;

  dropZone.append(
    icon,
    dropTitle,
    dropText,
    chooseButton,
    input
  );

  const meta = document.createElement('p');
  meta.className = 'ib-biz-import__meta';
  meta.textContent =
    'Desteklenen formatlar: XLSX, XLS, CSV, PDF, DOCX, PPTX · En fazla 50 MB';

  const status = document.createElement('p');
  status.className = 'ib-biz-import__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  area.append(heading, dropZone, meta, status);

  return {
    element: area,
    input,
    status,
    dropZone
  };
}

function createRecentUploadsCard(): {
  element: HTMLElement;
  body: HTMLElement;
} {
  const card = document.createElement('section');
  card.className = 'ib-biz-import__card';
  card.setAttribute(
    'aria-labelledby',
    'business-import-recent-title'
  );

  const heading = document.createElement('div');
  heading.className = 'ib-biz-import__card-heading';

  const title = document.createElement('h2');
  title.id = 'business-import-recent-title';
  title.textContent = 'Son yüklemeler';

  const description = document.createElement('p');
  description.textContent =
    'İşletmenize ait son yüklenen dosyaları görüntüleyin.';

  heading.append(title, description);

  const body = document.createElement('div');
  body.className = 'ib-biz-import__recent-body';

  card.append(heading, body);

  return { element: card, body };
}

function renderEmptyUploads(container: HTMLElement): void {
  container.replaceChildren();

  const empty = document.createElement('div');
  empty.className = 'ib-biz-import__empty';

  const icon = document.createElement('span');
  icon.className = 'ib-biz-import__empty-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '▤';

  const title = document.createElement('h3');
  title.textContent = 'Henüz veri yüklenmedi';

  const description = document.createElement('p');
  description.textContent =
    'İlk Excel veya CSV dosyanızı yükleyerek analiz oluşturmaya başlayabilirsiniz.';

  empty.append(icon, title, description);
  container.append(empty);
}

function renderLoadingUploads(container: HTMLElement): void {
  container.replaceChildren();

  const loading = document.createElement('div');
  loading.className = 'ib-biz-import__empty';

  const title = document.createElement('h3');
  title.textContent = 'Yüklemeler alınıyor…';

  const description = document.createElement('p');
  description.textContent =
    'İşletmenize ait dosya kayıtları hazırlanıyor.';

  loading.append(title, description);
  container.append(loading);
}

function renderUploads(
  container: HTMLElement,
  uploads: readonly UploadedBusinessDocument[]
): void {
  if (uploads.length === 0) {
    renderEmptyUploads(container);
    return;
  }

  container.replaceChildren();

  const wrapper = document.createElement('div');
  wrapper.className = 'ib-biz-import__table-wrap';

  const table = document.createElement('table');
  table.className = 'ib-biz-import__table';

  const head = document.createElement('thead');
  head.innerHTML = `
    <tr>
      <th>Dosya</th>
      <th>Tür</th>
      <th>Boyut</th>
      <th>Yüklenme tarihi</th>
      <th>Durum</th>
    </tr>
  `;

  const body = document.createElement('tbody');

  for (const upload of uploads) {
    const row = document.createElement('tr');

    const fileCell = document.createElement('td');
    fileCell.textContent = upload.fileName;

    const typeCell = document.createElement('td');
    typeCell.textContent =
      upload.documentType.toLocaleUpperCase('tr-TR');

    const sizeCell = document.createElement('td');
    sizeCell.textContent =
      formatFileSize(upload.fileSizeBytes);

    const dateCell = document.createElement('td');
    dateCell.textContent = formatDate(upload.createdAt);

    const statusCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'ib-biz-import__badge';
    badge.dataset.status = upload.status;
    badge.textContent = statusLabel(upload.status);
    statusCell.append(badge);

    row.append(
      fileCell,
      typeCell,
      sizeCell,
      dateCell,
      statusCell
    );

    body.append(row);
  }

  table.append(head, body);
  wrapper.append(table);
  container.append(wrapper);
}

function createAnalysisCard(): {
  element: HTMLElement;
  button: HTMLButtonElement;
} {
  const card = document.createElement('section');
  card.className =
    'ib-biz-import__card ib-biz-import__analysis-card';
  card.setAttribute(
    'aria-labelledby',
    'business-import-analysis-title'
  );

  const content = document.createElement('div');

  const title = document.createElement('h2');
  title.id = 'business-import-analysis-title';
  title.textContent = 'Analiz';

  const description = document.createElement('p');
  description.textContent =
    'Yüklenen dosyayı Analizler ekranında işleyerek KPI ve yönetici raporu oluşturun.';

  content.append(title, description);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ib-biz-import__analysis-button';
  button.textContent = 'Analizlere Git';
  button.disabled = true;

  card.append(content, button);

  return { element: card, button };
}

function validateFile(file: File): string | null {
  const extension = getFileExtension(file.name);

  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    return 'Bu dosya türü desteklenmiyor.';
  }

  if (file.size <= 0) {
    return 'Boş dosya yüklenemez.';
  }

  if (file.size > MAX_FILE_SIZE) {
    return 'Dosya boyutu 50 MB sınırını aşıyor.';
  }

  return null;
}

export function createBusinessImportCenterPageElement(
  options: BusinessImportCenterPageOptions = {}
): HTMLElement {
  const root = document.createElement('div');
  root.className = 'ib-biz-page ib-biz-import';
  root.dataset.businessPage = 'veri-merkezi';

  const intro = document.createElement('section');
  intro.className = 'ib-biz-import__intro';

  const title = document.createElement('h1');
  title.textContent = 'Veri Merkezi';

  const description = document.createElement('p');
  description.textContent =
    'İşletme verilerinizi yükleyin ve analiz oluşturmaya başlayın.';

  intro.append(title, description);

  const {
    element: uploadArea,
    input,
    status,
    dropZone
  } = createUploadArea();

  const {
    element: recentCard,
    body: recentBody
  } = createRecentUploadsCard();

  const {
    element: analysisCard,
    button: analysisButton
  } = createAnalysisCard();

  let uploads: readonly UploadedBusinessDocument[] = [];

  const refreshUploads = async (): Promise<void> => {
    if (!options.runtime || !options.businessId) {
      renderEmptyUploads(recentBody);
      return;
    }

    renderLoadingUploads(recentBody);

    try {
      uploads = await options.runtime.documents.listDocuments(
        options.businessId
      );

      renderUploads(recentBody, uploads);
      analysisButton.disabled = uploads.length === 0;
    } catch (error) {
      renderEmptyUploads(recentBody);
      status.textContent =
        error instanceof Error
          ? error.message
          : 'Yüklemeler alınamadı.';
      status.dataset.state = 'error';
    }
  };

  const uploadFile = async (file: File): Promise<void> => {
    const validationError = validateFile(file);

    if (validationError) {
      input.value = '';
      status.textContent = validationError;
      status.dataset.state = 'error';
      return;
    }

    if (
      !options.runtime ||
      !options.userId ||
      !options.businessId
    ) {
      input.value = '';
      status.textContent =
        'Oturum veya işletme bilgisi hazırlanamadı. Sayfayı yenileyin.';
      status.dataset.state = 'error';
      return;
    }

    input.disabled = true;
    dropZone.dataset.busy = 'true';
    status.textContent =
      `${file.name} güvenli alana yükleniyor…`;
    status.dataset.state = 'success';

    try {
      await options.runtime.documents.uploadDocument({
        businessId: options.businessId,
        userId: options.userId,
        file
      });

      status.textContent =
        `${file.name} başarıyla yüklendi.`;
      status.dataset.state = 'success';

      await refreshUploads();
    } catch (error) {
      status.textContent =
        error instanceof Error
          ? error.message
          : 'Dosya yüklenemedi.';
      status.dataset.state = 'error';
    } finally {
      input.disabled = false;
      input.value = '';
      delete dropZone.dataset.busy;
    }
  };

  input.addEventListener('change', () => {
    const file = input.files?.[0];

    if (!file) return;

    void uploadFile(file);
  });

  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.dataset.dragging = 'true';
  });

  dropZone.addEventListener('dragleave', () => {
    delete dropZone.dataset.dragging;
  });

  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    delete dropZone.dataset.dragging;

    const file = event.dataTransfer?.files?.[0];

    if (!file) return;

    void uploadFile(file);
  });

  analysisButton.addEventListener('click', () => {
    if (analysisButton.disabled) return;

    window.location.href = '/business/analizler/';
  });

  root.append(
    intro,
    uploadArea,
    recentCard,
    analysisCard
  );

  if (options.runtime && options.businessId) {
    void refreshUploads();
  } else {
    renderEmptyUploads(recentBody);
  }

  return root;
}

export function mountBusinessImportCenterPage(
  container: HTMLElement,
  options: BusinessImportCenterPageOptions = {}
): void {
  container.replaceChildren(
    createBusinessImportCenterPageElement(options)
  );
}

export type {
  UploadedBusinessDocument,
  UploadableBusinessDocumentType
};

export default mountBusinessImportCenterPage;
