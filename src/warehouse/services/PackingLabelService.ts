import type {
  CreatePackingLabelInput,
  PackingLabel,
} from "../types/PackingLabel";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  PackingRepository,
} from "./PackingRepository";
import {
  validateCreatePackingLabel,
} from "./PackingValidator";

export interface PackingLabelServiceDependencies {
  repository: PackingRepository;
  createId?: () => string;
  now?: () => string;
  sequence?: () => number;
}

export interface GeneratePackingLabelInput {
  tenantId: string;
  packingId: string;
  labelId: string;
  content?: string;
  barcodeValue?: string;
  sscc?: string;
}

export interface MarkPackingLabelPrintedInput {
  tenantId: string;
  packingId: string;
  labelId: string;
  printerId?: string;
}

export interface MarkPackingLabelFailedInput {
  tenantId: string;
  packingId: string;
  labelId: string;
  failureReason: string;
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

function calculateGs1CheckDigit(
  value: string,
): number {
  const digits = value
    .split("")
    .map((character) =>
      Number(character),
    );

  const sum = digits
    .reverse()
    .reduce(
      (total, digit, index) =>
        total +
        digit *
          (index % 2 === 0 ? 3 : 1),
      0,
    );

  return (10 - (sum % 10)) % 10;
}

export class PackingLabelService {
  private readonly repository:
    PackingRepository;

  private readonly createId:
    () => string;

  private readonly now:
    () => string;

  private readonly sequence:
    () => number;

  constructor(
    dependencies:
      PackingLabelServiceDependencies,
  ) {
    let internalSequence = 0;

    this.repository =
      dependencies.repository;

    this.createId =
      dependencies.createId ??
      (() => crypto.randomUUID());

    this.now =
      dependencies.now ??
      (() => new Date().toISOString());

    this.sequence =
      dependencies.sequence ??
      (() => ++internalSequence);
  }

  async create(
    input: CreatePackingLabelInput,
  ): Promise<PackingLabel> {
    const normalized =
      validateCreatePackingLabel(
        input,
      );

    const packing =
      await this.repository.findById(
        normalized.tenantId,
        normalized.packingId,
      );

    if (!packing) {
      throw new InventoryValidationError(
        `Paketleme kaydı bulunamadı: ${normalized.packingId}`,
      );
    }

    if (
      packing.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "İptal edilmiş paketleme için etiket oluşturulamaz.",
      );
    }

    if (
      normalized.packageId !== undefined
    ) {
      const packingPackage =
        packing.packages.find(
          (item) =>
            item.id ===
            normalized.packageId,
        );

      if (!packingPackage) {
        throw new InventoryValidationError(
          "Etiketin bağlı olduğu paket bulunamadı.",
        );
      }
    }

    const timestamp = this.now();

    return this.repository.saveLabel({
      id: this.createId(),
      tenantId: normalized.tenantId,
      packingId: normalized.packingId,
      type: normalized.type,
      status: "created",
      labelNumber:
        this.generateLabelNumber(),
      format: normalized.format,
      createdBy: normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.packageId !== undefined
        ? {
            packageId:
              normalized.packageId,
          }
        : {}),
      ...(normalized.barcodeValue !==
      undefined
        ? {
            barcodeValue:
              normalized.barcodeValue,
          }
        : {}),
      ...(normalized.sscc !== undefined
        ? { sscc: normalized.sscc }
        : {}),
      ...(normalized.printerId !== undefined
        ? {
            printerId:
              normalized.printerId,
          }
        : {}),
    });
  }

  async generate(
    input: GeneratePackingLabelInput,
  ): Promise<PackingLabel> {
    const label = await this.get(
      input.tenantId,
      input.packingId,
      input.labelId,
    );

    if (
      label.status === "printed" ||
      label.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Yazdırılmış veya iptal edilmiş etiket yeniden üretilemez.",
      );
    }

    const sscc =
      input.sscc?.trim() ||
      label.sscc ||
      (
        label.type === "sscc" ||
        label.type === "gs1_128"
          ? this.generateSscc()
          : undefined
      );

    const barcodeValue =
      input.barcodeValue?.trim() ||
      label.barcodeValue ||
      sscc;

    const content =
      input.content?.trim() ||
      this.generateContent({
        ...label,
        ...(sscc !== undefined
          ? { sscc }
          : {}),
        ...(barcodeValue !== undefined
          ? { barcodeValue }
          : {}),
      });

    const timestamp = this.now();

    return this.repository.saveLabel({
      ...label,
      status: "generated",
      content,
      generatedAt: timestamp,
      updatedAt: timestamp,
      ...(sscc !== undefined
        ? { sscc }
        : {}),
      ...(barcodeValue !== undefined
        ? { barcodeValue }
        : {}),
    });
  }

  async markPrinted(
    input: MarkPackingLabelPrintedInput,
  ): Promise<PackingLabel> {
    const label = await this.get(
      input.tenantId,
      input.packingId,
      input.labelId,
    );

    if (
      label.status !== "generated"
    ) {
      throw new InventoryValidationError(
        "Yalnızca üretilmiş etiket yazdırıldı olarak işaretlenebilir.",
      );
    }

    const printerId =
      input.printerId?.trim() ||
      label.printerId;

    const timestamp = this.now();

    return this.repository.saveLabel({
      ...label,
      status: "printed",
      printedAt: timestamp,
      updatedAt: timestamp,
      ...(printerId !== undefined
        ? { printerId }
        : {}),
    });
  }

  async markFailed(
    input: MarkPackingLabelFailedInput,
  ): Promise<PackingLabel> {
    const label = await this.get(
      input.tenantId,
      input.packingId,
      input.labelId,
    );

    if (
      label.status === "printed" ||
      label.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Yazdırılmış veya iptal edilmiş etiket başarısız olarak işaretlenemez.",
      );
    }

    const failureReason =
      requireText(
        input.failureReason,
        "Etiket hata nedeni",
      );

    return this.repository.saveLabel({
      ...label,
      status: "failed",
      failureReason,
      updatedAt: this.now(),
    });
  }

  async cancel(
    tenantId: string,
    packingId: string,
    labelId: string,
  ): Promise<PackingLabel> {
    const label = await this.get(
      tenantId,
      packingId,
      labelId,
    );

    if (label.status === "printed") {
      throw new InventoryValidationError(
        "Yazdırılmış etiket doğrudan iptal edilemez.",
      );
    }

    if (label.status === "cancelled") {
      throw new InventoryValidationError(
        "Etiket daha önce iptal edilmiş.",
      );
    }

    return this.repository.saveLabel({
      ...label,
      status: "cancelled",
      updatedAt: this.now(),
    });
  }

  async get(
    tenantId: string,
    packingId: string,
    labelId: string,
  ): Promise<PackingLabel> {
    const normalizedTenantId =
      requireText(
        tenantId,
        "Firma kimliği",
      );

    const normalizedPackingId =
      requireText(
        packingId,
        "Paketleme kimliği",
      );

    const normalizedLabelId =
      requireText(
        labelId,
        "Etiket kimliği",
      );

    const labels =
      await this.repository.listLabels(
        normalizedTenantId,
        normalizedPackingId,
      );

    const label = labels.find(
      (item) =>
        item.id === normalizedLabelId,
    );

    if (!label) {
      throw new InventoryValidationError(
        `Paketleme etiketi bulunamadı: ${labelId}`,
      );
    }

    return label;
  }

  async list(
    tenantId: string,
    packingId: string,
  ): Promise<PackingLabel[]> {
    const normalizedTenantId =
      requireText(
        tenantId,
        "Firma kimliği",
      );

    const normalizedPackingId =
      requireText(
        packingId,
        "Paketleme kimliği",
      );

    const packing =
      await this.repository.findById(
        normalizedTenantId,
        normalizedPackingId,
      );

    if (!packing) {
      throw new InventoryValidationError(
        `Paketleme kaydı bulunamadı: ${packingId}`,
      );
    }

    return this.repository.listLabels(
      normalizedTenantId,
      normalizedPackingId,
    );
  }

  generateSscc(
    extensionDigit = "0",
    companyPrefix = "8699999",
  ): string {
    if (
      !/^\d$/.test(extensionDigit)
    ) {
      throw new InventoryValidationError(
        "SSCC uzantı hanesi tek rakam olmalıdır.",
      );
    }

    if (
      !/^\d{7,10}$/.test(companyPrefix)
    ) {
      throw new InventoryValidationError(
        "GS1 şirket ön eki 7 ile 10 rakam arasında olmalıdır.",
      );
    }

    const serialLength =
      17 -
      extensionDigit.length -
      companyPrefix.length;

    const serialReference =
      String(this.sequence())
        .padStart(serialLength, "0")
        .slice(-serialLength);

    const base =
      extensionDigit +
      companyPrefix +
      serialReference;

    const checkDigit =
      calculateGs1CheckDigit(base);

    return `${base}${checkDigit}`;
  }

  private generateContent(
    label: PackingLabel,
  ): string {
    switch (label.format) {
      case "zpl":
        return [
          "^XA",
          "^FO40,40^A0N,35,35",
          `^FD${label.labelNumber}^FS`,
          ...(label.barcodeValue
            ? [
                "^FO40,100^BY2",
                "^BCN,100,Y,N,N",
                `^FD${label.barcodeValue}^FS`,
              ]
            : []),
          "^XZ",
        ].join("\n");

      case "text":
        return [
          `Etiket: ${label.labelNumber}`,
          `Tür: ${label.type}`,
          ...(label.barcodeValue
            ? [
                `Barkod: ${label.barcodeValue}`,
              ]
            : []),
          ...(label.sscc
            ? [`SSCC: ${label.sscc}`]
            : []),
        ].join("\n");

      case "pdf":
      case "png":
      case "svg":
        return JSON.stringify({
          labelNumber:
            label.labelNumber,
          type: label.type,
          barcodeValue:
            label.barcodeValue,
          sscc: label.sscc,
          format: label.format,
        });
    }
  }

  private generateLabelNumber(): string {
    const date = this.now()
      .slice(0, 10)
      .replaceAll("-", "");

    const sequence = String(
      this.sequence(),
    ).padStart(6, "0");

    return `ETK-${date}-${sequence}`;
  }
}
