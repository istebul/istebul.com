import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

let warehouseModulePromise;

async function loadWarehouseModule() {
  warehouseModulePromise ??= (async () => {
    const result = await build({
      entryPoints: [
        "src/warehouse/index.ts",
      ],
      bundle: true,
      platform: "node",
      format: "esm",
      write: false,
      target: "node20",
    });

    const source =
      result.outputFiles[0].text;

    const encoded = Buffer
      .from(source)
      .toString("base64");

    return import(
      `data:text/javascript;base64,${encoded}`
    );
  })();

  return warehouseModulePromise;
}

function createContext(
  module,
  options = {},
) {
  const repository =
    new module.InMemoryPackingRepository();

  let entitySequence = 0;
  let documentSequence = 0;
  let labelSequence = 0;

  const now = () =>
    "2026-08-05T17:40:00.000Z";

  const createId = () =>
    `packing-entity-${++entitySequence}`;

  const picking =
    options.picking ?? {
      id: "picking-1",
      tenantId: "tenant-1",
      pickingNumber:
        "TPL-20260805-000001",
      warehouseId: "warehouse-1",
      destinationLocationId:
        "packing-location-1",
      strategy: "single_order",
      status: "completed",
      orderId: "order-picking-1",
      orderNumber: "SIP-PICKING-1",
      priority: 25,
      items: [
        {
          id: "picking-item-1",
          tenantId: "tenant-1",
          pickingId: "picking-1",
          lineNumber: 1,
          warehouseId: "warehouse-1",
          productId: "product-1",
          requestedQuantity: 10,
          pickedQuantity: 8,
          shortQuantity: 2,
          remainingQuantity: 0,
          unit: "piece",
          stockStatus: "available",
          strategy: "single_order",
          sourceLocationId:
            "storage-location-1",
          destinationLocationId:
            "packing-location-1",
          inventoryMovementIds: [
            "movement-1",
            "movement-2",
          ],
          transactionGroupIds: [
            "transaction-1",
          ],
          createdBy: "picker-1",
          createdAt: now(),
          updatedAt: now(),
        },
      ],
      suggestions: [],
      exceptions: [],
      routes: [],
      createdBy: "picker-1",
      createdAt: now(),
      updatedAt: now(),
    };

  const pickingService = {
    async get(tenantId, pickingId) {
      if (
        tenantId !== picking.tenantId ||
        pickingId !== picking.id
      ) {
        throw new module
          .InventoryValidationError(
            `Toplama kaydı bulunamadı: ${pickingId}`,
          );
      }

      return structuredClone(picking);
    },
  };

  const suggestionService =
    new module.PackingSuggestionService({
      repository,
      createId,
      now,
    });

  const containerService =
    new module.PackingContainerService({
      repository,
      createId,
      now,
    });

  const labelService =
    new module.PackingLabelService({
      repository,
      createId,
      now,
      sequence: () => ++labelSequence,
    });

  const packingService =
    new module.PackingService({
      repository,
      suggestionService,
      containerService,
      labelService,
      pickingService,
      createId,
      now,
      sequence: () => ++documentSequence,
    });

  return {
    repository,
    suggestionService,
    containerService,
    labelService,
    packingService,
    pickingService,
    picking,
    now,
  };
}

async function createContainer(
  context,
  overrides = {},
) {
  return context.containerService.create({
    tenantId: "tenant-1",
    code:
      overrides.code ??
      "KOLI-001",
    name:
      overrides.name ??
      "Standart Koli",
    type:
      overrides.type ??
      "carton",
    dimensions:
      overrides.dimensions ?? {
        length: 50,
        width: 40,
        height: 30,
        unit: "cm",
      },
    emptyWeight:
      overrides.emptyWeight ?? 0.5,
    maximumWeight:
      overrides.maximumWeight ?? 25,
    maximumVolume:
      overrides.maximumVolume ??
      60_000,
    weightUnit:
      overrides.weightUnit ?? "kg",
    volumeUnit:
      overrides.volumeUnit ?? "cm3",
    temperatureControlled:
      overrides.temperatureControlled ??
      false,
    hazardousMaterialAllowed:
      overrides.hazardousMaterialAllowed ??
      false,
    reusable:
      overrides.reusable ?? false,
    createdBy: "warehouse-manager",
  });
}

async function createPackingWithItem(
  module,
  options = {},
) {
  const context = createContext(
    module,
    options.contextOptions,
  );

  const packing =
    await context.packingService.create({
      tenantId: "tenant-1",
      warehouseId: "warehouse-1",
      packingLocationId:
        "packing-location-1",
      shippingLocationId:
        "shipping-location-1",
      strategy:
        options.strategy ??
        "cartonization",
      orderId:
        options.orderId ??
        "order-1",
      orderNumber:
        options.orderNumber ??
        "SIP-1",
      priority: 25,
      createdBy: "warehouse-manager",
    });

  const item =
    await context.packingService.addItem({
      tenantId: "tenant-1",
      packingId: packing.id,
      warehouseId: "warehouse-1",
      packingLocationId:
        "packing-location-1",
      productId:
        options.productId ??
        "product-1",
      requestedQuantity:
        options.requestedQuantity ??
        10,
      unit: "piece",
      unitWeight:
        options.unitWeight ?? 1,
      unitVolume:
        options.unitVolume ?? 1_000,
      weightUnit: "kg",
      volumeUnit: "cm3",
      temperatureControlled:
        options.temperatureControlled ??
        false,
      hazardousMaterial:
        options.hazardousMaterial ??
        false,
      createdBy: "warehouse-manager",
      ...(options.barcode !== undefined
        ? { barcode: options.barcode }
        : {}),
      ...(options.tracking !== undefined
        ? { tracking: options.tracking }
        : {}),
    });

  return {
    ...context,
    packing,
    item,
  };
}

async function preparePackingExecution(
  context,
  options = {},
) {
  const container =
    options.container ??
    await createContainer(context);

  const packingPackage =
    await context.packingService
      .createPackage({
        tenantId: "tenant-1",
        packingId: context.packing.id,
        containerId: container.id,
        weightUnit: "kg",
        volumeUnit: "cm3",
        createdBy: "warehouse-manager",
      });

  const task =
    await context.packingService
      .createTask({
        tenantId: "tenant-1",
        packingId: context.packing.id,
        packingItemId:
          context.item.id,
        packageId:
          packingPackage.id,
        warehouseId: "warehouse-1",
        packingLocationId:
          "packing-location-1",
        assignedUserId:
          "packer-1",
        priority: 10,
        sequence: 1,
        createdBy:
          "warehouse-manager",
      });

  await context.packingService.release(
    "tenant-1",
    context.packing.id,
  );

  await context.packingService.start(
    "tenant-1",
    context.packing.id,
  );

  return {
    container,
    packingPackage,
    task,
  };
}

test(
  "paketleme emri oluşturulur ve numara üretilir",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPackingWithItem(module);

    assert.equal(
      context.packing.status,
      "draft",
    );

    assert.match(
      context.packing.packingNumber,
      /^PKL-20260805-\d{6}$/,
    );

    assert.equal(
      context.item.requestedQuantity,
      10,
    );

    assert.equal(
      context.item.remainingQuantity,
      10,
    );
  },
);

test(
  "aynı sipariş için ikinci paketleme emri oluşturulamaz",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPackingWithItem(module);

    await assert.rejects(
      context.packingService.create({
        tenantId: "tenant-1",
        warehouseId: "warehouse-1",
        packingLocationId:
          "packing-location-1",
        shippingLocationId:
          "shipping-location-1",
        strategy: "cartonization",
        orderId: "order-1",
        createdBy: "manager",
      }),
      /daha önce paketleme emri/,
    );
  },
);

test(
  "aynı ambalaj kodu ikinci kez kullanılamaz",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      createContext(module);

    await createContainer(context, {
      code: "KOLI-001",
    });

    await assert.rejects(
      createContainer(context, {
        code: "KOLI-001",
      }),
      /Ambalaj kodu daha önce kullanılmış/,
    );
  },
);

test(
  "ambalaj kullanılabilir ağırlık ve hacim kapasitesi hesaplanır",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      createContext(module);

    const container =
      await createContainer(context, {
        emptyWeight: 1,
        maximumWeight: 21,
        maximumVolume: 60_000,
      });

    const capacity =
      context.containerService
        .calculateCapacity(container);

    assert.equal(
      capacity.maximumWeightKg,
      21,
    );

    assert.equal(
      capacity.usableWeightKg,
      20,
    );

    assert.equal(
      capacity.maximumVolumeCm3,
      60_000,
    );
  },
);

test(
  "cartonization uygun ambalajları puana göre sıralar",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPackingWithItem(
        module,
        {
          requestedQuantity: 10,
          unitWeight: 1,
          unitVolume: 1_000,
        },
      );

    const largeContainer =
      await createContainer(context, {
        code: "BUYUK-KOLI",
        maximumWeight: 50,
        maximumVolume: 100_000,
      });

    const optimizedContainer =
      await createContainer(context, {
        code: "OPTIMUM-KOLI",
        maximumWeight: 12,
        maximumVolume: 12_000,
      });

    const suggestions =
      await context.packingService
        .generateSuggestions({
          tenantId: "tenant-1",
          packingId: context.packing.id,
          containers: [
            largeContainer,
            optimizedContainer,
          ],
        });

    assert.equal(
      suggestions.length,
      2,
    );

    assert.equal(
      suggestions[0].containerId,
      optimizedContainer.id,
    );

    assert.equal(
      suggestions[0].selected,
      true,
    );
  },
);

test(
  "sıcaklık kontrollü ürün normal koliye önerilmez",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPackingWithItem(
        module,
        {
          temperatureControlled: true,
        },
      );

    const normal =
      await createContainer(context, {
        code: "NORMAL-KOLI",
        temperatureControlled: false,
      });

    const thermal =
      await createContainer(context, {
        code: "TERMAL-KOLI",
        type: "thermal_box",
        temperatureControlled: true,
      });

    const suggestions =
      await context.packingService
        .generateSuggestions({
          tenantId: "tenant-1",
          packingId: context.packing.id,
          containers: [
            normal,
            thermal,
          ],
        });

    assert.equal(
      suggestions.length,
      1,
    );

    assert.equal(
      suggestions[0].containerId,
      thermal.id,
    );
  },
);

test(
  "tehlikeli madde yalnızca uyumlu ambalaja önerilir",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPackingWithItem(
        module,
        {
          hazardousMaterial: true,
          strategy:
            "hazardous_material",
        },
      );

    const normal =
      await createContainer(context, {
        code: "NORMAL-KOLI",
        hazardousMaterialAllowed:
          false,
      });

    const hazardous =
      await createContainer(context, {
        code: "HAZMAT-KABI",
        type: "hazardous_container",
        hazardousMaterialAllowed:
          true,
      });

    const suggestions =
      await context.packingService
        .generateSuggestions({
          tenantId: "tenant-1",
          packingId: context.packing.id,
          containers: [
            normal,
            hazardous,
          ],
        });

    assert.equal(
      suggestions.length,
      1,
    );

    assert.equal(
      suggestions[0].containerId,
      hazardous.id,
    );
  },
);

test(
  "paketleme görev olmadan başlatılamaz",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPackingWithItem(module);

    await context.packingService.release(
      "tenant-1",
      context.packing.id,
    );

    await assert.rejects(
      context.packingService.start(
        "tenant-1",
        context.packing.id,
      ),
      /en az bir görev/,
    );
  },
);

test(
  "paketleme onayı ürünü fiziksel pakete ekler",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPackingWithItem(
        module,
        {
          requestedQuantity: 10,
          unitWeight: 1,
          unitVolume: 1_000,
        },
      );

    const execution =
      await preparePackingExecution(
        context,
      );

    const item =
      await context.packingService
        .confirmItem({
          tenantId: "tenant-1",
          packingId:
            context.packing.id,
          packingItemId:
            context.item.id,
          packageId:
            execution.packingPackage.id,
          quantity: 6,
          packedBy: "packer-1",
        });

    assert.equal(
      item.packedQuantity,
      6,
    );

    assert.equal(
      item.remainingQuantity,
      4,
    );

    const [updatedPackage] =
      await context.packingService
        .listPackages(
          "tenant-1",
          context.packing.id,
        );

    assert.equal(
      updatedPackage.items.length,
      1,
    );

    assert.equal(
      updatedPackage.items[0].quantity,
      6,
    );

    assert.equal(
      updatedPackage.calculatedWeight,
      6,
    );

    assert.equal(
      updatedPackage.calculatedVolume,
      6_000,
    );
  },
);

test(
  "yanlış barkod ile ürün paketlenemez",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPackingWithItem(
        module,
        {
          barcode: "869000000001",
        },
      );

    const execution =
      await preparePackingExecution(
        context,
      );

    await assert.rejects(
      context.packingService.confirmItem({
        tenantId: "tenant-1",
        packingId:
          context.packing.id,
        packingItemId:
          context.item.id,
        packageId:
          execution.packingPackage.id,
        quantity: 2,
        barcode: "869000000999",
        packedBy: "packer-1",
      }),
      /Okutulan barkod.*uyuşmamaktadır/,
    );
  },
);

test(
  "lot takipli ürün yanlış lot ile paketlenemez",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPackingWithItem(
        module,
        {
          tracking: {
            lotNumber: "LOT-001",
          },
        },
      );

    const execution =
      await preparePackingExecution(
        context,
      );

    await assert.rejects(
      context.packingService.confirmItem({
        tenantId: "tenant-1",
        packingId:
          context.packing.id,
        packingItemId:
          context.item.id,
        packageId:
          execution.packingPackage.id,
        quantity: 2,
        lotNumber: "LOT-999",
        packedBy: "packer-1",
      }),
      /lot numarası.*uyuşmamaktadır/i,
    );
  },
);

test(
  "hasarlı ve eksik paketleme otomatik istisna oluşturur",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPackingWithItem(
        module,
        {
          requestedQuantity: 10,
        },
      );

    const execution =
      await preparePackingExecution(
        context,
      );

    const item =
      await context.packingService
        .confirmItem({
          tenantId: "tenant-1",
          packingId:
            context.packing.id,
          packingItemId:
            context.item.id,
          packageId:
            execution.packingPackage.id,
          quantity: 7,
          damagedQuantity: 1,
          missingQuantity: 2,
          packedBy: "packer-1",
        });

    assert.equal(
      item.packedQuantity,
      7,
    );

    assert.equal(
      item.damagedQuantity,
      1,
    );

    assert.equal(
      item.missingQuantity,
      2,
    );

    assert.equal(
      item.remainingQuantity,
      0,
    );

    const exceptions =
      await context.packingService
        .listExceptions(
          "tenant-1",
          context.packing.id,
        );

    assert.deepEqual(
      exceptions
        .map((exception) =>
          exception.type,
        )
        .sort(),
      [
        "damaged_product",
        "item_missing",
      ],
    );
  },
);

test(
  "boş paket mühürlenemez",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPackingWithItem(module);

    const container =
      await createContainer(context);

    const packingPackage =
      await context.packingService
        .createPackage({
          tenantId: "tenant-1",
          packingId:
            context.packing.id,
          containerId:
            container.id,
          createdBy: "manager",
        });

    await assert.rejects(
      context.packingService.sealPackage({
        tenantId: "tenant-1",
        packingId:
          context.packing.id,
        packageId:
          packingPackage.id,
        sealedBy: "packer-1",
      }),
      /Ürün bulunmayan paket mühürlenemez/,
    );
  },
);

test(
  "paket mühürlenir, SSCC etiketi üretilir ve yazdırılır",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPackingWithItem(
        module,
        {
          requestedQuantity: 5,
        },
      );

    const execution =
      await preparePackingExecution(
        context,
      );

    await context.packingService
      .confirmItem({
        tenantId: "tenant-1",
        packingId:
          context.packing.id,
        packingItemId:
          context.item.id,
        packageId:
          execution.packingPackage.id,
        quantity: 5,
        packedBy: "packer-1",
      });

    const sealed =
      await context.packingService
        .sealPackage({
          tenantId: "tenant-1",
          packingId:
            context.packing.id,
          packageId:
            execution.packingPackage.id,
          sealedBy: "packer-1",
          sealNumber: "MUHUR-001",
          actualWeight: 5.5,
        });

    assert.equal(
      sealed.status,
      "sealed",
    );

    const label =
      await context.packingService
        .generatePackageLabel({
          tenantId: "tenant-1",
          packingId:
            context.packing.id,
          packageId:
            sealed.id,
          createdBy: "packer-1",
          format: "zpl",
          printerId: "printer-1",
        });

    assert.equal(
      label.status,
      "generated",
    );

    assert.match(
      label.sscc,
      /^\d{18}$/,
    );

    assert.match(
      label.content,
      /\^XA/,
    );

    const printed =
      await context.labelService
        .markPrinted({
          tenantId: "tenant-1",
          packingId:
            context.packing.id,
          labelId: label.id,
          printerId: "printer-1",
        });

    assert.equal(
      printed.status,
      "printed",
    );
  },
);

test(
  "çözülmemiş paketleme istisnası tamamlamayı engeller",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPackingWithItem(
        module,
        {
          requestedQuantity: 5,
        },
      );

    const execution =
      await preparePackingExecution(
        context,
      );

    await context.packingService
      .confirmItem({
        tenantId: "tenant-1",
        packingId:
          context.packing.id,
        packingItemId:
          context.item.id,
        packageId:
          execution.packingPackage.id,
        quantity: 4,
        missingQuantity: 1,
        packedBy: "packer-1",
      });

    await context.packingService
      .sealPackage({
        tenantId: "tenant-1",
        packingId:
          context.packing.id,
        packageId:
          execution.packingPackage.id,
        sealedBy: "packer-1",
      });

    await assert.rejects(
      context.packingService.complete(
        "tenant-1",
        context.packing.id,
      ),
      /Çözülmemiş paketleme istisnaları/,
    );
  },
);

test(
  "istisna çözülür, paketleme tamamlanır ve sevkiyata hazırlanır",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPackingWithItem(
        module,
        {
          requestedQuantity: 5,
        },
      );

    const execution =
      await preparePackingExecution(
        context,
      );

    await context.packingService
      .confirmItem({
        tenantId: "tenant-1",
        packingId:
          context.packing.id,
        packingItemId:
          context.item.id,
        packageId:
          execution.packingPackage.id,
        quantity: 4,
        missingQuantity: 1,
        packedBy: "packer-1",
      });

    const [exception] =
      await context.packingService
        .listExceptions(
          "tenant-1",
          context.packing.id,
        );

    await context.packingService
      .resolveException({
        tenantId: "tenant-1",
        packingId:
          context.packing.id,
        exceptionId:
          exception.id,
        resolvedBy:
          "supervisor-1",
        resolutionNotes:
          "Eksik ürün backorder kaydına aktarıldı.",
      });

    const sealed =
      await context.packingService
        .sealPackage({
          tenantId: "tenant-1",
          packingId:
            context.packing.id,
          packageId:
            execution.packingPackage.id,
          sealedBy: "packer-1",
        });

    await context.packingService
      .generatePackageLabel({
        tenantId: "tenant-1",
        packingId:
          context.packing.id,
        packageId: sealed.id,
        createdBy: "packer-1",
      });

    const completed =
      await context.packingService
        .complete(
          "tenant-1",
          context.packing.id,
        );

    assert.equal(
      completed.status,
      "packed",
    );

    const shippingReady =
      await context.packingService
        .markShippingReady(
          "tenant-1",
          context.packing.id,
        );

    assert.equal(
      shippingReady.status,
      "shipping_ready",
    );

    const [shippingPackage] =
      await context.packingService
        .listPackages(
          "tenant-1",
          context.packing.id,
        );

    assert.equal(
      shippingPackage.status,
      "shipping_ready",
    );
  },
);

test(
  "mühürlenmiş paket bulunan operasyon doğrudan iptal edilemez",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPackingWithItem(
        module,
        {
          requestedQuantity: 2,
        },
      );

    const execution =
      await preparePackingExecution(
        context,
      );

    await context.packingService
      .confirmItem({
        tenantId: "tenant-1",
        packingId:
          context.packing.id,
        packingItemId:
          context.item.id,
        packageId:
          execution.packingPackage.id,
        quantity: 2,
        packedBy: "packer-1",
      });

    await context.packingService
      .sealPackage({
        tenantId: "tenant-1",
        packingId:
          context.packing.id,
        packageId:
          execution.packingPackage.id,
        sealedBy: "packer-1",
      });

    await assert.rejects(
      context.packingService.cancel(
        "tenant-1",
        context.packing.id,
        "Sipariş iptal edildi.",
      ),
      /Mühürlenmiş veya etiketlenmiş paket/,
    );
  },
);

test(
  "paketleme başlamadan operasyon iptal edilebilir",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPackingWithItem(module);

    const cancelled =
      await context.packingService.cancel(
        "tenant-1",
        context.packing.id,
        "Müşteri siparişi iptal etti.",
      );

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
  "tamamlanmış picking kaydı packing emrine aktarılır",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      createContext(module);

    const packing =
      await context.packingService
        .createFromPicking({
          tenantId: "tenant-1",
          pickingId: "picking-1",
          packingLocationId:
            "packing-location-1",
          shippingLocationId:
            "shipping-location-1",
          createdBy:
            "warehouse-manager",
        });

    assert.equal(
      packing.pickingId,
      "picking-1",
    );

    assert.equal(
      packing.orderId,
      "order-picking-1",
    );

    assert.equal(
      packing.items.length,
      1,
    );

    assert.equal(
      packing.items[0]
        .requestedQuantity,
      8,
    );

    assert.equal(
      packing.referenceType,
      "picking",
    );
  },
);

test(
  "tamamlanmamış picking kaydı packing emrine aktarılamaz",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      createContext(module, {
        picking: {
          id: "picking-open",
          tenantId: "tenant-1",
          pickingNumber:
            "TPL-20260805-000099",
          warehouseId: "warehouse-1",
          destinationLocationId:
            "packing-location-1",
          strategy: "single_order",
          status: "in_progress",
          priority: 25,
          items: [],
          suggestions: [],
          exceptions: [],
          routes: [],
          createdBy: "picker-1",
          createdAt:
            "2026-08-05T17:40:00.000Z",
          updatedAt:
            "2026-08-05T17:40:00.000Z",
        },
      });

    await assert.rejects(
      context.packingService
        .createFromPicking({
          tenantId: "tenant-1",
          pickingId: "picking-open",
          packingLocationId:
            "packing-location-1",
          createdBy: "manager",
        }),
      /Yalnızca tamamlanmış toplama kaydı/,
    );
  },
);
