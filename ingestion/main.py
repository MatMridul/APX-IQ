import asyncio
import logging
import signal
import sys
from pathlib import Path

# Add project root to path for absolute imports
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

import socketio
import httpx  # For sending lap data to API
from aiohttp import web
from ingestion.listener import TelemetryListener
from ingestion.decoder import PacketDecoder
from intelligence.telemetry_recorder import TelemetryRecorder

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("APXIQ.Ingestion")

# Socket.IO Server
sio = socketio.AsyncServer(async_mode='aiohttp', cors_allowed_origins='*')
app = web.Application()
app['game_version'] = None
sio.attach(app)

# Intelligence Layer — Telemetry Recorder
recorder = TelemetryRecorder()

# API endpoint for saving laps
API_BASE_URL = "http://localhost:8000"

async def save_lap_to_api(lap_info: dict):
    """
    Save a completed lap to the API storage.
    
    Args:
        lap_info: Dict containing lap_num, session_uid, track_id, dataframe
    """
    try:
        # Convert DataFrame to list of dicts
        telemetry = lap_info["dataframe"].to_dict(orient="records")
        
        payload = {
            "session_uid": lap_info["session_uid"],
            "lap_number": lap_info["lap_num"],
            "telemetry": telemetry,
            "is_valid": True,
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_BASE_URL}/telemetry/lap/save",
                json=payload,
                timeout=10.0
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info(
                    f"💾 Lap {lap_info['lap_num']} saved to API as lap_id: {result['lap_id']} "
                    f"({lap_info['data_points']} points)"
                )
            else:
                logger.error(f"Failed to save lap: {response.status_code} - {response.text}")
                
    except Exception as e:
        logger.error(f"Error saving lap to API: {e}")

@sio.event
async def connect(sid, environ):
    logger.info(f"✅ Client connected: {sid}")
    logger.info(f"   Headers: {dict(environ.get('HTTP_HEADERS', {}))}")
    # Send current game version if known
    if 'game_version' in app and app['game_version']:
         version_str = f"F1 {str(app['game_version'])[-2:]}"
         await sio.emit('game_version', {'version': version_str}, room=sid)

@sio.event
async def disconnect(sid):
    logger.info(f"❌ Client disconnected: {sid}")

async def packet_processor(listener: TelemetryListener):
    """
    Consumes packets from the queue, decodes them, and broadcasts via WebSocket.
    """
    logger.info("Packet Processor started.")
    
    last_telemetry_emit = 0
    last_version_emit = 0
    telemetry_rate_limit = 0.016  # ~16ms (60Hz emit rate)
    packet_count = 0  # Track total packets processed
    
    loop = asyncio.get_running_loop()

    while True:
        try:
            # Batch process up to 100 packets to catch up
            # We must verify queue is not empty before get_nowait, or catch QueueEmpty
            packets_to_process = 100
            packets_in_batch = 0
            
            while packets_to_process > 0:
                if listener.queue.empty():
                    break
                
                try:
                    data, addr = listener.queue.get_nowait()
                    packets_in_batch += 1
                except asyncio.QueueEmpty:
                    break

                packets_to_process -= 1
                packet_count += 1  # Increment packet counter
                
                # Log every 60 packets received
                if packet_count % 60 == 0:
                    logger.info(f"📥 Received {packet_count} total packets | Queue size: {listener.queue.qsize()}")
                
                # Decode
                packet = PacketDecoder.decode(data)
                
                if not packet:
                    if packet_count % 60 == 0:
                        logger.warning(f"⚠️  Failed to decode packet {packet_count}")
                    continue

                # --- Detect Game Version ---
                pkt_header = packet.m_header if hasattr(packet, 'm_header') else packet
                pkt_version = pkt_header.m_packetFormat
                
                # DEBUG LOGGING
                if packets_to_process % 200 == 0:
                   logger.info(f"Processing Packet: ID={pkt_header.m_packetId} Format={pkt_version}")

                if app.get('game_version') != pkt_version:
                    app['game_version'] = pkt_version
                    version_str = f"F1 {str(pkt_version)[-2:]}"
                    logger.info(f"Detected Game Version: {version_str}")
                    await sio.emit('game_version', {'version': version_str})
                
                


                packet_type_id = packet.m_header.m_packetId if hasattr(packet, 'm_header') else packet.m_packetId
                packet_format = packet.m_header.m_packetFormat if hasattr(packet, 'm_header') else 2022
                
                now = loop.time()
                
                # Emit Game Version (Throttled)
                if now - last_version_emit > 5.0:
                    game_version = "F1 25" if packet_format == 2025 else "F1 22"
                    await sio.emit('game_version', {'version': game_version})
                    last_version_emit = now
                
                # Dispatch logic
                player_idx = packet.m_header.m_playerCarIndex

                if packet_type_id == 0: # Motion
                    # Feed motion data to intelligence recorder
                    recorder.update_motion(player_idx, packet)

                elif packet_type_id == 6: # Car Telemetry
                    # Get Player Car
                    telemetry = packet.m_carTelemetryData[player_idx]
                    
                    payload = {
                        "speed": telemetry.m_speed,
                        "throttle": telemetry.m_throttle,
                        "brake": telemetry.m_brake,
                        "gear": telemetry.m_gear,
                        "rpm": telemetry.m_engineRPM,
                        "drs": telemetry.m_drs,
                        "tyreTemps": list(telemetry.m_tyresSurfaceTemperature)
                    }
                    
                    # Rate limit telemetry emissions to 60Hz
                    if now - last_telemetry_emit >= telemetry_rate_limit:
                        await sio.emit('telemetry_update', payload)
                        last_telemetry_emit = now
                        
                        # Debug logging every 60 packets
                        if packet_count % 60 == 0:
                            logger.info(f"📡 Emitting telemetry: Speed={payload['speed']} km/h, Gear={payload['gear']}, RPM={payload['rpm']}")

                    # Feed to intelligence recorder
                    recorder.update_car_telemetry(player_idx, packet)

                elif packet_type_id == 2: # Lap Data
                    lap_data = packet.m_lapData[player_idx]
                    
                    if packet_format == 2025:
                        # F1 25: Sectors use split minutes + ms fields
                        delta_min = lap_data.m_deltaToCarInFrontMinutesPart
                        delta_ms = lap_data.m_deltaToCarInFrontMSPart
                        delta_total_seconds = (delta_min * 60) + (delta_ms / 1000.0)
                        sector1_ms = (lap_data.m_sector1TimeMinutesPart * 60000) + lap_data.m_sector1TimeMSPart
                        sector2_ms = (lap_data.m_sector2TimeMinutesPart * 60000) + lap_data.m_sector2TimeMSPart
                    else:
                        # F1 22: Sectors are single uint16 ms fields, no delta-to-front
                        delta_total_seconds = 0.0
                        sector1_ms = lap_data.m_sector1TimeInMS
                        sector2_ms = lap_data.m_sector2TimeInMS

                    payload = {
                        "currentLapTime": lap_data.m_currentLapTimeInMS,
                        "lastLapTime": lap_data.m_lastLapTimeInMS,
                        "sector1": sector1_ms,
                        "sector2": sector2_ms,
                        "position": lap_data.m_carPosition,
                        "lap": lap_data.m_currentLapNum,
                        "totalDistance": lap_data.m_totalDistance,
                        "lapDistance": lap_data.m_lapDistance,
                        "deltaToFront": delta_total_seconds
                    }
                    await sio.emit('lap_update', payload)

                    # Feed to intelligence recorder
                    recorder.update_lap_data(player_idx, packet)

                elif packet_type_id == 7: # Car Status
                    car_status = packet.m_carStatusData[player_idx]
                    
                    payload = {
                        "fuelInTank": car_status.m_fuelInTank,
                        "fuelRemainingLaps": car_status.m_fuelRemainingLaps,
                        "maxRPM": car_status.m_maxRPM,
                        "drsAllowed": car_status.m_drsAllowed,
                        "tyreCompound": car_status.m_visualTyreCompound
                    }
                    await sio.emit('car_status_update', payload)

                elif packet_type_id == 1: # Session
                    payload = {
                        "trackId": packet.m_trackId,
                        "weather": packet.m_weather,
                        "totalLaps": packet.m_totalLaps,
                        "trackLength": packet.m_trackLength,
                        "uid": str(packet.m_header.m_sessionUID)
                    }
                    await sio.emit('session_update', payload)

                    # Initialize intelligence recorder for this session
                    recorder.on_session_start(
                        session_uid=packet.m_header.m_sessionUID,
                        track_id=packet.m_trackId,
                        track_length=packet.m_trackLength,
                    )

        except Exception as e:
            logger.error(f"Error in packet processor: {e}")
            
        # Yield control briefly to allow IO tasks to run
        await asyncio.sleep(0.01)

async def lap_saver_worker():
    """
    Periodically checks for completed laps and saves them to the API.
    """
    logger.info("Lap Saver Worker started.")
    last_saved_count = 0
    
    while True:
        try:
            completed_laps = recorder.get_completed_laps()
            
            # Save any new laps
            if len(completed_laps) > last_saved_count:
                for lap_info in completed_laps[last_saved_count:]:
                    await save_lap_to_api(lap_info)
                
                last_saved_count = len(completed_laps)
            
            # Check every 2 seconds
            await asyncio.sleep(2.0)
            
        except Exception as e:
            logger.error(f"Error in lap saver worker: {e}")
            await asyncio.sleep(2.0)

async def start_background_tasks(app):
    # Bind to 0.0.0.0 to allow external devices (Gaming Laptop) to connect
    app['listener'] = TelemetryListener(host="0.0.0.0", port=20777)
    await app['listener'].start()
    app['processor'] = asyncio.create_task(packet_processor(app['listener']))
    app['lap_saver'] = asyncio.create_task(lap_saver_worker())

async def cleanup_background_tasks(app):
    recorder.on_session_end()
    app['listener'].stop()
    app['processor'].cancel()
    app['lap_saver'].cancel()
    await app['processor']
    await app['lap_saver']

if __name__ == "__main__":
    # Setup background tasks for aiohttp
    app.on_startup.append(start_background_tasks)
    app.on_cleanup.append(cleanup_background_tasks)
    
    # Run App
    web.run_app(app, port=3001)
