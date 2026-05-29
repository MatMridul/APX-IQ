"""
APX IQ Intelligence Layer
=========================

The intelligence layer provides real-world F1 telemetry comparison,
hardware-aware coaching, and AI-powered post-race analysis.

Modules:
    constants           - Track maps, hardware profiles, era scope
    fastf1_client       - Real-world F1 telemetry via FastF1
    telemetry_recorder  - Game UDP telemetry recording (distance-indexed)
    alignment           - S-Curve distance normalization engine (Phase 2)
    corner_detector     - Speed-trace corner identification (Phase 2)
    delta_engine        - Performance delta computation (Phase 2)
    hardware_profiler   - Controller/Wheel classification (Phase 3)
    coach_engine        - Rule-based mid-race coaching (Phase 3)
    battle_predictor    - Overtaking window projections (Phase 3)
    report_generator    - GenAI post-race debrief (Phase 4)
"""

__version__ = "0.1.0"
