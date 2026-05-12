/**
 * G7.1 smoke test — validates that `@gala-chain/test` `fixture()` runs under
 * `bun:test`. If this passes, the full integration suite is viable on bun;
 * if not, we fall back to jest (see `docs/open-questions.md` OQ-04).
 */
import { describe, expect, test } from "bun:test";
import { randomUser } from "@gala-chain/test/lib/src/data/users";
// Deep import: the package barrel re-exports `./e2e` which pulls
// `@gala-chain/client` → `fabric-ca-client` (a Fabric network runtime dep we
// don't ship). The `unit/` subpath is self-contained.
import { fixture } from "@gala-chain/test/lib/src/unit";
import { AuditTrailContract } from "../../src/contracts/audit-trail-contract";

describe("FEAT-004 G7.1 smoke — TestChaincode/fixture under bun:test", () => {
  test("fixture() builds and exposes contract + ctx", () => {
    const studio = randomUser("client|studio");
    const f = fixture(AuditTrailContract).callingUser(studio);

    expect(f.contract).toBeDefined();
    expect(f.ctx).toBeDefined();
    expect(typeof f.contract.InitiateSession).toBe("function");
  });
});
