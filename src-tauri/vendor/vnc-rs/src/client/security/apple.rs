//! Apple Remote Desktop (RFB security type 30) authentication.
//!
//! Diffie-Hellman key agreement, MD5-derived AES-128 key, and an AES-128-ECB
//! encrypted 128-byte credential block (username in [0,64), password in
//! [64,128), each NUL-terminated and random-padded). Matches TigerVNC/noVNC
//! "ard" auth.

use aes::Aes128;
use aes::cipher::{BlockEncrypt, KeyInit, generic_array::GenericArray};

/// Left-pad (or left-truncate) `bytes` to exactly `len` bytes, big-endian.
#[cfg(test)]
fn left_pad(bytes: &[u8], len: usize) -> Vec<u8> {
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

#[cfg(test)]
mod tests {
    use super::*;
    use md5::{Digest, Md5};

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
