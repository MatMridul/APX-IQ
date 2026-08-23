"""
APX IQ — Ingestion Server
==========================

Receives raw F1 game telemetry over UDP, decodes packets, and:
  - Streams live telemetry to the UI over Socket.IO
  - Records per-lap data in TelemetryRecorder
  - POSTs completed laps to the API for persistence

Architecture:
    TelemetryListener (UDP) → asyncio.Queue → packet_processor()
    TelemetryRecorder watches lap boundaries → finalized DataFrames
    lap_saver_worker() polls recorder → POST /telemetry/lap/save

Configuration:
    API_BASE_URL   — URL of the FastAPI server (default: http://localhost:8000)
    INGESTION_PORT — Socket.IO server port (default: 3001)
    UDP_PORT       — Game UDP listen port (default: 20777)
"""

import asyncio
import sys
from pathlib import Path

# Project root on sys.path for absolute imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import httpx
import socketio
from aiohttp import web

from core.config import settings
from core.logging_config import configure_logging, get_logger
from ingestion.listener import TelemetryListener
from ingestion.decoder import PacketDecoder
from intelligence.telemetry_recorder import TelemetryRecorder

# Structured logging configured once at process startup
configure_logging()
log = get_logger("APXIQ.Ingestion")

# ─── Socket.IO server ─────────────────────────────────────────────────────────

sio = socketio.AsyncServer(async_mode="aiohttp", cors_allowed_origins="*")
app = web.Application()
sio.attach(app)

# ─── Intelligence state ───────────────────────────────────────────────────────

recorder = TelemetryRecorder()


# ─── Lap persistence ──────────────────────────────────────────────────────────

async def save_lap_to_api(lap_info: dict) -> None:
    """
    POST a completed lap DataFrame to the API for persistence.

    Uses settings.api_base_url to avoid hardcoding the API address.
    Failures are logged but do not crash the ingestion server.
    """
    telemetry = lap_info["dataframe"].to_dict(orient="records")
    payload = {
        "session_uid": lap_info["session_uid"],
        "lap_number":  lap_info["lap_num"],
        "telemetry":   telemetry,
        "is_valid":    True,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{settings.api_base_url}/telemetry/lap/save",
                json=payload,
            )
        if response.status_code == 200:
            result = response.json()
            log.info(
                "lap_saved_to_api",
                lap_id=result["lap_id"],
                lap_number=lap_info["lap_num"],
                points=lap_info["data_points"],
            )
        else:
            log.error(
                "lap_save_failed",
                status=response.status_code,
                body=response.text[:200],
            )
    except Exception as exc:
        log.error("lap_save_error", lap_number=lap_info["lap_num"], error=str(exc))


# ─── Socket.IO events ─────────────────────────────────────────────────────────

@sio.event
async def connect(sid, environ):
    log.info("client_connected", sid=sid)
    game_version = app.get("game_version")
    if game_version:
        version_str = f"F1 {str(game_version)[-2:]}"
        await sio.emit("game_version", {"version": version_str}, room=sid)


@sio.event
async def disconnect(sid):
    log.info("client_disconnected", sid=sid)


# ─── Packet processor ─────────────────────────────────────────────────────────

async def packet_processor(listener: TelemetryListener) -> None:
    """
    Consumes decoded packets from the UDP queue and:
      - Feeds data into the TelemetryRecorder
      - Emits live events to connected Socket.IO clients

    Rate-limits Socket.IO telemetry emissions to ~60Hz to avoid
    overwhelming the UI with more events than it can render.
    """
    log.info("packet_processor_started")

    last_telemetry_emit = 0.0
    last_version_emit   = 0.0
    _TELEMETRY_INTERVAL = 0.016   # ~16ms → 60Hz
    _VERSION_INTERVAL   = 5.0     # re-emit game version every 5s
    packet_count        = 0

    loop = asyncio.get_running_loop()

    while True:
        try:
            # Drain up to 100 queued packets per iteration to catch up
            # after short bursts without stalling the event loop.
            for _ in range(100):
                if listener.queue.empty():
                    break
                try:
                    data, _addr = listener.queue.get_nowait()
                except asyncio.QueueEmpty:
                    break

                packet = PacketDecoder.decode(data)
                if not packet:
                    continue

                packet_count += 1
                now = loop.time()

                header         = packet.m_header if hasattr(packet, "m_header") else packet
                packet_format  = header.m_packetFormat
                packet_type_id = header.m_packetId
                player_idx     = header.m_playerCarIndex

                # ── Game version broadcast (throttled) ────────────────────────
                adapter = get_adapter_for_format(packet_format)
                if not settings.stealth_mode and (now - last_version_emit > _VERSION_INTERVAL):
                    game_version = adapter.label
                    if app.get("game_version") != packet_format:
                        app["game_version"] = packet_format
                        log.info("game_version_detected", version=game_version)
                    await sio.emit("game_version", {"version": game_version})
                    last_version_emit = now

                # ── Motion (ID=0) ─────────────────────────────────────────────
                if packet_type_id == 0:
                    recorder.update_motion(player_idx, packet)

                # ── Car Telemetry (ID=6) ──────────────────────────────────────
                elif packet_type_id == 6:
                    recorder.update_car_telemetry(player_idx, packet)

                    if not settings.stealth_mode and (now - last_telemetry_emit >= _TELEMETRY_INTERVAL):
                        telem_dict = adapter.extract_telemetry(packet, player_idx)
                        await sio.emit("telemetry_update", {
                            "speed":      telem_dict["speed_kph"],
                            "throttle":   telem_dict["throttle"],
                            "brake":      telem_dict["brake"],
                            "gear":       telem_dict["gear"],
                            "rpm":        telem_dict["rpm"],
                            "drs":        telem_dict["drs"],
                            "tyreTemps":  telem_dict["tyre_surface_temps"],
                        })
                        last_telemetry_emit = now

                # ── Lap Data (ID=2) ───────────────────────────────────────────
                elif packet_type_id == 2:
                    if not settings.stealth_mode:
                        lap_dict = adapter.extract_lap_data(packet, player_idx)
                        await sio.emit("lap_update", {
                            "currentLapTime": lap_dict["current_lap_time_ms"],
                            "lastLapTime":    lap_dict["last_lap_time_ms"],
                            "sector1":        lap_dict["sector_1_ms"],
                            "sector2":        lap_dict["sector_2_ms"],
                            "position":       lap_dict["position"],
                            "lap":            lap_dict["lap_number"],
                            "totalDistance":  lap_dict["total_distance_m"],
                            "lapDistance":    lap_dict["lap_distance_m"],
                            "deltaToFront":   0.0,
                        })
                    recorder.update_lap_data(player_idx, packet)

                # ── Car Status (ID=7) ─────────────────────────────────────────
                elif packet_type_id == 7:
                    if not settings.stealth_mode:
                        status_dict = adapter.extract_car_status(packet, player_idx)
                        await sio.emit("car_status_update", {
                            "fuelInTank":        status_dict["fuel_in_tank"],
                            "fuelRemainingLaps": status_dict["fuel_remaining_laps"],
                            "maxRPM":            status_dict["max_rpm"],
                            "drsAllowed":        status_dict["drs_allowed"],
                            "tyreCompound":      status_dict["tyre_compound"],
                            "ersStoreEnergy":    status_dict["ers_store_energy"],
                        })

                # ── Session (ID=1) ────────────────────────────────────────────
                elif packet_type_id == 1:
                    if not settings.stealth_mode:
                        await sio.emit("session_update", {
                            "trackId":     packet.m_trackId,
                            "weather":     packet.m_weather,
                            "totalLaps":   packet.m_totalLaps,
                            "trackLength": packet.m_trackLength,
                            "uid":         str(packet.m_header.m_sessionUID),
                        })
                    recorder.on_session_start(
                        session_uid=packet.m_header.m_sessionUID,
                        track_id=packet.m_trackId,
                        track_length=packet.m_trackLength,
                    )

        except Exception as exc:
            log.error("packet_processor_error", error=str(exc))

        # Yield control briefly to allow other async tasks to run
        await asyncio.sleep(0.01)


# ─── Lap saver worker ─────────────────────────────────────────────────────────

async def lap_saver_worker() -> None:
    """
    Polls TelemetryRecorder for newly completed laps and ships them
    to the API. Runs every 2 seconds.
    """
    log.info("lap_saver_worker_started")
    last_saved_count = 0

    while True:
        try:
            completed_laps = recorder.get_completed_laps()
            new_laps = completed_laps[last_saved_count:]
            for lap_info in new_laps:
                await save_lap_to_api(lap_info)
            last_saved_count = len(completed_laps)
        except Exception as exc:
            log.error("lap_saver_error", error=str(exc))

        await asyncio.sleep(2.0)


# ─── aiohttp lifecycle ────────────────────────────────────────────────────────

async def start_background_tasks(application: web.Application) -> None:
    listener = TelemetryListener(host="0.0.0.0", port=settings.udp_port)
    await listener.start()
    application["listener"]  = listener
    application["processor"] = asyncio.create_task(packet_processor(listener))
    application["lap_saver"] = asyncio.create_task(lap_saver_worker())
    log.info("ingestion_started", udp_port=settings.udp_port, sio_port=settings.ingestion_port)


async def cleanup_background_tasks(application: web.Application) -> None:
    recorder.on_session_end()
    application["listener"].stop()
    for task_key in ("processor", "lap_saver"):
        task = application.get(task_key)
        if task:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
    log.info("ingestion_stopped")


app.on_startup.append(start_background_tasks)
app.on_cleanup.append(cleanup_background_tasks)

if __name__ == "__main__":
    web.run_app(app, port=settings.ingestion_port)
