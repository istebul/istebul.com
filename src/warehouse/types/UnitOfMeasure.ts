export const UNITS_OF_MEASURE = [
  "piece",
  "box",
  "case",
  "package",
  "pallet",
  "kilogram",
  "gram",
  "liter",
  "milliliter",
  "meter",
  "square_meter",
  "cubic_meter",
] as const;

export type UnitOfMeasure = (typeof UNITS_OF_MEASURE)[number];

export const UNIT_OF_MEASURE_LABELS: Record<
  UnitOfMeasure,
  string
> = {
  piece: "Adet",
  box: "Kutu",
  case: "Koli",
  package: "Paket",
  pallet: "Palet",
  kilogram: "Kilogram",
  gram: "Gram",
  liter: "Litre",
  milliliter: "Mililitre",
  meter: "Metre",
  square_meter: "Metrekare",
  cubic_meter: "Metreküp",
};

export function isUnitOfMeasure(
  value: unknown,
): value is UnitOfMeasure {
  return (
    typeof value === "string" &&
    UNITS_OF_MEASURE.includes(value as UnitOfMeasure)
  );
}
