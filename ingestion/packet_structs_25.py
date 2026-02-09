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
        ('m_header', PacketHeader),              # Header
        ('m_carTelemetryData', CarTelemetryData * 22), # Telemetry data for all cars
        ('m_mfdPanelIndex', uint8),              # Index of MFD panel open - 255 = MFD closed
                                                 # Single player, race – 0 = Car setup, 1 = Pits
                                                 # 2 = Damage, 3 =  Engine, 4 = Temperatures
                                                 # May vary depending on game mode
        ('m_mfdPanelIndexSecondaryPlayer', uint8), # See above
        ('m_suggestedGear', int8),               # Suggested gear for the player (1-8)
                                                 # 0 if no gear suggested
    ]

# -------------------------------------------------------------------------
# Session Packet (ID=1)
# -------------------------------------------------------------------------

class MarshalZone(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_zoneStart', float32),   # Fraction (0..1) of way through the lap the marshal zone starts
        ('m_zoneFlag', int8),       # -1 = invalid/unknown, 0 = none, 1 = green, 2 = blue, 3 = yellow, 4 = red
    ]

class WeatherForecastSample(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_sessionType', uint8),       # 0 = unknown, 1 = P1, 2 = P2, 3 = P3, 4 = Short P, 5 = Q1
                                        # 6 = Q2, 7 = Q3, 8 = Short Q, 9 = OSQ, 10 = R, 11 = R2
                                        # 12 = R3, 13 = Time Trial
        ('m_timeOffset', uint8),        # Time in minutes the forecast is for
        ('m_weather', uint8),           # Weather - 0 = clear, 1 = light cloud, 2 = overcast
                                        # 3 = light rain, 4 = heavy rain, 5 = storm
        ('m_trackTemperature', int8),   # Track temp. in degrees Celsius
        ('m_trackTemperatureChange', int8), # Track temp. change – 0 = up, 1 = down, 2 = no change
        ('m_airTemperature', int8),     # Air temp. in degrees celsius
        ('m_airTemperatureChange', int8), # Air temp. change – 0 = up, 1 = down, 2 = no change
        ('m_rainPercentage', uint8),    # Rain percentage (0-100)
    ]

class PacketSessionData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),             # Header
        ('m_weather', uint8),                   # Weather - 0 = clear, 1 = light cloud, 2 = overcast
                                                # 3 = light rain, 4 = heavy rain, 5 = storm
        ('m_trackTemperature', int8),           # Track temp. in degrees celsius
        ('m_airTemperature', int8),             # Air temp. in degrees celsius
        ('m_totalLaps', uint8),                 # Total number of laps in this race
        ('m_trackLength', uint16),              # Track length in metres
        ('m_sessionType', uint8),               # 0 = unknown, 1 = P1, 2 = P2, 3 = P3, 4 = Short P
                                                # 5 = Q1, 6 = Q2, 7 = Q3, 8 = Short Q, 9 = OSQ
                                                # 10 = R, 11 = R2, 12 = R3, 13 = Time Trial
        ('m_trackId', int8),                    # -1 for unknown, see appendix
        ('m_formula', uint8),                   # Formula, 0 = F1 Modern, 1 = F1 Classic, 2 = F2,
                                                # 3 = F1 Generic, 4 = Beta, 5 = Supercars
                                                # 6 = Esports, 7 = F2 2021
        ('m_sessionTimeLeft', uint16),          # Time left in session in seconds
        ('m_sessionDuration', uint16),          # Session duration in seconds
        ('m_pitSpeedLimit', uint8),             # Pit speed limit in kilometres per hour
        ('m_gamePaused', uint8),                # Whether the game is paused – network game only
        ('m_isSpectating', uint8),              # Whether the player is spectating
        ('m_spectatorCarIndex', uint8),         # Index of the car being spectated
        ('m_sliProNativeSupport', uint8),       # SLI Pro support, 0 = inactive, 1 = active
        ('m_numMarshalZones', uint8),           # Number of marshal zones to follow
        ('m_marshalZones', MarshalZone * 21),   # List of marshal zones – max 21
        ('m_safetyCarStatus', uint8),           # 0 = no safety car, 1 = full, 2 = virtual, 3 = formation lap
        ('m_networkGame', uint8),               # 0 = offline, 1 = online
        ('m_numWeatherForecastSamples', uint8), # Number of weather samples to follow
        ('m_weatherForecastSamples', WeatherForecastSample * 64), # Array of weather forecast samples (Increased to 64 in F1 25)
        ('m_forecastAccuracy', uint8),          # 0 = Perfect, 1 = Approximate
        ('m_aiDifficulty', uint8),              # AI Difficulty rating – 0-110
        ('m_seasonLinkIdentifier', uint32),     # Identifier for season - persists across saves
        ('m_weekendLinkIdentifier', uint32),    # Identifier for weekend - persists across saves
        ('m_sessionLinkIdentifier', uint32),    # Identifier for session - persists across saves
        ('m_pitStopWindowIdealLap', uint8),     # Ideal lap to pit on for current strategy (player)
        ('m_pitStopWindowLatestLap', uint8),    # Latest lap to pit on for current strategy (player)
        ('m_pitStopRejoinPosition', uint8),     # Predicted position to rejoin at (player)
        ('m_steeringAssist', uint8),            # 0 = off, 1 = on
        ('m_brakingAssist', uint8),             # 0 = off, 1 = low, 2 = medium, 3 = high
        ('m_gearboxAssist', uint8),             # 1 = manual, 2 = manual & suggested gear, 3 = auto
        ('m_pitAssist', uint8),                 # 0 = off, 1 = on
        ('m_pitReleaseAssist', uint8),          # 0 = off, 1 = on
        ('m_ERSAssist', uint8),                 # 0 = off, 1 = on
        ('m_DRSAssist', uint8),                 # 0 = off, 1 = on
        ('m_dynamicRacingLine', uint8),         # 0 = off, 1 = corners only, 2 = full
        ('m_dynamicRacingLineType', uint8),     # 0 = 2D, 1 = 3D
        ('m_gameMode', uint8),                  # Game mode id - see appendix
        ('m_ruleSet', uint8),                   # Ruleset - see appendix
        ('m_timeOfDay', uint32),                # Local time of day - minutes since midnight
        ('m_sessionLength', uint8),             # 0 = None, 2 = Very Short, 3 = Short, 4 = Medium
                                                # 5 = Medium Long, 6 = Long, 7 = Full
        ('m_speedUnitsLeadMember', uint8),      # 0 = MPH, 1 = KPH
        ('m_temperatureUnitsLeadMember', uint8),# 0 = Celsius, 1 = Fahrenheit
        ('m_speedUnitsSecondaryPlayer', uint8), # 0 = MPH, 1 = KPH
        ('m_temperatureUnitsSecondaryPlayer', uint8),# 0 = Celsius, 1 = Fahrenheit
        ('m_numSafetyCarPeriods', uint8),       # Num safety car periods in this race
        ('m_numVirtualSafetyCarPeriods', uint8),# Num virtual safety car periods in this race
        ('m_numRedFlagPeriods', uint8),         # Num red flag periods in this race
        ('m_equalCarPerformance', uint8),       # 1 if cars has equal performance, 0 if real
        ('m_recoveryMode', uint8),              # 0 = None, 1 = Flashbacks, 2 = Auto-recovery
        ('m_flashbackLimit', uint8),            # 0 = Low, 1 = Medium, 2 = High, 3 = Unlimited
        ('m_surfaceType', uint8),               # 0 = Simplified, 1 = Realistic
        ('m_lowFuelMode', uint8),               # 0 = Off, 1 = On
        ('m_raceStarts', uint8),                # 0 = Manual, 1 = Assisted
        ('m_tyreTemperature', uint8),           # 0 = Surface only, 1 = Surface & Carcass
        ('m_pitLaneTyreSim', uint8),            # 0 = On, 1 = Off
        ('m_carDamage', uint8),                 # 0 = Off, 1 = Reduced, 2 = Standard, 3 = Simulation
        ('m_carDamageRate', uint8),             # 0 = Reduced, 1 = Standard, 2 = Simulation
        ('m_collisions', uint8),                # 0 = Off, 1 = Player-to-Player Off, 2 = On
        ('m_collisionsOffForFirstLapOnly', uint8), # 0 = Disabled, 1 = Enabled
        ('m_mpUnsafePitRelease', uint8),        # 0 = On, 1 = Off (Multiplayer)
        ('m_mpOffForGriefing', uint8),          # 0 = Disabled, 1 = Enabled (Multiplayer)
        ('m_cornerCuttingStringency', uint8),   # 0 = Regular, 1 = Strict
        ('m_parcFermeRules', uint8),            # 0 = Off, 1 = On
        ('m_pitStopExperience', uint8),         # 0 = Automatic, 1 = Broadcast, 2 = Immersive
        ('m_safetyCar', uint8),                 # 0 = Off, 1 = Reduced, 2 = Standard, 3 = Increased
        ('m_safetyCarExperience', uint8),       # 0 = Broadcast, 1 = Immersive
        ('m_formationLap', uint8),              # 0 = Off, 1 = On
        ('m_formationLapExperience', uint8),    # 0 = Broadcast, 1 = Immersive
        ('m_redFlags', uint8),                  # 0 = Off, 1 = Reduced, 2 = Standard, 3 = Increased
        ('m_affectsLicence', uint8),            # 0 = Off, 1 = On
        ('m_weekendStructure', uint8),          # 0 = Standard, 1 = Sprint (F1 24+)
        ('m_sector2LapDistanceStart', float32), # Distance in m where Sector 2 starts
        ('m_sector3LapDistanceStart', float32), # Distance in m where Sector 3 starts
    ]

# -------------------------------------------------------------------------
# Participants Packet (ID=4)
# -------------------------------------------------------------------------

class LiveryColour(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_red', uint8),
        ('m_green', uint8),
        ('m_blue', uint8),
    ]

class ParticipantData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_aiControlled', uint8),          # Whether the vehicle is AI (1) or Human (0) controlled
        ('m_driverId', uint8),              # Driver id - see appendix, 255 if network human
        ('m_networkId', uint8),             # Network id – unique identifier for network players
        ('m_teamId', uint8),                # Team id - see appendix
        ('m_myTeam', uint8),                # My team flag – 1 = My Team, 0 = otherwise
        ('m_raceNumber', uint8),            # Race number of the car
        ('m_nationality', uint8),           # Nationality of the driver
        ('m_name', ctypes.c_char * 32),     # Name of participant in UTF-8 format – null terminated (Reduced to 32 in F1 25)
        ('m_yourTelemetry', uint8),         # The player's UDP setting, 0 = restricted, 1 = public
        ('m_showOnlineNames', uint8),       # 0 = No, 1 = Yes
        ('m_platform', uint8),              # 1 = Steam, 2 = PlayStation, 3 = Xbox, 4 = Origin, 6 = F1World/EA
        ('m_numColours', uint8),            # Number of livery colours (max 4)
        ('m_liveryColours', LiveryColour * 4), # Livery colours
    ]

class PacketParticipantsData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),             # Header
        ('m_numActiveCars', uint8),             # Number of active cars in the data
        ('m_participants', ParticipantData * 22), 
    ]

# -------------------------------------------------------------------------
# Car Status Packet (ID=7)
# -------------------------------------------------------------------------

class CarStatusData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_tractionControl', uint8),           # Traction control - 0 = off, 1 = medium, 2 = full
        ('m_antiLockBrakes', uint8),            # 0 (off) - 1 (on)
        ('m_fuelMix', uint8),                   # Fuel mix - 0 = lean, 1 = standard, 2 = rich, 3 = max
        ('m_frontBrakeBias', uint8),            # Front brake bias (percentage)
        ('m_pitLimiterStatus', uint8),          # Pit limiter status - 0 = off, 1 = on
        ('m_fuelInTank', float32),              # Current fuel mass
        ('m_fuelCapacity', float32),            # Fuel capacity
        ('m_fuelRemainingLaps', float32),       # Fuel remaining in terms of laps (value on MFD)
        ('m_maxRPM', uint16),                   # Cars max RPM, point of rev limiter
        ('m_idleRPM', uint16),                  # Cars idle RPM
        ('m_maxGears', uint8),                  # Maximum number of gears
        ('m_drsAllowed', uint8),                # 0 = not allowed, 1 = allowed
        ('m_drsActivationDistance', uint16),    # 0 = DRS not available, non-zero - DRS will be available...
        ('m_actualTyreCompound', uint8),        # F1 Modern - 16 = C5, 17 = C4, 18 = C3, 19 = C2, 20 = C1
                                                # 21 = C0, 7 = Inter, 8 = Wet
                                                # F1 Classic - 9 = Dry, 10 = Wet
                                                # F2 – 11 = Super Soft, 12 = Soft, 13 = Medium, 14 = Hard
                                                # 15 = Wet
        ('m_visualTyreCompound', uint8),        # F1 visual (can be different from actual depending on game mode)
        ('m_tyresAgeLaps', uint8),              # Age in laps of the current set of tyres
        ('m_vehicleFiaFlags', int8),            # -1 = invalid/unknown, 0 = none, 1 = green
                                                # 2 = blue, 3 = yellow, 4 = red
        ('m_ersStoreEnergy', float32),          # ERS energy store in Joules
        ('m_ersDeployMode', uint8),             # ERS deployment mode, 0 = none, 1 = medium
                                                # 2 = hotlap, 3 = overtake
        ('m_ersHarvestedThisLapMGUK', float32), # ERS energy harvested this lap by MGU-K
        ('m_ersHarvestedThisLapMGUH', float32), # ERS energy harvested this lap by MGU-H
        ('m_ersDeployedThisLap', float32),      # ERS energy deployed this lap
        ('m_networkPaused', uint8),             # Whether the car is paused in a network game
    ]

class PacketCarStatusData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),             # Header
        ('m_carStatusData', CarStatusData * 22) # Car status data for all cars
    ]
