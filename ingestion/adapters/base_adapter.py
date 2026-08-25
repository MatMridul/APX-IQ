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
