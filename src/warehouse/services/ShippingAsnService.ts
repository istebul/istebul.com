import type {
  ShippingAsn,
  ShippingAsnLine,
} from "../types/ShippingAsn";
import type {
  ShippingItem,
} from "../types/ShippingItem";
import type {
  ShippingPackage,
} from "../types/ShippingPackage";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  ShippingRepository,
} from "./ShippingRepository";
import {
  validateCreateShippingAsn,
} from "./ShippingValidator";

export interface ShippingAsnServiceDependencies {
  repository: ShippingRepository;
  createId?: () => string;
  now?: () => string;
  sequence?: () => number;
}

export interface GenerateShippingAsnInput {
  tenantId: string;
  shippingId: string;
  asnId: string;
  generatedBy: string;
}

export interface SendShippingAsnInput {
  tenantId: string;
  shippingId: string;
  asnId: string;
}

export interface AcknowledgeShippingAsnInput {
  tenantId: string;
  shippingId: string;
  asnId: string;
}

export interface RejectShippingAsnInput {
  tenantId: string;
  shippingId: string;
  asnId: string;
  rejectionReason: string;
}

export interface CancelShippingAsnInput {
  tenantId: string;
  shippingId: string;
  asnId: string;
  cancellationReason?: string;
}

function requireText(
  value: string,
  fieldName: string,
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new InventoryValidationError(
      `${fieldName} boş bırakılamaz.`,
    );
  }

  return normalized;
}

function escapeXml(
  value: string,
): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function findPackageForItem(
  item: ShippingItem,
  packages: readonly ShippingPackage[],
): ShippingPackage | undefined {
  if (item.packingId === undefined) {
    return undefined;
  }

  return packages.find(
    (shippingPackage) =>
      shippingPackage.packingId ===
      item.packingId,
  );
}

function buildAsnLine(
  item: ShippingItem,
  packageMatch:
    ShippingPackage | undefined,
): ShippingAsnLine {
  return {
    lineNumber: item.lineNumber,
    productId: item.productId,
    quantity: item.requestedQuantity,
    unit: item.unit,
    ...(item.skuId !== undefined
      ? { skuId: item.skuId }
      : {}),
    ...(item.tracking?.lotNumber !==
    undefined
      ? {
          lotNumber:
            item.tracking.lotNumber,
        }
      : {}),
    ...(item.tracking?.serialNumber !==
    undefined
      ? {
          serialNumber:
            item.tracking.serialNumber,
        }
      : {}),
    ...(packageMatch !== undefined
      ? {
          packageNumber:
            packageMatch.packageNumber,
          ...(packageMatch.sscc !==
          undefined
            ? {
                sscc:
                  packageMatch.sscc,
              }
            : {}),
        }
      : {}),
  };
}

export class ShippingAsnService {
  private readonly repository:
    ShippingRepository;

  private readonly createId:
    () => string;

  private readonly now:
    () => string;

  private readonly sequence:
    () => number;

  constructor(
    dependencies:
      ShippingAsnServiceDependencies,
  ) {
    this.repository =
      dependencies.repository;

    this.createId =
      dependencies.createId ??
      (() => crypto.randomUUID());

    this.now =
      dependencies.now ??
      (() => new Date().toISOString());

    let internalSequence = 0;

    this.sequence =
      dependencies.sequence ??
      (() => ++internalSequence);
  }

  async create(input: {
    tenantId: string;
    shippingId: string;
    senderCode?: string;
    receiverCode?: string;
    format?:
      | "json"
      | "xml"
      | "edi"
      | "edifact"
      | "custom";
    notes?: string;
    createdBy: string;
  }): Promise<ShippingAsn> {
    const normalized =
      validateCreateShippingAsn(
        input,
      );

    const shipping =
      await this.repository.findById(
        normalized.tenantId,
        normalized.shippingId,
      );

    if (!shipping) {
      throw new InventoryValidationError(
        `Sevkiyat kaydı bulunamadı: ${normalized.shippingId}`,
      );
    }

    if (
      shipping.status === "delivered" ||
      shipping.status === "returned" ||
      shipping.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış, iade edilmiş veya iptal edilmiş sevkiyat için ASN oluşturulamaz.",
      );
    }

    const existing =
      await this.repository.listAsns(
        shipping.tenantId,
        shipping.id,
      );

    const activeAsn =
      existing.find(
        (asn) =>
          asn.status !== "cancelled" &&
          asn.status !== "rejected",
      );

    if (activeAsn) {
      throw new InventoryValidationError(
        "Bu sevkiyat için aktif bir ASN zaten bulunmaktadır.",
      );
    }

    const timestamp = this.now();

    return this.repository.saveAsn({
      id: this.createId(),
      tenantId: shipping.tenantId,
      shippingId: shipping.id,
      asnNumber:
        this.generateAsnNumber(),
      status: "draft",
      packageCount: 0,
      lines: [],
      format: normalized.format ??
        "json",
      createdBy:
        normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.senderCode !==
      undefined
        ? {
            senderCode:
              normalized.senderCode,
          }
        : {}),
      ...(normalized.receiverCode !==
      undefined
        ? {
            receiverCode:
              normalized.receiverCode,
          }
        : {}),
      ...(shipping.plannedAt !==
      undefined
        ? {
            plannedDispatchAt:
              shipping.plannedAt,
          }
        : {}),
      ...(shipping.expectedDeliveryAt !==
      undefined
        ? {
            expectedDeliveryAt:
              shipping
                .expectedDeliveryAt,
          }
        : {}),
      ...(normalized.notes !== undefined
        ? {
            notes:
              normalized.notes,
          }
        : {}),
    });
  }

  async generate(
    input: GenerateShippingAsnInput,
  ): Promise<ShippingAsn> {
    const asn =
      await this.get(
        input.tenantId,
        input.shippingId,
        input.asnId,
      );

    if (
      asn.status !== "draft" &&
      asn.status !== "rejected"
    ) {
      throw new InventoryValidationError(
        "Yalnızca taslak veya reddedilmiş ASN yeniden oluşturulabilir.",
      );
    }

    requireText(
      input.generatedBy,
      "ASN oluşturan kullanıcı",
    );

    const shipping =
      await this.repository.findById(
        asn.tenantId,
        asn.shippingId,
      );

    if (!shipping) {
      throw new InventoryValidationError(
        "ASN sevkiyat kaydı bulunamadı.",
      );
    }

    if (shipping.items.length === 0) {
      throw new InventoryValidationError(
        "Sevkiyat satırı bulunmadan ASN oluşturulamaz.",
      );
    }

    const packages =
      await this.repository.listPackages(
        shipping.tenantId,
        shipping.id,
      );

    if (packages.length === 0) {
      throw new InventoryValidationError(
        "Sevkiyat paketi bulunmadan ASN oluşturulamaz.",
      );
    }

    const invalidPackages =
      packages.filter(
        (shippingPackage) =>
          shippingPackage.status ===
            "pending" ||
          shippingPackage.status ===
            "cancelled",
      );

    if (invalidPackages.length > 0) {
      throw new InventoryValidationError(
        "Bekleyen veya iptal edilmiş paketler ASN içine eklenemez.",
      );
    }

    const lines =
      shipping.items.map(
        (item) =>
          buildAsnLine(
            item,
            findPackageForItem(
              item,
              packages,
            ),
          ),
      );

    const content =
      this.generateContent({
        asn,
        lines,
        packageCount:
          packages.length,
      });

    const timestamp = this.now();

    return this.repository.saveAsn({
      ...asn,
      status: "generated",
      packageCount:
        packages.length,
      lines,
      content,
      generatedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async send(
    input: SendShippingAsnInput,
  ): Promise<ShippingAsn> {
    const asn =
      await this.get(
        input.tenantId,
        input.shippingId,
        input.asnId,
      );

    if (asn.status !== "generated") {
      throw new InventoryValidationError(
        "Yalnızca oluşturulmuş ASN gönderilebilir.",
      );
    }

    const shipping =
      await this.repository.findById(
        asn.tenantId,
        asn.shippingId,
      );

    if (!shipping) {
      throw new InventoryValidationError(
        "ASN sevkiyat kaydı bulunamadı.",
      );
    }

    if (shipping.carrierId === undefined) {
      throw new InventoryValidationError(
        "ASN gönderimi için taşıyıcı atanmalıdır.",
      );
    }

    const carrier =
      await this.repository
        .findCarrierById(
          shipping.tenantId,
          shipping.carrierId,
        );

    if (!carrier) {
      throw new InventoryValidationError(
        "ASN taşıyıcısı bulunamadı.",
      );
    }

    if (!carrier.active) {
      throw new InventoryValidationError(
        "Pasif taşıyıcıya ASN gönderilemez.",
      );
    }

    if (!carrier.asnSupported) {
      throw new InventoryValidationError(
        "Seçilen taşıyıcı ASN gönderimini desteklemiyor.",
      );
    }

    const timestamp = this.now();

    return this.repository.saveAsn({
      ...asn,
      status: "sent",
      sentAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async acknowledge(
    input:
      AcknowledgeShippingAsnInput,
  ): Promise<ShippingAsn> {
    const asn =
      await this.get(
        input.tenantId,
        input.shippingId,
        input.asnId,
      );

    if (asn.status !== "sent") {
      throw new InventoryValidationError(
        "Yalnızca gönderilmiş ASN için alındı onayı verilebilir.",
      );
    }

    const timestamp = this.now();

    return this.repository.saveAsn({
      ...asn,
      status: "acknowledged",
      acknowledgedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async reject(
    input: RejectShippingAsnInput,
  ): Promise<ShippingAsn> {
    const asn =
      await this.get(
        input.tenantId,
        input.shippingId,
        input.asnId,
      );

    if (asn.status !== "sent") {
      throw new InventoryValidationError(
        "Yalnızca gönderilmiş ASN reddedilebilir.",
      );
    }

    const rejectionReason =
      requireText(
        input.rejectionReason,
        "ASN ret nedeni",
      );

    return this.repository.saveAsn({
      ...asn,
      status: "rejected",
      rejectionReason,
      updatedAt: this.now(),
    });
  }

  async cancel(
    input: CancelShippingAsnInput,
  ): Promise<ShippingAsn> {
    const asn =
      await this.get(
        input.tenantId,
        input.shippingId,
        input.asnId,
      );

    if (
      asn.status === "acknowledged" ||
      asn.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Alındı onayı verilmiş veya iptal edilmiş ASN doğrudan iptal edilemez.",
      );
    }

    const cancellationReason =
      input.cancellationReason
        ?.trim();

    const existingNotes =
      asn.notes?.trim();

    const notes = [
      existingNotes,
      cancellationReason
        ? `İptal nedeni: ${cancellationReason}`
        : undefined,
    ]
      .filter(
        (
          value,
        ): value is string =>
          value !== undefined &&
          value.length > 0,
      )
      .join("\n");

    return this.repository.saveAsn({
      ...asn,
      status: "cancelled",
      updatedAt: this.now(),
      ...(notes
        ? { notes }
        : {}),
    });
  }

  async get(
    tenantId: string,
    shippingId: string,
    asnId: string,
  ): Promise<ShippingAsn> {
    const normalizedTenantId =
      requireText(
        tenantId,
        "Firma kimliği",
      );

    const normalizedShippingId =
      requireText(
        shippingId,
        "Sevkiyat kimliği",
      );

    const normalizedAsnId =
      requireText(
        asnId,
        "ASN kimliği",
      );

    const shipping =
      await this.repository.findById(
        normalizedTenantId,
        normalizedShippingId,
      );

    if (!shipping) {
      throw new InventoryValidationError(
        `Sevkiyat kaydı bulunamadı: ${shippingId}`,
      );
    }

    const asns =
      await this.repository.listAsns(
        normalizedTenantId,
        normalizedShippingId,
      );

    const asn =
      asns.find(
        (current) =>
          current.id ===
          normalizedAsnId,
      );

    if (!asn) {
      throw new InventoryValidationError(
        `ASN bulunamadı: ${asnId}`,
      );
    }

    return asn;
  }

  async list(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingAsn[]> {
    const normalizedTenantId =
      requireText(
        tenantId,
        "Firma kimliği",
      );

    const normalizedShippingId =
      requireText(
        shippingId,
        "Sevkiyat kimliği",
      );

    const shipping =
      await this.repository.findById(
        normalizedTenantId,
        normalizedShippingId,
      );

    if (!shipping) {
      throw new InventoryValidationError(
        `Sevkiyat kaydı bulunamadı: ${shippingId}`,
      );
    }

    return this.repository.listAsns(
      normalizedTenantId,
      normalizedShippingId,
    );
  }

  private generateContent(input: {
    asn: ShippingAsn;
    lines: readonly ShippingAsnLine[];
    packageCount: number;
  }): string {
    switch (input.asn.format) {
      case "json":
        return this.generateJsonContent(
          input,
        );

      case "xml":
        return this.generateXmlContent(
          input,
        );

      case "edi":
        return this.generateEdiContent(
          input,
        );

      case "edifact":
        return this.generateEdifactContent(
          input,
        );

      case "custom":
        return this.generateJsonContent(
          input,
        );
    }
  }

  private generateJsonContent(input: {
    asn: ShippingAsn;
    lines: readonly ShippingAsnLine[];
    packageCount: number;
  }): string {
    return JSON.stringify(
      {
        asnNumber:
          input.asn.asnNumber,
        shippingId:
          input.asn.shippingId,
        senderCode:
          input.asn.senderCode,
        receiverCode:
          input.asn.receiverCode,
        plannedDispatchAt:
          input.asn
            .plannedDispatchAt,
        expectedDeliveryAt:
          input.asn
            .expectedDeliveryAt,
        packageCount:
          input.packageCount,
        lines: input.lines,
      },
      null,
      2,
    );
  }

  private generateXmlContent(input: {
    asn: ShippingAsn;
    lines: readonly ShippingAsnLine[];
    packageCount: number;
  }): string {
    const lines = input.lines
      .map(
        (line) => [
          "  <Line>",
          `    <LineNumber>${line.lineNumber}</LineNumber>`,
          `    <ProductId>${escapeXml(line.productId)}</ProductId>`,
          line.skuId !== undefined
            ? `    <SkuId>${escapeXml(line.skuId)}</SkuId>`
            : undefined,
          `    <Quantity>${line.quantity}</Quantity>`,
          `    <Unit>${escapeXml(line.unit)}</Unit>`,
          line.lotNumber !== undefined
            ? `    <LotNumber>${escapeXml(line.lotNumber)}</LotNumber>`
            : undefined,
          line.serialNumber !== undefined
            ? `    <SerialNumber>${escapeXml(line.serialNumber)}</SerialNumber>`
            : undefined,
          line.packageNumber !==
          undefined
            ? `    <PackageNumber>${escapeXml(line.packageNumber)}</PackageNumber>`
            : undefined,
          line.sscc !== undefined
            ? `    <Sscc>${escapeXml(line.sscc)}</Sscc>`
            : undefined,
          "  </Line>",
        ]
          .filter(
            (
              value,
            ): value is string =>
              value !== undefined,
          )
          .join("\n"),
      )
      .join("\n");

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      "<AdvancedShippingNotice>",
      `  <AsnNumber>${escapeXml(input.asn.asnNumber)}</AsnNumber>`,
      `  <ShippingId>${escapeXml(input.asn.shippingId)}</ShippingId>`,
      `  <PackageCount>${input.packageCount}</PackageCount>`,
      input.asn.senderCode !==
      undefined
        ? `  <SenderCode>${escapeXml(input.asn.senderCode)}</SenderCode>`
        : undefined,
      input.asn.receiverCode !==
      undefined
        ? `  <ReceiverCode>${escapeXml(input.asn.receiverCode)}</ReceiverCode>`
        : undefined,
      "  <Lines>",
      lines,
      "  </Lines>",
      "</AdvancedShippingNotice>",
    ]
      .filter(
        (
          value,
        ): value is string =>
          value !== undefined,
      )
      .join("\n");
  }

  private generateEdiContent(input: {
    asn: ShippingAsn;
    lines: readonly ShippingAsnLine[];
    packageCount: number;
  }): string {
    const segments = [
      `HDR|${input.asn.asnNumber}|${input.asn.shippingId}|${input.packageCount}`,
      ...input.lines.map(
        (line) =>
          [
            "LIN",
            line.lineNumber,
            line.productId,
            line.skuId ?? "",
            line.quantity,
            line.unit,
            line.lotNumber ?? "",
            line.serialNumber ?? "",
            line.packageNumber ?? "",
            line.sscc ?? "",
          ].join("|"),
      ),
      `TRL|${input.lines.length}`,
    ];

    return segments.join("\n");
  }

  private generateEdifactContent(
    input: {
      asn: ShippingAsn;
      lines: readonly ShippingAsnLine[];
      packageCount: number;
    },
  ): string {
    const segments = [
      "UNH+1+DESADV:D:01B:UN'",
      `BGM+351+${input.asn.asnNumber}+9'`,
      `CPS+1'`,
      `PAC+${input.packageCount}'`,
      ...input.lines.flatMap(
        (line) => [
          `LIN+${line.lineNumber}++${line.productId}:EN'`,
          `QTY+12:${line.quantity}:${line.unit}'`,
          ...(line.lotNumber !==
          undefined
            ? [
                `GIN+BX+${line.lotNumber}'`,
              ]
            : []),
          ...(line.sscc !== undefined
            ? [
                `GIN+BJ+${line.sscc}'`,
              ]
            : []),
        ],
      ),
      `UNT+${4 + input.lines.length * 2}+1'`,
    ];

    return segments.join("\n");
  }

  private generateAsnNumber():
    string {
    const date = this.now()
      .slice(0, 10)
      .replaceAll("-", "");

    const sequence = String(
      this.sequence(),
    ).padStart(6, "0");

    return `ASN-${date}-${sequence}`;
  }
}
