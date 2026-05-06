/// <reference path="../src/globals-types.d.ts" />

/**
 * Activates the package's own ambient `Result<T, E>` / `Option<T>` declarations
 * for the smoke test, without going through the `types` array (which can't
 * resolve self-references via Bun's isolated workspace install — there's no
 * top-level node_modules symlink until a consumer app declares the dep).
 *
 * Consumer apps (FEAT-003 chaincode, FEAT-005 frontend) won't need this file:
 * they configure `tsconfig.json` with
 *   "types": ["@gala-audit-trail/result-helpers/globals-types"]
 * which resolves cleanly via Bun's symlink once the apps declare the workspace dep.
 */
