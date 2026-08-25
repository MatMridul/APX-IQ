"""
APX IQ — Universal Packet Adapter
==================================

Translates decoded packets for any F1 version (2020–2025) into
canonical dictionaries and CanonicalTelemetryFrame instances.
"""

from typing import Dict, Any
from ingestion.adapters.base_adapter import BasePacketAdapter


class UniversalPacketAdapter(BasePacketAdapter):
    """
    Handles translation for F1 2020, 2021, 2022, 2023, 2024, and 2025 packets.
    """

    TYRE_COMPOUND_NAMES = {
        16: "C5 (Soft)",
        17: "C4 (Medium)",
        18: "C3 (Hard)",
        19: "C2",
        20: "C1",
        7:  "Intermediate",
        8:  "Wet",
        9:  "Dry (Classic)",
        10: "Wet (Classic)",
    }

    def __init__(self, format_year: int, label: str):
        super().__init__(format_year, label)

    def extract_motion(self, packet, player_idx: int) -> Dict[str, Any]:
        motion = packet.m_carMotionData[player_idx]
        return {
            "world_pos_x": float(motion.m_worldPositionX),
            "world_pos_y": float(motion.m_worldPositionY),
            "world_pos_z": float(motion.m_worldPositionZ),
            "world_vel_x": float(motion.m_worldVelocityX),
            "world_vel_y": float(motion.m_worldVelocityY),
            "world_vel_z": float(motion.m_worldVelocityZ),
            "g_force_lat": float(motion.m_gForceLateral),
            "g_force_lon": float(motion.m_gForceLongitudinal),
        }

    def extract_telemetry(self, packet, player_idx: int) -> Dict[str, Any]:
        telem = packet.m_carTelemetryData[player_idx]
        return {
            "speed_kph": float(telem.m_speed),
            "throttle": float(telem.m_throttle),
            "brake": float(telem.m_brake),
            "steer": float(telem.m_steer),
            "gear": int(telem.m_gear),
            "rpm": int(telem.m_engineRPM),
            "drs": bool(telem.m_drs),
            "tyre_surface_temps": list(telem.m_tyresSurfaceTemperature),
            "tyre_inner_temps": list(telem.m_tyresInnerTemperature),
            "brakes_temperature": list(telem.m_brakesTemperature),
        }

    def extract_lap_data(self, packet, player_idx: int) -> Dict[str, Any]:
        lap = packet.m_lapData[player_idx]
        
        # F1 2020 used float seconds; 2021+ uses uint32 milliseconds
        if self.format_year == 2020:
            current_ms = int(round(getattr(lap, "m_currentLapTime", 0.0) * 1000))
            last_ms = int(round(getattr(lap, "m_lastLapTime", 0.0) * 1000))
        else:
            current_ms = int(getattr(lap, "m_currentLapTimeInMS", 0))
            last_ms = int(getattr(lap, "m_lastLapTimeInMS", 0))

        return {
            "lap_number": int(lap.m_currentLapNum),
            "current_lap_time_ms": current_ms,
            "last_lap_time_ms": last_ms,
            "sector_1_ms": int(getattr(lap, "m_sector1TimeInMS", 0)),
            "sector_2_ms": int(getattr(lap, "m_sector2TimeInMS", 0)),
            "lap_distance_m": float(lap.m_lapDistance),
            "total_distance_m": float(lap.m_totalDistance),
            "position": int(lap.m_carPosition),
            "is_valid": not bool(getattr(lap, "m_currentLapInvalid", 0)),
        }

    def extract_car_status(self, packet, player_idx: int) -> Dict[str, Any]:
        status = packet.m_carStatusData[player_idx]
        compound_id = getattr(status, "m_actualTyreCompound", getattr(status, "m_visualTyreCompound", 18))
        return {
            "fuel_in_tank": float(status.m_fuelInTank),
            "fuel_remaining_laps": float(status.m_fuelRemainingLaps),
            "max_rpm": int(status.m_maxRPM),
            "drs_allowed": bool(status.m_drsAllowed),
            "ers_store_energy": float(status.m_ersStoreEnergy),
            "ers_deploy_mode": int(getattr(status, "m_ersDeployMode", 0)),
            "tyre_compound": self.TYRE_COMPOUND_NAMES.get(compound_id, "Standard"),
        }


def get_adapter_for_format(format_year: int) -> UniversalPacketAdapter:
    """Factory function returning the adapter configured for the game format."""
    labels = {
        2020: "F1 2020",
        2021: "F1 2021",
        2022: "F1 22",
        2023: "F1 23",
        2024: "F1 24",
        2025: "F1 25",
    }
    return UniversalPacketAdapter(format_year, labels.get(format_year, f"F1 {format_year}"))
