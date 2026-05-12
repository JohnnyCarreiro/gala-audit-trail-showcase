# Deployment

> Will be filled in as we deploy each component. Skeleton below establishes the shape.

## Local development

```bash
# Prerequisites
# - Bun ≥ 1.3, Node ≥ 22
# - Rust stable (≥ 1.80)
# - Docker (for GalaChain test network)

bun install
docker compose -f docker-compose.dev.yml up -d   # starts local Fabric network

# TS workspace
bun run typecheck
bun run lint
bun test

# Rust workspace
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace

# Run the off-chain verifier against a local session (file source)
cargo run -p audit-verifier --release -- verify \
  --session-id <uuid> \
  --source ./path/to/session-dir
```

## TNT deployment (chaincode)

> Reproducible commands land here as the chaincode deploys to GalaChain TNT.

## Vercel deployment (frontend)

> Project setup, env vars, and the public URL land here once frontend is deployed.

## Off-chain verifier — public reproducibility

The verifier ships with a **file-based source** today (HTTP source against the TNT gateway is deferred behind [OQ-03](./open-questions.md)). Drop `session.json`, `events.json`, and `signers.json` into a directory and run:

```bash
cargo run -p audit-verifier --release -- verify \
  --session-id <session-uuid> \
  --source ./path/to/session-dir
```

Exit `0` whenever a verdict is produced (Valid **or** Tampered) — Tampered is *the answer*, not a failure. Exit `1` only on structurally broken input.

## dto-signer (bonus) — demo invocation

`dto-signer` is the thinnest live demo of `dto-canon`'s reusability — a one-shot CLI that reads a DTO + private key from stdin and emits canonical bytes, signature, and the signer's public key. Use it to sanity-check what the chaincode would sign, or to generate a fixture for the off-chain verifier.

```bash
echo '{
  "dto": {
    "sessionId": "00000000-0000-4000-8000-000000000001",
    "payload": {"score": 42}
  },
  "privateKeyHex": "0101010101010101010101010101010101010101010101010101010101010101"
}' | cargo run -p dto-signer --release --quiet
```

Output:

```json
{
  "canonicalHex": "7b227061796c6f6164223a7b2273636f7265223a34327d2c2273657373696f6e4964223a2230303030303030302d303030302d343030302d383030302d303030303030303030303031227d",
  "signatureHex": "723dfb011f3b8c7bc2f1c8107ce11b4c1b83ef9f86fa1f71fbba7636ce6ccfc9384eea9dd00aefd5454c3cdfc6641b82e86ce0f02bcbdf2db9466ac3f54b0cd51b",
  "signerPubkey": "041b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f70beaf8f588b541507fed6a642c5ab42dfdf8120a7f639de5122d47a69a8e8d1"
}
```

`canonicalHex` is the bytes that get keccak'd before signing — equivalent to what `apps/chaincode/src/domain/canonical.ts` produces in the on-chain path (alphabetical keys, no whitespace, `signature`/`trace` stripped). `signatureHex` is 65 bytes `r || s || v` with `v = 27 + recid` (Ethereum convention).
