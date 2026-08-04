export const BARCODE_TYPES = [
  "ean13",
  "ean8",
  "upca",
  "upce",
  "code128",
  "code39",
  "itf14",
  "qr",
  "internal",
] as const;

export type BarcodeType = (typeof BARCODE_TYPES)[number];

export const BARCODE_TYPE_LABELS: Record<BarcodeType, string> = {
  ean13: "EAN-13",
  ean8: "EAN-8",
  upca: "UPC-A",
  upce: "UPC-E",
  code128: "Code 128",
  code39: "Code 39",
  itf14: "ITF-14",
  qr: "QR Kod",
  internal: "Dahili Barkod",
};

export function isBarcodeType(
  value: unknown,
): value is BarcodeType {
  return (
    typeof value === "string" &&
    BARCODE_TYPES.includes(value as BarcodeType)
  );
}
