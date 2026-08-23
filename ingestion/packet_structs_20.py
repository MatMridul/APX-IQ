"""
F1 2020 UDP Packet Specifications
=================================
Encoding: Little Endian
Packet Format: 2020
"""

import ctypes

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
        ('m_packetFormat', uint16),           # 2020
        ('m_gameMajorVersion', uint8),
        ('m_gameMinorVersion', uint8),
        ('m_packetVersion', uint8),
        ('m_packetId', uint8),
        ('m_sessionUID', uint64),
        ('m_sessionTime', float32),
        ('m_frameIdentifier', uint32),
        ('m_playerCarIndex', uint8),
        ('m_secondaryPlayerCarIndex', uint8),
    ]


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
    ]


class LapData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_lastLapTime', float32),
        ('m_currentLapTime', float32),
        ('m_sector1TimeInMS', uint16),
        ('m_sector2TimeInMS', uint16),
        ('m_bestLapTime', float32),
        ('m_bestLapNum', uint8),
        ('m_bestLapSector1TimeInMS', uint16),
        ('m_bestLapSector2TimeInMS', uint16),
        ('m_bestLapSector3TimeInMS', uint16),
        ('m_bestOverallSector1TimeInMS', uint16),
        ('m_bestOverallSector1LapNum', uint8),
        ('m_bestOverallSector2TimeInMS', uint16),
        ('m_bestOverallSector2LapNum', uint8),
        ('m_bestOverallSector3TimeInMS', uint16),
        ('m_bestOverallSector3LapNum', uint8),
        ('m_lapDistance', float32),
        ('m_totalDistance', float32),
        ('m_safetyCarDelta', float32),
        ('m_carPosition', uint8),
        ('m_currentLapNum', uint8),
        ('m_pitStatus', uint8),
        ('m_sector', uint8),
        ('m_currentLapInvalid', uint8),
        ('m_penalties', uint8),
        ('m_gridPosition', uint8),
        ('m_driverStatus', uint8),
        ('m_resultStatus', uint8),
    ]


class PacketLapData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),
        ('m_lapData', LapData * 22),
    ]


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
        ('m_buttonStatus', uint32),
        ('m_mfdPanelIndex', uint8),
        ('m_mfdPanelIndexSecondaryPlayer', uint8),
        ('m_suggestedGear', int8),
    ]


class CarStatusData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_tractionControl', uint8),
        ('m_antiLockBrakes', uint8),
        ('m_fuelMix', uint8),
        ('m_frontBrakeBias', uint8),
        ('m_pitLimiterStatus', uint8),
        ('m_fuelInTank', float32),
        ('m_fuelCapacity', float32),
        ('m_fuelRemainingLaps', float32),
        ('m_maxRPM', uint16),
        ('m_idleRPM', uint16),
        ('m_maxGears', uint8),
        ('m_drsAllowed', uint8),
        ('m_drsActivationDistance', uint16),
        ('m_actualTyreCompound', uint8),
        ('m_visualTyreCompound', uint8),
        ('m_tyresAgeLaps', uint8),
        ('m_vehicleFiaFlags', int8),
        ('m_ersStoreEnergy', float32),
        ('m_ersDeployMode', uint8),
        ('m_ersHarvestedThisLapMGUK', float32),
        ('m_ersHarvestedThisLapMGUH', float32),
        ('m_ersDeployedThisLap', float32),
    ]


class PacketCarStatusData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),
        ('m_carStatusData', CarStatusData * 22),
    ]
