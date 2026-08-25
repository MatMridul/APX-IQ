"""
APX-IQ — Motorsport Physics & Vehicle Dynamics Test Suite
==========================================================

Tests:
  1. Trail-Braking Friction Circle Oversaturation Detection
  2. Trail-Braking Abrupt Off-Brake Snap Detection
  3. Tyre Thermal Dissociation (Surface Graining vs Core Heat Soak)
  4. 4-Phase Corner Telemetry and Mechanical Setup Matrix Generation
"""

import numpy as np
import pandas as pd

from intelligence.coach_engine import CoachEngine, CoachingCategory
from intelligence.corner_detector import Corner, CornerMap
from intelligence.report_generator import ReportGenerator, ReportType


def test_trail_braking_oversaturation_detection():
    """Verify that heavy braking under high steering angle triggers friction circle warning."""
    engine = CoachEngine()

    # Synthetic corner at 500m
    corners = CornerMap(
        corners=[
            Corner(index=1, apex_distance_m=500.0, apex_speed_kph=110.0, apex_idx=50, entry_distance_m=420.0, exit_distance_m=580.0)
        ],
        total_corners=1,
    )

    # 100-meter telemetry leading up to apex (420m to 500m)
    dist = np.linspace(420.0, 500.0, 50)
    # Heavy brake (85%) combined with heavy steer (0.45)
    brakes = np.full_like(dist, 0.85)
    steers = np.full_like(dist, 0.45)

    df = pd.DataFrame({
        "distance_m": dist,
        "brake": brakes,
        "steer": steers,
    })

    tips = engine._analyze_trail_braking(df, corners)
    assert len(tips) > 0
    assert tips[0].category == CoachingCategory.TRAIL_BRAKE
    assert "Friction circle oversaturation" in tips[0].message


def test_thermal_dissociation_graining_detection():
    """Verify that surface temperature >> core temperature triggers surface graining alert."""
    engine = CoachEngine()

    # Surface temp 115°C vs Core temp 95°C (delta = 20°C > 12°C threshold)
    df = pd.DataFrame({
        "tyres_surface_temp": [[100, 100, 115, 115]],
        "tyres_inner_temp": [[95, 95, 95, 95]],
    })

    tips = engine._analyze_thermals(df)
    assert len(tips) > 0
    assert tips[0].category == CoachingCategory.THERMAL
    assert "surface graining" in tips[0].message.lower()


def test_motorsport_setup_matrix_in_report_generator():
    """Verify that template report includes 4-Phase Telemetry and Setup Matrix."""
    generator = ReportGenerator()

    data = {
        "track_name": "Bahrain International Circuit",
        "driver_code": "VER",
        "total_delta_ms": 650.0, # 650ms behind
        "avg_speed_delta": -4.2,  # 4.2 km/h slower
        "hardware_type": "Direct Drive Wheelbase",
        "top_tips": ["Turn 1: Trail off brake smoothly to preserve front aerodynamic load."],
    }

    report = generator._template_lap_debrief(data)
    assert report.report_type == ReportType.LAP_DEBRIEF
    assert "4-Phase Corner Telemetry Analysis" in report.markdown
    assert "Mechanical & Aerodynamic Car Setup Matrix" in report.markdown
    assert "Aero Balance" in report.markdown
    assert "Anti-Roll Bars" in report.markdown
    assert "Differential" in report.markdown
    assert "Brake Bias" in report.markdown
