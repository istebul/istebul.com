import type { BusinessRuntime } from '../app/BusinessRuntime';
import { createBusinessEmptyStateElement } from '../components/BusinessEmptyState';

type JsonRecord = Record<string, unknown>;

export interface BusinessSettingsPageOptions {
  runtime?: BusinessRuntime;
  businessId?: string;
  role?: string;
}

function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function stringValue(
  record: JsonRecord,
  key: string,
  fallback = ''
): string {
  const value = record[key];
  return typeof value === 'string' ? value : fallback;
}

function addTextField(
  parent: HTMLElement,
  id: string,
  labelText: string,
  value: string,
  maxLength: number
): HTMLInputElement {
  const wrapper = document.createElement('div');
  const label = document.createElement('label');
  const input = document.createElement('input');

  label.htmlFor = id;
  label.textContent = labelText;
  input.id = id;
  input.name = id;
  input.type = 'text';
  input.maxLength = maxLength;
  input.value = value;
  input.autocomplete = 'off';

  wrapper.append(label, input);
  parent.appendChild(wrapper);
  return input;
}

function addSelectField(
  parent: HTMLElement,
  id: string,
  labelText: string,
  value: string,
  choices: ReadonlyArray<{ value: string; label: string }>
): HTMLSelectElement {
  const wrapper = document.createElement('div');
  const label = document.createElement('label');
  const select = document.createElement('select');

  label.htmlFor = id;
  label.textContent = labelText;
  select.id = id;
  select.name = id;

  for (const choice of choices) {
    const option = document.createElement('option');
    option.value = choice.value;
    option.textContent = choice.label;
    select.appendChild(option);
  }

  select.value = value;
  wrapper.append(label, select);
  parent.appendChild(wrapper);
  return select;
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

  const runtime = options.runtime;
  const businessId = options.businessId;
  const canManage = options.role === 'owner' || options.role === 'admin';

  const heading = document.createElement('h1');
  heading.textContent = 'İşletme ayarları';

  const profileCard = document.createElement('section');
  profileCard.className = 'ib-biz-card';

  const profileHeading = document.createElement('h2');
  profileHeading.textContent = 'İşletme profili';

  const profileLabel = document.createElement('p');
  profileLabel.textContent = 'İşletme adı';

  const currentName = document.createElement('strong');
  currentName.textContent = 'Yükleniyor…';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.maxLength = 160;
  nameInput.autocomplete = 'organization';
  nameInput.setAttribute('aria-label', 'İşletme adı');
  nameInput.hidden = !canManage;

  const nameSave = document.createElement('button');
  nameSave.type = 'button';
  nameSave.textContent = 'İşletme adını kaydet';
  nameSave.hidden = !canManage;

  const profileStatus = document.createElement('p');
  profileStatus.setAttribute('role', 'status');
  profileStatus.setAttribute('aria-live', 'polite');
  profileStatus.textContent = 'Mevcut işletme bilgisi yükleniyor.';

  const accessNote = document.createElement('p');
  accessNote.textContent = canManage
    ? 'İşletme yöneticisi olarak ayarları değiştirebilirsiniz.'
    : 'Ayarlar salt okunur. Düzenleme yetkisi için işletme yöneticinize başvurun.';

  profileCard.append(
    profileHeading,
    profileLabel,
    currentName,
    nameInput,
    nameSave,
    profileStatus,
    accessNote
  );

  const settingsCard = document.createElement('section');
  settingsCard.className = 'ib-biz-card';

  const settingsHeading = document.createElement('h2');
  settingsHeading.textContent = 'Organizasyon ve yerelleştirme';

  const settingsDescription = document.createElement('p');
  settingsDescription.textContent =
    'Bu bölüm işletme bilgilerini ve varsayılan bölgesel tercihleri saklar. ' +
    'Bildirim veya AI davranışını değiştirmez.';

  const organizationHeading = document.createElement('h3');
  organizationHeading.textContent = 'Organizasyon';

  const organizationName = addTextField(
    settingsCard, 'biz-organization-name', 'Organizasyon adı', '', 160
  );
  const countryCode = addTextField(
    settingsCard, 'biz-country-code', 'Ülke kodu (ISO)', 'TR', 2
  );
  const city = addTextField(
    settingsCard, 'biz-city', 'Şehir', '', 100
  );
  const addressLine = addTextField(
    settingsCard, 'biz-address-line', 'Adres', '', 200
  );
  const employeeCountBand = addSelectField(
    settingsCard,
    'biz-employee-count',
    'Çalışan sayısı aralığı',
    '',
    [
      { value: '', label: 'Belirtilmedi' },
      { value: '1-10', label: '1–10' },
      { value: '11-50', label: '11–50' },
      { value: '51-200', label: '51–200' },
      { value: '201-500', label: '201–500' },
      { value: '500+', label: '500+' }
    ]
  );

  const localizationHeading = document.createElement('h3');
  localizationHeading.textContent = 'Yerelleştirme';

  const locale = addSelectField(
    settingsCard,
    'biz-default-locale',
    'Varsayılan dil',
    'tr',
    [
      { value: 'tr', label: 'Türkçe' },
      { value: 'en', label: 'English' }
    ]
  );
  const timezone = addTextField(
    settingsCard, 'biz-timezone', 'Saat dilimi', 'Europe/Istanbul', 80
  );
  const currency = addTextField(
    settingsCard, 'biz-currency', 'Para birimi (ISO)', 'TRY', 3
  );
  const dateFormat = addSelectField(
    settingsCard,
    'biz-date-format',
    'Tarih biçimi',
    'DD.MM.YYYY',
    [
      { value: 'DD.MM.YYYY', label: 'GG.AA.YYYY' },
      { value: 'YYYY-MM-DD', label: 'YYYY-AA-GG' },
      { value: 'MM/DD/YYYY', label: 'AA/GG/YYYY' }
    ]
  );

  const settingsSave = document.createElement('button');
  settingsSave.type = 'button';
  settingsSave.textContent = 'Genel ayarları kaydet';
  settingsSave.disabled = true;
  settingsSave.hidden = !canManage;

  const settingsStatus = document.createElement('p');
  settingsStatus.setAttribute('role', 'status');
  settingsStatus.setAttribute('aria-live', 'polite');
  settingsStatus.textContent = 'Ayarlar yükleniyor.';

  settingsCard.prepend(
    settingsHeading,
    settingsDescription,
    organizationHeading
  );
  settingsCard.insertBefore(localizationHeading, locale.parentElement);
  settingsCard.append(settingsSave, settingsStatus);

  root.append(heading, profileCard, settingsCard);

  let storedSettings: JsonRecord = {};
  let settingsRowExists = false;
  let settingsLoaded = false;

  async function loadPage(): Promise<void> {
    const [accountResult, settingsResult] = await Promise.all([
      runtime.client
        .from('business_accounts')
        .select('name')
        .eq('id', businessId)
        .maybeSingle(),
      runtime.client
        .from('business_settings')
        .select('settings')
        .eq('business_id', businessId)
        .maybeSingle()
    ]);

    if (!root.isConnected) return;

    const accountName =
      typeof accountResult.data?.name === 'string'
        ? accountResult.data.name.trim()
        : '';

    if (accountResult.error || !accountName) {
      currentName.textContent = 'İşletme bilgisi alınamadı.';
      profileStatus.textContent =
        'İşletme bilgileri yüklenemedi. Daha sonra yeniden deneyin.';
    } else {
      currentName.textContent = accountName;
      nameInput.value = accountName;
      profileStatus.textContent = 'İşletme bilgisi yüklendi.';
    }

    if (settingsResult.error) {
      settingsStatus.textContent =
        'Genel ayar deposu okunamadı. Veritabanı migration durumunu ve erişim yetkilerini kontrol edin.';
      settingsSave.disabled = true;
      return;
    }

    settingsRowExists = Boolean(settingsResult.data);
    storedSettings = asRecord(settingsResult.data?.settings);

    const organization = asRecord(storedSettings.organization);
    const localization = asRecord(storedSettings.localization);

    organizationName.value = stringValue(
      organization, 'organizationName', accountName
    );
    countryCode.value = stringValue(organization, 'countryCode', 'TR');
    city.value = stringValue(organization, 'city');
    addressLine.value = stringValue(organization, 'addressLine');
    employeeCountBand.value = stringValue(
      organization, 'employeeCountBand'
    );

    locale.value = stringValue(localization, 'defaultLocale', 'tr');
    timezone.value = stringValue(
      localization, 'timezone', 'Europe/Istanbul'
    );
    currency.value = stringValue(localization, 'currency', 'TRY');
    dateFormat.value = stringValue(
      localization, 'dateFormat', 'DD.MM.YYYY'
    );

    settingsLoaded = true;
    settingsSave.disabled = !canManage;
    settingsStatus.textContent = settingsRowExists
      ? 'Kayıtlı genel ayarlar yüklendi.'
      : 'Henüz genel ayar kaydı yok. Varsayılan değerleri düzenleyip kaydedebilirsiniz.';
  }

  nameSave.addEventListener('click', async () => {
    const nextName = nameInput.value.trim();

    if (!nextName || nextName.length > 160) {
      profileStatus.textContent = 'İşletme adı 1–160 karakter olmalıdır.';
      return;
    }

    nameSave.disabled = true;
    profileStatus.textContent = 'İşletme adı kaydediliyor…';

    try {
      const { data, error } = await runtime.client
        .from('business_accounts')
        .update({ name: nextName })
        .eq('id', businessId)
        .select('name')
        .maybeSingle();

      if (error) throw error;

      if (!data || typeof data.name !== 'string') {
        profileStatus.textContent =
          'İşletme adı güncellenemedi. Yetkinizi ve işletme erişiminizi kontrol edin.';
        return;
      }

      currentName.textContent = data.name.trim();
      nameInput.value = data.name.trim();
      profileStatus.textContent = 'İşletme adı başarıyla kaydedildi.';
    } catch {
      profileStatus.textContent =
        'İşletme adı kaydedilemedi. Bağlantıyı ve veritabanı yetkilerini kontrol edin.';
    } finally {
      nameSave.disabled = false;
    }
  });

  settingsSave.addEventListener('click', async () => {
    if (!settingsLoaded || !canManage) return;

    const normalizedCountry = countryCode.value.trim().toUpperCase();
    const normalizedCurrency = currency.value.trim().toUpperCase();
    const normalizedTimezone = timezone.value.trim();

    if (!organizationName.value.trim()) {
      settingsStatus.textContent = 'Organizasyon adı boş bırakılamaz.';
      return;
    }

    if (!/^[A-Z]{2}$/.test(normalizedCountry)) {
      settingsStatus.textContent = 'Ülke kodu iki harfli ISO biçiminde olmalıdır.';
      return;
    }

    if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
      settingsStatus.textContent = 'Para birimi üç harfli ISO biçiminde olmalıdır.';
      return;
    }

    if (!normalizedTimezone || normalizedTimezone.length > 80) {
      settingsStatus.textContent = 'Geçerli bir saat dilimi girin.';
      return;
    }

    const nextSettings: JsonRecord = {
      ...storedSettings,
      organization: {
        ...asRecord(storedSettings.organization),
        organizationName: organizationName.value.trim(),
        countryCode: normalizedCountry,
        city: city.value.trim(),
        addressLine: addressLine.value.trim(),
        employeeCountBand: employeeCountBand.value
      },
      localization: {
        ...asRecord(storedSettings.localization),
        defaultLocale: locale.value,
        timezone: normalizedTimezone,
        currency: normalizedCurrency,
        dateFormat: dateFormat.value
      }
    };

    settingsSave.disabled = true;
    settingsStatus.textContent = 'Genel ayarlar kaydediliyor…';

    try {
      const result = settingsRowExists
        ? await runtime.client
            .from('business_settings')
            .update({ settings: nextSettings })
            .eq('business_id', businessId)
            .select('business_id')
            .maybeSingle()
        : await runtime.client
            .from('business_settings')
            .insert({
              business_id: businessId,
              settings: nextSettings
            })
            .select('business_id')
            .maybeSingle();

      if (result.error) throw result.error;

      if (!result.data) {
        settingsStatus.textContent =
          'Ayarlar kaydedilemedi. İşletme rolünüzü ve erişim politikasını kontrol edin.';
        return;
      }

      storedSettings = nextSettings;
      settingsRowExists = true;
      settingsStatus.textContent = 'Genel ayarlar başarıyla kaydedildi.';
    } catch {
      settingsStatus.textContent =
        'Genel ayarlar kaydedilemedi. Migration, bağlantı ve veritabanı erişim kurallarını kontrol edin.';
    } finally {
      settingsSave.disabled = !settingsLoaded || !canManage;
    }
  });

  void loadPage().catch(() => {
    if (!root.isConnected) return;
    profileStatus.textContent = 'İşletme bilgileri yüklenemedi.';
    settingsStatus.textContent = 'Genel ayarlar yüklenemedi.';
    settingsSave.disabled = true;
  });

  if (!canManage) {
    settingsCard.querySelectorAll('input, select').forEach((control) => {
      (control as HTMLInputElement | HTMLSelectElement).disabled = true;
    });
  }

  return root;
}

export function mountBusinessSettingsPage(container: HTMLElement): void {
  container.replaceChildren(createBusinessSettingsPageElement());
}

export default mountBusinessSettingsPage;
