import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class SessionManager:
    """
    Maintains the state of the current racing session.
    Source of truth for: Session UID, Active Drivers, Track Context.
    """
    
    def __init__(self):
        self.active_session_uid: Optional[int] = None
        self.track_id: Optional[int] = None
        self.session_type: Optional[int] = None
        self.drivers: Dict[int, str] = {} # driver_index -> name
        self.is_active: bool = False

    def update_session(self, packet_session_data):
        """
        Updates context from a Session Packet.
        """
        header = packet_session_data.m_header
        
        # Check if new session
        if self.active_session_uid != header.m_sessionUID:
            self._init_new_session(header.m_sessionUID)
            
        self.track_id = packet_session_data.m_trackId
        self.session_type = packet_session_data.m_sessionType
        self.is_active = True
        
    def _init_new_session(self, session_uid):
        logger.info(f"New Session Detected: {session_uid}")
        self.active_session_uid = session_uid
        self.drivers = {}
    
    def update_participants(self, packet_participants_data):
        """
        Updates driver mapping from Participants Packet.
        """
        for i, participant in enumerate(packet_participants_data.m_participants):
            # decode name bytes to string
            try:
                name = bytes(participant.m_name).decode('utf-8').rstrip('\x00')
                if name:
                    self.drivers[i] = name
            except Exception:
                pass
                
    def get_driver_name(self, index: int) -> str:
        return self.drivers.get(index, f"Unknown Driver {index}")
