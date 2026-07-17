/**
 * Node ESM resolve hook — extensionless relative imports → `.ts`
 * (Business package uses bundler resolution; Node strip-types needs this for tests.)
 */
export async function resolve(specifier, context, nextResolve) {
  if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    !/\.(ts|tsx|js|mjs|cjs|json|node)$/i.test(specifier)
  ) {
    try {
      return await nextResolve(`${specifier}.ts`, context);
    } catch {
      // fall through
    }
  }
  return nextResolve(specifier, context);
}
