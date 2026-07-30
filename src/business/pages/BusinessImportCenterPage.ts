export interface BusinessUploadDraft {
  readonly id: string;
  readonly fileName: string;
  readonly fileType: string;
  readonly fileSize: number;
  readonly status: 'hazir';
}

const ACCEPTED_EXTENSIONS = Object.freeze([
  '.xlsx',
  '.xls',
  '.csv',
  '.pdf',
  '.json',
  '.xml'
]);

const MAX_FILE_SIZE = 100 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0
    ? fileName.slice(dotIndex).toLocaleLowerCase('tr-TR')
    : '';
}

function createUploadArea(): {
  element: HTMLElement;
  input: HTMLInputElement;
  status: HTMLElement;
} {
  const area = document.createElement('section');
  area.className = 'ib-biz-import__card ib-biz-import__upload-card';
  area.setAttribute('aria-labelledby', 'business-import-upload-title');

  const heading = document.createElement('div');
  heading.className = 'ib-biz-import__card-heading';

  const title = document.createElement('h2');
  title.id = 'business-import-upload-title';
  title.textContent = 'Dosya yükle';

  const description = document.createElement('p');
  description.textContent =
    'Excel, CSV, PDF, JSON veya XML dosyanızı seçin.';

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
    'Desteklenen formatlar: XLSX, XLS, CSV, PDF, JSON, XML · En fazla 100 MB';

  const status = document.createElement('p');
  status.className = 'ib-biz-import__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  area.append(heading, dropZone, meta, status);

  return { element: area, input, status };
}

function createRecentUploadsCard(): {
  element: HTMLElement;
  body: HTMLElement;
} {
  const card = document.createElement('section');
  card.className = 'ib-biz-import__card';
  card.setAttribute('aria-labelledby', 'business-import-recent-title');

  const heading = document.createElement('div');
  heading.className = 'ib-biz-import__card-heading';

  const title = document.createElement('h2');
  title.id = 'business-import-recent-title';
  title.textContent = 'Son yüklemeler';

  const description = document.createElement('p');
  description.textContent =
    'Analize hazırlanmış dosyalarınızı burada görüntüleyin.';

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

function renderUpload(
  container: HTMLElement,
  upload: BusinessUploadDraft
): void {
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
      <th>Durum</th>
    </tr>
  `;

  const body = document.createElement('tbody');
  const row = document.createElement('tr');

  const fileCell = document.createElement('td');
  fileCell.textContent = upload.fileName;

  const typeCell = document.createElement('td');
  typeCell.textContent = upload.fileType.replace('.', '').toUpperCase();

  const sizeCell = document.createElement('td');
  sizeCell.textContent = formatFileSize(upload.fileSize);

  const statusCell = document.createElement('td');
  const badge = document.createElement('span');
  badge.className = 'ib-biz-import__badge';
  badge.textContent = 'Analize hazır';
  statusCell.append(badge);

  row.append(fileCell, typeCell, sizeCell, statusCell);
  body.append(row);
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
  card.setAttribute('aria-labelledby', 'business-import-analysis-title');

  const content = document.createElement('div');

  const title = document.createElement('h2');
  title.id = 'business-import-analysis-title';
  title.textContent = 'Analiz';

  const description = document.createElement('p');
  description.textContent =
    'Yüklenen dosyayı doğrulama ve normalizasyon aşamalarından geçirerek analize hazırlayın.';

  content.append(title, description);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ib-biz-import__analysis-button';
  button.textContent = 'Analizi Başlat';
  button.disabled = true;

  card.append(content, button);

  return { element: card, button };
}

export function createBusinessImportCenterPageElement(): HTMLElement {
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

  const { element: uploadArea, input, status } =
    createUploadArea();
  const { element: recentCard, body: recentBody } =
    createRecentUploadsCard();
  const { element: analysisCard, button: analysisButton } =
    createAnalysisCard();

  renderEmptyUploads(recentBody);

  input.addEventListener('change', () => {
    const file = input.files?.[0];

    if (!file) {
      renderEmptyUploads(recentBody);
      analysisButton.disabled = true;
      status.textContent = '';
      return;
    }

    const extension = getFileExtension(file.name);

    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      input.value = '';
      renderEmptyUploads(recentBody);
      analysisButton.disabled = true;
      status.textContent =
        'Bu dosya türü desteklenmiyor.';
      status.dataset.state = 'error';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      input.value = '';
      renderEmptyUploads(recentBody);
      analysisButton.disabled = true;
      status.textContent =
        'Dosya boyutu 100 MB sınırını aşıyor.';
      status.dataset.state = 'error';
      return;
    }

    const upload: BusinessUploadDraft = {
      id: `upload-${Date.now()}`,
      fileName: file.name,
      fileType: extension,
      fileSize: file.size,
      status: 'hazir'
    };

    renderUpload(recentBody, upload);
    analysisButton.disabled = false;
    status.textContent =
      `${file.name} doğrulandı ve analize hazırlandı.`;
    status.dataset.state = 'success';
  });

  analysisButton.addEventListener('click', () => {
    if (analysisButton.disabled) return;

    analysisButton.disabled = true;
    analysisButton.textContent = 'Analiz hazırlanıyor…';
    status.textContent =
      'Doğrulama ve normalizasyon işlemi başlatıldı.';
    status.dataset.state = 'success';

    window.setTimeout(() => {
      analysisButton.disabled = false;
      analysisButton.textContent = 'Analizi Başlat';
      status.textContent =
        'Veri seti hazır. Analiz motoru sonraki sprintte bağlanacak.';
    }, 700);
  });

  root.append(
    intro,
    uploadArea,
    recentCard,
    analysisCard
  );

  return root;
}

export function mountBusinessImportCenterPage(
  container: HTMLElement
): void {
  container.replaceChildren(
    createBusinessImportCenterPageElement()
  );
}

export default mountBusinessImportCenterPage;
