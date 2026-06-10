//! Apple Remote Desktop (RFB security type 30) authentication.
//!
//! Diffie-Hellman key agreement, MD5-derived AES-128 key, and an AES-128-ECB
//! encrypted 128-byte credential block (username in [0,64), password in
//! [64,128), each NUL-terminated and random-padded). Matches TigerVNC/noVNC
//! "ard" auth.

use aes::Aes128;
use aes::cipher::{BlockEncrypt, KeyInit, generic_array::GenericArray};
use md5::{Digest, Md5};
use num_bigint::BigUint;
use rand::RngCore;
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt};

use crate::VncError;

/// Left-pad (or left-truncate) `bytes` to exactly `len` bytes, big-endian.
pub(crate) fn left_pad(bytes: &[u8], len: usize) -> Vec<u8> {
    if bytes.len() >= len {
        bytes[bytes.len() - len..].to_vec()
    } else {
        let mut out = vec![0u8; len];
        out[len - bytes.len()..].copy_from_slice(bytes);
        out
    }
}

/// Write `s` as a NUL-terminated C string into `buf`, leaving any trailing
/// bytes (already random-filled by the caller) untouched. Truncates `s` so the
/// NUL always fits.
pub(crate) fn write_cstr(buf: &mut [u8], s: &str) {
    let bytes = s.as_bytes();
    let n = bytes.len().min(buf.len().saturating_sub(1));
    buf[..n].copy_from_slice(&bytes[..n]);
    buf[n] = 0;
}

/// Build the 128-byte credential block from already-random `block`.
pub(crate) fn fill_credentials(block: &mut [u8; 128], username: &str, password: &str) {
    write_cstr(&mut block[0..64], username);
    write_cstr(&mut block[64..128], password);
}

/// AES-128-ECB encrypt each 16-byte block of `data` in place.
pub(crate) fn aes_ecb_encrypt(key: &[u8; 16], data: &mut [u8]) {
    let cipher = Aes128::new(GenericArray::from_slice(key));
    for block in data.chunks_exact_mut(16) {
        let mut ga = GenericArray::clone_from_slice(block);
        cipher.encrypt_block(&mut ga);
        block.copy_from_slice(&ga);
    }
}

/// Perform the Apple (security type 30) credential exchange on `stream`.
///
/// Reads the server DH parameters, derives the AES key, sends the encrypted
/// 128-byte credential block plus the client public key. Does NOT read the
/// SecurityResult — the connector reads it afterwards, like the VncAuth path.
pub(crate) async fn authenticate<S>(
    stream: &mut S,
    username: &str,
    password: &str,
) -> Result<(), VncError>
where
    S: AsyncRead + AsyncWrite + Unpin,
{
    // 1. Server DH params: generator(u16), keyLength(u16), prime[..], serverPub[..].
    let generator = stream.read_u16().await?;
    let key_len = stream.read_u16().await? as usize;
    if key_len == 0 || key_len > 1024 {
        return Err(VncError::General(format!("invalid ARD key length {key_len}")));
    }
    let mut prime = vec![0u8; key_len];
    stream.read_exact(&mut prime).await?;
    let mut server_pub = vec![0u8; key_len];
    stream.read_exact(&mut server_pub).await?;

    // 2. Diffie-Hellman.
    let prime_bn = BigUint::from_bytes_be(&prime);
    let generator_bn = BigUint::from(generator);
    let mut private_bytes = vec![0u8; key_len];
    rand::rng().fill_bytes(&mut private_bytes);
    let private_bn = BigUint::from_bytes_be(&private_bytes);

    let client_pub = generator_bn.modpow(&private_bn, &prime_bn);
    let shared = BigUint::from_bytes_be(&server_pub).modpow(&private_bn, &prime_bn);
    let client_pub_bytes = left_pad(&client_pub.to_bytes_be(), key_len);
    let shared_bytes = left_pad(&shared.to_bytes_be(), key_len);

    // 3. AES-128 key = MD5(shared secret).
    let mut hasher = Md5::new();
    hasher.update(&shared_bytes);
    let digest = hasher.finalize();
    let mut aes_key = [0u8; 16];
    aes_key.copy_from_slice(&digest);

    // 4. 128-byte credential block (random-padded), AES-128-ECB encrypted.
    let mut credentials = [0u8; 128];
    rand::rng().fill_bytes(&mut credentials);
    fill_credentials(&mut credentials, username, password);
    aes_ecb_encrypt(&aes_key, &mut credentials);

    // 5. Send ciphertext + client public key.
    stream.write_all(&credentials).await?;
    stream.write_all(&client_pub_bytes).await?;
    stream.flush().await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn left_pad_pads_and_truncates() {
        assert_eq!(left_pad(&[0x01, 0x02], 4), vec![0, 0, 0x01, 0x02]);
        assert_eq!(left_pad(&[0x01, 0x02, 0x03], 2), vec![0x02, 0x03]);
        assert_eq!(left_pad(&[0x01, 0x02], 2), vec![0x01, 0x02]);
    }

    #[test]
    fn credentials_place_username_and_password_with_nul() {
        let mut block = [0xAAu8; 128];
        fill_credentials(&mut block, "bob", "secret");
        assert_eq!(&block[0..3], b"bob");
        assert_eq!(block[3], 0);
        assert_eq!(block[4], 0xAA); // random pad preserved
        assert_eq!(&block[64..70], b"secret");
        assert_eq!(block[70], 0);
    }

    #[test]
    fn aes_ecb_matches_known_answer() {
        // FIPS-197 AES-128 test vector.
        let key = [
            0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d,
            0x0e, 0x0f,
        ];
        let mut data = [
            0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd,
            0xee, 0xff,
        ];
        aes_ecb_encrypt(&key, &mut data);
        assert_eq!(
            data,
            [
                0x69, 0xc4, 0xe0, 0xd8, 0x6a, 0x7b, 0x04, 0x30, 0xd8, 0xcd, 0xb7, 0x80, 0x70, 0xb4,
                0xc5, 0x5a
            ]
        );
    }

    #[test]
    fn md5_derives_aes_key() {
        let mut hasher = Md5::new();
        hasher.update(b"abc");
        let key = hasher.finalize();
        assert_eq!(
            key.as_slice(),
            [
                0x90, 0x01, 0x50, 0x98, 0x3c, 0xd2, 0x4f, 0xb0, 0xd6, 0x96, 0x3f, 0x7d, 0x28, 0xe1,
                0x7f, 0x72
            ]
        );
    }
}
