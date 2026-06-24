# russh 0.61 / IronRDP Patch Vendors

These vendored trees temporarily apply the downstream compatibility work from
Devolutions/IronRDP#1363 so KKTerm can use `russh` 0.61.2 while keeping the
macOS/Linux IronRDP canvas client available.

- `picky-rs-russh-061`: `fluxterm/picky-rs`
  `01b584fbd60ccd0f579f4f20b5f4d49ca3e457e3`
- `sspi-rs-russh-061`: `fluxterm/sspi-rs`
  `7aae095957cd56075d68be56cfeca15610d16dce`
- `ironrdp-russh-061`: `fluxterm/IronRDP`
  `1c3ce7aaf8f90f999d6f2e15be1d7869261c9f5e`

Remove these path patches when IronRDP, sspi-rs, and picky-rs publish an aligned
RustCrypto/Dalek dependency line that resolves with `russh` 0.61.x or newer.
