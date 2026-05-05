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

# Run the off-chain verifier against a local session
cargo run -p audit-verifier --release -- verify \
  --session-id <uuid> \
  --chain-url http://localhost:8801
```

## TNT deployment (chaincode)

> Reproducible commands land here as the chaincode deploys to GalaChain TNT.

## Vercel deployment (frontend)

> Project setup, env vars, and the public URL land here once frontend is deployed.

## Off-chain verifier — public reproducibility

> Once a demo session is running on TNT, this section gets a one-line command a reviewer can run on their machine to reproduce the verification proof:
>
> ```bash
> cargo run -p audit-verifier --release -- verify \
>   --session-id <demo-session-uuid> \
>   --chain-url https://gateway-testnet.galachain.com/api
> ```
