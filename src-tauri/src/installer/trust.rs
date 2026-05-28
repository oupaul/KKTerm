// Minisign / Ed25519 verification for the Installer Helper remote catalog.
//
// The public key is compiled into the binary; the signature is verified
// against the raw catalog JSON bytes before any parsing. Rotating the key
// requires a KKTerm release (see ADR 0007 "Rotating the signing key").
//
// The constant below is a *placeholder* until the real keypair is generated
// via `minisign -G`. While it stays as the placeholder, every catalog fetch
// fails signature verification and the app falls back to the cached
// catalog (or shows an empty installer module on first run). This is the
// intended safe default — no catalog ever reaches the parser before a real
// key is shipped.

use minisign_verify::{PublicKey, Signature};

/// Real key replaces this in the same release that ships any catalog.
/// Format: the contents of the `minisign.pub` file (single line, base64).
pub const INSTALLER_CATALOG_PUBKEY: &str =
    "RWQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

#[derive(Debug)]
pub enum TrustError {
    PubkeyNotConfigured,
    InvalidPubkey(String),
    InvalidSignature(String),
    VerifyFailed(String),
}

impl std::fmt::Display for TrustError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::PubkeyNotConfigured => write!(
                f,
                "installer catalog public key not configured in this build",
            ),
            Self::InvalidPubkey(msg) => {
                write!(f, "installer catalog public key is malformed: {msg}")
            }
            Self::InvalidSignature(msg) => {
                write!(f, "installer catalog signature is malformed: {msg}")
            }
            Self::VerifyFailed(msg) => {
                write!(f, "installer catalog signature verification failed: {msg}")
            }
        }
    }
}

impl std::error::Error for TrustError {}

fn is_placeholder_pubkey() -> bool {
    INSTALLER_CATALOG_PUBKEY
        .trim_end_matches('A')
        .trim_start_matches("RWQ")
        .is_empty()
}

/// Verify a minisign signature `sig_bytes` over `catalog_bytes` using the
/// embedded public key. Returns `Ok(())` on success. Callers must not parse
/// `catalog_bytes` as JSON unless this returns `Ok`.
pub fn verify_catalog_bytes(
    catalog_bytes: &[u8],
    sig_bytes: &[u8],
) -> Result<(), TrustError> {
    if is_placeholder_pubkey() {
        return Err(TrustError::PubkeyNotConfigured);
    }

    let pk = PublicKey::decode(INSTALLER_CATALOG_PUBKEY)
        .map_err(|e| TrustError::InvalidPubkey(e.to_string()))?;

    let sig_str =
        std::str::from_utf8(sig_bytes).map_err(|_| {
            TrustError::InvalidSignature("signature file is not UTF-8".into())
        })?;
    let sig = Signature::decode(sig_str)
        .map_err(|e| TrustError::InvalidSignature(e.to_string()))?;

    pk.verify(catalog_bytes, &sig, /*allow_legacy=*/ false)
        .map_err(|e| TrustError::VerifyFailed(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn placeholder_pubkey_rejects_anything() {
        let result = verify_catalog_bytes(b"{}", b"untrusted comment: x\nRUS...\n");
        assert!(matches!(result, Err(TrustError::PubkeyNotConfigured)));
    }
}
