/**
 * Normalize extension to `.ext` lowercase form.
 */
export function normalizeExtension(extension: string): string {
  const trimmed = extension.trim().toLowerCase();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
}

/**
 * Normalize MIME to lowercase trimmed.
 */
export function normalizeMimeType(mimeType: string): string {
  return mimeType.trim().toLowerCase();
}
