import ctypes

# -------------------------------------------------------------------------
# F1 22 UDP Packet Specifications
# Based on: Data Output from F1 22 v16.txt
# Encoding: Little Endian
# -------------------------------------------------------------------------

# Type Aliases
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
        ('m_packetFormat', uint16),           # 2022
        ('m_gameMajorVersion', uint8),        # Game major version - "X.00"
        ('m_gameMinorVersion', uint8),        # Game minor version - "1.XX"
        ('m_packetVersion', uint8),           # Version of this packet type, all start from 1
        ('m_packetId', uint8),                # Identifier for the packet type
        ('m_sessionUID', uint64),             # Unique identifier for the session
        ('m_sessionTime', float32),           # Session timestamp
        ('m_frameIdentifier', uint32),        # Identifier for the frame the data was retrieved on
        ('m_playerCarIndex', uint8),          # Index of player's car in the array
        ('m_secondaryPlayerCarIndex', uint8), # Index of secondary player's car in the array (splitscreen)
    ]

# Packet IDs (Same for 22 and 25 most likely, but good to preserve)
# Packet IDs (Same for 22 and 25 most likely, but good to preserve)
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

# -------------------------------------------------------------------------
# Motion Packet (ID=0)
# -------------------------------------------------------------------------

class CarMotionData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_worldPositionX', float32),      
        ('m_worldPositionY', float32),      
        ('m_worldPositionZ', float32),      
        ('m_worldVelocityX', float32),      
        ('m_worldVelocityY', float32),      
        ('m_worldVelocityZ', float32),      
        ('m_worldForwardDirX', int16),      
        ('m_worldForwardDirY', int16),      
        ('m_worldForwardDirZ', int16),      
        ('m_worldRightDirX', int16),        
        ('m_worldRightDirY', int16),        
        ('m_worldRightDirZ', int16),        
        ('m_gForceLateral', float32),       
        ('m_gForceLongitudinal', float32),  
        ('m_gForceVertical', float32),      
        ('m_yaw', float32),                 
        ('m_pitch', float32),               
        ('m_roll', float32),                
    ]

class PacketMotionData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),              
        ('m_carMotionData', CarMotionData * 22), 
        # Extra player car ONLY data (F1 22 Specific)
        ('m_suspensionPosition', float32 * 4),
        ('m_suspensionVelocity', float32 * 4),
        ('m_suspensionAcceleration', float32 * 4),
        ('m_wheelSpeed', float32 * 4),
        ('m_wheelSlip', float32 * 4),
        ('m_localVelocityX', float32),
        ('m_localVelocityY', float32),
        ('m_localVelocityZ', float32),
        ('m_angularVelocityX', float32),
        ('m_angularVelocityY', float32),
        ('m_angularVelocityZ', float32),
        ('m_angularAccelerationX', float32),
        ('m_angularAccelerationY', float32),
        ('m_angularAccelerationZ', float32),
        ('m_frontWheelsAngle', float32),
    ]

# -------------------------------------------------------------------------
# Lap Data Packet (ID=2)
# -------------------------------------------------------------------------

class LapData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_lastLapTimeInMS', uint32),             
        ('m_currentLapTimeInMS', uint32),          
        ('m_sector1TimeInMS', uint16),             # Diff from 25 (was split)
        ('m_sector2TimeInMS', uint16),             # Diff from 25
        ('m_lapDistance', float32),                
        ('m_totalDistance', float32),              
        ('m_safetyCarDelta', float32),             
        ('m_carPosition', uint8),                  
        ('m_currentLapNum', uint8),                
        ('m_pitStatus', uint8),                    
        ('m_numPitStops', uint8),                  
        ('m_sector', uint8),                       
        ('m_currentLapInvalid', uint8),            
        ('m_penalties', uint8),                    
        ('m_warnings', uint8),                     # Diff from 25 (name change)
        ('m_numUnservedDriveThroughPens', uint8),  
        ('m_numUnservedStopGoPens', uint8),        
        ('m_gridPosition', uint8),                 
        ('m_driverStatus', uint8),                 
        ('m_resultStatus', uint8),                 
        ('m_pitLaneTimerActive', uint8),           
        ('m_pitLaneTimeInLaneInMS', uint16),       
        ('m_pitStopTimerInMS', uint16),            
        ('m_pitStopShouldServePen', uint8),        
    ]

class PacketLapData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),              
        ('m_lapData', LapData * 22),             
        ('m_timeTrialPBCarIdx', uint8),          
        ('m_timeTrialRivalCarIdx', uint8),       
    ]

# -------------------------------------------------------------------------
# Car Telemetry Packet (ID=6)
# -------------------------------------------------------------------------

class CarTelemetryData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_speed', uint16),                     
        ('m_throttle', float32),                 
        ('m_steer', float32),                    
        ('m_brake', float32),                    
        ('m_clutch', uint8),                     
        ('m_gear', int8),                        
        ('m_engineRPM', uint16),                 
        ('m_drs', uint8),                        
        ('m_revLightsPercent', uint8),           
        ('m_revLightsBitValue', uint16),         
        ('m_brakesTemperature', uint16 * 4),     
        ('m_tyresSurfaceTemperature', uint8 * 4),
        ('m_tyresInnerTemperature', uint8 * 4),  
        ('m_engineTemperature', uint16),         
        ('m_tyresPressure', float32 * 4),        
        ('m_surfaceType', uint8 * 4),            
    ]

class PacketCarTelemetryData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),                    
        ('m_carTelemetryData', CarTelemetryData * 22), 
        ('m_mfdPanelIndex', uint8),                    
        ('m_mfdPanelIndexSecondaryPlayer', uint8),     

        ('m_suggestedGear', int8),                     
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
        ('m_weatherForecastSamples', WeatherForecastSample * 56), # Array of weather forecast samples
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
    ]

# -------------------------------------------------------------------------
# Event Packet (ID=3)
# -------------------------------------------------------------------------

class PacketEventData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),             # Header
        ('m_eventStringCode', uint8 * 4),       # Event string code, see below
        # Event Details - Union of different event data types
        # NOTE: For simplicity in Python, we might just expose the raw bytes 
        # or define specific unions if needed. For now just capturing the generic structure
        # The union is max 8 bytes based on the spec
        ('m_eventDetails', uint8 * 8),          
    ]

# -------------------------------------------------------------------------
# Participants Packet (ID=4)
# -------------------------------------------------------------------------

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
        ('m_name', ctypes.c_char * 48),     # Name of participant in UTF-8 format – null terminated
                                            # Will be truncated with … (U+2026) if too long
        ('m_yourTelemetry', uint8),         # The player's UDP setting, 0 = restricted, 1 = public
    ]

class PacketParticipantsData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),             # Header
        ('m_numActiveCars', uint8),             # Number of active cars in the data – should match number of
                                                # cars on HUD
        ('m_participants', ParticipantData * 22), 
    ]

# -------------------------------------------------------------------------
# Car Setup Packet (ID=5)
# -------------------------------------------------------------------------

class CarSetupData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_frontWing', uint8),             # Front wing aero
        ('m_rearWing', uint8),              # Rear wing aero
        ('m_onThrottle', uint8),            # Differential adjustment on throttle (percentage)
        ('m_offThrottle', uint8),           # Differential adjustment off throttle (percentage)
        ('m_frontCamber', float32),         # Front camber angle (suspension geometry)
        ('m_rearCamber', float32),          # Rear camber angle (suspension geometry)
        ('m_frontToe', float32),            # Front toe angle (suspension geometry)
        ('m_rearToe', float32),             # Rear toe angle (suspension geometry)
        ('m_frontSuspension', uint8),       # Front suspension
        ('m_rearSuspension', uint8),        # Rear suspension
        ('m_frontAntiRollBar', uint8),      # Front anti-roll bar
        ('m_rearAntiRollBar', uint8),       # Rear anti-roll bar
        ('m_frontSuspensionHeight', uint8), # Front ride height
        ('m_rearSuspensionHeight', uint8),  # Rear ride height
        ('m_brakePressure', uint8),         # Brake pressure (percentage)
        ('m_brakeBias', uint8),             # Brake bias (percentage)
        ('m_rearLeftTyrePressure', float32), # Rear left tyre pressure (PSI)
        ('m_rearRightTyrePressure', float32), # Rear right tyre pressure (PSI)
        ('m_frontLeftTyrePressure', float32), # Front left tyre pressure (PSI)
        ('m_frontRightTyrePressure', float32), # Front right tyre pressure (PSI)
        ('m_ballast', uint8),               # Ballast
        ('m_fuelLoad', float32),            # Fuel load
    ]

class PacketCarSetupData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),             # Header
        ('m_carSetups', CarSetupData * 22),
    ]

# -------------------------------------------------------------------------
# Car Status Packet (ID=7)
# -------------------------------------------------------------------------

class CarStatusData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_tractionControl', uint8),          # Traction control - 0 = off, 1 = medium, 2 = full
        ('m_antiLockBrakes', uint8),           # 0 (off) - 1 (on)
        ('m_fuelMix', uint8),                  # Fuel mix - 0 = lean, 1 = standard, 2 = rich, 3 = max
        ('m_frontBrakeBias', uint8),           # Front brake bias (percentage)
        ('m_pitLimiterStatus', uint8),         # Pit limiter status - 0 = off, 1 = on
        ('m_fuelInTank', float32),             # Current fuel mass
        ('m_fuelCapacity', float32),           # Fuel capacity
        ('m_fuelRemainingLaps', float32),      # Fuel remaining in terms of laps (value on MFD)
        ('m_maxRPM', uint16),                  # Cars max RPM, point of rev limiter
        ('m_idleRPM', uint16),                 # Cars idle RPM
        ('m_maxGears', uint8),                 # Maximum number of gears
        ('m_drsAllowed', uint8),               # 0 = not allowed, 1 = allowed
        ('m_drsActivationDistance', uint16),   # 0 = DRS not available, non-zero - DRS will be available
                                               # in [X] metres
        ('m_actualTyreCompound', uint8),       # F1 Modern - 16 = C5, 17 = C4, 18 = C3, 19 = C2, 20 = C1
                                               # 7 = inter, 8 = wet
                                               # F1 Classic - 9 = dry, 10 = wet
                                               # F2 – 11 = super soft, 12 = soft, 13 = medium, 14 = hard
                                               # 15 = wet
        ('m_visualTyreCompound', uint8),       # F1 visual (can be different from actual if same compound)
                                               # 16 = soft, 17 = medium, 18 = hard, 7 = inter, 8 = wet
                                               # F1 Classic – same as above
                                               # F2 ‘19, 15 = wet, 19 – super soft, 20 = soft
                                               # 21 = medium , 22 = hard
        ('m_tyresAgeLaps', uint8),             # Age in laps of the current set of tyres
        ('m_vehicleFiaFlags', int8),           # -1 = invalid/unknown, 0 = none, 1 = green
                                               # 2 = blue, 3 = yellow, 4 = red
        ('m_ersStoreEnergy', float32),         # ERS energy store in Joules
        ('m_ersDeployMode', uint8),            # ERS deployment mode, 0 = none, 1 = medium
                                               # 2 = hotlap, 3 = overtake
        ('m_ersHarvestedThisLapMGUK', float32),# ERS energy harvested this lap by MGU-K
        ('m_ersHarvestedThisLapMGUH', float32),# ERS energy harvested this lap by MGU-H
        ('m_ersDeployedThisLap', float32),     # ERS energy deployed this lap
        ('m_networkPaused', uint8),            # Whether the car is paused in a network game
    ]

class PacketCarStatusData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),             # Header
        ('m_carStatusData', CarStatusData * 22),
    ]

# -------------------------------------------------------------------------
# Final Classification Packet (ID=8)
# -------------------------------------------------------------------------

class FinalClassificationData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_position', uint8),              # Finishing position
        ('m_numLaps', uint8),               # Number of laps completed
        ('m_gridPosition', uint8),          # Grid position of the car
        ('m_points', uint8),                # Number of points scored
        ('m_numPitStops', uint8),           # Number of pit stops made
        ('m_resultStatus', uint8),          # Result status - 0 = invalid, 1 = inactive, 2 = active
                                            # 3 = finished, 4 = didnotfinish, 5 = disqualified
                                            # 6 = not classified, 7 = retired
        ('m_bestLapTimeInMS', uint32),      # Best lap time of the session in milliseconds
        ('m_totalRaceTime', float32),       # Total race time in seconds without penalties
        ('m_penaltiesTime', uint8),         # Total penalties accumulated in seconds
        ('m_numPenalties', uint8),          # Number of penalties applied to this driver
        ('m_numTyreStints', uint8),         # Number of tyre stints up to maximum
        ('m_tyreStintsActual', uint8 * 8),  # Actual tyres used by this driver
        ('m_tyreStintsVisual', uint8 * 8),  # Visual tyres used by this driver
        ('m_tyreStintsEndLaps', uint8 * 8), # The lap number stints end on
    ]

class PacketFinalClassificationData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),             # Header
        ('m_numCars', uint8),                   # Number of cars in the final classification
        ('m_classificationData', FinalClassificationData * 22),
    ]

# -------------------------------------------------------------------------
# Lobby Info Packet (ID=9)
# -------------------------------------------------------------------------

class LobbyInfoData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_aiControlled', uint8),      # Whether the vehicle is AI (1) or Human (0) controlled
        ('m_teamId', uint8),            # Team id - see appendix
        ('m_nationality', uint8),       # Nationality of the driver
        ('m_name', ctypes.c_char * 48), # Name of participant in UTF-8 format – null terminated
        ('m_carNumber', uint8),         # Car number of the player
        ('m_readyStatus', uint8),       # 0 = not ready, 1 = ready, 2 = spectating
    ]

class PacketLobbyInfoData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),             # Header
        ('m_numPlayers', uint8),                # Number of players in the lobby data
        ('m_lobbyPlayers', LobbyInfoData * 22),
    ]

# -------------------------------------------------------------------------
# Car Damage Packet (ID=10)
# -------------------------------------------------------------------------

class CarDamageData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_tyresWear', float32 * 4),           # Tyre wear percentage
        ('m_tyresDamage', uint8 * 4),           # Tyre damage percentage
        ('m_brakesDamage', uint8 * 4),          # Brakes damage percentage
        ('m_frontLeftWingDamage', uint8),       # Front left wing damage percentage
        ('m_frontRightWingDamage', uint8),      # Front right wing damage percentage
        ('m_rearWingDamage', uint8),            # Rear wing damage percentage
        ('m_floorDamage', uint8),               # Floor damage percentage
        ('m_diffuserDamage', uint8),            # Diffuser damage percentage
        ('m_sidepodDamage', uint8),             # Sidepod damage percentage
        ('m_drsFault', uint8),                  # Indicator for DRS fault, 0 = OK, 1 = fault
        ('m_ersFault', uint8),                  # Indicator for ERS fault, 0 = OK, 1 = fault
        ('m_gearBoxDamage', uint8),             # Gear box damage percentage
        ('m_engineDamage', uint8),              # Engine damage percentage
        ('m_engineMGUHWear', uint8),            # Engine MGU-H wear percentage
        ('m_engineESWear', uint8),              # Engine ES wear percentage
        ('m_engineCEWear', uint8),              # Engine CE wear percentage
        ('m_engineICEWear', uint8),             # Engine ICE wear percentage
        ('m_engineMGUKWear', uint8),            # Engine MGU-K wear percentage
        ('m_engineTCWear', uint8),              # Engine TC wear percentage
        ('m_engineBlown', uint8),               # Engine blown, 0 = OK, 1 = fault
        ('m_engineSeized', uint8),              # Engine seized, 0 = OK, 1 = fault
    ]

class PacketCarDamageData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),             # Header
        ('m_carDamageData', CarDamageData * 22),
    ]

# -------------------------------------------------------------------------
# Session History Packet (ID=11)
# -------------------------------------------------------------------------

class LapHistoryData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_lapTimeInMS', uint32),          # Lap time in milliseconds
        ('m_sector1TimeInMS', uint16),      # Sector 1 time in milliseconds
        ('m_sector2TimeInMS', uint16),      # Sector 2 time in milliseconds
        ('m_sector3TimeInMS', uint16),      # Sector 3 time in milliseconds
        ('m_lapValidBitFlags', uint8),      # 0x01 bit set-lap valid,      0x02 bit set-sector 1 valid
                                            # 0x04 bit set-sector 2 valid, 0x08 bit set-sector 3 valid
    ]

class TyreStintHistoryData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_endLap', uint8),                # Lap the tyre usage ends on (255 of current stint)
        ('m_tyreActualCompound', uint8),    # Actual tyres used by this driver
        ('m_tyreVisualCompound', uint8),    # Visual tyres used by this driver
    ]

class PacketSessionHistoryData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),             # Header
        ('m_carIdx', uint8),                    # Index of the car this session history is for
        ('m_numLaps', uint8),                   # Num laps in the data (including current partial lap)
        ('m_numTyreStints', uint8),             # Number of tyre stints in the data
        ('m_bestLapTimeLapNum', uint8),         # Lap the best lap time was achieved on
        ('m_bestSector1LapNum', uint8),         # Lap the best Sector 1 time was achieved on
        ('m_bestSector2LapNum', uint8),         # Lap the best Sector 2 time was achieved on
        ('m_bestSector3LapNum', uint8),         # Lap the best Sector 3 time was achieved on
        ('m_lapHistoryData', LapHistoryData * 100), # 100 laps of data max
        ('m_tyreStintsHistoryData', TyreStintHistoryData * 8),
    ]

