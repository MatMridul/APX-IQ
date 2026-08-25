"""
APX IQ — Session Manager
========================

In-process state for the currently active racing session.
Fed by POST /telemetry/session/start (ingestion forwards Session packets).
"""

from typing import Dict, Optional

from core.logging_config import get_logger

log = get_logger("APXIQ.Core.SessionManager")


class SessionManager:
    """
    Maintains the state of the current racing session.
    Source of truth for: Session UID, Active Drivers, Track Context.
    """

    def __init__(self):
        self.active_session_uid: Optional[int] = None
        self.track_id: Optional[int] = None
        self.session_type: Optional[int] = None
        self.drivers: Dict[int, str] = {}  # driver_index -> name
        self.is_active: bool = False

    def start_session(
        self,
        session_uid: int,
        track_id: Optional[int] = None,
        session_type: Optional[int] = None,
    ) -> bool:
        """
        Register/refresh the active session from plain values
        (as delivered by the REST bridge from ingestion).

        Returns True if this call started a NEW session.
        """
        is_new = self.active_session_uid != session_uid
        if is_new:
            log.info("new_session_detected", session_uid=session_uid)
            self.drivers = {}
        self.active_session_uid = session_uid
        if track_id is not None:
            self.track_id = track_id
        if session_type is not None:
            self.session_type = session_type
        self.is_active = True
        return is_new

    def end_session(self) -> None:
        self.is_active = False
        log.info("session_marked_inactive", session_uid=self.active_session_uid)

    def update_participants(self, packet_participants_data):
        """Updates driver mapping from a Participants Packet (raw struct)."""
        for i, participant in enumerate(packet_participants_data.m_participants):
            try:
                name = bytes(participant.m_name).decode("utf-8").rstrip("\x00")
                if name:
                    self.drivers[i] = name
            except Exception:
                pass

    def get_driver_name(self, index: int) -> str:
        return self.drivers.get(index, f"Unknown Driver {index}")
