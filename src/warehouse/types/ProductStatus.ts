export const PRODUCT_STATUSES = [
  "draft",
  "active",
  "inactive",
  "discontinued",
  "archived",
] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "Taslak",
  active: "Aktif",
  inactive: "Pasif",
  discontinued: "Üretimi Sonlandırıldı",
  archived: "Arşivlendi",
};

export function isProductStatus(
  value: unknown,
): value is ProductStatus {
  return (
    typeof value === "string" &&
    PRODUCT_STATUSES.includes(value as ProductStatus)
  );
}
