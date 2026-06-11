# Local patches to vnc-rs 0.5.3

Vendored from crates.io 0.5.3. Divergence from upstream:

1. `src/client/auth.rs` — added `SecurityType::AppleDh = 30` and accept `30` in `TryFrom<u8>`.
2. `src/client/connector.rs` — added `username: Option<String>` field + `set_username` builder; added an Apple-auth branch in the `Authenticate` state.
3. `src/client/security/apple.rs` — NEW: Apple Remote Desktop (security type 30) Diffie-Hellman + AES-128-ECB credential exchange.
4. `src/client/security/mod.rs` — registered the `apple` module.
5. `Cargo.toml` — added `num-bigint`, `md-5`, `aes`, `rand` for the Apple handshake.

To upgrade: re-apply these changes onto the new upstream version, or upstream type-30 support and drop the vendor copy.
