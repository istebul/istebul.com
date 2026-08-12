import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

const clientPath =
  "js/warehouse/picking-client.js";

const controllerPath =
  "js/warehouse/picking-write-controller.js";

const apiPath =
  "functions/api/warehouse/picking.js";

const client =
  await readFile(
    clientPath,
    "utf8"
  );

const controller =
  await readFile(
    controllerPath,
    "utf8"
  );

const api =
  await readFile(
    apiPath,
    "utf8"
  );

test(
  "Picking complete ayrı client fonksiyonudur",
  () => {
    assert.match(
      client,
      /export async function completePicking/
    );

    assert.match(
      client,
      /action:\s*"complete"/
    );

    assert.match(
      client,
      /buildPickingCompletePayload/
    );

    assert.match(
      client,
      /"Idempotency-Key"/
    );
  }
);

test(
  "Picking complete caller JWT ve account kapsamını HTTP API'ye taşır",
  async () => {
    const {
      completePicking,
    } =
      await import(
        "../../js/warehouse/picking-client.js"
      );

    let capturedUrl = null;
    let capturedOptions = null;

    const requestId =
      "22222222-2222-4222-8222-222222222222";

    const result =
      await completePicking({
        accessToken:
          "kullanici-token",

        accountId:
          "11111111-1111-4111-8111-111111111111",

        pickingId:
          "99999999-9999-4999-8999-999999999999",

        requestId,

        fetchImpl:
          async (
            url,
            options
          ) => {
            capturedUrl =
              url;

            capturedOptions =
              options;

            return {
              ok: true,
              status: 200,

              json:
                async () => ({
                  ok: true,

                  data: {
                    action:
                      "complete",

                    status:
                      "completed"
                  }
                })
            };
          }
      });

    assert.equal(
      capturedUrl,
      "/api/warehouse/picking"
    );

    assert.equal(
      capturedOptions.method,
      "POST"
    );

    assert.equal(
      capturedOptions.headers.Authorization,
      "Bearer kullanici-token"
    );

    assert.equal(
      capturedOptions.headers[
        "Idempotency-Key"
      ],
      requestId
    );

    const body =
      JSON.parse(
        capturedOptions.body
      );

    assert.equal(
      body.accountId,
      "11111111-1111-4111-8111-111111111111"
    );

    assert.equal(
      body.action,
      "complete"
    );

    assert.deepEqual(
      body.payload,
      {
        pickingId:
          "99999999-9999-4999-8999-999999999999"
      }
    );

    assert.equal(
      result.requestId,
      requestId
    );

    assert.equal(
      result.data.status,
      "completed"
    );
  }
);

test(
  "Picking complete ağ hatası retry işleminde aynı Idempotency-Key değerini korur",
  async () => {
    const {
      persistPickingCompletion,
    } =
      await import(
        "../../js/warehouse/picking-write-controller.js"
      );

    const requestIds = [];

    let attempt = 0;

    const completion = {
      pickingId:
        "77777777-7777-4777-8777-777777777777"
    };

    const dependencies = {
      getContext:
        () => ({
          accountId:
            "11111111-1111-4111-8111-111111111111"
        }),

      getSession:
        async () => ({
          access_token:
            "kullanici-token"
        }),

      complete:
        async (input) => {
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
              action:
                "complete",

              status:
                "completed"
            }
          };
        }
    };

    await assert.rejects(
      persistPickingCompletion(
        completion,
        dependencies
      ),
      /Geçici ağ hatası/
    );

    const result =
      await persistPickingCompletion(
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
  }
);

test(
  "başarılı Picking complete sonrası aynı payload yeni Idempotency-Key üretir",
  async () => {
    const {
      persistPickingCompletion,
    } =
      await import(
        "../../js/warehouse/picking-write-controller.js"
      );

    const requestIds = [];

    const completion = {
      pickingId:
        "88888888-8888-4888-8888-888888888888"
    };

    const dependencies = {
      getContext:
        () => ({
          accountId:
            "11111111-1111-4111-8111-111111111111"
        }),

      getSession:
        async () => ({
          access_token:
            "kullanici-token"
        }),

      complete:
        async (input) => {
          requestIds.push(
            input.requestId
          );

          return {
            requestId:
              input.requestId,

            data: {
              action:
                "complete",

              status:
                "completed"
            }
          };
        }
    };

    await persistPickingCompletion(
      completion,
      dependencies
    );

    await persistPickingCompletion(
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
  }
);

test(
  "Picking complete ayrı confirm eventini dinler",
  () => {
    assert.match(
      controller,
      /warehouse:picking-complete-confirm/
    );

    assert.match(
      controller,
      /warehouse:picking-complete-start/
    );

    assert.match(
      controller,
      /warehouse:picking-complete-success/
    );

    assert.match(
      controller,
      /warehouse:picking-complete-error/
    );
  }
);

test(
  "Picking complete barkod veya execute success tarafından otomatik başlatılmaz",
  () => {
    assert.doesNotMatch(
      controller,
      /warehouse:barcode-scan/
    );

    assert.doesNotMatch(
      controller,
      /addEventListener\(\s*"warehouse:picking-write-success"/
    );

    assert.match(
      controller,
      /addEventListener\(\s*"warehouse:picking-complete-confirm"/
    );
  }
);

test(
  "execute_item ile complete ayrı client fonksiyonlarıdır",
  () => {
    assert.match(
      client,
      /export async function executePickingItem/
    );

    assert.match(
      client,
      /export async function completePicking/
    );

    assert.match(
      client,
      /action:\s*"execute_item"/
    );

    assert.match(
      client,
      /action:\s*"complete"/
    );
  }
);

test(
  "Picking complete client/controller service role veya doğrudan inventory mutation açmaz",
  () => {
    const combined =
      `${client}\n${controller}`;

    assert.doesNotMatch(
      combined,
      /SUPABASE_SERVICE_ROLE_KEY|service_role|serviceRole/i
    );

    assert.doesNotMatch(
      combined,
      /warehouse_inventory_(?:balances|movements|reservations)/i
    );

    assert.doesNotMatch(
      combined,
      /\.from\s*\(|\.insert\s*\(|\.update\s*\(|\.upsert\s*\(/
    );
  }
);



test(
  "A6.4 complete ile A6.5 exception çözümü birbirini otomatik başlatmaz",
  async () => {
    const ui =
      await readFile(
        "js/warehouse/picking-ui.js",
        "utf8"
      );

    const controller =
      await readFile(
        "js/warehouse/picking-write-controller.js",
        "utf8"
      );

    const client =
      await readFile(
        "js/warehouse/picking-client.js",
        "utf8"
      );

    assert.match(
      ui,
      /warehouse:picking-complete-confirm/
    );

    assert.match(
      ui,
      /warehouse:picking-exception-confirm/
    );

    assert.match(
      controller,
      /warehouse:picking-complete-confirm/
    );

    assert.match(
      controller,
      /warehouse:picking-exception-confirm/
    );

    assert.match(
      client,
      /action:\s*["']complete["']/
    );

    assert.match(
      client,
      /action:\s*["']resolve_exception["']/
    );

    const completeSuccess =
      ui.indexOf(
        '"warehouse:picking-complete-success"'
      );

    assert.ok(
      completeSuccess >= 0
    );

    const completeEnd =
      ui.indexOf(
        "document.addEventListener",
        completeSuccess + 1
      );

    assert.doesNotMatch(
      ui.slice(
        completeSuccess,
        completeEnd >= 0
          ? completeEnd
          : undefined
      ),
      /dispatchEvent[\s\S]{0,300}?warehouse:picking-exception-confirm/
    );

    const exceptionSuccess =
      ui.indexOf(
        '"warehouse:picking-exception-success"'
      );

    assert.ok(
      exceptionSuccess >= 0
    );

    const exceptionEnd =
      ui.indexOf(
        "document.addEventListener",
        exceptionSuccess + 1
      );

    assert.doesNotMatch(
      ui.slice(
        exceptionSuccess,
        exceptionEnd >= 0
          ? exceptionEnd
          : undefined
      ),
      /dispatchEvent[\s\S]{0,300}?warehouse:picking-complete-confirm/
    );
  }
);

test(
  "Picking HTTP complete ayrı RPC yolunu korur",
  () => {
    assert.match(
      api,
      /warehouse_picking_complete_write/
    );

    assert.match(
      api,
      /input\.action\s*===\s*"complete"/
    );
  }
);

test(
  "Toplamayı Tamamla ayrı açık kullanıcı butonudur",
  async () => {
    const html =
      await readFile(
        "warehouse/index.html",
        "utf8"
      );

    assert.match(
      html,
      /id="toplama-tamamla"/
    );

    assert.match(
      html,
      />\s*Toplamayı Tamamla\s*</
    );

    assert.match(
      html,
      /yeni stok hareketi oluşturmaz/i
    );
  }
);

test(
  "Picking complete UI ikinci kullanıcı onayı ister",
  async () => {
    const source =
      await readFile(
        "js/warehouse/picking-ui.js",
        "utf8"
      );

    assert.match(
      source,
      /function confirmPickingCompletion/
    );

    assert.match(
      source,
      /window\.confirm/
    );

    assert.match(
      source,
      /Toplamayı tamamlamak istediğinize emin misiniz/
    );

    assert.match(
      source,
      /warehouse:picking-complete-confirm/
    );
  }
);

test(
  "Picking complete UI lifecycle olaylarını ayrı işler",
  async () => {
    const source =
      await readFile(
        "js/warehouse/picking-ui.js",
        "utf8"
      );

    for (const eventName of [
      "warehouse:picking-complete-start",
      "warehouse:picking-complete-success",
      "warehouse:picking-complete-error",
    ]) {
      assert.match(
        source,
        new RegExp(
          eventName.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          )
        )
      );
    }
  }
);

test(
  "Picking complete başarılı olduğunda aktif görev listesi yenilenir",
  async () => {
    const source =
      await readFile(
        "js/warehouse/picking-ui.js",
        "utf8"
      );

    assert.match(
      source,
      /warehouse:picking-complete-success[\s\S]{0,700}?void loadPickingTaskOptions\(\)/
    );
  }
);

test(
  "execute success complete confirm olayı üretmez",
  async () => {
    const source =
      await readFile(
        "js/warehouse/picking-ui.js",
        "utf8"
      );

    const start =
      source.indexOf(
        '"warehouse:picking-write-success"'
      );

    assert.ok(
      start >= 0,
      "Picking write success listener bulunamadı."
    );

    const nextListener =
      source.indexOf(
        "document.addEventListener",
        start + 1
      );

    const block =
      nextListener >= 0
        ? source.slice(
            start,
            nextListener
          )
        : source.slice(
            start
          );

    assert.doesNotMatch(
      block,
      /warehouse:picking-complete-confirm/
    );
  }
);

test(
  "barkod listener Picking complete başlatmaz",
  async () => {
    const source =
      await readFile(
        "js/warehouse/picking-ui.js",
        "utf8"
      );

    const start =
      source.indexOf(
        '"warehouse:barcode-scan"'
      );

    assert.ok(
      start >= 0,
      "Picking barkod listener bulunamadı."
    );

    const end =
      source.indexOf(
        "select?.addEventListener",
        start
      );

    assert.ok(
      end > start,
      "Picking barkod listener sınırı bulunamadı."
    );

    const block =
      source.slice(
        start,
        end
      );

    assert.doesNotMatch(
      block,
      /warehouse:picking-complete-confirm/
    );
  }
);

test(
  "Toplamayı Tamamla mobil dokunma alanını korur",
  async () => {
    const css =
      await readFile(
        "css/warehouse/picking-mobile.css",
        "utf8"
      );

    assert.match(
      css,
      /warehouse-picking-complete/
    );

    assert.match(
      css,
      /min-height:\s*48px/
    );
  }
);


test(
  "A6.4 complete ve A6.5 exception ayrı explicit kullanıcı kontrolleridir",
  async () => {
    const ui =
      await readFile(
        "js/warehouse/picking-ui.js",
        "utf8"
      );

    const html =
      await readFile(
        "warehouse/index.html",
        "utf8"
      );

    assert.match(
      html,
      /id="toplama-tamamla"/
    );

    assert.match(
      html,
      /id="toplama-istisna-coz"/
    );

    assert.match(
      ui,
      /function confirmPickingCompletion/
    );

    assert.match(
      ui,
      /function confirmPickingExceptionResolution/
    );

    assert.match(
      ui,
      /warehouse:picking-complete-confirm/
    );

    assert.match(
      ui,
      /warehouse:picking-exception-confirm/
    );
  }
);
