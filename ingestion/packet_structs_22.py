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
PACKET_ID_MOTION = 0
PACKET_ID_SESSION = 1
PACKET_ID_LAP_DATA = 2
PACKET_ID_EVENT = 3
PACKET_ID_PARTICIPANTS = 4
PACKET_ID_CAR_SETUPS = 5
PACKET_ID_CAR_TELEMETRY = 6
PACKET_ID_CAR_STATUS = 7

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
