import type { BusinessRuntime } from '../app/BusinessRuntime';
import { createBusinessEmptyStateElement } from '../components/BusinessEmptyState';

export interface BusinessSettingsPageOptions {
  runtime?: BusinessRuntime;
  businessId?: string;
  role?: string;
}

export function createBusinessSettingsPageElement(
  options: BusinessSettingsPageOptions = {}
): HTMLElement {
  const root = document.createElement('div');
  root.className = 'ib-biz-page';
  root.dataset.businessPage = 'ayarlar';

  if (!options.runtime || !options.businessId) {
    root.appendChild(
      createBusinessEmptyStateElement({
        title: 'Ayarlar henüz yapılandırılmadı',
        description:
          'İşletme ayarları henüz bağlanmadı. Bu aşamada ayar değişiklikleri kaydedilmez.',
        actionLabel: 'Dashboard’a dön',
        actionHref: '/business/'
      })
    );
    return root;
  }

  const heading = document.createElement('h1');
  heading.textContent = 'İşletme ayarları';

  const card = document.createElement('section');
  card.className = 'ib-biz-card';

  const cardHeading = document.createElement('h2');
  cardHeading.textContent = 'İşletme profili';

  const label = document.createElement('p');
  label.textContent = 'İşletme adı';

  const name = document.createElement('strong');
  name.textContent = 'Yükleniyor…';

  const canManage = options.role === 'owner' || options.role === 'admin';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.maxLength = 160;
  nameInput.autocomplete = 'organization';
  nameInput.setAttribute('aria-label', 'İşletme adı');
  nameInput.hidden = true;

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.textContent = 'İşletme adını kaydet';
  saveButton.hidden = true;

  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.textContent = 'Mevcut işletme bilgisi yükleniyor.';

  const accessNote = document.createElement('p');
  accessNote.textContent = canManage
    ? 'İşletme yöneticisi olarak işletme adını değiştirebilirsiniz.'
    : 'İşletme profili salt okunur. Düzenleme yetkisi için işletme yöneticinize başvurun.';

  const note = document.createElement('p');
  note.textContent = 'Güvenlik gereği yalnızca işletme adı güncellenebilir.';

  if (canManage) {
    nameInput.hidden = false;
    saveButton.hidden = false;
  }

  card.append(
    cardHeading, label, name, nameInput, saveButton, status, accessNote, note
  );
  root.append(heading, card);

  void options.runtime.client
    .from('business_accounts')
    .select('name')
    .eq('id', options.businessId)
    .maybeSingle()
    .then(({ data, error }) => {
      if (!root.isConnected) return;

      if (error || typeof data?.name !== 'string' || !data.name.trim()) {
        name.textContent = 'İşletme bilgisi alınamadı.';
        status.textContent =
          'İşletme bilgileri yüklenemedi. Daha sonra yeniden deneyin.';
        return;
      }

      name.textContent = data.name.trim();
      nameInput.value = data.name.trim();
      status.textContent = 'İşletme bilgisi yüklendi.';
    }, () => {
      if (!root.isConnected) return;
      name.textContent = 'İşletme bilgisi alınamadı.';
      status.textContent =
        'İşletme bilgileri yüklenemedi. Daha sonra yeniden deneyin.';
    });

  if (canManage) {
    saveButton.addEventListener('click', async () => {
      const nextName = nameInput.value.trim();

      if (!nextName || nextName.length > 160) {
        status.textContent = 'İşletme adı 1–160 karakter olmalıdır.';
        return;
      }

      saveButton.disabled = true;
      status.textContent = 'İşletme adı kaydediliyor…';

      try {
        const { data, error } = await options.runtime!.client
          .from('business_accounts')
          .update({ name: nextName })
          .eq('id', options.businessId!)
          .select('name')
          .maybeSingle();

        if (error) throw error;

        if (!data || typeof data.name !== 'string') {
          status.textContent =
            'İşletme adı güncellenemedi. Yetkinizi ve işletme erişiminizi kontrol edin.';
          return;
        }

        name.textContent = data.name.trim();
        nameInput.value = data.name.trim();
        status.textContent = 'İşletme adı başarıyla kaydedildi.';
      } catch {
        status.textContent =
          'İşletme adı kaydedilemedi. Bağlantıyı ve veritabanı yetkilerini kontrol edin.';
      } finally {
        saveButton.disabled = false;
      }
    });
  }

  return root;
}

export function mountBusinessSettingsPage(container: HTMLElement): void {
  container.replaceChildren(createBusinessSettingsPageElement());
}

export default mountBusinessSettingsPage;
