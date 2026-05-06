/**
 * Side-effect entry that registers `@consolidados/results` value-globals
 * (`Ok`, `Err`, `Some`, `None`, `match`) on `globalThis`.
 *
 * Import once in the runtime entry point of each consumer app:
 *
 *   // apps/chaincode/src/index.ts
 *   import "@gala-audit-trail/result-helpers/globals";
 *
 *   // apps/frontend/app/layout.tsx (first server import)
 *   import "@gala-audit-trail/result-helpers/globals";
 *
 * For type-side narrowing of `Result<T, E>` and `Option<T>` as ambient types,
 * pair this with `"types": ["@gala-audit-trail/result-helpers/globals-types"]`
 * in the consumer's tsconfig (see `globals-types.d.ts`).
 */
import "@consolidados/results";
