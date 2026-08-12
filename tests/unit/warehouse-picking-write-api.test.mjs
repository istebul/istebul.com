import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const sourcePath =
  "functions/api/warehouse/picking.js";

const source =
  fs.readFileSync(
    sourcePath,
    "utf8",
  );

const module =
  await import(
    "../../functions/api/warehouse/picking.js"
  );

const ACCOUNT =
  "11111111-1111-4111-8111-111111111111";

const REQUEST =
  "22222222-2222-4222-8222-222222222222";

const PICKING =
  "33333333-3333-4333-8333-333333333333";

const ITEM =
  "44444444-4444-4444-8444-444444444444";

const WAREHOUSE =
  "55555555-5555-4555-8555-555555555555";

const LOCATION_A =
  "66666666-6666-4666-8666-666666666666";

const LOCATION_B =
  "77777777-7777-4777-8777-777777777777";

const PRODUCT =
  "88888888-8888-4888-8888-888888888888";

test(
  "Picking API yönetim aksiyonları ve execute_item açar",
  () => {
    for (const action of [
      "create",
      "add_item",
      "release",
      "create_task",
      "start",
      "execute_item",
      "complete",
      "resolve_exception",
    ]) {
      assert.equal(
        module.normalizeWriteAction(
          action,
        ),
        action,
      );
    }

    for (const action of [
      "cancel",
    ]) {
      assert.equal(
        module.normalizeWriteAction(
          action,
        ),
        null,
      );
    }
  },
);

test(
  "create payload dar ve geçerli biçimde normalize edilir",
  () => {
    const result =
      module.normalizeWriteRequest(
        {
          accountId: ACCOUNT,
          action: "create",
          payload: {
            warehouseId:
              WAREHOUSE,
            destinationLocationId:
              LOCATION_B,
            strategy:
              "nearest_location",
            priority: 30,
          },
        },
        REQUEST,
      );

    assert.equal(
      result.ok,
      true,
    );

    assert.equal(
      result.value.payload
        .strategy,
      "nearest_location",
    );
  },
);

test(
  "add_item pozitif miktar ister",
  () => {
    const result =
      module.normalizeWriteRequest(
        {
          accountId: ACCOUNT,
          action: "add_item",
          payload: {
            pickingId:
              PICKING,
            warehouseId:
              WAREHOUSE,
            productId:
              PRODUCT,
            requestedQuantity:
              0,
            unit:
              "piece",
            strategy:
              "fifo",
          },
        },
        REQUEST,
      );

    assert.equal(
      result.ok,
      false,
    );

    assert.equal(
      result.reason,
      "quantity_invalid",
    );
  },
);

test(
  "release ve start payloadunu yalnız pickingId ile sınırlar",
  () => {
    for (const action of [
      "release",
      "start",
    ]) {
      const result =
        module.normalizeWriteRequest(
          {
            accountId:
              ACCOUNT,
            action,
            payload: {
              pickingId:
                PICKING,
              ignored:
                "silinmeli",
            },
          },
          REQUEST,
        );

      assert.equal(
        result.ok,
        true,
      );

      assert.deepEqual(
        result.value.payload,
        {
          pickingId:
            PICKING,
        },
      );
    }
  },
);

test(
  "create_task source location ve warehouse ister",
  () => {
    const result =
      module.normalizeWriteRequest(
        {
          accountId:
            ACCOUNT,
          action:
            "create_task",
          payload: {
            pickingId:
              PICKING,
            warehouseId:
              WAREHOUSE,
            sourceLocationId:
              LOCATION_A,
            destinationLocationId:
              LOCATION_B,
            priority:
              20,
            sequence:
              1,
          },
        },
        REQUEST,
      );

    assert.equal(
      result.ok,
      true,
    );
  },
);

test(
  "execute_item miktar ve short-pick toplamından en az birini ister",
  () => {
    const result =
      module.normalizeWriteRequest(
        {
          accountId:
            ACCOUNT,
          action:
            "execute_item",
          payload: {
            pickingId:
              PICKING,
            pickingItemId:
              ITEM,
            sourceLocationId:
              LOCATION_A,
            destinationLocationId:
              LOCATION_B,
            quantity:
              0,
            shortQuantity:
              0,
          },
        },
        REQUEST,
      );

    assert.equal(
      result.ok,
      false,
    );

    assert.equal(
      result.reason,
      "processed_quantity_invalid",
    );
  },
);

test(
  "execute_item normal pick payloadunu normalize eder",
  () => {
    const result =
      module.normalizeWriteRequest(
        {
          accountId:
            ACCOUNT,
          action:
            "execute_item",
          payload: {
            pickingId:
              PICKING,
            pickingItemId:
              ITEM,
            sourceLocationId:
              LOCATION_A,
            destinationLocationId:
              LOCATION_B,
            quantity:
              4,
            shortQuantity:
              1,
            barcode:
              "8690000000001",
            lotNumber:
              "LOT-01",
            serialNumber:
              "SER-01",
            notes:
              "Kontrollü toplama",
            ignored:
              "silinmeli",
          },
        },
        REQUEST,
      );

    assert.equal(
      result.ok,
      true,
    );

    assert.deepEqual(
      result.value.payload,
      {
        pickingId:
          PICKING,
        pickingItemId:
          ITEM,
        sourceLocationId:
          LOCATION_A,
        destinationLocationId:
          LOCATION_B,
        quantity:
          4,
        shortQuantity:
          1,
        barcode:
          "8690000000001",
        lotNumber:
          "LOT-01",
        serialNumber:
          "SER-01",
        notes:
          "Kontrollü toplama",
      },
    );
  },
);

test(
  "execute_item tam short-pick için quantity sıfır kabul eder",
  () => {
    const result =
      module.normalizeWriteRequest(
        {
          accountId:
            ACCOUNT,
          action:
            "execute_item",
          payload: {
            pickingId:
              PICKING,
            pickingItemId:
              ITEM,
            sourceLocationId:
              LOCATION_A,
            destinationLocationId:
              LOCATION_B,
            quantity:
              0,
            shortQuantity:
              5,
          },
        },
        REQUEST,
      );

    assert.equal(
      result.ok,
      true,
    );

    assert.equal(
      result.value.payload.quantity,
      0,
    );

    assert.equal(
      result.value.payload.shortQuantity,
      5,
    );
  },
);

test(
  "execute_item kaynak ve hedef lokasyonun aynı olmasını reddeder",
  () => {
    const result =
      module.normalizeWriteRequest(
        {
          accountId:
            ACCOUNT,
          action:
            "execute_item",
          payload: {
            pickingId:
              PICKING,
            pickingItemId:
              ITEM,
            sourceLocationId:
              LOCATION_A,
            destinationLocationId:
              LOCATION_A,
            quantity:
              1,
          },
        },
        REQUEST,
      );

    assert.equal(
      result.ok,
      false,
    );

    assert.equal(
      result.reason,
      "source_destination_same",
    );
  },
);

test(
  "complete yalnız pickingId payloadunu kabul eder",
  () => {
    const result =
      module.normalizeWriteRequest(
        {
          accountId:
            ACCOUNT,
          action:
            "complete",
          payload: {
            pickingId:
              PICKING,
            ignored:
              "silinmeli",
          },
        },
        REQUEST,
      );

    assert.equal(
      result.ok,
      true,
    );

    assert.deepEqual(
      result.value.payload,
      {
        pickingId:
          PICKING,
      },
    );
  },
);

test(
  "resolve_exception pickingId exceptionId ve opsiyonel çözüm notunu normalize eder",
  () => {
    const result =
      module.normalizeWriteRequest(
        {
          accountId:
            ACCOUNT,
          action:
            "resolve_exception",
          payload: {
            pickingId:
              PICKING,
            exceptionId:
              ITEM,
            resolutionNotes:
              "Sayım yapıldı ve eksik miktar doğrulandı.",
            resolvedBy:
              "istemciden-gelmemeli",
            ignored:
              "silinmeli",
          },
        },
        REQUEST,
      );

    assert.equal(
      result.ok,
      true,
    );

    assert.deepEqual(
      result.value.payload,
      {
        pickingId:
          PICKING,
        exceptionId:
          ITEM,
        resolutionNotes:
          "Sayım yapıldı ve eksik miktar doğrulandı.",
      },
    );

    assert.equal(
      "resolvedBy" in
        result.value.payload,
      false,
    );
  },
);

test(
  "API caller Bearer token ve Idempotency-Key kullanır",
  () => {
    assert.match(
      source,
      /Authorization/,
    );

    assert.match(
      source,
      /Bearer/,
    );

    assert.match(
      source,
      /Idempotency-Key/,
    );
  },
);

test(
  "API yalnız SUPABASE_ANON_KEY kullanır",
  () => {
    assert.match(
      source,
      /SUPABASE_ANON_KEY/,
    );

    assert.doesNotMatch(
      source,
      /SUPABASE_SERVICE_ROLE_KEY|service_role|serviceRole/i,
    );
  },
);

test(
  "yönetim, execute_item, complete ve resolve_exception ayrı kontrollü RPC yollarını kullanır",
  () => {
    assert.match(
      source,
      /\/rest\/v1\/rpc\/warehouse_picking_write/,
    );

    assert.match(
      source,
      /\/rest\/v1\/rpc\/warehouse_picking_execute_write/,
    );

    assert.match(
      source,
      /\/rest\/v1\/rpc\/warehouse_picking_complete_write/,
    );

    assert.match(
      source,
      /\/rest\/v1\/rpc\/warehouse_picking_resolve_exception_write/,
    );
  },
);

test(
  "API doğrudan warehouse tablo mutation yapmaz",
  () => {
    assert.doesNotMatch(
      source,
      /\.from\(\s*["']warehouse_/,
    );

    assert.doesNotMatch(
      source,
      /\.(insert|update|upsert|delete)\s*\(/,
    );
  },
);

test(
  "RPC hata kodları HTTP durumlarına map edilir",
  () => {
    assert.equal(
      module.mapRpcError({
        data: {
          code:
            "42501",
          message:
            "Yetkisiz",
        },
      }).status,
      403,
    );

    assert.equal(
      module.mapRpcError({
        data: {
          code:
            "23505",
          message:
            "Çakışma",
        },
      }).status,
      409,
    );

    assert.equal(
      module.mapRpcError({
        data: {
          code:
            "P0002",
          message:
            "Bulunamadı",
        },
      }).status,
      404,
    );

    assert.equal(
      module.mapRpcError({
        data: {
          code:
            "22023",
          message:
            "Geçersiz",
        },
      }).status,
      400,
    );
  },
);
