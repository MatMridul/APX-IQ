"""
F1 2023 & 2024 UDP Packet Specifications
========================================
Encoding: Little Endian
Packet Formats: 2023, 2024
"""

import ctypes

uint8 = ctypes.c_uint8
int8 = ctypes.c_int8
uint16 = ctypes.c_uint16
int16 = ctypes.c_int16
uint32 = ctypes.c_uint32
float32 = ctypes.c_float
float64 = ctypes.c_double
uint64 = ctypes.c_uint64


class PacketHeader(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_packetFormat', uint16),           # 2023 or 2024
        ('m_gameMajorVersion', uint8),
        ('m_gameMinorVersion', uint8),
        ('m_packetVersion', uint8),
        ('m_packetId', uint8),
        ('m_sessionUID', uint64),
        ('m_sessionTime', float32),
        ('m_frameIdentifier', uint32),
        ('m_overallFrameIdentifier', uint32), # Added in 2023
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
PACKET_ID_TYRE_SETS = 12
PACKET_ID_MOTION_EX = 13
PACKET_ID_TIME_TRIAL = 14



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
        ('m_lastLapTimeInMS', uint32),
        ('m_currentLapTimeInMS', uint32),
        ('m_sector1TimeMSPart', uint16),
        ('m_sector1TimeMinutesPart', uint8),
        ('m_sector2TimeMSPart', uint16),
        ('m_sector2TimeMinutesPart', uint8),
        ('m_deltaToCarInFrontMSPart', uint16),
        ('m_deltaToCarInFrontMinutesPart', uint8),
        ('m_deltaToRaceLeaderMSPart', uint16),
        ('m_deltaToRaceLeaderMinutesPart', uint8),
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
        ('m_totalWarnings', uint8),
        ('m_cornerCuttingWarnings', uint8),
        ('m_numUnservedDriveThroughPens', uint8),
        ('m_numUnservedStopGoPens', uint8),
        ('m_gridPosition', uint8),
        ('m_driverStatus', uint8),
        ('m_resultStatus', uint8),
        ('m_pitLaneTimerActive', uint8),
        ('m_pitLaneTimeInLaneInMS', uint16),
        ('m_pitStopTimerInMS', uint16),
        ('m_pitStopShouldServePen', uint8),
        ('m_speedTrapFastestSpeed', float32),
        ('m_speedTrapFastestLap', uint8),
    ]



class PacketLapData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),
        ('m_lapData', LapData * 22),
        ('m_timeTrialPBCarIdx', uint8),
        ('m_timeTrialRivalCarIdx', uint8),
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
        ('m_enginePowerICE', float32),
        ('m_enginePowerMGUK', float32),
        ('m_ersStoreEnergy', float32),
        ('m_ersDeployMode', uint8),
        ('m_ersHarvestedThisLapMGUK', float32),
        ('m_ersHarvestedThisLapMGUH', float32),
        ('m_ersDeployedThisLap', float32),
        ('m_networkPaused', uint8),
    ]


class PacketCarStatusData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),
        ('m_carStatusData', CarStatusData * 22),
    ]


class ParticipantData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_aiControlled', uint8),
        ('m_driverId', uint8),
        ('m_networkId', uint8),
        ('m_teamId', uint8),
        ('m_myTeam', uint8),
        ('m_raceNumber', uint8),
        ('m_nationality', uint8),
        ('m_name', ctypes.c_char * 48),
        ('m_yourTelemetry', uint8),
        ('m_showOnlineNames', uint8),
        ('m_platform', uint8),
    ]


class PacketParticipantsData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),
        ('m_numActiveCars', uint8),
        ('m_participants', ParticipantData * 22),
    ]


class MarshalZone(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_zoneStart', float32),
        ('m_zoneFlag', int8),
    ]


class WeatherForecastSample(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_sessionType', uint8),
        ('m_timeOffset', uint8),
        ('m_weather', uint8),
        ('m_trackTemperature', int8),
        ('m_trackTemperatureChange', int8),
        ('m_airTemperature', int8),
        ('m_airTemperatureChange', int8),
        ('m_rainPercentage', uint8),
    ]


class PacketSessionData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),
        ('m_weather', uint8),
        ('m_trackTemperature', int8),
        ('m_airTemperature', int8),
        ('m_totalLaps', uint8),
        ('m_trackLength', uint16),
        ('m_sessionType', uint8),
        ('m_trackId', int8),
        ('m_formula', uint8),
        ('m_sessionTimeLeft', uint16),
        ('m_sessionDuration', uint16),
        ('m_pitSpeedLimit', uint8),
        ('m_gamePaused', uint8),
        ('m_isSpectating', uint8),
        ('m_spectatorCarIndex', uint8),
        ('m_sliProNativeSupport', uint8),
        ('m_numMarshalZones', uint8),
        ('m_marshalZones', MarshalZone * 21),
        ('m_safetyCarStatus', uint8),
        ('m_networkGame', uint8),
        ('m_numWeatherForecastSamples', uint8),
        ('m_weatherForecastSamples', WeatherForecastSample * 56),
        ('m_forecastAccuracy', uint8),
        ('m_aiDifficulty', uint8),
        ('m_seasonLinkIdentifier', uint32),
        ('m_weekendLinkIdentifier', uint32),
        ('m_sessionLinkIdentifier', uint32),
        ('m_pitStopWindowIdealLap', uint8),
        ('m_pitStopWindowLatestLap', uint8),
        ('m_pitStopRejoinPosition', uint8),
        ('m_steeringAssist', uint8),
        ('m_brakingAssist', uint8),
        ('m_gearboxAssist', uint8),
        ('m_pitAssist', uint8),
        ('m_pitReleaseAssist', uint8),
        ('m_ERSAssist', uint8),
        ('m_DRSAssist', uint8),
        ('m_dynamicRacingLine', uint8),
        ('m_dynamicRacingLineType', uint8),
        ('m_gameMode', uint8),
        ('m_ruleSet', uint8),
        ('m_timeOfDay', uint32),
        ('m_sessionLength', uint8),
    ]


class CarDamageData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_tyresWear', float32 * 4),           # Tyre wear percentage
        ('m_tyresDamage', uint8 * 4),           # Tyre damage percentage
        ('m_brakesDamage', uint8 * 4),          # Brakes damage percentage
        ('m_tyreBlisters', uint8 * 4),          # Tyre blisters percentage (F1 23+)
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
        ('m_header', PacketHeader),
        ('m_carDamageData', CarDamageData * 22),
    ]


class LapHistoryData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_lapTimeInMS', uint32),
        ('m_sector1TimeMSPart', uint16),
        ('m_sector1TimeMinutesPart', uint8),
        ('m_sector2TimeMSPart', uint16),
        ('m_sector2TimeMinutesPart', uint8),
        ('m_sector3TimeMSPart', uint16),
        ('m_sector3TimeMinutesPart', uint8),
        ('m_lapValidBitFlags', uint8),
    ]


class TyreStintHistoryData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_endLap', uint8),
        ('m_tyreActualCompound', uint8),
        ('m_tyreVisualCompound', uint8),
    ]


class PacketSessionHistoryData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),
        ('m_carIdx', uint8),
        ('m_numLaps', uint8),
        ('m_numTyreStints', uint8),
        ('m_bestLapTimeLapNum', uint8),
        ('m_bestSector1LapNum', uint8),
        ('m_bestSector2LapNum', uint8),
        ('m_bestSector3LapNum', uint8),
        ('m_lapHistoryData', LapHistoryData * 100),
        ('m_tyreStintsHistoryData', TyreStintHistoryData * 8),
    ]


class CarSetupData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_frontWing', uint8),
        ('m_rearWing', uint8),
        ('m_onThrottle', uint8),
        ('m_offThrottle', uint8),
        ('m_frontCamber', float32),
        ('m_rearCamber', float32),
        ('m_frontToe', float32),
        ('m_rearToe', float32),
        ('m_frontSuspension', uint8),
        ('m_rearSuspension', uint8),
        ('m_frontAntiRollBar', uint8),
        ('m_rearAntiRollBar', uint8),
        ('m_frontSuspensionHeight', uint8),
        ('m_rearSuspensionHeight', uint8),
        ('m_brakePressure', uint8),
        ('m_brakeBias', uint8),
        ('m_rearLeftTyrePressure', float32),
        ('m_rearRightTyrePressure', float32),
        ('m_frontLeftTyrePressure', float32),
        ('m_frontRightTyrePressure', float32),
        ('m_ballast', uint8),
        ('m_fuelLoad', float32),
    ]


class PacketCarSetupData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),
        ('m_carSetups', CarSetupData * 22),
    ]


class PacketMotionExData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),
        ('m_suspensionPosition', float32 * 4),       # RL, RR, FL, FR
        ('m_suspensionVelocity', float32 * 4),       # RL, RR, FL, FR
        ('m_suspensionAcceleration', float32 * 4),   # RL, RR, FL, FR
        ('m_wheelSpeed', float32 * 4),               # Speed of each wheel
        ('m_wheelSlipRatio', float32 * 4),           # Slip ratio for each wheel
        ('m_wheelSlipAngle', float32 * 4),           # Slip angle for each wheel
        ('m_wheelLatForce', float32 * 4),            # Lateral force for each wheel
        ('m_wheelLongForce', float32 * 4),           # Longitudinal force for each wheel
        ('m_heightOfCOGAboveGround', float32),       # Height of centre of gravity
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
        ('m_wheelVertForce', float32 * 4),
        ('m_frontAeroHeight', float32),
        ('m_rearAeroHeight', float32),
        ('m_frontRollAngle', float32),
        ('m_rearRollAngle', float32),
        ('m_chassisYaw', float32),
        ('m_chassisPitch', float32),
    ]


# -------------------------------------------------------------------------
# Event Packet (ID=3)
# -------------------------------------------------------------------------

class FastestLap(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_vehicleIdx', uint8),
        ('m_lapTime', float32),
    ]


class Retirement(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_vehicleIdx', uint8),
    ]


class TeamMateInPits(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_vehicleIdx', uint8),
    ]


class RaceWinner(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_vehicleIdx', uint8),
    ]


class Penalty(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_penaltyType', uint8),
        ('m_infringementType', uint8),
        ('m_vehicleIdx', uint8),
        ('m_otherVehicleIdx', uint8),
        ('m_time', uint8),
        ('m_lapNum', uint8),
        ('m_placesGained', uint8),
    ]


class SpeedTrap(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_vehicleIdx', uint8),
        ('m_speed', float32),
        ('m_isOverallFastestInSession', uint8),
        ('m_isDriverFastestInSession', uint8),
        ('m_fastestVehicleIdxInSession', uint8),
        ('m_fastestSpeedInSession', float32),
    ]


class StartLights(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_numLights', uint8),
    ]


class DriveThroughPenaltyServed(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_vehicleIdx', uint8),
    ]


class StopGoPenaltyServed(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_vehicleIdx', uint8),
    ]


class Flashback(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_flashbackFrameIdentifier', uint32),
        ('m_flashbackSessionTime', float32),
    ]


class Buttons(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_buttonStatus', uint32),
    ]


class Overtake(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_overtakingVehicleIdx', uint8),
        ('m_beingOvertakenVehicleIdx', uint8),
    ]


class EventDataDetails(ctypes.Union):
    _pack_ = 1
    _fields_ = [
        ('FastestLap', FastestLap),
        ('Retirement', Retirement),
        ('TeamMateInPits', TeamMateInPits),
        ('RaceWinner', RaceWinner),
        ('Penalty', Penalty),
        ('SpeedTrap', SpeedTrap),
        ('StartLights', StartLights),
        ('DriveThroughPenaltyServed', DriveThroughPenaltyServed),
        ('StopGoPenaltyServed', StopGoPenaltyServed),
        ('Flashback', Flashback),
        ('Buttons', Buttons),
        ('Overtake', Overtake),
        ('m_rawBytes', uint8 * 16),
    ]


class PacketEventData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),
        ('m_eventStringCode', uint8 * 4),
        ('m_eventDetails', EventDataDetails),
    ]


# -------------------------------------------------------------------------
# Tyre Sets Packet (ID=12)
# -------------------------------------------------------------------------

class TyreSetData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_actualTyreCompound', uint8),
        ('m_visualTyreCompound', uint8),
        ('m_wear', uint8),
        ('m_available', uint8),
        ('m_recommendedSession', uint8),
        ('m_lifeSpan', uint8),
        ('m_usableLife', uint8),
        ('m_lapDeltaTime', int16),
        ('m_fitted', uint8),
    ]


class PacketTyreSetsData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),
        ('m_carIdx', uint8),
        ('m_tyreSetData', TyreSetData * 20),
        ('m_fittedIdx', uint8),
    ]


# -------------------------------------------------------------------------
# Time Trial Packet (ID=14)
# -------------------------------------------------------------------------

class TimeTrialDataSet(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_carIdx', uint8),
        ('m_teamId', uint8),
        ('m_lapTimeInMS', uint32),
        ('m_sector1TimeInMS', uint32),
        ('m_sector2TimeInMS', uint32),
        ('m_sector3TimeInMS', uint32),
        ('m_tractionControl', uint8),
        ('m_gearboxAssist', uint8),
        ('m_antiLockBrakes', uint8),
        ('m_equalCarPerformance', uint8),
        ('m_customSetup', uint8),
        ('m_valid', uint8),
    ]


class PacketTimeTrialData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_header', PacketHeader),
        ('m_playerSessionBestDataSet', TimeTrialDataSet),
        ('m_personalBestDataSet', TimeTrialDataSet),
        ('m_rivalDataSet', TimeTrialDataSet),
    ]


class FinalClassificationData(ctypes.LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('m_position', uint8),              # Finishing position
        ('m_numLaps', uint8),               # Number of laps completed
        ('m_gridPosition', uint8),          # Grid position of the car
        ('m_points', uint8),                # Number of points scored
        ('m_numPitStops', uint8),           # Number of pit stops made
        ('m_resultStatus', uint8),          # Result status
        ('m_bestLapTimeInMS', uint32),      # Best lap time in milliseconds
        ('m_totalRaceTime', float64),       # Total race time in seconds without penalties
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
        ('m_header', PacketHeader),
        ('m_numCars', uint8),
        ('m_classificationData', FinalClassificationData * 22),
    ]




