import type { BusinessStudioProject } from '../studio';

function formatProjectType(type: BusinessStudioProject['type']): string {
  switch (type) {
    case 'report':
      return 'Rapor';
    case 'presentation':
      return 'Sunum';
    case 'analysis':
      return 'Analiz';
  }
}

export function createBusinessLiveProjectsElement(
  projects: BusinessStudioProject[]
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'ib-biz-section';
  section.setAttribute('aria-labelledby', 'business-live-projects-title');

  const heading = document.createElement('div');
  heading.className = 'ib-biz-section-heading';
  heading.innerHTML = `
    <div>
      <span class="ib-biz-kicker">Canlı çalışma alanı</span>
      <h2 id="business-live-projects-title">Son çalışmalar</h2>
    </div>
    <button type="button" class="ib-biz-button ib-biz-button-primary" data-business-new-project>
      Yeni çalışma
    </button>
  `;

  section.appendChild(heading);

  if (projects.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'ib-biz-empty';
    empty.innerHTML = `
      <h3>Henüz çalışma yok</h3>
      <p>İlk rapor, sunum veya analiz çalışmanızı oluşturun.</p>
    `;
    section.appendChild(empty);
    return section;
  }

  const grid = document.createElement('div');
  grid.className = 'ib-biz-card-grid';

  projects.forEach((project) => {
    const article = document.createElement('article');
    article.className = 'ib-biz-card';
    article.innerHTML = `
      <span class="ib-biz-card-badge">${formatProjectType(project.type)}</span>
      <h3>${project.title}</h3>
      <p>Durum: ${project.status}</p>
      <small>Güncellendi: ${new Date(project.updatedAt).toLocaleString('tr-TR')}</small>
    `;
    grid.appendChild(article);
  });

  section.appendChild(grid);
  return section;
}
