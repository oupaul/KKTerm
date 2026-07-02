use std::borrow::Cow;

use ironrdp_core::{Decode, Encode, WriteBuf, decode, encode_vec};
use ironrdp_pdu::rdp;
use ironrdp_pdu::rdp::headers::{BASIC_SECURITY_HEADER_SIZE, BasicSecurityHeaderFlags, ServerDeactivateAll};
use ironrdp_pdu::rdp::multitransport::MultitransportRequestPdu;
use ironrdp_pdu::x224::X224;

use crate::{ConnectorError, ConnectorErrorExt as _, ConnectorResult, reason_err};

pub fn encode_send_data_request<T>(
    initiator_id: u16,
    channel_id: u16,
    user_msg: &T,
    buf: &mut WriteBuf,
) -> ConnectorResult<usize>
where
    T: Encode,
{
    let user_data = encode_vec(user_msg).map_err(ConnectorError::encode)?;

    let pdu = ironrdp_pdu::mcs::SendDataRequest {
        initiator_id,
        channel_id,
        user_data: Cow::Owned(user_data),
    };

    let written = ironrdp_core::encode_buf(&X224(pdu), buf).map_err(ConnectorError::encode)?;

    Ok(written)
}

#[derive(Debug, Clone, Copy)]
pub struct SendDataIndicationCtx<'a> {
    pub initiator_id: u16,
    pub channel_id: u16,
    pub user_data: &'a [u8],
}

impl<'a> SendDataIndicationCtx<'a> {
    pub fn decode_user_data<'de, T>(&self) -> ConnectorResult<T>
    where
        T: Decode<'de>,
        'a: 'de,
    {
        let msg = decode::<T>(self.user_data).map_err(ConnectorError::decode)?;
        Ok(msg)
    }
}

pub fn decode_send_data_indication(src: &[u8]) -> ConnectorResult<SendDataIndicationCtx<'_>> {
    use ironrdp_pdu::mcs::McsMessage;

    let mcs_msg = decode::<X224<McsMessage<'_>>>(src).map_err(ConnectorError::decode)?;

    match mcs_msg.0 {
        McsMessage::SendDataIndication(msg) => {
            let Cow::Borrowed(user_data) = msg.user_data else {
                unreachable!()
            };

            Ok(SendDataIndicationCtx {
                initiator_id: msg.initiator_id,
                channel_id: msg.channel_id,
                user_data,
            })
        }
        McsMessage::DisconnectProviderUltimatum(msg) => Err(reason_err!(
            "decode_send_data_indication",
            "received disconnect provider ultimatum: {:?}",
            msg.reason
        )),
        _ => Err(reason_err!(
            "decode_send_data_indication",
            "unexpected MCS message: {}",
            ironrdp_core::name(&mcs_msg)
        )),
    }
}

pub fn encode_share_control(
    initiator_id: u16,
    channel_id: u16,
    share_id: u32,
    pdu: rdp::headers::ShareControlPdu,
    buf: &mut WriteBuf,
) -> ConnectorResult<usize> {
    let pdu_source = initiator_id;

    let share_control_header = rdp::headers::ShareControlHeader {
        share_control_pdu: pdu,
        pdu_source,
        share_id,
    };

    encode_send_data_request(initiator_id, channel_id, &share_control_header, buf)
}

#[derive(Debug, Clone)]
pub struct ShareControlCtx {
    pub initiator_id: u16,
    pub channel_id: u16,
    pub share_id: u32,
    pub pdu_source: u16,
    pub pdu: rdp::headers::ShareControlPdu,
}

pub fn decode_share_control(ctx: SendDataIndicationCtx<'_>) -> ConnectorResult<ShareControlCtx> {
    // Some legacy Windows RDP hosts pack multiple Share Control PDUs into a single
    // MCS Send Data Indication. `ShareControlHeader::decode` does not bound itself
    // to the header's own `totalLength` field before decoding the inner PDU, and
    // several `ShareDataPdu` variants (Update, Pointer, PlaySound, ...) greedily
    // consume every remaining byte of whatever cursor they are given
    // (`src.remaining()`). Handing it the *entire* user_data buffer therefore makes
    // the first (often small) PDU swallow the bytes belonging to the next one,
    // which then fails ironrdp-pdu's post-hoc consistency check with
    // "not enough bytes: received <totalLength>, expected <actual decoded size>".
    //
    // Peek totalLength (first 2 bytes, LE u16, per [MS-RDPBCGR] 2.2.8.1.1.1.1) and
    // slice the buffer down to just this PDU before decoding, so it only ever
    // consumes its own bytes. Any additional PDU(s) packed after it in the same
    // frame are intentionally left unprocessed: the outer active-stage loop (in
    // ironrdp-session, not vendored here) reads and decodes one Share Control PDU
    // per call, so there is no loop point available here to recurse into the
    // remainder. Those secondary PDUs are historically minor bookkeeping traffic on
    // these legacy hosts, not required for the connection or screen updates to work.
    let user_data = ctx.user_data;
    let sliced = match user_data.get(0..2) {
        Some(len_bytes) => {
            let declared_len = usize::from(u16::from_le_bytes([len_bytes[0], len_bytes[1]]));
            if declared_len >= 10 && declared_len <= user_data.len() {
                &user_data[..declared_len]
            } else {
                user_data
            }
        }
        None => user_data,
    };

    let user_msg = decode::<rdp::headers::ShareControlHeader>(sliced).map_err(ConnectorError::decode)?;

    Ok(ShareControlCtx {
        initiator_id: ctx.initiator_id,
        channel_id: ctx.channel_id,
        share_id: user_msg.share_id,
        pdu_source: user_msg.pdu_source,
        pdu: user_msg.share_control_pdu,
    })
}

pub fn encode_share_data(
    initiator_id: u16,
    channel_id: u16,
    share_id: u32,
    pdu: rdp::headers::ShareDataPdu,
    buf: &mut WriteBuf,
) -> ConnectorResult<usize> {
    let share_data_header = rdp::headers::ShareDataHeader {
        share_data_pdu: pdu,
        stream_priority: rdp::headers::StreamPriority::Medium,
        compression_flags: rdp::headers::CompressionFlags::empty(),
        compression_type: rdp::client_info::CompressionType::K8, // ignored if CompressionFlags::empty()
    };

    let share_control_pdu = rdp::headers::ShareControlPdu::Data(share_data_header);

    encode_share_control(initiator_id, channel_id, share_id, share_control_pdu, buf)
}

#[derive(Debug, Clone)]
pub struct ShareDataCtx {
    pub initiator_id: u16,
    pub channel_id: u16,
    pub share_id: u32,
    pub pdu_source: u16,
    pub pdu: rdp::headers::ShareDataPdu,
}

pub fn decode_share_data(ctx: SendDataIndicationCtx<'_>) -> ConnectorResult<ShareDataCtx> {
    let ctx = decode_share_control(ctx)?;

    let rdp::headers::ShareControlPdu::Data(share_data_header) = ctx.pdu else {
        return Err(reason_err!(
            "decode_share_data",
            "received unexpected Share Control PDU: got {} (expected Data PDU)",
            ctx.pdu.as_short_name(),
        ));
    };

    Ok(ShareDataCtx {
        initiator_id: ctx.initiator_id,
        channel_id: ctx.channel_id,
        share_id: ctx.share_id,
        pdu_source: ctx.pdu_source,
        pdu: share_data_header.share_data_pdu,
    })
}

pub enum IoChannelPdu {
    Data(ShareDataCtx),
    DeactivateAll(ServerDeactivateAll),
    /// Server Initiate Multitransport Request PDU.
    ///
    /// Received when the server wants the client to establish a sideband UDP transport.
    MultitransportRequest(MultitransportRequestPdu),
}

pub fn decode_io_channel(ctx: SendDataIndicationCtx<'_>) -> ConnectorResult<IoChannelPdu> {
    // Multitransport PDUs use BasicSecurityHeader (flags:u16, flagsHi:u16) instead
    // of the ShareControlHeader (totalLength:u16, pduType:u16, ...) used by all
    // other IO channel PDUs. We discriminate by checking flagsHi == 0 (ShareControl
    // has pduType there, which is always non-zero) and requiring flags to be a valid
    // BasicSecurityHeaderFlags combination.
    if ctx.user_data.len() >= BASIC_SECURITY_HEADER_SIZE {
        let flags_raw = u16::from_le_bytes([ctx.user_data[0], ctx.user_data[1]]);
        let flags_hi = u16::from_le_bytes([ctx.user_data[2], ctx.user_data[3]]);

        if flags_hi == 0 {
            if let Some(flags) = BasicSecurityHeaderFlags::from_bits(flags_raw) {
                if flags.contains(BasicSecurityHeaderFlags::TRANSPORT_REQ) {
                    if let Ok(pdu) = decode::<MultitransportRequestPdu>(ctx.user_data) {
                        return Ok(IoChannelPdu::MultitransportRequest(pdu));
                    }
                }
            }
        }
    }

    let ctx = decode_share_control(ctx)?;

    match ctx.pdu {
        rdp::headers::ShareControlPdu::ServerDeactivateAll(deactivate_all) => {
            Ok(IoChannelPdu::DeactivateAll(deactivate_all))
        }
        rdp::headers::ShareControlPdu::Data(share_data_header) => {
            let share_data_ctx = ShareDataCtx {
                initiator_id: ctx.initiator_id,
                channel_id: ctx.channel_id,
                share_id: ctx.share_id,
                pdu_source: ctx.pdu_source,
                pdu: share_data_header.share_data_pdu,
            };

            Ok(IoChannelPdu::Data(share_data_ctx))
        }
        other => Err(reason_err!(
            "decode_io_channel",
            "received unexpected Share Control PDU: got {} (expected Data PDU or Server Deactivate All PDU)",
            other.as_short_name(),
        )),
    }
}
