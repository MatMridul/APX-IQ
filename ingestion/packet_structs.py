import ctypes

# -------------------------------------------------------------------------
# F1 25 UDP Packet Specifications
# Based on: Data Output from F1 25 v3.txt
# Encoding: Little Endian
# -------------------------------------------------------------------------

# Type Aliases for Clarity
uint8 = ctypes.c_uint8
int8 = ctypes.c_int8
uint16 = ctypes.c_uint16
int16 = ctypes.c_int16
uint32 = ctypes.c_uint32
float32 = ctypes.c_float
uint64 = ctypes.c_uint64

class PacketHeader(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_packetFormat', uint16),           # 2025
        ('m_gameYear', uint8),                # Game year - last two digits e.g. 25
        ('m_gameMajorVersion', uint8),        # Game major version - "X.00"
        ('m_gameMinorVersion', uint8),        # Game minor version - "1.XX"
        ('m_packetVersion', uint8),           # Version of this packet type, all start from 1
        ('m_packetId', uint8),                # Identifier for the packet type
        ('m_sessionUID', uint64),             # Unique identifier for the session
        ('m_sessionTime', float32),           # Session timestamp
        ('m_frameIdentifier', uint32),        # Identifier for the frame the data was retrieved on
        ('m_overallFrameIdentifier', uint32), # Overall identifier for the frame
        ('m_playerCarIndex', uint8),          # Index of player's car in the array
        ('m_secondaryPlayerCarIndex', uint8), # Index of secondary player's car in the array (splitscreen)
    ]

# Packet IDs
PACKET_ID_MOTION = 0
PACKET_ID_SESSION = 1
PACKET_ID_LAP_DATA = 2
PACKET_ID_EVENT = 3
PACKET_ID_PARTICIPANTS = 4
PACKET_ID_CAR_SETUPS = 5
PACKET_ID_CAR_TELEMETRY = 6
PACKET_ID_CAR_STATUS = 7
PACKET_ID_FINAL_CLASSIFICATION = 8
PACKET_ID_LOBBY_INFO = 9
PACKET_ID_CAR_DAMAGE = 10
PACKET_ID_SESSION_HISTORY = 11
PACKET_ID_TYRE_SETS = 12
PACKET_ID_MOTION_EX = 13
PACKET_ID_TIME_TRIAL = 14
PACKET_ID_LAP_POSITIONS = 15

# -------------------------------------------------------------------------
# Motion Packet (ID=0)
# -------------------------------------------------------------------------

class CarMotionData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_worldPositionX', float32),      # World space X position - metres
        ('m_worldPositionY', float32),      # World space Y position
        ('m_worldPositionZ', float32),      # World space Z position
        ('m_worldVelocityX', float32),      # Velocity in world space X – metres/s
        ('m_worldVelocityY', float32),      # Velocity in world space Y
        ('m_worldVelocityZ', float32),      # Velocity in world space Z
        ('m_worldForwardDirX', int16),      # World space forward X direction (normalised x 32767)
        ('m_worldForwardDirY', int16),      # World space forward Y direction (normalised x 32767)
        ('m_worldForwardDirZ', int16),      # World space forward Z direction (normalised x 32767)
        ('m_worldRightDirX', int16),        # World space right X direction (normalised x 32767)
        ('m_worldRightDirY', int16),        # World space right Y direction (normalised x 32767)
        ('m_worldRightDirZ', int16),        # World space right Z direction (normalised x 32767)
        ('m_gForceLateral', float32),       # Lateral G-Force component
        ('m_gForceLongitudinal', float32),  # Longitudinal G-Force component
        ('m_gForceVertical', float32),      # Vertical G-Force component
        ('m_yaw', float32),                 # Yaw angle in radians
        ('m_pitch', float32),               # Pitch angle in radians
        ('m_roll', float32),                # Roll angle in radians
    ]

class PacketMotionData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),              # Header
        ('m_carMotionData', CarMotionData * 22), # Data for all cars on track
    ]

# -------------------------------------------------------------------------
# Lap Data Packet (ID=2)
# -------------------------------------------------------------------------

class LapData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_lastLapTimeInMS', uint32),             # Last lap time in milliseconds
        ('m_currentLapTimeInMS', uint32),          # Current time around the lap in milliseconds
        ('m_sector1TimeMSPart', uint16),           # Sector 1 time milliseconds part
        ('m_sector1TimeMinutesPart', uint8),       # Sector 1 whole minute part
        ('m_sector2TimeMSPart', uint16),           # Sector 2 time milliseconds part
        ('m_sector2TimeMinutesPart', uint8),       # Sector 2 whole minute part
        ('m_deltaToCarInFrontMSPart', uint16),     # Time delta to car in front milliseconds part
        ('m_deltaToCarInFrontMinutesPart', uint8), # Time delta to car in front whole minute part
        ('m_deltaToRaceLeaderMSPart', uint16),     # Time delta to race leader milliseconds part
        ('m_deltaToRaceLeaderMinutesPart', uint8), # Time delta to race leader whole minute part
        ('m_lapDistance', float32),                # Distance vehicle is around current lap in metres
        ('m_totalDistance', float32),              # Total distance travelled in session in metres
        ('m_safetyCarDelta', float32),             # Delta in seconds for safety car
        ('m_carPosition', uint8),                  # Car race position
        ('m_currentLapNum', uint8),                # Current lap number
        ('m_pitStatus', uint8),                    # 0 = none, 1 = pitting, 2 = in pit area
        ('m_numPitStops', uint8),                  # Number of pit stops taken in this race
        ('m_sector', uint8),                       # 0 = sector1, 1 = sector2, 2 = sector3
        ('m_currentLapInvalid', uint8),            # Current lap invalid - 0 = valid, 1 = invalid
        ('m_penalties', uint8),                    # Accumulated time penalties in seconds to be added
        ('m_totalWarnings', uint8),                # Accumulated number of warnings issued
        ('m_cornerCuttingWarnings', uint8),        # Accumulated number of corner cutting warnings issued
        ('m_numUnservedDriveThroughPens', uint8),  # Num drive through pens left to serve
        ('m_numUnservedStopGoPens', uint8),        # Num stop go pens left to serve
        ('m_gridPosition', uint8),                 # Grid position the vehicle started the race in
        ('m_driverStatus', uint8),                 # Status of driver - 0 = in garage, 1 = flying lap...
        ('m_resultStatus', uint8),                 # Result status - 0 = invalid, 1 = inactive, 2 = active...
        ('m_pitLaneTimerActive', uint8),           # Pit lane timing, 0 = inactive, 1 = active
        ('m_pitLaneTimeInLaneInMS', uint16),       # If active, the current time spent in the pit lane in ms
        ('m_pitStopTimerInMS', uint16),            # Time of the actual pit stop in ms
        ('m_pitStopShouldServePen', uint8),        # Whether the car should serve a penalty at this stop
        ('m_speedTrapFastestSpeed', float32),      # Fastest speed through speed trap for this car in kmph
        ('m_speedTrapFastestLap', uint8),          # Lap no the fastest speed was achieved, 255 = not set
    ]

class PacketLapData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),              # Header
        ('m_lapData', LapData * 22),             # Lap data for all cars on track
        ('m_timeTrialPBCarIdx', uint8),          # Index of Personal Best car in time trial (255 if invalid)
        ('m_timeTrialRivalCarIdx', uint8),       # Index of Rival car in time trial (255 if invalid)
    ]

# -------------------------------------------------------------------------
# Car Telemetry Packet (ID=6)
# -------------------------------------------------------------------------

class CarTelemetryData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_speed', uint16),                     # Speed of car in kilometres per hour
        ('m_throttle', float32),                 # Amount of throttle applied (0.0 to 1.0)
        ('m_steer', float32),                    # Steering (-1.0 (full lock left) to 1.0 (full lock right))
        ('m_brake', float32),                    # Amount of brake applied (0.0 to 1.0)
        ('m_clutch', uint8),                     # Amount of clutch applied (0 to 100)
        ('m_gear', int8),                        # Gear selected (1-8, N=0, R=-1)
        ('m_engineRPM', uint16),                 # Engine RPM
        ('m_drs', uint8),                        # 0 = off, 1 = on
        ('m_revLightsPercent', uint8),           # Rev lights indicator (percentage)
        ('m_revLightsBitValue', uint16),         # Rev lights (bit 0 = leftmost LED, bit 14 = rightmost LED)
        ('m_brakesTemperature', uint16 * 4),     # Brakes temperature (celsius)
        ('m_tyresSurfaceTemperature', uint8 * 4),# Tyres surface temperature (celsius)
        ('m_tyresInnerTemperature', uint8 * 4),  # Tyres inner temperature (celsius)
        ('m_engineTemperature', uint16),         # Engine temperature (celsius)
        ('m_tyresPressure', float32 * 4),        # Tyres pressure (PSI)
        ('m_surfaceType', uint8 * 4),            # Driving surface, see appendices
    ]

class PacketCarTelemetryData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),                    # Header
        ('m_carTelemetryData', CarTelemetryData * 22), # Telemetry data for all cars
        ('m_mfdPanelIndex', uint8),                    # Index of MFD panel open - 255 = MFD closed
        ('m_mfdPanelIndexSecondaryPlayer', uint8),     # Index of MFD panel open - 255 = MFD closed
        ('m_suggestedGear', int8),                     # Suggested gear for the player (1-8, N=0, R=-1)
    ]
