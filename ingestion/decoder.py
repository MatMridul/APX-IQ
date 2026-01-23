from .packet_structs import (
    PacketHeader, PacketMotionData, PacketLapData, PacketCarTelemetryData,
    PACKET_ID_MOTION, PACKET_ID_LAP_DATA, PACKET_ID_CAR_TELEMETRY
)
import ctypes
import logging

logger = logging.getLogger(__name__)

class PacketDecoder:
    """
    Decodes raw UDP bytes into F1 25 Packet Structures.
    """
    
    @staticmethod
    def decode(data: bytes):
        """
        Identify packet type from header and decode rest of the payload.
        Returns the decoded packet object or None if invalid.
        """
        if len(data) < ctypes.sizeof(PacketHeader):
            logger.warning("Packet too short to contain header")
            return None
            
        # Parse Header
        header = PacketHeader.from_buffer_copy(data)
        
        # Validation
        if header.m_packetFormat != 2025:
            logger.debug(f"Invalid Packet Format: {header.m_packetFormat} (Expected 2025). Ignoring.")
            return None

        packet_id = header.m_packetId
        
        try:
            if packet_id == PACKET_ID_MOTION:
                return PacketMotionData.from_buffer_copy(data)
            elif packet_id == PACKET_ID_LAP_DATA:
                return PacketLapData.from_buffer_copy(data)
            elif packet_id == PACKET_ID_CAR_TELEMETRY:
                return PacketCarTelemetryData.from_buffer_copy(data)
            # Add other packets here as needed
            else:
                # Valid F1 packet but type not yet implemented in structs
                # logger.debug(f"Packet ID {packet_id} valid but not implemented yet.")
                return header # Return header at least so we know it received something
                
        except ValueError as e:
            logger.error(f"Failed to decode packet ID {packet_id}: {e}")
            return None
