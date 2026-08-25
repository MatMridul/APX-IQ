"""
APX IQ — Universal Packet Decoder
==================================

Decodes binary F1 game UDP packets across all supported game versions:
  - F1 2020 (Format 2020)
  - F1 2021 (Format 2021)
  - F1 22   (Format 2022)
  - F1 23   (Format 2023)
  - F1 24   (Format 2024)
  - F1 25   (Format 2025)
"""

import ctypes

from core.logging_config import get_logger
from . import packet_structs_20
from . import packet_structs_21
from . import packet_structs_22
from . import packet_structs_23
from . import packet_structs_24
from . import packet_structs_25

logger = get_logger("APXIQ.Ingestion.Decoder")

FORMAT_MODULE_MAP = {
    2020: packet_structs_20,
    2021: packet_structs_21,
    2022: packet_structs_22,
    2023: packet_structs_23,
    2024: packet_structs_24,
    2025: packet_structs_25,
}

FORMAT_LABEL_MAP = {
    2020: "F1 2020",
    2021: "F1 2021",
    2022: "F1 22",
    2023: "F1 23",
    2024: "F1 24",
    2025: "F1 25",
}


class PacketDecoder:
    """
    Decodes raw UDP bytes into game-specific C-types packet structures.
    """

    @staticmethod
    def decode(data: bytes):
        """
        Identify packet version and type from header and decode rest of the payload.
        Returns the decoded packet object or None if invalid.
        """
        if len(data) < 24:
            logger.warning("packet_too_short", length=len(data))
            return None

        # Peek at m_packetFormat (first uint16)
        packet_format = ctypes.c_uint16.from_buffer_copy(data, 0).value
        module = FORMAT_MODULE_MAP.get(packet_format)

        if module is None:
            logger.debug("unsupported_packet_format_ignored", format=packet_format)
            return None

        return PacketDecoder._decode_with_module(data, module, packet_format)

    @staticmethod
    def _decode_with_module(data: bytes, module, packet_format: int):
        try:
            header = module.PacketHeader.from_buffer_copy(data)
            packet_id = header.m_packetId

            if packet_id == module.PACKET_ID_MOTION:
                return module.PacketMotionData.from_buffer_copy(data)
            elif packet_id == module.PACKET_ID_LAP_DATA:
                return module.PacketLapData.from_buffer_copy(data)
            elif packet_id == module.PACKET_ID_SESSION:
                return module.PacketSessionData.from_buffer_copy(data)
            elif packet_id == module.PACKET_ID_CAR_TELEMETRY:
                return module.PacketCarTelemetryData.from_buffer_copy(data)
            elif packet_id == module.PACKET_ID_CAR_STATUS:
                return module.PacketCarStatusData.from_buffer_copy(data)
            elif packet_id == getattr(module, "PACKET_ID_PARTICIPANTS", 4):
                return module.PacketParticipantsData.from_buffer_copy(data)
            else:
                return header
        except ValueError as e:
            failed_id = header.m_packetId if "header" in locals() else -1
            logger.error("packet_decode_failed", format=packet_format, packet_id=failed_id, error=str(e))
            return None
