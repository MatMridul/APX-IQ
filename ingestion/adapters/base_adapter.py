"""
APX IQ — Base Packet Adapter
=============================

Interface for version-specific packet adapters.
Translates game-specific C-types structs into CanonicalTelemetryFrame.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any


class BasePacketAdapter(ABC):
    """
    Translates raw game packets into standardized CanonicalTelemetryFrame instances.
    """

    def __init__(self, format_year: int, label: str):
        self.format_year = format_year
        self.label = label

    @abstractmethod
    def extract_motion(self, packet, player_idx: int) -> Dict[str, Any]:
        """Extract world position and motion vectors."""
        pass

    @abstractmethod
    def extract_telemetry(self, packet, player_idx: int) -> Dict[str, Any]:
        """Extract speed, throttle, brake, steer, gear, rpm, drs, and thermals."""
        pass

    @abstractmethod
    def extract_lap_data(self, packet, player_idx: int) -> Dict[str, Any]:
        """Extract lap number, lap distance, current and last lap time in milliseconds."""
        pass

    @abstractmethod
    def extract_car_status(self, packet, player_idx: int) -> Dict[str, Any]:
        """Extract fuel, DRS permission, tyre compound, and ERS energy store."""
        pass

    @abstractmethod
    def extract_session(self, packet) -> Dict[str, Any]:
        """Extract weather, track ID, track length, temperatures, safety car status, and session rules."""
        pass

    @abstractmethod
    def extract_participants(self, packet) -> Dict[str, Any]:
        """Extract participant details (driver name, team ID, race number, AI flag)."""
        pass

    @abstractmethod
    def extract_car_damage(self, packet, player_idx: int) -> Dict[str, Any]:
        """Extract tyre wear %, tyre damage, brake damage, aero/wing damage, and engine/gearbox wear."""
        pass

    @abstractmethod
    def extract_session_history(self, packet) -> Dict[str, Any]:
        """Extract historical lap times, best sector times, and tyre stint histories."""
        pass

    @abstractmethod
    def extract_car_setups(self, packet, player_idx: int) -> Dict[str, Any]:
        """Extract mechanical car setup (wing aero, differential, suspension geometry/springs/ARB, tyre pressures)."""
        pass

    @abstractmethod
    def extract_motion_ex(self, packet) -> Dict[str, Any]:
        """Extract high-frequency chassis physics (suspension travel, wheel speed, wheel slip, wheel forces)."""
        pass

    @abstractmethod
    def extract_event(self, packet) -> Dict[str, Any]:
        """Extract race events (fastest lap, penalties, retirements, DRS status, safety car, overtakes)."""
        pass

    @abstractmethod
    def extract_tyre_sets(self, packet) -> Dict[str, Any]:
        """Extract available and fitted tyre sets, compound wear, and stint recommendations."""
        pass

    @abstractmethod
    def extract_time_trial(self, packet) -> Dict[str, Any]:
        """Extract time trial session best, personal best, and rival delta datasets."""
        pass




