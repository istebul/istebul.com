import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import {
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const temporaryDirectory = await mkdtemp(
  join(tmpdir(), "warehouse-shipping-test-"),
);

const outputFile = join(
  temporaryDirectory,
  "warehouse.mjs",
);

const buildResult = await build({
  entryPoints: ["src/warehouse/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  target: "node20",
});

const buildOutput =
  buildResult.outputFiles?.[0];

if (!buildOutput) {
  throw new Error(
    "WarehouseIQ test paketi oluşturulamadı.",
  );
}

await writeFile(
  outputFile,
  buildOutput.contents,
);

const warehouse = await import(
  `${pathToFileURL(outputFile).href}?t=${Date.now()}`
);

test.after(async () => {
  await rm(
    temporaryDirectory,
    {
      recursive: true,
      force: true,
    },
  );
});

function createEnvironment() {
  let idSequence = 0;
  let numberSequence = 0;

  const createId = () =>
    `test-${String(
      ++idSequence,
    ).padStart(6, "0")}`;

  const now = () =>
    "2026-08-05T20:00:00.000Z";

  const repository =
    new warehouse.InMemoryShippingRepository();

  const carrierService =
    new warehouse.ShippingCarrierService({
      repository,
      createId,
      now,
    });

  const suggestionService =
    new warehouse.ShippingSuggestionService({
      repository,
      carrierService,
      createId,
      now,
    });

  const manifestService =
    new warehouse.ShippingManifestService({
      repository,
      createId,
      now,
      sequence: () => ++numberSequence,
    });

  const asnService =
    new warehouse.ShippingAsnService({
      repository,
      createId,
      now,
      sequence: () => ++numberSequence,
    });

  const trackingService =
    new warehouse.ShippingTrackingService({
      repository,
      createId,
      now,
    });

  const packingRecords = new Map();

  const packingService = {
    async get(
      tenantId,
      packingId,
    ) {
      const packing =
        packingRecords.get(packingId);

      if (
        !packing ||
        packing.tenantId !== tenantId
      ) {
        throw new warehouse
          .InventoryValidationError(
            "Paketleme kaydı bulunamadı.",
          );
      }

      return structuredClone(packing);
    },
  };

  const shippingService =
    new warehouse.ShippingService({
      repository,
      packingService,
      carrierService,
      suggestionService,
      manifestService,
      asnService,
      trackingService,
      createId,
      now,
      sequence: () => ++numberSequence,
    });

  return {
    repository,
    carrierService,
    suggestionService,
    manifestService,
    asnService,
    trackingService,
    shippingService,
    packingRecords,
    createId,
    now,
  };
}

function createAddress(
  tenantId,
  type,
  city,
) {
  return {
    tenantId,
    type,
    name:
      type === "ship_from"
        ? "Depo Çıkış Adresi"
        : "Müşteri Teslimat Adresi",
    countryCode: "TR",
    country: "Türkiye",
    city,
    addressLine1:
      `${city} operasyon adresi`,
    residential: false,
  };
}

async function createShipping(
  environment,
  overrides = {},
) {
  return environment.shippingService.create({
    tenantId: "tenant-1",
    warehouseId: "warehouse-1",
    shippingLocationId:
      "shipping-location-1",
    strategy: "single_shipment",
    shipFromAddress: createAddress(
      "tenant-1",
      "ship_from",
      "İzmir",
    ),
    shipToAddress: createAddress(
      "tenant-1",
      "ship_to",
      "İstanbul",
    ),
    priority: 50,
    temperatureControlled: false,
    hazardousMaterial: false,
    createdBy: "user-1",
    ...overrides,
  });
}

async function createCarrierAndService(
  environment,
  overrides = {},
) {
  const carrier =
    await environment.carrierService
      .createCarrier({
        tenantId: "tenant-1",
        code:
          overrides.carrierCode ??
          "TASIYICI-1",
        name:
          overrides.carrierName ??
          "Kurumsal Taşıyıcı",
        type: "logistics_company",
        apiEnabled: true,
        trackingSupported:
          overrides.trackingSupported ??
          true,
        manifestSupported:
          overrides.manifestSupported ??
          true,
        asnSupported:
          overrides.asnSupported ??
          true,
        temperatureControlled:
          overrides
            .temperatureControlled ??
          false,
        hazardousMaterialAllowed:
          overrides
            .hazardousMaterialAllowed ??
          false,
        international:
          overrides.international ??
          false,
        createdBy: "user-1",
      });

  const serviceLevel =
    await environment.carrierService
      .createServiceLevel({
        tenantId: "tenant-1",
        carrierId: carrier.id,
        code:
          overrides.serviceCode ??
          "STANDART",
        name:
          overrides.serviceName ??
          "Standart Teslimat",
        type: "standard",
        minimumDeliveryHours: 12,
        maximumDeliveryHours: 24,
        maximumWeight:
          overrides.maximumWeight ??
          10_000,
        weightUnit: "kg",
        maximumVolume:
          overrides.maximumVolume ??
          100_000_000,
        volumeUnit: "cm3",
        temperatureControlled:
          overrides
            .temperatureControlled ??
          false,
        hazardousMaterialAllowed:
          overrides
            .hazardousMaterialAllowed ??
          false,
        international:
          overrides.international ??
          false,
        trackingSupported:
          overrides.trackingSupported ??
          true,
        proofOfDeliveryRequired:
          overrides
            .proofOfDeliveryRequired ??
          true,
        createdBy: "user-1",
      });

  return {
    carrier,
    serviceLevel,
  };
}

async function addShippingContent(
  environment,
  shipping,
) {
  const item =
    await environment.shippingService
      .addItem({
        tenantId: shipping.tenantId,
        shippingId: shipping.id,
        warehouseId:
          shipping.warehouseId,
        productId: "product-1",
        skuId: "sku-1",
        requestedQuantity: 10,
        unit: "adet",
        temperatureControlled:
          shipping.temperatureControlled,
        hazardousMaterial:
          shipping.hazardousMaterial,
        createdBy: "user-1",
      });

  const shippingPackage =
    await environment.shippingService
      .addPackage({
        tenantId: shipping.tenantId,
        shippingId: shipping.id,
        packingId: "packing-1",
        packingPackageId:
          "packing-package-1",
        packageNumber: "PKT-0001",
        sscc: "123456789012345678",
        weight: 100,
        weightUnit: "kg",
        volume: 100_000,
        volumeUnit: "cm3",
        loadingSequence: 1,
      });

  return {
    item,
    shippingPackage,
  };
}

async function createDockAndVehicle(
  environment,
  carrierId,
) {
  const vehicle = {
    id: environment.createId(),
    tenantId: "tenant-1",
    carrierId,
    code: "ARAC-1",
    plateNumber: "35 ABC 123",
    type: "truck",
    maximumWeight: 20_000,
    weightUnit: "kg",
    maximumVolume: 200_000_000,
    volumeUnit: "cm3",
    palletCapacity: 33,
    packageCapacity: 500,
    temperatureControlled: false,
    hazardousMaterialAllowed: false,
    gpsEnabled: true,
    active: true,
    createdBy: "user-1",
    createdAt: environment.now(),
    updatedAt: environment.now(),
  };

  const dock = {
    id: environment.createId(),
    tenantId: "tenant-1",
    warehouseId: "warehouse-1",
    locationId: "dock-location-1",
    code: "RAMPA-1",
    name: "Sevkiyat Rampası 1",
    status: "available",
    vehicleTypes: ["truck"],
    temperatureControlled: false,
    hazardousMaterialAllowed: false,
    active: true,
    createdBy: "user-1",
    createdAt: environment.now(),
    updatedAt: environment.now(),
  };

  await environment.repository
    .saveVehicle(vehicle);

  await environment.repository
    .saveDock(dock);

  return {
    vehicle,
    dock,
  };
}

async function prepareLoadedShipping(
  environment,
) {
  const shipping =
    await createShipping(environment);

  const {
    carrier,
    serviceLevel,
  } =
    await createCarrierAndService(
      environment,
    );

  const {
    vehicle,
    dock,
  } =
    await createDockAndVehicle(
      environment,
      carrier.id,
    );

  const {
    item,
    shippingPackage,
  } =
    await addShippingContent(
      environment,
      shipping,
    );

  await environment.shippingService
    .assignResources({
      tenantId: shipping.tenantId,
      shippingId: shipping.id,
      carrierId: carrier.id,
      serviceLevelId:
        serviceLevel.id,
      vehicleId: vehicle.id,
      dockId: dock.id,
      driverName: "Ahmet Sürücü",
      driverPhone:
        "+90 555 111 22 33",
    });

  await environment.shippingService
    .createTask({
      tenantId: shipping.tenantId,
      shippingId: shipping.id,
      warehouseId:
        shipping.warehouseId,
      shippingLocationId:
        shipping.shippingLocationId,
      shippingPackageId:
        shippingPackage.id,
      type: "load_package",
      assignedUserId: "loader-1",
      priority: 50,
      sequence: 1,
      createdBy: "user-1",
    });

  await environment.shippingService
    .release(
      shipping.tenantId,
      shipping.id,
    );

  await environment.shippingService
    .startLoading(
      shipping.tenantId,
      shipping.id,
    );

  await environment.shippingService
    .confirmItemLoad({
      tenantId: shipping.tenantId,
      shippingId: shipping.id,
      shippingItemId: item.id,
      shippingPackageId:
        shippingPackage.id,
      quantity: 10,
      damagedQuantity: 0,
      missingQuantity: 0,
      loadedBy: "loader-1",
    });

  await environment.shippingService
    .loadPackage({
      tenantId: shipping.tenantId,
      shippingId: shipping.id,
      shippingPackageId:
        shippingPackage.id,
      loadedBy: "loader-1",
    });

  const loaded =
    await environment.shippingService
      .completeLoading(
        shipping.tenantId,
        shipping.id,
      );

  return {
    shipping: loaded,
    carrier,
    serviceLevel,
    vehicle,
    dock,
    item,
    shippingPackage,
  };
}

test(
  "sevkiyat oluşturulur ve numara üretilir",
  async () => {
    const environment =
      createEnvironment();

    const shipping =
      await createShipping(
        environment,
      );

    assert.equal(
      shipping.status,
      "draft",
    );

    assert.match(
      shipping.shippingNumber,
      /^SVK-20260805-\d{6}$/,
    );

    assert.equal(
      shipping.shipFromAddress.city,
      "İzmir",
    );
  },
);

test(
  "aynı sipariş için ikinci sevkiyat oluşturulamaz",
  async () => {
    const environment =
      createEnvironment();

    await createShipping(
      environment,
      {
        orderId: "order-1",
      },
    );

    await assert.rejects(
      () =>
        createShipping(
          environment,
          {
            orderId: "order-1",
          },
        ),
      /daha önce sevkiyat oluşturulmuş/,
    );
  },
);

test(
  "aynı packing kaydı için ikinci sevkiyat oluşturulamaz",
  async () => {
    const environment =
      createEnvironment();

    await createShipping(
      environment,
      {
        packingId: "packing-1",
      },
    );

    await assert.rejects(
      () =>
        createShipping(
          environment,
          {
            packingId: "packing-1",
          },
        ),
      /daha önce sevkiyat oluşturulmuş/,
    );
  },
);

test(
  "taşıyıcı kodu benzersiz olmalıdır",
  async () => {
    const environment =
      createEnvironment();

    await environment.carrierService
      .createCarrier({
        tenantId: "tenant-1",
        code: "KARGO-1",
        name: "Kargo Firması",
        type: "parcel_carrier",
        createdBy: "user-1",
      });

    await assert.rejects(
      () =>
        environment.carrierService
          .createCarrier({
            tenantId: "tenant-1",
            code: "KARGO-1",
            name:
              "İkinci Kargo Firması",
            type: "parcel_carrier",
            createdBy: "user-1",
          }),
      /daha önce kullanılmış/,
    );
  },
);

test(
  "servis seviyesi taşıyıcı yeteneklerini aşamaz",
  async () => {
    const environment =
      createEnvironment();

    const carrier =
      await environment.carrierService
        .createCarrier({
          tenantId: "tenant-1",
          code: "NORMAL-1",
          name: "Normal Taşıyıcı",
          type: "logistics_company",
          temperatureControlled:
            false,
          createdBy: "user-1",
        });

    await assert.rejects(
      () =>
        environment.carrierService
          .createServiceLevel({
            tenantId: "tenant-1",
            carrierId: carrier.id,
            code: "SOGUK",
            name: "Soğuk Zincir",
            type: "cold_chain",
            temperatureControlled:
              true,
            createdBy: "user-1",
          }),
      /sıcaklık kontrollü taşıma desteklemediği/,
    );
  },
);

test(
  "sıcaklık kontrollü sevkiyat uyumsuz taşıyıcıya açılamaz",
  async () => {
    const environment =
      createEnvironment();

    const shipping =
      await createShipping(
        environment,
        {
          temperatureControlled:
            true,
        },
      );

    const {
      carrier,
      serviceLevel,
    } =
      await createCarrierAndService(
        environment,
      );

    await addShippingContent(
      environment,
      shipping,
    );

    await environment.shippingService
      .assignResources({
        tenantId: shipping.tenantId,
        shippingId: shipping.id,
        carrierId: carrier.id,
        serviceLevelId:
          serviceLevel.id,
      });

    await assert.rejects(
      () =>
        environment.shippingService
          .release(
            shipping.tenantId,
            shipping.id,
          ),
      /Sıcaklık kontrollü sevkiyat/,
    );
  },
);

test(
  "öneri motoru uygun taşıyıcı ve servis seviyesini puanlar",
  async () => {
    const environment =
      createEnvironment();

    const shipping =
      await createShipping(
        environment,
      );

    const {
      carrier,
      serviceLevel,
    } =
      await createCarrierAndService(
        environment,
      );

    const {
      vehicle,
      dock,
    } =
      await createDockAndVehicle(
        environment,
        carrier.id,
      );

    await addShippingContent(
      environment,
      shipping,
    );

    const suggestions =
      await environment.shippingService
        .generateSuggestions({
          tenantId: shipping.tenantId,
          shippingId: shipping.id,
          carriers: [carrier],
          serviceLevels: [
            serviceLevel,
          ],
          vehicles: [vehicle],
          docks: [dock],
          costEstimates: [
            {
              carrierId: carrier.id,
              serviceLevelId:
                serviceLevel.id,
              amount: 1250,
              currency: "TRY",
            },
          ],
          requireTracking: true,
          requireManifest: true,
          requireAsn: true,
        });

    assert.equal(
      suggestions.length,
      1,
    );

    assert.equal(
      suggestions[0].selected,
      true,
    );

    assert.ok(
      suggestions[0].score
        .totalScore > 0,
    );
  },
);

test(
  "yükleme görev olmadan başlatılamaz",
  async () => {
    const environment =
      createEnvironment();

    const shipping =
      await createShipping(
        environment,
      );

    const {
      carrier,
      serviceLevel,
    } =
      await createCarrierAndService(
        environment,
      );

    const {
      vehicle,
      dock,
    } =
      await createDockAndVehicle(
        environment,
        carrier.id,
      );

    await addShippingContent(
      environment,
      shipping,
    );

    await environment.shippingService
      .assignResources({
        tenantId: shipping.tenantId,
        shippingId: shipping.id,
        carrierId: carrier.id,
        serviceLevelId:
          serviceLevel.id,
        vehicleId: vehicle.id,
        dockId: dock.id,
      });

    await environment.shippingService
      .release(
        shipping.tenantId,
        shipping.id,
      );

    await assert.rejects(
      () =>
        environment.shippingService
          .startLoading(
            shipping.tenantId,
            shipping.id,
          ),
      /en az bir paket yükleme/,
    );
  },
);

test(
  "sevkiyat satırı ve paket başarıyla yüklenir",
  async () => {
    const environment =
      createEnvironment();

    const result =
      await prepareLoadedShipping(
        environment,
      );

    assert.equal(
      result.shipping.status,
      "loaded",
    );

    const updated =
      await environment.shippingService
        .get(
          result.shipping.tenantId,
          result.shipping.id,
        );

    assert.equal(
      updated.items[0]
        .loadedQuantity,
      10,
    );

    assert.equal(
      updated.packages[0].status,
      "loaded",
    );
  },
);

test(
  "kalan miktarı aşan yükleme engellenir",
  async () => {
    const environment =
      createEnvironment();

    const shipping =
      await createShipping(
        environment,
      );

    const {
      carrier,
      serviceLevel,
    } =
      await createCarrierAndService(
        environment,
      );

    const {
      vehicle,
      dock,
    } =
      await createDockAndVehicle(
        environment,
        carrier.id,
      );

    const {
      item,
      shippingPackage,
    } =
      await addShippingContent(
        environment,
        shipping,
      );

    await environment.shippingService
      .assignResources({
        tenantId: shipping.tenantId,
        shippingId: shipping.id,
        carrierId: carrier.id,
        serviceLevelId:
          serviceLevel.id,
        vehicleId: vehicle.id,
        dockId: dock.id,
      });

    await environment.shippingService
      .createTask({
        tenantId: shipping.tenantId,
        shippingId: shipping.id,
        warehouseId:
          shipping.warehouseId,
        shippingLocationId:
          shipping.shippingLocationId,
        type: "load_package",
        createdBy: "user-1",
      });

    await environment.shippingService
      .release(
        shipping.tenantId,
        shipping.id,
      );

    await environment.shippingService
      .startLoading(
        shipping.tenantId,
        shipping.id,
      );

    await assert.rejects(
      () =>
        environment.shippingService
          .confirmItemLoad({
            tenantId:
              shipping.tenantId,
            shippingId:
              shipping.id,
            shippingItemId:
              item.id,
            shippingPackageId:
              shippingPackage.id,
            quantity: 11,
            damagedQuantity: 0,
            missingQuantity: 0,
            loadedBy: "loader-1",
          }),
      /kalan miktarı aşamaz/,
    );
  },
);

test(
  "manifest yaşam döngüsü tamamlanır",
  async () => {
    const environment =
      createEnvironment();

    const {
      shipping,
    } =
      await prepareLoadedShipping(
        environment,
      );

    const manifest =
      await environment.shippingService
        .createManifest({
          tenantId:
            shipping.tenantId,
          shippingId:
            shipping.id,
          createdBy: "user-1",
        });

    const generated =
      await environment.shippingService
        .generateManifest({
          tenantId:
            shipping.tenantId,
          shippingId:
            shipping.id,
          manifestId: manifest.id,
          generatedBy: "user-1",
        });

    assert.equal(
      generated.status,
      "generated",
    );

    assert.equal(
      generated.packageCount,
      1,
    );

    const approved =
      await environment.shippingService
        .approveManifest({
          tenantId:
            shipping.tenantId,
          shippingId:
            shipping.id,
          manifestId: manifest.id,
          approvedBy: "manager-1",
        });

    assert.equal(
      approved.status,
      "approved",
    );

    const submitted =
      await environment.shippingService
        .submitManifest({
          tenantId:
            shipping.tenantId,
          shippingId:
            shipping.id,
          manifestId: manifest.id,
        });

    assert.equal(
      submitted.status,
      "submitted",
    );

    const accepted =
      await environment.manifestService
        .accept({
          tenantId:
            shipping.tenantId,
          shippingId:
            shipping.id,
          manifestId: manifest.id,
        });

    assert.equal(
      accepted.status,
      "accepted",
    );
  },
);

test(
  "ASN JSON içeriği üretir ve gönderilir",
  async () => {
    const environment =
      createEnvironment();

    const {
      shipping,
    } =
      await prepareLoadedShipping(
        environment,
      );

    const asn =
      await environment.shippingService
        .createAsn({
          tenantId:
            shipping.tenantId,
          shippingId:
            shipping.id,
          senderCode: "DEPO-IZMIR",
          receiverCode:
            "MUSTERI-IST",
          format: "json",
          createdBy: "user-1",
        });

    const generated =
      await environment.shippingService
        .generateAsn({
          tenantId:
            shipping.tenantId,
          shippingId:
            shipping.id,
          asnId: asn.id,
          generatedBy: "user-1",
        });

    assert.equal(
      generated.status,
      "generated",
    );

    assert.match(
      generated.content,
      /"asnNumber"/,
    );

    const sent =
      await environment.shippingService
        .sendAsn({
          tenantId:
            shipping.tenantId,
          shippingId:
            shipping.id,
          asnId: asn.id,
        });

    assert.equal(
      sent.status,
      "sent",
    );
  },
);

test(
  "ASN XML ve EDIFACT içerikleri üretilebilir",
  async () => {
    for (
      const format
      of ["xml", "edifact"]
    ) {
      const environment =
        createEnvironment();

      const {
        shipping,
      } =
        await prepareLoadedShipping(
          environment,
        );

      const asn =
        await environment.shippingService
          .createAsn({
            tenantId:
              shipping.tenantId,
            shippingId:
              shipping.id,
            format,
            createdBy: "user-1",
          });

      const generated =
        await environment.shippingService
          .generateAsn({
            tenantId:
              shipping.tenantId,
            shippingId:
              shipping.id,
            asnId: asn.id,
            generatedBy: "user-1",
          });

      if (format === "xml") {
        assert.match(
          generated.content,
          /AdvancedShippingNotice/,
        );
      } else {
        assert.match(
          generated.content,
          /DESADV/,
        );
      }
    }
  },
);

test(
  "manifest ve ASN olmadan araç çıkışı yapılamaz",
  async () => {
    const environment =
      createEnvironment();

    const {
      shipping,
    } =
      await prepareLoadedShipping(
        environment,
      );

    await assert.rejects(
      () =>
        environment.shippingService
          .dispatch({
            tenantId:
              shipping.tenantId,
            shippingId:
              shipping.id,
            dispatchedBy:
              "dispatcher-1",
          }),
      /manifest gereklidir/,
    );
  },
);

test(
  "sevkiyat araç çıkışı yapılır",
  async () => {
    const environment =
      createEnvironment();

    const {
      shipping,
    } =
      await prepareLoadedShipping(
        environment,
      );

    const manifest =
      await environment.shippingService
        .createManifest({
          tenantId:
            shipping.tenantId,
          shippingId:
            shipping.id,
          createdBy: "user-1",
        });

    await environment.shippingService
      .generateManifest({
        tenantId:
          shipping.tenantId,
        shippingId:
          shipping.id,
        manifestId: manifest.id,
        generatedBy: "user-1",
      });

    await environment.shippingService
      .approveManifest({
        tenantId:
          shipping.tenantId,
        shippingId:
          shipping.id,
        manifestId: manifest.id,
        approvedBy: "manager-1",
      });

    const asn =
      await environment.shippingService
        .createAsn({
          tenantId:
            shipping.tenantId,
          shippingId:
            shipping.id,
          format: "json",
          createdBy: "user-1",
        });

    await environment.shippingService
      .generateAsn({
        tenantId:
          shipping.tenantId,
        shippingId:
          shipping.id,
        asnId: asn.id,
        generatedBy: "user-1",
      });

    await environment.shippingService
      .sendAsn({
        tenantId:
          shipping.tenantId,
        shippingId:
          shipping.id,
        asnId: asn.id,
      });

    const dispatched =
      await environment.shippingService
        .dispatch({
          tenantId:
            shipping.tenantId,
          shippingId:
            shipping.id,
          dispatchedBy:
            "dispatcher-1",
          trackingNumber:
            "TRK-000001",
        });

    assert.equal(
      dispatched.status,
      "dispatched",
    );

    assert.equal(
      dispatched.trackingNumber,
      "TRK-000001",
    );
  },
);

test(
  "taşıyıcı takip olayı sevkiyatı taşımada durumuna geçirir",
  async () => {
    const environment =
      createEnvironment();

    const shipping =
      await createShipping(
        environment,
      );

    await environment.repository.save({
      ...shipping,
      status: "dispatched",
      dispatchedAt:
        environment.now(),
      updatedAt:
        environment.now(),
    });

    await environment.trackingService
      .createCarrierEvent({
        tenantId:
          shipping.tenantId,
        shippingId:
          shipping.id,
        externalEventCode:
          "in_transit",
        trackingNumber:
          "TRK-000002",
        city: "Bursa",
      });

    const updated =
      await environment.shippingService
        .get(
          shipping.tenantId,
          shipping.id,
        );

    assert.equal(
      updated.status,
      "in_transit",
    );
  },
);

test(
  "mükerrer takip olayı engellenir",
  async () => {
    const environment =
      createEnvironment();

    const shipping =
      await createShipping(
        environment,
      );

    const event = {
      tenantId:
        shipping.tenantId,
      shippingId:
        shipping.id,
      type: "in_transit",
      message:
        "Sevkiyat taşımada.",
      source: "carrier",
      externalEventCode:
        "in_transit",
      occurredAt:
        "2026-08-05T21:00:00.000Z",
    };

    await environment.trackingService
      .createEvent(event);

    await assert.rejects(
      () =>
        environment.trackingService
          .createEvent(event),
      /daha önce kaydedilmiş/,
    );
  },
);

test(
  "teslimat kanıtı sevkiyatı teslim edildi durumuna geçirir",
  async () => {
    const environment =
      createEnvironment();

    const shipping =
      await createShipping(
        environment,
      );

    await environment.repository.save({
      ...shipping,
      status: "in_transit",
      updatedAt:
        environment.now(),
    });

    const proof =
      await environment.shippingService
        .recordProofOfDelivery({
          tenantId:
            shipping.tenantId,
          shippingId:
            shipping.id,
          recipientName:
            "Mehmet Yılmaz",
          signatureUrl:
            "https://example.com/signature.png",
          photoUrls: [],
          documentUrls: [],
          capturedBy: "driver-1",
          deliveredAt:
            "2026-08-05T22:00:00.000Z",
        });

    assert.equal(
      proof.status,
      "captured",
    );

    const delivered =
      await environment.shippingService
        .get(
          shipping.tenantId,
          shipping.id,
        );

    assert.equal(
      delivered.status,
      "delivered",
    );
  },
);

test(
  "çözülmemiş istisna teslimat tamamlamayı engeller",
  async () => {
    const environment =
      createEnvironment();

    const shipping =
      await createShipping(
        environment,
      );

    await environment.repository.save({
      ...shipping,
      status: "delivered",
      deliveredAt:
        environment.now(),
      actualDeliveryAt:
        environment.now(),
      updatedAt:
        environment.now(),
    });

    await environment.repository
      .saveProofOfDelivery({
        id: environment.createId(),
        tenantId:
          shipping.tenantId,
        shippingId:
          shipping.id,
        status: "captured",
        recipientName:
          "Teslim Alan",
        photoUrls: [],
        documentUrls: [
          "https://example.com/pod.pdf",
        ],
        deliveredAt:
          environment.now(),
        capturedBy: "driver-1",
        createdAt:
          environment.now(),
        updatedAt:
          environment.now(),
      });

    await environment.shippingService
      .createException({
        tenantId:
          shipping.tenantId,
        shippingId:
          shipping.id,
        type: "package_damaged",
        message:
          "Bir paket hasarlı teslim edildi.",
      });

    await assert.rejects(
      () =>
        environment.shippingService
          .completeDelivery(
            shipping.tenantId,
            shipping.id,
          ),
      /Çözülmemiş sevkiyat istisnaları/,
    );
  },
);

test(
  "istisna çözülür ve teslimat tamamlanabilir",
  async () => {
    const environment =
      createEnvironment();

    const shipping =
      await createShipping(
        environment,
      );

    await environment.repository.save({
      ...shipping,
      status: "delivered",
      deliveredAt:
        environment.now(),
      actualDeliveryAt:
        environment.now(),
      updatedAt:
        environment.now(),
    });

    await environment.repository
      .saveProofOfDelivery({
        id: environment.createId(),
        tenantId:
          shipping.tenantId,
        shippingId:
          shipping.id,
        status: "captured",
        recipientName:
          "Teslim Alan",
        photoUrls: [],
        documentUrls: [
          "https://example.com/pod.pdf",
        ],
        deliveredAt:
          environment.now(),
        capturedBy: "driver-1",
        createdAt:
          environment.now(),
        updatedAt:
          environment.now(),
      });

    const exception =
      await environment.shippingService
        .createException({
          tenantId:
            shipping.tenantId,
          shippingId:
            shipping.id,
          type: "package_damaged",
          message:
            "Bir paket hasarlı teslim edildi.",
        });

    await environment.shippingService
      .resolveException({
        tenantId:
          shipping.tenantId,
        shippingId:
          shipping.id,
        exceptionId:
          exception.id,
        resolvedBy: "manager-1",
        resolutionNotes:
          "Hasar tutanağı oluşturuldu.",
      });

    const completed =
      await environment.shippingService
        .completeDelivery(
          shipping.tenantId,
          shipping.id,
        );

    assert.equal(
      completed.status,
      "delivered",
    );
  },
);

test(
  "sevk edilmiş operasyon doğrudan iptal edilemez",
  async () => {
    const environment =
      createEnvironment();

    const shipping =
      await createShipping(
        environment,
      );

    await environment.repository.save({
      ...shipping,
      status: "dispatched",
      dispatchedAt:
        environment.now(),
      updatedAt:
        environment.now(),
    });

    await assert.rejects(
      () =>
        environment.shippingService
          .cancel({
            tenantId:
              shipping.tenantId,
            shippingId:
              shipping.id,
            cancellationReason:
              "Operasyon iptali",
          }),
      /doğrudan iptal edilemez/,
    );
  },
);

test(
  "sevkiyat başlamadan operasyon iptal edilebilir",
  async () => {
    const environment =
      createEnvironment();

    const shipping =
      await createShipping(
        environment,
      );

    const cancelled =
      await environment.shippingService
        .cancel({
          tenantId:
            shipping.tenantId,
          shippingId:
            shipping.id,
          cancellationReason:
            "Müşteri siparişi iptal etti.",
        });

    assert.equal(
      cancelled.status,
      "cancelled",
    );

    assert.equal(
      cancelled.cancellationReason,
      "Müşteri siparişi iptal etti.",
    );
  },
);

test(
  "tamamlanmış packing kaydı sevkiyata aktarılır",
  async () => {
    const environment =
      createEnvironment();

    environment.packingRecords.set(
      "packing-ready-1",
      {
        id: "packing-ready-1",
        tenantId: "tenant-1",
        packingNumber:
          "PKL-20260805-000001",
        warehouseId: "warehouse-1",
        packingLocationId:
          "packing-location-1",
        shippingLocationId:
          "shipping-location-1",
        status: "shipping_ready",
        strategy: "cartonization",
        priority: 50,
        orderId: "order-100",
        orderNumber: "SIP-100",
        items: [
          {
            id: "packing-item-1",
            tenantId: "tenant-1",
            packingId:
              "packing-ready-1",
            warehouseId:
              "warehouse-1",
            packingLocationId:
              "packing-location-1",
            productId: "product-1",
            skuId: "sku-1",
            requestedQuantity: 5,
            packedQuantity: 5,
            damagedQuantity: 0,
            missingQuantity: 0,
            remainingQuantity: 0,
            unit: "adet",
            temperatureControlled:
              false,
            hazardousMaterial:
              false,
            createdBy: "user-1",
            createdAt:
              environment.now(),
            updatedAt:
              environment.now(),
          },
        ],
        packages: [
          {
            id: "packing-package-1",
            tenantId: "tenant-1",
            packingId:
              "packing-ready-1",
            packageNumber:
              "PKT-0001",
            containerId:
              "container-1",
            status:
              "shipping_ready",
            sscc:
              "123456789012345678",
            actualWeight: 25,
            actualVolume: 50_000,
            weightUnit: "kg",
            volumeUnit: "cm3",
            items: [],
            createdBy: "user-1",
            createdAt:
              environment.now(),
            updatedAt:
              environment.now(),
          },
        ],
        suggestions: [],
        labels: [],
        exceptions: [],
        createdBy: "user-1",
        createdAt:
          environment.now(),
        updatedAt:
          environment.now(),
      },
    );

    const shipping =
      await environment.shippingService
        .createFromPacking({
          tenantId: "tenant-1",
          packingId:
            "packing-ready-1",
          shippingLocationId:
            "shipping-location-1",
          createdBy: "user-1",
        });

    assert.equal(
      shipping.packingId,
      "packing-ready-1",
    );

    assert.equal(
      shipping.items.length,
      1,
    );

    assert.equal(
      shipping.packages.length,
      1,
    );
  },
);

test(
  "tamamlanmamış packing kaydı sevkiyata aktarılamaz",
  async () => {
    const environment =
      createEnvironment();

    environment.packingRecords.set(
      "packing-open-1",
      {
        id: "packing-open-1",
        tenantId: "tenant-1",
        packingNumber:
          "PKL-20260805-000002",
        warehouseId: "warehouse-1",
        packingLocationId:
          "packing-location-1",
        status: "in_progress",
        strategy: "cartonization",
        priority: 50,
        items: [],
        packages: [],
        suggestions: [],
        labels: [],
        exceptions: [],
        createdBy: "user-1",
        createdAt:
          environment.now(),
        updatedAt:
          environment.now(),
      },
    );

    await assert.rejects(
      () =>
        environment.shippingService
          .createFromPacking({
            tenantId: "tenant-1",
            packingId:
              "packing-open-1",
            shippingLocationId:
              "shipping-location-1",
            createdBy: "user-1",
          }),
      /Yalnızca sevkiyata hazır/,
    );
  },
);

test(
  "geçersiz görev tarihi Türkçe doğrulama hatası üretir",
  async () => {
    const environment =
      createEnvironment();

    const shipping =
      await createShipping(
        environment,
      );

    await assert.rejects(
      () =>
        environment.shippingService
          .createTask({
            tenantId:
              shipping.tenantId,
            shippingId:
              shipping.id,
            warehouseId:
              shipping.warehouseId,
            shippingLocationId:
              shipping.shippingLocationId,
            type: "load_package",
            plannedAt:
              "geçersiz-tarih",
            createdBy: "user-1",
          }),
      /Planlanan görev tarihi geçerli bir tarih olmalıdır/,
    );
  },
);
