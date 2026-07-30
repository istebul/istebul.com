/**
 * Node ESM resolve hook for the Business TypeScript tests.
 *
 * Supports:
 * - extensionless relative imports: ../module → ../module.ts
 * - directory barrel imports: ../studio → ../studio/index.ts
 */
export async function resolve(specifier, context, nextResolve) {
  const isRelative =
    specifier.startsWith('./') ||
    specifier.startsWith('../');

  const hasExtension =
    /\.(ts|tsx|js|mjs|cjs|json|node)$/i.test(specifier);

  if (isRelative && !hasExtension) {
    try {
      return await nextResolve(`${specifier}.ts`, context);
    } catch {
      // Try a directory barrel.
    }

    try {
      return await nextResolve(
        `${specifier.replace(/\/$/, '')}/index.ts`,
        context
      );
    } catch {
      // Fall through to Node's default resolution.
    }
  }

  return nextResolve(specifier, context);
}
