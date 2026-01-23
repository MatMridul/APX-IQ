import asyncio
import logging
import signal
from .listener import TelemetryListener
from .decoder import PacketDecoder

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("APXIQ.Ingestion")

async def packet_processor(listener: TelemetryListener):
    """
    Consumes packets from the queue and decodes them.
    """
    logger.info("Packet Processor started.")
    while True:
        data, addr = await listener.get_packet()
        
        # Decode
        packet = PacketDecoder.decode(data)
        
        if packet:
            # Inspection Logic (Simulated Pipeline)
            packet_type_id = packet.m_header.m_packetId if hasattr(packet, 'm_header') else packet.m_packetId
            
            # Simple Log for now
            # In production, this would dispatch to the Router -> Normalizer -> DB
            if packet_type_id == 0: # Motion
               pass # Too noisy to log every motion packet
            elif packet_type_id == 2: # Lap Data
               logger.info(f"Received Lap Data. Frame: {packet.m_header.m_frameIdentifier}")
            else:
               logger.debug(f"Received Packet ID: {packet_type_id} from {addr}")

async def main():
    listener = TelemetryListener(port=20777)
    
    # Handle Shutdown
    loop = asyncio.get_running_loop()
    stop_event = asyncio.Event()
    
    def signal_handler():
        logger.info("Shutdown signal received.")
        stop_event.set()

    # Register signals (Windows might need limitations check, asyncio supports limited signals on Windows)
    # Using try/except for signal registration as Windows has specific limits
    try:
        loop.add_signal_handler(signal.SIGINT, signal_handler)
        loop.add_signal_handler(signal.SIGTERM, signal_handler)
    except NotImplementedError:
        # Windows doesn't support add_signal_handler for SIGINT in ProactorEventLoop sometimes?
        # We'll just rely on KeyboardInterrupt in run for local dev
        pass

    try:
        await listener.start()
        processor_task = asyncio.create_task(packet_processor(listener))
        
        # Wait until stop
        # On Windows, simple sleep loop to allow Ctrl+C if signal handler failed
        while not stop_event.is_set():
            await asyncio.sleep(1)
            
    except asyncio.CancelledError:
        pass
    finally:
        listener.stop()
        logger.info("Ingestion Service Shutdown.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
