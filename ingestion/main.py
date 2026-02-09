import asyncio
import logging
import signal
import socketio
from aiohttp import web
from .listener import TelemetryListener
from .decoder import PacketDecoder

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

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")
    # Send current game version if known
    if 'game_version' in app and app['game_version']:
         version_str = f"F1 {str(app['game_version'])[-2:]}"
         await sio.emit('game_version', {'version': version_str}, room=sid)

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

async def packet_processor(listener: TelemetryListener):
    """
    Consumes packets from the queue, decodes them, and broadcasts via WebSocket.
    """
    logger.info("Packet Processor started.")
    
    last_telemetry_emit = 0
    last_version_emit = 0
    telemetry_rate_limit = 0.016  # ~16ms (60Hz emit rate)
    
    loop = asyncio.get_running_loop()

    while True:
        try:
            # Batch process up to 100 packets to catch up
            # We must verify queue is not empty before get_nowait, or catch QueueEmpty
            packets_to_process = 100
            
            while packets_to_process > 0:
                if listener.queue.empty():
                    break
                
                try:
                    data, addr = listener.queue.get_nowait()
                except asyncio.QueueEmpty:
                    break

                packets_to_process -= 1
                
                # Decode
                packet = PacketDecoder.decode(data)
                
                if not packet:
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
                if packet_type_id == 6: # Car Telemetry
                    # Throttle removed for max speed
                    # if now - last_telemetry_emit < telemetry_rate_limit:
                    #     continue

                    # Get Player Car
                    player_idx = packet.m_header.m_playerCarIndex
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
                    # logger.info(f"Emitting Telemetry: Speed={payload['speed']} RPM={payload['rpm']}")
                    await sio.emit('telemetry_update', payload)
                    last_telemetry_emit = now

                elif packet_type_id == 2: # Lap Data
                    player_idx = packet.m_header.m_playerCarIndex
                    lap_data = packet.m_lapData[player_idx]
                    
                    # Calculate Delta to Car in Front (Minutes + MS)
                    delta_min = lap_data.m_deltaToCarInFrontMinutesPart
                    delta_ms = lap_data.m_deltaToCarInFrontMSPart
                    delta_total_seconds = (delta_min * 60) + (delta_ms / 1000.0)

                    payload = {
                        "currentLapTime": lap_data.m_currentLapTimeInMS,
                        "lastLapTime": lap_data.m_lastLapTimeInMS,
                        "sector1": (lap_data.m_sector1TimeMinutesPart * 60000) + lap_data.m_sector1TimeMSPart,
                        "sector2": (lap_data.m_sector2TimeMinutesPart * 60000) + lap_data.m_sector2TimeMSPart,
                        "position": lap_data.m_carPosition,
                        "lap": lap_data.m_currentLapNum,
                        "totalDistance": lap_data.m_totalDistance,
                        "deltaToFront": delta_total_seconds
                    }
                    await sio.emit('lap_update', payload)

                elif packet_type_id == 7: # Car Status
                    player_idx = packet.m_header.m_playerCarIndex
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
                        "uid": str(packet.m_header.m_sessionUID)
                    }
                    await sio.emit('session_update', payload)

        except Exception as e:
            logger.error(f"Error in packet processor: {e}")
            
        # Yield control briefly to allow IO tasks to run
        await asyncio.sleep(0.01)

async def start_background_tasks(app):
    # Bind to 0.0.0.0 to allow external devices (Gaming Laptop) to connect
    app['listener'] = TelemetryListener(host="0.0.0.0", port=20777)
    await app['listener'].start()
    app['processor'] = asyncio.create_task(packet_processor(app['listener']))

async def cleanup_background_tasks(app):
    app['listener'].stop()
    app['processor'].cancel()
    await app['processor']

if __name__ == "__main__":
    # Setup background tasks for aiohttp
    app.on_startup.append(start_background_tasks)
    app.on_cleanup.append(cleanup_background_tasks)
    
    # Run App
    web.run_app(app, port=3001)
