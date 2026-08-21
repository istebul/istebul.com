import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const CLIENT =
  "js/warehouse/packing-client.js";
const LOOKUP =
  "js/warehouse/packing-lookup.js";
const UI =
  "js/warehouse/packing-ui.js";
const CONTROLLER =
  "js/warehouse/packing-write-controller.js";
const HTML =
  "warehouse/index.html";
const BUILD =
  "scripts/production-build.cjs";

const ID = {
  account:
    "11111111-1111-4111-8111-111111111111",
  request:
    "22222222-2222-4222-8222-222222222222",
  picking:
    "33333333-3333-4333-8333-333333333333",
  location:
    "44444444-4444-4444-8444-444444444444",
  packing:
    "55555555-5555-4555-8555-555555555555",
  item:
    "66666666-6666-4666-8666-666666666666",
  container:
    "77777777-7777-4777-8777-777777777777",
  package:
    "88888888-8888-4888-8888-888888888888",
  exception:
    "99999999-9999-4999-8999-999999999999"
};

test(
  "Packing client exact on dört write actionını taşır",
  async () => {
    const source =
      await readFile(
        CLIENT,
        "utf8"
      );

    for (const action of [
      "create_from_picking",
      "create_package",
      "confirm_item",
      "seal_package",
      "generate_package_label",
      "resolve_exception",
      "complete",
      "mark_shipping_ready",
      "cancel",
      "create_label",
      "generate_label",
      "mark_label_printed",
      "mark_label_failed",
      "cancel_label"
    ]) {
      assert.match(
        source,
        new RegExp(action)
      );
    }

    const {
      buildPackingCreateLabelPayload,
      buildPackingGenerateLabelPayload,
      buildPackingMarkLabelPrintedPayload,
      buildPackingMarkLabelFailedPayload,
      buildPackingCancelLabelPayload
    } =
      await import(
        "../../js/warehouse/packing-client.js"
      );

    assert.deepEqual(
      buildPackingCreateLabelPayload({
        packingId:
          ID.packing,
        packageId:
          ID.package,
        type:
          "sscc",
        format:
          "zpl"
      }),
      {
        packingId:
          ID.packing,
        packageId:
          ID.package,
        type:
          "sscc",
        format:
          "zpl"
      }
    );

    const labelId =
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

    assert.equal(
      buildPackingGenerateLabelPayload({
        packingId:
          ID.packing,
        labelId,
        content:
          "^XA^XZ"
      }).content,
      "^XA^XZ"
    );

    assert.equal(
      buildPackingMarkLabelPrintedPayload({
        packingId:
          ID.packing,
        labelId,
        printerId:
          "PRN-01"
      }).printerId,
      "PRN-01"
    );

    assert.throws(
      () =>
        buildPackingMarkLabelFailedPayload({
          packingId:
            ID.packing,
          labelId,
          failureReason:
            " "
        }),
      /hata nedeni/i
    );

    assert.equal(
      buildPackingCancelLabelPayload({
        packingId:
          ID.packing,
        labelId
      }).labelId,
      labelId
    );
  }
);

test(
  "create_from_picking payload doğrulanır",
  async () => {
    const {
      buildPackingCreateFromPickingPayload
    } =
      await import(
        "../../js/warehouse/packing-client.js"
      );

    const result =
      buildPackingCreateFromPickingPayload({
        pickingId:
          ID.picking,
        packingLocationId:
          ID.location,
        strategy:
          "cartonization"
      });

    assert.equal(
      result.pickingId,
      ID.picking
    );

    assert.equal(
      result.packingLocationId,
      ID.location
    );
  }
);

test(
  "create_package payload doğrulanır",
  async () => {
    const {
      buildPackingCreatePackagePayload
    } =
      await import(
        "../../js/warehouse/packing-client.js"
      );

    assert.deepEqual(
      buildPackingCreatePackagePayload({
        packingId:
          ID.packing,
        containerId:
          ID.container
      }),
      {
        packingId:
          ID.packing,
        containerId:
          ID.container
      }
    );
  }
);

test(
  "confirm_item sıfır toplamı reddeder",
  async () => {
    const {
      buildPackingConfirmItemPayload
    } =
      await import(
        "../../js/warehouse/packing-client.js"
      );

    assert.throws(
      () =>
        buildPackingConfirmItemPayload({
          packingId:
            ID.packing,
          packingItemId:
            ID.item,
          packageId:
            ID.package,
          quantity:
            0,
          damagedQuantity:
            0,
          missingQuantity:
            0
        }),
      /en az biri/
    );
  }
);

test(
  "Packing client caller JWT Idempotency-Key ve no-store kullanır",
  async () => {
    const {
      confirmPackingItem
    } =
      await import(
        "../../js/warehouse/packing-client.js"
      );

    let captured;

    await confirmPackingItem({
      accessToken:
        "caller-jwt",
      accountId:
        ID.account,
      packingId:
        ID.packing,
      packingItemId:
        ID.item,
      packageId:
        ID.package,
      quantity:
        1,
      requestId:
        ID.request,
      fetchImpl:
        async (
          url,
          options
        ) => {
          captured = {
            url,
            options
          };

          return {
            ok:
              true,
            status:
              200,
            async json() {
              return {
                ok:
                  true,
                data: {}
              };
            }
          };
        }
    });

    assert.equal(
      captured.url,
      "/api/warehouse/packing"
    );

    assert.equal(
      captured.options.headers.Authorization,
      "Bearer caller-jwt"
    );

    assert.equal(
      captured.options.headers["Idempotency-Key"],
      ID.request
    );

    assert.equal(
      captured.options.cache,
      "no-store"
    );
  }
);

test(
  "Packing lookup salt-okunur Supabase sorguları kullanır",
  async () => {
    const source =
      await readFile(
        LOOKUP,
        "utf8"
      );

    assert.match(
      source,
      /warehouse_packings/
    );

    assert.match(
      source,
      /warehouse_packing_items/
    );

    assert.match(
      source,
      /warehouse_packing_containers/
    );

    assert.match(
      source,
      /warehouse_packing_packages/
    );

    assert.doesNotMatch(
      source,
      /\.rpc\s*\(/
    );

    assert.doesNotMatch(
      source,
      /\.(?:insert|update|delete|upsert)\s*\(/
    );
  }
);

test(
  "confirm_item yalnız in_progress ve partially_packed için açılır",
  async () => {
    const {
      isPackingConfirmable
    } =
      await import(
        "../../js/warehouse/packing-lookup.js"
      );

    assert.equal(
      isPackingConfirmable({
        status:
          "in_progress"
      }),
      true
    );

    assert.equal(
      isPackingConfirmable({
        status:
          "partially_packed"
      }),
      true
    );

    assert.equal(
      isPackingConfirmable({
        status:
          "released"
      }),
      false
    );
  }
);

test(
  "Paket seçimi yalnız open ve in_progress kabul eder",
  async () => {
    const {
      isPackingPackageOpen
    } =
      await import(
        "../../js/warehouse/packing-lookup.js"
      );

    assert.equal(
      isPackingPackageOpen({
        status:
          "open"
      }),
      true
    );

    assert.equal(
      isPackingPackageOpen({
        status:
          "in_progress"
      }),
      true
    );

    assert.equal(
      isPackingPackageOpen({
        status:
          "sealed"
      }),
      false
    );
  }
);

test(
  "Barkod yanlış ürün için fail closed çalışır",
  async () => {
    const {
      validatePackingBarcode
    } =
      await import(
        "../../js/warehouse/packing-lookup.js"
      );

    const result =
      validatePackingBarcode({
        item: {
          product_id:
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          sku_id:
            null,
          barcode:
            null,
          remaining_quantity:
            1
        },
        barcode: {
          product_id:
            "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          sku_id:
            null
        },
        scanned:
          "8691"
      });

    assert.equal(
      result.status,
      "wrong_product"
    );
  }
);

test(
  "Controller retry aynı requestId değerini korur",
  async () => {
    const {
      persistPackingConfirmation
    } =
      await import(
        "../../js/warehouse/packing-write-controller.js"
      );

    const ids = [];

    const injected = {
      getContext() {
        return {
          accountId:
            ID.account
        };
      },

      async getSession() {
        return {
          access_token:
            "jwt"
        };
      },

      async confirmItem(input) {
        ids.push(
          input.requestId
        );

        throw new Error(
          "network"
        );
      }
    };

    const payload = {
      packingId:
        ID.packing,
      packingItemId:
        ID.item,
      packageId:
        ID.package,
      quantity:
        1
    };

    await assert.rejects(
      persistPackingConfirmation(
        payload,
        injected
      )
    );

    await assert.rejects(
      persistPackingConfirmation(
        payload,
        injected
      )
    );

    assert.equal(
      ids[0],
      ids[1]
    );
  }
);

test(
  "Başarı sonrası aynı payload yeni requestId üretir",
  async () => {
    const {
      persistPackingPackageCreation
    } =
      await import(
        "../../js/warehouse/packing-write-controller.js"
      );

    const ids = [];

    const injected = {
      getContext() {
        return {
          accountId:
            ID.account
        };
      },

      async getSession() {
        return {
          access_token:
            "jwt"
        };
      },

      async createPackage(input) {
        ids.push(
          input.requestId
        );

        return {
          requestId:
            input.requestId,
          data: {}
        };
      }
    };

    const payload = {
      packingId:
        ID.packing,
      containerId:
        ID.container
    };

    await persistPackingPackageCreation(
      payload,
      injected
    );

    await persistPackingPackageCreation(
      payload,
      injected
    );

    assert.notEqual(
      ids[0],
      ids[1]
    );
  }
);

test(
  "Controller exact on dört explicit confirm eventini dinler",
  async () => {
    const source =
      await readFile(
        CONTROLLER,
        "utf8"
      );

    for (const event of [
      "warehouse:packing-create-from-picking-confirm",
      "warehouse:packing-create-package-confirm",
      "warehouse:packing-confirm",
      "warehouse:packing-seal-package-confirm",
      "warehouse:packing-generate-package-label-confirm",
      "warehouse:packing-resolve-exception-confirm",
      "warehouse:packing-complete-confirm",
      "warehouse:packing-shipping-ready-confirm",
      "warehouse:packing-cancel-confirm",
      "warehouse:packing-create-label-confirm",
      "warehouse:packing-generate-label-confirm",
      "warehouse:packing-mark-label-printed-confirm",
      "warehouse:packing-mark-label-failed-confirm",
      "warehouse:packing-cancel-label-confirm"
    ]) {
      assert.match(
        source,
        new RegExp(event)
      );
    }

    assert.doesNotMatch(
      source,
      /warehouse:barcode-scan/
    );
  }
);

test(
  "Barkod listener yalnız doğrulama fonksiyonunu çağırır",
  async () => {
    const source =
      await readFile(
        UI,
        "utf8"
      );

    const match =
      source.match(
        /document\.addEventListener\(\s*"warehouse:barcode-scan",\s*\(event\)\s*=>\s*\{([\s\S]*?)\n\s*\}\s*\n\s*\);/
      );

    assert.ok(
      match,
      "barcode listener exact block bulunmalı"
    );

    assert.match(
      match[1],
      /verifyBarcode/
    );

    assert.doesNotMatch(
      match[1],
      /dispatch\s*\(/
    );

    assert.doesNotMatch(
      match[1],
      /warehouse:packing-confirm/
    );
  }
);

test(
  "Packing write eventleri kullanıcı confirm kontrolünden sonra dispatch edilir",
  async () => {
    const source =
      await readFile(
        UI,
        "utf8"
      );

    assert.match(
      source,
      /globalThis\.confirm/
    );

    for (const event of [
      "warehouse:packing-create-from-picking-confirm",
      "warehouse:packing-create-package-confirm",
      "warehouse:packing-confirm",
      "warehouse:packing-seal-package-confirm",
      "warehouse:packing-generate-package-label-confirm",
      "warehouse:packing-resolve-exception-confirm",
      "warehouse:packing-complete-confirm",
      "warehouse:packing-shipping-ready-confirm",
      "warehouse:packing-cancel-confirm",
      "warehouse:packing-create-label-confirm",
      "warehouse:packing-generate-label-confirm",
      "warehouse:packing-mark-label-printed-confirm",
      "warehouse:packing-mark-label-failed-confirm",
      "warehouse:packing-cancel-label-confirm"
    ]) {
      assert.match(
        source,
        new RegExp(event)
      );
    }
  }
);

test(
  "Warehouse HTML Packing mobil kontrol kimliklerini içerir",
  async () => {
    const html =
      await readFile(
        HTML,
        "utf8"
      );

    for (const id of [
      "paketleme",
      "paketleme-toplama-secimi",
      "paketleme-lokasyon-secimi",
      "paketleme-secimi",
      "paketleme-satiri-secimi",
      "paketleme-ambalaj-secimi",
      "paketleme-paket-secimi",
      "paketleme-barkod",
      "paketleme-miktar",
      "paketleme-hasarli-miktar",
      "paketleme-eksik-miktar",
      "paketleme-onayla"
    ]) {
      assert.match(
        html,
        new RegExp(
          `id=["']${id}["']`
        )
      );
    }
  }
);

test(
  "Warehouse HTML Packing browser assetlerini yükler",
  async () => {
    const html =
      await readFile(
        HTML,
        "utf8"
      );

    assert.match(
      html,
      /packing-mobile\.css/
    );

    assert.match(
      html,
      /packing-ui\.js/
    );

    assert.match(
      html,
      /packing-write-controller\.js/
    );
  }
);

test(
  "Production build tüm Packing browser dependencylerini yayımlar",
  async () => {
    const build =
      await readFile(
        BUILD,
        "utf8"
      );

    for (const asset of [
      "css/warehouse/packing-mobile.css",
      "js/warehouse/packing-lookup.js",
      "js/warehouse/packing-client.js",
      "js/warehouse/packing-ui.js",
      "js/warehouse/packing-write-controller.js"
    ]) {
      assert.match(
        build,
        new RegExp(
          asset.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          )
        )
      );
    }
  }
);

test(
  "Browser Packing katmanı service role veya doğrudan DB write açmaz",
  async () => {
    const [
      client,
      lookup,
      ui,
      controller
    ] =
      await Promise.all([
        readFile(
          CLIENT,
          "utf8"
        ),
        readFile(
          LOOKUP,
          "utf8"
        ),
        readFile(
          UI,
          "utf8"
        ),
        readFile(
          CONTROLLER,
          "utf8"
        )
      ]);

    const all =
      [
        client,
        lookup,
        ui,
        controller
      ].join("\n");

    assert.doesNotMatch(
      all,
      /SUPABASE_SERVICE_ROLE_KEY|service_role/
    );

    assert.doesNotMatch(
      lookup,
      /\.rpc\s*\(/
    );

    assert.doesNotMatch(
      lookup,
      /\.(?:insert|update|delete|upsert)\s*\(/
    );
  }
);

test(
  "Packing lifecycle client builderları exact payload üretir",
  async () => {
    const {
      buildPackingSealPackagePayload,
      buildPackingGeneratePackageLabelPayload,
      buildPackingResolveExceptionPayload,
      buildPackingCompletePayload,
      buildPackingMarkShippingReadyPayload,
      buildPackingCancelPayload
    } =
      await import(
        "../../js/warehouse/packing-client.js"
      );

    assert.deepEqual(
      buildPackingSealPackagePayload({
        packingId:
          ID.packing,
        packageId:
          ID.package,
        sealNumber:
          "SEAL-01",
        actualWeight:
          3.5
      }),
      {
        packingId:
          ID.packing,
        packageId:
          ID.package,
        sealNumber:
          "SEAL-01",
        actualWeight:
          3.5
      }
    );

    assert.equal(
      buildPackingGeneratePackageLabelPayload({
        packingId:
          ID.packing,
        packageId:
          ID.package
      }).format,
      "zpl"
    );

    assert.equal(
      buildPackingResolveExceptionPayload({
        packingId:
          ID.packing,
        exceptionId:
          ID.exception
      }).exceptionId,
      ID.exception
    );

    assert.equal(
      buildPackingCompletePayload({
        packingId:
          ID.packing
      }).packingId,
      ID.packing
    );

    assert.equal(
      buildPackingMarkShippingReadyPayload({
        packingId:
          ID.packing
      }).packingId,
      ID.packing
    );

    assert.throws(
      () =>
        buildPackingCancelPayload({
          packingId:
            ID.packing,
          reason:
            " "
        }),
      /iptal nedeni/i
    );
  }
);

test(
  "Packing lifecycle lookup labels exceptions ve readiness contractını taşır",
  async () => {
    const source =
      await readFile(
        LOOKUP,
        "utf8"
      );

    assert.match(
      source,
      /warehouse_packing_labels/
    );

    assert.match(
      source,
      /warehouse_packing_exceptions/
    );

    assert.doesNotMatch(
      source,
      /\.rpc\s*\(/
    );

    assert.doesNotMatch(
      source,
      /\.(?:insert|update|delete|upsert)\s*\(/
    );

    const {
      canCompletePacking,
      canMarkPackingShippingReady,
      canCancelPacking
    } =
      await import(
        "../../js/warehouse/packing-lookup.js"
      );

    const ready = {
      packing: {
        status:
          "in_progress"
      },
      remainingItems: [],
      unresolvedExceptions: [],
      packages: [
        {
          status:
            "labelled"
        }
      ]
    };

    assert.equal(
      canCompletePacking(
        ready
      ),
      true
    );

    assert.equal(
      canMarkPackingShippingReady({
        ...ready,
        packing: {
          status:
            "packed"
        }
      }),
      true
    );

    assert.equal(
      canCancelPacking({
        packing: {
          status:
            "released"
        },
        packages: [
          {
            status:
              "open"
          }
        ]
      }),
      true
    );

    assert.equal(
      canCancelPacking({
        packing: {
          status:
            "released"
        },
        packages: [
          {
            status:
              "sealed"
          }
        ]
      }),
      false
    );
  }
);

test(
  "Lifecycle controller failed retry aynı requestId değerini korur",
  async () => {
    const {
      persistPackingSealPackage
    } =
      await import(
        "../../js/warehouse/packing-write-controller.js"
      );

    const ids = [];

    const injected = {
      getContext() {
        return {
          accountId:
            ID.account
        };
      },

      async getSession() {
        return {
          access_token:
            "jwt"
        };
      },

      async sealPackage(input) {
        ids.push(
          input.requestId
        );

        throw new Error(
          "network"
        );
      }
    };

    const payload = {
      packingId:
        ID.packing,
      packageId:
        ID.package
    };

    await assert.rejects(
      persistPackingSealPackage(
        payload,
        injected
      )
    );

    await assert.rejects(
      persistPackingSealPackage(
        payload,
        injected
      )
    );

    assert.equal(
      ids[0],
      ids[1]
    );
  }
);

test(
  "Warehouse HTML exact lifecycle kontrol kimliklerini içerir",
  async () => {
    const html =
      await readFile(
        HTML,
        "utf8"
      );

    for (const id of [
      "paketleme-yasam-paket-secimi",
      "paketleme-muhur-no",
      "paketleme-gercek-agirlik",
      "paketleme-gercek-hacim",
      "paketleme-muhurle",
      "paketleme-etiket-formati",
      "paketleme-yazici-kimligi",
      "paketleme-etiket-uret",
      "paketleme-istisna-secimi",
      "paketleme-istisna-cozum-notu",
      "paketleme-istisna-coz",
      "paketleme-tamamla",
      "paketleme-sevkiyata-hazir",
      "paketleme-iptal-nedeni",
      "paketleme-iptal"
    ]) {
      assert.match(
        html,
        new RegExp(
          `id=["']${id}["']`
        )
      );
    }
  }
);

test(
  "Packing label ledger browser lifecycle açılır ve Shipping ayrı kalır",
  async () => {
    const [
      client,
      lookup,
      ui,
      controller,
      html
    ] =
      await Promise.all([
        readFile(
          CLIENT,
          "utf8"
        ),
        readFile(
          LOOKUP,
          "utf8"
        ),
        readFile(
          UI,
          "utf8"
        ),
        readFile(
          CONTROLLER,
          "utf8"
        ),
        readFile(
          HTML,
          "utf8"
        )
      ]);

    const browser =
      [
        client,
        lookup,
        ui,
        controller
      ].join("\n");

    assert.doesNotMatch(
      browser,
      /warehouse_shipping_create_from_packing_write/
    );

    assert.doesNotMatch(
      browser,
      /\.rpc\s*\(/
    );

    assert.doesNotMatch(
      browser,
      /SUPABASE_SERVICE_ROLE_KEY|service_role/
    );

    for (const action of [
      "create_label",
      "generate_label",
      "mark_label_printed",
      "mark_label_failed",
      "cancel_label"
    ]) {
      assert.equal(
        browser.includes(
          `"${action}"`
        ),
        true
      );
    }

    for (const field of [
      "content",
      "failure_reason",
      "created_by"
    ]) {
      assert.match(
        lookup,
        new RegExp(field)
      );
    }

    assert.doesNotMatch(
      lookup,
      /failed_at|cancelled_at/
    );

    for (const id of [
      "paketleme-ledger-etiket-secimi",
      "paketleme-ledger-tur",
      "paketleme-ledger-format",
      "paketleme-ledger-barkod",
      "paketleme-ledger-sscc",
      "paketleme-ledger-yazici",
      "paketleme-ledger-icerik",
      "paketleme-ledger-hata-nedeni",
      "paketleme-ledger-olustur",
      "paketleme-ledger-uret",
      "paketleme-ledger-yazdirildi",
      "paketleme-ledger-basarisiz",
      "paketleme-ledger-iptal"
    ]) {
      assert.match(
        html,
        new RegExp(
          `id=["']${id}["']`
        )
      );
    }

    for (const event of [
      "warehouse:packing-create-label-confirm",
      "warehouse:packing-generate-label-confirm",
      "warehouse:packing-mark-label-printed-confirm",
      "warehouse:packing-mark-label-failed-confirm",
      "warehouse:packing-cancel-label-confirm"
    ]) {
      assert.match(
        controller,
        new RegExp(event)
      );

      assert.match(
        ui,
        new RegExp(event)
      );
    }

    assert.match(
      ui,
      /globalThis\.confirm/
    );

    assert.match(
      html,
      /Shipping oluşturma ayrı bir dilimdir/
    );
  }
);


test(
  "Shipping handoff yalnız shipping_ready Packing ve geçerli lokasyon için açılır",
  async () => {
    const {
      canCreateShippingFromPacking
    } =
      await import(
        "../../js/warehouse/packing-lookup.js"
      );

    assert.equal(
      canCreateShippingFromPacking({
        packing: {
          status:
            "shipping_ready",

          shipping_location_id:
            ID.account
        }
      }),
      true
    );

    assert.equal(
      canCreateShippingFromPacking({
        packing: {
          status:
            "packed",

          shipping_location_id:
            ID.account
        }
      }),
      false
    );

    assert.equal(
      canCreateShippingFromPacking({
        packing: {
          status:
            "shipping_ready",

          shipping_location_id:
            "invalid"
        }
      }),
      false
    );
  }
);

test(
  "Shipping client yalnız güvenli HTTP transport kullanır",
  async () => {
    const source =
      await readFile(
        new URL(
          "../../js/warehouse/shipping-client.js",
          import.meta.url
        ),
        "utf8"
      );

    assert.match(
      source,
      /\/api\/warehouse\/shipping/
    );

    assert.match(
      source,
      /Idempotency-Key/
    );

    assert.match(
      source,
      /Authorization:\s*`Bearer \$\{accessToken\}`/
    );

    assert.doesNotMatch(
      source,
      /\.rpc\s*\(/
    );

    assert.doesNotMatch(
      source,
      /SUPABASE_SERVICE_ROLE_KEY|\bservice_role\b/i
    );

    assert.doesNotMatch(
      source,
      /warehouse_shipping_create_from_packing_write/
    );
  }
);

test(
  "Shipping handoff failed retry aynı requestId değerini korur",
  async () => {
    const {
      persistShippingCreateFromPacking
    } =
      await import(
        "../../js/warehouse/packing-write-controller.js"
      );

    const requestIds = [];

    const injected = {
      getContext() {
        return {
          accountId:
            ID.account
        };
      },

      async getSession() {
        return {
          access_token:
            "jwt"
        };
      },

      async createShippingFromPacking(
        input
      ) {
        requestIds.push(
          input.requestId
        );

        throw new Error(
          "network"
        );
      }
    };

    const payload = {
      packingId:
        ID.packing,

      shippingLocationId:
        ID.account,

      strategy:
        "single_shipment"
    };

    await assert.rejects(
      persistShippingCreateFromPacking(
        payload,
        injected
      )
    );

    await assert.rejects(
      persistShippingCreateFromPacking(
        payload,
        injected
      )
    );

    assert.equal(
      requestIds.length,
      2
    );

    assert.equal(
      requestIds[0],
      requestIds[1]
    );
  }
);

test(
  "Shipping create ayrı explicit eventtir ve legacy Shipping separation korunur",
  async () => {
    const [
      ui,
      controller,
      html,
      build
    ] =
      await Promise.all([
        readFile(
          new URL(
            "../../js/warehouse/packing-ui.js",
            import.meta.url
          ),
          "utf8"
        ),

        readFile(
          new URL(
            "../../js/warehouse/packing-write-controller.js",
            import.meta.url
          ),
          "utf8"
        ),

        readFile(
          new URL(
            "../../warehouse/index.html",
            import.meta.url
          ),
          "utf8"
        ),

        readFile(
          new URL(
            "../../scripts/production-build.cjs",
            import.meta.url
          ),
          "utf8"
        )
      ]);

    assert.match(
      html,
      /Shipping oluşturma ayrı bir dilimdir/
    );

    assert.match(
      html,
      /id=["']paketleme-sevkiyat-olustur["']/
    );

    assert.match(
      ui,
      /globalThis\.confirm/
    );

    for (const event of [
      "warehouse:shipping-create-from-packing-confirm",
      "warehouse:shipping-create-from-packing-start",
      "warehouse:shipping-create-from-packing-success",
      "warehouse:shipping-create-from-packing-error"
    ]) {
      assert.match(
        `${ui}\n${controller}`,
        new RegExp(event)
      );
    }

    const readyIndex =
      controller.indexOf(
        '"warehouse:packing-shipping-ready-confirm"'
      );

    const shippingIndex =
      controller.indexOf(
        '"warehouse:shipping-create-from-packing-confirm"'
      );

    assert.notEqual(
      readyIndex,
      -1
    );

    assert.notEqual(
      shippingIndex,
      -1
    );

    assert.doesNotMatch(
      controller.slice(
        readyIndex,
        shippingIndex
      ),
      /persistShippingCreateFromPacking/
    );

    assert.match(
      build,
      /js\/warehouse\/shipping-client\.js/
    );
  }
);
