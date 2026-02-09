import ctypes
import logging
from . import packet_structs_25
from . import packet_structs_22

logger = logging.getLogger(__name__)

class PacketDecoder:
    """
    Decodes raw UDP bytes into F1 25 or F1 22 Packet Structures.
    """
    
    @staticmethod
    def decode(data: bytes):
        """
        Identify packet version and type from header and decode rest of the payload.
        Returns the decoded packet object or None if invalid.
        """
        # Minimal size check (Header is usually ~24-29 bytes)
        if len(data) < 24:
            logger.warning("Packet too short to contain header")
            return None
            
        # Peek at m_packetFormat (first uint16)
        packet_format = ctypes.c_uint16.from_buffer_copy(data, 0).value
        
        if packet_format == 2025:
            return PacketDecoder._decode_25(data)
        elif packet_format == 2022:
            return PacketDecoder._decode_22(data)
            return PacketDecoder._decode_22(data)
        else:
            # logger.debug(f"Unknown Packet Format: {packet_format}. Ignoring.")
            print(f"DEBUG: Unknown Packet Format: {packet_format}")
            return None

    @staticmethod
    def _decode_25(data: bytes):
        header = packet_structs_25.PacketHeader.from_buffer_copy(data)
        packet_id = header.m_packetId

        try:
            if packet_id == packet_structs_25.PACKET_ID_MOTION:
                return packet_structs_25.PacketMotionData.from_buffer_copy(data)
            elif packet_id == packet_structs_25.PACKET_ID_LAP_DATA:
                return packet_structs_25.PacketLapData.from_buffer_copy(data)
            elif packet_id == packet_structs_25.PACKET_ID_SESSION:
                return packet_structs_25.PacketSessionData.from_buffer_copy(data)
            elif packet_id == packet_structs_25.PACKET_ID_PARTICIPANTS:
                return packet_structs_25.PacketParticipantsData.from_buffer_copy(data)
            elif packet_id == packet_structs_25.PACKET_ID_CAR_TELEMETRY:
                return packet_structs_25.PacketCarTelemetryData.from_buffer_copy(data)
            elif packet_id == packet_structs_25.PACKET_ID_CAR_STATUS:
                return packet_structs_25.PacketCarStatusData.from_buffer_copy(data)
            else:
                return header 
        except ValueError as e:
            logger.error(f"Failed to decode F1 25 packet ID {packet_id}: {e}")
            return None

    @staticmethod
    def _decode_22(data: bytes):
        header = packet_structs_22.PacketHeader.from_buffer_copy(data)
        packet_id = header.m_packetId

        try:
            if packet_id == packet_structs_22.PACKET_ID_MOTION:
                return packet_structs_22.PacketMotionData.from_buffer_copy(data)
            elif packet_id == packet_structs_22.PACKET_ID_SESSION:
                return packet_structs_22.PacketSessionData.from_buffer_copy(data)
            elif packet_id == packet_structs_22.PACKET_ID_LAP_DATA:
                return packet_structs_22.PacketLapData.from_buffer_copy(data)
            elif packet_id == packet_structs_22.PACKET_ID_EVENT:
                return packet_structs_22.PacketEventData.from_buffer_copy(data)
            elif packet_id == packet_structs_22.PACKET_ID_PARTICIPANTS:
                return packet_structs_22.PacketParticipantsData.from_buffer_copy(data)
            elif packet_id == packet_structs_22.PACKET_ID_CAR_SETUPS:
                return packet_structs_22.PacketCarSetupData.from_buffer_copy(data)
            elif packet_id == packet_structs_22.PACKET_ID_CAR_TELEMETRY:
                return packet_structs_22.PacketCarTelemetryData.from_buffer_copy(data)
            elif packet_id == packet_structs_22.PACKET_ID_CAR_STATUS:
                return packet_structs_22.PacketCarStatusData.from_buffer_copy(data)
            elif packet_id == packet_structs_22.PACKET_ID_FINAL_CLASSIFICATION:
                return packet_structs_22.PacketFinalClassificationData.from_buffer_copy(data)
            elif packet_id == packet_structs_22.PACKET_ID_LOBBY_INFO:
                return packet_structs_22.PacketLobbyInfoData.from_buffer_copy(data)
            elif packet_id == packet_structs_22.PACKET_ID_CAR_DAMAGE:
                return packet_structs_22.PacketCarDamageData.from_buffer_copy(data)
            elif packet_id == packet_structs_22.PACKET_ID_SESSION_HISTORY:
                return packet_structs_22.PacketSessionHistoryData.from_buffer_copy(data)
            else:
                return header 
        except ValueError as e:
            logger.error(f"Failed to decode F1 22 packet ID {packet_id}: {e}")
            return None
