use super::security;
use crate::{VncError, VncVersion};
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt};

#[allow(dead_code)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub(super) enum SecurityType {
    Invalid = 0,
    None = 1,
    VncAuth = 2,
    RA2 = 5,
    RA2ne = 6,
    Tight = 16,
    Ultra = 17,
    Tls = 18,
    VeNCrypt = 19,
    GtkVncSasl = 20,
    Md5Hash = 21,
    ColinDeanXvp = 22,
    AppleDh = 30,
}

impl TryFrom<u8> for SecurityType {
    type Error = VncError;
    fn try_from(num: u8) -> Result<Self, Self::Error> {
        match num {
            0 | 1 | 2 | 5 | 6 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 30 => {
                Ok(unsafe { std::mem::transmute::<u8, SecurityType>(num) })
            }
            invalid => Err(VncError::InvalidSecurityTyep(invalid)),
        }
    }
}

impl From<SecurityType> for u8 {
    fn from(e: SecurityType) -> Self {
        e as u8
    }
}

impl SecurityType {
    pub(super) async fn read<S>(reader: &mut S, version: &VncVersion) -> Result<Vec<Self>, VncError>
    where
        S: AsyncRead + Unpin,
    {
        match version {
            VncVersion::RFB33 => {
                let security_type = reader.read_u32().await?;
                if security_type == SecurityType::Invalid as u32 {
                    let _ = reader.read_u32().await?;
                    let mut err_msg = String::new();
                    reader.read_to_string(&mut err_msg).await?;
                    return Err(VncError::General(err_msg));
                }
                // In RFB 3.3 the server dictates a single u32 security type.
                // Report out-of-range values (e.g. legacy UltraVNC MS-Logon
                // 0xfffffffa) instead of truncating them to a bogus u8 id.
                if security_type > u8::MAX as u32 {
                    return Err(VncError::General(format!(
                        "Server requires an unsupported security type: {security_type}"
                    )));
                }
                let security_type = (security_type as u8).try_into()?;
                Ok(vec![security_type])
            }
            _ => {
                // +--------------------------+-------------+--------------------------+
                // | No. of bytes             | Type        | Description              |
                // |                          | [Value]     |                          |
                // +--------------------------+-------------+--------------------------+
                // | 1                        | U8          | number-of-security-types |
                // | number-of-security-types | U8 array    | security-types           |
                // +--------------------------+-------------+--------------------------+
                let num = reader.read_u8().await?;

                if num == 0 {
                    let _ = reader.read_u32().await?;
                    let mut err_msg = String::new();
                    reader.read_to_string(&mut err_msg).await?;
                    return Err(VncError::General(err_msg));
                }
                let mut sec_types = vec![];
                let mut unknown_types = vec![];
                for _ in 0..num {
                    let sec_type = reader.read_u8().await?;
                    match SecurityType::try_from(sec_type) {
                        Ok(sec_type) => sec_types.push(sec_type),
                        // Servers may advertise proprietary security types
                        // (e.g. UltraVNC MS-Logon / SecureVNC plugin ids)
                        // alongside standard ones; skip them and negotiate
                        // with any mutually supported type.
                        Err(_) => unknown_types.push(sec_type),
                    }
                }
                if sec_types.is_empty() {
                    return Err(VncError::General(format!(
                        "Server offered no supported security type: {unknown_types:?}"
                    )));
                }
                tracing::trace!(
                    "Server supported security type: {:?}, skipped unknown: {:?}",
                    sec_types,
                    unknown_types
                );
                Ok(sec_types)
            }
        }
    }

    pub(super) async fn write<S>(&self, writer: &mut S) -> Result<(), VncError>
    where
        S: AsyncWrite + Unpin,
    {
        writer.write_all(&[(*self).into()]).await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn skips_unknown_security_types() {
        // UltraVNC advertises proprietary types (e.g. 117) alongside VncAuth.
        let mut stream: &[u8] = &[2, 117, 2];
        let types = SecurityType::read(&mut stream, &VncVersion::RFB38)
            .await
            .unwrap();
        assert_eq!(types, vec![SecurityType::VncAuth]);
    }

    #[tokio::test]
    async fn errors_when_no_supported_security_type() {
        let mut stream: &[u8] = &[2, 115, 117];
        let err = SecurityType::read(&mut stream, &VncVersion::RFB38)
            .await
            .unwrap_err();
        assert!(err.to_string().contains("[115, 117]"), "{err}");
    }

    #[tokio::test]
    async fn rfb33_reports_out_of_range_security_type() {
        // Legacy UltraVNC MS-Logon (pre-RFB3.8) sends 0xfffffffa; it must not
        // be truncated to a bogus u8 id.
        let mut stream: &[u8] = &0xfffffffa_u32.to_be_bytes();
        let err = SecurityType::read(&mut stream, &VncVersion::RFB33)
            .await
            .unwrap_err();
        assert!(err.to_string().contains("4294967290"), "{err}");
    }

    #[tokio::test]
    async fn rfb33_accepts_vnc_auth() {
        let mut stream: &[u8] = &2_u32.to_be_bytes();
        let types = SecurityType::read(&mut stream, &VncVersion::RFB33)
            .await
            .unwrap();
        assert_eq!(types, vec![SecurityType::VncAuth]);
    }
}

#[allow(dead_code)]
#[repr(u32)]
pub(super) enum AuthResult {
    Ok = 0,
    Failed = 1,
}

impl From<u32> for AuthResult {
    fn from(num: u32) -> Self {
        unsafe { std::mem::transmute(num) }
    }
}

impl From<AuthResult> for u32 {
    fn from(e: AuthResult) -> Self {
        e as u32
    }
}

pub(super) struct AuthHelper {
    challenge: [u8; 16],
    key: [u8; 8],
}

impl AuthHelper {
    pub(super) async fn read<S>(reader: &mut S, credential: &str) -> Result<Self, VncError>
    where
        S: AsyncRead + Unpin,
    {
        let mut challenge = [0; 16];
        reader.read_exact(&mut challenge).await?;

        let credential_len = credential.len();
        let mut key = [0u8; 8];
        for (i, key_i) in key.iter_mut().enumerate() {
            let c = if i < credential_len {
                credential.as_bytes()[i]
            } else {
                0
            };
            let mut cs = 0u8;
            for j in 0..8 {
                cs |= ((c >> j) & 1) << (7 - j)
            }
            *key_i = cs;
        }

        Ok(Self { challenge, key })
    }

    pub(super) async fn write<S>(&self, writer: &mut S) -> Result<(), VncError>
    where
        S: AsyncWrite + Unpin,
    {
        let encrypted = security::des::encrypt(&self.challenge, &self.key);
        writer.write_all(&encrypted).await?;
        Ok(())
    }

    pub(super) async fn finish<S>(self, reader: &mut S) -> Result<AuthResult, VncError>
    where
        S: AsyncRead + AsyncWrite + Unpin,
    {
        let result = reader.read_u32().await?;
        Ok(result.into())
    }
}
