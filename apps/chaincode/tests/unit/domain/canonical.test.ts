import { describe, expect, test } from "bun:test";
import { canonicalHashHex, canonicalSerialize, GENESIS_HASH } from "../../../src/domain/canonical";

describe("canonicalSerialize", () => {
  test("sorts top-level keys alphabetically", () => {
    expect(canonicalSerialize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  test("sorts nested object keys alphabetically (recursive)", () => {
    expect(canonicalSerialize({ z: { y: 1, x: 2 }, a: 3 })).toBe('{"a":3,"z":{"x":2,"y":1}}');
  });

  test("emits no whitespace", () => {
    expect(canonicalSerialize({ a: [1, 2, 3], b: "x" })).toBe('{"a":[1,2,3],"b":"x"}');
  });

  test("is order-stable across input orderings (key invariant for hash chain)", () => {
    const a = canonicalSerialize({ foo: 1, bar: 2, baz: { qux: 3, quux: 4 } });
    const b = canonicalSerialize({ baz: { quux: 4, qux: 3 }, bar: 2, foo: 1 });
    expect(a).toBe(b);
  });
});

describe("canonicalHashHex", () => {
  test("returns a 0x-prefixed 64-char hex (66 total)", () => {
    const hash = canonicalHashHex({ hello: "world" });
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  test("same input → same hash; different input → different hash", () => {
    expect(canonicalHashHex({ a: 1 })).toBe(canonicalHashHex({ a: 1 }));
    expect(canonicalHashHex({ a: 1 })).not.toBe(canonicalHashHex({ a: 2 }));
  });
});

describe("GENESIS_HASH", () => {
  test("is 0x followed by 32 zero bytes", () => {
    expect(GENESIS_HASH).toBe(`0x${"00".repeat(32)}`);
    expect(GENESIS_HASH).toMatch(/^0x0{64}$/);
  });
});
