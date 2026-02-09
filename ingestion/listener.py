import asyncio
import logging
from typing import Callable, Any

logger = logging.getLogger(__name__)

class UDPListenerProtocol(asyncio.DatagramProtocol):
    def __init__(self, queue: asyncio.Queue):
        self.queue = queue
        self.transport = None

    def connection_made(self, transport):
        self.transport = transport
        logger.info("UDP Listener bound and ready.")

    def datagram_received(self, data, addr):
        # Push raw data to queue for non-blocking processing
        # print(f"DEBUG: Received {len(data)} bytes from {addr}")
        try:
            self.queue.put_nowait((data, addr))
        except asyncio.QueueFull:
            logger.warning("Packet Queue Full! Dropping packet.")

class TelemetryListener:
    def __init__(self, host: str = "127.0.0.1", port: int = 20777):
        self.host = host
        self.port = port
        self.queue = asyncio.Queue(maxsize=100000)
        self.transport = None
        self.protocol = None

    async def start(self):
        loop = asyncio.get_running_loop()
        logger.info(f"Starting UDP Listener on {self.host}:{self.port}...")
        try:
            self.transport, self.protocol = await loop.create_datagram_endpoint(
                lambda: UDPListenerProtocol(self.queue),
                local_addr=(self.host, self.port)
            )
        except Exception as e:
            logger.error(f"Failed to bind UDP port: {e}")
            raise

    def stop(self):
        if self.transport:
            self.transport.close()
            logger.info("UDP Listener stopped.")

    async def get_packet(self):
        return await self.queue.get()
