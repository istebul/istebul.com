import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

import {
  buildPickingResolveExceptionPayload,
  resolvePickingException,
} from "../../js/warehouse/picking-client.js";

import {
  buildPickingExceptionResolutionPayload,
  persistPickingExceptionResolution,
} from "../../js/warehouse/picking-write-controller.js";

const ACCOUNT_ID =
  "11111111-1111-4111-8111-111111111111";

const PICKING_ID =
  "22222222-2222-4222-8222-222222222222";

const EXCEPTION_ID =
  "33333333-3333-4333-8333-333333333333";

test(
  "Picking resolve_exception client payloadu picking exception ve opsiyonel not taşır",
  () => {
    const payload =
      buildPickingResolveExceptionPayload({
        pickingId:
          PICKING_ID,

        exceptionId:
          EXCEPTION_ID,

        resolutionNotes:
          "  Fiziksel stok sayımı ile doğrulandı.  ",
      });

    assert.deepEqual(
      payload,
      {
        pickingId:
          PICKING_ID,

        exceptionId:
          EXCEPTION_ID,

        resolutionNotes:
          "Fiziksel stok sayımı ile doğrulandı.",
      },
    );

    assert.ok(
      Object.isFrozen(
        payload,
      ),
    );
  },
);

test(
  "boş çözüm notu RPC payloadundan çıkarılır",
  () => {
    const payload =
      buildPickingResolveExceptionPayload({
        pickingId:
          PICKING_ID,

        exceptionId:
          EXCEPTION_ID,

        resolutionNotes:
          "   ",
      });

    assert.deepEqual(
      payload,
      {
        pickingId:
          PICKING_ID,

        exceptionId:
          EXCEPTION_ID,
      },
    );
  },
);

test(
  "Picking resolve_exception caller JWT Idempotency-Key ve ayrı action kullanır",
  async () => {
    const requestId =
      "44444444-4444-4444-8444-444444444444";

    let captured = null;

    const result =
      await resolvePickingException({
        accessToken:
          "kullanici-token",

        accountId:
          ACCOUNT_ID,

        pickingId:
          PICKING_ID,

        exceptionId:
          EXCEPTION_ID,

        resolutionNotes:
          "Sayım doğrulandı.",

        requestId,

        fetchImpl:
          async (
            url,
            options,
          ) => {
            captured = {
              url,
              options,
            };

            return new Response(
              JSON.stringify({
                ok: true,
                data: {
                  action:
                    "resolve_exception",

                  resolved:
                    true,
                },
              }),
              {
                status: 200,
                headers: {
                  "Content-Type":
                    "application/json",
                },
              },
            );
          },
      });

    assert.equal(
      captured.url,
      "/api/warehouse/picking",
    );

    assert.equal(
      captured.options.method,
      "POST",
    );

    assert.equal(
      captured.options.headers.Authorization,
      "Bearer kullanici-token",
    );

    assert.equal(
      captured.options.headers["Idempotency-Key"],
      requestId,
    );

    const body =
      JSON.parse(
        captured.options.body,
      );

    assert.equal(
      body.accountId,
      ACCOUNT_ID,
    );

    assert.equal(
      body.action,
      "resolve_exception",
    );

    assert.deepEqual(
      body.payload,
      {
        pickingId:
          PICKING_ID,

        exceptionId:
          EXCEPTION_ID,

        resolutionNotes:
          "Sayım doğrulandı.",
      },
    );

    assert.equal(
      result.requestId,
      requestId,
    );

    assert.equal(
      result.data.resolved,
      true,
    );
  },
);

test(
  "Picking exception controller payloadu UUID ve çözüm notunu normalize eder",
  () => {
    const payload =
      buildPickingExceptionResolutionPayload({
        pickingId:
          PICKING_ID,

        exceptionId:
          EXCEPTION_ID,

        resolutionNotes:
          "  Ürün bulunamadığı doğrulandı.  ",
      });

    assert.deepEqual(
      payload,
      {
        pickingId:
          PICKING_ID,

        exceptionId:
          EXCEPTION_ID,

        resolutionNotes:
          "Ürün bulunamadığı doğrulandı.",
      },
    );
  },
);

test(
  "Picking exception ağ hatası retry işleminde aynı Idempotency-Key değerini korur",
  async () => {
    const requestIds = [];

    let attempt = 0;

    const dependencies = {
      getContext:
        () => ({
          accountId:
            ACCOUNT_ID,
        }),

      getSession:
        async () => ({
          access_token:
            "kullanici-token",
        }),

      resolveException:
        async (input) => {
          requestIds.push(
            input.requestId,
          );

          attempt += 1;

          if (attempt === 1) {
            throw new Error(
              "Geçici ağ hatası.",
            );
          }

          return {
            requestId:
              input.requestId,

            data: {
              action:
                "resolve_exception",

              resolved:
                true,
            },
          };
        },
    };

    const resolution = {
      pickingId:
        PICKING_ID,

      exceptionId:
        EXCEPTION_ID,

      resolutionNotes:
        "Sayım tamamlandı.",
    };

    await assert.rejects(
      persistPickingExceptionResolution(
        resolution,
        dependencies,
      ),
      /Geçici ağ hatası/,
    );

    const result =
      await persistPickingExceptionResolution(
        resolution,
        dependencies,
      );

    assert.equal(
      requestIds.length,
      2,
    );

    assert.equal(
      requestIds[0],
      requestIds[1],
    );

    assert.equal(
      result.requestId,
      requestIds[0],
    );
  },
);

test(
  "başarılı Picking exception çözümü sonrası aynı payload yeni Idempotency-Key üretir",
  async () => {
    const requestIds = [];

    const dependencies = {
      getContext:
        () => ({
          accountId:
            ACCOUNT_ID,
        }),

      getSession:
        async () => ({
          access_token:
            "kullanici-token",
        }),

      resolveException:
        async (input) => {
          requestIds.push(
            input.requestId,
          );

          return {
            requestId:
              input.requestId,

            data: {
              action:
                "resolve_exception",

              resolved:
                true,
            },
          };
        },
    };

    const resolution = {
      pickingId:
        PICKING_ID,

      exceptionId:
        EXCEPTION_ID,

      resolutionNotes:
        "Fiziksel kontrol tamamlandı.",
    };

    await persistPickingExceptionResolution(
      resolution,
      dependencies,
    );

    await persistPickingExceptionResolution(
      resolution,
      dependencies,
    );

    assert.equal(
      requestIds.length,
      2,
    );

    assert.notEqual(
      requestIds[0],
      requestIds[1],
    );
  },
);

test(
  "Picking exception controller ayrı explicit confirm eventini dinler",
  async () => {
    const controller =
      await readFile(
        "js/warehouse/picking-write-controller.js",
        "utf8",
      );

    assert.match(
      controller,
      /warehouse:picking-exception-confirm/,
    );

    assert.match(
      controller,
      /warehouse:picking-exception-start/,
    );

    assert.match(
      controller,
      /warehouse:picking-exception-success/,
    );

    assert.match(
      controller,
      /warehouse:picking-exception-error/,
    );
  },
);


test(
  "A6.5 exception çözümü barkod execute veya complete success tarafından otomatik başlatılmaz",
  async () => {
    const controller =
      await readFile(
        "js/warehouse/picking-write-controller.js",
        "utf8"
      );

    const ui =
      await readFile(
        "js/warehouse/picking-ui.js",
        "utf8"
      );

    assert.match(
      ui,
      /warehouse:picking-exception-confirm/
    );

    assert.doesNotMatch(
      controller,
      /warehouse:barcode-scan/
    );

    const barcodeStart =
      ui.indexOf(
        '"warehouse:barcode-scan"'
      );

    assert.ok(
      barcodeStart >= 0,
      "Picking barkod listener bulunamadı."
    );

    const barcodeEnd =
      ui.indexOf(
        "select?.addEventListener",
        barcodeStart
      );

    assert.ok(
      barcodeEnd > barcodeStart,
      "Picking barkod listener sınırı bulunamadı."
    );

    assert.doesNotMatch(
      ui.slice(
        barcodeStart,
        barcodeEnd
      ),
      /warehouse:picking-exception-confirm/
    );

    for (const eventName of [
      "warehouse:picking-write-success",
      "warehouse:picking-complete-success",
    ]) {
      let cursor = 0;
      let count = 0;

      while (true) {
        const start =
          ui.indexOf(
            `"${eventName}"`,
            cursor
          );

        if (start < 0) {
          break;
        }

        count += 1;

        const end =
          ui.indexOf(
            "document.addEventListener",
            start + 1
          );

        const block =
          end >= 0
            ? ui.slice(
                start,
                end
              )
            : ui.slice(
                start
              );

        assert.doesNotMatch(
          block,
          /dispatchEvent[\s\S]{0,300}?warehouse:picking-exception-confirm/
        );

        cursor =
          start + 1;
      }

      assert.ok(
        count >= 1,
        `${eventName} listener bulunamadı.`
      );
    }
  }
);

test(
  "execute complete ve resolve_exception ayrı client aksiyonlarıdır",
  async () => {
    const client =
      await readFile(
        "js/warehouse/picking-client.js",
        "utf8",
      );

    assert.match(
      client,
      /export async function executePickingItem/,
    );

    assert.match(
      client,
      /export async function completePicking/,
    );

    assert.match(
      client,
      /export async function resolvePickingException/,
    );

    assert.match(
      client,
      /action:\s*["']execute_item["']/,
    );

    assert.match(
      client,
      /action:\s*["']complete["']/,
    );

    assert.match(
      client,
      /action:\s*["']resolve_exception["']/,
    );
  },
);

test(
  "Picking exception client controller service role veya doğrudan DB mutation açmaz",
  async () => {
    const combined =
      (
        await Promise.all([
          readFile(
            "js/warehouse/picking-client.js",
            "utf8",
          ),
          readFile(
            "js/warehouse/picking-write-controller.js",
            "utf8",
          ),
        ])
      ).join(
        "\n",
      );

    assert.doesNotMatch(
      combined,
      /SUPABASE_SERVICE_ROLE_KEY|service_role|serviceRole/i,
    );

    assert.doesNotMatch(
      combined,
      /\.from\s*\(/,
    );

    assert.doesNotMatch(
      combined,
      /\.insert\s*\(/,
    );

    assert.doesNotMatch(
      combined,
      /\.update\s*\(/,
    );

    assert.doesNotMatch(
      combined,
      /\.upsert\s*\(/,
    );
  },
);


test(
  "A6.5.2 exception UI ayrı seçim not ve explicit çözüm butonunu içerir",
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

    for (const id of [
      "toplama-istisna-secimi",
      "toplama-istisna-detayi",
      "toplama-istisna-cozum-notu",
      "toplama-istisna-coz",
      "toplama-istisna-durumu",
    ]) {
      assert.match(
        html,
        new RegExp(
          `id=["']${id}["']`
        )
      );
    }

    assert.match(
      html,
      />\s*İstisnayı Çöz\s*</
    );

    assert.match(
      ui,
      /function confirmPickingExceptionResolution/
    );

    assert.match(
      ui,
      /window\.confirm/
    );

    assert.match(
      ui,
      /warehouse:picking-exception-confirm/
    );
  }
);

test(
  "Picking HTTP resolve_exception ayrı kontrollü RPC yolunu korur",
  async () => {
    const api =
      await readFile(
        "functions/api/warehouse/picking.js",
        "utf8",
      );

    assert.match(
      api,
      /input\.action\s*===\s*"resolve_exception"/,
    );

    assert.match(
      api,
      /warehouse_picking_resolve_exception_write/,
    );

    assert.doesNotMatch(
      api,
      /\.from\(\s*["']warehouse_/,
    );
  },
);

test(
  "A6.5.2 açık exception read-model account warehouse ve unresolved kapsamındadır",
  async () => {
    const ui =
      await readFile(
        "js/warehouse/picking-ui.js",
        "utf8"
      );

    assert.match(
      ui,
      /\.from\(\s*["']warehouse_picking_exceptions["']\s*\)/
    );

    assert.match(
      ui,
      /\.select\(\s*["']id,picking_id,picking_item_id,task_id,type,message,warehouse_id,location_id,product_id,resolved,created_at,updated_at["']\s*\)/
    );

    assert.match(
      ui,
      /\.eq\(\s*["']account_id["']/
    );

    assert.match(
      ui,
      /\.eq\(\s*["']warehouse_id["']/
    );

    assert.match(
      ui,
      /\.eq\(\s*["']resolved["']\s*,\s*false\s*\)/
    );

    assert.match(
      ui,
      /\.order\(\s*["']created_at["']/
    );
  }
);

test(
  "A6.5.2 exception çözümü start success error lifecycle olaylarını işler",
  async () => {
    const ui =
      await readFile(
        "js/warehouse/picking-ui.js",
        "utf8"
      );

    for (const eventName of [
      "warehouse:picking-exception-start",
      "warehouse:picking-exception-success",
      "warehouse:picking-exception-error",
    ]) {
      assert.match(
        ui,
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
  "exception success açık exception listesini yeniler fakat complete üretmez",
  async () => {
    const ui =
      await readFile(
        "js/warehouse/picking-ui.js",
        "utf8"
      );

    const start =
      ui.indexOf(
        '"warehouse:picking-exception-success"'
      );

    assert.ok(
      start >= 0
    );

    const end =
      ui.indexOf(
        "document.addEventListener",
        start + 1
      );

    const block =
      end >= 0
        ? ui.slice(
            start,
            end
          )
        : ui.slice(
            start
          );

    assert.match(
      block,
      /loadOpenPickingExceptions\(\)/
    );

    assert.match(
      block,
      /refreshPickingCompletionAvailability\(\)/
    );

    assert.doesNotMatch(
      block,
      /dispatchEvent[\s\S]{0,300}?warehouse:picking-complete-confirm/
    );
  }
);

test(
  "execute success exception read-modeli yeniler fakat exception çözmez",
  async () => {
    const ui =
      await readFile(
        "js/warehouse/picking-ui.js",
        "utf8"
      );

    const matches = [];

    let cursor = 0;

    while (true) {
      const start =
        ui.indexOf(
          '"warehouse:picking-write-success"',
          cursor
        );

      if (start < 0) {
        break;
      }

      const end =
        ui.indexOf(
          "document.addEventListener",
          start + 1
        );

      matches.push(
        end >= 0
          ? ui.slice(
              start,
              end
            )
          : ui.slice(
              start
            )
      );

      cursor =
        start + 1;
    }

    assert.ok(
      matches.some(
        (block) =>
          /loadOpenPickingExceptions\(\)/.test(
            block
          )
      )
    );

    for (const block of matches) {
      assert.doesNotMatch(
        block,
        /dispatchEvent[\s\S]{0,300}?warehouse:picking-exception-confirm/
      );
    }
  }
);

test(
  "son execute picking kimliğini ayrı complete adayı olarak korur",
  async () => {
    const ui =
      await readFile(
        "js/warehouse/picking-ui.js",
        "utf8"
      );

    assert.match(
      ui,
      /let completionCandidatePickingId\s*=\s*null/
    );

    assert.match(
      ui,
      /warehouse:picking-write-success[\s\S]{0,900}?completionCandidatePickingId\s*=\s*pickingId/
    );

    assert.match(
      ui,
      /function pickingIdForCompletion\(\)[\s\S]{0,700}?completionCandidatePickingId/
    );
  }
);

test(
  "exception success picking kimliğini complete adayı olarak korur",
  async () => {
    const ui =
      await readFile(
        "js/warehouse/picking-ui.js",
        "utf8"
      );

    assert.match(
      ui,
      /warehouse:picking-exception-success[\s\S]{0,900}?completionCandidatePickingId\s*=\s*resolvedPickingId/
    );
  }
);

test(
  "A6.5.2 exception UI yalnız salt-okunur table sorgusu yapar",
  async () => {
    const ui =
      await readFile(
        "js/warehouse/picking-ui.js",
        "utf8"
      );

    assert.match(
      ui,
      /\.from\(\s*["']warehouse_picking_exceptions["']\s*\)[\s\S]{0,180}?\.select\(/
    );

    for (const pattern of [
      /\bfetch\s*\(/i,
      /\.rpc\s*\(/i,
      /\.insert\s*\(/i,
      /\.update\s*\(/i,
      /\.upsert\s*\(/i,
      /\.delete\s*\(/i,
    ]) {
      assert.doesNotMatch(
        ui,
        pattern
      );
    }
  }
);

test(
  "İstisnayı Çöz mobil dokunma alanı en az 48 pikseldir",
  async () => {
    const css =
      await readFile(
        "css/warehouse/picking-mobile.css",
        "utf8"
      );

    assert.match(
      css,
      /warehouse-picking-exceptions/
    );

    assert.match(
      css,
      /\.warehouse-picking-exceptions button[\s\S]{0,120}?min-height:\s*48px/
    );
  }
);
