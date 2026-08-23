import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/20260822165500_warehouse_shipping_dispatch_write.sql",
  "utf8",
);

const shippingService = readFileSync(
  "src/warehouse/services/ShippingService.ts",
  "utf8",
);

const trackingService = readFileSync(
  "src/warehouse/services/ShippingTrackingService.ts",
  "utf8",
);

const repository = readFileSync(
  "src/warehouse/services/SupabaseShippingRepository.ts",
  "utf8",
);

const persistence = readFileSync(
  "supabase/migrations/20260819231500_warehouse_shipping_persistence.sql",
  "utf8",
);

const compact = (value) =>
  value.replace(/\s+/g, " ");

const sql =
  compact(migration);

const hash = (value) =>
  createHash("sha256")
    .update(value)
    .digest("hex");

const extractMethod = (source, name) => {
  const matches = [
    ...source.matchAll(
      /^\s*(?:(?:private|public|protected)\s+)?async\s+([A-Za-z0-9_]+)\s*\(/gm,
    ),
  ];

  const index = matches.findIndex(
    (match) => match[1] === name,
  );

  assert.notEqual(
    index,
    -1,
    `Method not found: ${name}`,
  );

  return source.slice(
    matches[index].index,
    index + 1 < matches.length
      ? matches[index + 1].index
      : source.length,
  );
};

const dispatchSource =
  extractMethod(shippingService, "dispatch");

const createEventSource =
  extractMethod(trackingService, "createEvent");

const updateShippingSource =
  extractMethod(
    trackingService,
    "updateShippingFromEvent",
  );

const responseKeys = () => {
  const match = migration.match(
    /v_result\s*:=\s*jsonb_build_object\s*\(([\s\S]*?)\)\s*;/i,
  );

  assert.ok(match);

  return [
    ...match[1].matchAll(
      /'([A-Za-z][A-Za-z0-9]*)'\s*,/g,
    ),
  ].map((entry) => entry[1]);
};

test("01 dispatch ledger exact 16 actions", () => {
  const match = migration.match(
    /warehouse_shipping_write_requests_action_check[\s\S]*?action\s+in\s*\(([\s\S]*?)\)\s*\)/i,
  );

  assert.ok(match);

  const actions = [
    ...match[1].matchAll(/'([^']+)'/g),
  ].map((entry) => entry[1]);

  assert.deepEqual(actions, [
    "create_from_packing",
    "start_loading",
    "confirm_item_load",
    "load_package",
    "complete_loading",
    "create_manifest",
    "generate_manifest",
    "approve_manifest",
    "submit_manifest",
    "create_asn",
    "generate_asn",
    "send_asn",
    "acknowledge_asn",
    "reject_asn",
    "cancel_asn",
    "dispatch",
  ]);
});

test("02 dispatch RPC exact signature", () => {
  assert.match(
    sql,
    /warehouse_shipping_dispatch_write\s*\(\s*p_request_id uuid,\s*p_account_id uuid,\s*p_shipping_id uuid,\s*p_dispatched_by text,\s*p_tracking_number text\s*\)/i,
  );
});

test("03 dispatch auth uid exact seven roles", () => {
  assert.match(sql, /auth\.uid\s*\(\s*\)/i);

  assert.match(
    sql,
    /warehouse_has_account_role\s*\(\s*p_account_id,\s*array\[\s*'owner',\s*'admin',\s*'warehouse_manager',\s*'supervisor',\s*'inventory_controller',\s*'picker',\s*'operator'\s*\]::text\[\]/i,
  );

  assert.match(
    migration,
    /Bu firma için sevkiyat araç çıkışı yapma yetkiniz bulunmuyor\./,
  );
});

test("04 dispatch required UUID inputs fail closed", () => {
  for (const name of [
    "p_request_id",
    "p_account_id",
    "p_shipping_id",
  ]) {
    assert.match(
      sql,
      new RegExp(`if ${name} is null then`, "i"),
    );
  }
});

test("05 dispatchedBy required canonical trim", () => {
  assert.match(
    sql,
    /v_dispatched_by\s*:=\s*nullif\s*\(\s*btrim\s*\(\s*coalesce\s*\(\s*p_dispatched_by,\s*''\s*\)\s*\)\s*,\s*''\s*\)/i,
  );

  assert.match(
    sql,
    /if v_dispatched_by is null then/i,
  );
});

test("06 trackingNumber optional canonical trim", () => {
  assert.match(
    sql,
    /v_tracking_number\s*:=\s*nullif\s*\(\s*btrim\s*\(\s*coalesce\s*\(\s*p_tracking_number,\s*''\s*\)\s*\)\s*,\s*''\s*\)/i,
  );
});

test("07 canonical payload exact keys", () => {
  const match = migration.match(
    /v_payload\s*:=\s*jsonb_build_object\s*\(([\s\S]*?)\)\s*;/i,
  );

  assert.ok(match);

  const keys = [
    ...match[1].matchAll(
      /'([A-Za-z][A-Za-z0-9]*)'\s*,/g,
    ),
  ].map((entry) => entry[1]);

  assert.deepEqual(keys, [
    "shippingId",
    "dispatchedBy",
    "trackingNumber",
  ]);
});

test("08 idempotency replay collision and inflight", () => {
  assert.match(
    migration,
    /Aynı istek kimliği farklı bir kullanıcı tarafından kullanılamaz\./,
  );

  assert.match(
    migration,
    /Aynı istek kimliği farklı bir sevkiyat işlemi için kullanılamaz\./,
  );

  assert.match(
    migration,
    /Aynı sevkiyat isteği halen işleniyor\. Tekrar deneyin\./,
  );

  assert.match(
    sql,
    /on conflict\s*\(\s*account_id,\s*request_id\s*\)\s*do nothing/i,
  );

  assert.match(
    sql,
    /completed_at is not null and v_existing\.response_payload is not null then return v_existing\.response_payload/i,
  );
});

test("09 Shipping parent FOR UPDATE loaded gate", () => {
  assert.match(
    sql,
    /from public\.warehouse_shippings as shipping where shipping\.account_id\s*=\s*p_account_id and shipping\.id\s*=\s*p_shipping_id for update/i,
  );

  assert.match(
    sql,
    /if v_shipping\.status <> 'loaded' then/i,
  );
});

test("10 exact loaded-only error", () => {
  assert.match(
    migration,
    /Yalnızca yüklemesi tamamlanmış sevkiyatın araç çıkışı yapılabilir\./,
  );
});

test("11 non parcel vehicle id prerequisite", () => {
  assert.match(
    sql,
    /v_shipping\.vehicle_id is null and v_shipping\.strategy <> 'parcel'/i,
  );
});

test("12 exact vehicle prerequisite error", () => {
  assert.match(
    migration,
    /Araçlı sevkiyat için çıkıştan önce araç atanmalıdır\./,
  );
});

test("13 no vehicle lookup active or service level gate", () => {
  assert.doesNotMatch(
    migration,
    /warehouse_shipping_vehicles/i,
  );

  assert.doesNotMatch(
    migration,
    /v_vehicle/i,
  );

  assert.doesNotMatch(
    migration,
    /service_level_id\s+is\s+not\s+null/i,
  );
});

test("14 manifest accepted or approved prerequisite", () => {
  assert.match(
    sql,
    /from public\.warehouse_shipping_manifests[\s\S]*?status in\s*\(\s*'accepted',\s*'approved'\s*\)/i,
  );
});

test("15 exact manifest prerequisite error", () => {
  assert.match(
    migration,
    /Araç çıkışı için onaylanmış veya kabul edilmiş manifest gereklidir\./,
  );
});

test("16 carrier conditional account scoped read", () => {
  assert.match(
    sql,
    /if v_shipping\.carrier_id is not null then select carrier\.\* into v_carrier from public\.warehouse_shipping_carriers as carrier where carrier\.account_id\s*=\s*p_account_id and carrier\.id\s*=\s*v_shipping\.carrier_id/i,
  );

  assert.doesNotMatch(
    migration,
    /v_carrier\.active/i,
  );
});

test("17 ASN prerequisite conditional on carrier support", () => {
  assert.match(
    sql,
    /if v_carrier\.asn_supported then/i,
  );
});

test("18 ASN exact valid states sent acknowledged", () => {
  assert.match(
    sql,
    /from public\.warehouse_shipping_asns[\s\S]*?status in\s*\(\s*'sent',\s*'acknowledged'\s*\)/i,
  );
});

test("19 exact ASN prerequisite error", () => {
  assert.match(
    migration,
    /ASN destekli taşıyıcı için araç çıkışından önce ASN gönderilmelidir\./,
  );
});

test("20 package set FOR UPDATE without nonempty gate", () => {
  assert.match(
    sql,
    /from public\.warehouse_shipping_packages as package where package\.account_id\s*=\s*p_account_id and package\.shipping_id\s*=\s*p_shipping_id order by package\.id for update/i,
  );

  assert.doesNotMatch(
    sql,
    /if v_package_count\s*=\s*0 then/i,
  );
});

test("21 every existing package must be loaded", () => {
  assert.match(
    sql,
    /if v_package\.status <> 'loaded' then/i,
  );
});

test("22 exact unloaded package error", () => {
  assert.match(
    migration,
    /Yüklenmemiş paket bulunduğu için araç çıkışı yapılamaz\./,
  );
});

test("23 package mutation exact dispatch fields", () => {
  assert.match(
    sql,
    /update public\.warehouse_shipping_packages set status\s*=\s*'dispatched',\s*dispatched_at\s*=\s*v_now,\s*updated_at\s*=\s*v_now,\s*tracking_number\s*=\s*coalesce\s*\(\s*v_tracking_number,\s*tracking_number\s*\)/i,
  );

  assert.match(
    sql,
    /if v_updated_package_count <> v_package_count then/i,
  );
});

test("24 exact one dispatched warehouse tracking insert", () => {
  assert.equal(
    [
      ...migration.matchAll(
        /insert into\s+public\.warehouse_shipping_tracking_events/gi,
      ),
    ].length,
    1,
  );

  assert.match(
    sql,
    /'dispatched',\s*'Araç çıkışı yapıldı\.',\s*'warehouse'/i,
  );
});

test("25 tracking duplicate tuple and package null parity", () => {
  assert.match(
    sql,
    /from public\.warehouse_shipping_tracking_events as event[\s\S]*?event\.type\s*=\s*'dispatched'[\s\S]*?event\.shipping_package_id is null[\s\S]*?event\.external_event_code is null[\s\S]*?event\.occurred_at\s*=\s*v_now/i,
  );

  assert.match(
    migration,
    /Aynı sevkiyat takip olayı daha önce kaydedilmiş\./,
  );

  assert.match(
    sql,
    /v_tracking_event_id,\s*p_account_id,\s*p_shipping_id,\s*null,\s*v_tracking_number,\s*'dispatched'/i,
  );
});

test("26 Shipping parent dispatched mutation parity", () => {
  assert.match(
    sql,
    /update public\.warehouse_shippings set status\s*=\s*'dispatched',\s*dispatched_at\s*=\s*coalesce\s*\(\s*dispatched_at,\s*v_now\s*\),\s*updated_at\s*=\s*v_now,\s*tracking_number\s*=\s*coalesce\s*\(\s*v_tracking_number,\s*tracking_number\s*\)/i,
  );

  assert.match(
    sql,
    /and status\s*=\s*'loaded' returning \* into v_updated_shipping/i,
  );
});

test("27 optional existing dock available missing tolerated", () => {
  assert.match(
    sql,
    /if v_shipping\.dock_id is not null then select dock\.\* into v_dock from public\.warehouse_shipping_docks as dock[\s\S]*?for update/i,
  );

  assert.match(
    sql,
    /if v_shipping\.dock_id is not null and v_dock\.id is not null then update public\.warehouse_shipping_docks set status\s*=\s*'available'/i,
  );

  assert.doesNotMatch(
    migration,
    /Rampa bulunamadı/,
  );
});

test("28 exact mutation surface", () => {
  const updated = [
    ...migration.matchAll(
      /update\s+(?:\s*)public\.([a-z0-9_]+)/gi,
    ),
  ].map((entry) => entry[1]);

  assert.deepEqual(
    new Set(updated),
    new Set([
      "warehouse_shipping_packages",
      "warehouse_shippings",
      "warehouse_shipping_docks",
      "warehouse_shipping_write_requests",
    ]),
  );

  assert.equal(
    [
      ...migration.matchAll(
        /insert into\s+public\.warehouse_shipping_tracking_events/gi,
      ),
    ].length,
    1,
  );
});

test("29 read-only adjacent domains are not mutated", () => {
  for (const table of [
    "warehouse_shipping_manifests",
    "warehouse_shipping_asns",
    "warehouse_shipping_carriers",
    "warehouse_shipping_vehicles",
    "warehouse_packings",
    "warehouse_packing_packages",
    "warehouse_picking_tasks",
    "warehouse_inventory",
  ]) {
    assert.doesNotMatch(
      migration,
      new RegExp(
        `(?:update|insert\\s+into|delete\\s+from)\\s+(?:public\\.)?${table}`,
        "i",
      ),
    );
  }
});

test("30 stable exact eight-key response and ledger replay", () => {
  assert.deepEqual(
    responseKeys(),
    [
      "ok",
      "action",
      "requestId",
      "shippingId",
      "status",
      "dispatchedAt",
      "trackingNumber",
      "updatedAt",
    ],
  );

  assert.match(
    sql,
    /response_payload\s*=\s*v_result,\s*completed_at\s*=\s*v_now/i,
  );

  assert.match(
    sql,
    /return v_result;/i,
  );

  const response = migration.match(
    /v_result\s*:=\s*jsonb_build_object\s*\(([\s\S]*?)\)\s*;/i,
  );

  assert.ok(response);

  assert.doesNotMatch(
    response[1],
    /shippingNumber|dispatchedBy/,
  );
});

test("31 SECURITY DEFINER authenticated-only ACL", () => {
  assert.match(
    sql,
    /security definer set search_path\s*=\s*public,\s*pg_temp/i,
  );

  for (const principal of [
    "public",
    "anon",
    "authenticated",
  ]) {
    assert.match(
      sql,
      new RegExp(
        `revoke all on function public\\.warehouse_shipping_dispatch_write\\([^;]+\\) from ${principal};`,
        "i",
      ),
    );
  }

  assert.match(
    sql,
    /grant execute on function public\.warehouse_shipping_dispatch_write\([^;]+\) to authenticated;/i,
  );

  assert.doesNotMatch(
    migration,
    /\bservice_role\b/i,
  );
});

test("32 Shipping dispatch and tracking source parity hashes remain frozen", () => {
  assert.equal(
    hash(shippingService),
    "e320382e8da52d1e04da74e7e4d7bdd602f2859321f2f4c6263f8944f3ac106c",
  );

  assert.equal(
    hash(trackingService),
    "87906e3afa9b2b794cebbcbf18b173471bf06b185d83c134edf1551e1ee37ade",
  );

  const dispatch =
    compact(dispatchSource);

  assert.match(
    dispatch,
    /shipping\.status !== "loaded"/,
  );

  assert.match(
    dispatch,
    /shipping\.vehicleId === undefined && shipping\.strategy !== "parcel"/,
  );

  assert.match(
    dispatch,
    /manifest\.status === "accepted" \|\| manifest\.status === "approved"/,
  );

  assert.match(
    dispatch,
    /asn\.status === "sent" \|\| asn\.status === "acknowledged"/,
  );

  assert.match(
    dispatch,
    /repository\.savePackage\(/,
  );

  assert.match(
    dispatch,
    /trackingService\s*\.createEvent\(/,
  );

  assert.match(
    dispatch,
    /repository\s*\.findDockById\(/,
  );

  assert.match(
    compact(createEventSource),
    /repository\s*\.saveTrackingEvent\(/,
  );

  assert.match(
    compact(createEventSource),
    /updateShippingFromEvent\(/,
  );

  const parent =
    compact(updateShippingSource);

  assert.match(
    parent,
    /case "dispatched": case "carrier_received": await this\.repository\.save\(/,
  );

  assert.match(
    parent,
    /status: "dispatched"/,
  );

  assert.match(
    parent,
    /dispatchedAt: shipping\.dispatchedAt \?\? timestamp/,
  );

  assert.match(
    repository,
    /"dispatched_at"/,
  );

  assert.match(
    persistence,
    /dispatched_at timestamptz/,
  );
});
