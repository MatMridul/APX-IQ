"""
Intelligence Layer Constants
============================

Centralizes all shared constants for the intelligence layer including:
- Era scope boundaries
- EA Game track_id → FastF1 GP name mapping
- Hardware profile classifications
- Telemetry alignment parameters
"""

# =========================================================================
# ERA SCOPE — Only Ground Effect era data is valid for comparison
# =========================================================================

MIN_YEAR = 2022   # First year of ground-effect regulations
MAX_YEAR = 2026   # Current year — update annually

# Game titles covered by this era scope
SUPPORTED_GAMES = ["F1 22", "F1 23", "F1 24", "F1 25"]


# =========================================================================
# TRACK MAPPING — EA Game track_id (int8) → FastF1 GP identifier
# =========================================================================
# Source: EA F1 UDP Spec appendix + FastF1 event schedule
# NOTE: Track IDs can shift between game versions. This mapping is based
# on F1 22/23/24/25 common IDs. Verify against each game's appendix.

TRACK_MAP = {
    0:  "Bahrain",
    1:  "Jeddah",
    2:  "Melbourne",
    3:  "Baku",
    4:  "Miami",
    5:  "Imola",
    6:  "Monaco",
    7:  "Barcelona",
    8:  "Montreal",
    9:  "Spielberg",        # Austrian GP (Red Bull Ring)
    10: "Silverstone",
    11: "Budapest",         # Hungarian GP (Hungaroring)
    12: "Spa",              # Belgian GP (Spa-Francorchamps)
    13: "Zandvoort",        # Dutch GP
    14: "Monza",            # Italian GP
    15: "Singapore",
    16: "Suzuka",           # Japanese GP
    17: "Lusail",           # Qatar GP
    18: "Austin",           # US GP (COTA)
    19: "Mexico City",      # Mexican GP (Hermanos Rodriguez)
    20: "São Paulo",        # Brazilian GP (Interlagos)
    21: "Las Vegas",
    22: "Abu Dhabi",        # Yas Marina
    # Legacy / rotational circuits
    23: "Shanghai",         # Chinese GP (returned 2024)
    24: "Portimão",         # Portuguese GP (F1 22 only)
    25: "Paul Ricard",      # French GP (F1 22 only)
}

# Reverse mapping for lookups
TRACK_MAP_REVERSE = {v: k for k, v in TRACK_MAP.items()}


# =========================================================================
# SESSION TYPE MAPPING — EA Game session_type → FastF1 session identifier
# =========================================================================

SESSION_TYPE_MAP = {
    0:  "Unknown",
    1:  "FP1",
    2:  "FP2",
    3:  "FP3",
    4:  "FP1",     # Short Practice → map to FP1
    5:  "Q",       # Q1
    6:  "Q",       # Q2
    7:  "Q",       # Q3
    8:  "Q",       # Short Qualifying
    9:  "Q",       # One-Shot Qualifying
    10: "R",       # Race
    11: "R",       # Race 2
    12: "R",       # Race 3
    13: "R",       # Time Trial → treat as Race for comparison
}


# =========================================================================
# HARDWARE PROFILES — Classification tiers for input devices
# =========================================================================

HARDWARE_KEYBOARD = "keyboard"
HARDWARE_CONTROLLER = "controller"
HARDWARE_WHEEL_ENTRY = "wheel_entry"       # e.g., Logitech G29/G923
HARDWARE_WHEEL_MID = "wheel_mid"           # e.g., Thrustmaster T300
HARDWARE_WHEEL_PRO = "wheel_pro"           # e.g., Fanatec DD, Simucube

HARDWARE_TIERS = [
    HARDWARE_KEYBOARD,
    HARDWARE_CONTROLLER,
    HARDWARE_WHEEL_ENTRY,
    HARDWARE_WHEEL_MID,
    HARDWARE_WHEEL_PRO,
]

# Steering derivative variance thresholds for hardware classification
# These are calibrated ranges for the variance of the first derivative
# of the normalized steer signal (-1.0 to 1.0) sampled at ~20Hz.
HARDWARE_VARIANCE_THRESHOLDS = {
    HARDWARE_KEYBOARD:     (0.0,   0.005),  # Binary: jumps from 0 → ±1
    HARDWARE_CONTROLLER:   (0.005, 0.08),   # Stepped, high-frequency noise
    HARDWARE_WHEEL_ENTRY:  (0.08,  0.20),   # Smooth but some deadzone artifacts
    HARDWARE_WHEEL_MID:    (0.20,  0.45),   # Smooth, precise
    HARDWARE_WHEEL_PRO:    (0.45,  1.0),    # Very smooth, ultra-precise
}

# Brake point threshold scaling per hardware tier (meters)
# How much tolerance we give when comparing user vs ghost brake points
BRAKE_THRESHOLD_SCALING = {
    HARDWARE_KEYBOARD:     35,   # Massive tolerance — keyboard braking is binary
    HARDWARE_CONTROLLER:   25,   # High tolerance — analog but limited range
    HARDWARE_WHEEL_ENTRY:  15,   # Moderate tolerance
    HARDWARE_WHEEL_MID:    10,   # Tight
    HARDWARE_WHEEL_PRO:    8,    # Very tight — pro gear, pro expectations
}


# =========================================================================
# ALIGNMENT PARAMETERS — S-Curve distance normalization engine
# =========================================================================

# Number of equidistant points on the common distance grid
# Higher = more precision, lower = faster computation
ALIGNMENT_GRID_POINTS = 1000

# Minimum speed (km/h) to consider a point as a corner apex
CORNER_APEX_SPEED_THRESHOLD = 250

# Minimum prominence (km/h drop) for corner detection via scipy.find_peaks
CORNER_DETECTION_PROMINENCE = 20.0

# Minimum distance between detected corners (meters) to avoid false positives
CORNER_MIN_DISTANCE_BETWEEN = 50


# =========================================================================
# TELEMETRY RECORDING — Game UDP capture settings
# =========================================================================

# Minimum number of laps required before hardware profiling kicks in
HARDWARE_PROFILING_MIN_LAPS = 3

# Maximum buffer size per lap (rows). At 60Hz over a 2-minute lap ≈ 7200 rows.
# We cap at 10000 to prevent memory issues on very long or bugged laps.
MAX_LAP_BUFFER_SIZE = 10000

# Distance threshold (meters) to detect a new lap crossing the start line.
# If lapDistance drops by more than this between ticks, we consider it a new lap.
LAP_CROSSING_DISTANCE_DROP = 100.0
