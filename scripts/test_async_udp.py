import asyncio
import logging

# Configure basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AsyncUDPTest")

class EchoServerProtocol(asyncio.DatagramProtocol):
    def connection_made(self, transport):
        self.transport = transport
        logger.info("Async UDP Server bound and ready.")

    def datagram_received(self, data, addr):
        logger.info(f"Received {len(data)} bytes from {addr}")

async def main():
    loop = asyncio.get_running_loop()
    logger.info("Starting Async UDP Server on 127.0.0.1:20777...")
    
    try:
        transport, protocol = await loop.create_datagram_endpoint(
            lambda: EchoServerProtocol(),
            local_addr=('127.0.0.1', 20777)
        )
        
        logger.info(f"Server started. Transport: {transport}")
        
        # Keep running
        while True:
            await asyncio.sleep(1)
            
    except Exception as e:
        logger.error(f"Failed to start server: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Stopped.")
