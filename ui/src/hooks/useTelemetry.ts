/**
 * useTelemetry
 *
 * Connects Socket.IO → Zustand store.
 * Components should read from useTelemetryStore directly for granular
 * subscriptions.  This hook just wires up the socket listeners and RAF loop.
 *
 * Call once at the top of the app (e.g. in a provider or layout component).
 * After that any component can do:
 *
 *   const speed = useTelemetryStore(s => s.telemetry?.speed ?? 0);
 */

import { useEffect, useRef, useCallback } from "react";
import { useSocket } from "./useSocket";
import { useTelemetryStore } from "@/store/telemetryStore";

// ─── Public types (re-exported for consumers) ────────────────────────────────

export type TelemetryData = {
  speed:             number;
  throttle:          number;   // 0–1
  brake:             number;   // 0–1
  steer?:            number;   // -1 to 1
  gear:              number;
  rpm:               number;
  drs:               number | boolean;
  tyreTemps:         number[]; // [FL, FR, RL, RR] surface temps (°C)
  tyreInnerTemps?:   number[]; // [FL, FR, RL, RR] inner carcass temps (°C)
  brakesTemp?:       number[]; // [FL, FR, RL, RR] brake rotor temps (°C)
  tyresPressure?:    number[]; // [FL, FR, RL, RR] tyre pressures (PSI)
  clutch?:           number;   // 0-100
  engineTemp?:       number;   // °C
  revLightsPercent?: number;   // 0-100
  surfaceType?:      number[]; // [FL, FR, RL, RR]
  suggestedGear?:    number;
};

export type LapData = {
  currentLapTime:         number;   // ms
  lastLapTime:            number;   // ms
  sector1:                number;   // ms
  sector2:                number;   // ms
  position:               number;
  lap:                    number;
  totalDistance:          number;   // m
  lapDistance:            number;   // m
  deltaToFront?:          number | null;   // legacy alias
  deltaToFrontMs?:        number | null;   // ms
  deltaToLeaderMs?:       number | null;   // ms
  safetyCarDelta?:        number;   // s
  sector?:                number;   // 0, 1, 2
  pitStatus?:             number;   // 0 = none, 1 = pitting, 2 = in pit area
  numPitStops?:           number;
  speedTrapFastestSpeed?: number;
};


export type SessionData = {
  trackId:          number;
  weather:          number;
  totalLaps:        number;
  trackLength?:     number;
  uid?:             string;
  trackTemp?:       number;   // °C
  airTemp?:         number;   // °C
  sessionType?:     number;
  sessionTimeLeft?: number;   // s
  sessionDuration?: number;   // s
  safetyCarStatus?: number;   // 0 = none, 1 = full, 2 = VSC, 3 = formation
  networkGame?:     boolean;
  formula?:         number;
  aiDifficulty?:    number;
  weatherForecastSamples?: {
    sessionType:     number;
    timeOffset:      number;
    weather:         number;
    trackTemp:       number;
    trackTempChange: number;
    airTemp:         number;
    airTempChange:   number;
    rainPercentage:  number;
  }[];
};

export type CarStatusData = {
  fuelInTank:          number;
  fuelRemainingLaps:   number;
  maxRPM:              number;
  drsAllowed:          number | boolean;
  tyreCompound:        number | string;
  ersStoreEnergy?:     number;   // Joules
  frontBrakeBias?:     number;   // % (e.g. 56)
  fuelMix?:            number;   // 0 = lean, 1 = standard, 2 = rich, 3 = max
  ersDeployMode?:      number;   // 0 = none, 1 = medium, 2 = hotlap, 3 = overtake
  ersHarvestedMGUK?:   number;   // Joules
  ersHarvestedMGUH?:   number;   // Joules
  ersDeployedThisLap?:  number;   // Joules
  tyresAgeLaps?:       number;
  visualTyreCompound?: number;   // 16=Soft, 17=Medium, 18=Hard, 7=Inter, 8=Wet
  vehicleFiaFlags?:    number;   // -1=invalid, 0=none, 1=green, 2=blue, 3=yellow, 4=red
  drsActivationDist?:  number;   // m
};

export type MotionData = {
  worldPosX:  number;
  worldPosY:  number;
  worldPosZ:  number;
  worldVelX:  number;
  worldVelY:  number;
  worldVelZ:  number;
  gForceLat:  number;
  gForceLon:  number;
  gForceVert: number;
  yaw:        number;
  pitch:      number;
  roll:       number;
};

export type ParticipantData = {
  carIndex:      number;
  aiControlled:  boolean;
  driverId:      number;
  networkId:     number;
  teamId:        number;
  myTeam:        boolean;
  raceNumber:    number;
  nationality:   number;
  name:          string;
  yourTelemetry: number;
};

export type CarDamageData = {
  tyresWear:            number[]; // [FL, FR, RL, RR] wear %
  tyresDamage:          number[]; // [FL, FR, RL, RR] %
  brakesDamage:         number[]; // [FL, FR, RL, RR] %
  tyreBlisters?:        number[]; // [FL, FR, RL, RR] %
  frontLeftWingDamage:  number;   // %
  frontRightWingDamage: number;   // %
  rearWingDamage:       number;   // %
  floorDamage:          number;   // %
  diffuserDamage:       number;   // %
  sidepodDamage:        number;   // %
  drsFault:             boolean;
  ersFault:             boolean;
  gearboxDamage:        number;   // %
  engineDamage:         number;   // %
  engineMGUHWear:       number;   // %
  engineESWear:         number;   // %
  engineCEWear:         number;   // %
  engineICEWear:        number;   // %
  engineMGUKWear:       number;   // %
  engineTCWear:         number;   // %
  engineBlown:          boolean;
  engineSeized:         boolean;
};

export type LapHistoryItem = {
  lapNum:    number;
  lapTimeMs: number;
  sector1Ms: number;
  sector2Ms: number;
  sector3Ms: number;
  isValid:   boolean;
};

export type TyreStintItem = {
  stintIdx:       number;
  endLap:         number;
  actualCompound: number;
  visualCompound: number;
};

export type SessionHistoryData = {
  carIdx:            number;
  numLaps:           number;
  numTyreStints:     number;
  bestLapTimeLapNum: number;
  bestSector1LapNum: number;
  bestSector2LapNum: number;
  bestSector3LapNum: number;
  laps:              LapHistoryItem[];
  stints:            TyreStintItem[];
};

export type CarSetupsData = {
  frontWing:              number;
  rearWing:               number;
  onThrottle:             number;
  offThrottle:            number;
  frontCamber:            number;
  rearCamber:             number;
  frontToe:               number;
  rearToe:                number;
  frontSuspension:        number;
  rearSuspension:         number;
  frontAntiRollBar:       number;
  rearAntiRollBar:        number;
  frontSuspensionHeight:  number;
  rearSuspensionHeight:   number;
  brakePressure:          number;
  brakeBias:              number;
  engineBraking?:         number;
  rearLeftTyrePressure:   number;
  rearRightTyrePressure:  number;
  frontLeftTyrePressure:  number;
  frontRightTyrePressure: number;
  ballast:                number;
  fuelLoad:               number;
  nextFrontWingValue?:    number;
};

export type MotionExData = {
  suspensionPosition:      number[]; // [RL, RR, FL, FR]
  suspensionVelocity:      number[]; // [RL, RR, FL, FR]
  suspensionAcceleration:  number[]; // [RL, RR, FL, FR]
  wheelSpeed:              number[]; // [RL, RR, FL, FR]
  wheelSlipRatio:          number[]; // [RL, RR, FL, FR]
  wheelSlipAngle?:         number[]; // [RL, RR, FL, FR]
  wheelLatForce?:          number[]; // [RL, RR, FL, FR]
  wheelLongForce?:         number[]; // [RL, RR, FL, FR]
  heightOfCOGAboveGround?: number;
  localVelocityX?:         number;
  localVelocityY?:         number;
  localVelocityZ?:         number;
  angularVelocityX?:       number;
  angularVelocityY?:       number;
  angularVelocityZ?:       number;
  angularAccelerationX?:   number;
  angularAccelerationY?:   number;
  angularAccelerationZ?:   number;
  frontWheelsAngle?:       number;
  wheelVertForce?:         number[]; // [RL, RR, FL, FR] vertical force (N)
  frontAeroHeight?:        number;   // mm
  rearAeroHeight?:         number;   // mm
  frontRollAngle?:         number;   // rad
  rearRollAngle?:          number;   // rad
  chassisYaw?:             number;   // rad
  chassisPitch?:           number;   // rad
  wheelCamber?:            number[]; // [RL, RR, FL, FR]
};

export type EventData = {
  eventCode:                 string;
  eventType:                 string;
  vehicleIdx?:               number;
  lapTime?:                  number;
  penaltyType?:              number;
  infringementType?:         number;
  otherVehicleIdx?:          number;
  time?:                     number;
  lapNum?:                   number;
  placesGained?:             number;
  speed?:                    number;
  isOverallFastest?:         boolean;
  isDriverFastest?:          boolean;
  fastestVehicleIdx?:        number;
  fastestSpeed?:             number;
  numLights?:                number;
  frameIdentifier?:          number;
  sessionTime?:              number;
  buttonStatus?:             number;
  overtakingVehicleIdx?:     number;
  beingOvertakenVehicleIdx?: number;
  reason?:                   number;
};

export type TyreSetItem = {
  actualCompound:     number;
  visualCompound:     number;
  wear:               number;
  available:          boolean;
  recommendedSession: number;
  lifeSpan:           number;
  usableLife:         number;
  lapDeltaTimeMs:     number;
  fitted:             boolean;
};

export type TyreSetsData = {
  carIdx:    number;
  fittedIdx: number;
  tyreSets:  TyreSetItem[];
};

export type TimeTrialItem = {
  carIdx?:    number;
  teamId?:    number;
  lapTimeMs?: number;
  sector1Ms?: number;
  sector2Ms?: number;
  sector3Ms?: number;
  isValid?:   boolean;
};

export type TimeTrialData = {
  playerSessionBest?: TimeTrialItem | null;
  personalBest?:      TimeTrialItem | null;
  rival?:             TimeTrialItem | null;
};

export type FinalClassificationItem = {
  carIndex:      number;
  position:      number;
  numLaps:       number;
  gridPosition:  number;
  points:        number;
  numPitStops:   number;
  resultStatus:  number;
  bestLapTimeMs: number;
  totalRaceTime: number;
  penaltiesTime: number;
  numPenalties:  number;
  numTyreStints: number;
};

export type FinalClassificationData = {
  numCars:        number;
  classification: FinalClassificationItem[];
};


export type HistoryPoint = {

  t:        number;  // timestamp ms
  speed:    number;
  rpm:      number;
  throttle: number;  // 0–100
  brake:    number;  // 0–100
  gear:     number;
};

export type DerivedMetrics = {
  avgSpeed:     number;
  maxSpeed:     number;
  brakeBias:    number;
  throttleBias: number;
  coasting:     number;
  fuelBurnRate: number;
  rpmPercent:   number;
  lapProgress:  number;
  tyreStress:   number;
  gForceProxy:  number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const OPTIMAL_TYRE_TEMP = 90;

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTelemetry() {
  const socket = useSocket();
  const store  = useTelemetryStore;

  // Incoming-data refs — updated by socket, consumed by RAF
  const telRef    = useRef<TelemetryData      | null>(null);
  const lapRef    = useRef<LapData            | null>(null);
  const sesRef    = useRef<SessionData        | null>(null);
  const statusRef = useRef<CarStatusData      | null>(null);
  const motRef    = useRef<MotionData         | null>(null);
  const partRef   = useRef<ParticipantData[]  | null>(null);
  const damRef    = useRef<CarDamageData      | null>(null);
  const histRef   = useRef<SessionHistoryData | null>(null);
  const setupRef     = useRef<CarSetupsData      | null>(null);
  const motExRef     = useRef<MotionExData       | null>(null);
  const eventRef     = useRef<EventData          | null>(null);
  const tyreSetsRef            = useRef<TyreSetsData            | null>(null);
  const timeTrialRef           = useRef<TimeTrialData           | null>(null);
  const finalClassificationRef = useRef<FinalClassificationData | null>(null);

  // Session-level accumulators (survive re-renders)
  const sessionMaxSpeed = useRef(0);
  const prevFuel        = useRef<number | null>(null);
  const fuelBurnEst     = useRef(0);

  // ── Derived metric computation ─────────────────────────────────────────────
  const computeDerived = useCallback(
    (hist: HistoryPoint[]): DerivedMetrics => {
      const cur    = telRef.current;
      const ses    = sesRef.current;
      const lap    = lapRef.current;
      const status = statusRef.current;
      const mot    = motRef.current;

      if (!hist.length || !cur) {
        return {
          avgSpeed: 0, maxSpeed: sessionMaxSpeed.current,
          brakeBias: 0, throttleBias: 0, coasting: 0,
          fuelBurnRate: fuelBurnEst.current, rpmPercent: 0,
          lapProgress: 0, tyreStress: 0, gForceProxy: 0,
        };
      }

      const n = hist.length;
      let sumSpeed = 0, brakeF = 0, throttleF = 0, coastF = 0;

      for (const p of hist) {
        sumSpeed += p.speed;
        if (p.brake > p.throttle && p.brake > 5)   brakeF++;
        if (p.throttle > 80)                         throttleF++;
        if (p.throttle < 5 && p.brake < 5)          coastF++;
      }

      if (cur.speed > sessionMaxSpeed.current) sessionMaxSpeed.current = cur.speed;

      // Fuel burn estimate
      if (status?.fuelInTank != null) {
        if (prevFuel.current !== null && prevFuel.current > status.fuelInTank) {
          const burn = prevFuel.current - status.fuelInTank;
          fuelBurnEst.current = fuelBurnEst.current
            ? fuelBurnEst.current * 0.9 + burn * 10 * 0.1
            : burn * 10;
        }
        prevFuel.current = status.fuelInTank;
      }

      const lapProgress =
        ses?.trackLength && lap?.lapDistance
          ? Math.min((lap.lapDistance / ses.trackLength) * 100, 100)
          : 0;

      const tyreStress = cur.tyreTemps?.length
        ? cur.tyreTemps.reduce((acc, t) => acc + Math.max(0, t - OPTIMAL_TYRE_TEMP), 0) /
          cur.tyreTemps.length
        : 0;

      const rpmPct =
        cur.revLightsPercent != null
          ? cur.revLightsPercent
          : status?.maxRPM && status.maxRPM > 0
          ? Math.min(100, Math.max(0, ((cur.rpm - 4000) / (status.maxRPM - 4000)) * 100))
          : Math.min(100, (cur.rpm / 15000) * 100);

      // Real G-Force magnitude if motion data is available, otherwise throttle/brake proxy
      const gForce = mot
        ? Math.hypot(mot.gForceLat, mot.gForceLon)
        : Math.abs(cur.throttle * 100 - cur.brake * 100) / 100;

      // Real front brake bias if available from car status, otherwise duty ratio
      const brakeBias = status?.frontBrakeBias != null
        ? status.frontBrakeBias
        : Math.round((brakeF / n) * 100);

      return {
        avgSpeed:     Math.round(sumSpeed / n),
        maxSpeed:     Math.round(sessionMaxSpeed.current),
        brakeBias,
        throttleBias: Math.round((throttleF / n) * 100),
        coasting:     Math.round((coastF    / n) * 100),
        fuelBurnRate: Math.round(fuelBurnEst.current * 10) / 10,
        rpmPercent:   Math.round(rpmPct),
        lapProgress,
        tyreStress:   Math.round(tyreStress),
        gForceProxy:  Math.round(gForce * 100) / 100,
      };
    },
    [],
  );

  // ── Socket listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const { setIsConnected, setGameVersion } = store.getState();

    const onConnect        = () => setIsConnected(true);
    const onDisconnect     = () => setIsConnected(false);
    const onTelemetry      = (d: TelemetryData)      => { telRef.current       = d; };
    const onLap            = (d: LapData)            => { lapRef.current       = d; };
    const onSession        = (d: SessionData)        => { sesRef.current       = d; };
    const onCarStatus      = (d: CarStatusData)      => { statusRef.current    = d; };
    const onMotion         = (d: MotionData)         => { motRef.current       = d; };
    const onParticipants   = (d: { participants: ParticipantData[] } | ParticipantData[]) => {
      partRef.current = Array.isArray(d) ? d : (d.participants || []);
    };
    const onCarDamage      = (d: CarDamageData)      => { damRef.current       = d; };
    const onSessionHistory = (d: SessionHistoryData) => { histRef.current      = d; };
    const onCarSetups      = (d: CarSetupsData)      => { setupRef.current     = d; };
    const onMotionEx       = (d: MotionExData)       => { motExRef.current     = d; };
    const onEvent          = (d: EventData)          => { eventRef.current     = d; };
    const onTyreSets            = (d: TyreSetsData)            => { tyreSetsRef.current            = d; };
    const onTimeTrial           = (d: TimeTrialData)           => { timeTrialRef.current           = d; };
    const onFinalClassification = (d: FinalClassificationData) => { finalClassificationRef.current = d; };
    const onVersion             = (d: { version: string })     => setGameVersion(d.version);

    socket.on("connect",                   onConnect);
    socket.on("disconnect",                onDisconnect);
    socket.on("telemetry_update",          onTelemetry);
    socket.on("lap_update",                onLap);
    socket.on("session_update",            onSession);
    socket.on("car_status_update",         onCarStatus);
    socket.on("motion_update",             onMotion);
    socket.on("participants_update",       onParticipants);
    socket.on("car_damage_update",         onCarDamage);
    socket.on("session_history_update",    onSessionHistory);
    socket.on("car_setups_update",         onCarSetups);
    socket.on("motion_ex_update",          onMotionEx);
    socket.on("event_update",              onEvent);
    socket.on("tyre_sets_update",          onTyreSets);
    socket.on("time_trial_update",         onTimeTrial);
    socket.on("final_classification_update", onFinalClassification);
    socket.on("game_version",              onVersion);

    if (socket.connected) setIsConnected(true);

    return () => {
      socket.off("connect",                   onConnect);
      socket.off("disconnect",                onDisconnect);
      socket.off("telemetry_update",          onTelemetry);
      socket.off("lap_update",                onLap);
      socket.off("session_update",            onSession);
      socket.off("car_status_update",         onCarStatus);
      socket.off("motion_update",             onMotion);
      socket.off("participants_update",       onParticipants);
      socket.off("car_damage_update",         onCarDamage);
      socket.off("session_history_update",    onSessionHistory);
      socket.off("car_setups_update",         onCarSetups);
      socket.off("motion_ex_update",          onMotionEx);
      socket.off("event_update",              onEvent);
      socket.off("tyre_sets_update",          onTyreSets);
      socket.off("time_trial_update",         onTimeTrial);
      socket.off("final_classification_update", onFinalClassification);
      socket.off("game_version",              onVersion);
    };
  }, [socket]);

  // ── RAF loop — pushes socket data into Zustand store ──────────────────────
  useEffect(() => {
    let frameId: number;

    const loop = () => {
      const {
        setTelemetry, setLapData, setSession, setCarStatus,
        setMotion, setParticipants, setCarDamage, setSessionHistory,
        setCarSetups, setMotionEx, setEvent, setTyreSets, setTimeTrial, setFinalClassification,
        pushHistory, setDerived,
      } = store.getState();

      const cur       = telRef.current;
      const lap       = lapRef.current;
      const ses       = sesRef.current;
      const status    = statusRef.current;
      const mot       = motRef.current;
      const part      = partRef.current;
      const dam       = damRef.current;
      const hist      = histRef.current;
      const setup     = setupRef.current;
      const motEx     = motExRef.current;
      const eventPkt  = eventRef.current;
      const tyreSets  = tyreSetsRef.current;
      const timeTrial = timeTrialRef.current;
      const fc        = finalClassificationRef.current;

      if (cur) {
        const point: HistoryPoint = {
          t:        Date.now(),
          speed:    cur.speed,
          rpm:      cur.rpm,
          throttle: Math.round(cur.throttle * 100),
          brake:    Math.round(cur.brake    * 100),
          gear:     cur.gear,
        };
        pushHistory(point);
        setTelemetry(cur);
        setDerived(computeDerived(store.getState().history));
      }

      if (lap)       setLapData(lap);
      if (ses)       setSession(ses);
      if (status)    setCarStatus(status);
      if (mot)       setMotion(mot);
      if (part)      setParticipants(part);
      if (dam)       setCarDamage(dam);
      if (hist)      setSessionHistory(hist);
      if (setup)     setCarSetups(setup);
      if (motEx)     setMotionEx(motEx);
      if (eventPkt)  setEvent(eventPkt);
      if (tyreSets)  setTyreSets(tyreSets);
      if (timeTrial) setTimeTrial(timeTrial);
      if (fc)        setFinalClassification(fc);

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [computeDerived]);

}


