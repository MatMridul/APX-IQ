"""
Telemetry Recorder
==================

Captures the player's per-lap telemetry from the live UDP stream and
produces distance-indexed DataFrames that are structurally identical
to the ghost telemetry from FastF1.

Design Decision — Correlating Multiple Packet Types:
    The EA F1 game sends Lap Data (ID=2), Car Telemetry (ID=6), and
    Motion (ID=0) as SEPARATE UDP packets at different frequencies.
    We cannot wait for all three to arrive simultaneously.
    
    Solution: We maintain a "latest snapshot" of each packet type.
    On every tick, whichever packet arrives updates its snapshot.
    We compose a telemetry row from the latest values of all three
    snapshots. Since packets arrive at 20-60Hz and the car moves
    ~3-10 meters between ticks, the temporal misalignment between
    snapshots is negligible (< 50ms at worst).
"""

import logging
from typing import Optional

import numpy as np
import pandas as pd

from .constants import (
    MAX_LAP_BUFFER_SIZE,
    LAP_CROSSING_DISTANCE_DROP,
    HARDWARE_PROFILING_MIN_LAPS,
)

logger = logging.getLogger("APXIQ.Intelligence.Recorder")


class TelemetryRecorder:
    """
    Records per-lap telemetry from the live UDP stream.
    
    Produces distance-indexed DataFrames compatible with the 
    ghost_telemetry / user_lap_telemetry database schema.
    
    Lifecycle:
        1. Call on_session_start() when a new session begins
        2. Call update_lap_data() / update_car_telemetry() / update_motion()
           on every packet tick
        3. Completed laps are automatically detected and stored
        4. Call get_completed_laps() to retrieve finished lap DataFrames
        5. Call on_session_end() to flush the final lap
    """

    def __init__(self):
        self._reset_state()

    def _reset_state(self):
        """Reset all internal state for a new session."""
        # Session context
        self.session_uid: Optional[int] = None
        self.track_id: Optional[int] = None
        self.track_length: Optional[int] = None  # meters (from Session packet)

        # Latest snapshots of each packet type
        self._latest_lap_data: Optional[dict] = None
        self._latest_car_telemetry: Optional[dict] = None
        self._latest_motion: Optional[dict] = None

        # Current lap buffer
        self._current_lap_buffer: list[dict] = []
        self._current_lap_num: int = 0
        self._last_lap_distance: float = 0.0

        # Completed laps storage
        self._completed_laps: list[dict] = []  # [{lap_num, dataframe}, ...]

        # Steering trace accumulator for hardware profiling
        self._steer_trace_all: list[float] = []

        logger.info("TelemetryRecorder state reset.")

    def on_session_start(self, session_uid: int, track_id: int,
                         track_length: int):
        """
        Called when a new session is detected.
        
        Args:
            session_uid: Unique session identifier from the UDP header.
            track_id: Track ID from the Session packet (m_trackId).
            track_length: Track length in meters from Session packet (m_trackLength).
        """
        if self.session_uid != session_uid:
            logger.info(
                f"New session started: UID={session_uid}, "
                f"Track={track_id}, Length={track_length}m"
            )
            self._reset_state()
            self.session_uid = session_uid
            self.track_id = track_id
            self.track_length = track_length

    def update_lap_data(self, player_idx: int, lap_data_packet):
        """
        Update the latest lap data snapshot from a Lap Data packet (ID=2).
        
        Also handles lap boundary detection: if m_lapDistance drops
        significantly between ticks, we've crossed the start/finish line.
        
        Args:
            player_idx: Index of the player car in the packet arrays.
            lap_data_packet: The decoded PacketLapData ctypes struct.
        """
        lap = lap_data_packet.m_lapData[player_idx]

        current_distance = lap.m_lapDistance
        current_lap_num = lap.m_currentLapNum

        self._latest_lap_data = {
            "lap_distance": current_distance,
            "total_distance": lap.m_totalDistance,
            "lap_num": current_lap_num,
            "is_valid": lap.m_currentLapInvalid == 0,
            "position": lap.m_carPosition,
        }

        # --- Lap Boundary Detection ---
        # When the car crosses the start/finish line, m_lapDistance resets
        # from ~track_length back to ~0. We detect this as a large drop.
        distance_drop = self._last_lap_distance - current_distance

        if (distance_drop > LAP_CROSSING_DISTANCE_DROP
                and self._current_lap_num > 0
                and len(self._current_lap_buffer) > 10):
            self._finalize_lap()

        # Update tracking state
        if current_lap_num != self._current_lap_num:
            self._current_lap_num = current_lap_num

        self._last_lap_distance = current_distance

        # Record a telemetry row
        self._record_tick()

    def update_car_telemetry(self, player_idx: int, car_telemetry_packet):
        """
        Update the latest car telemetry snapshot from a Car Telemetry
        packet (ID=6).
        
        Args:
            player_idx: Index of the player car.
            car_telemetry_packet: The decoded PacketCarTelemetryData struct.
        """
        telem = car_telemetry_packet.m_carTelemetryData[player_idx]

        steer_value = telem.m_steer

        self._latest_car_telemetry = {
            "speed": telem.m_speed,
            "throttle": telem.m_throttle,
            "brake": telem.m_brake,
            "steer": steer_value,
            "gear": telem.m_gear,
            "rpm": telem.m_engineRPM,
            "drs": telem.m_drs,
        }

        # Accumulate steer trace for hardware profiling
        self._steer_trace_all.append(steer_value)

    def update_motion(self, player_idx: int, motion_packet):
        """
        Update the latest motion snapshot from a Motion packet (ID=0).
        
        Args:
            player_idx: Index of the player car.
            motion_packet: The decoded PacketMotionData struct.
        """
        car = motion_packet.m_carMotionData[player_idx]

        self._latest_motion = {
            "x": car.m_worldPositionX,
            "y": car.m_worldPositionY,
            "z": car.m_worldPositionZ,
            "g_lat": car.m_gForceLateral,
            "g_long": car.m_gForceLongitudinal,
        }

    def _record_tick(self):
        """
        Compose a telemetry row from the latest snapshots and append
        it to the current lap buffer.
        
        Only records if we have at minimum lap_data and car_telemetry.
        Motion data is optional (filled with zeros if missing).
        """
        if self._latest_lap_data is None or self._latest_car_telemetry is None:
            return  # Not enough data yet

        if len(self._current_lap_buffer) >= MAX_LAP_BUFFER_SIZE:
            return  # Safety cap

        motion = self._latest_motion or {
            "x": 0.0, "y": 0.0, "z": 0.0,
            "g_lat": 0.0, "g_long": 0.0,
        }

        row = {
            "distance_m": self._latest_lap_data["lap_distance"],
            "speed_kph": float(self._latest_car_telemetry["speed"]),
            "throttle": float(self._latest_car_telemetry["throttle"]),
            "brake": float(self._latest_car_telemetry["brake"]),
            "steer": float(self._latest_car_telemetry["steer"]),
            "gear": int(self._latest_car_telemetry["gear"]),
            "rpm": int(self._latest_car_telemetry["rpm"]),
            "drs": bool(self._latest_car_telemetry["drs"]),
            "x": float(motion["x"]),
            "y": float(motion["y"]),
            "z": float(motion["z"]),
        }
        self._current_lap_buffer.append(row)

    def _finalize_lap(self):
        """
        Finalize the current lap buffer into a completed lap DataFrame.
        
        Sorts by distance, removes duplicates, and stores the result.
        """
        if len(self._current_lap_buffer) < 10:
            logger.warning(
                f"Lap {self._current_lap_num} has too few data points "
                f"({len(self._current_lap_buffer)}), discarding."
            )
            self._current_lap_buffer = []
            return

        df = pd.DataFrame(self._current_lap_buffer)

        # Sort by distance and remove duplicate distance values
        # (keep last occurrence for most up-to-date telemetry at that point)
        df = df.sort_values("distance_m").drop_duplicates(
            subset=["distance_m"], keep="last"
        ).reset_index(drop=True)

        lap_info = {
            "lap_num": self._current_lap_num,
            "session_uid": self.session_uid,
            "track_id": self.track_id,
            "data_points": len(df),
            "max_distance": float(df["distance_m"].max()),
            "dataframe": df,
        }

        self._completed_laps.append(lap_info)

        logger.info(
            f"Lap {self._current_lap_num} finalized: "
            f"{len(df)} points, max distance {df['distance_m'].max():.0f}m"
        )

        # Reset buffer for next lap
        self._current_lap_buffer = []

    def on_session_end(self):
        """
        Called when the session ends. Flushes any remaining lap data.
        """
        if len(self._current_lap_buffer) > 10:
            self._finalize_lap()
        logger.info(
            f"Session ended. {len(self._completed_laps)} laps recorded."
        )

    def get_completed_laps(self) -> list[dict]:
        """
        Return all completed lap DataFrames.
        
        Returns:
            List of dicts, each containing:
                - lap_num: int
                - session_uid: int
                - track_id: int
                - data_points: int
                - max_distance: float
                - dataframe: pd.DataFrame with columns matching
                             user_lap_telemetry schema
        """
        return self._completed_laps

    def get_latest_lap(self) -> Optional[dict]:
        """Return the most recently completed lap, or None."""
        if self._completed_laps:
            return self._completed_laps[-1]
        return None

    def get_steer_trace(self) -> np.ndarray:
        """
        Return the accumulated steering trace for hardware profiling.
        
        Returns:
            1D numpy array of all steer values recorded this session
            (range -1.0 to 1.0).
        """
        return np.array(self._steer_trace_all, dtype=np.float32)

    def has_enough_data_for_profiling(self) -> bool:
        """Check if we have enough completed laps for hardware profiling."""
        return len(self._completed_laps) >= HARDWARE_PROFILING_MIN_LAPS

    @property
    def laps_recorded(self) -> int:
        """Number of completed laps recorded this session."""
        return len(self._completed_laps)

    @property
    def current_buffer_size(self) -> int:
        """Number of rows in the current (in-progress) lap buffer."""
        return len(self._current_lap_buffer)
