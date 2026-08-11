import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("B4 yalnız açık receiving-confirm olayını gerçek write işlemine bağlar", async () => {
  const source = await readFile(
    "js/warehouse/receiving-write-controller.js",
    "utf8"
  );

  assert.match(
    source,
    /warehouse:receiving-confirm/
  );

  assert.match(
    source,
    /receiveQuantity/
  );

  assert.doesNotMatch(
    source,
    /warehouse:barcode-scan/
  );
});

test("B4 tam kabul payload sözleşmesini SQL ile aynı alanlarda kurar", async () => {
  const source = await readFile(
    "js/warehouse/receiving-write-controller.js",
    "utf8"
  );

  assert.match(
    source,
    /receivingId: requireUuid/
  );

  assert.match(
    source,
    /receivingItemId: requireUuid/
  );

  assert.match(
    source,
    /receivedQuantity: quantity/
  );

  assert.match(
    source,
    /acceptedQuantity: quantity/
  );

  assert.match(
    source,
    /rejectedQuantity: 0/
  );

  assert.match(
    source,
    /damagedQuantity: 0/
  );
});

test("B4 kullanıcı JWT oturumunu Receiving Client üzerinden taşır", async () => {
  const source = await readFile(
    "js/warehouse/receiving-write-controller.js",
    "utf8"
  );

  assert.match(
    source,
    /getWarehouseSession/
  );

  assert.match(
    source,
    /session\.access_token/
  );

  assert.match(
    source,
    /accountId/
  );

  assert.doesNotMatch(
    source,
    /SUPABASE_SERVICE_ROLE_KEY/
  );

  assert.doesNotMatch(
    source,
    /SUPABASE_ANON_KEY/
  );
});

test("B4 eşzamanlı çift kullanıcı onayını engeller", async () => {
  const source = await readFile(
    "js/warehouse/receiving-write-controller.js",
    "utf8"
  );

  assert.match(
    source,
    /let writePending = false/
  );

  assert.match(
    source,
    /if \(writePending\)/
  );

  assert.match(
    source,
    /writePending = true/
  );

  assert.match(
    source,
    /writePending = false/
  );
});

test("Mobil UI yazma başlarken butonu kilitler ve sonuç olaylarını gösterir", async () => {
  const source = await readFile(
    "js/warehouse/receiving-ui.js",
    "utf8"
  );

  assert.match(
    source,
    /warehouse:receiving-write-start/
  );

  assert.match(
    source,
    /warehouse:receiving-write-success/
  );

  assert.match(
    source,
    /warehouse:receiving-write-error/
  );

  assert.match(
    source,
    /confirmButton\.disabled = true/
  );

  assert.match(
    source,
    /confirmButton\.disabled = false/
  );
});

test("Barkod tarama doğrudan write controller tarafından dinlenmez", async () => {
  const controller = await readFile(
    "js/warehouse/receiving-write-controller.js",
    "utf8"
  );

  assert.doesNotMatch(
    controller,
    /warehouse:barcode-scan/
  );

  const scanner = await readFile(
    "js/warehouse/barcode-scanner.js",
    "utf8"
  );

  assert.doesNotMatch(
    scanner,
    /receiveQuantity/
  );

  assert.doesNotMatch(
    scanner,
    /\/api\/warehouse\/receiving/
  );
});

test("Warehouse sayfası write controllerı UI sonrasında yükler", async () => {
  const html = await readFile(
    "warehouse/index.html",
    "utf8"
  );

  const uiIndex =
    html.indexOf(
      "/js/warehouse/receiving-ui.js"
    );

  const writeIndex =
    html.indexOf(
      "/js/warehouse/receiving-write-controller.js"
    );

  assert.ok(uiIndex >= 0);
  assert.ok(writeIndex > uiIndex);
});

test("Production build B4 controller dosyasını yayınlar", async () => {
  const source = await readFile(
    "scripts/production-build.cjs",
    "utf8"
  );

  assert.match(
    source,
    /js\/warehouse\/receiving-write-controller\.js/
  );
});

test("Ağ hatasından sonraki aynı işlem aynı Idempotency-Key ile tekrar edilir", async () => {
  const {
    persistReceivingConfirmation
  } = await import(
    "../../js/warehouse/receiving-write-controller.js"
  );

  const requestIds = [];
  let attempt = 0;

  const confirmation = {
    receivingId:
      "33333333-3333-4333-8333-333333333333",
    itemId:
      "44444444-4444-4444-8444-444444444444",
    receivedQuantity: 5
  };

  const dependencies = {
    getContext: () => ({
      accountId:
        "11111111-1111-4111-8111-111111111111"
    }),

    getSession: async () => ({
      access_token:
        "kullanici-token"
    }),

    write: async (input) => {
      requestIds.push(
        input.requestId
      );

      attempt += 1;

      if (attempt === 1) {
        throw new Error(
          "Geçici ağ hatası"
        );
      }

      return {
        requestId:
          input.requestId,
        data: {
          status:
            "partially_received"
        }
      };
    }
  };

  await assert.rejects(
    persistReceivingConfirmation(
      confirmation,
      dependencies
    ),
    /Geçici ağ hatası/
  );

  const result =
    await persistReceivingConfirmation(
      confirmation,
      dependencies
    );

  assert.equal(
    requestIds.length,
    2
  );

  assert.equal(
    requestIds[0],
    requestIds[1]
  );

  assert.equal(
    result.requestId,
    requestIds[0]
  );
});

test("Başarılı işlem sonrası yeni kullanıcı onayı yeni Idempotency-Key üretir", async () => {
  const {
    persistReceivingConfirmation
  } = await import(
    "../../js/warehouse/receiving-write-controller.js"
  );

  const requestIds = [];

  const confirmation = {
    receivingId:
      "55555555-5555-4555-8555-555555555555",
    itemId:
      "66666666-6666-4666-8666-666666666666",
    receivedQuantity: 2
  };

  const dependencies = {
    getContext: () => ({
      accountId:
        "11111111-1111-4111-8111-111111111111"
    }),

    getSession: async () => ({
      access_token:
        "kullanici-token"
    }),

    write: async (input) => {
      requestIds.push(
        input.requestId
      );

      return {
        requestId:
          input.requestId,
        data: {
          status:
            "partially_received"
        }
      };
    }
  };

  await persistReceivingConfirmation(
    confirmation,
    dependencies
  );

  await persistReceivingConfirmation(
    confirmation,
    dependencies
  );

  assert.equal(
    requestIds.length,
    2
  );

  assert.notEqual(
    requestIds[0],
    requestIds[1]
  );
});
