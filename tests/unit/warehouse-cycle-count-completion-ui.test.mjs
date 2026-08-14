import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root =
  process.cwd();

const clientPath =
  path.join(
    root,
    "js/warehouse/cycle-count-completion-client.js"
  );

const reviewPath =
  path.join(
    root,
    "js/warehouse/cycle-count-review-ui.js"
  );

const reportPath =
  path.join(
    root,
    "js/warehouse/cycle-count-report-ui.js"
  );

const htmlPath =
  path.join(
    root,
    "warehouse/index.html"
  );

const cssPath =
  path.join(
    root,
    "css/warehouse/cycle-count-mobile.css"
  );

const buildPath =
  path.join(
    root,
    "scripts/production-build.cjs"
  );

const clientSource =
  fs.readFileSync(
    clientPath,
    "utf8"
  );

const reviewSource =
  fs.readFileSync(
    reviewPath,
    "utf8"
  );

const reportSource =
  fs.readFileSync(
    reportPath,
    "utf8"
  );

const htmlSource =
  fs.readFileSync(
    htmlPath,
    "utf8"
  );

const cssSource =
  fs.readFileSync(
    cssPath,
    "utf8"
  );

const buildSource =
  fs.readFileSync(
    buildPath,
    "utf8"
  );

const IDS = {
  accountId:
    "11111111-1111-4111-8111-111111111111",

  warehouseId:
    "22222222-2222-4222-8222-222222222222",

  cycleCountId:
    "33333333-3333-4333-8333-333333333333",

  requestId:
    "44444444-4444-4444-8444-444444444444"
};

test(
  "completion client yalnız dar lifecycle payloadı gönderir",
  async () => {
    const module =
      await import(
        `${
          pathToFileURL(
            clientPath
          ).href
        }?t=${Date.now()}`
      );

    let request =
      null;

    const result =
      await module
        .writeCycleCountCompletion({
          accessToken:
            "caller-jwt",

          ...IDS,

          action:
            "process_adjustments",

          notes:
            "Fiziksel kontrol tamamlandı.",

          fetchImpl:
            async (
              url,
              options
            ) => {
              request = {
                url,
                options
              };

              return {
                ok: true,
                status: 200,

                async json() {
                  return {
                    ok: true,

                    data: {
                      cycleCountId:
                        IDS
                          .cycleCountId,

                      status:
                        "adjusted"
                    }
                  };
                }
              };
            }
        });

    assert.equal(
      request.url,
      "/api/warehouse/cycle-count-completion"
    );

    assert.equal(
      request.options
        .headers
        .Authorization,
      "Bearer caller-jwt"
    );

    assert.equal(
      request.options
        .headers[
          "Idempotency-Key"
        ],
      IDS.requestId
    );

    const body =
      JSON.parse(
        request.options.body
      );

    assert.deepEqual(
      Object.keys(body)
        .sort(),
      [
        "accountId",
        "action",
        "payload",
        "warehouseId"
      ].sort()
    );

    assert.deepEqual(
      Object.keys(
        body.payload
      ).sort(),
      [
        "cycleCountId",
        "notes"
      ].sort()
    );

    assert.equal(
      result.requestId,
      IDS.requestId
    );
  }
);

test(
  "management client GET yalnız report HTTP boundary kullanır",
  async () => {
    const module =
      await import(
        `${
          pathToFileURL(
            clientPath
          ).href
        }?m=${Date.now()}`
      );

    let request =
      null;

    await module
      .loadCycleCountManagement({
        accessToken:
          "caller-jwt",

        accountId:
          IDS.accountId,

        warehouseId:
          IDS.warehouseId,

        cycleCountId:
          IDS.cycleCountId,

        fetchImpl:
          async (
            url,
            options
          ) => {
            request = {
              url,
              options
            };

            return {
              ok: true,
              status: 200,

              async json() {
                return {
                  ok: true,
                  data: {
                    mode:
                      "preview"
                  }
                };
              }
            };
          }
      });

    const url =
      new URL(
        request.url,
        "https://istebul.com"
      );

    assert.equal(
      url.pathname,
      "/api/warehouse/cycle-count-report"
    );

    assert.equal(
      url.searchParams.get(
        "accountId"
      ),
      IDS.accountId
    );

    assert.equal(
      url.searchParams.get(
        "warehouseId"
      ),
      IDS.warehouseId
    );

    assert.equal(
      url.searchParams.get(
        "cycleCountId"
      ),
      IDS.cycleCountId
    );

    assert.equal(
      request.options
        .headers
        .Authorization,
      "Bearer caller-jwt"
    );
  }
);

test(
  "completion mutation client blind-count miktarlarını payload alanı yapmaz",
  () => {
    for (
      const forbidden of [
        "expectedQuantity",
        "firstCountQuantity",
        "secondCountQuantity",
        "finalCountQuantity",
        "varianceQuantity",
        "varianceValue",
        "unitCost"
      ]
    ) {
      assert.doesNotMatch(
        clientSource,
        new RegExp(
          `\\b${forbidden}\\b`
        )
      );
    }
  }
);

test(
  "review UI operations-center session ve scope contractını kullanır",
  () => {
    assert.match(
      reviewSource,
      /getWarehouseOperationsContext/
    );

    assert.match(
      reviewSource,
      /getWarehouseSession/
    );

    assert.match(
      reviewSource,
      /session\.access_token/
    );

    assert.doesNotMatch(
      reviewSource,
      /localStorage|sessionStorage/
    );
  }
);

test(
  "review UI altı completion lifecycle aksiyonunu taşır",
  () => {
    for (
      const action of [
        "approve_count",
        "prepare_adjustments",
        "approve_adjustments",
        "reject_adjustments",
        "process_adjustments",
        "complete_count"
      ]
    ) {
      assert.match(
        reviewSource,
        new RegExp(
          action
        )
      );
    }
  }
);

test(
  "yüksek etkili management aksiyonları window.confirm ile korunur",
  () => {
    assert.match(
      reviewSource,
      /window\.confirm/
    );

    assert.match(
      reviewSource,
      /gerçek stok bakiyelerini ve envanter hareketlerini değiştirecek/
    );

    assert.match(
      reviewSource,
      /değiştirilemez rapor snapshotı oluşturulacak/
    );
  }
);

test(
  "completion action retry aynı request id mapini korur",
  () => {
    assert.match(
      reviewSource,
      /retryRequestIds:\s*new Map/
    );

    assert.match(
      reviewSource,
      /retryRequestIds[\s\S]*\.get\(key\)/
    );

    assert.match(
      reviewSource,
      /retryRequestIds[\s\S]*\.delete\(key\)/
    );
  }
);

test(
  "recount management refresh yeni yönetim readini tetikler",
  () => {
    assert.match(
      reviewSource,
      /warehouse:cycle-count-management-refresh/
    );

    assert.match(
      reviewSource,
      /loadList/
    );

    assert.match(
      reviewSource,
      /event\.detail\?\.source ===[\s\S]*"completion-ui"/
    );
  }
);

test(
  "report UI immutable report eventini render eder",
  () => {
    assert.match(
      reportSource,
      /warehouse:cycle-count-report-data/
    );

    assert.match(
      reportSource,
      /report\?\.summary/
    );

    assert.match(
      reportSource,
      /report\?\.items/
    );

    assert.match(
      reportSource,
      /window\.print/
    );
  }
);

test(
  "management UI DOM sayım paneline eklenmiştir",
  () => {
    for (
      const id of [
        "sayim-yonetim-secimi",
        "sayim-yonetim-notu",
        "sayim-yonetim-mesaji",
        "sayim-yonetim-metrikleri",
        "sayim-yonetim-satirlari",
        "sayim-yonetim-yasam-dongusu",
        "sayim-yonetim-aksiyonlar",
        "sayim-rapor-detayi",
        "sayim-rapor-metrikleri",
        "sayim-rapor-satirlari"
      ]
    ) {
      assert.match(
        htmlSource,
        new RegExp(
          `id="${id}"`
        )
      );
    }
  }
);

test(
  "report UI review UI'dan önce yüklenir",
  () => {
    const reportIndex =
      htmlSource.indexOf(
        "/js/warehouse/cycle-count-report-ui.js"
      );

    const reviewIndex =
      htmlSource.indexOf(
        "/js/warehouse/cycle-count-review-ui.js"
      );

    assert.ok(
      reportIndex >= 0
    );

    assert.ok(
      reviewIndex >= 0
    );

    assert.ok(
      reportIndex <
      reviewIndex
    );
  }
);

test(
  "production build completion UI assetlerini yayınlar",
  () => {
    for (
      const asset of [
        "js/warehouse/cycle-count-completion-client.js",
        "js/warehouse/cycle-count-report-ui.js",
        "js/warehouse/cycle-count-review-ui.js"
      ]
    ) {
      assert.match(
        buildSource,
        new RegExp(
          asset.replace(
            /\//g,
            "\\/"
          )
        )
      );
    }
  }
);

test(
  "completion UI doğrudan hassas warehouse REST tablolarını çağırmaz",
  () => {
    const combined =
      [
        clientSource,
        reviewSource,
        reportSource
      ].join("\n");

    assert.doesNotMatch(
      combined,
      /\/rest\/v1\/warehouse_cycle_count_/i
    );

    assert.doesNotMatch(
      combined,
      /\/rest\/v1\/warehouse_inventory_/i
    );

    assert.doesNotMatch(
      combined,
      /SERVICE_ROLE|service_role|SUPABASE_SERVICE/i
    );
  }
);

test(
  "completion management CSS responsive ve print rapor kontratını taşır",
  () => {
    assert.match(
      cssSource,
      /\.warehouse-cycle-count-management/
    );

    assert.match(
      cssSource,
      /@media \(max-width: 640px\)/
    );

    assert.match(
      cssSource,
      /@media print/
    );

    assert.match(
      cssSource,
      /#sayim-rapor-detayi/
    );
  }
);
