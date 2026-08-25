"""
Tests for canonical shared Pydantic models (api/models/shared.py).

These guard the API contract boundary: malformed telemetry, oversized
payloads, and physically impossible values must be rejected at the edge.
"""

import pytest
from pydantic import ValidationError

from api.models.shared import (
    MAX_TELEMETRY_POINTS,
    BattleRequest,
    CanonicalTelemetryFrame,
    HardwareRequest,
    SaveLapRequest,
    TelemetryPoint,
)


def _point(**overrides) -> dict:
    base = {
        "distance_m": 100.0,
        "speed_kph": 250.0,
        "throttle": 0.8,
        "brake": 0.1,
        "steer": -0.2,
        "gear": 5,
        "rpm": 11_000,
        "drs": True,
        "x": 1.0,
        "y": 2.0,
        "z": 3.0,
    }
    base.update(overrides)
    return base


class TestTelemetryPointValidation:
    def test_valid_point_roundtrip(self):
        p = TelemetryPoint(**_point())
        assert p.speed_kph == 250.0
        assert p.drs is True
        assert p.tyres_surface_temp == [0.0, 0.0, 0.0, 0.0]

    def test_pedals_clamped_into_range(self):
        p = TelemetryPoint(**_point(throttle=1.7, brake=-0.5))
        assert p.throttle == 1.0
        assert p.brake == 0.0

    def test_steer_clamped(self):
        p = TelemetryPoint(**_point(steer=-3.0))
        assert p.steer == -1.0

    def test_none_values_coerced_to_zero(self):
        p = TelemetryPoint(**_point(rpm=None, gear=None, throttle=None))
        assert p.rpm == 0
        assert p.gear == 0
        assert p.throttle == 0.0

    def test_speed_above_physical_limit_rejected(self):
        with pytest.raises(ValidationError):
            TelemetryPoint(**_point(speed_kph=999.0))

    def test_negative_distance_rejected(self):
        with pytest.raises(ValidationError):
            TelemetryPoint(**_point(distance_m=-1.0))

    def test_gear_out_of_range_rejected(self):
        with pytest.raises(ValidationError):
            TelemetryPoint(**_point(gear=9))


class TestSaveLapRequest:
    def test_minimum_ten_points_required(self):
        with pytest.raises(ValidationError, match="[Ii]nsufficient"):
            SaveLapRequest(
                session_uid=1,
                lap_number=1,
                telemetry=[TelemetryPoint(**_point(distance_m=i * 10.0)) for i in range(9)],
            )

    def test_payload_cap_enforced(self):
        with pytest.raises(ValidationError, match="cap"):
            SaveLapRequest(
                session_uid=1,
                lap_number=1,
                telemetry=[
                    TelemetryPoint(**_point(distance_m=float(i)))
                    for i in range(MAX_TELEMETRY_POINTS + 1)
                ],
            )

    def test_valid_lap_accepted(self):
        req = SaveLapRequest(
            session_uid=7,
            lap_number=3,
            lap_time_ms=91_234,
            telemetry=[TelemetryPoint(**_point(distance_m=float(i))) for i in range(10)],
        )
        assert len(req.telemetry) == 10


class TestHardwareAndBattleRequests:
    def test_hardware_rejects_short_trace(self):
        with pytest.raises(ValidationError, match="200"):
            HardwareRequest(steer_trace=[0.0] * 199)

    def test_hardware_accepts_exact_minimum(self):
        req = HardwareRequest(steer_trace=[0.0] * 200)
        assert len(req.steer_trace) == 200

    def test_battle_rejects_impossible_grid_position(self):
        with pytest.raises(ValidationError):
            BattleRequest(current_position=21, gap_ahead_s=1.0, gap_behind_s=1.0, laps_remaining=5)

    def test_battle_rejects_negative_gap(self):
        with pytest.raises(ValidationError):
            BattleRequest(current_position=1, gap_ahead_s=-0.1, gap_behind_s=1.0, laps_remaining=5)


class TestCanonicalTelemetryFrame:
    def _frame(self, **overrides) -> dict:
        base = {
            "packet_format": 2025,
            "game_version_label": "F1 25",
            "session_uid": 42,
            "frame_identifier": 1,
            "session_time": 10.0,
            "player_car_index": 0,
            "speed_kph": 200.0,
            "throttle": 1.0,
            "brake": 0.0,
            "steer": 0.0,
            "gear": 6,
            "rpm": 12_000,
            "drs": False,
            "lap_number": 3,
            "current_lap_time_ms": 1_000,
            "last_lap_time_ms": 90_000,
            "lap_distance_m": 100.0,
            "total_distance_m": 5_000.0,
            "position": 1,
            "world_pos_x": 0.0,
            "world_pos_y": 0.0,
            "world_pos_z": 0.0,
        }
        base.update(overrides)
        return base

    def test_frame_defaults_populate_thermal_arrays(self):
        f = CanonicalTelemetryFrame(**self._frame())
        assert f.tyre_surface_temps == [0, 0, 0, 0]
        assert f.tyre_inner_temps == [0, 0, 0, 0]
        assert f.brakes_temperature == [0, 0, 0, 0]

    def test_frame_defaults(self):
        f = CanonicalTelemetryFrame(**self._frame())
        assert f.tyre_compound == "Unknown"
        assert f.fuel_in_tank == 0.0
        assert f.drs_allowed is False

    def test_frame_accepts_full_telemetry_snapshot(self):
        f = CanonicalTelemetryFrame(
            **self._frame(tyre_surface_temps=[95, 96, 100, 101], tyre_compound="C4 (Medium)")
        )
        assert f.tyre_surface_temps == [95, 96, 100, 101]
        assert f.tyre_compound == "C4 (Medium)"
