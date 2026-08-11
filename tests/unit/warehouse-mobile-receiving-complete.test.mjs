import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Mal Kabulü Tamamla ayrı ve açık kullanıcı butonudur", async () => {
  const html = await readFile(
    "warehouse/index.html",
    "utf8"
  );

  assert.match(
    html,
    /id="mal-kabul-tamamla"/
  );

  assert.match(
    html,
    />\s*Mal Kabulü Tamamla\s*</
  );

  assert.match(
    html,
    /atomik stok hareketlerini oluşturulmasını|atomik olarak oluşturulmasını/i
  );
});

test("Complete barkod tarama veya miktar onayından otomatik başlamaz", async () => {
  const source = await readFile(
    "js/warehouse/receiving-write-controller.js",
    "utf8"
  );

  assert.match(
    source,
    /warehouse:receiving-complete-confirm/
  );

  assert.doesNotMatch(
    source,
    /warehouse:barcode-scan/
  );
});

test("Mobil UI complete öncesinde ikinci kullanıcı onayı ister", async () => {
  const source = await readFile(
    "js/warehouse/receiving-ui.js",
    "utf8"
  );

  assert.match(
    source,
    /window\.confirm/
  );

  assert.match(
    source,
    /Mal kabulü tamamlamak istediğinize emin misiniz/
  );

  assert.match(
    source,
    /warehouse:receiving-complete-confirm/
  );
});

test("Complete güvenli kullanıcı JWT ve account contexti kullanır", async () => {
  const source = await readFile(
    "js/warehouse/receiving-write-controller.js",
    "utf8"
  );

  assert.match(
    source,
    /persistReceivingCompletion/
  );

  assert.match(
    source,
    /session\.access_token/
  );

  assert.match(
    source,
    /complete\(\{/
  );

  assert.match(
    source,
    /receivingId/
  );

  assert.doesNotMatch(
    source,
    /SUPABASE_SERVICE_ROLE_KEY/
  );
});

test("Complete başarı ve hata olayları UI tarafından ayrı işlenir", async () => {
  const source = await readFile(
    "js/warehouse/receiving-ui.js",
    "utf8"
  );

  assert.match(
    source,
    /warehouse:receiving-complete-start/
  );

  assert.match(
    source,
    /warehouse:receiving-complete-success/
  );

  assert.match(
    source,
    /warehouse:receiving-complete-error/
  );
});

test("Complete başarılı olduğunda aktif mal kabul listesi yenilenir", async () => {
  const source = await readFile(
    "js/warehouse/receiving-ui.js",
    "utf8"
  );

  assert.match(
    source,
    /void loadReceivingOptions\(\)/
  );

  assert.match(
    source,
    /postedMovementCount/
  );
});

test("Complete ile receive_quantity ayrı client fonksiyonlarıdır", async () => {
  const source = await readFile(
    "js/warehouse/receiving-client.js",
    "utf8"
  );

  assert.match(
    source,
    /export async function receiveQuantity/
  );

  assert.match(
    source,
    /export async function completeReceiving/
  );

  assert.match(
    source,
    /action: "complete"/
  );

  assert.match(
    source,
    /action: "receive_quantity"/
  );
});

test("Mal Kabulü Tamamla mobil dokunma alanını korur", async () => {
  const css = await readFile(
    "css/warehouse/receiving-mobile.css",
    "utf8"
  );

  assert.match(
    css,
    /warehouse-receiving-complete/
  );

  assert.match(
    css,
    /min-height:48px/
  );
});

test("Complete ağ hatasında aynı Idempotency-Key ile tekrar edilir", async () => {
  const {
    persistReceivingCompletion
  } = await import(
    "../../js/warehouse/receiving-write-controller.js"
  );

  const requestIds = [];
  let attempt = 0;

  const completion = {
    receivingId:
      "77777777-7777-4777-8777-777777777777"
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

    complete: async (input) => {
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
          action: "complete",
          status: "completed",
          postedMovementCount: 2
        }
      };
    }
  };

  await assert.rejects(
    persistReceivingCompletion(
      completion,
      dependencies
    ),
    /Geçici ağ hatası/
  );

  const result =
    await persistReceivingCompletion(
      completion,
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

  assert.equal(
    result.data.status,
    "completed"
  );
});

test("Başarılı complete sonrası yeni tamamlama aksiyonu yeni Idempotency-Key üretir", async () => {
  const {
    persistReceivingCompletion
  } = await import(
    "../../js/warehouse/receiving-write-controller.js"
  );

  const requestIds = [];

  const completion = {
    receivingId:
      "88888888-8888-4888-8888-888888888888"
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

    complete: async (input) => {
      requestIds.push(
        input.requestId
      );

      return {
        requestId:
          input.requestId,
        data: {
          action: "complete",
          status: "completed"
        }
      };
    }
  };

  await persistReceivingCompletion(
    completion,
    dependencies
  );

  await persistReceivingCompletion(
    completion,
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
