import assert from 'node:assert/strict';
import { register } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

const dirname = path.dirname(fileURLToPath(import.meta.url));

register(
  pathToFileURL(
    path.join(dirname, '../helpers/business-ts-resolve.mjs')
  ).href
);

const { createBusinessSettingsPageElement } = await import(
  '../../src/business/pages/BusinessSettingsPage.ts'
);

const BUSINESS_ID = 'business-test-1';

class FakeElement {
  constructor(tagName) {
    this.tagName = String(tagName).toUpperCase();
    this.children = [];
    this.parentElement = null;
    this.attributes = new Map();
    this.dataset = {};
    this.listeners = new Map();
    this.className = '';
    this.textContent = '';
    this.value = '';
    this.type = '';
    this.name = '';
    this.maxLength = 0;
    this.autocomplete = '';
    this.disabled = false;
    this.hidden = false;
    this.isConnected = false;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  append(...nodes) {
    for (const node of nodes) this.appendChild(node);
  }

  prepend(...nodes) {
    for (const node of [...nodes].reverse()) {
      if (node.parentElement) {
        const oldChildren = node.parentElement.children;
        const oldIndex = oldChildren.indexOf(node);
        if (oldIndex >= 0) oldChildren.splice(oldIndex, 1);
      }

      node.parentElement = this;
      this.children.unshift(node);
    }
  }

  appendChild(node) {
    if (node.parentElement) {
      const oldChildren = node.parentElement.children;
      const oldIndex = oldChildren.indexOf(node);
      if (oldIndex >= 0) oldChildren.splice(oldIndex, 1);
    }
    node.parentElement = this;
    this.children.push(node);
    return node;
  }

  insertBefore(node, reference) {
    const index = this.children.indexOf(reference);
    if (index < 0) return this.appendChild(node);

    if (node.parentElement) {
      const oldChildren = node.parentElement.children;
      const oldIndex = oldChildren.indexOf(node);
      if (oldIndex >= 0) oldChildren.splice(oldIndex, 1);
    }

    node.parentElement = this;
    this.children.splice(this.children.indexOf(reference), 0, node);
    return node;
  }

  querySelectorAll(selector) {
    const tags = selector.split(',').map((tag) => tag.trim().toUpperCase());
    const result = [];

    const visit = (element) => {
      for (const child of element.children) {
        if (tags.includes(child.tagName)) result.push(child);
        visit(child);
      }
    };

    visit(this);
    return result;
  }

  addEventListener(type, callback) {
    const callbacks = this.listeners.get(type) ?? [];
    callbacks.push(callback);
    this.listeners.set(type, callbacks);
  }

  async click() {
    for (const callback of this.listeners.get('click') ?? []) {
      await callback({ target: this, currentTarget: this });
    }
  }
}

function createMockClient({
  accountName = 'Demo İşletme',
  storedSettings = null,
  settingsReadError = false
} = {}) {
  let currentAccountName = accountName;
  let settingsRow = storedSettings === null
    ? null
    : {
        business_id: BUSINESS_ID,
        settings: structuredClone(storedSettings)
      };

  const calls = [];

  const client = {
    from(table) {
      let operation = 'select';
      let payload = null;
      let selection = null;
      const filters = {};
      const query = {
        select(columns) {
          selection = columns;
          return query;
        },
        eq(column, value) {
          filters[column] = value;
          return query;
        },
        update(values) {
          operation = 'update';
          payload = values;
          return query;
        },
        insert(values) {
          operation = 'insert';
          payload = values;
          return query;
        },
        async maybeSingle() {
          calls.push({
            table,
            operation,
            payload: payload === null ? null : structuredClone(payload),
            selection,
            filters: { ...filters }
          });

          if (filters.id && filters.id !== BUSINESS_ID) {
            return { data: null, error: null };
          }

          if (table === 'business_accounts') {
            if (operation === 'select') {
              return {
                data: { name: currentAccountName },
                error: null
              };
            }

            if (operation === 'update') {
              currentAccountName = payload.name;
              return {
                data: { name: currentAccountName },
                error: null
              };
            }
          }

          if (table === 'business_settings') {
            if (operation === 'select') {
              if (settingsReadError) {
                return {
                  data: null,
                  error: { message: 'settings table unavailable' }
                };
              }

              return { data: settingsRow, error: null };
            }

            if (operation === 'insert') {
              if (payload.business_id !== BUSINESS_ID) {
                return { data: null, error: null };
              }

              settingsRow = {
                business_id: payload.business_id,
                settings: structuredClone(payload.settings)
              };
              return {
                data: { business_id: BUSINESS_ID },
                error: null
              };
            }

            if (
              operation === 'update' &&
              filters.business_id === BUSINESS_ID &&
              settingsRow
            ) {
              settingsRow.settings = structuredClone(payload.settings);
              return {
                data: { business_id: BUSINESS_ID },
                error: null
              };
            }
          }

          return { data: null, error: null };
        }
      };

      return query;
    }
  };

  return { client, calls };
}

function descendants(root) {
  const result = [];

  const visit = (element) => {
    for (const child of element.children) {
      result.push(child);
      visit(child);
    }
  };

  visit(root);
  return result;
}

function findElement(root, predicate) {
  const element = descendants(root).find(predicate);
  assert.ok(element, 'Beklenen DOM öğesi bulunamadı.');
  return element;
}

function createPage(mockOptions = {}, role = 'admin') {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement: (tagName) => new FakeElement(tagName)
  };

  try {
    const mock = createMockClient(mockOptions);
    const root = createBusinessSettingsPageElement({
      runtime: { client: mock.client },
      businessId: BUSINESS_ID,
      role
    });

    // Sayfanın bağlanmış DOM içindeki asenkron yükleme davranışını taklit et.
    root.isConnected = true;

    const statuses = descendants(root).filter(
      (element) =>
        element.tagName === 'P' &&
        element.getAttribute('role') === 'status'
    );

    assert.equal(statuses.length, 2);

    return {
      root,
      calls: mock.calls,
      profileStatus: statuses[0],
      settingsStatus: statuses[1],
      findInput(name) {
        return findElement(
          root,
          (element) =>
            element.tagName === 'INPUT' &&
            element.name === name
        );
      },
      findButton(label) {
        return findElement(
          root,
          (element) =>
            element.tagName === 'BUTTON' &&
            element.textContent === label
        );
      },
      restore() {
        globalThis.document = previousDocument;
      }
    };
  } catch (error) {
    globalThis.document = previousDocument;
    throw error;
  }
}

async function settle() {
  await new Promise((resolve) => setImmediate(resolve));
}

test('ilk genel ayar kaydını business_settings tablosuna ekler', async () => {
  const page = createPage();

  try {
    await settle();

    assert.match(
      page.settingsStatus.textContent,
      /Henüz genel ayar kaydı yok/
    );

    page.findInput('biz-organization-name').value = 'Yeni Organizasyon';

    await page.findButton('Genel ayarları kaydet').click();

    const insert = page.calls.find(
      (call) =>
        call.table === 'business_settings' &&
        call.operation === 'insert'
    );

    assert.ok(insert, 'İlk kayıtta INSERT kullanılmalı.');
    assert.equal(insert.payload.business_id, BUSINESS_ID);
    assert.equal(
      insert.payload.settings.organization.organizationName,
      'Yeni Organizasyon'
    );
    assert.equal(
      insert.payload.settings.localization.timezone,
      'Europe/Istanbul'
    );
    assert.equal(
      page.settingsStatus.textContent,
      'Genel ayarlar başarıyla kaydedildi.'
    );
  } finally {
    page.restore();
  }
});

test('mevcut genel ayarları günceller ve diğer ayar alanlarını korur', async () => {
  const page = createPage({
    storedSettings: {
      custom: { preserve: true },
      organization: {
        organizationName: 'Eski Organizasyon',
        countryCode: 'TR',
        city: 'İzmir',
        addressLine: '',
        employeeCountBand: ''
      },
      localization: {
        defaultLocale: 'tr',
        timezone: 'Europe/Istanbul',
        currency: 'TRY',
        dateFormat: 'DD.MM.YYYY'
      }
    }
  });

  try {
    await settle();

    assert.equal(
      page.settingsStatus.textContent,
      'Kayıtlı genel ayarlar yüklendi.'
    );

    page.findInput('biz-organization-name').value = 'Güncel Organizasyon';

    await page.findButton('Genel ayarları kaydet').click();

    const update = page.calls.find(
      (call) =>
        call.table === 'business_settings' &&
        call.operation === 'update'
    );

    assert.ok(update, 'Mevcut kayıtta UPDATE kullanılmalı.');
    assert.equal(update.filters.business_id, BUSINESS_ID);
    assert.equal(
      update.payload.settings.organization.organizationName,
      'Güncel Organizasyon'
    );
    assert.deepEqual(update.payload.settings.custom, { preserve: true });
    assert.equal(
      page.settingsStatus.textContent,
      'Genel ayarlar başarıyla kaydedildi.'
    );
  } finally {
    page.restore();
  }
});

test('ayar tablosu okunamazsa işletme adı kaydı çalışmaya devam eder', async () => {
  const page = createPage({ settingsReadError: true });

  try {
    await settle();

    assert.match(
      page.settingsStatus.textContent,
      /Genel ayar deposu okunamadı/
    );

    const nameInput = findElement(
      page.root,
      (element) =>
        element.tagName === 'INPUT' &&
        element.getAttribute('aria-label') === 'İşletme adı'
    );

    nameInput.value = 'Güncellenen İşletme';

    await page.findButton('İşletme adını kaydet').click();

    const accountUpdate = page.calls.find(
      (call) =>
        call.table === 'business_accounts' &&
        call.operation === 'update'
    );

    assert.ok(accountUpdate, 'İşletme adı güncellemesi devam etmeli.');
    assert.equal(accountUpdate.payload.name, 'Güncellenen İşletme');
    assert.equal(
      page.profileStatus.textContent,
      'İşletme adı başarıyla kaydedildi.'
    );
  } finally {
    page.restore();
  }
});
