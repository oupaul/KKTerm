//! macOS RDP client built on IronRDP. Decodes the RDP framebuffer to RGBA and
//! emits `rdp-canvas-event`s for the workspace canvas. Windows uses the native
//! ActiveX path in `rdp.rs` instead; this module is compiled only off-Windows.
//!
//! # Pinned IronRDP connect sequence (verified against ironrdp 0.15 / ironrdp-tokio 0.9)
//!
//! ## Dependencies used
//! - `ironrdp = "0.15"` with features `["connector", "session", "graphics", "pdu", "input"]`
//! - `ironrdp-tokio = "0.9"` (re-exports all of `ironrdp_async` via `pub use ironrdp_async::*`)
//! - `tokio-rustls = "0.26"` (for TLS upgrade — we implement the upgrade directly, no ironrdp-tls)
//! - `sspi = "0.21"` (for CredSSP/NTLM)
//!
//! ## Key types
//! ```text
//! // TokioFramed<S> = Framed<TokioStream<S>>
//! // Framed::new(stream: S::InnerStream) -> Self
//! // TokioStream<S>::InnerStream = S  =>  TokioFramed::new(tcp_stream) works directly
//! ironrdp_tokio::TokioFramed<tokio::net::TcpStream>
//! ironrdp_tokio::TokioFramed<Box<dyn AsyncReadWrite + Unpin + Send + Sync>>
//! ironrdp::connector::ClientConnector  // config: connector::Config, client_addr: SocketAddr
//! ironrdp::connector::ConnectionResult  // returned by connect_finalize on success
//! ```
//!
//! ## Connect sequence (exact function paths, all from ironrdp_tokio namespace)
//! ```text
//! // Step 1: TCP connect + create framed
//! let stream = tokio::net::TcpStream::connect((host, port)).await?;
//! let client_addr = stream.local_addr()?;
//! let mut framed = ironrdp_tokio::TokioFramed::new(stream);
//!
//! // Step 2: Create connector
//! let mut connector = ironrdp::connector::ClientConnector::new(config, client_addr);
//!
//! // Step 3: Begin connection (negotiation / NLA pre-TLS handshake)
//! // Signature: pub async fn connect_begin<S>(framed: &mut Framed<S>, connector: &mut ClientConnector)
//! //            -> ConnectorResult<ShouldUpgrade>
//! //            where S: Sync + FramedRead + FramedWrite
//! let should_upgrade = ironrdp_tokio::connect_begin(&mut framed, &mut connector).await?;
//!
//! // Step 4: Extract inner TCP stream + any leftover bytes
//! // Framed::into_inner(self) -> (S::InnerStream, BytesMut)
//! // Here S = TokioStream<TcpStream>, so InnerStream = TcpStream
//! let (initial_stream, leftover_bytes) = framed.into_inner();
//!
//! // Step 5: TLS upgrade via tokio-rustls (no-verify config for RDP, matching ironrdp-tls pattern)
//! // Build a rustls ClientConfig with a NoCertificateVerification verifier (required for RDP).
//! // Disable TLS resumption (CredSSP does not support TLS session resumption).
//! // connect: tokio_rustls::TlsConnector::from(Arc::new(config)).connect(domain, stream).await?
//! // type: tokio_rustls::client::TlsStream<TcpStream>
//! let tls_stream: tokio_rustls::client::TlsStream<TcpStream> = /* TLS handshake */;
//!
//! // Step 6: Extract server public key (SubjectPublicKey bytes from peer cert SPKI)
//! // From tls_stream.get_ref().1.peer_certificates() -> &[CertificateDer<'_>]
//! // Take first cert, parse as x509_cert::Certificate (via x509_cert::der::Decode),
//! // then: cert.tbs_certificate.subject_public_key_info.subject_public_key.as_bytes()
//! // The connect_finalize parameter type is Vec<u8>.
//! let server_public_key: Vec<u8> = /* extract from tls_stream peer cert SPKI */;
//!
//! // Step 7: Mark as upgraded
//! // Signature: pub fn mark_as_upgraded(should_upgrade: ShouldUpgrade, connector: &mut ClientConnector)
//! //            -> Upgraded
//! let upgraded = ironrdp_tokio::mark_as_upgraded(should_upgrade, &mut connector);
//!
//! // Step 8: Create upgraded framed (box-erased TLS stream; reuse leftover bytes)
//! let erased: Box<dyn AsyncReadWrite + Unpin + Send + Sync> = Box::new(tls_stream);
//! let mut upgraded_framed = ironrdp_tokio::TokioFramed::new_with_leftover(erased, leftover_bytes);
//!
//! // Step 9: Finalize connection (CredSSP / capability negotiation)
//! // Signature: pub async fn connect_finalize<S, N>(
//! //     _: Upgraded,
//! //     connector: ClientConnector,         // consumed (not &mut)
//! //     framed: &mut Framed<S>,
//! //     network_client: &mut N,
//! //     server_name: ServerName,            // ironrdp::connector::ServerName (wraps &str / String)
//! //     server_public_key: Vec<u8>,
//! //     kerberos_config: Option<KerberosConfig>,
//! // ) -> ConnectorResult<ConnectionResult>
//! // where S: FramedRead + FramedWrite, N: NetworkClient
//! //
//! // NetworkClient trait (not dyn-compatible):
//! //   fn send(&mut self, request: &NetworkRequest) -> impl Future<Output=ConnectorResult<Vec<u8>>>
//! //
//! // For NTLM (username/password) there is NO Kerberos KDC round-trip, so a no-op NetworkClient
//! // is acceptable. A unit struct implementing NetworkClient that panics / returns error on send
//! // is sufficient. Pass kerberos_config = None.
//! //
//! // ironrdp_tokio::reqwest::ReqwestNetworkClient (requires "reqwest" feature on ironrdp-tokio)
//! // is the provided implementation but adds a large dep. A manual no-op struct works for NTLM.
//! let connection_result = ironrdp_tokio::connect_finalize(
//!     upgraded,
//!     connector,
//!     &mut upgraded_framed,
//!     &mut NoopNetworkClient,    // safe for NTLM; panics if Kerberos KDC round-trip is needed
//!     server_name.into(),
//!     server_public_key,
//!     None,                      // kerberos_config
//! ).await?;
//!
//! // Step 10: Active session loop
//! // ironrdp::session::ActiveStage::new(connection_result)
//! // upgraded_framed is now the session transport
//! ```
//!
//! ## NoopNetworkClient implementation sketch (for Task 4)
//! ```rust,ignore
//! struct NoopNetworkClient;
//! impl ironrdp_tokio::NetworkClient for NoopNetworkClient {
//!     async fn send(&mut self, _: &ironrdp_tokio::NetworkRequest) -> ironrdp_tokio::ConnectorResult<Vec<u8>> {
//!         Err(ironrdp::connector::general_err!("no KDC network client; use NTLM not Kerberos"))
//!     }
//! }
//! ```
//!
//! ## CredSSP / NTLM via sspi
//! The connector internally calls sspi for NTLMv2 when `ironrdp::connector::Config` is set up
//! with username/password credentials. The `sspi = "0.21"` dep provides the NTLM implementation.
//! No explicit sspi calls needed at the connect-sequence level; the connector drives it.

// Implemented in later tasks.
