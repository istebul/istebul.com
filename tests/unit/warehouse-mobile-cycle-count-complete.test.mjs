import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();

const clientPath =
  path.join(
    root,
    "js/warehouse/cycle-count-recount-evaluation-client.js",
  );

const controllerPath =
  path.join(
    root,
    "js/warehouse/cycle-count-recount-evaluation-controller.js",
  );

const uiPath =
  path.join(
    root,
    "js/warehouse/cycle-count-recount-ui.js",
  );

const htmlPath =
  path.join(
    root,
    "warehouse/index.html",
  );

const buildPath =
  path.join(
    root,
    "scripts/production-build.cjs",
  );

const clientSource =
  fs.readFileSync(
    clientPath,
    "utf8",
  );

const controllerSource =
  fs.readFileSync(
    controllerPath,
    "utf8",
  );

const uiSource =
  fs.readFileSync(
    uiPath,
    "utf8",
  );

const htmlSource =
  fs.readFileSync(
    htmlPath,
    "utf8",
  );

const buildSource =
  fs.readFileSync(
    buildPath,
    "utf8",
  );

const IDS = Object.freeze({
  accountId:
    "11111111-1111-4111-8111-111111111111",
  warehouseId:
    "22222222-2222-4222-8222-222222222222",
  cycleCountId:
    "33333333-3333-4333-8333-333333333333",
  cycleCountItemId:
    "44444444-4444-4444-8444-444444444444",
  taskId:
    "55555555-5555-4555-8555-555555555555",
  requestId:
    "66666666-6666-4666-8666-666666666666",
});

test(
  "Recount evaluation client dar evaluate_recount payloadı gönderir",
  async () => {
    const module =
      await import(
        `${pathToFileURL(clientPath).href}?t=${Date.now()}`
      );

    let request = null;

    const result =
      await module.evaluateCycleCountRecount({
        accessToken:
          "caller-jwt",
        ...IDS,
        fetchImpl:
          async (url, options) => {
            request = {
              url,
              options,
            };

            return {
              ok: true,
              status: 200,
              async json() {
                return {
                  ok: true,
                  data: {
                    cycleCountId:
                      IDS.cycleCountId,
                    itemStatus:
                      "under_review",
                    countStatus:
                      "counted",
                    reviewRequired:
                      true,
                    taskStatus:
                      "completed",
                  },
                };
              },
            };
          },
      });

    assert.equal(
      request.url,
      "/api/warehouse/cycle-count-recount-evaluation",
    );

    const body =
      JSON.parse(
        request.options.body,
      );

    assert.equal(
      body.action,
      "evaluate_recount",
    );

    assert.deepEqual(
      Object.keys(body.payload).sort(),
      [
        "cycleCountId",
        "cycleCountItemId",
        "taskId",
      ].sort(),
    );

    assert.equal(
      request.options.headers.Authorization,
      "Bearer caller-jwt",
    );

    assert.equal(
      request.options.headers[
        "Idempotency-Key"
      ],
      IDS.requestId,
    );

    assert.equal(
      result.requestId,
      IDS.requestId,
    );
  },
);

test(
  "Recount evaluation controller retry için aynı request id mapini korur",
  () => {
    assert.match(
      controllerSource,
      /recountRetryRequestIds\s*=\s*new Map/,
    );

    assert.match(
      controllerSource,
      /warehouse:cycle-count-recount-evaluation-request/,
    );

    assert.match(
      controllerSource,
      /warehouse:cycle-count-recount-evaluation-retry/,
    );

    assert.match(
      controllerSource,
      /cycle-count-recount-evaluation-client\.js/,
    );

    assert.doesNotMatch(
      controllerSource,
      /from\s+["']\.\/operations-center\.js["']/,
    );
  },
);

test(
  "Recount quantity success taskı silmeden evaluation handoff yapar",
  () => {
    const successIndex =
      uiSource.indexOf(
        '"warehouse:cycle-count-recount-success"',
      );

    const evaluationIndex =
      uiSource.indexOf(
        '"warehouse:cycle-count-recount-evaluation-request"',
        successIndex,
      );

    assert.ok(
      successIndex >= 0,
    );

    assert.ok(
      evaluationIndex >
        successIndex,
    );

    const section =
      uiSource.slice(
        successIndex,
        evaluationIndex + 100,
      );

    assert.doesNotMatch(
      section,
      /state\.tasks\s*=\s*state\.tasks\.filter/,
    );
  },
);

test(
  "Recount evaluation success sonrası task kaldırılır ve management refresh tetiklenir",
  () => {
    assert.match(
      uiSource,
      /warehouse:cycle-count-recount-evaluation-success/,
    );

    assert.match(
      uiSource,
      /state\.tasks\s*=\s*state\.tasks\.filter/,
    );

    assert.match(
      uiSource,
      /warehouse:cycle-count-management-refresh/,
    );
  },
);

test(
  "Recount evaluation hata sonrası ikinci quantity tekrar yazılmaz ve retry açılır",
  () => {
    assert.match(
      uiSource,
      /state\.evaluationFailed/,
    );

    assert.match(
      uiSource,
      /state\.pendingEvaluation/,
    );

    assert.match(
      uiSource,
      /Değerlendirmeyi Tekrar Dene/,
    );

    assert.match(
      uiSource,
      /warehouse:cycle-count-recount-evaluation-retry/,
    );
  },
);

test(
  "HTML recount evaluation controllerı recount UI'dan önce yükler",
  () => {
    const controllerIndex =
      htmlSource.indexOf(
        "/js/warehouse/cycle-count-recount-evaluation-controller.js",
      );

    const uiIndex =
      htmlSource.indexOf(
        "/js/warehouse/cycle-count-recount-ui.js",
      );

    assert.ok(
      controllerIndex >= 0,
    );

    assert.ok(
      uiIndex >= 0,
    );

    assert.ok(
      controllerIndex <
        uiIndex,
    );
  },
);

test(
  "Production build recount evaluation assetlerini yayınlar",
  () => {
    assert.match(
      buildSource,
      /js\/warehouse\/cycle-count-recount-evaluation-client\.js/,
    );

    assert.match(
      buildSource,
      /js\/warehouse\/cycle-count-recount-evaluation-controller\.js/,
    );
  },
);

test(
  "Recount evaluation client hassas blind-count alanlarını taşımaz",
  () => {
    for (
      const forbidden
      of [
        "expectedQuantity",
        "firstCountQuantity",
        "secondCountQuantity",
        "finalCountQuantity",
        "varianceQuantity",
        "varianceValue",
        "unitCost",
      ]
    ) {
      assert.doesNotMatch(
        clientSource,
        new RegExp(
          `\\b${forbidden}\\b`,
        ),
      );
    }
  },
);
