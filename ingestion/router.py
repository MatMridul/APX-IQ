import logging
import asyncio
from core.session_manager import SessionManager
try:
    from ingestion import packet_structs_25 as structs # Default to 25 structs for ID constants
except ImportError:
    # Fallback/Mock for ID constants if needed, or import 22
    from ingestion import packet_structs_22 as structs

logger = logging.getLogger(__name__)

class PacketRouter:
    """
    Routes decoded packets to appropriate handlers:
    1. Session/State Management
    2. Data Normalization -> DB Buffer
    3. RT Broadcast -> WebSocket
    """
    
    def __init__(self, session_manager: SessionManager, broadcast_queue: asyncio.Queue = None):
        self.session_manager = session_manager
        self.broadcast_queue = broadcast_queue

    async def route(self, packet):
        """
        Main routing entry point.
        """
        if not packet:
            return

        header = packet.m_header
        packet_id = header.m_packetId
        
        # 1. State Updates
        if packet_id == structs.PACKET_ID_SESSION:
            self.session_manager.update_session(packet)
            await self._broadcast("session_update", {
                "uid": str(header.m_sessionUID),
                "trackId": packet.m_trackId,
                "timeLeft": packet.m_sessionTimeLeft
            })
            
        elif packet_id == structs.PACKET_ID_PARTICIPANTS:
            self.session_manager.update_participants(packet)
            
        elif packet_id == structs.PACKET_ID_MOTION:
            # High frequency - limit broadcast?
            # For now, simplistic broadcast of player car
            player_idx = header.m_playerCarIndex
            car_data = packet.m_carMotionData[player_idx]
            
            await self._broadcast("telemetry_motion", {
                "speed_x": car_data.m_worldVelocityX,
                "speed_y": car_data.m_worldVelocityY,
                "g_lat": car_data.m_gForceLateral,
                "g_long": car_data.m_gForceLongitudinal
            })
            
        elif packet_id == structs.PACKET_ID_CAR_TELEMETRY:
            player_idx = header.m_playerCarIndex
            telem = packet.m_carTelemetryData[player_idx]
            
            await self._broadcast("telemetry_physics", {
                "speed": telem.m_speed,
                "rpm": telem.m_engineRPM,
                "gear": telem.m_gear,
                "throttle": telem.m_throttle,
                "brake": telem.m_brake,
                "drs": telem.m_drs
            })
            
        # 2. To DB (Future Implementation)
        # self.db_buffer.add(packet)

    async def _broadcast(self, event_type: str, payload: dict):
        if self.broadcast_queue:
            try:
                # Non-block put
                self.broadcast_queue.put_nowait({
                    "event": event_type,
                    "data": payload
                })
            except asyncio.QueueFull:
                pass # Drop real-time frames if consumers are slow
