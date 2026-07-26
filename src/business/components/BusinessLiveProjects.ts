import type {
  BusinessStudioProject,
  BusinessStudioProjectType
} from '../studio';

export interface BusinessLiveProjectsOptions {
  projects: BusinessStudioProject[];
  onCreateProject: (
    title: string,
    type: BusinessStudioProjectType
  ) => Promise<void>;
}

function formatProjectType(type: BusinessStudioProjectType): string {
  switch (type) {
    case 'report':
      return 'Rapor';
    case 'presentation':
      return 'Sunum';
    case 'analysis':
      return 'Analiz';
  }
}

function formatProjectStatus(
  status: BusinessStudioProject['status']
): string {
  switch (status) {
    case 'draft':
      return 'Taslak';
    case 'processing':
      return 'Hazırlanıyor';
    case 'completed':
      return 'Tamamlandı';
    case 'failed':
      return 'Hata';
  }
}

function createProjectCard(
  project: BusinessStudioProject
): HTMLElement {
  const article = document.createElement('article');
  article.className = 'ib-biz-card';

  const badge = document.createElement('span');
  badge.className = 'ib-biz-card-badge';
  badge.textContent = formatProjectType(project.type);

  const title = document.createElement('h3');
  title.textContent = project.title;

  const status = document.createElement('p');
  status.textContent = `Durum: ${formatProjectStatus(project.status)}`;

  const updated = document.createElement('small');
  updated.textContent =
    `Güncellendi: ${new Date(project.updatedAt).toLocaleString('tr-TR')}`;

  article.append(badge, title, status, updated);
  return article;
}

export function createBusinessLiveProjectsElement(
  options: BusinessLiveProjectsOptions
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'ib-biz-section';
  section.setAttribute(
    'aria-labelledby',
    'business-live-projects-title'
  );

  const heading = document.createElement('div');
  heading.className = 'ib-biz-section-heading';

  const headingText = document.createElement('div');

  const kicker = document.createElement('span');
  kicker.className = 'ib-biz-kicker';
  kicker.textContent = 'Canlı çalışma alanı';

  const title = document.createElement('h2');
  title.id = 'business-live-projects-title';
  title.textContent = 'Son çalışmalar';

  headingText.append(kicker, title);

  const newProjectButton = document.createElement('button');
  newProjectButton.type = 'button';
  newProjectButton.className =
    'ib-biz-button ib-biz-button-primary';
  newProjectButton.textContent = 'Yeni çalışma';

  heading.append(headingText, newProjectButton);
  section.appendChild(heading);

  const form = document.createElement('form');
  form.className = 'ib-biz-card';
  form.hidden = true;

  const formTitle = document.createElement('h3');
  formTitle.textContent = 'Yeni çalışma oluştur';

  const titleLabel = document.createElement('label');
  titleLabel.textContent = 'Çalışma adı';

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.name = 'projectTitle';
  titleInput.required = true;
  titleInput.maxLength = 120;
  titleInput.placeholder = 'Örn. Temmuz Depo Sayım Raporu';

  const typeLabel = document.createElement('label');
  typeLabel.textContent = 'Çalışma türü';

  const typeSelect = document.createElement('select');
  typeSelect.name = 'projectType';

  const projectTypes: Array<{
    value: BusinessStudioProjectType;
    label: string;
  }> = [
    { value: 'report', label: 'Rapor' },
    { value: 'analysis', label: 'Analiz' },
    { value: 'presentation', label: 'Sunum' }
  ];

  projectTypes.forEach(({ value, label }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    typeSelect.appendChild(option);
  });

  const actions = document.createElement('div');
  actions.className = 'ib-biz-section-heading';

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.className = 'ib-biz-button';
  cancelButton.textContent = 'Vazgeç';

  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.className =
    'ib-biz-button ib-biz-button-primary';
  submitButton.textContent = 'Çalışmayı oluştur';

  const feedback = document.createElement('p');
  feedback.setAttribute('role', 'status');

  actions.append(cancelButton, submitButton);

  form.append(
    formTitle,
    titleLabel,
    titleInput,
    typeLabel,
    typeSelect,
    actions,
    feedback
  );

  section.appendChild(form);

  const projectContainer = document.createElement('div');

  if (options.projects.length === 0) {
    projectContainer.className = 'ib-biz-empty';

    const emptyTitle = document.createElement('h3');
    emptyTitle.textContent = 'Henüz çalışma yok';

    const emptyText = document.createElement('p');
    emptyText.textContent =
      'İlk rapor, sunum veya analiz çalışmanızı oluşturun.';

    projectContainer.append(emptyTitle, emptyText);
  } else {
    projectContainer.className = 'ib-biz-card-grid';

    options.projects.forEach((project) => {
      projectContainer.appendChild(createProjectCard(project));
    });
  }

  section.appendChild(projectContainer);

  newProjectButton.addEventListener('click', () => {
    form.hidden = false;
    newProjectButton.disabled = true;
    titleInput.focus();
  });

  cancelButton.addEventListener('click', () => {
    form.reset();
    form.hidden = true;
    feedback.textContent = '';
    newProjectButton.disabled = false;
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const projectTitle = titleInput.value.trim();
    const projectType =
      typeSelect.value as BusinessStudioProjectType;

    if (!projectTitle) {
      feedback.textContent = 'Çalışma adını girin.';
      return;
    }

    submitButton.disabled = true;
    cancelButton.disabled = true;
    feedback.textContent = 'Çalışma oluşturuluyor…';

    void options
      .onCreateProject(projectTitle, projectType)
      .catch((error: unknown) => {
        feedback.textContent =
          error instanceof Error
            ? error.message
            : 'Çalışma oluşturulamadı.';

        submitButton.disabled = false;
        cancelButton.disabled = false;
      });
  });

  return section;
}
