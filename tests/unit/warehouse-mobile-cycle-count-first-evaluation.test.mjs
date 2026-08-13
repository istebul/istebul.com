import assert from "node:assert/strict";
import {
  readFile
} from "node:fs/promises";
import test from "node:test";

const CLIENT =
  "js/warehouse/cycle-count-evaluation-client.js";

const CONTROLLER =
  "js/warehouse/cycle-count-evaluation-controller.js";

const QUANTITY_UI =
  "js/warehouse/cycle-count-quantity-ui.js";

const CORE_UI =
  "js/warehouse/cycle-count-ui.js";

const READ_API =
  "functions/api/warehouse/cycle-count.js";

const API =
  "functions/api/warehouse/cycle-count-evaluation.js";

const HTML =
  "warehouse/index.html";

const BUILD =
  "scripts/production-build.cjs";

const ACCOUNT =
  "11111111-1111-4111-8111-111111111111";

const WAREHOUSE =
  "22222222-2222-4222-8222-222222222222";

const COUNT =
  "33333333-3333-4333-8333-333333333333";

const ITEM =
  "44444444-4444-4444-8444-444444444444";

const TASK =
  "55555555-5555-4555-8555-555555555555";

const REQUEST =
  "66666666-6666-4666-8666-666666666666";

const {
  buildCycleCountEvaluationPayload,
  evaluateCycleCountFirstCount
} =
  await import(
    "../../js/warehouse/cycle-count-evaluation-client.js"
  );

const {
  buildCycleCountEvaluationRequest,
  persistCycleCountEvaluation
} =
  await import(
    "../../js/warehouse/cycle-count-evaluation-controller.js"
  );

test(
  "evaluation client yalnız count item ve task kimliğini payload yapar",
  () => {
    assert.deepEqual(
      buildCycleCountEvaluationPayload({
        cycleCountId:
          COUNT,
        cycleCountItemId:
          ITEM,
        taskId:
          TASK
      }),
      {
        cycleCountId:
          COUNT,
        cycleCountItemId:
          ITEM,
        taskId:
          TASK
      }
    );
  }
);

test(
  "evaluation client caller JWT account warehouse ve Idempotency-Key ile güvenli API'ye POST yapar",
  async () => {
    let call = null;

    await evaluateCycleCountFirstCount({
      accessToken:
        "session-token",

      accountId:
        ACCOUNT,

      warehouseId:
        WAREHOUSE,

      cycleCountId:
        COUNT,

      cycleCountItemId:
        ITEM,

      taskId:
        TASK,

      requestId:
        REQUEST,

      fetchImpl:
        async (
          url,
          options
        ) => {
          call = {
            url,
            options
          };

          return new Response(
            JSON.stringify({
              ok: true,
              data: {
                status:
                  "evaluated"
              }
            }),
            {
              status: 200,
              headers: {
                "Content-Type":
                  "application/json"
              }
            }
          );
        }
    });

    assert.equal(
      call.url,
      "/api/warehouse/cycle-count-evaluation"
    );

    assert.equal(
      call.options.method,
      "POST"
    );

    assert.equal(
      call.options.headers
        .Authorization,
      "Bearer session-token"
    );

    assert.equal(
      call.options.headers[
        "Idempotency-Key"
      ],
      REQUEST
    );

    const body =
      JSON.parse(
        call.options.body
      );

    assert.equal(
      body.action,
      "evaluate_first_count"
    );

    assert.equal(
      body.accountId,
      ACCOUNT
    );

    assert.equal(
      body.warehouseId,
      WAREHOUSE
    );
  }
);

test(
  "evaluation controller dar kimlik kontratını korur",
  () => {
    assert.deepEqual(
      buildCycleCountEvaluationRequest({
        cycleCountId:
          COUNT,
        cycleCountItemId:
          ITEM,
        taskId:
          TASK
      }),
      {
        cycleCountId:
          COUNT,
        cycleCountItemId:
          ITEM,
        taskId:
          TASK
      }
    );
  }
);

test(
  "evaluation controller seçili account warehouse ve kullanıcı oturumunu clienta taşır",
  async () => {
    let received = null;

    await persistCycleCountEvaluation(
      {
        cycleCountId:
          COUNT,
        cycleCountItemId:
          ITEM,
        taskId:
          TASK
      },
      {
        getContext:
          () => ({
            accountId:
              ACCOUNT,
            warehouseId:
              WAREHOUSE
          }),

        getSession:
          async () => ({
            access_token:
              "session-token"
          }),

        evaluate:
          async (
            input
          ) => {
            received =
              input;

            return {
              requestId:
                input.requestId,
              data: {
                status:
                  "evaluated"
              }
            };
          }
      }
    );

    assert.equal(
      received.accountId,
      ACCOUNT
    );

    assert.equal(
      received.warehouseId,
      WAREHOUSE
    );

    assert.equal(
      received.accessToken,
      "session-token"
    );
  }
);

test(
  "evaluation ağ hatası retry işleminde aynı Idempotency-Key kullanır başarı sonrası yeni key üretir",
  async () => {
    const requestIds = [];
    let attempt = 0;

    const payload = {
      cycleCountId:
        "73333333-3333-4333-8333-333333333333",
      cycleCountItemId:
        "74444444-4444-4444-8444-444444444444",
      taskId:
        "75555555-5555-4555-8555-555555555555"
    };

    const dependencies = {
      getContext:
        () => ({
          accountId:
            ACCOUNT,
          warehouseId:
            WAREHOUSE
        }),

      getSession:
        async () => ({
          access_token:
            "session-token"
        }),

      evaluate:
        async (
          input
        ) => {
          requestIds.push(
            input.requestId
          );

          attempt += 1;

          if (attempt === 1) {
            throw new Error(
              "geçici bağlantı hatası"
            );
          }

          return {
            requestId:
              input.requestId,
            data: {
              status:
                "evaluated"
            }
          };
        }
    };

    await assert.rejects(
      () =>
        persistCycleCountEvaluation(
          payload,
          dependencies
        ),
      /geçici bağlantı hatası/
    );

    await persistCycleCountEvaluation(
      payload,
      dependencies
    );

    await persistCycleCountEvaluation(
      payload,
      dependencies
    );

    assert.equal(
      requestIds[0],
      requestIds[1]
    );

    assert.notEqual(
      requestIds[1],
      requestIds[2]
    );
  }
);

test(
  "evaluation controller yalnız evaluation request ve retry olaylarını dinler barkod dinlemez",
  async () => {
    const source =
      await readFile(
        CONTROLLER,
        "utf8"
      );

    assert.match(
      source,
      /warehouse:cycle-count-evaluation-request/
    );

    assert.match(
      source,
      /warehouse:cycle-count-evaluation-retry/
    );

    assert.doesNotMatch(
      source,
      /warehouse:barcode-scan/
    );

    assert.match(
      source,
      /evaluationRunning/
    );
  }
);

test(
  "quantity success artık görevi hemen recorded yapmaz önce evaluation request üretir",
  async () => {
    const source =
      await readFile(
        QUANTITY_UI,
        "utf8"
      );

    const success =
      source.indexOf(
        '"warehouse:cycle-count-quantity-success"'
      );

    const request =
      source.indexOf(
        '"warehouse:cycle-count-evaluation-request"',
        success
      );

    const evaluationSuccess =
      source.indexOf(
        '"warehouse:cycle-count-evaluation-success"',
        success
      );

    const recorded =
      source.indexOf(
        '"warehouse:cycle-count-quantity-recorded"',
        evaluationSuccess
      );

    assert.ok(
      success >= 0 &&
      request > success &&
      evaluationSuccess > request &&
      recorded >
        evaluationSuccess
    );
  }
);

test(
  "evaluation hatasında fiziksel miktar tekrar açılmaz explicit retry sunulur",
  async () => {
    const source =
      await readFile(
        QUANTITY_UI,
        "utf8"
      );

    assert.match(
      source,
      /warehouse:cycle-count-evaluation-error/
    );

    assert.match(
      source,
      /Değerlendirmeyi Tekrar Dene/
    );

    assert.match(
      source,
      /quantityInput\.disabled\s*=\s*true/
    );

    assert.match(
      source,
      /notesInput\.disabled\s*=\s*true/
    );

    assert.match(
      source,
      /miktarı yeniden girmeyin/
    );
  }
);

test(
  "sayfa yenileme recovery sinyali hassas miktar yerine counted_at kullanır",
  async () => {
    const [
      core,
      readApi
    ] =
      await Promise.all([
        readFile(
          CORE_UI,
          "utf8"
        ),
        readFile(
          READ_API,
          "utf8"
        )
      ]);

    assert.match(
      core,
      /item\?\.counted_at/
    );

    assert.match(
      core,
      /warehouse:cycle-count-evaluation-recovery/
    );

    assert.match(
      readApi,
      /"counted_at"/
    );

    for (
      const forbidden
      of [
        "expected_quantity",
        "first_count_quantity",
        "second_count_quantity",
        "final_count_quantity",
        "variance_quantity",
        "variance_percentage",
        "variance_value",
        "unit_cost"
      ]
    ) {
      const selectBlock =
        readApi.slice(
          readApi.indexOf(
            "export const CYCLE_COUNT_ITEM_SELECT"
          ),
          readApi.indexOf(
            "const CYCLE_COUNT_SELECT"
          )
        );

      assert.doesNotMatch(
        selectBlock,
        new RegExp(
          `"${forbidden}"`
        )
      );
    }
  }
);

test(
  "ilk sayım scannerı recount görevini first_count_quantity akışına sokmaz",
  async () => {
    const core =
      await readFile(
        CORE_UI,
        "utf8"
      );

    assert.match(
      core,
      /task\?\.type\s*!==\s*"recount"/
    );

    assert.match(
      core,
      /Kontrollü yeniden sayım görevi hazır/
    );
  }
);

test(
  "miktar kaydı sırasında recovery task kimliği in-memory olarak kilitlenir",
  async () => {
    const core =
      await readFile(
        CORE_UI,
        "utf8"
      );

    assert.match(
      core,
      /evaluationPendingTaskIds:\s*new Set\(\)/
    );

    assert.match(
      core,
      /warehouse:cycle-count-quantity-success/
    );

    assert.match(
      core,
      /evaluationPendingTaskIds[\s\S]*\.add\(taskId\)/
    );
  }
);

test(
  "evaluation tamamlanınca original task temizlenir ve aktif görev modeli yeniden yüklenir",
  async () => {
    const core =
      await readFile(
        CORE_UI,
        "utf8"
      );

    assert.match(
      core,
      /warehouse:cycle-count-quantity-recorded/
    );

    assert.match(
      core,
      /evaluationPendingTaskIds\s*=\s*[\s\S]*new Set\([\s\S]*candidateTaskId\s*!==[\s\S]*taskId/
    );

    assert.match(
      core,
      /void loadCycleCountTasks\(\)/
    );
  }
);

test(
  "HTML evaluation controllerı quantity write controller sonrası Receiving öncesi yükler",
  async () => {
    const html =
      await readFile(
        HTML,
        "utf8"
      );

    const write =
      html.indexOf(
        "/js/warehouse/cycle-count-write-controller.js"
      );

    const evaluation =
      html.indexOf(
        "/js/warehouse/cycle-count-evaluation-controller.js"
      );

    const receiving =
      html.indexOf(
        "/js/warehouse/receiving-ui.js"
      );

    assert.ok(
      write >= 0 &&
      write < evaluation &&
      evaluation < receiving
    );
  }
);

test(
  "production build evaluation client ve controllerı yayınlar",
  async () => {
    const build =
      await readFile(
        BUILD,
        "utf8"
      );

    assert.match(
      build,
      /js\/warehouse\/cycle-count-evaluation-client\.js/
    );

    assert.match(
      build,
      /js\/warehouse\/cycle-count-evaluation-controller\.js/
    );
  }
);

test(
  "evaluation mobil katmanı expected variance maliyet veya inventory mutation yüzeyi açmaz",
  async () => {
    const [
      client,
      controller,
      api
    ] =
      await Promise.all([
        readFile(
          CLIENT,
          "utf8"
        ),
        readFile(
          CONTROLLER,
          "utf8"
        ),
        readFile(
          API,
          "utf8"
        )
      ]);

    const combined =
      `${client}\n${controller}`;

    assert.doesNotMatch(
      combined,
      /expected_quantity|expectedQuantity|variance_quantity|variance_percentage|variance_value|unit_cost|unitCost/
    );

    assert.doesNotMatch(
      combined,
      /warehouse_inventory_/
    );

    assert.doesNotMatch(
      combined,
      /SUPABASE_SERVICE_ROLE_KEY|service_role|serviceRole/i
    );

    assert.doesNotMatch(
      combined,
      /\.from\(|\.insert\(|\.update\(/
    );

    assert.doesNotMatch(
      api,
      /\/rest\/v1\/warehouse_cycle_count_(items|tasks|results|exceptions)/
    );
  }
);
