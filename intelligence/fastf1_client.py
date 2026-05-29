"""
FastF1 Client
=============

Wraps the FastF1 library to provide a clean interface for fetching
real-world F1 telemetry data. All data is scoped to the Ground Effect
era (2022–Present) and returned as distance-indexed DataFrames ready
for alignment with game telemetry.

Usage:
    client = FastF1Client()
    telemetry = client.get_lap_telemetry(2024, "Monaco", "Q", "VER")
    # Returns DataFrame with columns:
    # [Distance, Speed, Throttle, Brake, nGear, RPM, DRS, X, Y, Z, Time]
"""

import logging
from typing import Optional

import fastf1
import numpy as np
import pandas as pd

from .constants import MIN_YEAR, MAX_YEAR, TRACK_MAP, SESSION_TYPE_MAP

logger = logging.getLogger("APXIQ.Intelligence.FastF1")


class FastF1Client:
    """
    Client for fetching and caching real-world F1 telemetry.
    
    Provides methods to:
    - Load telemetry for a specific driver/session/lap
    - List available sessions and drivers for a given year
    - Retrieve track distance for normalization
    
    All telemetry is returned as a pandas DataFrame indexed by distance
    (meters from the start line), ready for direct comparison with game data.
    """

    def __init__(self, cache_dir: str = "./data/fastf1_cache"):
        """
        Initialize the FastF1 client with a local file cache.
        
        Args:
            cache_dir: Path to the cache directory. FastF1 session files
                       are 50-100MB each, so caching is critical for performance.
        """
        fastf1.Cache.enable_cache(cache_dir)
        logger.info(f"FastF1 client initialized. Cache: {cache_dir}")

    def get_lap_telemetry(
        self,
        year: int,
        gp: str,
        session_type: str = "Q",
        driver: str = "VER",
        lap: str = "fastest",
    ) -> Optional[pd.DataFrame]:
        """
        Fetch telemetry for a specific driver's lap.

        Args:
            year: Season year (must be within MIN_YEAR–MAX_YEAR).
            gp: Grand Prix name (e.g., "Monaco", "Bahrain").
                Can also use FastF1's round number.
            session_type: Session identifier — "FP1", "FP2", "FP3", "Q", "R".
            driver: Three-letter driver code (e.g., "VER", "HAM", "LEC").
            lap: Which lap to fetch. "fastest" for the fastest lap,
                 or an integer string for a specific lap number.

        Returns:
            DataFrame with columns:
                Distance  - Meters from start line (float)
                Speed     - km/h (float)
                Throttle  - 0-100 percentage (float)
                Brake     - Boolean or 0/1 (converted to float 0.0-1.0)
                nGear     - Gear number (int)
                RPM       - Engine RPM (int)
                DRS       - DRS status (int)
                X, Y, Z   - World position coordinates (float)
                Time      - Session timestamp (timedelta)
            
            Returns None if the data cannot be loaded.

        Raises:
            ValueError: If the year is outside the allowed era scope.
        """
        # Guard: Era scope enforcement
        if year < MIN_YEAR or year > MAX_YEAR:
            raise ValueError(
                f"Year {year} is outside the allowed era scope "
                f"({MIN_YEAR}–{MAX_YEAR}). Only Ground Effect era data "
                f"is valid for comparison."
            )

        try:
            logger.info(
                f"Loading telemetry: {year} {gp} {session_type} "
                f"Driver={driver} Lap={lap}"
            )

            # Load the session
            session = fastf1.get_session(year, gp, session_type)
            session.load()

            # Select the driver's laps
            driver_laps = session.laps.pick_driver(driver)
            if driver_laps.empty:
                logger.warning(f"No laps found for driver {driver}")
                return None

            # Pick the specific lap
            if lap == "fastest":
                selected_lap = driver_laps.pick_fastest()
            else:
                lap_num = int(lap)
                matching = driver_laps[driver_laps["LapNumber"] == lap_num]
                if matching.empty:
                    logger.warning(
                        f"Lap {lap_num} not found for driver {driver}"
                    )
                    return None
                selected_lap = matching.iloc[0]

            # Get telemetry and add distance column
            telemetry = selected_lap.get_telemetry()
            telemetry = telemetry.add_distance()

            # Normalize brake to 0.0-1.0 float (FastF1 returns bool)
            if telemetry["Brake"].dtype == bool:
                telemetry["Brake"] = telemetry["Brake"].astype(float)

            logger.info(
                f"Telemetry loaded: {len(telemetry)} data points, "
                f"max distance: {telemetry['Distance'].max():.0f}m"
            )
            return telemetry

        except Exception as e:
            logger.error(f"Failed to load telemetry: {e}")
            return None

    def get_available_sessions(self, year: int) -> list[dict]:
        """
        List all Grand Prix events available for a given year.

        Args:
            year: Season year.

        Returns:
            List of dicts with keys: EventName, Country, Location, EventDate,
            RoundNumber, etc.
        """
        if year < MIN_YEAR or year > MAX_YEAR:
            raise ValueError(
                f"Year {year} is outside the allowed era scope."
            )

        try:
            schedule = fastf1.get_event_schedule(year)
            # Filter out testing events
            schedule = schedule[schedule["EventFormat"] != "testing"]
            return schedule.to_dict("records")
        except Exception as e:
            logger.error(f"Failed to load schedule for {year}: {e}")
            return []

    def get_available_drivers(
        self, year: int, gp: str, session_type: str = "R"
    ) -> list[str]:
        """
        List all drivers who participated in a specific session.

        Args:
            year: Season year.
            gp: Grand Prix name.
            session_type: Session identifier.

        Returns:
            List of three-letter driver codes (e.g., ["VER", "HAM", "LEC"]).
        """
        try:
            session = fastf1.get_session(year, gp, session_type)
            session.load()
            drivers = session.laps["Driver"].unique().tolist()
            return sorted(drivers)
        except Exception as e:
            logger.error(f"Failed to load drivers: {e}")
            return []

    def get_track_distance(
        self, year: int, gp: str, session_type: str = "Q"
    ) -> Optional[float]:
        """
        Get the total track length in meters for a given GP.
        
        Derived from the maximum distance value in the fastest lap's telemetry.

        Args:
            year: Season year.
            gp: Grand Prix name.
            session_type: Session identifier.

        Returns:
            Track length in meters, or None if unavailable.
        """
        try:
            session = fastf1.get_session(year, gp, session_type)
            session.load()
            fastest = session.laps.pick_fastest()
            telemetry = fastest.get_telemetry().add_distance()
            return float(telemetry["Distance"].max())
        except Exception as e:
            logger.error(f"Failed to get track distance: {e}")
            return None

    def fetch_ghost_lap(
        self, year: int, gp: str, session_type: str, driver: str,
        lap: str = "fastest"
    ) -> Optional[dict]:
        """
        Fetch a complete ghost lap package ready for database storage.

        Returns a dict containing:
            - metadata: year, gp, session_type, driver, lap_time_ms, track_distance
            - telemetry: DataFrame with standardized columns matching
                         the ghost_telemetry schema
        
        This is the primary method used by the data pipeline to populate
        the ghost_laps and ghost_telemetry database tables.
        """
        telemetry = self.get_lap_telemetry(year, gp, session_type, driver, lap)
        if telemetry is None:
            return None

        # Build the standardized telemetry DataFrame for DB storage
        ghost_telemetry = pd.DataFrame({
            "distance_m": telemetry["Distance"].values,
            "speed_kph": telemetry["Speed"].values,
            "throttle": telemetry["Throttle"].values / 100.0,  # Normalize to 0.0-1.0
            "brake": telemetry["Brake"].astype(float).values,
            "gear": telemetry["nGear"].values,
            "rpm": telemetry["RPM"].values,
            "drs": telemetry["DRS"].values.astype(bool),
            "x": telemetry["X"].values,
            "y": telemetry["Y"].values,
            "z": telemetry["Z"].values,
        })

        # Get lap time if available
        try:
            session = fastf1.get_session(year, gp, session_type)
            session.load()
            driver_laps = session.laps.pick_driver(driver)
            if lap == "fastest":
                selected = driver_laps.pick_fastest()
            else:
                selected = driver_laps[
                    driver_laps["LapNumber"] == int(lap)
                ].iloc[0]
            lap_time_ms = int(
                selected["LapTime"].total_seconds() * 1000
            ) if pd.notna(selected["LapTime"]) else None
            lap_number = int(selected["LapNumber"])
        except Exception:
            lap_time_ms = None
            lap_number = None

        return {
            "metadata": {
                "source": "fastf1",
                "year": year,
                "gp_name": gp,
                "session_type": session_type,
                "driver_code": driver,
                "lap_number": lap_number,
                "lap_time_ms": lap_time_ms,
                "track_distance_m": float(telemetry["Distance"].max()),
            },
            "telemetry": ghost_telemetry,
        }


def resolve_track_name(game_track_id: int) -> Optional[str]:
    """
    Convert an EA game track_id (from the Session packet) to a
    FastF1-compatible GP name.

    Args:
        game_track_id: The m_trackId value from the UDP Session packet.

    Returns:
        FastF1 GP name string, or None if unmapped.
    """
    return TRACK_MAP.get(game_track_id)


def resolve_session_type(game_session_type: int) -> str:
    """
    Convert an EA game session_type to a FastF1 session identifier.

    Args:
        game_session_type: The m_sessionType value from the UDP Session packet.

    Returns:
        FastF1 session type string (e.g., "Q", "R", "FP1").
    """
    return SESSION_TYPE_MAP.get(game_session_type, "R")
